# TalentAI API Endpoint Reference

All endpoints are built using Next.js 15 Route Handlers (`src/app/api/`) and adhere to RESTful conventions, cryptographic authentication, and Zod schema validation.

---

## 1. Authentication & Common Error Codes

Endpoints protected by `authorizeRequest` require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <Firebase_ID_Token>
```

| HTTP Status | Meaning | Reason |
| :--- | :--- | :--- |
| **200 OK** | Success | Request fulfilled successfully. |
| **201 Created** | Created | New resource created (Job, Application). |
| **400 Bad Request** | Validation Failure | Zod payload validation failed or missing required fields. |
| **401 Unauthorized** | Missing/Invalid Token | Bearer token missing, expired, or revoked. |
| **403 Forbidden** | Role/Org Mismatch | Caller does not possess required role or target organization differs from token. |
| **404 Not Found** | Resource Missing | Job, Candidate, or Application not found in Firestore. |
| **429 Too Many Requests** | Rate Limit | Sliding window execution rate limit exceeded (10 runs/min). |
| **503 Service Unavailable** | Provider Offline | Gemini unconfigured or isolated container worker unreachable. |

---

## 2. API Endpoints

### 2.1 `/api/applications`
- **GET**: Lists job applications.
  - *Candidate*: Returns only applications owned by `session.uid`.
  - *Recruiter*: Returns only applications for jobs matching `session.orgId`.
  - *Admin*: Returns all applications with optional query filters (`candidateId`, `orgId`, `jobId`).
- **POST**: Submits a new job application.
  - *Auth*: Required role `candidate`. `candidateId` is strictly derived from session UID.
  - *Body*: `{ jobId: string, resumeId: string, candidateName?: string, candidateEmail?: string }`
- **PATCH**: Updates an application stage (`status`).
  - *Auth*: Required role `recruiter` or `admin`. Organization boundary verified.
  - *Body*: `{ id: string, status: ApplicationStatus }`

### 2.2 `/api/jobs`
- **GET**: Lists job requisitions.
  - *Public / Candidate*: Only returns `status === 'published'`. Draft jobs are hidden.
  - *Recruiter*: Returns published jobs plus their organization's internal/draft requisitions.
  - *Admin*: Returns all jobs.
- **POST**: Creates a new job requisition.
  - *Auth*: Required role `recruiter` or `admin`. Recruiter `orgId` is enforced.
  - *Body*: `{ title, specialization, seniority, status, description, mandatoryCompetencies, preferredCompetencies, location }`

### 2.3 `/api/candidate/profile`
- **GET**: Retrieves candidate profile. Candidate can only read their own profile; Recruiters can read candidate dossiers in their pipeline.
- **POST**: Updates candidate profile. Only candidate can update their own profile; verified credentials cannot be modified directly.

### 2.4 `/api/hiring/decide`
- **POST**: Records a human recruiter hiring decision.
  - *Auth*: Required role `recruiter` or `admin`. Organization boundary enforced.
  - *Body*: `{ applicationId, candidateId, decision, rationale, isOverride }`
  - *Behavior*: Transactional status update, decision persistence, and immutable audit log entry in `auditLogs`.

### 2.5 `/api/sandbox/execute`
- **POST**: Executes code assessments in isolated sandbox against authoritative test suites.
  - *Auth*: Required role `candidate`, `recruiter`, or `admin`.
  - *Rate Limit*: 10 executions per minute per UID (sliding window).
  - *Candidate Body*: `{ code: string, language: 'javascript' | 'typescript' | 'python', assessmentId: string }`
  - *Zero-Trust Enforcement (DEF-013)*: Candidates cannot supply arbitrary test cases. The server loads authoritative evaluation suites from Firestore via `AssessmentRepository.getPrivateTestCases(assessmentId)`.
  - *Sanitization*: Hidden test case inputs, expected outputs, and actual outputs are masked (`[HIDDEN_EVALUATION_*]`) to prevent answer extraction.
  - *Recruiter/Admin*: Can optionally pass `customTestCases` for exploratory test-suite authoring.
  - *Persistence*: Automatically records submission telemetry in `codingSubmissions`.

### 2.6 `/api/resume/parse`
- **POST**: Extracts 5-tier evidence structure from raw resume document text using Gemini.
  - *Auth*: Required role `candidate`, `recruiter`, or `admin`.
  - *Truthfulness*: Returns `503 AI_UNAVAILABLE` when `GEMINI_API_KEY` is missing; never returns fake profiles.

### 2.7 `/api/interview/evaluate`
- **POST**: Evaluates candidate architectural interview response against rubric criteria using Gemini.
  - *Auth*: Required role `candidate`, `recruiter`, or `admin`.
  - *Truthfulness*: Returns `503 AI_UNAVAILABLE` when Gemini is offline; never computes word-count scores.

### 2.8 `/api/matching/recommend`
- **POST**: Computes multidimensional competency profile and 16-role compatibility scores.
  - *Auth*: Required role `candidate`, `recruiter`, or `admin`.
  - *Ownership*: Candidates can only request recommendations for their own profile.
  - *Body*: `{ candidateId?: string }`
  - *Server-Side Evidence Authority (DEF-014)*: Does not accept client-asserted scores or fabricated claims. Independently queries authoritative Firestore records (`verifications`, `interviewQuestions`, `codingSubmissions`, `resumes`) before computing competency profile and role rankings. Automatically persists audit record to `roleRecommendations`.

### 2.9 `/api/admin/gemini/test`
- **POST**: Diagnostic probe checking Gemini API key validity, latency, model tiers, and JSON generation.
  - *Auth*: Required role `admin`.

### 2.10 `/api/admin/audit`
- **GET**: Returns recent tamper-evident security audit logs.
  - *Auth*: Required role `admin`.
