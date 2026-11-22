import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeRequest } from '@/lib/firebase/auth';
import { ApplicationRepository } from '@/lib/repositories/application-repository';
import { HiringDecisionRepository } from '@/lib/repositories/hiring-decision-repository';

const HiringDecisionSchema = z.object({
  applicationId: z.string().min(1, 'applicationId is required'),
  candidateId: z.string().min(1, 'candidateId is required'),
  decision: z.enum([
    'advance_to_offer',
    'schedule_panel',
    'request_more_evidence',
    'redirect_to_alternative_role',
    'reject',
  ]),
  rationale: z.string().min(10, 'Mandatory audit rationale must be at least 10 characters'),
  isOverride: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce server-side authorization: Recruiter or Admin role strictly required
    const session = await authorizeRequest(req, ['recruiter', 'admin']);

    const body = await req.json();
    const parsed = HiringDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid decision payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { applicationId, candidateId, decision, rationale, isOverride } = parsed.data;

    // 2. Verify that the application genuinely exists in Firestore
    const application = await ApplicationRepository.getById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: `Application ${applicationId} does not exist.` },
        { status: 404 }
      );
    }

    // 3. Enforce Organization Isolation: Recruiter can ONLY decide on applications to their own organization
    if (session.role === 'recruiter' && application.orgId !== session.orgId) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot record hiring decisions for applications belonging to another organization.' },
        { status: 403 }
      );
    }

    // 4. Commit transactionally to Firestore & append to immutable audit log
    const recordedDecision = await HiringDecisionRepository.recordDecision({
      applicationId,
      candidateId,
      decision,
      rationale,
      decidedBy: {
        id: session.uid,
        role: session.role,
        orgId: session.orgId,
      },
      isOverride,
    });

    return NextResponse.json({
      success: true,
      message: 'Human recruiter decision recorded transactionally and committed to immutable audit trail.',
      data: recordedDecision,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Forbidden')
      ? 403
      : message.startsWith('Unauthorized')
      ? 401
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
