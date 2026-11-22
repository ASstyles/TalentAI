'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { CandidateProfile } from '@/types/user';
import { JobApplication } from '@/types/application';
import { RoleRecommendation } from '@/types/role';
import { CompetencyProfile } from '@/types/competency';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  Code2,
  Cpu,
  Plus,
  RefreshCw,
  AlertCircle,
  Briefcase,
  TrendingUp,
} from 'lucide-react';

export default function CandidateDashboard() {
  const { user, idToken } = useAuth();

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [recommendations, setRecommendations] = useState<RoleRecommendation | null>(null);
  const [competencyProfile, setCompetencyProfile] = useState<CompetencyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const [profileRes, appsRes, recRes] = await Promise.all([
        fetch('/api/candidate/profile', { headers }).catch(() => null),
        fetch('/api/applications', { headers }).catch(() => null),
        fetch('/api/matching/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({}),
        }).catch(() => null),
      ]);

      if (profileRes && profileRes.ok) {
        const pJson = await profileRes.json();
        if (pJson.data) setProfile(pJson.data);
      }

      if (appsRes && appsRes.ok) {
        const aJson = await appsRes.json();
        if (aJson.data) setApplications(aJson.data);
      }

      if (recRes && recRes.ok) {
        const rJson = await recRes.json();
        if (rJson.data) {
          setRecommendations(rJson.data.recommendations);
          setCompetencyProfile(rJson.data.profile);
        }
      }
    } catch (err) {
      console.error('[CandidateDashboard] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Compute profile completion percentage
  const hasHeadline = Boolean(profile?.headline && profile.headline.trim());
  const hasSummary = Boolean(profile?.summary && profile.summary.trim());
  const hasSkills = Boolean(
    (profile as any)?.extractedSkills?.length || (profile as any)?.claimedSkills?.length
  );
  const hasApplication = applications.length > 0;
  const isVerified = (profile?.overallVerificationScore || 0) > 0;

  let completionScore = 20; // Base registered account
  if (hasHeadline) completionScore += 20;
  if (hasSummary) completionScore += 20;
  if (hasSkills) completionScore += 20;
  if (hasApplication || isVerified) completionScore += 20;

  const primaryRole = recommendations?.primaryRecommendation;
  const verifiedScore = profile?.overallVerificationScore || (isVerified ? 100 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Candidate Profile Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                {profile?.headline || user?.displayName || 'Engineering Candidate Workspace'}
              </h1>
              <span className="rounded-full bg-blue-950 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-800">
                Candidate Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              {profile?.summary ||
                'Demonstrate verified engineering competencies, explore 16 standardized role rubrics, and track real-time job applications.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/candidate/resume"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 transition"
            >
              Update Resume Intelligence
            </Link>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real Data Metric Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400">Profile Completion</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">{completionScore}%</span>
              <span className="text-[11px] text-slate-500">profile readiness</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400">Active Applications</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-400">{applications.length}</span>
              <span className="text-[11px] text-slate-500">tracked requisitions</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400">Primary Role Fit</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-400">
                {primaryRole ? `${primaryRole.compatibilityScore}%` : '—'}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[90px]">
                {primaryRole ? primaryRole.role : 'Uncalibrated'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400">Evidence Integrity</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-cyan-400">{verifiedScore}%</span>
              <span className="text-[11px] text-slate-500">calibrated proof</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Applications & Next Steps */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Active Applications Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              <span>Active Job Applications ({applications.length})</span>
            </h2>
            <Link href="/candidate/jobs" className="text-xs text-blue-400 hover:underline">
              Browse More Positions →
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center text-slate-400 space-y-3">
              <Briefcase className="h-8 w-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No Active Job Applications</h3>
              <p className="text-xs max-w-sm mx-auto">
                You haven&apos;t submitted any applications yet. Browse authentic published engineering positions to apply with your verified profile.
              </p>
              <Link
                href="/candidate/jobs"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 mt-2"
              >
                Browse Open Positions
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 hover:border-slate-700 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{app.jobTitle}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Application ID: <code className="text-slate-300">{app.id}</code></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          app.status === 'offered'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : app.status === 'rejected'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                        }`}
                      >
                        Stage: {app.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
                    <Link
                      href={`/candidate/interview/${app.interviewId || app.id}`}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 transition"
                    >
                      <Cpu className="h-3.5 w-3.5" />
                      <span>Adaptive Interview Console</span>
                    </Link>
                    <Link
                      href={`/candidate/assessment/${app.codingAssessmentId || app.id}`}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>Coding Assessment Sandbox</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Actions & Role Match Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span>Next Steps</span>
          </h2>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            {primaryRole && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Primary Role Alignment
                </span>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-white">{primaryRole.role}</h4>
                  <span className="font-mono font-bold text-blue-400">{primaryRole.compatibilityScore}%</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {primaryRole.rationale}
                </p>
                <Link
                  href="/candidate/recommendations"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:underline pt-1"
                >
                  View 16-Role Breakdown →
                </Link>
              </div>
            )}

            <div className="border-t border-slate-800 pt-3 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-950 p-2 text-indigo-400 border border-indigo-800/50">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Extract Evidence from Resume</h4>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Upload your latest PDF/DOCX to extract skills and project architecture.
                  </p>
                  <Link href="/candidate/resume" className="mt-1.5 inline-block text-xs font-medium text-indigo-400 hover:underline">
                    Manage Resume Intelligence →
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <div className="rounded-lg bg-emerald-950 p-2 text-emerald-400 border border-emerald-800/50">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Verified Credentials</h4>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Add external diploma, certification, or GitHub repository proof.
                  </p>
                  <Link href="/candidate/verification" className="mt-1.5 inline-block text-xs font-medium text-emerald-400 hover:underline">
                    View Verification Records →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
