'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Lock, ShieldCheck, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { AuditLogEntry } from '@/lib/services/audit-service';

export default function AdminAuditPage() {
  const { idToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/audit', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch audit logs');
      if (data.success && data.data) {
        setLogs(data.data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error fetching audit logs');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <Link
            href="/admin/dashboard"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> Admin Dashboard
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Immutable Audit Trail & Compliance
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Security & Operational Audit Log</h1>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-xs text-slate-400 font-mono">
          Loading immutable audit events...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-2">
          <ShieldCheck className="mx-auto h-8 w-8 text-slate-600" />
          <h3 className="text-sm font-semibold text-white">No Audit Events Recorded</h3>
          <p className="text-xs text-slate-400">
            Audit logging begins as platform authentication, role modifications, and evaluation requests occur.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">
                    <div>{log.actor}</div>
                    <span className="text-[10px] text-slate-500 uppercase">{log.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-mono text-cyan-400 border border-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-mono text-xs">{log.target}</td>
                  <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
