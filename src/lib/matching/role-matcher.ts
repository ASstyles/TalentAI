import { CompetencyProfile } from '@/types/competency';
import { EngineeringRole } from '@/types/job';
import { RoleCompatibility, RoleRecommendation } from '@/types/role';

interface RoleRubricRequirement {
  skill: string;
  weight: number; // 1 - 10
  minScore: number; // 0 - 100
}

/**
 * Standardized competency rubrics for 16 major engineering roles.
 */
export const ROLE_BENCHMARKS: Record<EngineeringRole, RoleRubricRequirement[]> = {
  'Software Engineer': [
    { skill: 'algorithms', weight: 9, minScore: 70 },
    { skill: 'data structures', weight: 9, minScore: 70 },
    { skill: 'system design', weight: 8, minScore: 65 },
    { skill: 'testing', weight: 7, minScore: 60 },
    { skill: 'git', weight: 6, minScore: 60 },
  ],
  'Frontend Engineer': [
    { skill: 'react', weight: 10, minScore: 75 },
    { skill: 'typescript', weight: 9, minScore: 70 },
    { skill: 'css', weight: 8, minScore: 70 },
    { skill: 'web performance', weight: 8, minScore: 65 },
    { skill: 'accessibility', weight: 7, minScore: 60 },
  ],
  'Backend Engineer': [
    { skill: 'nodejs', weight: 9, minScore: 70 },
    { skill: 'api design', weight: 9, minScore: 75 },
    { skill: 'databases', weight: 9, minScore: 75 },
    { skill: 'caching', weight: 7, minScore: 65 },
    { skill: 'microservices', weight: 8, minScore: 65 },
  ],
  'Full-Stack Engineer': [
    { skill: 'react', weight: 8, minScore: 70 },
    { skill: 'nodejs', weight: 8, minScore: 70 },
    { skill: 'databases', weight: 8, minScore: 70 },
    { skill: 'api design', weight: 8, minScore: 70 },
    { skill: 'cloud', weight: 7, minScore: 60 },
  ],
  'AI Engineer': [
    { skill: 'python', weight: 10, minScore: 80 },
    { skill: 'llms', weight: 10, minScore: 75 },
    { skill: 'prompt engineering', weight: 8, minScore: 70 },
    { skill: 'vector databases', weight: 8, minScore: 65 },
    { skill: 'rag', weight: 9, minScore: 70 },
  ],
  'Machine Learning Engineer': [
    { skill: 'python', weight: 10, minScore: 80 },
    { skill: 'pytorch', weight: 9, minScore: 75 },
    { skill: 'model training', weight: 9, minScore: 75 },
    { skill: 'feature engineering', weight: 8, minScore: 70 },
    { skill: 'mlops', weight: 8, minScore: 65 },
  ],
  'Data Scientist': [
    { skill: 'python', weight: 9, minScore: 75 },
    { skill: 'statistics', weight: 10, minScore: 80 },
    { skill: 'sql', weight: 9, minScore: 75 },
    { skill: 'data visualization', weight: 8, minScore: 70 },
    { skill: 'predictive modeling', weight: 9, minScore: 70 },
  ],
  'Data Engineer': [
    { skill: 'sql', weight: 10, minScore: 80 },
    { skill: 'spark', weight: 8, minScore: 70 },
    { skill: 'data pipelines', weight: 10, minScore: 80 },
    { skill: 'data warehousing', weight: 9, minScore: 75 },
    { skill: 'python', weight: 8, minScore: 70 },
  ],
  'Computer Vision Engineer': [
    { skill: 'python', weight: 9, minScore: 75 },
    { skill: 'opencv', weight: 9, minScore: 75 },
    { skill: 'deep learning', weight: 9, minScore: 75 },
    { skill: 'image processing', weight: 8, minScore: 70 },
    { skill: 'cuda', weight: 7, minScore: 60 },
  ],
  'NLP Engineer': [
    { skill: 'python', weight: 9, minScore: 75 },
    { skill: 'transformers', weight: 10, minScore: 80 },
    { skill: 'text preprocessing', weight: 8, minScore: 70 },
    { skill: 'embeddings', weight: 9, minScore: 75 },
    { skill: 'fine-tuning', weight: 8, minScore: 70 },
  ],
  'DevOps Engineer': [
    { skill: 'docker', weight: 10, minScore: 80 },
    { skill: 'kubernetes', weight: 9, minScore: 75 },
    { skill: 'ci/cd', weight: 9, minScore: 75 },
    { skill: 'terraform', weight: 8, minScore: 70 },
    { skill: 'linux', weight: 8, minScore: 70 },
  ],
  'Cloud Engineer': [
    { skill: 'aws', weight: 9, minScore: 75 },
    { skill: 'gcp', weight: 8, minScore: 70 },
    { skill: 'cloud architecture', weight: 9, minScore: 75 },
    { skill: 'networking', weight: 8, minScore: 65 },
    { skill: 'security', weight: 8, minScore: 70 },
  ],
  'MLOps Engineer': [
    { skill: 'kubeflow', weight: 8, minScore: 65 },
    { skill: 'model monitoring', weight: 9, minScore: 75 },
    { skill: 'ci/cd', weight: 8, minScore: 70 },
    { skill: 'docker', weight: 9, minScore: 75 },
    { skill: 'python', weight: 8, minScore: 70 },
  ],
  'Cybersecurity Engineer': [
    { skill: 'network security', weight: 10, minScore: 80 },
    { skill: 'vulnerability assessment', weight: 9, minScore: 75 },
    { skill: 'cryptography', weight: 8, minScore: 70 },
    { skill: 'incident response', weight: 8, minScore: 70 },
    { skill: 'owasp', weight: 9, minScore: 75 },
  ],
  'QA Automation Engineer': [
    { skill: 'test automation', weight: 10, minScore: 80 },
    { skill: 'playwright', weight: 8, minScore: 70 },
    { skill: 'selenium', weight: 7, minScore: 65 },
    { skill: 'ci/cd', weight: 8, minScore: 65 },
    { skill: 'api testing', weight: 9, minScore: 75 },
  ],
  'Site Reliability Engineer': [
    { skill: 'observability', weight: 9, minScore: 75 },
    { skill: 'incident management', weight: 9, minScore: 75 },
    { skill: 'linux', weight: 9, minScore: 75 },
    { skill: 'distributed systems', weight: 9, minScore: 75 },
    { skill: 'automation', weight: 8, minScore: 70 },
  ],
};

