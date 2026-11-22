'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { JobApplication, ApplicationStatus } from '@/types/application';
import { FileText, RefreshCw, Filter, Search, Users, AlertCircle, ArrowLeft } from 'lucide-react';

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
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get('jobId') || 'all';

  const { idToken, orgId } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      let url = '/api/applications';
      if (selectedJobId !== 'all') {
        url += `?jobId=${encodeURIComponent(selectedJobId)}`;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load pipeline applications');
      }
      setApplications(data.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading applications');
    } finally {
      setLoading(false);
    }
  }, [idToken, selectedJobId]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleStageChange = async (appId: string, newStage: ApplicationStatus) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: appId, status: newStage }),
      });
      const data = await res.json();
      if (data.success) {
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStage } : a))
        );
      }
    } catch (e) {
      console.error('[Pipeline] Error changing stage:', e);
    }
  };

  // Filter in memory by stage and search
  const filtered = applications.filter((app) => {
    if (filterStage !== 'all' && app.status !== filterStage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const candName = (app.candidateName || '').toLowerCase();
      const candEmail = (app.candidateEmail || '').toLowerCase();
      const jobTitle = (app.jobTitle || '').toLowerCase();
      return (
        candName.includes(q) ||
        candEmail.includes(q) ||
        jobTitle.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            {orgId || 'Enterprise'} • Talent Pipeline
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Candidate Applications Directory</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter/jobs"
            className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 transition"
          >
            Manage Jobs
          </Link>
          <button
            onClick={loadApplications}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by candidate name, email, or role..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Stages ({applications.length})</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center text-slate-400 space-y-3">
          <Users className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Applications Match Filter</h3>
          <p className="text-xs max-w-sm mx-auto">
            No candidate applications were found matching your current filter criteria.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Applied Role</th>
                <th className="px-6 py-4">Applied Date</th>
                <th className="px-6 py-4">Stage</th>
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
                      className="rounded-lg bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 border border-slate-800 focus:outline-none"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/recruiter/reports/${app.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Review Evidence
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
