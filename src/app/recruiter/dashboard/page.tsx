'use client';

import Link from 'next/link';
import { MOCK_APPLICATIONS, MOCK_JOBS } from '@/lib/data/mock-data';
import { Briefcase, Users, ShieldCheck, CheckCircle2, ArrowRight, Award, FileText } from 'lucide-react';

export default function RecruiterDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Recruiter Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Nexus Cloud Technologies • Core Infrastructure & AI
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Recruitment Intelligence Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter/jobs/new"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
          >
            + AI Job Requirement Builder
          </Link>
          <Link
            href="/recruiter/pipeline"
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            View Full Pipeline
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Total Applicants</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{MOCK_APPLICATIONS.length}</span>
            <span className="text-xs text-emerald-400">+12% this week</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Verification Rate</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-cyan-400">88%</span>
            <span className="text-xs text-slate-500">Tier 4 verified</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Assessment Completion</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-400">93%</span>
            <span className="text-xs text-slate-500">Tier 5 proven</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Open Engineering Roles</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{MOCK_JOBS.length}</span>
            <span className="text-xs text-slate-500">active postings</span>
          </div>
        </div>
      </div>

      {/* Recent Pipeline Applicants */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            Recent Applications & Evidence Reports
          </h2>
          <Link href="/recruiter/pipeline" className="text-xs text-indigo-400 hover:underline">
            View All Pipeline Candidates →
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Position</th>
                <th className="px-6 py-4">Stage</th>
                <th className="px-6 py-4">Composite Match</th>
                <th className="px-6 py-4 text-right">Evidence Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {MOCK_APPLICATIONS.map((app) => (
                <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-semibold text-white">
                    <div>{app.candidateName}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{app.candidateEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{app.jobTitle}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 border border-slate-700">
                      {app.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                    {app.compositeScore}%
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/recruiter/reports/${app.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View Evidence Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
