import { NextRequest, NextResponse } from 'next/server';
import { parseResumeWithGemini } from '@/lib/gemini/services/resume-analysis';
import { GeminiClient } from '@/lib/gemini/client';
import { authorizeRequest } from '@/lib/firebase/auth';
import { rateLimiter } from '@/lib/rate-limit/redis-limiter';
import { extractDocumentText } from '@/lib/resume/parser';

export async function POST(req: NextRequest) {
  try {
    // Authenticate caller (candidates, recruiters, or admins)
    const session = await authorizeRequest(req, ['candidate', 'recruiter', 'admin']);

    // Distributed Rate Limiting
    const rateCheck = await rateLimiter.checkRateLimit('resume_parse', session.uid);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Maximum 15 resume parses per minute. Please wait.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, rateCheck.resetTime - Math.floor(Date.now() / 1000))),
          },
        }
      );
    }

    const body = await req.json();
    let rawText = body.rawText;

    // Support base64 encoded document buffer if provided
    if ((!rawText || typeof rawText !== 'string') && body.documentBase64) {
      const buffer = Buffer.from(body.documentBase64, 'base64');
      const ext = typeof body.extension === 'string' ? body.extension : 'pdf';
      rawText = await extractDocumentText(buffer, ext);
    }

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty rawText parameter. Please provide genuine resume text or documentBase64.' },
        { status: 400 }
      );
    }

    if (!GeminiClient.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          status: 'AI_UNAVAILABLE',
          error: 'Gemini AI intelligence service is unconfigured. GEMINI_API_KEY is not set.',
          retryAvailable: true,
        },
        { status: 503 }
      );
    }

    try {
      const extracted = await parseResumeWithGemini(rawText);
      return NextResponse.json({
        success: true,
        data: extracted,
        source: 'gemini-live',
        status: 'COMPLETED',
      });
    } catch (geminiError: unknown) {
      const classified = GeminiClient.classifyError(geminiError);
      return NextResponse.json(
        {
          success: false,
          status: 'PROCESSING_FAILED',
          errorCode: classified.code,
          error: `Gemini processing failed: ${classified.message}`,
          retryAvailable: classified.code !== 'UNAUTHORIZED',
        },
        { status: classified.status || 502 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized')
      ? 401
      : message.startsWith('Forbidden')
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
