'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Users, ShieldCheck, UserCheck, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { User } from '@/types/user';

export default function AdminUsersPage() {
  const { idToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch platform users');
      if (data.success && data.data) {
        setUsers(data.data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error fetching users');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
            User Administration & Role Permissions
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Platform Users Directory</h1>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Directory'}
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
          Loading platform users directory...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-2">
          <Users className="mx-auto h-8 w-8 text-slate-600" />
          <h3 className="text-sm font-semibold text-white">No Registered Users</h3>
          <p className="text-xs text-slate-400">
            Registered candidates, recruiters, and admins will appear here as accounts are created.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-semibold text-white">
                    <div>{u.displayName || u.email.split('@')[0]}</div>
                    <div className="text-[11px] text-slate-400 font-normal font-mono">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] border ${
                        u.role === 'admin'
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : u.role === 'recruiter'
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          : 'bg-slate-950 text-cyan-400 border-slate-800'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-[11px] text-emerald-400 border border-emerald-800">
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-mono">
                    {u.orgId || '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
