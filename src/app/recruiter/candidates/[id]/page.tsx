'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  MOCK_CANDIDATE,
  MOCK_VERIFICATIONS,
  MOCK_INTERVIEW_SESSION,
  MOCK_CODING_SUBMISSION,
  MOCK_JOBS,
} from '@/lib/data/mock-data';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';
import { matchCandidateToRoles } from '@/lib/matching/role-matcher';
import { ShieldCheck, Award, FileText, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function RecruiterCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);

  const profile = calculateCompetencyProfile({
    candidateId: unwrappedParams.id || MOCK_CANDIDATE.id,
    claimedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    extractedSkills: [
      { name: 'TypeScript', category: 'languages', evidenceTier: 'project_supported', confidence: 0.95 },
      { name: 'React', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.92 },
      { name: 'Node.js', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.94 },
      { name: 'CSS', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.9 },
      { name: 'Docker', category: 'cloud', evidenceTier: 'project_supported', confidence: 0.88 },
    ],
    verifiedRecords: MOCK_VERIFICATIONS,
    codingSubmissions: [MOCK_CODING_SUBMISSION],
  });

  const recommendation = matchCandidateToRoles(MOCK_CANDIDATE.id, profile);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/recruiter/pipeline" className="flex items-center gap-1 text-xs text-indigo-400 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Pipeline
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Alex Mercer</h1>
            <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800">
              Verified Candidate (ID: {unwrappedParams.id})
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl">{MOCK_CANDIDATE.summary}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/recruiter/reports/app-alex-lead-fullstack`}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
          >
            Review Evidence Report & Decide
          </Link>
        </div>
      </div>

      {/* Evidence Breakdown */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Competencies & Evidence Hierarchy
          </h3>
          <div className="space-y-2">
            {Object.values(profile.competencies).map((c) => (
              <div key={c.skillId} className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5 border border-slate-800 text-xs">
                <span className="font-semibold text-white">{c.skillName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono text-slate-500">
                    {c.evidenceTiersPresent.join(', ')}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">{c.demonstratedScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            16-Role Fit Assessment
          </h3>
          <div className="rounded-xl bg-blue-950/40 p-4 border border-blue-900/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Primary Fit</span>
            <div className="text-lg font-bold text-white">{recommendation.primaryRecommendation.role}</div>
            <div className="text-xs text-slate-300">
              Compatibility: {recommendation.primaryRecommendation.compatibilityScore}% • Coverage: {recommendation.primaryRecommendation.coverageScore}%
            </div>
          </div>

          <h4 className="text-[11px] font-semibold uppercase text-slate-400 pt-2">Alternative Role Options</h4>
          <div className="space-y-2">
            {recommendation.alternativeRecommendations.map((alt) => (
              <div key={alt.role} className="flex items-center justify-between rounded-lg bg-slate-950 p-2 border border-slate-800 text-xs">
                <span className="text-slate-300">{alt.role}</span>
                <span className="font-mono text-slate-400">{alt.compatibilityScore}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
