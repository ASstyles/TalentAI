'use client';

import { MOCK_CANDIDATE } from '@/lib/data/mock-data';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';
import { matchCandidateToRoles } from '@/lib/matching/role-matcher';
import { Cpu, Award, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function RoleRecommendationsPage() {
  const profile = calculateCompetencyProfile({
    candidateId: MOCK_CANDIDATE.id,
    claimedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    extractedSkills: [
      { name: 'TypeScript', category: 'languages', evidenceTier: 'project_supported', confidence: 0.95 },
      { name: 'React', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.92 },
      { name: 'Node.js', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.94 },
      { name: 'Distributed Systems', category: 'systems', evidenceTier: 'extracted', confidence: 0.88 },
      { name: 'Docker', category: 'cloud', evidenceTier: 'extracted', confidence: 0.85 },
    ],
  });

  const recommendation = matchCandidateToRoles(MOCK_CANDIDATE.id, profile);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/60 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-800 mb-2">
          <Cpu className="h-3.5 w-3.5" />
          Multi-Role Competency Alignment Engine
        </div>
        <h1 className="text-2xl font-bold text-white">Engineering Role Recommendations</h1>
        <p className="mt-1 text-sm text-slate-400">
          Evaluated against 16 engineering specializations using calibrated evidence-weighted scoring.
        </p>
      </div>

      {/* Primary Role Match Banner */}
      <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/60 p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Primary Recommendation</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">
              {recommendation.primaryRecommendation.role}
            </h2>
            <p className="mt-2 text-xs text-slate-300 max-w-2xl leading-relaxed">
              {recommendation.primaryRecommendation.rationale}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-slate-950/80 p-4 border border-blue-500/30 text-center">
              <span className="text-xs text-slate-400">Compatibility</span>
              <div className="text-3xl font-extrabold text-blue-400">
                {recommendation.primaryRecommendation.compatibilityScore}%
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800 text-center">
              <span className="text-xs text-slate-400">Coverage</span>
              <div className="text-3xl font-extrabold text-emerald-400">
                {recommendation.primaryRecommendation.coverageScore}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Matches & Pathways */}
      <div className="grid gap-6 sm:grid-cols-3">
        {recommendation.alternativeRecommendations.map((alt) => (
          <div key={alt.role} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{alt.role}</h3>
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-300 border border-slate-800">
                {alt.compatibilityScore}%
              </span>
            </div>
            <p className="text-xs text-slate-400">{alt.rationale}</p>
            <div className="border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
              <strong>Coverage:</strong> {alt.coverageScore}% of role rubric
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
