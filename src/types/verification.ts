export type ClaimType =
  | 'identity'
  | 'education'
  | 'employment'
  | 'certification'
  | 'project'
  | 'github';

export type VerificationStatus =
  | 'pending'
  | 'in_progress'
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'failed'
  | 'requires_manual_review';

export interface VerificationRecord {
  id: string;
  candidateId: string;
  claimType: ClaimType;
  claimTitle: string;
  claimDetails: string;
  status: VerificationStatus;
  verificationSource: string; // e.g. "University Registrar API", "GitHub API", "Manual Auditor Review"
  evidenceDocumentUrl?: string;
  confidence: number; // 0 - 100
  reviewedBy: string; // 'system' or User ID of compliance reviewer
  failureReason?: string;
  auditNotes?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}
