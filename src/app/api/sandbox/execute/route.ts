import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executeInIsolatedSandbox } from '@/lib/sandbox/runner';
import { authorizeRequest } from '@/lib/firebase/auth';
import { AssessmentRepository } from '@/lib/repositories/assessment-repository';
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
  assessmentId: z.string().optional(),
  candidateId: z.string().optional(),
  // DEF-013 Remediation: Custom test cases are strictly forbidden for candidates
  customTestCases: z.array(
    z.object({
      id: z.string(),
      input: z.string().max(10000),
      expectedOutput: z.string().max(10000),
      isHidden: z.boolean().default(false),
      description: z.string().optional(),
    })
  ).max(20).optional(),
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

    const { code, language, assessmentId, candidateId, customTestCases } = parsed.data;

    let targetTestCases: TestCase[] = [];

    // DEF-013 Remediation: Disallow candidate-supplied test cases to manufacture artificial scores
    if (session.role === 'candidate') {
      if (customTestCases && customTestCases.length > 0) {
        return NextResponse.json(
          { error: 'Forbidden: Candidates cannot supply custom evaluation test cases. Assessments execute against authoritative server suites.' },
          { status: 403 }
        );
      }

      if (candidateId && candidateId !== session.uid) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot execute code assessments for another candidate' },
          { status: 403 }
        );
      }

      const effectiveAssessmentId = assessmentId || 'default';
      targetTestCases = await AssessmentRepository.getPrivateTestCases(effectiveAssessmentId);

      if (!targetTestCases || targetTestCases.length === 0) {
        return NextResponse.json(
          { error: `Assessment '${effectiveAssessmentId}' test cases not found on server` },
          { status: 404 }
        );
      }
    } else {
      // Recruiter or Admin role
      if (customTestCases && customTestCases.length > 0) {
        targetTestCases = customTestCases.map((tc) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: !!tc.isHidden,
          description: tc.description,
        }));
      } else if (assessmentId) {
        targetTestCases = await AssessmentRepository.getPrivateTestCases(assessmentId);
      } else {
        return NextResponse.json(
          { error: 'Missing assessmentId or customTestCases' },
          { status: 400 }
        );
      }
    }

    // Execute in isolated sandbox
    const summary = await executeInIsolatedSandbox({
      code,
      language,
      testCases: targetTestCases,
      timeoutMs: 3000,
      memoryLimitMb: 128,
    });

    // Sanitization: If candidate requested, obscure hidden test case inputs and outputs
    if (session.role === 'candidate') {
      const hiddenIds = new Set(targetTestCases.filter((t) => t.isHidden).map((t) => t.id));
      summary.results = summary.results.map((res) => {
        if (hiddenIds.has(res.testCaseId)) {
          return {
            ...res,
            input: '[HIDDEN_EVALUATION_INPUT]',
            expectedOutput: '[HIDDEN_EVALUATION_OUTPUT]',
            actualOutput: res.passed ? '[HIDDEN_EVALUATION_OUTPUT]' : '[EXECUTION_MISMATCH]',
          };
        }
        return res;
      });

      // Persist candidate submission record to Firestore
      try {
        const submissionId = `sub-${session.uid}-${Date.now()}`;
        const validStatus =
          summary.executionStatus === 'provider_unconfigured' ? 'runtime_error' : summary.executionStatus;

        await AssessmentRepository.recordSubmission({
          id: submissionId,
          assessmentId: assessmentId || 'default',
          candidateId: session.uid,
          submittedCode: code,
          language,
          passedTests: summary.passedTests,
          totalTests: summary.totalTests,
          score: summary.score,
          executionStatus: validStatus,
          results: summary.results,
          submittedAt: new Date().toISOString(),
        });
      } catch (saveErr) {
        console.warn('[SandboxExecution] Failed to persist submission record:', saveErr);
      }
    }

    return NextResponse.json({ success: true, data: summary });
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
