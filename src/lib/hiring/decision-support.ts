import { HiringRecommendationReport, HiringStatus, RecruiterDecision } from '@/types/hiring';
import { CompetencyProfile } from '@/types/competency';
import { JobOpening } from '@/types/job';
import { VerificationRecord } from '@/types/verification';
import { InterviewSession } from '@/types/interview';
import { CodingSubmission } from '@/types/coding';

export function generateHiringRecommendation({
  applicationId,
  candidateId,
  candidateName,
  job,
  competencyProfile,
  verificationRecords = [],
  interviewSession,
  codingSubmission,
}: {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  job: JobOpening;
  competencyProfile: CompetencyProfile;
  verificationRecords?: VerificationRecord[];
  interviewSession?: InterviewSession;
  codingSubmission?: CodingSubmission;
}): HiringRecommendationReport {
  const verifiedCount = verificationRecords.filter((v) => v.status === 'verified').length;
  const interviewScore = interviewSession?.overallScore ?? 0;
  const codingScore = codingSubmission?.score ?? 0;
  const integrityScore = competencyProfile.evidenceIntegrityScore;

  // Compute composite hiring score
  const compositeEvidenceScore = Math.round(
    competencyProfile.overallProficiencyScore * 0.35 +
      (interviewScore > 0 ? interviewScore * 0.3 : 0) +
      (codingScore > 0 ? codingScore * 0.25 : 0) +
      (verifiedCount > 0 ? 10 : 0)
  );

  let recommendationStatus: HiringStatus = 'potential_match';
  if (compositeEvidenceScore >= 80 && codingScore >= 75 && interviewScore >= 75) {
    recommendationStatus = 'strong_match';
  } else if (codingScore === 0 && interviewScore === 0) {
    recommendationStatus = 'additional_assessment_recommended';
  } else if (integrityScore < 30) {
    recommendationStatus = 'insufficient_evidence';
  } else if (compositeEvidenceScore < 50) {
    recommendationStatus = 'alternative_role_recommended';
  }

  const risks: string[] = [];
  if (verifiedCount === 0) risks.push('Zero independent credential or employment verifications recorded.');
  if (integrityScore < 40) risks.push('High proportion of self-claimed skills without code or assessment proof.');
  if (codingSubmission && codingSubmission.score < 60) risks.push('Coding assessment performance was below target threshold.');

  const strengths: string[] = [...competencyProfile.strongestSkills];
  if (interviewScore >= 80) strengths.push('Demonstrated strong system architecture reasoning in technical interview.');
  if (codingScore >= 90) strengths.push('Produced clean, optimal code passing all sample and hidden test cases.');

  return {
    id: `rec-${applicationId}`,
    applicationId,
    candidateId,
    jobId: job.id,
    candidateName,
    jobTitle: job.title,
    recommendationStatus,
    summaryExecutive: `Candidate exhibits a composite readiness score of ${compositeEvidenceScore}/100 with ${verifiedCount} independently verified credentials. Evidence integrity is rated at ${integrityScore}%.`,
    evidenceMatrix: [
      {
        dimension: 'Technical Interview',
        claimedLevel: 'Self-Reported',
        verifiedEvidence: interviewSession ? `Completed ${interviewSession.totalQuestions} questions` : 'Not yet completed',
        demonstratedScore: interviewScore,
        confidence: interviewSession ? 85 : 0,
      },
      {
        dimension: 'Practical Coding',
        claimedLevel: 'Self-Reported',
        verifiedEvidence: codingSubmission ? `${codingSubmission.passedTests}/${codingSubmission.totalTests} tests passed` : 'Pending',
        demonstratedScore: codingScore,
        confidence: codingSubmission ? 95 : 0,
      },
      {
        dimension: 'Core Competency Alignment',
        claimedLevel: 'Profile Claims',
        verifiedEvidence: `${Object.keys(competencyProfile.competencies).length} technical competencies mapped`,
        demonstratedScore: competencyProfile.overallProficiencyScore,
        confidence: integrityScore,
      },
    ],
    keyStrengths: strengths,
    identifiedRisks: risks,
    discrepanciesDetected:
      integrityScore < 30 ? ['Substantial gap between claimed years of experience and demonstrated coding performance'] : [],
    suggestedInterviewFollowUps: [
      'Probe deep on distributed concurrency and memory management trade-offs',
      'Request walk-through of claimed architecture in flagship project',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
