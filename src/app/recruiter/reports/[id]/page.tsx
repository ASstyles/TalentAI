'use client';

import { useState } from 'react';
import {
  MOCK_CANDIDATE,
  MOCK_JOBS,
  MOCK_VERIFICATIONS,
  MOCK_INTERVIEW_SESSION,
  MOCK_CODING_SUBMISSION,
} from '@/lib/data/mock-data';
import { calculateCompetencyProfile } from '@/lib/competency/scoring';
import { generateHiringRecommendation } from '@/lib/hiring/decision-support';
import { RecruiterDecision } from '@/types/hiring';
import { ShieldCheck, Award, CheckCircle2, AlertTriangle, FileText, Send } from 'lucide-react';

export default function EvidenceBasedRecruiterReportPage() {
  const profile = calculateCompetencyProfile({
    candidateId: MOCK_CANDIDATE.id,
    claimedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    extractedSkills: [
      { name: 'TypeScript', category: 'languages', evidenceTier: 'project_supported', confidence: 0.95 },
      { name: 'React', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.92 },
      { name: 'Node.js', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.94 },
    ],
    verifiedRecords: MOCK_VERIFICATIONS,
    interviewQuestions: [],
    codingSubmissions: [MOCK_CODING_SUBMISSION],
  });

  const report = generateHiringRecommendation({
    applicationId: 'app-alex-lead-fullstack',
    candidateId: MOCK_CANDIDATE.id,
    candidateName: 'Alex Mercer',
    job: MOCK_JOBS[0],
    competencyProfile: profile,
    verificationRecords: MOCK_VERIFICATIONS,
    interviewSession: MOCK_INTERVIEW_SESSION,
    codingSubmission: MOCK_CODING_SUBMISSION,
  });

  // Human Recruiter Decision Form State
  const [decision, setDecision] = useState<RecruiterDecision>('advance_to_offer');
  const [rationale, setRationale] = useState(
    'Candidate demonstrated exemplary distributed caching and React concurrency expertise. Passed 100% of isolated coding tests and confirmed 2 independent Tier 4 credentials.'
  );
  const [isOverride, setIsOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recordedResult, setRecordedResult] = useState<any | null>(null);

  const handleSubmitDecision = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/hiring/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: report.applicationId,
          candidateId: report.candidateId,
          decision,
          rationale,
          recruiterId: 'recruiter-sarah-chen',
          recruiterName: 'Sarah Chen (Lead Talent Partner)',
          isOverride,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecordedResult(data.data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Evidence-Based Recruiter Hiring Report
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Candidate Intelligence Dossier: {report.candidateName}</h1>
          <p className="text-xs text-slate-400">Position: {report.jobTitle}</p>
        </div>
        <div>
          <span className="rounded-full bg-emerald-950 px-3.5 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-800">
            AI Assessment: {report.recommendationStatus.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Executive Summary</h3>
        <p className="text-sm text-slate-200 leading-relaxed">{report.summaryExecutive}</p>
      </div>

      {/* Evidence Matrix */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Traceable Evidence Matrix (Tier 1 - 5)
        </h3>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Dimension</th>
                <th className="px-4 py-3">Demonstrated Evidence</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {report.evidenceMatrix.map((item, i) => (
                <tr key={i} className="hover:bg-slate-800/20">
                  <td className="px-4 py-3 font-semibold text-white">{item.dimension}</td>
                  <td className="px-4 py-3 text-slate-300">{item.verifiedEvidence}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">{item.demonstratedScore}%</td>
                  <td className="px-4 py-3 font-mono text-cyan-400">{item.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Human Hiring Decision Recording Console */}
      <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/30 via-slate-900/80 to-slate-950 p-6 space-y-5">
        <div className="flex items-center gap-2 text-indigo-400">
          <Award className="h-5 w-5" />
          <h3 className="text-base font-bold text-white">Human Hiring Decision Recording</h3>
        </div>
        <p className="text-xs text-slate-300">
          AI provides decision-support intelligence. The hiring decision is made and owned by an accountable human recruiter and committed to an immutable audit trail.
        </p>

        {recordedResult ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Decision Recorded: {recordedResult.decision.toUpperCase()}
            </div>
            <p className="text-xs text-slate-300">
              Logged by: <strong>{recordedResult.decidedBy.name}</strong> at {new Date(recordedResult.timestamp).toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 italic">
              Rationale: "{recordedResult.rationale}"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Recruiter Decision Action
              </label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as RecruiterDecision)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="advance_to_offer">Advance to Offer</option>
                <option value="schedule_panel">Schedule Architecture Panel Interview</option>
                <option value="request_more_evidence">Request Additional Credential Proof</option>
                <option value="redirect_to_alternative_role">Redirect to Alternative Role Match</option>
                <option value="reject">Reject Application</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Accountability Rationale (Mandatory for Audit Trail)
              </label>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                placeholder="State the objective reasons and evidence basis for this decision..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="override"
                checked={isOverride}
                onChange={(e) => setIsOverride(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <label htmlFor="override" className="text-xs text-slate-300">
                Mark as explicit override of AI recommendation (Logged with compliance reason)
              </label>
            </div>

            <button
              onClick={handleSubmitDecision}
              disabled={submitting || !rationale.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Recording to Audit Trail...' : 'Commit Human Hiring Decision'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
