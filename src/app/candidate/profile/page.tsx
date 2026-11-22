'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Save, Github, Linkedin, Globe, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function CandidateProfilePage() {
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [yoe, setYoe] = useState(0);
  const [city, setCity] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [verificationScore, setVerificationScore] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/candidate/profile');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setHeadline(json.data.headline || '');
            setSummary(json.data.summary || '');
            setYoe(json.data.yearsOfExperience || 0);
            setCity(json.data.location?.city || '');
            setGithub(json.data.githubUsername || '');
            setLinkedin(json.data.linkedinUrl || '');
            setPortfolio(json.data.portfolioUrl || '');
            setVerificationScore(json.data.overallVerificationScore || 0);
          }
        }
      } catch (err) {
        console.error('Failed to load profile from Firestore:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch('/api/candidate/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          summary,
          yearsOfExperience: yoe,
          city,
          githubUsername: github,
          linkedinUrl: linkedin,
          portfolioUrl: portfolio,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to persist candidate profile in Firestore');
      }

      setSaveStatus({ type: 'success', message: 'Profile saved successfully to persistent Firestore!' });
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSaveStatus({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

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
            Verification: {verificationScore}%
          </span>
        </div>
      </div>

      {saveStatus && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-semibold ${
            saveStatus.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
            Professional Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Senior Distributed Systems Engineer"
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
            placeholder="Describe your architecture experience, tech stack, and notable systems accomplishments..."
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
              min={0}
              max={50}
              value={yoe}
              onChange={(e) => setYoe(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Primary Location (City)
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. San Francisco, CA"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-3">
          <span className="text-xs font-semibold uppercase text-slate-400 block">
            External Profiles & Verification Links
          </span>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Github className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="github username (e.g. octocat)"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <Linkedin className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                placeholder="https://yourportfolio.engineering"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving to Firestore...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
