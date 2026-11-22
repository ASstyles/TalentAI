'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { JobOpening, SeniorityLevel } from '@/types/job';
import { JobApplication } from '@/types/application';
import {
  MapPin,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  ChevronRight,
  X,
  Clock,
  Sparkles,
  AlertCircle,
  Building,
  Send,
  Loader2,
} from 'lucide-react';

const SENIORITY_LEVELS: { label: string; value: string }[] = [
  { label: 'All Seniority', value: 'all' },
  { label: 'Junior', value: 'junior' },
  { label: 'Mid-Level', value: 'mid' },
  { label: 'Senior', value: 'senior' },
  { label: 'Lead', value: 'lead' },
  { label: 'Staff / Principal', value: 'staff' },
];

const LOCATION_TYPES: { label: string; value: string }[] = [
  { label: 'All Work Modes', value: 'all' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'On-site', value: 'onsite' },
];

export default function CandidateJobsPage() {
  const { user, idToken, role } = useAuth();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [seniorityFilter, setSeniorityFilter] = useState('all');
  const [locationTypeFilter, setLocationTypeFilter] = useState('all');
  const [sortOption, setSortOption] = useState<'newest' | 'salary'>('newest');

  // Interactive States
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [applyingJob, setApplyingJob] = useState<JobOpening | null>(null);
  const [resumeId, setResumeId] = useState('res-default');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Load bookmarked jobs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('talentai_bookmarked_jobs');
      if (saved) setBookmarkedIds(JSON.parse(saved));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleBookmark = (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds((prev) => {
      const updated = prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId];
      try {
        localStorage.setItem('talentai_bookmarked_jobs', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (seniorityFilter !== 'all') params.set('seniority', seniorityFilter);
      if (locationTypeFilter !== 'all') params.set('locationType', locationTypeFilter);
      if (sortOption) params.set('sort', sortOption);

      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const [jobsRes, appsRes] = await Promise.all([
        fetch(`/api/jobs?${params.toString()}`, { headers }),
        idToken ? fetch('/api/applications', { headers }).catch(() => null) : Promise.resolve(null),
      ]);

      const jobsData = await jobsRes.json();
      if (jobsData.success && jobsData.data) {
        setJobs(jobsData.data);
      } else {
        setJobs([]);
      }

      if (appsRes && appsRes.ok) {
        const appsData = await appsRes.json();
        if (appsData.success && appsData.data) {
          setApplications(appsData.data);
        }
      }
    } catch (err) {
      console.error('[JobsPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [idToken, searchQuery, seniorityFilter, locationTypeFilter, sortOption]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob || !idToken) return;

    setIsSubmitting(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          jobId: applyingJob.id,
          resumeId: resumeId.trim() || 'res-default',
          candidateName: user?.displayName || user?.email?.split('@')[0] || 'Candidate',
          candidateEmail: user?.email || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setApplySuccess(`Application successfully submitted for ${applyingJob.title}!`);
      if (data.data) {
        setApplications((prev) => [...prev, data.data]);
      }
      setTimeout(() => {
        setApplyingJob(null);
        setApplySuccess(null);
      }, 2000);
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : 'Error submitting application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getApplicationForJob = (jobId: string) => {
    return applications.find((a) => a.jobId === jobId);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/60 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-800 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Verified Opportunities
          </div>
          <h1 className="text-2xl font-bold text-white">Engineering Positions Directory</h1>
          <p className="mt-1 text-xs text-slate-400">
            Explore authentic engineering requisitions calibrated against your demonstrated competencies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            placeholder="Search by job title, technologies, or keywords..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={seniorityFilter}
            onChange={(e) => setSeniorityFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            {SENIORITY_LEVELS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={locationTypeFilter}
            onChange={(e) => setLocationTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            {LOCATION_TYPES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="salary">Sort: Compensation</option>
          </select>
        </div>
      </div>

      {/* Job Cards Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center text-slate-400 space-y-3">
          <Briefcase className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Positions Found</h3>
          <p className="text-xs max-w-sm mx-auto">
            No published positions match your current filters. Try searching with broader keywords or resetting your filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSeniorityFilter('all');
              setLocationTypeFilter('all');
            }}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 mt-2"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => {
            const existingApp = getApplicationForJob(job.id);
            const isBookmarked = bookmarkedIds.includes(job.id);

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="group relative cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 hover:border-blue-500/50 hover:bg-slate-900/70 transition-all duration-200 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                        {job.title}
                      </h2>
                      <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                        {job.seniority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleBookmark(job.id, e)}
                      className={`p-2 rounded-xl border transition ${
                        isBookmarked
                          ? 'border-blue-500/50 bg-blue-950/40 text-blue-400'
                          : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300'
                      }`}
                      title={isBookmarked ? 'Bookmarked' : 'Bookmark job'}
                    >
                      {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>

                    {existingApp ? (
                      <span className="flex items-center gap-1.5 rounded-xl bg-emerald-950 px-3.5 py-2 text-xs font-semibold text-emerald-400 border border-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Stage: {existingApp.status.toUpperCase()}
                      </span>
                    ) : (
                      <button
                        onClick={() => setApplyingJob(job)}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 transition"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    {job.location.locationString} ({job.location.type})
                  </span>
                  {job.salaryRange && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${job.salaryRange.min.toLocaleString()} - ${job.salaryRange.max.toLocaleString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {job.mandatoryCompetencies.length > 0 && (
                  <div className="border-t border-slate-800/80 pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                      Required Competencies
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {job.mandatoryCompetencies.map((c) => (
                        <span
                          key={c.skillId}
                          className="rounded-md bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-800"
                        >
                          {c.name} (Level {c.minLevel}+)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-2xl">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider border border-blue-800">
                  {selectedJob.specialization}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {selectedJob.seniority.toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mt-2">{selectedJob.title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {selectedJob.location.locationString} ({selectedJob.location.type})
                </span>
                {selectedJob.salaryRange && (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <DollarSign className="h-3.5 w-3.5" />
                    ${selectedJob.salaryRange.min.toLocaleString()} - ${selectedJob.salaryRange.max.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Role Overview</h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
            </div>

            {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Core Responsibilities</h3>
                <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                  {selectedJob.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Mandatory Competencies & Rubric Weights
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {selectedJob.mandatoryCompetencies.map((c) => (
                  <div key={c.skillId} className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs">
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-400 flex justify-between mt-1">
                      <span>Min Level: {c.minLevel} / 5</span>
                      <span>Weight: {c.weight}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedJob.preferredCompetencies && selectedJob.preferredCompetencies.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Preferred Qualifications
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.preferredCompetencies.map((c) => (
                    <span key={c.skillId} className="rounded-md bg-slate-950 px-2 py-1 text-xs text-slate-300 border border-slate-800">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>

              {getApplicationForJob(selectedJob.id) ? (
                <span className="flex items-center gap-1.5 rounded-xl bg-emerald-950 px-4 py-2 text-xs font-semibold text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="h-4 w-4" /> Already Applied (Stage: {getApplicationForJob(selectedJob.id)?.status.toUpperCase()})
                </span>
              ) : (
                <button
                  onClick={() => {
                    const j = selectedJob;
                    setSelectedJob(null);
                    setApplyingJob(j);
                  }}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/20"
                >
                  Apply with Verified Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Application Submission Dialog */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-2xl">
            <button
              onClick={() => {
                setApplyingJob(null);
                setApplyError(null);
              }}
              className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                Application Confirmation
              </span>
              <h2 className="text-xl font-bold text-white mt-1">Apply to {applyingJob.title}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your verified competency profile and credentials will be securely shared with the hiring team.
              </p>
            </div>

            {applySuccess && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{applySuccess}</span>
              </div>
            )}

            {applyError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Applicant Identity
                </label>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                  <div><strong>Name:</strong> {user?.displayName || 'Verified Candidate'}</div>
                  <div className="text-slate-400 mt-0.5"><strong>Email:</strong> {user?.email || 'N/A'}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Attached Resume Reference ID
                </label>
                <input
                  type="text"
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  placeholder="e.g. res-latest-verified"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Defaults to your active parsed resume dossier.
                </span>
              </div>

              <div className="border-t border-slate-800 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Confirm & Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
