# TalentAI Firestore Database Schema Specification

## 1. Overview & Architecture

TalentAI leverages Google Cloud Firestore in Datastore/Native Mode. All documents follow typed TypeScript schemas defined in `src/types/`. Mutations are executed via `src/lib/repositories/` with transaction support for atomic multi-document updates.

---

## 2. Primary Collections Specification

### 2.1 `users`
Represents core identity and authentication profiles linked to Firebase Auth UIDs.
```typescript
interface User {
  id: string;              // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'candidate' | 'recruiter' | 'admin';
  status: 'active' | 'deactivated' | 'suspended';
  orgId?: string;          // Authoritative organization ID for recruiters
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
  lastLoginAt: string;     // ISO 8601
}
```

### 2.2 `candidateProfiles`
Contains self-curated candidate information and external profile links.
```typescript
interface CandidateProfile {
  id: string;              // User ID
  userId: string;
  headline: string;
  summary: string;
  yearsOfExperience: number;
  location: {
    city: string;
    state?: string;
    country: string;
    remotePreference: 'remote_only' | 'hybrid' | 'onsite' | 'flexible';
  };
  githubUsername?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  overallVerificationScore: number; // 0 - 100
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 `jobOpenings`
Stores published and draft job requisitions with required competency rubrics.
```typescript
interface JobOpening {
  id: string;
  orgId: string;
  title: string;
  specialization: EngineeringRole;
  seniority: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'staff';
  status: 'draft' | 'published' | 'paused' | 'closed';
  description: string;
  responsibilities: string[];
  mandatoryCompetencies: CompetencyRequirement[];
  preferredCompetencies: CompetencyRequirement[];
  salaryRange?: { min: number; max: number; currency: string };
  location: { type: 'remote' | 'hybrid' | 'onsite'; locationString: string };
  assessmentRubricId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.4 `jobApplications`
Connects a candidate to a specific job requisition and tracks recruitment lifecycle stages.
```typescript
interface JobApplication {
  id: string;              // app-${candidateId}-${jobId}
  jobId: string;
  jobTitle?: string;
  orgId: string;           // Partition key for recruiter isolation
  candidateId: string;
  candidateName?: string;
  candidateEmail?: string;
  resumeId: string;
  status: 'applied' | 'screening' | 'interviewing' | 'assessing' | 'review' | 'offered' | 'rejected';
  interviewId?: string;
  codingAssessmentId?: string;
  compositeScore?: number;
  hiringRecommendationId?: string;
  appliedAt: string;
  updatedAt: string;
}
```

### 2.5 `hiringDecisions`
Contains authoritative human recruiter hiring decisions and override records.
```typescript
interface HiringDecisionRecord {
  id: string;              // dec-${applicationId}-${timestamp}
  applicationId: string;
  candidateId: string;
  decision: 'advance_to_offer' | 'schedule_panel' | 'request_more_evidence' | 'redirect_to_alternative_role' | 'reject';
  rationale: string;       // Mandatory audit rationale
  decidedBy: {
    id: string;
    role: string;
    orgId?: string;
  };
  isOverride: boolean;
  timestamp: string;
}
```

### 2.6 `auditLogs`
Immutable tamper-evident security audit trail. Read-only for admins, client writes blocked.
```typescript
interface AuditLogEntry {
  id: string;              // aud-${timestamp}-${random}
  actor: string;
  actorId: string;
  role: string;
  action: string;          // e.g. "RECORD_HIRING_DECISION", "OVERRIDE_AND_RECORD_DECISION"
  target: string;          // Resource affected
  details: string;         // Decision notes and parameters
  timestamp: string;
}
```

### 2.7 `codingAssessments` & Subcollection `privateTestCases`
Authoritative coding problem definitions with isolated hidden evaluation suites.
```typescript
interface CodingAssessment {
  id: string;              // code-${id}
  applicationId: string;
  candidateId: string;
  jobId: string;
  title: string;
  problemStatement: string;
  language: 'python' | 'typescript' | 'javascript';
  starterCode: string;
  testCases: TestCase[];   // Sample/visible cases
  timeLimitSeconds: number;
  memoryLimitMb: number;
  status: 'assigned' | 'in_progress' | 'submitted' | 'evaluated';
}

// Subcollection: codingAssessments/{id}/privateTestCases/{caseId}
// Write/Read restricted strictly to Admin SDK (DEF-013)
interface PrivateTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: true;
}
```

### 2.8 `codingSubmissions`
Candidate execution history and automated sandbox performance telemetry.
```typescript
interface CodingSubmission {
  id: string;              // sub-${candidateId}-${timestamp}
  assessmentId: string;
  candidateId: string;
  submittedCode: string;
  language: string;
  passedTests: number;
  totalTests: number;
  score: number;           // 0 - 100
  executionStatus: 'passed' | 'failed' | 'timeout' | 'runtime_error';
  results: TestExecutionResult[];
  submittedAt: string;
}
```

---

## 3. Indexes & Query Patterns
Configured in `firestore.indexes.json`:
- `jobOpenings`: Compound index on `(orgId ASC, status ASC, updatedAt DESC)`
- `jobApplications`: Compound index on `(orgId ASC, status ASC, appliedAt DESC)`
- `auditLogs`: Single field index on `timestamp DESC`
