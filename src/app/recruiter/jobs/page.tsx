'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { JobOpening, JobStatus } from '@/types/job';
import {
  Briefcase,
  Plus,
  RefreshCw,
  Search,
  Users,
  Eye,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Trash2,
  Edit,
  DollarSign,
  MapPin,
  Clock,
  AlertCircle,
} from 'lucide-react';

const STATUS_OPTIONS: { label: string; value: JobStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
];

export default function RecruiterJobsPage() {
  const { user, idToken, role, orgId } = useAuth();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      let url = '/api/jobs';
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setJobs(data.data);
      } else {
        setJobs([]);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to fetch job requisitions');
    } finally {
      setLoading(false);
    }
  }, [idToken, statusFilter, searchQuery]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update job status');

      setActionMessage(`Job status updated to ${newStatus.toUpperCase()}`);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)));
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error updating job status');
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job requisition?')) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete job');

      setActionMessage('Job deleted successfully');
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error deleting job');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Requisition Management • {orgId || 'Enterprise'}
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Organization Job Openings</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter/jobs/new"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create Requisition</span>
          </Link>
          <button
            onClick={loadJobs}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{actionMessage}</span>
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadJobs()}
            placeholder="Search by title, skill, or location..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Jobs Directory */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center text-slate-400 space-y-3">
          <Briefcase className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Job Requisitions Found</h3>
          <p className="text-xs max-w-sm mx-auto">
            No positions match your current search or status filter. Click &quot;Create Requisition&quot; to publish your first engineering role.
          </p>
          <Link
            href="/recruiter/jobs/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 mt-2"
          >
            <Plus className="h-4 w-4" /> Create Requisition
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-white">{job.title}</h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        job.status === 'published'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : job.status === 'draft'
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : job.status === 'paused'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400 font-mono">
                      {job.seniority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 max-w-3xl">{job.description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <select
                    value={job.status}
                    onChange={(e) => handleStatusChange(job.id, e.target.value as JobStatus)}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="paused">Paused</option>
                    <option value="closed">Closed</option>
                  </select>

                  <Link
                    href={`/recruiter/pipeline?jobId=${job.id}`}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Applicants</span>
                  </Link>

                  <button
                    onClick={() => handleDelete(job.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                    title="Delete Job"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {job.location.locationString} ({job.location.type})
                </span>
                {job.salaryRange && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <DollarSign className="h-3.5 w-3.5" />
                    ${job.salaryRange.min.toLocaleString()} - ${job.salaryRange.max.toLocaleString()}
                  </span>
                )}
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="h-3.5 w-3.5" /> Created: {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>

              {job.mandatoryCompetencies.length > 0 && (
                <div className="border-t border-slate-800/80 pt-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Evaluated Competencies
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.mandatoryCompetencies.map((c) => (
                      <span key={c.skillId} className="rounded-md bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-800">
                        {c.name} (L{c.minLevel}+)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
