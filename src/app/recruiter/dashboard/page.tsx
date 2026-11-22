'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { JobApplication } from '@/types/application';
import { JobOpening } from '@/types/job';
import {
  Briefcase,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Award,
  FileText,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function RecruiterDashboard() {
  const { user, idToken, role, orgId } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const [appsRes, jobsRes] = await Promise.all([
        fetch('/api/applications', { headers }).catch(() => null),
        fetch('/api/jobs', { headers }).catch(() => null),
      ]);

      if (appsRes && appsRes.ok) {
        const aJson = await appsRes.json();
        if (aJson.data) setApplications(aJson.data);
      }

      if (jobsRes && jobsRes.ok) {
        const jJson = await jobsRes.json();
        if (jJson.data) setJobs(jJson.data);
      }
    } catch (err) {
      console.error('[RecruiterDashboard] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const activeJobs = jobs.filter((j) => j.status === 'published');
  const reviewStageCount = applications.filter(
    (a) => a.status === 'screening' || a.status === 'interviewing' || a.status === 'assessing'
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            {orgId || 'Enterprise Organization'} • Talent Operations
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Recruitment Intelligence Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter/jobs/new"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Requisition</span>
          </Link>
          <Link
            href="/recruiter/pipeline"
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
          >
            View Full Pipeline
          </Link>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Total Applicants</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{applications.length}</span>
            <span className="text-xs text-indigo-400">organization total</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Active In-Flight Review</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-cyan-400">{reviewStageCount}</span>
            <span className="text-xs text-slate-500">screening / testing</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Active Published Roles</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{activeJobs.length}</span>
            <span className="text-xs text-slate-500">of {jobs.length} total</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Total Organization Requisitions</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-400">{jobs.length}</span>
            <span className="text-xs text-slate-500">positions tracked</span>
          </div>
        </div>
      </div>

      {/* Recent Pipeline Applicants */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <span>Recent Applications ({applications.length})</span>
          </h2>
          <Link href="/recruiter/pipeline" className="text-xs text-indigo-400 hover:underline">
            View All Pipeline Candidates →
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center text-slate-400 space-y-3">
            <Users className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Applications Received Yet</h3>
            <p className="text-xs max-w-sm mx-auto">
              Candidates who apply to your organization&apos;s published job openings will appear here with evidence reports.
            </p>
            <Link
              href="/recruiter/jobs/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 mt-2"
            >
              <Plus className="h-4 w-4" /> Publish Engineering Role
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Position</th>
                  <th className="px-6 py-4">Stage</th>
                  <th className="px-6 py-4">Applied Date</th>
                  <th className="px-6 py-4 text-right">Evidence Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {applications.slice(0, 10).map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">
                      <div>{app.candidateName}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{app.candidateEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{app.jobTitle}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 border border-slate-700">
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/recruiter/reports/${app.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Review Evidence</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
