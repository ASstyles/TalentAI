'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Code2, Play, CheckCircle2, XCircle, Clock, AlertCircle, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { MOCK_CODING_ASSESSMENT } from '@/lib/data/mock-data';
import { SandboxExecutionSummary } from '@/lib/sandbox/runner';
import { TestCase } from '@/types/coding';

const DEFAULT_CODE = `function solution(operations) {
  // Input: array of operations
  // Return expected outputs
  return ["ok", 42];
}`;

export default function CodingAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { idToken, user } = useAuth();

  const assessmentId = (params?.id as string) || MOCK_CODING_ASSESSMENT.id;
  const [assessmentTitle, setAssessmentTitle] = useState(MOCK_CODING_ASSESSMENT.title);
  const [problemStatement, setProblemStatement] = useState(MOCK_CODING_ASSESSMENT.problemStatement);
  const [sampleCases, setSampleCases] = useState<TestCase[]>(
    MOCK_CODING_ASSESSMENT.testCases.filter((tc) => !tc.isHidden)
  );
  const [hiddenCount, setHiddenCount] = useState<number>(
    MOCK_CODING_ASSESSMENT.testCases.filter((tc) => tc.isHidden).length
  );

  const [code, setCode] = useState(DEFAULT_CODE);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [executionResult, setExecutionResult] = useState<SandboxExecutionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessmentData = useCallback(async () => {
    if (!idToken || !assessmentId) return;
    try {
      const res = await fetch(`/api/assessment/${encodeURIComponent(assessmentId)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setAssessmentTitle(json.data.title || MOCK_CODING_ASSESSMENT.title);
          setProblemStatement(json.data.problemStatement || MOCK_CODING_ASSESSMENT.problemStatement);
          if (json.data.sampleTestCases) {
            setSampleCases(json.data.sampleTestCases);
          }
          if (typeof json.data.hiddenCount === 'number') {
            setHiddenCount(json.data.hiddenCount);
          }
        }
      }
    } catch {
      // Graceful fallback to default problem statement
    }
  }, [idToken, assessmentId]);

  useEffect(() => {
    fetchAssessmentData();
  }, [fetchAssessmentData]);

  const handleRunCode = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          code,
          language: 'javascript',
          assessmentId,
          candidateId: user?.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to execute solution');
      setExecutionResult(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const handleFinalSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <Link
            href="/candidate/dashboard"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> Candidate Workspace
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Isolated Deterministic Coding Assessment
          </span>
          <h1 className="text-xl font-bold text-white mt-1">{assessmentTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            Time Limit: 30 mins
          </span>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-mono text-slate-300 border border-slate-800">
            Language: JavaScript / TypeScript
          </span>
        </div>
      </div>

      {submitted && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-6 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Assessment Submitted Successfully</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Your deterministic benchmark score has been permanently recorded to your candidate profile.
            Recruiters will evaluate your execution time and algorithmic accuracy.
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push('/candidate/dashboard')}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Return to Workspace
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Problem Statement & Test Cases */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Problem Statement</h3>
            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {problemStatement}
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase text-slate-400">Authoritative Test Suite</h4>
                {hiddenCount > 0 && (
                  <span className="text-[11px] font-mono text-slate-500">
                    +{hiddenCount} hidden verification suites
                  </span>
                )}
              </div>

              {sampleCases.map((tc, idx) => (
                <div key={tc.id} className="rounded-lg bg-slate-950 p-3 border border-slate-800 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Sample Case #{idx + 1}</span>
                    <span className="text-[10px] uppercase text-slate-500">Public Sample</span>
                  </div>
                  <div className="mt-2 text-slate-300">Input: {tc.input}</div>
                  <div className="text-emerald-400">Expected: {tc.expectedOutput}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Execution Results */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-indigo-400" />
                Solution Editor
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={running || submitted}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  {running ? 'Executing...' : 'Run in Sandbox'}
                </button>
                {executionResult && !submitted && (
                  <button
                    onClick={handleFinalSubmit}
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? 'Submitting...' : 'Submit Final'}
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={submitted}
              rows={14}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
          </div>

          {/* Execution Terminal */}
          {executionResult && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Sandbox Execution Report</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    executionResult.score === 100
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  Score: {executionResult.score}% ({executionResult.passedTests}/{executionResult.totalTests} passed)
                </span>
              </div>

              <div className="space-y-2">
                {executionResult.results.map((res, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {res.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                      <span className="text-slate-300">Case #{i + 1}</span>
                    </div>
                    <span className="text-slate-500">{res.executionTimeMs}ms • {res.memoryUsageKb}KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
