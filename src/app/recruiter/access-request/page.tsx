'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Building,
  Mail,
  User,
  Globe,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';

export default function RecruiterAccessRequestPage() {
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [reason, setReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Business email basic validation
    const domain = workEmail.split('@')[1]?.toLowerCase();
    const freemail = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    if (freemail.includes(domain)) {
      setErrorMessage('Please use your official company work email, not a personal email provider.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/recruiter/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          workEmail: workEmail.trim().toLowerCase(),
          companyName: companyName.trim(),
          jobTitle: jobTitle.trim(),
          businessWebsite: businessWebsite.trim(),
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit recruiter access request');
      }

      setSubmittedTicket(json.requestId);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[120px]" />

      <div className="relative w-full max-w-xl space-y-6">
        <Link
          href="/login?role=recruiter"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Recruiter Login</span>
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-2 text-center pb-6 border-b border-slate-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-950/80 border border-indigo-800 text-indigo-400 mb-3">
              <Briefcase className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Request Recruiter Access</h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Recruiter privileges grant access to proprietary candidate dossiers, technical assessments, and hiring pipelines. Enterprise administrator review is required.
            </p>
          </div>

          {submittedTicket ? (
            <div className="mt-6 space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">Access Request Registered</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your credentials for <strong className="text-white">{companyName}</strong> have been submitted with tracking ID:
                </p>
                <div className="font-mono text-xs bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-indigo-400 inline-block">
                  {submittedTicket}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pt-2">
                  An administrator will verify your organization and provision your custom claims. You will receive an email at <strong className="text-slate-300">{workEmail}</strong> once approved.
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

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Sarah Chen"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Work Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Corporate Work Email</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="sarah.chen@nexuscloud.io"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Organization / Company</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Building className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nexus Cloud Technologies"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Job Title</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Lead Talent Partner"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Company Website</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Globe className="h-4 w-4" />
                  </div>
                  <input
                    type="url"
                    required
                    value={businessWebsite}
                    onChange={(e) => setBusinessWebsite(e.target.value)}
                    placeholder="https://nexuscloud.io"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Hiring Focus & Access Rationale
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe your active engineering hiring requisitions (e.g. Distributed Systems, AI Engineering, Full-Stack) and why your team requires pipeline access."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-400">
                <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  Recruiter roles can only be granted by trusted administrator-controlled provisioning. Submitting an application does not automatically grant recruiter permissions.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Registering Request...</span>
                ) : (
                  <>
                    <span>Submit Recruiter Access Request</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
