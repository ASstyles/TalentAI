import { NextRequest, NextResponse } from 'next/server';
import { evaluateInterviewTurnWithGemini } from '@/lib/gemini/services/adaptive-interview';
import { GeminiClient } from '@/lib/gemini/client';
import { authorizeRequest } from '@/lib/firebase/auth';
import { rateLimiter } from '@/lib/rate-limit/redis-limiter';

export async function POST(req: NextRequest) {
  try {
    // Authenticate caller (candidates, recruiters, or admins)
    const session = await authorizeRequest(req, ['candidate', 'recruiter', 'admin']);

    // Distributed Rate Limiting
    const rateCheck = await rateLimiter.checkRateLimit('interview_evaluate', session.uid);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Maximum 20 interview evaluations per minute. Please wait.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, rateCheck.resetTime - Math.floor(Date.now() / 1000))),
          },
        }
      );
    }

    const { questionText, rubricCriteria, candidateResponse, conversationHistory } = await req.json();

    if (!questionText || !candidateResponse || typeof candidateResponse !== 'string') {
      return NextResponse.json(
        { error: 'Missing questionText or candidateResponse' },
        { status: 400 }
      );
    }

    if (!GeminiClient.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          status: 'AI_UNAVAILABLE',
          error: 'Gemini AI evaluation service is not configured. GEMINI_API_KEY is not set.',
          retryAvailable: true,
        },
        { status: 503 }
      );
    }

    try {
      const evaluation = await evaluateInterviewTurnWithGemini({
        questionText,
        rubricCriteria: rubricCriteria || [
          'Technical accuracy',
          'Conceptual depth',
          'Problem solving',
          'Trade-off awareness',
        ],
        candidateResponse,
        conversationHistory,
      });

      return NextResponse.json({
        success: true,
        data: evaluation,
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
          error: `Gemini evaluation failed: ${classified.message}`,
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
