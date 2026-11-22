import { CandidateProfile, RecruiterProfile, Organization } from '@/types/user';
import { JobOpening } from '@/types/job';
import { JobApplication } from '@/types/application';
import { ResumeDocument } from '@/types/resume';
import { VerificationRecord } from '@/types/verification';
import { InterviewSession } from '@/types/interview';
import { CodingAssessment, CodingSubmission } from '@/types/coding';
import { CompetencyProfile } from '@/types/competency';
import { RoleRecommendation } from '@/types/role';
import { HiringRecommendationReport } from '@/types/hiring';

export const MOCK_ORGANIZATION: Organization = {
  id: 'org-google-deepmind',
  name: 'Nexus Cloud Technologies',
  domain: 'nexuscloud.io',
  tier: 'enterprise',
  settings: {
    requireIdentityVerification: true,
    allowVoiceInterview: false,
  },
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

export const MOCK_RECRUITER: RecruiterProfile = {
  id: 'recruiter-sarah-chen',
  userId: 'user-recruiter-1',
  orgId: MOCK_ORGANIZATION.id,
  title: 'Lead Technical Talent Partner',
  department: 'Core Infrastructure & AI Engineering',
  permissions: ['view_pipeline', 'edit_jobs', 'record_decisions', 'override_evaluations'],
  createdAt: '2026-02-01T00:00:00Z',
};

export const MOCK_CANDIDATE: CandidateProfile = {
  id: 'cand-alex-mercer',
  userId: 'user-candidate-1',
  headline: 'Senior Full-Stack & Systems Engineer | Distributed Systems & TypeScript',
  summary:
    '7+ years architecting high-throughput distributed APIs, micro-frontends, and real-time streaming engines. Contributor to open-source developer tooling with deep expertise in TypeScript, Go, and cloud-native databases.',
  yearsOfExperience: 7,
  location: {
    city: 'San Francisco',
    state: 'CA',
    country: 'United States',
    remotePreference: 'flexible',
  },
  githubUsername: 'alexmercer-dev',
  linkedinUrl: 'https://linkedin.com/in/alexmercer-dev',
  portfolioUrl: 'https://alexmercer.engineering',
  overallVerificationScore: 88,
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-11-20T14:30:00Z',
};

export const MOCK_JOBS: JobOpening[] = [
  {
    id: 'job-lead-fullstack',
    orgId: MOCK_ORGANIZATION.id,
    title: 'Lead Full-Stack Engineer',
    specialization: 'Full-Stack Engineer',
    seniority: 'senior',
    status: 'published',
    description:
      'We are looking for a Lead Full-Stack Engineer to scale our distributed cloud dashboard and high-concurrency event telemetry pipeline.',
    responsibilities: [
      'Architect resilient Next.js micro-frontends and Node.js microservices',
      'Optimize database queries and distributed Redis caching layer',
      'Mentor senior engineers and enforce code quality standards',
      'Lead incident response for critical production traffic outages',
    ],
    mandatoryCompetencies: [
      { skillId: 'react', name: 'React', category: 'frameworks', minLevel: 4, weight: 10 },
      { skillId: 'typescript', name: 'TypeScript', category: 'languages', minLevel: 4, weight: 9 },
      { skillId: 'nodejs', name: 'Node.js', category: 'frameworks', minLevel: 4, weight: 9 },
      { skillId: 'databases', name: 'PostgreSQL / Firestore', category: 'databases', minLevel: 3, weight: 8 },
    ],
    preferredCompetencies: [
      { skillId: 'docker', name: 'Docker / Containers', category: 'cloud', minLevel: 3, weight: 6 },
      { skillId: 'testing', name: 'Automated Testing / Vitest', category: 'testing', minLevel: 4, weight: 7 },
    ],
    salaryRange: { min: 185000, max: 235000, currency: 'USD' },
    location: { type: 'remote', locationString: 'Remote (US/Canada)' },
    publishedAt: '2026-11-01T08:00:00Z',
    createdAt: '2026-10-25T12:00:00Z',
    updatedAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 'job-staff-ai-eng',
    orgId: MOCK_ORGANIZATION.id,
    title: 'Staff AI Systems Engineer',
    specialization: 'AI Engineer',
    seniority: 'staff',
    status: 'published',
    description:
      'Lead the development of production agentic workflows, multi-modal LLM reasoning pipelines, and structured generation engines.',
    responsibilities: [
      'Deploy production LLM orchestration with structured output guarantees',
      'Benchmark and optimize inference latency, token usage, and accuracy',
      'Design security defenses against adversarial prompt injection',
    ],
    mandatoryCompetencies: [
      { skillId: 'python', name: 'Python', category: 'languages', minLevel: 5, weight: 10 },
      { skillId: 'llms', name: 'Large Language Models (Gemini)', category: 'ml', minLevel: 5, weight: 10 },
      { skillId: 'rag', name: 'Vector DBs & RAG Architecture', category: 'ml', minLevel: 4, weight: 9 },
    ],
    preferredCompetencies: [
      { skillId: 'mlops', name: 'MLOps & Inference Serving', category: 'ml', minLevel: 4, weight: 8 },
    ],
    salaryRange: { min: 220000, max: 280000, currency: 'USD' },
    location: { type: 'hybrid', locationString: 'San Francisco, CA' },
    publishedAt: '2026-11-05T09:00:00Z',
    createdAt: '2026-10-30T10:00:00Z',
    updatedAt: '2026-11-05T09:00:00Z',
  },
];

export const MOCK_VERIFICATIONS: VerificationRecord[] = [
  {
    id: 'ver-edu-stanford',
    candidateId: MOCK_CANDIDATE.id,
    claimType: 'education',
    claimTitle: 'B.S. in Computer Science (Stanford University)',
    claimDetails: 'Graduated June 2019, Specialization in Systems & Architecture',
    status: 'verified',
    verificationSource: 'National Student Clearinghouse (Direct API)',
    confidence: 100,
    reviewedBy: 'system-automated-registrar',
    verifiedAt: '2026-11-02T11:20:00Z',
    createdAt: '2026-11-02T10:15:00Z',
    updatedAt: '2026-11-02T11:20:00Z',
  },
  {
    id: 'ver-emp-stripe',
    candidateId: MOCK_CANDIDATE.id,
    claimType: 'employment',
    claimTitle: 'Senior Software Engineer at Stripe (2021 - 2024)',
    claimDetails: 'Led developer experience tools and webhook delivery reliability',
    status: 'verified',
    verificationSource: 'The Work Number / Corporate HR Verification',
    confidence: 96,
    reviewedBy: 'auditor-elena-vance',
    verifiedAt: '2026-11-03T16:45:00Z',
    createdAt: '2026-11-02T10:15:00Z',
    updatedAt: '2026-11-03T16:45:00Z',
  },
  {
    id: 'ver-gh-opensource',
    candidateId: MOCK_CANDIDATE.id,
    claimType: 'github',
    claimTitle: 'Author of "turbo-cache-kv" (2.4k GitHub Stars)',
    claimDetails: 'High-performance in-memory caching engine in TypeScript/Go',
    status: 'verified',
    verificationSource: 'GitHub OAuth & Commit Cryptographic Signature',
    confidence: 100,
    reviewedBy: 'system-github-adapter',
    verifiedAt: '2026-11-04T09:30:00Z',
    createdAt: '2026-11-04T09:25:00Z',
    updatedAt: '2026-11-04T09:30:00Z',
  },
  {
    id: 'ver-cert-aws',
    candidateId: MOCK_CANDIDATE.id,
    claimType: 'certification',
    claimTitle: 'AWS Certified Solutions Architect - Professional',
    claimDetails: 'Credential ID: AWS-SAP-789421',
    status: 'requires_manual_review',
    verificationSource: 'Credly Digital Badge API (Token validation pending)',
    confidence: 65,
    reviewedBy: 'system',
    auditNotes: 'Badge URL returned 403 Rate Limit; scheduled for human compliance audit',
    createdAt: '2026-11-05T14:10:00Z',
    updatedAt: '2026-11-05T14:10:00Z',
  },
];

export const MOCK_INTERVIEW_QUESTIONS = [
  {
    id: 'q-1',
    interviewId: 'int-session-101',
    questionIndex: 1,
    topic: 'Distributed Caching & Invalidation',
    difficulty: 'advanced' as const,
    questionText:
      'In a high-throughput microservices architecture with 50,000 requests/sec, how do you handle cache invalidation and prevent thundering herd problems when a hot key expires?',
    contextOrScenario: 'Global eCommerce flash-sale pricing system',
    candidateResponse:
      'I mitigate thundering herd using a probabilistic early expiration algorithm (XFetch) or mutex locks using Redis SETNX with exponential jitter. For invalidation, we emit event-driven messages via Kafka to worker pools, combined with a short cache lease time.',
    evaluation: {
      technicalAccuracyScore: 94,
      conceptualDepthScore: 92,
      problemSolvingScore: 95,
      tradeOffAwarenessScore: 90,
      compositeScore: 93,
      strengths: [
        'Correctly identified probabilistic early expiration (XFetch)',
        'Demonstrated deep understanding of distributed Redis mutexes and jitter',
      ],
      missingConcepts: ['Did not discuss multi-region replication lag implications'],
      feedbackNotes: 'Exemplary real-world systems architecture response.',
      confidence: 0.95,
    },
    createdAt: '2026-11-10T14:00:00Z',
    answeredAt: '2026-11-10T14:05:00Z',
  },
  {
    id: 'q-2',
    interviewId: 'int-session-101',
    questionIndex: 2,
    topic: 'React Concurrency & State Mechanics',
    difficulty: 'intermediate' as const,
    questionText:
      'Explain how React 19 Concurrent Mode handles state transitions, server actions, and how optimistic UI updates are rolled back upon server failure.',
    candidateResponse:
      'React uses useTransition to mark non-urgent updates, keeping the UI interactive. With useOptimistic, temporary state is shown immediately; if the Server Action rejects, React discards the optimistic commit and re-renders the previous stable fiber tree.',
    evaluation: {
      technicalAccuracyScore: 96,
      conceptualDepthScore: 94,
      problemSolvingScore: 90,
      tradeOffAwarenessScore: 92,
      compositeScore: 93,
      strengths: ['Accurate explanation of fiber tree rollback and useOptimistic hook'],
      missingConcepts: [],
      feedbackNotes: 'Clear, modern React architecture knowledge.',
      confidence: 0.98,
    },
    createdAt: '2026-11-10T14:06:00Z',
    answeredAt: '2026-11-10T14:11:00Z',
  },
];

export const MOCK_INTERVIEW_SESSION: InterviewSession = {
  id: 'int-session-101',
  applicationId: 'app-alex-lead-fullstack',
  candidateId: MOCK_CANDIDATE.id,
  jobId: MOCK_JOBS[0].id,
  status: 'completed',
  currentQuestionIndex: 2,
  totalQuestions: 2,
  overallScore: 93,
  strengthsSummary: [
    'Deep mastery of distributed concurrency, Redis locking, and event-driven architecture',
    'Exemplary frontend mechanics and React 19 concurrent state internals',
  ],
  improvementAreas: ['Cross-region replication consistency trade-offs'],
  rubricFocus: ['Distributed Systems', 'API Performance', 'Modern Frontend'],
  startedAt: '2026-11-10T14:00:00Z',
  completedAt: '2026-11-10T14:15:00Z',
};

export const MOCK_CODING_ASSESSMENT: CodingAssessment = {
  id: 'code-ass-101',
  applicationId: 'app-alex-lead-fullstack',
  candidateId: MOCK_CANDIDATE.id,
  jobId: MOCK_JOBS[0].id,
  title: 'LRU Cache with TTL & Eviction Metrics',
  problemStatement: `Implement a high-performance Least Recently Used (LRU) Cache supporting:
1. \`get(key)\`: Retrieve the value in O(1) time if not expired.
2. \`put(key, value, ttlMs)\`: Insert or update the key with a time-to-live in O(1) time.
3. Automatically evict the least recently accessed item when capacity is exceeded.
Return the count of expired items evicted during operations.`,
  language: 'typescript',
  starterCode: `function solution(operations) {
  // operations is an array of [action, key, value, ttl]
  // Return array of outputs
  return [];
}`,
  testCases: [
    { id: 'tc-1', input: '["test_basic_ops"]', expectedOutput: '["ok", 42]', isHidden: false },
    { id: 'tc-2', input: '["test_capacity_eviction"]', expectedOutput: '["evicted_lru"]', isHidden: false },
    { id: 'tc-3', input: '["test_concurrent_ttl_expiration"]', expectedOutput: '["expired"]', isHidden: true },
  ],
  timeLimitSeconds: 1800,
  memoryLimitMb: 128,
  status: 'evaluated',
  assignedAt: '2026-11-10T15:00:00Z',
  submittedAt: '2026-11-10T15:28:00Z',
};

export const MOCK_CODING_SUBMISSION: CodingSubmission = {
  id: 'sub-alex-101',
  assessmentId: MOCK_CODING_ASSESSMENT.id,
  candidateId: MOCK_CANDIDATE.id,
  submittedCode: `function solution(operations) {
  // Doubly-linked list + Map implementation of LRU with TTL
  return ["ok", 42];
}`,
  language: 'typescript',
  passedTests: 3,
  totalTests: 3,
  score: 100,
  executionStatus: 'passed',
  results: [
    { testCaseId: 'tc-1', passed: true, input: '["test_basic_ops"]', expectedOutput: '["ok", 42]', actualOutput: '["ok", 42]', executionTimeMs: 12, memoryUsageKb: 1420 },
    { testCaseId: 'tc-2', passed: true, input: '["test_capacity_eviction"]', expectedOutput: '["evicted_lru"]', actualOutput: '["evicted_lru"]', executionTimeMs: 14, memoryUsageKb: 1440 },
    { testCaseId: 'tc-3', passed: true, input: '["test_concurrent_ttl_expiration"]', expectedOutput: '["expired"]', actualOutput: '["expired"]', executionTimeMs: 15, memoryUsageKb: 1460 },
  ],
  qualityMetrics: {
    readabilityScore: 95,
    maintainabilityScore: 92,
    timeComplexity: 'O(1) for both get and put',
    spaceComplexity: 'O(N) where N is capacity',
    edgeCaseHandling: 'Properly guards against zero/negative TTL and null keys.',
    suggestions: ['Consider adding a background sweeper for inactive expired entries.'],
  },
  submittedAt: '2026-11-10T15:28:00Z',
};

export const MOCK_APPLICATIONS: JobApplication[] = [
  {
    id: 'app-alex-lead-fullstack',
    jobId: MOCK_JOBS[0].id,
    jobTitle: MOCK_JOBS[0].title,
    orgId: MOCK_ORGANIZATION.id,
    candidateId: MOCK_CANDIDATE.id,
    candidateName: 'Alex Mercer',
    candidateEmail: 'alex.mercer@gmail.com',
    resumeId: 'res-alex-101',
    status: 'review',
    interviewId: MOCK_INTERVIEW_SESSION.id,
    codingAssessmentId: MOCK_CODING_ASSESSMENT.id,
    compositeScore: 94,
    hiringRecommendationId: 'rec-app-alex-lead-fullstack',
    appliedAt: '2026-11-08T10:00:00Z',
    updatedAt: '2026-11-10T16:00:00Z',
  },
  {
    id: 'app-marcus-ai',
    jobId: MOCK_JOBS[1].id,
    jobTitle: MOCK_JOBS[1].title,
    orgId: MOCK_ORGANIZATION.id,
    candidateId: 'cand-marcus-vance',
    candidateName: 'Marcus Vance',
    candidateEmail: 'marcus.v@protonmail.com',
    resumeId: 'res-marcus-201',
    status: 'screening',
    compositeScore: 78,
    appliedAt: '2026-11-12T14:20:00Z',
    updatedAt: '2026-11-14T09:10:00Z',
  },
  {
    id: 'app-priya-frontend',
    jobId: MOCK_JOBS[0].id,
    jobTitle: MOCK_JOBS[0].title,
    orgId: MOCK_ORGANIZATION.id,
    candidateId: 'cand-priya-sharma',
    candidateName: 'Priya Sharma',
    candidateEmail: 'priya.sharma@outlook.com',
    resumeId: 'res-priya-301',
    status: 'interviewing',
    compositeScore: 86,
    appliedAt: '2026-11-15T11:00:00Z',
    updatedAt: '2026-11-16T15:30:00Z',
  },
];
