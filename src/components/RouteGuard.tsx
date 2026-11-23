'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { UserRole } from '@/types/user';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  portalName: 'candidate' | 'recruiter' | 'admin';
}

export default function RouteGuard({ children, allowedRoles, portalName }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading, sessionReady } = useAuth();

  // If public route like /recruiter/access-request, bypass guard
  if (pathname === '/recruiter/access-request') {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs text-slate-400 font-mono">Verifying authorization & cryptographic claims...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated user or unverified session
  if (!user || !sessionReady) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400">
            <Lock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Authentication Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              You must be signed in to access the <strong className="text-slate-200 capitalize">{portalName} Portal</strong>. Please sign in or create an account to proceed.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <Link
              href={`/login?role=${portalName === 'admin' ? 'recruiter' : portalName}&redirect=${encodeURIComponent(pathname)}`}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <span>Sign In to {portalName === 'admin' ? 'TalentAI' : portalName}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/"
              className="w-full inline-block text-center rounded-xl border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user with role mismatch
  if (role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-amber-500/30 bg-slate-900/90 p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-950/80 border border-amber-800 text-amber-400">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">
              {portalName === 'recruiter'
                ? 'Recruiter access has not been enabled for this account.'
                : 'Access Denied: Insufficient Privileges'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {portalName === 'recruiter'
                ? 'Your account has verified Candidate permissions. Recruiter privileges require approved enterprise administrator authorization.'
                : `This workspace requires ${allowedRoles.join(' or ')} permissions. Your verified account role is '${role}'.`}
            </p>
          </div>

          <div className="pt-2 space-y-2">
            {role === 'candidate' && portalName === 'recruiter' && (
              <>
                <Link
                  href="/candidate/dashboard"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <span>Proceed to Candidate Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/recruiter/access-request"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <span>Request Recruiter Access</span>
                </Link>
              </>
            )}

            {role === 'recruiter' && portalName === 'candidate' && (
              <Link
                href="/recruiter/dashboard"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <span>Switch to Recruiter Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}

            {portalName === 'admin' && (
              <Link
                href={role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard'}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                <span>Return to Your Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authorized user
  return <>{children}</>;
}
