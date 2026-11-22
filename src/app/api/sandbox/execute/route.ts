import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executeInIsolatedSandbox } from '@/lib/sandbox/runner';
import { authorizeRequest } from '@/lib/firebase/auth';
import { TestCase } from '@/types/coding';

// In-memory sliding window rate limiter to prevent abuse and resource exhaustion
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 runs per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  entry.count++;
  return true;
}

const ExecuteSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty').max(50000, 'Code exceeds 50KB limit'),
  language: z.enum(['javascript', 'typescript', 'python']),
  testCases: z.array(
    z.object({
      id: z.string(),
      input: z.string().max(10000),
      expectedOutput: z.string().max(10000),
      isHidden: z.boolean().default(false),
      description: z.string().optional(),
    })
  ).min(1, 'At least one testcase required').max(20, 'Maximum 20 test cases per submission'),
  candidateId: z.string().optional(),
  assessmentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // DEF-003 Remediation: Enforce authentication for sandbox execution
    const session = await authorizeRequest(req, ['candidate', 'recruiter', 'admin']);

    // Rate limiting check per authenticated UID
    if (!checkRateLimit(session.uid)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Maximum 10 sandbox executions per minute. Please wait.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = ExecuteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid execution request payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { code, language, testCases, candidateId } = parsed.data;

    // Enforce ownership: candidates can only execute their own assessments
    if (session.role === 'candidate' && candidateId && candidateId !== session.uid) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot execute code assessments for another candidate' },
        { status: 403 }
      );
    }

    const formattedTestCases: TestCase[] = testCases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: !!tc.isHidden,
      description: tc.description,
    }));

    const summary = await executeInIsolatedSandbox({
      code,
      language,
      testCases: formattedTestCases,
      timeoutMs: 3000,
      memoryLimitMb: 128,
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized')
      ? 401
      : message.startsWith('Forbidden')
      ? 403
      : message.includes('EXECUTION_PROVIDER_UNCONFIGURED')
      ? 503
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
