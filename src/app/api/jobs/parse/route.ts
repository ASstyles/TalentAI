import { NextRequest, NextResponse } from 'next/server';
import { parseJobDescriptionWithGemini } from '@/lib/gemini/services/job-description-analysis';
import { GeminiClient } from '@/lib/gemini/client';
import { authorizeRequest } from '@/lib/firebase/auth';

export async function POST(req: NextRequest) {
  try {
    // Authenticate recruiter or admin caller
    await authorizeRequest(req, ['recruiter', 'admin']);

    const { jobDescription } = await req.json();
    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty jobDescription parameter' },
        { status: 400 }
      );
    }

    if (!GeminiClient.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          status: 'AI_UNAVAILABLE',
          error: 'Gemini AI intelligence service is not configured. GEMINI_API_KEY is not set.',
          retryAvailable: true,
        },
        { status: 503 }
      );
    }

    try {
      const extracted = await parseJobDescriptionWithGemini(jobDescription);
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
          error: `Gemini job parsing failed: ${classified.message}`,
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
