import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/firebase/auth';
import { AuditService } from '@/lib/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    // Enforce server-side authorization: Recruiter or Admin role strictly required
    const session = await authorizeRequest(req, ['recruiter', 'admin']);

    const { applicationId, candidateId, decision, rationale, isOverride } = await req.json();

    if (!applicationId || !decision || !rationale) {
      return NextResponse.json({ error: 'Missing applicationId, decision, or mandatory rationale' }, { status: 400 });
    }

    const recordedDecision = {
      id: `dec-${applicationId}-${Date.now()}`,
      applicationId,
      candidateId,
      decision,
      rationale,
      decidedBy: {
        id: session.uid,
        role: session.role,
      },
      isOverride: !!isOverride,
      timestamp: new Date().toISOString(),
    };

    // Commit to immutable audit log service
    await AuditService.recordLog({
      actor: `User ${session.uid}`,
      actorId: session.uid,
      role: session.role,
      action: isOverride ? 'OVERRIDE_AND_RECORD_DECISION' : 'RECORD_HIRING_DECISION',
      target: `Application: ${applicationId} (Candidate: ${candidateId})`,
      details: `Decision: ${decision.toUpperCase()}. Rationale: "${rationale}"`,
    });

    return NextResponse.json({
      success: true,
      message: 'Human recruiter decision recorded and committed to audit trail.',
      data: recordedDecision,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
