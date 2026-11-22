export type ApplicationStatus =
  | 'applied'
  | 'screening'
  | 'interviewing'
  | 'assessing'
  | 'review'
  | 'offered'
  | 'rejected';

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle?: string;
  orgId: string;
  candidateId: string;
  candidateName?: string;
  candidateEmail?: string;
  resumeId: string;
  status: ApplicationStatus;
  interviewId?: string;
  codingAssessmentId?: string;
  compositeScore?: number;
  hiringRecommendationId?: string;
  appliedAt: string;
  updatedAt: string;
}
