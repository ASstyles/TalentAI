'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MOCK_INTERVIEW_QUESTIONS } from '@/lib/data/mock-data';
import { Cpu, Send, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { QuestionEvaluation } from '@/types/interview';

export default function AdaptiveInterviewPage() {
  const router = useRouter();
  const { idToken } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [candidateAnswer, setCandidateAnswer] = useState(
    'I use a distributed mutex lock in Redis with a short lease time and exponential backoff retry. For invalidation, we emit event messages via Kafka.'
  );
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [latestEvaluation, setLatestEvaluation] = useState<QuestionEvaluation | null>(
    MOCK_INTERVIEW_QUESTIONS[0].evaluation
  );
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);

  const activeQuestion = MOCK_INTERVIEW_QUESTIONS[currentIdx] || MOCK_INTERVIEW_QUESTIONS[0];

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          questionText: activeQuestion.questionText,
          rubricCriteria: ['Technical accuracy', 'Conceptual depth', 'Problem solving', 'Trade-off awareness'],
          candidateResponse: candidateAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          throw new Error('Gemini AI is currently not configured or unavailable. Test responses are verified against baseline rubrics.');
        }
        throw new Error(data.error || 'Evaluation failed');
      }
      setLatestEvaluation(data.data);
      if (data.data.suggestedFollowUpQuestion) {
        setFollowUpQuestion(data.data.suggestedFollowUpQuestion);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < MOCK_INTERVIEW_QUESTIONS.length) {
      setCurrentIdx((prev) => prev + 1);
      setCandidateAnswer('');
      setLatestEvaluation(null);
      setFollowUpQuestion(null);
      setError(null);
    } else {
      setCompleted(true);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <Link
            href="/candidate/dashboard"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> Candidate Workspace
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Adaptive AI Technical Interview
          </span>
          <h1 className="text-xl font-bold text-white mt-1">Lead Full-Stack Engineer Interview Session</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-mono text-slate-300 border border-slate-800">
            Question {currentIdx + 1} of {MOCK_INTERVIEW_QUESTIONS.length}
          </span>
          <span className="rounded-full bg-indigo-950 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-800">
            Difficulty: {activeQuestion.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      {completed ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Interview Session Complete</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            You have responded to all adaptive technical interview questions. Your responses and AI rubric
            evaluations have been compiled into your hiring dossier.
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push('/candidate/dashboard')}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
            >
              Return to Candidate Workspace
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Active Question Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Cpu className="h-4 w-4 text-blue-400" />
              <span>Topic: {activeQuestion.topic}</span>
            </div>
            <h2 className="text-base font-medium text-slate-100 sm:text-lg">
              {activeQuestion.questionText}
            </h2>
            {activeQuestion.contextOrScenario && (
              <p className="text-xs text-slate-400 italic">
                Scenario Context: {activeQuestion.contextOrScenario}
              </p>
            )}
          </div>

          {/* Response Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <label className="block text-xs font-semibold uppercase text-slate-400">
              Your Architectural & Technical Response
            </label>
            <textarea
              value={candidateAnswer}
              onChange={(e) => setCandidateAnswer(e.target.value)}
              rows={6}
              placeholder="Formulate your detailed response explaining your reasoning, algorithmic approach, and operational trade-offs..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {candidateAnswer.split(/\s+/).filter(Boolean).length} words
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleEvaluate}
                  disabled={evaluating || !candidateAnswer.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
                >
                  <Send className="h-3.5 w-3.5" />
                  {evaluating ? 'Evaluating with Gemini...' : 'Submit Response for Evaluation'}
                </button>
                {latestEvaluation && (
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                  >
                    Next Question <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Rubric Evaluation Feedback */}
          {latestEvaluation && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Gemini Rubric Evaluation Feedback
                </h3>
                <span className="rounded-full bg-emerald-900/50 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-700/50">
                  Composite Score: {latestEvaluation.compositeScore} / 100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-400">Technical Accuracy</span>
                  <div className="text-lg font-bold text-white">{latestEvaluation.technicalAccuracyScore}%</div>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-400">Conceptual Depth</span>
                  <div className="text-lg font-bold text-white">{latestEvaluation.conceptualDepthScore}%</div>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-400">Problem Solving</span>
                  <div className="text-lg font-bold text-white">{latestEvaluation.problemSolvingScore}%</div>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-400">Trade-Off Awareness</span>
                  <div className="text-lg font-bold text-white">{latestEvaluation.tradeOffAwarenessScore}%</div>
                </div>
              </div>

              <div className="text-xs text-slate-300">
                <strong>Evaluator Notes:</strong> {latestEvaluation.feedbackNotes}
              </div>

              {latestEvaluation.strengths && latestEvaluation.strengths.length > 0 && (
                <div className="text-xs text-emerald-300">
                  <strong>Strengths Identified:</strong> {latestEvaluation.strengths.join(', ')}
                </div>
              )}

              {latestEvaluation.missingConcepts && latestEvaluation.missingConcepts.length > 0 && (
                <div className="text-xs text-amber-300">
                  <strong>Growth Areas:</strong> {latestEvaluation.missingConcepts.join(', ')}
                </div>
              )}

              {followUpQuestion && (
                <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 p-4 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Adaptive Follow-Up Question</span>
                  <p className="mt-1 text-xs text-indigo-200 font-medium">{followUpQuestion}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
