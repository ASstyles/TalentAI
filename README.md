# TalentAI
## Enterprise AI-Powered Engineer Recruitment & Job Role Recommendation Platform

**TalentAI** is an enterprise-grade recruitment intelligence platform built on Next.js 15, Google Cloud Firestore, Firebase Authentication, and Google Gemini developer models. It systematically separates **what candidates claim** from **what can be independently verified**, **what they can demonstrate in code and interviews**, and **which engineering roles genuinely match**.

---

## Key Architectural Foundations

### 1. 5-Tier Evidence Hierarchy
- **Tier 1 (Candidate-Claimed)**: Self-reported skills on profile/resume ($\times 0.10$ weight).
- **Tier 2 (Resume-Extracted)**: Extracted via Gemini NLP within chronological experience ($\times 0.20$ weight).
- **Tier 3 (Project-Supported)**: Supported by architecture diagrams, codebases, and GitHub repositories ($\times 0.40$ weight).
- **Tier 4 (Independently Verified)**: Validated via official credential providers and registrar APIs ($\times 0.70$ weight).
- **Tier 5 (Assessment-Demonstrated)**: Proven via adaptive technical interviews and deterministic coding sandboxes ($\times 1.00$ weight).

### 2. Zero-Trust Security & Multi-Tenant Organization Isolation
- **Cryptographic Token Verification**: Server endpoints verify Firebase ID tokens via `verifyIdToken(token, true)` enforcing checkRevoked.
- **No Role Spoofing**: All client header assertions (`x-user-role`, `x-user-id`) have been removed. Authorization relies strictly on verified custom claims.
- **Organization-Level Isolation**: Recruiters are strictly confined to jobs, applications, and candidate dossiers associated with their authenticated `orgId`.
- **Strict Firestore & Storage Rules**: Deny-by-default rules. Candidates cannot modify verification records, assessment scores, or tamper with hiring decisions. Clients cannot write to `auditLogs`.

### 3. Dedicated Isolated Code Execution Architecture
- **`node:vm` Decommissioned**: Node's VM has been eliminated as a security boundary per official security advisories.
- **Isolated Provider Architecture**: Untrusted candidate code is dispatched to dedicated container workers (`SANDBOX_WORKER_URL`) with non-root execution, read-only root filesystems, network egress disabled (`--network none`), memory limits (128MB), execution timeouts (3000ms), and stripped application secrets.
- **Fail-Safe Behavior**: If secure container infrastructure is unconfigured, arbitrary execution is safely disabled (`EXECUTION_PROVIDER_UNCONFIGURED`).

### 4. Authentic Gemini AI Intelligence
- **Official `@google/genai` SDK**: Centralized client managing model tiers, prompt injection defense, and structured Zod parsing.
- **Zero-Fabrication Policy**: When API keys are unconfigured or quota is exhausted, endpoints return honest, structured status codes (`AI_UNAVAILABLE`, `PROCESSING_FAILED`) rather than hallucinating synthetic profiles.
- **Configurable Model Tiers**:
  - `GEMINI_MODEL_PRIMARY=gemini-4-neon`
  - `GEMINI_MODEL_REASONING=gemini-4-carbon`
  - `GEMINI_MODEL_FAST=gemini-4-hydrogen`
  - `GEMINI_MODEL_FALLBACK=gemini-3.8-flash`

### 5. Genuine Firestore Persistence Repositories
- Decoupled data access layer in `src/lib/repositories/`:
  - `JobRepository`: Requisition persistence with compound indexes.
  - `ApplicationRepository`: Application submission, status transitions, and duplicate prevention.
  - `CandidateRepository`: Profile sync and external profile verification.
  - `AssessmentRepository`: Authoritative coding problem definitions, private evaluation test case isolation, and submission recording.
  - `HiringDecisionRepository`: Transactional hiring decision commitments.
  - `AuditRepository`: Tamper-evident, immutable audit trail.

---

## Application Portals & Core Routes

| Portal / Feature | URL Route | Description |
| :--- | :--- | :--- |
| **Landing & Role Gateway** | `/` | Role selection gateway (Candidate, Recruiter, Admin) |
| **Candidate Dashboard** | `/candidate/dashboard` | Competency profile, evidence tiers, active applications |
| **Candidate Profile** | `/candidate/profile` | Authenticated Firestore profile management |
| **Resume Intelligence** | `/candidate/resume` | 5-tier evidence parser & prompt injection defense |
| **Interactive Interview Room** | `/candidate/interview/[id]` | Adaptive technical interview with turn-by-turn rubric scoring |
| **Live Coding Assessment** | `/candidate/assessment/[id]` | Deterministic isolated test runner & sandbox |
| **Role Recommendations** | `/candidate/recommendations` | 16-role taxonomy matching & skill gap roadmap |
| **Recruiter Pipeline** | `/recruiter/pipeline` | Requisition pipeline, Kanban stages, candidate cards |
| **Candidate Dossier** | `/recruiter/candidates/[id]` | Real candidate evidence, multi-tier scores, role fit |
| **Recruiter Hiring Dossier** | `/recruiter/reports/[id]` | Human decision recording console & immutable audit trail |
| **Admin Gemini Diagnostics** | `/admin/gemini` | Model connectivity tests & latency benchmarks |
| **Admin Audit Trail** | `/admin/audit` | Immutable security audit logs |

---

## Quickstart & Verification

### Prerequisites
- Node.js 20+
- npm or pnpm
- Python 3.10+ (for Python sandbox runner)

### Installation
```bash
git clone https://github.com/ASstyles/TalentAI.git
cd TalentAI
npm ci
```

### Running Automated Test Suite
```bash
npm test
```
*Current test suite: 10 suites, 54/54 tests passing (100%).*

### Running Production Build
```bash
npm run build
npm start -- -p 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Documentation Index

- [Architecture Specification](docs/ARCHITECTURE.md)
- [Security Threat Model](docs/SECURITY_THREAT_MODEL.md)
- [Database Schema Specification](docs/DATABASE_SCHEMA.md)
- [API Endpoint Reference](docs/API_REFERENCE.md)
- [Gemini Integration Guide](docs/GEMINI_INTEGRATION.md)
- [Assessment Methodology](docs/ASSESSMENT_METHODOLOGY.md)
- [Production Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Automated Test Results](docs/TEST_RESULTS.md)
- [System Limitations](docs/REMAINING_LIMITATIONS.md)
- [Authentication & Role Gateway Guide](docs/AUTHENTICATION_GUIDE.md)
- [Final Defect Register](docs/FINAL_DEFECT_REGISTER.md)
- [Final Engineering Report](docs/FINAL_ENGINEERING_REPORT.md)
