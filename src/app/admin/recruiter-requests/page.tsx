'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Mail,
  User,
  ExternalLink,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { RecruiterAccessRequest } from '@/types/user';

export default function AdminRecruiterRequestsPage() {
  const { idToken, role } = useAuth();
  const [requests, setRequests] = useState<RecruiterAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/recruiter-requests', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load requests');
      setRequests(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idToken) {
      fetchRequests();
    }
  }, [idToken]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/admin/recruiter-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ requestId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to ${action} request`);

      setActionSuccess(json.message);
      // Refresh list
      await fetchRequests();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Admin Dashboard
            </Link>
          </div>
          <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Recruiter Access Requests Governance
          </h1>
        </div>
        <button
          onClick={fetchRequests}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
        >
          Refresh Requests
        </button>
      </div>

      {actionSuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-xs text-slate-400 font-mono">
          Loading recruiter access requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-2">
          <Clock className="mx-auto h-8 w-8 text-slate-600" />
          <h3 className="text-sm font-semibold text-white">No Pending Recruiter Requests</h3>
          <p className="text-xs text-slate-400">
            All enterprise access requests have been reviewed or no new requests have been submitted.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400 font-bold">
                    {req.fullName[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {req.fullName}
                      <span className="text-xs font-normal text-slate-400">({req.jobTitle})</span>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Building className="h-3.5 w-3.5 text-indigo-400" /> {req.companyName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-slate-500" /> {req.workEmail}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      req.status === 'pending'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : req.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {req.status}
                  </span>
                  <a
                    href={req.businessWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <span>Website</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Access Rationale & Hiring Focus
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  {req.reason}
                </p>
              </div>

              {req.status === 'pending' && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleAction(req.id, 'reject')}
                    disabled={processingId === req.id}
                    className="rounded-xl border border-rose-800 bg-rose-950/40 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition-colors disabled:opacity-50"
                  >
                    Reject Access
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'approve')}
                    disabled={processingId === req.id}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve & Provision Recruiter Role</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
