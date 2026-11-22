export type InterviewDifficulty = 'basic' | 'intermediate' | 'advanced';
export type InterviewStatus = 'scheduled' | 'in_progress' | 'completed' | 'expired';

export interface QuestionEvaluation {
  technicalAccuracyScore: number; // 0 - 100
  conceptualDepthScore: number;    // 0 - 100
  problemSolvingScore: number;     // 0 - 100
  tradeOffAwarenessScore: number;  // 0 - 100
  compositeScore: number;          // 0 - 100
  strengths: string[];
  missingConcepts: string[];
  feedbackNotes: string;
  confidence: number;              // 0 - 1
}

export interface InterviewQuestion {
  id: string;
  interviewId: string;
  questionIndex: number;
  topic: string;
  difficulty: InterviewDifficulty;
  questionText: string;
  contextOrScenario?: string;
  candidateResponse?: string;
  evaluation?: QuestionEvaluation;
  createdAt: string;
  answeredAt?: string;
}

export interface InterviewSession {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  status: InterviewStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  overallScore?: number;
  strengthsSummary?: string[];
  improvementAreas?: string[];
  rubricFocus: string[];
  startedAt: string;
  completedAt?: string;
}
