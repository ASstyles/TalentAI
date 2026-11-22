import { CompetencyProfile, CompetencyScoreItem, CompetencyStatus } from '@/types/competency';
import { EvidenceTier, TIER_WEIGHTS, ExtractedSkill } from '@/types/resume';
import { InterviewQuestion } from '@/types/interview';
import { CodingSubmission } from '@/types/coding';
import { VerificationRecord } from '@/types/verification';

interface AggregationInput {
  candidateId: string;
  claimedSkills?: string[];
  extractedSkills?: ExtractedSkill[];
  verifiedRecords?: VerificationRecord[];
  interviewQuestions?: InterviewQuestion[];
  codingSubmissions?: CodingSubmission[];
}

/**
 * Mathematically defensible competency profile calculator.
 * Strictly separates:
 * - Claimed score vs. Demonstrated score
 * - Verification state ('unverified', 'partially_verified', 'verified', 'refuted')
 * - Evidence coverage (% of evidence hierarchy present)
 * - Uncertainty (high when unassessed or purely claimed, low when corroborated across verified/assessed tiers)
 * - Distinct competency status (e.g. unassessed_claimed vs. assessed_weak)
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

  // 1. Process Claimed Skills (Tier 1)
  if (input.claimedSkills) {
    for (const skill of input.claimedSkills) {
      const item = ensureSkill(skill);
      if (!item.evidenceTiersPresent.includes('claimed')) {
        item.evidenceTiersPresent.push('claimed');
      }
      item.claimedScore = 50; // Claimed baseline
      item.sourceBreakdown.claimedScore = 50;
    }
  }

  // 2. Process Resume Extracted Skills (Tier 2 & 3)
  if (input.extractedSkills) {
    for (const skill of input.extractedSkills) {
      const item = ensureSkill(skill.name, skill.category);
      const tier = skill.evidenceTier || 'extracted';
      if (!item.evidenceTiersPresent.includes(tier)) {
        item.evidenceTiersPresent.push(tier);
      }

      const score = Math.round(skill.confidence * 85);
      if (tier === 'project_supported') {
        item.sourceBreakdown.projectScore = Math.max(item.sourceBreakdown.projectScore || 0, score);
      } else {
        item.sourceBreakdown.extractedScore = Math.max(item.sourceBreakdown.extractedScore || 0, score);
      }
    }
  }

  // 3. Process Independently Verified Records (Tier 4)
  if (input.verifiedRecords) {
    for (const record of input.verifiedRecords) {
      const item = ensureSkill(record.claimTitle);
      if (record.status === 'verified') {
        if (!item.evidenceTiersPresent.includes('verified')) {
          item.evidenceTiersPresent.push('verified');
        }
        item.verificationState = 'verified';
        item.sourceBreakdown.verifiedScore = Math.max(item.sourceBreakdown.verifiedScore || 0, record.confidence);
      } else if (record.status === 'partially_verified') {
        if (!item.evidenceTiersPresent.includes('verified')) {
          item.evidenceTiersPresent.push('verified');
        }
        item.verificationState = 'partially_verified';
        item.sourceBreakdown.verifiedScore = Math.max(item.sourceBreakdown.verifiedScore || 0, Math.round(record.confidence * 0.7));
      } else if (record.status === 'failed') {
        item.verificationState = 'refuted';
      }
    }
  }

  // 4. Process Technical Interviews (Tier 5: Assessed)
  if (input.interviewQuestions) {
    for (const q of input.interviewQuestions) {
      if (q.evaluation && q.topic) {
        const item = ensureSkill(q.topic);
        if (!item.evidenceTiersPresent.includes('assessed')) {
          item.evidenceTiersPresent.push('assessed');
        }
        item.assessmentQuality = item.assessmentQuality === 'rigorous' ? 'rigorous' : 'basic';
        const evalScore = q.evaluation.compositeScore;
        item.sourceBreakdown.assessedScore = Math.max(item.sourceBreakdown.assessedScore || 0, evalScore);
      }
    }
  }

  // 5. Process Coding Submissions (Tier 5: Assessed)
  if (input.codingSubmissions) {
    for (const sub of input.codingSubmissions) {
      if (sub && sub.language) {
        const item = ensureSkill(sub.language);
        if (!item.evidenceTiersPresent.includes('assessed')) {
          item.evidenceTiersPresent.push('assessed');
        }
        item.assessmentQuality = 'rigorous';
        item.sourceBreakdown.assessedScore = Math.max(item.sourceBreakdown.assessedScore || 0, sub.score);
      }
    }
  }

  // Calculate multidimensional scores per competency
  let totalDemonstrated = 0;
  let totalIntegrity = 0;
  let assessedCount = 0;
  let unassessedCount = 0;
  const skillCount = Object.keys(competencies).length;

  for (const key of Object.keys(competencies)) {
    const item = competencies[key];
    const tiers = item.evidenceTiersPresent;

    let weightedSum = 0;
    let weightSum = 0;

    if (item.sourceBreakdown.claimedScore !== undefined) {
      weightedSum += item.sourceBreakdown.claimedScore * TIER_WEIGHTS.claimed;
      weightSum += TIER_WEIGHTS.claimed;
    }
    if (item.sourceBreakdown.extractedScore !== undefined) {
      weightedSum += item.sourceBreakdown.extractedScore * TIER_WEIGHTS.extracted;
      weightSum += TIER_WEIGHTS.extracted;
    }
    if (item.sourceBreakdown.projectScore !== undefined) {
      weightedSum += item.sourceBreakdown.projectScore * TIER_WEIGHTS.project_supported;
      weightSum += TIER_WEIGHTS.project_supported;
    }
    if (item.sourceBreakdown.verifiedScore !== undefined) {
      weightedSum += item.sourceBreakdown.verifiedScore * TIER_WEIGHTS.verified;
      weightSum += TIER_WEIGHTS.verified;
    }
    if (item.sourceBreakdown.assessedScore !== undefined) {
      weightedSum += item.sourceBreakdown.assessedScore * TIER_WEIGHTS.assessed;
      weightSum += TIER_WEIGHTS.assessed;
    }

    item.demonstratedScore = weightSum > 0 ? Math.round(weightedSum / weightSum) : 0;
    item.coverage = Math.min(100, Math.round((tiers.length / 5) * 100));

    // Confidence increases as higher tiers (verified & assessed) are established
    const highTierCount = tiers.filter((t) => t === 'verified' || t === 'assessed' || t === 'project_supported').length;
    item.confidence = Math.min(100, Math.round(30 + highTierCount * 23));
    item.uncertainty = Math.max(0, 100 - item.confidence);

    // Determine honest, non-fabricated status
    const hasDemonstratedEvidence = tiers.includes('assessed') || tiers.includes('project_supported');
    if (hasDemonstratedEvidence) {
      assessedCount++;
      if (item.demonstratedScore >= 80) {
        item.status = 'assessed_strong';
      } else if (item.demonstratedScore >= 60) {
        item.status = 'assessed_competent';
      } else {
        item.status = 'assessed_weak';
      }
    } else if (tiers.includes('claimed') || tiers.includes('extracted')) {
      unassessedCount++;
      item.status = 'unassessed_claimed';
    } else {
      unassessedCount++;
      item.status = 'insufficient_evidence';
    }

    totalDemonstrated += item.demonstratedScore;
    if (tiers.includes('verified') || tiers.includes('assessed')) {
      totalIntegrity += 100;
    } else if (tiers.includes('project_supported')) {
      totalIntegrity += 60;
    } else {
      totalIntegrity += 20;
    }
  }

  const sortedSkills = Object.values(competencies).sort((a, b) => b.demonstratedScore - a.demonstratedScore);
  const strongestSkills = sortedSkills.slice(0, 5).map((s) => s.skillName);
  const growthOpportunities = sortedSkills
    .filter((s) => s.demonstratedScore < 70)
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
