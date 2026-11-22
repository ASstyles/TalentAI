export type SupportedLanguage = 'python' | 'typescript' | 'javascript' | 'java' | 'cpp';
export type AssessmentStatus = 'assigned' | 'in_progress' | 'submitted' | 'evaluated';
export type ExecutionStatus = 'passed' | 'failed' | 'timeout' | 'runtime_error' | 'compilation_error';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  description?: string;
}

export interface TestExecutionResult {
  testCaseId: string;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  errorMessage?: string;
  executionTimeMs: number;
  memoryUsageKb: number;
}

export interface CodingAssessment {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  title: string;
  problemStatement: string;
  language: SupportedLanguage;
  starterCode: string;
  testCases: TestCase[];
  timeLimitSeconds: number;
  memoryLimitMb: number;
  status: AssessmentStatus;
  assignedAt: string;
  submittedAt?: string;
}

export interface CodingSubmission {
  id: string;
  assessmentId: string;
  candidateId: string;
  submittedCode: string;
  language: SupportedLanguage;
  passedTests: number;
  totalTests: number;
  score: number; // 0 - 100
  executionStatus: ExecutionStatus;
  results: TestExecutionResult[];
  qualityMetrics?: {
    readabilityScore: number; // 0 - 100
    maintainabilityScore: number; // 0 - 100
    timeComplexity: string; // e.g. "O(N log N)"
    spaceComplexity: string; // e.g. "O(N)"
    edgeCaseHandling: string;
    suggestions: string[];
  };
  submittedAt: string;
}
