import { NextRequest, NextResponse } from 'next/server';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';
import { matchCandidateToRoles } from '@/lib/matching/role-matcher';

export async function POST(req: NextRequest) {
  try {
    const { candidateId, claimedSkills, extractedSkills, verifiedRecords, codingSubmissions, interviewQuestions } = await req.json();

    const profile = calculateCompetencyProfile({
      candidateId: candidateId || 'default-candidate',
      claimedSkills,
      extractedSkills,
      verifiedRecords,
      codingSubmissions,
      interviewQuestions,
    });

    const recommendations = matchCandidateToRoles(candidateId || 'default-candidate', profile);

    return NextResponse.json({
      success: true,
      data: {
        profile,
        recommendations,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
