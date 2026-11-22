'use client';

import { useState } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { ExtractedJobRequirements } from '@/lib/gemini/services/job-description-analysis';

const SAMPLE_JOB_TEXT = `
Senior Backend Engineer
Location: Remote | Salary: $170k - $210k

We are seeking a Senior Backend Engineer to architect and scale our real-time streaming pipeline.

Responsibilities:
- Build high-concurrency microservices in Node.js and TypeScript.
- Optimize PostgreSQL and Redis databases for sub-50ms query latencies.
- Lead architecture design reviews and write automated Vitest test suites.

Requirements:
- 5+ years building backend distributed systems.
- Deep expertise in Node.js, TypeScript, PostgreSQL, and Redis.
- Solid experience with Docker containerization and CI/CD pipelines.
`;

export default function NewJobRequirementBuilder() {
  const [description, setDescription] = useState(SAMPLE_JOB_TEXT);
  const [parsing, setParsing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<ExtractedJobRequirements | null>(null);
  const [published, setPublished] = useState(false);

  const handleParse = async () => {
    setParsing(true);
    try {
      const res = await fetch('/api/jobs/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  const handlePublish = async () => {
    if (!result) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'recruiter',
        },
        body: JSON.stringify({
          orgId: 'org-google-deepmind',
          title: result.title,
          specialization: result.specialization,
          seniority: result.seniority,
          status: 'published',
          description: result.summary,
          responsibilities: result.responsibilities,
          mandatoryCompetencies: result.mandatoryCompetencies,
          preferredCompetencies: result.preferredCompetencies,
          location: { type: 'remote', locationString: 'Remote (Global)' },
          salaryRange: { min: 175000, max: 220000, currency: 'USD' },
          publishedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPublished(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-950/60 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-800 mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          AI Job Requirement Builder
        </div>
        <h1 className="text-2xl font-bold text-white">Deconstruct Job Description into Calibrated Rubric</h1>
        <p className="mt-1 text-sm text-slate-400">
          Paste an unstructured job description. Gemini extracts mandatory vs preferred qualifications with exact competency weights.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <label className="block text-xs font-semibold uppercase text-slate-400">
              Raw Job Description Text
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={14}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleParse}
              disabled={parsing}
              className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
            >
              {parsing ? 'Deconstructing with Gemini...' : 'Deconstruct Competencies'}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="space-y-4">
          {result ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">{result.title}</h3>
                <span className="rounded bg-indigo-950 px-2 py-0.5 text-xs text-indigo-300 font-mono border border-indigo-800">
                  {result.specialization} • {result.seniority.toUpperCase()}
                </span>
                <p className="mt-2 text-xs text-slate-300">{result.summary}</p>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  Mandatory Competency Rubric
                </h4>
                <div className="space-y-2">
                  {result.mandatoryCompetencies.map((c) => (
                    <div key={c.skillId} className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5 border border-slate-800 text-xs">
                      <span className="font-medium text-slate-200">{c.name}</span>
                      <span className="font-mono text-emerald-400">
                        Level {c.minLevel}+ (Weight: {c.weight}/10)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {published ? (
                <div className="rounded-xl bg-emerald-950/40 p-3 text-xs text-emerald-400 border border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Job opening calibrated and persisted to database!
                </div>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 shadow-md shadow-emerald-500/20"
                >
                  {publishing ? 'Persisting to Firestore...' : 'Confirm & Publish Job Opening'}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 p-12 text-center text-slate-500 text-xs">
              Click "Deconstruct Competencies" to generate the structured rubric.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