const SKILL_ALIASES: Record<string, string[]> = {
  'react': ['react', 'react.js', 'reactjs'],
  'nodejs': ['nodejs', 'node', 'node.js'],
  'typescript': ['typescript', 'ts'],
  'javascript': ['javascript', 'js'],
  'databases': ['databases', 'database', 'sql', 'postgres', 'postgresql', 'mongodb', 'mongo', 'firestore', 'mysql'],
  'cloud': ['cloud', 'aws', 'gcp', 'azure', 'cloud architecture'],
  'ci/cd': ['ci/cd', 'cicd', 'github actions', 'jenkins', 'gitlab ci'],
  'docker': ['docker', 'containers', 'containerization'],
  'kubernetes': ['kubernetes', 'k8s'],
  'python': ['python', 'py'],
  'llms': ['llms', 'large language models', 'genai', 'generative ai', 'gpt'],
  'system design': ['system design', 'systems architecture', 'architecture'],
  'api design': ['api design', 'apis', 'rest', 'restful apis', 'graphql'],
  'css': ['css', 'css3', 'styling', 'tailwind', 'sass', 'scss'],
  'html': ['html', 'html5'],
  'testing': ['testing', 'unit testing', 'vitest', 'jest', 'cypress', 'playwright'],
};

/**
 * Calculates evidence-grounded role compatibility against all 16 engineering positions.
 */
