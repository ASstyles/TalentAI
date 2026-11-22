'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UserCheck,
  Briefcase,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { UserRole } from '@/types/user';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') as 'candidate' | 'recruiter' | null;
  const redirectParam = searchParams.get('redirect') || null;

  const { loginWithEmail, loginWithGoogle, user, role, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wrongRoleNotice, setWrongRoleNotice] = useState<{
    detectedRole: UserRole;
    intendedRole: 'candidate' | 'recruiter';
  } | null>(null);

  // If already authenticated and no role mismatch, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user && role && !wrongRoleNotice) {
      if (roleParam === 'recruiter' && role === 'candidate') {
        setWrongRoleNotice({ detectedRole: 'candidate', intendedRole: 'recruiter' });
      } else if (roleParam === 'candidate' && role === 'recruiter') {
        // Recruiter logging in through candidate portal - offer quick switch
        setWrongRoleNotice({ detectedRole: 'recruiter', intendedRole: 'candidate' });
      } else {
        const destination =
          redirectParam ||
          (role === 'admin'
            ? '/admin/dashboard'
            : role === 'recruiter'
            ? '/recruiter/dashboard'
            : '/candidate/dashboard');
        router.push(destination);
      }
    }
  }, [user, role, authLoading, roleParam, redirectParam, router, wrongRoleNotice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setWrongRoleNotice(null);

    if (!email || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithEmail(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
        setIsSubmitting(false);
        return;
      }

      const verifiedRole = res.role || 'candidate';

      // Enforce zero-trust portal role matching
      if (roleParam === 'recruiter' && verifiedRole === 'candidate') {
        setWrongRoleNotice({ detectedRole: 'candidate', intendedRole: 'recruiter' });
        setIsSubmitting(false);
        return;
      }

      if (roleParam === 'candidate' && verifiedRole === 'recruiter') {
        setWrongRoleNotice({ detectedRole: 'recruiter', intendedRole: 'candidate' });
        setIsSubmitting(false);
        return;
      }

      // Successful portal matching: redirect to target dashboard
      const destination =
        redirectParam ||
        (verifiedRole === 'admin'
          ? '/admin/dashboard'
          : verifiedRole === 'recruiter'
          ? '/recruiter/dashboard'
          : '/candidate/dashboard');
      router.push(destination);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected authentication error occurred.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setWrongRoleNotice(null);
    setIsSubmitting(true);

    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setErrorMessage(res.error || 'Google sign-in was cancelled or failed.');
        setIsSubmitting(false);
        return;
      }

      const verifiedRole = res.role || 'candidate';

      if (roleParam === 'recruiter' && verifiedRole === 'candidate') {
        setWrongRoleNotice({ detectedRole: 'candidate', intendedRole: 'recruiter' });
        setIsSubmitting(false);
        return;
      }

      const destination =
        redirectParam ||
        (verifiedRole === 'admin'
          ? '/admin/dashboard'
          : verifiedRole === 'recruiter'
          ? '/recruiter/dashboard'
          : '/candidate/dashboard');
      router.push(destination);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Google authentication failed.');
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // VIEW 1: GATEWAY SELECTION SCREEN (No role query param)
  // ----------------------------------------------------
  if (!roleParam) {
    return (
      <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-12 right-1/4 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px]" />

        <div className="relative w-full max-w-4xl space-y-10 text-center">
          {/* Header Branding */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-4 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Enterprise Authentication Gateway</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Welcome to <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">TalentAI</span>
            </h1>
            <p className="mx-auto max-w-xl text-sm text-slate-400 sm:text-base">
              Evidence-based engineering recruitment intelligence. Please select your dedicated portal below to access your workspace.
            </p>
          </div>

          {/* Dual Gateway Cards */}
          <div className="grid gap-6 sm:grid-cols-2 text-left">
            {/* Candidate Card */}
            <div className="group relative rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:bg-slate-900/90 hover:shadow-blue-500/10 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 text-blue-400 shadow-inner group-hover:scale-110 transition-transform">
                  <UserCheck className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Candidate Login
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    Demonstrate verified engineering abilities, complete adaptive technical interviews, benchmark skills across 16 specializations, and discover matched roles.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    <span>Upload resume for 5-tier evidence parsing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    <span>Take bounded coding sandbox assessments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    <span>Personalized engineering role compatibility</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/login?role=candidate"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span>Continue as Candidate</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="mt-3 text-center text-xs text-slate-500">
                  New engineer?{' '}
                  <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium underline">
                    Create candidate account
                  </Link>
                </p>
              </div>
            </div>

            {/* Recruiter Card */}
            <div className="group relative rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:bg-slate-900/90 hover:shadow-indigo-500/10 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
                  <Briefcase className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Recruiter Login
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    Access organization pipelines, inspect multi-tier verified evidence dossiers, and record tamper-evident human hiring decisions.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span>Inspect verified code assessment execution</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span>Zero-trust multi-tenant organization isolation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span>Immutable audit log for hiring decisions</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/login?role=recruiter"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <span>Continue as Recruiter</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="mt-3 text-center text-xs text-slate-500">
                  Need hiring privileges?{' '}
                  <Link href="/recruiter/access-request" className="text-indigo-400 hover:text-indigo-300 font-medium underline">
                    Request recruiter access
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 text-xs text-slate-500 flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Enterprise Zero-Trust Authentication backed by Firebase Auth & Cryptographic Custom Claims</span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 2: ROLE-SPECIFIC LOGIN FORM (?role=candidate | ?role=recruiter)
  // ----------------------------------------------------
  const isCandidate = roleParam === 'candidate';
  const themeAccent = isCandidate ? 'blue' : 'indigo';

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Ambient Glows */}
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full ${
          isCandidate ? 'bg-blue-600/15' : 'bg-indigo-600/15'
        } blur-[120px]`}
      />

      <div className="relative w-full max-w-md space-y-6">
        {/* Back Link to Gateway */}
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Switch Portal</span>
          </Link>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isCandidate
                ? 'bg-blue-950/80 text-blue-400 border border-blue-800'
                : 'bg-indigo-950/80 text-indigo-400 border border-indigo-800'
            }`}
          >
            {isCandidate ? <UserCheck className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
            <span>{isCandidate ? 'Candidate Portal' : 'Recruiter Portal'}</span>
          </span>
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="space-y-2 text-center pb-6 border-b border-slate-800">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {isCandidate ? 'Welcome Back, Candidate' : 'Welcome Back, Recruiter'}
            </h2>
            <p className="text-xs text-slate-400">
              {isCandidate
                ? 'Sign in to access your skills profile, coding assessments, and role recommendations.'
                : 'Sign in with your enterprise credentials to manage candidate pipelines and review evidence.'}
            </p>
          </div>

          {/* Wrong Role Warning Banner */}
          {wrongRoleNotice && (
            <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-xs space-y-3">
              <div className="flex items-start gap-2.5 text-amber-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <strong className="font-semibold block">
                    {wrongRoleNotice.intendedRole === 'recruiter'
                      ? 'Recruiter access has not been enabled for this account.'
                      : 'You are signed in as a Recruiter.'}
                  </strong>
                  <p className="mt-1 text-slate-300 leading-relaxed">
                    {wrongRoleNotice.intendedRole === 'recruiter'
                      ? 'Your account has verified Candidate privileges. Recruiter access requires approved enterprise administrator authorization.'
                      : 'You are accessing the candidate portal with an authorized Recruiter account.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-amber-500/20">
                {wrongRoleNotice.intendedRole === 'recruiter' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => router.push('/candidate/dashboard')}
                      className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                    >
                      Proceed to Candidate Dashboard
                    </button>
                    <Link
                      href="/recruiter/access-request"
                      className="w-full text-center rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      Request Recruiter Access
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push('/recruiter/dashboard')}
                    className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                  >
                    Proceed to Recruiter Dashboard
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && !wrongRoleNotice && (
            <div className="mt-6 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {isCandidate ? 'Email Address' : 'Work Email Address'}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isCandidate ? 'you@example.com' : 'you@company.com'}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            {isCandidate && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <label htmlFor="rememberMe" className="text-xs text-slate-400 cursor-pointer select-none">
                  Remember this device for 30 days
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50 ${
                isCandidate
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
              }`}
            >
              {isSubmitting ? (
                <span>Authenticating with Firebase...</span>
              ) : (
                <>
                  <span>Sign In as {isCandidate ? 'Candidate' : 'Recruiter'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Social Sign-In Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-500 uppercase tracking-wider text-[10px]">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 px-4 text-xs font-medium text-slate-200 hover:bg-slate-800/80 hover:text-white transition-all disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.2.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16c1.8 3.8 5.6 7 10.1 7z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Footer Actions */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400 space-y-2">
            {isCandidate ? (
              <p>
                Don&apos;t have a candidate account?{' '}
                <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold underline">
                  Create candidate account
                </Link>
              </p>
            ) : (
              <p>
                Need enterprise recruiter privileges?{' '}
                <Link href="/recruiter/access-request" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
                  Request recruiter access
                </Link>
              </p>
            )}

            <p className="text-[11px] text-slate-500">
              {isCandidate ? (
                <>
                  Are you a recruiter?{' '}
                  <Link href="/login?role=recruiter" className="text-slate-300 hover:underline">
                    Switch to Recruiter Login
                  </Link>
                </>
              ) : (
                <>
                  Are you a candidate?{' '}
                  <Link href="/login?role=candidate" className="text-slate-300 hover:underline">
                    Switch to Candidate Login
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span>Loading Authentication Gateway...</span>
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
