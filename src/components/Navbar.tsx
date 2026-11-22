'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  UserCheck,
  Briefcase,
  Cpu,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function Navbar() {
  const pathname = usePathname();
  const { user, role, orgId, logout, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isCandidateRoute = pathname.startsWith('/candidate');
  const isRecruiterRoute = pathname.startsWith('/recruiter');
  const isAdminRoute = pathname.startsWith('/admin');

  // Compute user initials
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Branding & Role Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 font-bold text-white shadow-lg shadow-indigo-500/20">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">TalentAI</span>
              <span className="ml-1 rounded bg-indigo-950 px-1.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-800">
                PRO
              </span>
            </div>
          </Link>

          {/* Role-Specific Portal Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              {role === 'candidate' && (
                <>
                  <Link
                    href="/candidate/dashboard"
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname === '/candidate/dashboard'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                  <Link
                    href="/candidate/jobs"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname.startsWith('/candidate/jobs')
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    Job Openings
                  </Link>
                  <Link
                    href="/candidate/resume"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname.startsWith('/candidate/resume')
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    Resume Intelligence
                  </Link>
                  <Link
                    href="/candidate/verification"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname.startsWith('/candidate/verification')
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    Evidence
                  </Link>
                  <Link
                    href="/candidate/recommendations"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname.startsWith('/candidate/recommendations')
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    Role Matches
                  </Link>
                </>
              )}

              {role === 'recruiter' && (
                <>
                  <Link
                    href="/recruiter/dashboard"
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname === '/recruiter/dashboard'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                  <Link
                    href="/recruiter/pipeline"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname.startsWith('/recruiter/pipeline')
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    Talent Pipeline
                  </Link>
                  <Link
                    href="/recruiter/jobs/new"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 shadow-sm"
                  >
                    + Post Job
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    href="/admin/dashboard"
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname === '/admin/dashboard'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin Console
                  </Link>
                  <Link
                    href="/admin/gemini"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname.startsWith('/admin/gemini')
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    Gemini AI
                  </Link>
                  <Link
                    href="/admin/recruiter-requests"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname.startsWith('/admin/recruiter-requests')
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    Access Requests
                  </Link>
                  <Link
                    href="/admin/audit"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pathname.startsWith('/admin/audit')
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    Audit Trail
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right: Authentication Status & Actions */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 animate-ping rounded-full bg-slate-500" />
              <span>Verifying...</span>
            </div>
          ) : user ? (
            <div className="relative">
              {/* User Dropdown Button */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/90 py-1.5 pl-2 pr-3 text-left hover:border-slate-700 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm ${
                    role === 'admin'
                      ? 'bg-emerald-600'
                      : role === 'recruiter'
                      ? 'bg-indigo-600'
                      : 'bg-blue-600'
                  }`}
                >
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white leading-none">{displayName}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        role === 'admin'
                          ? 'text-emerald-400'
                          : role === 'recruiter'
                          ? 'text-indigo-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {role}
                    </span>
                    {orgId && <span className="text-[10px] text-slate-500">({orgId})</span>}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-slate-950 p-2 shadow-2xl backdrop-blur-xl z-50 text-xs space-y-1"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-800/80">
                    <div className="font-semibold text-white truncate">{displayName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{email}</div>
                    <div className="mt-1.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          role === 'admin'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : role === 'recruiter'
                            ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                            : 'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}
                      >
                        {role} account
                      </span>
                    </div>
                  </div>

                  {role === 'candidate' && (
                    <Link
                      href="/candidate/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-blue-400" />
                      <span>Candidate Profile</span>
                    </Link>
                  )}

                  {role === 'recruiter' && (
                    <Link
                      href="/recruiter/pipeline"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Recruiter Pipeline</span>
                    </Link>
                  )}

                  {role === 'admin' && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Admin Console</span>
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-left"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
