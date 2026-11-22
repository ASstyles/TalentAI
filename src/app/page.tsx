import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Terminal,
  FileSearch,
  Sparkles,
  Award,
  Users,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[128px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 h-80 w-80 rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 -right-40 h-80 w-80 rounded-full bg-cyan-600/15 blur-[120px]" />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-4 py-1.5 text-xs font-medium text-indigo-300 backdrop-blur-md mb-6">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Evidence-Based Engineering Talent Intelligence</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-tight">
            Stop Guessing on Resumes.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Prove Demonstrated Engineering Ability.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-lg">
            A talent intelligence system that rigorously differentiates{' '}
            <strong className="text-slate-200">what candidates claim</strong> from{' '}
            <strong className="text-slate-200">what can be verified</strong> and{' '}
            <strong className="text-slate-200">what they demonstrate</strong> in adaptive technical environments.
          </p>

          {/* Dedicated Portal Choice Gateway Cards */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
            <Link
              href="/login?role=candidate"
              className="group relative flex flex-col items-start p-6 rounded-3xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 hover:border-blue-500/50 transition-all duration-300 text-left shadow-xl hover:-translate-y-1"
            >
              <div className="rounded-2xl bg-blue-950 p-3 text-blue-400 border border-blue-800/50 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white flex items-center gap-1.5">
                Candidate Portal <ArrowRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Build verified engineering profiles, complete adaptive technical interviews, and take bounded sandbox coding assessments.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-xs font-semibold text-blue-400">
                <span>Enter Candidate Gateway</span>
                <span className="text-[11px] text-slate-500">Sign in / Register</span>
              </div>
            </Link>

            <Link
              href="/login?role=recruiter"
              className="group relative flex flex-col items-start p-6 rounded-3xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 hover:border-indigo-500/50 transition-all duration-300 text-left shadow-xl hover:-translate-y-1"
            >
              <div className="rounded-2xl bg-indigo-950 p-3 text-indigo-400 border border-indigo-800/50 group-hover:scale-110 transition-transform">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white flex items-center gap-1.5">
                Recruiter Portal <ArrowRight className="h-4 w-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Access candidate pipelines, inspect verified multi-tier evidence matrix reports, and record human hiring decisions.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-xs font-semibold text-indigo-400">
                <span>Enter Recruiter Gateway</span>
                <span className="text-[11px] text-slate-500">Enterprise Access</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 5-Tier Evidence Hierarchy Architecture Display */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-slate-800/80">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            The 5 Deterministic Evidence Tiers
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            Traditional platforms treat an unverified resume bullet point equally to proven code. TalentMatrix enforces mathematical tier weights.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tier 1 • Weight 0.1</div>
              <h4 className="mt-2 text-sm font-bold text-white">Candidate-Claimed</h4>
              <p className="mt-2 text-xs text-slate-400">
                Self-reported skills on profile forms or raw resume keyword sections without contextual proof.
              </p>
            </div>
            <div className="mt-4 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs font-mono text-slate-300">
              Score multiplier: ×0.1
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">Tier 2 • Weight 0.2</div>
              <h4 className="mt-2 text-sm font-bold text-white">Resume-Extracted</h4>
              <p className="mt-2 text-xs text-slate-400">
                Extracted via Gemini NLP within chronological work history, company metadata, and date ranges.
              </p>
            </div>
            <div className="mt-4 rounded-lg bg-blue-950/60 px-3 py-1.5 text-xs font-mono text-blue-300 border border-blue-900/40">
              Score multiplier: ×0.2
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Tier 3 • Weight 0.4</div>
              <h4 className="mt-2 text-sm font-bold text-white">Project-Supported</h4>
              <p className="mt-2 text-xs text-slate-400">
                Corroborated by architectural diagrams, commit histories, GitHub repositories, or live applications.
              </p>
            </div>
            <div className="mt-4 rounded-lg bg-indigo-950/60 px-3 py-1.5 text-xs font-mono text-indigo-300 border border-indigo-900/40">
              Score multiplier: ×0.4
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Tier 4 • Weight 0.7</div>
              <h4 className="mt-2 text-sm font-bold text-white">Independently Verified</h4>
              <p className="mt-2 text-xs text-slate-400">
                Validated via university registrar APIs, credential issuers (Credly), or third-party HR audit verification.
              </p>
            </div>
            <div className="mt-4 rounded-lg bg-cyan-950/60 px-3 py-1.5 text-xs font-mono text-cyan-300 border border-cyan-900/40">
              Score multiplier: ×0.7
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Tier 5 • Weight 1.0</div>
              <h4 className="mt-2 text-sm font-bold text-white">Assessment-Demonstrated</h4>
              <p className="mt-2 text-xs text-slate-400">
                Proven in adaptive AI technical interviews and executed inside isolated deterministic coding sandboxes.
              </p>
            </div>
            <div className="mt-4 rounded-lg bg-emerald-900/40 px-3 py-1.5 text-xs font-mono text-emerald-300 border border-emerald-700/50">
              Score multiplier: ×1.0
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
