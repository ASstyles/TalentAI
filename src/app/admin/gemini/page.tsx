'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cpu, CheckCircle2, AlertTriangle, RefreshCw, Activity, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { DiagnosticResult } from '@/lib/gemini/connectivity';

export default function AdminGeminiPage() {
  const { idToken } = useAuth();
  const [testing, setTesting] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    if (!idToken) return;
    setTesting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gemini/test', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run diagnostics');
      if (data.success && data.data) {
        setDiagnostics(data.data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Diagnostics run failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/dashboard"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> Admin Dashboard
          </Link>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-950/60 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-800 mb-2">
            <Cpu className="h-3.5 w-3.5" />
            Official @google/genai SDK Orchestration
          </div>
          <h1 className="text-2xl font-bold text-white">Gemini AI Model Configuration & Live Diagnostics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Centrally configured model tiers: Primary (Flash), Reasoning (Pro), Fast (2.0 Flash), and Universal Fallback.
          </p>
        </div>
        <button
          onClick={runTest}
          disabled={testing}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Running Connectivity Diagnostic...' : 'Run Live Gemini Diagnostics'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Model Tier Architecture Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Primary Tier</span>
          <h3 className="text-base font-bold text-white">gemini-2.5-flash</h3>
          <p className="text-xs text-slate-400">
            Primary production model tier for general assessment, role synthesis, and candidate evaluations.
          </p>
          <div className="pt-2 text-[10px] font-mono text-slate-500">ENV: GEMINI_MODEL_PRIMARY</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Reasoning Tier</span>
          <h3 className="text-base font-bold text-white">gemini-2.5-pro</h3>
          <p className="text-xs text-slate-400">
            Deep resume parsing, complex project architecture extraction, and hiring dossier synthesis.
          </p>
          <div className="pt-2 text-[10px] font-mono text-slate-500">ENV: GEMINI_MODEL_REASONING</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Fast Tier</span>
          <h3 className="text-base font-bold text-white">gemini-2.0-flash</h3>
          <p className="text-xs text-slate-400">
            Real-time turn-by-turn interview evaluation and low-latency rubric scoring.
          </p>
          <div className="pt-2 text-[10px] font-mono text-slate-500">ENV: GEMINI_MODEL_FAST</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Universal Fallback</span>
          <h3 className="text-base font-bold text-white">gemini-1.5-flash</h3>
          <p className="text-xs text-slate-400">
            Automatic failover for rate-limits, quota throttling, or transient connectivity spikes.
          </p>
          <div className="pt-2 text-[10px] font-mono text-slate-500">ENV: GEMINI_MODEL_FALLBACK</div>
        </div>
      </div>

      {/* Live Diagnostic Output Console */}
      {diagnostics && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              Live Diagnostic Report
            </h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold border ${
                diagnostics.overallStatus === 'healthy'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : diagnostics.overallStatus === 'unconfigured'
                  ? 'bg-amber-950 text-amber-400 border-amber-800'
                  : 'bg-rose-950 text-rose-400 border-rose-800'
              }`}
            >
              Status: {diagnostics.overallStatus.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="text-slate-300">
              <span className="text-slate-500">Timestamp: </span>
              {diagnostics.timestamp}
            </div>
            {diagnostics.errorMessage && (
              <div className="text-rose-400">
                <span className="text-slate-500">Error: </span>
                {diagnostics.errorMessage} ({diagnostics.errorCode})
              </div>
            )}
            <div className="rounded-xl bg-slate-950 p-4 text-slate-300 overflow-x-auto border border-slate-800 space-y-2">
              <div><strong>Configured Models:</strong> {JSON.stringify(diagnostics.modelsConfigured, null, 2)}</div>
              <div><strong>Live Tests:</strong> {JSON.stringify(diagnostics.liveTests, null, 2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
