'use client';

import { useState, useEffect } from 'react';
import { Lock, ShieldCheck, RefreshCw } from 'lucide-react';
import { AuditLogEntry } from '@/lib/services/audit-service';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      if (data.success && data.data) {
        setLogs(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Immutable Audit Trail & Compliance
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Security & Operational Audit Log</h1>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

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
                <td className="px-6 py-4 font-mono text-slate-400">
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
                <td className="px-6 py-4 text-slate-300">{log.target}</td>
                <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
