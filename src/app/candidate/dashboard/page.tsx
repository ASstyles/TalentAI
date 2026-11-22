'use client';

import Link from 'next/link';
import {
  MOCK_CANDIDATE,
  MOCK_APPLICATIONS,
  MOCK_VERIFICATIONS,
} from '@/lib/data/mock-data';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  Code2,
  Cpu,
} from 'lucide-react';

export default function CandidateDashboard() {
  const verifiedCount = MOCK_VERIFICATIONS.filter((v) => v.status === 'verified').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Candidate Profile Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{MOCK_CANDIDATE.headline}</h1>
              <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800">
                Verified Candidate
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400 max-w-3xl">
              {MOCK_CANDIDATE.summary}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/candidate/resume"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/20"
            >
              Update Resume Intelligence
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
            <span className="text-xs text-slate-400">Evidence Integrity</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">{MOCK_CANDIDATE.overallVerificationScore}%</span>
              <span className="text-xs text-slate-500">Tier 4 & 5 proof</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
            <span className="text-xs text-slate-400">Verified Credentials</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-cyan-400">{verifiedCount}</span>
              <span className="text-xs text-slate-500">independent sources</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
            <span className="text-xs text-slate-400">Active Applications</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-400">{MOCK_APPLICATIONS.length}</span>
              <span className="text-xs text-slate-500">positions tracked</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
            <span className="text-xs text-slate-400">Primary Role Fit</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-400">94%</span>
              <span className="text-xs text-slate-500">Lead Full-Stack</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Applications & Next Actions */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Active Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              Active Job Applications
            </h2>
            <Link href="/candidate/jobs" className="text-xs text-blue-400 hover:underline">
              Browse More Openings →
            </Link>
          </div>

          <div className="space-y-3">
            {MOCK_APPLICATIONS.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{app.jobTitle}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-indigo-950 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-800">
                      Stage: {app.status.toUpperCase()}
                    </span>
                    {app.compositeScore && (
                      <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800">
                        {app.compositeScore}% Match
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-3">
                  <Link
                    href={`/candidate/interview/${app.interviewId || 'default'}`}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-600/30 border border-blue-500/30"
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    Adaptive Interview Console
                  </Link>
                  <Link
                    href={`/candidate/assessment/${app.codingAssessmentId || 'default'}`}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Coding Assessment Sandbox
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Next Steps & Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            Recommended Actions
          </h2>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-950 p-2 text-emerald-400 border border-emerald-800/50">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">AWS Certificate Audit Pending</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Provide verification badge link or credential ID to advance to Tier 4 evidence.
                </p>
                <Link href="/candidate/verification" className="mt-2 inline-block text-xs font-medium text-cyan-400 hover:underline">
                  Manage Verification Records →
                </Link>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-start gap-3">
              <div className="rounded-lg bg-blue-950 p-2 text-blue-400 border border-blue-800/50">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Explore Role Matches</h4>
                <p className="mt-1 text-xs text-slate-400">
                  See how your demonstrated scores map against 16 engineering taxonomies.
                </p>
                <Link href="/candidate/recommendations" className="mt-2 inline-block text-xs font-medium text-blue-400 hover:underline">
                  View Competency Alignment →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
