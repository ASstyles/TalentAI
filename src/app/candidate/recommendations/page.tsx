'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { RoleRecommendation } from '@/types/role';
import { CompetencyProfile } from '@/types/competency';
import {
  Cpu,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Sparkles,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function RoleRecommendationsPage() {
  const { user, idToken } = useAuth();
  const [data, setData] = useState<{ profile: CompetencyProfile; recommendations: RoleRecommendation } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/matching/recommend', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load recommendations');
      }
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compute role recommendations');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const recommendation = data?.recommendations;
  const primaryRole = recommendation?.primaryRecommendation;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/60 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-800 mb-2">
            <Cpu className="h-3.5 w-3.5" />
            16-Role Engineering Rubrics
          </div>
          <h1 className="text-2xl font-bold text-white">Engineering Role Recommendations</h1>
          <p className="mt-1 text-xs text-slate-400">
            Calibrated against standardized role rubrics using evidence-weighted demonstrated competency scores.
          </p>
        </div>
        <button
          onClick={loadRecommendations}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recalibrate
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-8 text-center text-rose-300 space-y-3">
          <AlertCircle className="h-8 w-8 mx-auto text-rose-400" />
          <h3 className="text-base font-bold text-white">Unable to Load Recommendations</h3>
          <p className="text-xs max-w-md mx-auto">{error}</p>
        </div>
      ) : !primaryRole ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center text-slate-400 space-y-3">
          <FileText className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Competency Evidence Found</h3>
          <p className="text-xs max-w-md mx-auto">
            Upload your resume or complete an assessment to extract evidence and unlock personalized role matches.
          </p>
          <Link
            href="/candidate/resume"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 mt-2"
          >
            <Sparkles className="h-4 w-4" /> Upload Resume for Intelligence
          </Link>
        </div>
      ) : (
        <>
          {/* Primary Recommendation Banner */}
          <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-950/50 via-indigo-950/30 to-slate-900/80 p-6 sm:p-8 backdrop-blur-md shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Top Recommended Engineering Role
                </span>
                <h2 className="text-3xl font-extrabold text-white">{primaryRole.role}</h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  {primaryRole.rationale}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-slate-950/80 p-4 border border-blue-500/30 text-center min-w-[100px]">
                  <span className="text-[11px] text-slate-400 font-medium">Compatibility</span>
                  <div className="text-3xl font-extrabold text-blue-400 mt-0.5">
                    {primaryRole.compatibilityScore}%
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800 text-center min-w-[100px]">
                  <span className="text-[11px] text-slate-400 font-medium">Rubric Coverage</span>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-0.5">
                    {primaryRole.coverageScore}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Rubric Breakdown for Primary Role */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Matching Competencies */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Demonstrated Matching Competencies</span>
              </h3>
              {primaryRole.matchingCompetencies.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No direct demonstrated matches for this role rubric.</p>
              ) : (
                <div className="space-y-2">
                  {primaryRole.matchingCompetencies.map((m) => (
                    <div
                      key={m.name}
                      className="flex items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-white capitalize">{m.name}</span>
                        <div className="text-[10px] text-slate-500">Weight: {m.weight}/10</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400">{m.candidateScore}%</span>
                        <div className="text-[10px] text-slate-500">Required: {m.requiredScore}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missing or Deficient Competencies */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Identified Skill Gaps & Growth Areas</span>
              </h3>
              {primaryRole.missingOrDeficientCompetencies.length === 0 ? (
                <p className="text-xs text-slate-500 italic">100% of required competencies demonstrated!</p>
              ) : (
                <div className="space-y-2">
                  {primaryRole.missingOrDeficientCompetencies.map((m) => (
                    <div
                      key={m.name}
                      className="flex items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-white capitalize">{m.name}</span>
                        <div className="text-[10px] text-slate-500">Target score: {m.requiredScore}%+</div>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          m.gapSeverity === 'high'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {m.gapSeverity} Gap
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alternative Roles & Career Pathways */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <span>Alternative Roles & Growth Pathways</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              {recommendation.alternativeRecommendations.map((alt) => (
                <div
                  key={alt.role}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-white">{alt.role}</h4>
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-blue-400 border border-slate-800">
                      {alt.compatibilityScore}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{alt.rationale}</p>
                  <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Coverage: {alt.coverageScore}%</span>
                    <span>Confidence: {alt.confidenceScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
