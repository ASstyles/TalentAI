import { ShieldCheck, Cpu } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-400" />
          <span className="font-semibold text-slate-400">TalentMatrix AI Platform</span>
          <span>•</span>
          <span>Google Antigravity Enterprise Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>5-Tier Evidence Hierarchy Enforced</span>
          </div>
          <span>•</span>
          <span>Human-in-the-Loop Authority Preserved</span>
        </div>
      </div>
    </footer>
  );
}
