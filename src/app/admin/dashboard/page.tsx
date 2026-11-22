'use client';

import Link from 'next/link';
import { ShieldCheck, Cpu, Database, Users, Activity, Lock, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Platform Operations & Compliance
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Administrator Control Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/gemini"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
          >
            Gemini Telemetry & Models
          </Link>
          <Link
            href="/admin/audit"
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            Immutable Audit Logs
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">System Health</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">100% Operational</span>
          </div>
          <span className="text-[11px] text-slate-500">Firebase & Firestore Active</span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">AI Intelligence Layer</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-400">Gemini 3.8 / 4</span>
          </div>
          <span className="text-[11px] text-slate-500">Fast & Reasoning Tiers</span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Total Audit Events</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cyan-400">1,482</span>
          </div>
          <span className="text-[11px] text-slate-500">Cryptographically logged</span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <span className="text-xs text-slate-400">Active Roles Supported</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-400">16 Specializations</span>
          </div>
          <span className="text-[11px] text-slate-500">Normalized taxonomy</span>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Link
          href="/admin/gemini"
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:bg-slate-800/40 transition-colors space-y-3"
        >
          <div className="rounded-xl bg-indigo-950 p-3 text-indigo-400 w-fit border border-indigo-800/50">
            <Cpu className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">Gemini API & Telemetry</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monitor dynamic model selection, latency, prompt injection defenses, and real-time token expenditure.
          </p>
          <span className="inline-flex items-center gap-1 text-xs text-indigo-400 font-semibold">
            Manage AI Services <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/taxonomy"
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:bg-slate-800/40 transition-colors space-y-3"
        >
          <div className="rounded-xl bg-blue-950 p-3 text-blue-400 w-fit border border-blue-800/50">
            <Database className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">Role & Competency Taxonomy</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure benchmarks, skill weights (1-10), and rubric thresholds for 16 standardized engineering positions.
          </p>
          <span className="inline-flex items-center gap-1 text-xs text-blue-400 font-semibold">
            Edit Taxonomy <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/audit"
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:bg-slate-800/40 transition-colors space-y-3"
        >
          <div className="rounded-xl bg-emerald-950 p-3 text-emerald-400 w-fit border border-emerald-800/50">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">Security & Audit Trails</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Inspect immutable compliance logs, human recruiter overrides, and verification auditor actions.
          </p>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
            View Audit Log <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
