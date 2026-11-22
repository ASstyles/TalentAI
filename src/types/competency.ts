import { EvidenceTier } from './resume';

export interface CompetencyScoreItem {
  skillId: string;
  skillName: string;
  category: 'languages' | 'frameworks' | 'databases' | 'cloud' | 'ml' | 'systems' | 'testing';
  demonstratedScore: number; // 0 - 100
  coverage: number;          // 0 - 100 (% of evidence tiers fulfilled)
  confidence: number;        // 0 - 100
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
  lastComputedAt: string;
}
