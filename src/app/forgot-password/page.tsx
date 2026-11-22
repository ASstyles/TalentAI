'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('Please enter your account email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendPasswordReset(email.trim().toLowerCase());
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res.error || 'Failed to dispatch reset link. Please check the email address.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="relative w-full max-w-md space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Login</span>
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-2 text-center pb-6 border-b border-slate-800">
            <h1 className="text-2xl font-bold tracking-tight text-white">Reset Password</h1>
            <p className="text-xs text-slate-400">
              Enter your registered email address and we will dispatch a secure Firebase password reset link.
            </p>
          </div>

          {isSuccess ? (
            <div className="mt-6 space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Password Reset Link Dispatched</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  We have dispatched instructions to <strong className="text-white">{email}</strong>. Check your inbox and follow the secure link to set your new password.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <span>Return to Login Gateway</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {errorMessage && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Account Email</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Sending reset link...</span>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Secure cryptographic password recovery</span>
        </div>
      </div>
    </div>
  );
}
