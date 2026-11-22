import { EngineeringRole } from './job';

export interface RoleCompatibility {
  role: EngineeringRole;
  compatibilityScore: number; // 0 - 100
  confidenceScore: number;     // 0 - 100
  coverageScore: number;       // 0 - 100
  matchingCompetencies: Array<{
    name: string;
    candidateScore: number;
    requiredScore: number;
    weight: number;
  }>;
  missingOrDeficientCompetencies: Array<{
    name: string;
    candidateScore: number;
    requiredScore: number;
    gapSeverity: 'low' | 'medium' | 'high';
  }>;
  rationale: string;
}

export interface RoleRecommendation {
  id: string;
  candidateId: string;
  primaryRecommendation: RoleCompatibility;
  alternativeRecommendations: RoleCompatibility[];
  growthPathways: Array<{
    targetRole: EngineeringRole;
    readinessScore: number;
    recommendedActions: string[];
  }>;
  generatedAt: string;
}
