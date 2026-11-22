'use client';

import { ROLE_BENCHMARKS } from '@/lib/matching/role-matcher';
import { Database, ShieldCheck } from 'lucide-react';
import { EngineeringRole } from '@/types/job';

export default function AdminTaxonomyPage() {
  const roles = Object.keys(ROLE_BENCHMARKS) as EngineeringRole[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Normalized Engineering Competency Taxonomy
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">16 Engineering Roles & Rubrics</h1>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const requirements = ROLE_BENCHMARKS[role];
          return (
            <div key={role} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h3 className="text-base font-bold text-white">{role}</h3>
                <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-800">
                  {requirements.length} Skills
                </span>
              </div>
              <div className="space-y-1.5">
                {requirements.map((req) => (
                  <div key={req.skill} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{req.skill}</span>
                    <span className="font-mono text-indigo-400">
                      Min: {req.minScore}% (Weight: {req.weight})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
