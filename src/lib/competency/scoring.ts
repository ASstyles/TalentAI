import { CompetencyProfile, CompetencyScoreItem } from '@/types/competency';
import { ExtractedSkill } from '@/types/resume';
import { InterviewQuestion } from '@/types/interview';
import { CodingSubmission } from '@/types/coding';
import { VerificationRecord } from '@/types/verification';

export interface AggregationInput {
  candidateId: string;
  claimedSkills?: string[];
  extractedSkills?: ExtractedSkill[];
  verifiedRecords?: VerificationRecord[];
  interviewQuestions?: InterviewQuestion[];
  codingSubmissions?: CodingSubmission[];
}

/**
 * Weights used exclusively for Demonstrated ability calculations.
 * Tiers 1 and 2 (claimed and self-extracted) are excluded from demonstrated scoring.
 */
export const DEMONSTRATED_TIER_WEIGHTS = {
  project_supported: 0.4,
  verified: 0.7,
  assessed: 1.0,
} as const;

/**
 * Mathematically defensible competency profile calculator.
 * Strictly separates:
 * 1. Claimed score vs. Demonstrated score (Claims alone CANNOT raise demonstrated scores)
 * 2. Verification state ('unverified', 'partially_verified', 'verified', 'refuted')
 * 3. Evidence coverage (% of evidence hierarchy present)
 * 4. Uncertainty (100% when purely claimed, calibrated down as verified/assessed evidence corroborates)
 * 5. Deterministic, explainable scoring without arbitrary bias
 */
