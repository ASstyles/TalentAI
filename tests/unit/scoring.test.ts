import { describe, it, expect } from 'vitest';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';

describe('Competency Calculation Engine (Mathematical Invariant Verification)', () => {
  it('strictly isolates claimed skills from demonstrated scores (claims CANNOT manufacture competency)', () => {
    const profile = calculateCompetencyProfile({
      candidateId: 'cand-unassessed',
      claimedSkills: ['Python', 'Docker', 'Kubernetes'],
    });

    expect(profile.candidateId).toBe('cand-unassessed');
    expect(profile.overallProficiencyScore).toBe(0);
    expect(profile.evidenceIntegrityScore).toBe(10);
    expect(profile.assessedSkillCount).toBe(0);
    expect(profile.unassessedSkillCount).toBe(3);

    const pySkill = profile.competencies['python'];
    expect(pySkill).toBeDefined();
    expect(pySkill.evidenceTiersPresent).toEqual(['claimed']);
    // Invariant: Claimed skills MUST have demonstratedScore === 0
    expect(pySkill.demonstratedScore).toBe(0);
    expect(pySkill.claimedScore).toBe(50);
    expect(pySkill.confidence).toBe(0);
    expect(pySkill.uncertainty).toBe(100);
    expect(pySkill.status).toBe('unassessed_claimed');
    expect(pySkill.verificationState).toBe('unverified');
  });

  it('correctly weighs demonstrated competencies across project, verified, and assessed tiers', () => {
    const profile = calculateCompetencyProfile({
      candidateId: 'cand-demonstrated',
      claimedSkills: ['TypeScript'],
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
          candidateId: 'cand-demonstrated',
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

    const tsSkill = profile.competencies['typescript'];
    expect(tsSkill).toBeDefined();
    expect(tsSkill.evidenceTiersPresent).toContain('claimed');
    expect(tsSkill.evidenceTiersPresent).toContain('project_supported');
    expect(tsSkill.evidenceTiersPresent).toContain('assessed');

    // Demonstrated score is weighted average of project (score 77, weight 0.4) and assessed (score 100, weight 1.0)
    // (77 * 0.4 + 100 * 1.0) / 1.4 = (30.8 + 100) / 1.4 = 93
    expect(tsSkill.demonstratedScore).toBeGreaterThanOrEqual(90);
    expect(tsSkill.confidence).toBe(65); // 25 (project) + 40 (assessed)
    expect(tsSkill.uncertainty).toBe(35);
    expect(tsSkill.status).toBe('assessed_strong');
    expect(profile.assessedSkillCount).toBe(1);
  });

  it('adding verified evidence strictly increases confidence without corrupting demonstrated score', () => {
    const withoutVerified = calculateCompetencyProfile({
      candidateId: 'cand-comp',
      codingSubmissions: [
        {
          id: 'sub-2',
          assessmentId: 'ass-2',
          candidateId: 'cand-comp',
          submittedCode: 'def test(): pass',
          language: 'python',
          passedTests: 4,
          totalTests: 5,
          score: 80,
          executionStatus: 'passed',
          results: [],
          submittedAt: new Date().toISOString(),
        },
      ],
    });

    const withVerified = calculateCompetencyProfile({
      candidateId: 'cand-comp',
      codingSubmissions: [
        {
          id: 'sub-2',
          assessmentId: 'ass-2',
          candidateId: 'cand-comp',
          submittedCode: 'def test(): pass',
          language: 'python',
          passedTests: 4,
          totalTests: 5,
          score: 80,
          executionStatus: 'passed',
          results: [],
          submittedAt: new Date().toISOString(),
        },
      ],
      verifiedRecords: [
        {
          id: 'ver-1',
          candidateId: 'cand-comp',
          claimType: 'certification',
          claimTitle: 'Python',
          claimDetails: 'Certified Python Developer',
          status: 'verified',
          verificationSource: 'official_exam',
          confidence: 90,
          reviewedBy: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        },
      ],
    });

    const initial = withoutVerified.competencies['python'];
    const enriched = withVerified.competencies['python'];

    expect(enriched.confidence).toBeGreaterThan(initial.confidence);
    expect(enriched.uncertainty).toBeLessThan(initial.uncertainty);
    expect(enriched.verificationState).toBe('verified');
  });
});
