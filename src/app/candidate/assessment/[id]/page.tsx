'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { MOCK_CODING_ASSESSMENT } from '@/lib/data/mock-data';
import { Code2, Play, CheckCircle2, XCircle, Clock, Cpu } from 'lucide-react';
import { SandboxExecutionSummary } from '@/lib/sandbox/runner';

const DEFAULT_CODE = `function solution(operations) {
  // Input: array of operations
  // Return expected outputs
  return ["ok", 42];
}`;

export default function CodingAssessmentPage() {
  const params = useParams();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [running, setRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<SandboxExecutionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunCode = async () => {
    setRunning(true);
    setError(null);
    try {
      const assessmentId = (params?.id as string) || MOCK_CODING_ASSESSMENT.id;
      const res = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: 'javascript',
          assessmentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExecutionResult(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Isolated Deterministic Coding Assessment
          </span>
          <h1 className="text-xl font-bold text-white mt-1">{MOCK_CODING_ASSESSMENT.title}</h1>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Problem Statement & Test Cases */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Problem Statement</h3>
            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {MOCK_CODING_ASSESSMENT.problemStatement}
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase text-slate-400">Test Cases Suite</h4>
              {MOCK_CODING_ASSESSMENT.testCases.map((tc, idx) => (
                <div key={tc.id} className="rounded-lg bg-slate-950 p-3 border border-slate-800 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Test Case #{idx + 1}</span>
                    <span className="text-[10px] uppercase text-slate-500">
                      {tc.isHidden ? 'Hidden Evaluation Case' : 'Sample Case'}
                    </span>
                  </div>
                  <div className="mt-2 text-slate-300">
                    Input: {tc.isHidden ? '[Authoritative Evaluation Suite — Hidden]' : tc.input}
                  </div>
                  <div className="text-emerald-400">
                    Expected: {tc.isHidden ? '[Authoritative Expected Output — Hidden]' : tc.expectedOutput}
                  </div>
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
              <button
                onClick={handleRunCode}
                disabled={running}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {running ? 'Executing in Sandbox...' : 'Run in Isolated Sandbox'}
              </button>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={14}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
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