export function calculateCompetencyProfile(input: AggregationInput): CompetencyProfile {
  const competencies: Record<string, CompetencyScoreItem> = {};

  const ensureSkill = (skillName: string, category: CompetencyScoreItem['category'] = 'languages'): CompetencyScoreItem => {
    const key = skillName.trim().toLowerCase();
    if (!competencies[key]) {
      competencies[key] = {
        skillId: key,
        skillName: skillName.trim(),
        category,
        demonstratedScore: 0,
        claimedScore: undefined,
        coverage: 0,
        confidence: 0,
        uncertainty: 100,
        verificationState: 'unverified',
        assessmentQuality: 'none',
        freshnessScore: 100,
        status: 'unassessed_claimed',
        evidenceTiersPresent: [],
        sourceBreakdown: {},
      };
    }
    return competencies[key];
  };

  // 1. Process Claimed Skills (Tier 1: Stated by candidate)
  if (input.claimedSkills) {
    for (const skill of input.claimedSkills) {
      if (!skill || !skill.trim()) continue;
      const item = ensureSkill(skill);
      if (!item.evidenceTiersPresent.includes('claimed')) {
        item.evidenceTiersPresent.push('claimed');
      }
      item.claimedScore = 50; // Claimed baseline indicator
      item.sourceBreakdown.claimedScore = 50;
    }
  }

  // 2. Process Resume Extracted Skills (Tier 2 & 3: Contextual resume analysis)
  if (input.extractedSkills) {
    for (const skill of input.extractedSkills) {
      if (!skill || !skill.name) continue;
      const item = ensureSkill(skill.name, skill.category);
      const tier = skill.evidenceTier || 'extracted';
      if (!item.evidenceTiersPresent.includes(tier)) {
        item.evidenceTiersPresent.push(tier);
      }

      const score = Math.round(Math.min(100, Math.max(0, skill.confidence * 85)));
      if (tier === 'project_supported') {
        item.sourceBreakdown.projectScore = Math.max(item.sourceBreakdown.projectScore || 0, score);
      } else {
        item.sourceBreakdown.extractedScore = Math.max(item.sourceBreakdown.extractedScore || 0, score);
        if (item.claimedScore === undefined) {
          item.claimedScore = score;
        }
      }
    }
  }

  // 3. Process Independently Verified Records (Tier 4: Third-party credential / employment proof)
  if (input.verifiedRecords) {
    for (const record of input.verifiedRecords) {
      if (!record || !record.claimTitle) continue;
      const item = ensureSkill(record.claimTitle);
      if (record.status === 'verified') {
        if (!item.evidenceTiersPresent.includes('verified')) {
          item.evidenceTiersPresent.push('verified');
        }
        item.verificationState = 'verified';
        item.sourceBreakdown.verifiedScore = Math.max(
          item.sourceBreakdown.verifiedScore || 0,
          Math.min(100, Math.max(0, record.confidence))
        );
      } else if (record.status === 'partially_verified') {
        if (!item.evidenceTiersPresent.includes('verified')) {
          item.evidenceTiersPresent.push('verified');
        }
        item.verificationState = 'partially_verified';
        item.sourceBreakdown.verifiedScore = Math.max(
          item.sourceBreakdown.verifiedScore || 0,
          Math.round(record.confidence * 0.7)
        );
      } else if (record.status === 'failed') {
        item.verificationState = 'refuted';
      }
    }
  }

  // 4. Process Technical Interviews (Tier 5: Real-time adaptive technical demonstration)
  if (input.interviewQuestions) {
    for (const q of input.interviewQuestions) {
      if (q.evaluation && q.topic) {
        const item = ensureSkill(q.topic);
        if (!item.evidenceTiersPresent.includes('assessed')) {
          item.evidenceTiersPresent.push('assessed');
        }
        item.assessmentQuality = item.assessmentQuality === 'rigorous' ? 'rigorous' : 'basic';
        const evalScore = Math.min(100, Math.max(0, q.evaluation.compositeScore));
        item.sourceBreakdown.assessedScore = Math.max(item.sourceBreakdown.assessedScore || 0, evalScore);
      }
    }
  }

  // 5. Process Coding Submissions (Tier 5: Sandboxed deterministic algorithmic evaluation)
  if (input.codingSubmissions) {
    for (const sub of input.codingSubmissions) {
      if (sub && sub.language) {
        const item = ensureSkill(sub.language);
        if (!item.evidenceTiersPresent.includes('assessed')) {
          item.evidenceTiersPresent.push('assessed');
        }
        item.assessmentQuality = 'rigorous';
        const codeScore = Math.min(100, Math.max(0, sub.score));
        item.sourceBreakdown.assessedScore = Math.max(item.sourceBreakdown.assessedScore || 0, codeScore);
      }
    }
  }

  // Compute multidimensional, evidence-weighted scores per competency
  let totalDemonstrated = 0;
  let totalIntegrity = 0;
  let assessedCount = 0;
  let unassessedCount = 0;
  const skillCount = Object.keys(competencies).length;

  for (const key of Object.keys(competencies)) {
    const item = competencies[key];
    const tiers = item.evidenceTiersPresent;

    // Mathematical Invariant: Demonstrated score ONLY factors in demonstrated evidence tiers (3, 4, 5)
    // Candidate self-claims (Tier 1) and raw resume mentions (Tier 2) NEVER contribute to demonstrated score.
    let demonstratedWeightedSum = 0;
    let demonstratedWeightSum = 0;

    if (item.sourceBreakdown.projectScore !== undefined) {
      demonstratedWeightedSum += item.sourceBreakdown.projectScore * DEMONSTRATED_TIER_WEIGHTS.project_supported;
      demonstratedWeightSum += DEMONSTRATED_TIER_WEIGHTS.project_supported;
    }
    if (item.sourceBreakdown.verifiedScore !== undefined) {
      demonstratedWeightedSum += item.sourceBreakdown.verifiedScore * DEMONSTRATED_TIER_WEIGHTS.verified;
      demonstratedWeightSum += DEMONSTRATED_TIER_WEIGHTS.verified;
    }
    if (item.sourceBreakdown.assessedScore !== undefined) {
      demonstratedWeightedSum += item.sourceBreakdown.assessedScore * DEMONSTRATED_TIER_WEIGHTS.assessed;
      demonstratedWeightSum += DEMONSTRATED_TIER_WEIGHTS.assessed;
    }

    item.demonstratedScore = demonstratedWeightSum > 0
      ? Math.round(demonstratedWeightedSum / demonstratedWeightSum)
      : 0;

    // Coverage: Percentage of the 5 evidence tiers present for this skill
    item.coverage = Math.min(100, Math.round((tiers.length / 5) * 100));

    // Confidence calibration: 0 for purely claimed; strictly increases as verified and assessed tiers are established
    const hasProject = tiers.includes('project_supported');
    const hasVerified = tiers.includes('verified');
    const hasAssessed = tiers.includes('assessed');

    if (!hasProject && !hasVerified && !hasAssessed) {
      // Purely self-claimed or raw extracted
      item.confidence = 0;
      item.uncertainty = 100;
      item.status = 'unassessed_claimed';
      unassessedCount++;
    } else {
      let confidenceScore = 0;
      if (hasProject) confidenceScore += 25;
      if (hasVerified) confidenceScore += 35;
      if (hasAssessed) confidenceScore += 40;

      item.confidence = Math.min(100, confidenceScore);
      item.uncertainty = Math.max(0, 100 - item.confidence);

      assessedCount++;
      if (item.demonstratedScore >= 80) {
        item.status = 'assessed_strong';
      } else if (item.demonstratedScore >= 60) {
        item.status = 'assessed_competent';
      } else {
        item.status = 'assessed_weak';
      }
    }

    totalDemonstrated += item.demonstratedScore;

    // Integrity: Ratio of verified/assessed weight
    if (hasVerified || hasAssessed) {
      totalIntegrity += 100;
    } else if (hasProject) {
      totalIntegrity += 60;
    } else {
      totalIntegrity += 10;
    }
  }

  const sortedSkills = Object.values(competencies).sort((a, b) => b.demonstratedScore - a.demonstratedScore);
  const strongestSkills = sortedSkills
    .filter((s) => s.demonstratedScore > 0)
    .slice(0, 5)
    .map((s) => s.skillName);

  const growthOpportunities = sortedSkills
    .filter((s) => s.demonstratedScore > 0 && s.demonstratedScore < 70)
    .slice(-5)
    .map((s) => s.skillName);

  return {
    id: input.candidateId,
    candidateId: input.candidateId,
    competencies,
    strongestSkills,
    growthOpportunities,
    overallProficiencyScore: skillCount > 0 ? Math.round(totalDemonstrated / skillCount) : 0,
    evidenceIntegrityScore: skillCount > 0 ? Math.round(totalIntegrity / skillCount) : 0,
    assessedSkillCount: assessedCount,
    unassessedSkillCount: unassessedCount,
    lastComputedAt: new Date().toISOString(),
  };
}
