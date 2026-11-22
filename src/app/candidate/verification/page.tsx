'use client';

import { MOCK_VERIFICATIONS } from '@/lib/data/mock-data';
import { ShieldCheck, CheckCircle2, Clock, AlertCircle, FileSearch, ExternalLink } from 'lucide-react';
import { VerificationStatus } from '@/types/verification';

export default function CandidateVerificationPage() {
  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified (Tier 4)
          </span>
        );
      case 'partially_verified':
        return (
          <span className="flex items-center gap-1 rounded-full bg-blue-950 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-800">
            Partially Verified
          </span>
        );
      case 'requires_manual_review':
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-800">
            <Clock className="h-3.5 w-3.5" /> In Auditor Review
          </span>
        );
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 rounded-full bg-indigo-950 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-800">
            Verification In Progress
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400 border border-slate-800">
            Unverified
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            Authentic Evidence & Credential Verification
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Independent Verification Records</h1>
        </div>
      </div>

      <div className="space-y-4">
        {MOCK_VERIFICATIONS.map((rec) => (
          <div
            key={rec.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3 hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                  {rec.claimType} Claim
                </span>
                <h3 className="text-base font-bold text-white">{rec.claimTitle}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{rec.claimDetails}</p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(rec.status)}
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Source: <strong className="text-slate-200">{rec.verificationSource}</strong></span>
                <span>•</span>
                <span>Audited By: {rec.reviewedBy}</span>
              </div>
              <div className="text-cyan-400 font-mono font-medium">
                Confidence: {rec.confidence}%
              </div>
            </div>
            {rec.auditNotes && (
              <div className="rounded-lg bg-amber-950/30 p-2.5 text-xs text-amber-300 border border-amber-900/40">
                <strong>Audit Note:</strong> {rec.auditNotes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
