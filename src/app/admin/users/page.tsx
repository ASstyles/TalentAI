'use client';

import { Users, ShieldCheck, UserCheck } from 'lucide-react';

const MOCK_USERS = [
  { id: 'usr-1', name: 'Alex Mercer', email: 'alex.mercer@gmail.com', role: 'candidate', status: 'active', verified: true },
  { id: 'usr-2', name: 'Sarah Chen', email: 'sarah.chen@nexuscloud.io', role: 'recruiter', status: 'active', verified: true },
  { id: 'usr-3', name: 'Admin Root', email: 'admin@nexuscloud.io', role: 'admin', status: 'active', verified: true },
  { id: 'usr-4', name: 'Marcus Vance', email: 'marcus.v@protonmail.com', role: 'candidate', status: 'active', verified: false },
];

export default function AdminUsersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            User Administration & Role Permissions
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Platform Users Directory</h1>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {MOCK_USERS.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/30">
                <td className="px-6 py-4 font-semibold text-white">
                  <div>{u.name}</div>
                  <div className="text-[11px] text-slate-400 font-normal">{u.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-950 px-2.5 py-0.5 font-mono text-[11px] text-indigo-300 border border-slate-800">
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-[11px] text-emerald-400 border border-emerald-800">
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-300">
                  {u.verified ? 'Verified' : 'Pending Proof'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
