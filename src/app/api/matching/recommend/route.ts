import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';
import { matchCandidateToRoles } from '@/lib/matching/role-matcher';
import { authorizeRequest } from '@/lib/firebase/auth';
import { adminDb } from '@/lib/firebase/admin';
import { sanitizeForFirestore } from '@/lib/firebase/firestore-sanitizer';
import { CandidateRepository } from '@/lib/repositories/candidate-repository';
import { AssessmentRepository } from '@/lib/repositories/assessment-repository';
import { isDemoFixturesEnabled } from '@/lib/data/mock-data';
import { VerificationRecord } from '@/types/verification';
import { InterviewQuestion } from '@/types/interview';
import { CodingSubmission } from '@/types/coding';
import { ExtractedSkill } from '@/types/resume';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

const RecommendSchema = z.object({
  candidateId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate caller (candidates, recruiters, or admins)
    const session = await authorizeRequest(req, ['candidate', 'recruiter', 'admin']);

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is valid: defaults to authenticated candidate
    }

    const parsed = RecommendSchema.safeParse(body);
    const targetCandidateId = (parsed.success && parsed.data.candidateId) || session.uid;

    // Enforce ownership: candidates can only generate recommendations for themselves
    if (session.role === 'candidate' && targetCandidateId !== session.uid) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot request role recommendations for another candidate' },
        { status: 403 }
      );
    }

    // DEF-014 Remediation: Load authoritative evidence from server-side repositories.
    // Client-supplied claims, fabricated scores, or spoofed verification statuses are never trusted.

    // 1. Authoritative Candidate Profile
    const profileDoc = await CandidateRepository.getProfile(targetCandidateId);

    // 2. Authoritative Verified Records from Firestore
    let verifiedRecords: VerificationRecord[] = [];
    try {
      const snap = await adminDb
        .collection('verifications')
        .where('candidateId', '==', targetCandidateId)
        .get();
      if (!snap.empty) {
        verifiedRecords = snap.docs.map(
          (d: QueryDocumentSnapshot) =>
            ({
              id: d.id,
              ...d.data(),
            } as unknown as VerificationRecord)
        );
      }
    } catch {
      // Fallback below
    }

    if (
      verifiedRecords.length === 0 &&
      isDemoFixturesEnabled() &&
      (targetCandidateId.includes('alex') || targetCandidateId === 'cand-alex-mercer')
    ) {
      const { MOCK_VERIFICATIONS } = await import('@/lib/data/mock-data');
      verifiedRecords = MOCK_VERIFICATIONS;
    }

    // 3. Authoritative Coding Submissions from Assessment Repository
    let codingSubmissions: CodingSubmission[] = [];
    try {
      codingSubmissions = await AssessmentRepository.getSubmissionsByCandidate(targetCandidateId);
    } catch {
      // Fallback below
    }

    // 4. Authoritative Technical Interview Evaluations
    let interviewQuestions: InterviewQuestion[] = [];
    try {
      const snap = await adminDb
        .collection('interviewQuestions')
        .where('candidateId', '==', targetCandidateId)
        .get();
      if (!snap.empty) {
        interviewQuestions = snap.docs.map(
          (d: QueryDocumentSnapshot) =>
            ({
              id: d.id,
              ...d.data(),
            } as unknown as InterviewQuestion)
        );
      }
    } catch {
      // Fallback below
    }

    if (
      interviewQuestions.length === 0 &&
      isDemoFixturesEnabled() &&
      (targetCandidateId.includes('alex') || targetCandidateId === 'cand-alex-mercer')
    ) {
      const { MOCK_INTERVIEW_QUESTIONS } = await import('@/lib/data/mock-data');
      interviewQuestions = MOCK_INTERVIEW_QUESTIONS;
    }

    // 5. Extracted Resume Skills
    let extractedSkills: ExtractedSkill[] = [];
    if (profileDoc && (profileDoc as any).extractedSkills && Array.isArray((profileDoc as any).extractedSkills)) {
      extractedSkills = (profileDoc as any).extractedSkills;
    }

    try {
      if (extractedSkills.length === 0) {
        const snap = await adminDb
          .collection('resumes')
          .where('candidateId', '==', targetCandidateId)
          .limit(1)
          .get();
        if (!snap.empty) {
          const resumeData = snap.docs[0].data();
          if (resumeData.extractedSkills) {
            extractedSkills = resumeData.extractedSkills;
          }
        }
      }
    } catch {
      // Fallback below
    }

    if (
      extractedSkills.length === 0 &&
      isDemoFixturesEnabled() &&
      (targetCandidateId.includes('alex') || targetCandidateId === 'cand-alex-mercer')
    ) {
      extractedSkills = [
        { name: 'TypeScript', category: 'languages', evidenceTier: 'extracted', confidence: 0.95 },
        { name: 'React', category: 'frameworks', evidenceTier: 'extracted', confidence: 0.92 },
        { name: 'Node.js', category: 'frameworks', evidenceTier: 'extracted', confidence: 0.9 },
        { name: 'Distributed Systems', category: 'systems', evidenceTier: 'extracted', confidence: 0.88 },
      ];
    }

    // Synthesize multi-source verified competency profile
    const claimedSkills =
      profileDoc && (profileDoc as any).claimedSkills && Array.isArray((profileDoc as any).claimedSkills)
        ? (profileDoc as any).claimedSkills
        : profileDoc?.yearsOfExperience
        ? ['Distributed Systems', 'TypeScript', 'Cloud Architecture']
        : [];

    const profile = calculateCompetencyProfile({
      candidateId: targetCandidateId,
      claimedSkills,
      extractedSkills,
      verifiedRecords,
      codingSubmissions,
      interviewQuestions,
    });

    // Compute deterministic multi-role compatibility scores
    const recommendations = matchCandidateToRoles(targetCandidateId, profile);

    // Persist recommendation record for audit & historical tracking
    try {
      const recId = `rec-${targetCandidateId}-${Date.now()}`;
      await adminDb.collection('roleRecommendations').doc(recId).set(
        sanitizeForFirestore({
          id: recId,
          candidateId: targetCandidateId,
          primaryRole: recommendations.primaryRecommendation.role,
          primaryScore: recommendations.primaryRecommendation.compatibilityScore,
          alternativeCount: recommendations.alternativeRecommendations.length,
          recommendations,
          generatedAt: new Date().toISOString(),
        })
      );
    } catch (saveErr) {
      console.warn('[MatchingRecommendation] Non-fatal recommendation persistence warning:', saveErr);
    }

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
