import { describe, it, expect } from 'vitest';
import { matchCandidateToRoles } from '@/lib/matching/role-matcher';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';

describe('Role Recommendation Engine', () => {
  it('correctly identifies Frontend Engineer for a candidate strong in React and TypeScript', () => {
    const profile = calculateCompetencyProfile({
      candidateId: 'cand-frontend',
      extractedSkills: [
        { name: 'React', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.95 },
        { name: 'TypeScript', category: 'languages', evidenceTier: 'project_supported', confidence: 0.9 },
        { name: 'CSS', category: 'frameworks', evidenceTier: 'extracted', confidence: 0.85 },
      ],
    });

    const recommendations = matchCandidateToRoles('cand-frontend', profile);

    expect(recommendations.primaryRecommendation.role).toBe('Frontend Engineer');
    expect(recommendations.primaryRecommendation.compatibilityScore).toBeGreaterThanOrEqual(50);
    expect(recommendations.alternativeRecommendations.length).toBeGreaterThan(0);
  });

  it('correctly identifies Backend Engineer for candidate strong in Node.js, databases, and APIs', () => {
    const profile = calculateCompetencyProfile({
      candidateId: 'cand-backend',
      extractedSkills: [
        { name: 'NodeJS', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.9 },
        { name: 'Databases', category: 'databases', evidenceTier: 'project_supported', confidence: 0.95 },
        { name: 'API Design', category: 'systems', evidenceTier: 'extracted', confidence: 0.85 },
      ],
    });

    const recommendations = matchCandidateToRoles('cand-backend', profile);
    expect(['Backend Engineer', 'Full-Stack Engineer']).toContain(recommendations.primaryRecommendation.role);
  });
});
