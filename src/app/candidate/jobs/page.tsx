'use client';

import { useState, useEffect } from 'react';
import { JobOpening } from '@/types/job';
import { JobApplication } from '@/types/application';
import { MapPin, DollarSign, CheckCircle2, RefreshCw } from 'lucide-react';

export default function CandidateJobsPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/applications'),
      ]);
      const jobsData = await jobsRes.json();
      const appsData = await appsRes.json();

      if (jobsData.success && jobsData.data) setJobs(jobsData.data);
      if (appsData.success && appsData.data) {
        const candidateApplied = appsData.data
          .filter((a: JobApplication) => a.candidateId === 'cand-alex-mercer')
          .map((a: JobApplication) => a.jobId);
        setAppliedIds(candidateApplied);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async (job: JobOpening) => {
    setApplying(job.id);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          orgId: job.orgId,
          candidateId: 'cand-alex-mercer',
          candidateName: 'Alex Mercer',
          candidateEmail: 'alex.mercer@gmail.com',
          resumeId: 'res-alex-101',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAppliedIds((prev) => [...prev, job.id]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Engineering Positions Directory</h1>
          <p className="mt-1 text-sm text-slate-400">
            Discovered positions calibrated against your verified competency profile.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6">
        {jobs.map((job) => {
          const isApplied = appliedIds.includes(job.id);
          const isCurrentApplying = applying === job.id;

          return (
            <div
              key={job.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{job.title}</h2>
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300 font-mono">
                      {job.seniority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-3xl">{job.description}</p>
                </div>
                <div>
                  {isApplied ? (
                    <span className="flex items-center gap-1.5 rounded-xl bg-emerald-950 px-4 py-2 text-xs font-semibold text-emerald-400 border border-emerald-800">
                      <CheckCircle2 className="h-4 w-4" /> Application Submitted
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApply(job)}
                      disabled={isCurrentApplying}
                      className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 shadow-md shadow-blue-500/20"
                    >
                      {isCurrentApplying ? 'Submitting Application...' : 'Apply with Verified Profile'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {job.location.locationString}
                </span>
                {job.salaryRange && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <DollarSign className="h-3.5 w-3.5" />
                    ${job.salaryRange.min.toLocaleString()} - ${job.salaryRange.max.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Mandatory Competencies
                </span>
                <div className="flex flex-wrap gap-2">
                  {job.mandatoryCompetencies.map((c) => (
                    <span key={c.skillId} className="rounded-lg bg-slate-950 px-2.5 py-1 text-xs text-slate-300 border border-slate-800">
                      {c.name} (Level {c.minLevel}+)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
