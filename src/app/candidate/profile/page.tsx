'use client';

import { useState } from 'react';
import { MOCK_CANDIDATE, MOCK_VERIFICATIONS } from '@/lib/data/mock-data';
import { UserCheck, ShieldCheck, CheckCircle2, Save, MapPin, Github, Linkedin, Globe } from 'lucide-react';

export default function CandidateProfilePage() {
  const [headline, setHeadline] = useState(MOCK_CANDIDATE.headline);
  const [summary, setSummary] = useState(MOCK_CANDIDATE.summary);
  const [yoe, setYoe] = useState(MOCK_CANDIDATE.yearsOfExperience);
  const [city, setCity] = useState(MOCK_CANDIDATE.location.city);
  const [github, setGithub] = useState(MOCK_CANDIDATE.githubUsername || '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Candidate Profile & Identity
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Professional Profile Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verification: {MOCK_CANDIDATE.overallVerificationScore}%
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
            Professional Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
            Executive Engineering Summary
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Years of Experience
            </label>
            <input
              type="number"
              value={yoe}
              onChange={(e) => setYoe(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Primary Location
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-3">
          <span className="text-xs font-semibold uppercase text-slate-400 block">External Profiles & Verification Links</span>
          <div className="flex items-center gap-3">
            <Github className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="github username"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Profile updated successfully!
            </span>
          ) : <div />}

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/20"
          >
            <Save className="h-3.5 w-3.5" />
            Save Profile Changes
          </button>
        </div>
      </form>
    </div>
  );
}
