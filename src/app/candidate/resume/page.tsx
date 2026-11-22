'use client';

import { useState } from 'react';
import { Upload, Sparkles, CheckCircle2, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import { ResumeExtractedData } from '@/types/resume';

const SAMPLE_RESUME_TEXT = `
Alex Mercer
alex.mercer@gmail.com | San Francisco, CA | https://github.com/alexmercer-dev

SUMMARY:
Senior Full-Stack & Distributed Systems Engineer with 7+ years of experience architecting resilient microservices, high-throughput caching, and modern web applications.

EDUCATION:
Stanford University - Bachelor of Science in Computer Science (2015 - 2019)
Specialization in Systems Architecture & Distributed Computing.

WORK EXPERIENCE:
Stripe - Senior Software Engineer (2021 - 2024)
- Architected distributed event messaging pipeline in Node.js and Go processing 50k events/sec.
- Scaled developer tooling and internal API frameworks used by 400+ engineers.
- Optimized Redis caching layer, decreasing p99 latency from 140ms to 18ms.

PROJECTS:
turbo-cache-kv (https://github.com/alexmercer-dev/turbo-cache-kv)
- In-memory multi-tenant caching engine written in TypeScript and Go.
- Implemented LSM-tree storage engine with sharded ring buffers, zero-copy serialization.
- Achieved 2,400+ GitHub stars with 100% test coverage.

SKILLS:
TypeScript, Node.js, React, Go, Redis, Kafka, PostgreSQL, Docker, Kubernetes, Vitest
`;

export default function ResumeIntelligencePage() {
  const [inputText, setInputText] = useState(SAMPLE_RESUME_TEXT);
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ResumeExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: inputText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse resume');
      setParsedResult(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-400" />
          Resume Intelligence & 5-Tier Evidence Extraction
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload or paste your technical resume. Gemini separates self-claimed keywords from context-supported and project-evidenced competencies.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input Column */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Resume Document Raw Text
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={16}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">{inputText.length} characters</span>
              <button
                onClick={handleParse}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
              >
                {loading ? 'Analyzing with Gemini...' : 'Extract Evidence Tiers'}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-xl border border-red-500/50 bg-red-950/30 p-4 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Output Column: Evidence Breakdown */}
        <div className="space-y-4">
          {parsedResult ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">{parsedResult.contactInfo.fullName}</h3>
                <p className="text-xs text-slate-400">{parsedResult.contactInfo.email} • {parsedResult.contactInfo.location}</p>
                <p className="mt-2 text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                  {parsedResult.summary}
                </p>
              </div>

              {/* Extracted Skills Categorized into Evidence Tiers */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  Extracted Skills by Evidence Tier
                </h4>
                <div className="flex flex-wrap gap-2">
                  {parsedResult.skills.map((s, idx) => {
                    const isHigh = s.evidenceTier === 'project_supported' || s.evidenceTier === 'assessed';
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg px-2.5 py-1.5 text-xs border flex items-center gap-1.5 ${
                          isHigh
                            ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-900 text-slate-400">
                          {s.evidenceTier}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Projects with Architecture Insights */}
              {parsedResult.projects && parsedResult.projects.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Project Architecture Evidence
                  </h4>
                  {parsedResult.projects.map((p, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-800">
                          Architecture Evidenced
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{p.architecture}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.technologies.map((t, tidx) => (
                          <span key={tidx} className="text-[10px] rounded bg-slate-900 px-1.5 py-0.5 text-slate-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/30 p-12 text-center text-slate-500">
              <FileText className="mx-auto h-8 w-8 text-slate-600 mb-3" />
              <p className="text-xs">Paste resume text on the left and click "Extract Evidence Tiers" to preview parsed intelligence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
