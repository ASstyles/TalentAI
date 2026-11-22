import { describe, it, expect } from 'vitest';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';

describe('Competency Calculation Engine', () => {
  it('correctly weighs claimed vs. assessed competencies using the 5 evidence tiers', () => {
    const profile = calculateCompetencyProfile({
      candidateId: 'cand-123',
      claimedSkills: ['TypeScript', 'React'],
      extractedSkills: [
        {
          name: 'TypeScript',
          category: 'languages',
          evidenceTier: 'project_supported',
          confidence: 0.9,
        },
      ],
      codingSubmissions: [
        {
          id: 'sub-1',
          assessmentId: 'ass-1',
          candidateId: 'cand-123',
          submittedCode: 'function solution() {}',
          language: 'typescript',
          passedTests: 5,
          totalTests: 5,
          score: 100,
          executionStatus: 'passed',
          results: [],
          submittedAt: new Date().toISOString(),
        },
      ],
    });

    expect(profile.candidateId).toBe('cand-123');
    const tsSkill = profile.competencies['typescript'];
    expect(tsSkill).toBeDefined();
    // Assessed weight is 1.0, project is 0.4, claimed is 0.1
    expect(tsSkill.evidenceTiersPresent).toContain('assessed');
    expect(tsSkill.demonstratedScore).toBeGreaterThan(70);
    expect(tsSkill.coverage).toBeGreaterThanOrEqual(40);
  });

  it('assigns lower confidence and integrity when skills are purely self-claimed', () => {
    const profile = calculateCompetencyProfile({
      candidateId: 'cand-456',
      claimedSkills: ['Python', 'Docker', 'Kubernetes'],
    });

    expect(profile.evidenceIntegrityScore).toBeLessThan(30);
    const pySkill = profile.competencies['python'];
    expect(pySkill.evidenceTiersPresent).toEqual(['claimed']);
    expect(pySkill.demonstratedScore).toBe(50);
  });
});
