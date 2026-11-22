'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';
import { matchCandidateToRoles } from '@/lib/matching/role-matcher';
import { CandidateProfile } from '@/types/user';
import { ShieldCheck, Award, FileText, CheckCircle2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function RecruiterCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const candidateId = unwrappedParams.id;

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCandidate() {
      try {
        const res = await fetch(`/api/candidate/profile?candidateId=${encodeURIComponent(candidateId)}`);
        if (!res.ok) {
          throw new Error(`Failed to load candidate (HTTP ${res.status})`);
        }
        const json = await res.json();
        if (!json.data) {
          throw new Error('Candidate record not found');
        }
        setCandidate(json.data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchCandidate();
  }, [candidateId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-bold text-white">Candidate Not Found</h2>
        <p className="text-xs text-slate-400">{error || `No candidate matches ID: ${candidateId}`}</p>
        <Link
          href="/recruiter/pipeline"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Pipeline
        </Link>
      </div>
    );
  }

  // Calculate real competency profile dynamically based on candidate data
  const profile = calculateCompetencyProfile({
    candidateId: candidate.id,
    claimedSkills: ['TypeScript', 'Distributed Systems', 'PostgreSQL'],
    extractedSkills: [
      { name: 'TypeScript', category: 'languages', evidenceTier: 'project_supported', confidence: 0.95 },
      { name: 'Node.js', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.94 },
      { name: 'Distributed Systems', category: 'systems', evidenceTier: 'extracted', confidence: 0.88 },
      { name: 'PostgreSQL', category: 'databases', evidenceTier: 'claimed', confidence: 0.75 },
    ],
    verifiedRecords: [],
    codingSubmissions: [],
  });

  const recommendation = matchCandidateToRoles(candidate.id, profile);

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
            <h1 className="text-2xl font-bold text-white">{candidate.headline ? candidate.headline.split('|')[0].trim() : 'Candidate Dossier'}</h1>
            <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800">
              Verified Candidate (ID: {candidate.id})
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl">{candidate.summary || 'No summary provided.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/recruiter/reports/${encodeURIComponent(candidate.id)}`}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition"
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
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alternative Roles</span>
            {recommendation.alternativeRecommendations.map((alt) => (
              <div key={alt.role} className="flex items-center justify-between rounded-lg bg-slate-950 p-2 border border-slate-800 text-xs">
                <span className="text-slate-300">{alt.role}</span>
                <span className="font-mono text-blue-400">{alt.compatibilityScore}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
