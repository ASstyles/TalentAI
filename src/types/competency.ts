import { EvidenceTier } from './resume';

export type CompetencyStatus =
  | 'assessed_strong'
  | 'assessed_competent'
  | 'assessed_weak'
  | 'unassessed_claimed'
  | 'insufficient_evidence';

export interface CompetencyScoreItem {
  skillId: string;
  skillName: string;
  category: 'languages' | 'frameworks' | 'databases' | 'cloud' | 'ml' | 'systems' | 'testing';
  demonstratedScore: number; // 0 - 100
  claimedScore?: number;
  coverage: number;          // 0 - 100 (% of evidence tiers fulfilled)
  confidence: number;        // 0 - 100
  uncertainty: number;       // 0 - 100 (high for unassessed/claimed, low for multi-tier demonstrated)
  verificationState: 'unverified' | 'partially_verified' | 'verified' | 'refuted';
  assessmentQuality: 'none' | 'basic' | 'rigorous';
  freshnessScore: number;    // 0 - 100
  status: CompetencyStatus;
  evidenceTiersPresent: EvidenceTier[];
  sourceBreakdown: {
    claimedScore?: number;
    extractedScore?: number;
    projectScore?: number;
    verifiedScore?: number;
    assessedScore?: number;
  };
  skillGapNotes?: string;
}

export interface CompetencyProfile {
  id: string; // == candidateId
  candidateId: string;
  competencies: Record<string, CompetencyScoreItem>;
  strongestSkills: string[];
  growthOpportunities: string[];
  overallProficiencyScore: number; // 0 - 100
  evidenceIntegrityScore: number;  // 0 - 100 (Ratio of verified/assessed vs purely claimed)
  assessedSkillCount: number;
  unassessedSkillCount: number;
  lastComputedAt: string;
}
