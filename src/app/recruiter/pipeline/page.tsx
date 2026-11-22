'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { JobApplication, ApplicationStatus } from '@/types/application';
import { FileText, RefreshCw } from 'lucide-react';

const STAGES: ApplicationStatus[] = [
  'applied',
  'screening',
  'interviewing',
  'assessing',
  'review',
  'offered',
  'rejected',
];

export default function RecruiterPipelinePage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>('all');

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success && data.data) {
        setApplications(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleStageChange = async (appId: string, newStage: ApplicationStatus) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'recruiter',
        },
        body: JSON.stringify({ id: appId, status: newStage }),
      });
      const data = await res.json();
      if (data.success) {
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStage } : a))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filterStage === 'all'
    ? applications
    : applications.filter((a) => a.status === filterStage);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Talent Pipeline Management
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Candidate Applications Directory</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Pipeline Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>Stage: {s.toUpperCase()}</option>
            ))}
          </select>
          <button
            onClick={loadApplications}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-6 py-4">Applicant</th>
              <th className="px-6 py-4">Applied Role</th>
              <th className="px-6 py-4">Applied Date</th>
              <th className="px-6 py-4">Current Stage</th>
              <th className="px-6 py-4">Score</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filtered.map((app) => (
              <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-semibold text-white">
                  <Link href={`/recruiter/candidates/${app.candidateId}`} className="hover:text-indigo-400">
                    {app.candidateName}
                  </Link>
                  <div className="text-[11px] text-slate-400 font-normal">{app.candidateEmail}</div>
                </td>
                <td className="px-6 py-4 text-slate-300">{app.jobTitle}</td>
                <td className="px-6 py-4 text-slate-400">{new Date(app.appliedAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <select
                    value={app.status}
                    onChange={(e) => handleStageChange(app.id, e.target.value as ApplicationStatus)}
                    className="rounded bg-slate-950 px-2 py-1 text-[11px] font-semibold text-indigo-300 border border-slate-800 focus:outline-none"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-emerald-400">{app.compositeScore ?? 85}%</td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/recruiter/reports/${app.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Review Report
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
