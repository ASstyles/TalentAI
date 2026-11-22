export type HiringStatus =
  | 'strong_match'
  | 'potential_match'
  | 'additional_assessment_recommended'
  | 'alternative_role_recommended'
  | 'insufficient_evidence';

export type RecruiterDecision =
  | 'advance_to_offer'
  | 'schedule_panel'
  | 'request_more_evidence'
  | 'redirect_to_alternative_role'
  | 'reject';

export interface EvidenceMatrixItem {
  dimension: string; // e.g. "Coding Rigor", "System Architecture", "Cloud Skills"
  claimedLevel: string;
  verifiedEvidence: string;
  demonstratedScore: number;
  confidence: number;
}

export interface HiringRecommendationReport {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  candidateName: string;
  jobTitle: string;
  recommendationStatus: HiringStatus;
  summaryExecutive: string;
  evidenceMatrix: EvidenceMatrixItem[];
  keyStrengths: string[];
  identifiedRisks: string[];
  discrepanciesDetected: string[];
  suggestedInterviewFollowUps: string[];
  humanDecision?: {
    decision: RecruiterDecision;
    decidedByUserId: string;
    decidedByUserName: string;
    decidedAt: string;
    decisionRationale: string;
    isOverriddenFromAI: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
