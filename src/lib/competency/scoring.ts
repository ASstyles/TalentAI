import { CompetencyProfile, CompetencyScoreItem } from '@/types/competency';
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
 * Calculates evidence-weighted competency scores across all 5 tiers:
 * Tier 1 (claimed): 0.1
 * Tier 2 (extracted): 0.2
 * Tier 3 (project_supported): 0.4
 * Tier 4 (verified): 0.7
 * Tier 5 (assessed): 1.0
 */
export function calculateCompetencyProfile(input: AggregationInput): CompetencyProfile {
  const competencies: Record<string, CompetencyScoreItem> = {};

  const ensureSkill = (skillName: string, category: CompetencyScoreItem['category'] = 'languages') => {
    const key = skillName.trim().toLowerCase();
    if (!competencies[key]) {
      competencies[key] = {
        skillId: key,
        skillName: skillName.trim(),
        category,
        demonstratedScore: 0,
        coverage: 0,
        confidence: 0,
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
      item.sourceBreakdown.claimedScore = 50; // Neutral baseline for pure claim
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
      if (record.status === 'verified' || record.status === 'partially_verified') {
        const item = ensureSkill(record.claimTitle);
        if (!item.evidenceTiersPresent.includes('verified')) {
          item.evidenceTiersPresent.push('verified');
        }
        const score = record.status === 'verified' ? record.confidence : Math.round(record.confidence * 0.7);
        item.sourceBreakdown.verifiedScore = Math.max(item.sourceBreakdown.verifiedScore || 0, score);
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
        item.sourceBreakdown.assessedScore = Math.max(item.sourceBreakdown.assessedScore || 0, sub.score);
      }
    }
  }

  // Compute weighted formula for each competency
  let totalProficiency = 0;
  let totalIntegrity = 0;
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
    // Coverage is percentage of the 5 evidence tiers present
    item.coverage = Math.min(100, Math.round((tiers.length / 5) * 100));

    // Confidence scales with presence of higher tiers (verified + assessed)
    const highTierCount = tiers.filter((t) => t === 'verified' || t === 'assessed' || t === 'project_supported').length;
    item.confidence = Math.min(100, Math.round(30 + highTierCount * 23));

    totalProficiency += item.demonstratedScore;
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
    overallProficiencyScore: skillCount > 0 ? Math.round(totalProficiency / skillCount) : 0,
    evidenceIntegrityScore: skillCount > 0 ? Math.round(totalIntegrity / skillCount) : 0,
    lastComputedAt: new Date().toISOString(),
  };
}
