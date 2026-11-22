# TalentAI Architecture Specification

## 1. Executive Architectural Overview

**TalentAI** is an enterprise-grade AI-Powered Engineer Recruitment & Job Role Recommendation Platform built on a zero-trust, multi-tenant architecture. The platform combines deterministic evaluation, cryptographic authentication, genuine Google Cloud Firestore persistence, official Google Gemini developer intelligence, and isolated sandboxed execution.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSERS                                   |
|   +-----------------------+ +-----------------------+ +-----------------------+   |
|   |   Candidate Portal    | |   Recruiter Portal    | |     Admin Portal      |   |
|   |  Profile / Sandbox /  | | Pipeline / Dossiers / | |  Audit Logs / Gemini  |   |
|   |   Adaptive Interview  | |  Decision Support Hub | | Diagnostics / Taxonomy|   |
|   +-----------+-----------+ +-----------+-----------+ +-----------+-----------+   |
+---------------|-------------------------|-------------------------|---------------+
                |                         |                         |
                +-------------------------+-------------------------+
                                          | HTTPS / Bearer ID Token (verifyIdToken(token, true))
                                          v
+-----------------------------------------------------------------------------------+
|                             NEXT.JS 15 APP ROUTER                                 |
|  - Edge-capable Dynamic Route Handlers                                            |
|  - Zero-Trust Server Session Authorization (Custom Claims: role, orgId)          |
|  - Zod Request Schema Validation & Sliding-Window Rate Limiting                   |
+-----------------------------------------+-----------------------------------------+
                                          |
                +-------------------------+-------------------------+
                |                         |                         |
                v                         v                         v
+-----------------------+ +-----------------------+ +-----------------------+
|  FIRESTORE REPOSITORY | |   GOOGLE GEN AI SDK   | |   ISOLATED SANDBOX    |
|         LAYER         | |     (@google/genai)   | |       PROVIDER        |
| - JobRepository       | | - Centralized Client  | | - Remote Container    |
| - ApplicationRepo     | | - Configurable Tiers  | |   Worker (gVisor/OCI) |
| - CandidateRepo       | | - Error Classification| | - Isolated Subprocess |
| - HiringDecisionRepo  | | - Injection Defense   | |   Test Runner         |
| - AuditRepository     | | - Zero Fabrication    | | - node:vm Neutralized |
+-----------+-----------+ +-----------+-----------+ +-----------+-----------+
            |                         |                         |
            v                         v                         v
+-----------------------+ +-----------------------+ +-----------------------+
|   FIREBASE BACKEND    | |  GEMINI MODEL TIERS   | |   EXECUTION SERVICE   |
| - Cloud Firestore     | | - gemini-4-neon       | | - Ephemeral Run       |
| - Firebase Auth       | | - gemini-4-carbon     | | - Non-Root / Read-Only|
| - Cloud Storage       | | - gemini-4-hydrogen   | | - Network Disabled    |
| - Security Rules      | | - gemini-3.8-flash    | | - CPU / Memory Caps   |
+-----------------------+ +-----------------------+ +-----------------------+
```

---

## 2. Layered System Architecture

### 2.1 Presentation Layer (Next.js 15 App Router)
- **Candidate Workspace**: Provides self-service evidence ingestion, resume analysis, adaptive technical interviews, bounded coding assessments, and personalized role fit analysis.
- **Recruiter Console**: Pipeline Kanban, job requisition manager, candidate evidence dossiers, and human decision recording console.
- **Admin Governance**: Gemini diagnostics, model benchmarks, user claim administration, taxonomy rubric editing, and tamper-evident audit logs.

### 2.2 Security & Gateway Layer
- **Fail-Closed Authentication**: Server endpoints strictly require verified Firebase ID tokens via `verifyIdToken(token, true)`.
- **RBAC Custom Claims**: Role (`candidate`, `recruiter`, `admin`) and Organization ID (`orgId`) are cryptographically signed into Firebase Auth tokens.
- **Multi-Tenant Organization Isolation**: Recruiters are strictly confined to jobs, applications, and candidate dossiers matching their authenticated `orgId`.

### 2.3 Domain Services & Repositories
- **Repository Pattern**: Business logic decoupled from page handlers through `JobRepository`, `ApplicationRepository`, `CandidateRepository`, `HiringDecisionRepository`, and `AuditRepository`.
- **Transactional Consistency**: Status transitions and hiring decisions are executed via atomic Firestore transactions.

### 2.4 AI Intelligence Layer
- **Official Google Gen AI SDK (`@google/genai`)**: Centralized singleton client (`GeminiClient`) managing connection pools, retry policies, timeouts, and error classification.
- **Prompt Injection Defense**: Untrusted content (resumes, candidate answers, repository contents) is sanitized and enclosed in structured boundary tags before passing to Gemini.
- **Zero-Fabrication Policy**: When API keys are absent or services are degraded, endpoints return explicit, structured status codes (`AI_UNAVAILABLE`, `PROCESSING_FAILED`) rather than fabricated candidate profiles.

### 2.5 Sandboxed Execution Boundary
- **Decommissioned `node:vm`**: Completely removed per Node.js official security guidance.
- **Isolated Provider Architecture**: Dispatches untrusted candidate code to dedicated container/microVM workers with stripped environment, non-root execution, read-only root filesystems, network egress disabled (`--network none`), and strict resource quotas.
