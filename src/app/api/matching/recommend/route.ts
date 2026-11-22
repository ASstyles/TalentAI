import { NextRequest, NextResponse } from 'next/server';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';
import { matchCandidateToRoles } from '@/lib/matching/role-matcher';
import { authorizeRequest } from '@/lib/firebase/auth';

export async function POST(req: NextRequest) {
  try {
    // Authenticate caller (candidates, recruiters, or admins)
    const session = await authorizeRequest(req, ['candidate', 'recruiter', 'admin']);

    const body = await req.json();
    const { candidateId, claimedSkills, extractedSkills, verifiedRecords, codingSubmissions, interviewQuestions } = body;

    const targetCandidateId = candidateId || session.uid;

    // Enforce ownership: candidates can only generate recommendations for themselves
    if (session.role === 'candidate' && targetCandidateId !== session.uid) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot request role recommendations for another candidate' },
        { status: 403 }
      );
    }

    const profile = calculateCompetencyProfile({
      candidateId: targetCandidateId,
      claimedSkills: claimedSkills || [],
      extractedSkills: extractedSkills || [],
      verifiedRecords: verifiedRecords || [],
      codingSubmissions: codingSubmissions || [],
      interviewQuestions: interviewQuestions || [],
    });

    const recommendations = matchCandidateToRoles(targetCandidateId, profile);

    return NextResponse.json({
      success: true,
      data: {
        profile,
        recommendations,
      },
    });
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