export function matchCandidateToRoles(
  candidateId: string,
  profile: CompetencyProfile
): RoleRecommendation {
  const evaluatedRoles: RoleCompatibility[] = [];

  for (const [roleName, benchmarks] of Object.entries(ROLE_BENCHMARKS) as Array<[EngineeringRole, RoleRubricRequirement[]]>) {
    let totalWeight = 0;
    let earnedWeightScore = 0;
    let coverageCount = 0;
    let totalConfidence = 0;

    const matching: RoleCompatibility['matchingCompetencies'] = [];
    const missing: RoleCompatibility['missingOrDeficientCompetencies'] = [];

    for (const bench of benchmarks) {
      totalWeight += bench.weight;
      // Search candidate competencies for match (fuzzy match, aliases, or direct key)
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanBenchKey = normalize(bench.skill);
      let matchedCompetency = profile.competencies[bench.skill.toLowerCase()];

      // Fallback: check aliases and normalized match
      if (!matchedCompetency) {
        const aliases = SKILL_ALIASES[bench.skill.toLowerCase()] || [];
        for (const [ckey, cval] of Object.entries(profile.competencies)) {
          const cleanCkey = normalize(ckey);
          if (
            cleanCkey === cleanBenchKey ||
            cleanCkey.includes(cleanBenchKey) ||
            cleanBenchKey.includes(cleanCkey) ||
            aliases.some((alias) => normalize(alias) === cleanCkey || cleanCkey.includes(normalize(alias)))
          ) {
            matchedCompetency = cval;
            break;
          }
        }
      }

      const demonstrated = matchedCompetency ? matchedCompetency.demonstratedScore : 0;
      const unverified = matchedCompetency
        ? (matchedCompetency.sourceBreakdown.extractedScore || matchedCompetency.claimedScore || 0)
        : 0;
      const score = demonstrated > 0 ? demonstrated : unverified;
      const confidence = matchedCompetency ? matchedCompetency.confidence : 10;

      if (matchedCompetency && score > 0) {
        coverageCount++;
        totalConfidence += confidence;
        earnedWeightScore += (score / 100) * bench.weight * 100;
        matching.push({
          name: bench.skill,
          candidateScore: score,
          requiredScore: bench.minScore,
          weight: bench.weight,
        });
      } else {
        missing.push({
          name: bench.skill,
          candidateScore: 0,
          requiredScore: bench.minScore,
          gapSeverity: bench.weight >= 8 ? 'high' : 'medium',
        });
      }
    }

    const compatibilityScore = totalWeight > 0 ? Math.round(earnedWeightScore / totalWeight) : 0;
    const coverageScore = Math.round((coverageCount / benchmarks.length) * 100);
    const confidenceScore = coverageCount > 0 ? Math.round(totalConfidence / coverageCount) : 20;

    const rationale = `Demonstrated ${coverageScore}% coverage of core requirements with ${compatibilityScore}% weighted compatibility. High proficiency in: ${matching
      .filter((m) => m.candidateScore >= m.requiredScore)
      .map((m) => m.name)
      .join(', ') || 'none'}.`;

    evaluatedRoles.push({
      role: roleName,
      compatibilityScore,
      confidenceScore,
      coverageScore,
      matchingCompetencies: matching,
      missingOrDeficientCompetencies: missing,
      rationale,
    });
  }

  // Sort roles by compatibility descending
  evaluatedRoles.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const primaryRecommendation = evaluatedRoles[0];
  const alternativeRecommendations = evaluatedRoles.slice(1, 4);

  const growthPathways = evaluatedRoles.slice(1, 4).map((alt) => ({
    targetRole: alt.role,
    readinessScore: alt.compatibilityScore,
    recommendedActions: alt.missingOrDeficientCompetencies.map(
      (m) => `Complete practical projects and assessment in ${m.name} (target score: ${m.requiredScore}+)`
    ),
  }));

  return {
    id: `rec-${candidateId}-${Date.now()}`,
    candidateId,
    primaryRecommendation,
    alternativeRecommendations,
    growthPathways,
    generatedAt: new Date().toISOString(),
  };
}
