'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { registerCandidate, user, role, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user && role) {
      router.replace(
        role === 'admin'
          ? '/admin/dashboard'
          : role === 'recruiter'
          ? '/recruiter/dashboard'
          : '/candidate/dashboard'
      );
    }
  }, [user, role, authLoading, router]);

  if (!authLoading && user && role) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center max-w-sm space-y-4 shadow-2xl backdrop-blur-md">
          <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Already Signed In</h3>
            <p className="text-xs text-slate-400 mt-1">
              You are signed in as <strong className="text-white">{user.displayName || user.email}</strong>.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-blue-400 font-medium">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <span>Redirecting to your dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // Live password strength criteria
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&_\-#]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordStrong = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isPasswordStrong) {
      setErrorMessage('Please satisfy all password complexity requirements.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('You must accept the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerCandidate({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        acceptedTerms,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create candidate account.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('Account created successfully! Verification email dispatched. Redirecting to Candidate Dashboard...');
      setTimeout(() => {
        router.push('/candidate/dashboard');
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/15 blur-[120px]" />

      <div className="relative w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/60 px-3.5 py-1 text-xs font-semibold text-blue-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Engineer Onboarding</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Create Your Candidate Account
          </h1>
          <p className="text-xs text-slate-400">
            Build your evidence-backed engineering profile, take adaptive assessments, and benchmark skills across 16 specializations.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
          {errorMessage && (
            <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.mercer@engineering.io"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Live Password Strength Checklist */}
              {password.length > 0 && (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasMinLength ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} 8+ Characters
                  </span>
                  <span className={`flex items-center gap-1 ${hasUpperCase ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasUpperCase ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Uppercase
                  </span>
                  <span className={`flex items-center gap-1 ${hasLowerCase ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasLowerCase ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Lowercase
                  </span>
                  <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasNumber ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Number
                  </span>
                  <span className={`flex items-center gap-1 col-span-2 ${hasSpecialChar ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasSpecialChar ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Special symbol (@$!%*?&_-#)
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-[11px] text-rose-400">Passwords do not match</p>
              )}
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-slate-400 select-none">
                I agree to the{' '}
                <a href="#" className="text-blue-400 hover:underline">
                  Terms of Service
                </a>{' '}
                and acknowledge the{' '}
                <a href="#" className="text-blue-400 hover:underline">
                  Privacy Policy
                </a>
                .
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isPasswordStrong || !passwordsMatch || !acceptedTerms}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Provisioning Candidate Account...</span>
              ) : (
                <>
                  <span>Create Candidate Account</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            <p>
              Already have an account?{' '}
              <Link href="/login?role=candidate" className="text-blue-400 hover:text-blue-300 font-semibold underline">
                Sign in to Candidate Portal
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Server-Controlled Account Provisioning & Zero-Trust Role Security</span>
        </div>
      </div>
    </div>
  );
}
