import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/firebase/auth';
import { adminStorage } from '@/lib/firebase/admin';
import { CandidateRepository } from '@/lib/repositories/candidate-repository';
import { parseResumeWithGemini } from '@/lib/gemini/services/resume-analysis';
import { GeminiClient } from '@/lib/gemini/client';
import { rateLimiter } from '@/lib/rate-limit/redis-limiter';
import {
  validateFileHeader,
  extractDocumentText,
  MAX_RESUME_FILE_SIZE,
} from '@/lib/resume/parser';

export async function POST(req: NextRequest) {
  try {
    const session = await authorizeRequest(req, ['candidate', 'admin']);

    // Rate limiting
    const rateCheck = await rateLimiter.checkRateLimit('resume_parse', session.uid);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Maximum 15 resume operations per minute.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const autoParse = formData.get('autoParse') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    // Size limit check
    if (file.size > MAX_RESUME_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 10MB limit (provided ${Math.round(file.size / 1024 / 1024)}MB)` },
        { status: 400 }
      );
    }

    // Extension check
    const filename = file.name;
    const parts = filename.split('.');
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';

    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type .${ext}. Only PDF, DOCX, and TXT files are accepted.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Deep content header verification
    if (!validateFileHeader(buffer, ext)) {
      return NextResponse.json(
        { error: `Invalid file content: The file does not match genuine .${ext} structure.` },
        { status: 400 }
      );
    }

    const sanitizedBase = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `candidates/${session.uid}/resumes/${Date.now()}_${sanitizedBase}`;
    let uploadWarning: string | null = null;

    // Secure upload to Firebase Cloud Storage (candidate-specific path)
    try {
      const bucket = adminStorage.bucket();
      const storageFile = bucket.file(storagePath);
      await storageFile.save(buffer, {
        contentType: file.type || (ext === 'pdf' ? 'application/pdf' : 'text/plain'),
        metadata: {
          candidateId: session.uid,
          originalName: filename,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (storageErr) {
      console.warn('[ResumeUpload] Storage save warning (continuing with extraction):', storageErr);
      uploadWarning = 'Cloud storage bucket offline or mock emulator mode';
    }

    // Extract text content with pdf-parse and mammoth engine
    const extractedText = await extractDocumentText(buffer, ext);

    let parsedData = null;
    if (autoParse && extractedText.length > 20) {
      if (GeminiClient.isConfigured()) {
        try {
          parsedData = await parseResumeWithGemini(extractedText);

          // Automatically sync extracted skills and info into candidate profile safely
          if (parsedData) {
            await CandidateRepository.saveProfile(session.uid, {
              headline: parsedData.summary ? parsedData.summary.substring(0, 120) : 'Software Engineer',
              summary: parsedData.summary || '',
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (aiErr) {
          console.warn('[ResumeUpload] Auto-parse warning:', aiErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        filename,
        storagePath,
        sizeBytes: file.size,
        extractedTextLength: extractedText.length,
        rawText: extractedText,
        parsedData,
        uploadWarning,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized') ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await authorizeRequest(req, ['candidate', 'admin']);
    const { searchParams } = new URL(req.url);
    const storagePath = searchParams.get('storagePath');

    if (!storagePath) {
      return NextResponse.json({ error: 'storagePath parameter is required' }, { status: 400 });
    }

    // Ensure candidate can only delete from their own storage prefix
    if (session.role === 'candidate' && !storagePath.startsWith(`candidates/${session.uid}/`)) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own resume documents' },
        { status: 403 }
      );
    }

    try {
      const bucket = adminStorage.bucket();
      await bucket.file(storagePath).delete({ ignoreNotFound: true });
    } catch (e) {
      console.warn('[ResumeUpload] Storage delete warning:', e);
    }

    return NextResponse.json({ success: true, message: 'Resume document deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized') ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
