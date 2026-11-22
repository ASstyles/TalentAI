'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, UserCheck, Briefcase, Cpu, Award } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const isCandidate = pathname.startsWith('/candidate');
  const isRecruiter = pathname.startsWith('/recruiter');
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 font-bold text-white shadow-lg shadow-indigo-500/20">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">TalentMatrix</span>
              <span className="ml-1 rounded bg-indigo-950 px-1.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-800">AI</span>
            </div>
          </Link>

          {/* Portal Navigation Switcher */}
          <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
            <Link
              href="/candidate/dashboard"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isCandidate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Candidate Portal
            </Link>
            <Link
              href="/recruiter/dashboard"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isRecruiter
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Recruiter Portal
            </Link>
            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isAdmin
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Portal
            </Link>
          </nav>
        </div>

        {/* Dynamic Context Header Links */}
        <div className="flex items-center gap-3">
          {isCandidate && (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/candidate/resume" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">
                Resume Intelligence
              </Link>
              <Link href="/candidate/verification" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">
                Evidence
              </Link>
              <Link href="/candidate/recommendations" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">
                Role Matches
              </Link>
            </div>
          )}
          {isRecruiter && (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/recruiter/pipeline" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">
                Talent Pipeline
              </Link>
              <Link href="/recruiter/jobs/new" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 shadow-sm">
                + Post Job Opening
              </Link>
            </div>
          )}
          {isAdmin && (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/admin/gemini" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">
                Gemini Telemetry
              </Link>
              <Link href="/admin/audit" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">
                Audit Trail
              </Link>
            </div>
          )}

          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400">Gemini 3.8 / 4 Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}
