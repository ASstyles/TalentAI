import { NextRequest, NextResponse } from 'next/server';
import { parseResumeWithGemini } from '@/lib/gemini/services/resume-analysis';
import { GeminiClient } from '@/lib/gemini/client';
import { authorizeRequest } from '@/lib/firebase/auth';

export async function POST(req: NextRequest) {
  try {
    // Authenticate caller (candidates, recruiters, or admins)
    await authorizeRequest(req, ['candidate', 'recruiter', 'admin']);

    const { rawText } = await req.json();
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty rawText parameter. Please provide genuine resume text.' },
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
