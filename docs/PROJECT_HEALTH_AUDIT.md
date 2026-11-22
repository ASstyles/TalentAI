# Project Health Audit & Defect Register

**Project**: TalentMatrix AI — AI-Powered Engineer Recruitment & Job Role Recommendation Platform  
**Audit Date**: 2026-11-22  
**Auditor**: Principal Lead Software Engineer  
**Status**: Critical Remediation Required Before Production Deployment  

---

## 1. Executive Summary
A comprehensive audit of the existing repository was performed covering architecture, security, authentication, AI orchestration, backend data integrity, sandbox execution, user portals, and automated test coverage. While the baseline structure compiles cleanly with Next.js 15 and unit tests pass on basic scenarios, multiple **critical security vulnerabilities (P0)**, **major functional gaps (P1)**, and **state persistence defects (P1/P2)** were uncovered that must be resolved prior to production readiness.

---

## 2. Defect Register

| Defect ID | Affected Component | Description | Root Cause | Severity | User Impact | Proposed Correction | Verification Method |
|---|---|---|---|---|---|---|---|
| **DEF-01** | `src/app/api/hiring/decide/route.ts` | Broken Object-Level Authorization (BOLA). Anyone can submit hiring decisions. | API endpoint lacks server-side JWT verification and role checks. | **P0** | Candidates or attackers can forge recruiter hiring decisions and override recommendations. | Add server session verification requiring `role: 'recruiter' \| 'admin'`. | Automated security integration test attempting unauthenticated and candidate-role POSTs. |
| **DEF-02** | `src/lib/sandbox/runner.ts` | Insecure Sandbox Execution / Prototype Escape Risk in Code Evaluation. | `new Function` with regex string replacement allows constructor escapes (`this.constructor.constructor("return process")()`). | **P0** | Arbitrary code execution vulnerability on server host. | Replace with `node:vm` isolated script context with null prototype, strict CPU timeouts, and memory limits. | Security exploit test verifying constructor and global process access are blocked. |
| **DEF-03** | `src/lib/gemini/client.ts`, `.env.example` | Missing configured primary model (`GEMINI_MODEL_PRIMARY=gemini-4-neon`) and error classification. | Hardcoded fallback without support for the required primary model tier. | **P1** | AI services cannot leverage designated primary model tier and fail to distinguish quota errors from auth errors. | Refactor `GeminiClient` to support `primary`, `reasoning`, `fast`, and fallback models with granular error codes. | Live model configuration unit test. |
| **DEF-04** | `src/lib/gemini/connectivity.ts`, `/api/admin/gemini/test` | Missing Gemini Connectivity & Diagnostics Suite. | No automated verification of API key, quota, latency, or model availability. | **P1** | Operators cannot detect API misconfigurations or expired keys until runtime failures occur. | Implement `GeminiConnectivityService` and admin test endpoint checking key, models, and JSON generation. | Automated diagnostic runner test. |
| **DEF-05** | `src/app/candidate/jobs/page.tsx`, `src/app/recruiter/jobs/new/page.tsx` | Ephemeral State / Missing Data Persistence for Jobs & Applications. | Job creation and candidate applications only mutate React local state (`useState`). | **P1** | Refreshing browser drops submitted applications and published job openings. | Build unified repository services (`JobService`, `ApplicationService`) persisting to Firestore/storage. | End-to-end persistence test verifying records survive page reloads. |
| **DEF-06** | `src/app/candidate/profile/page.tsx` | Missing Candidate Profile Management Interface. | Route `src/app/candidate/profile/page.tsx` was planned but not implemented. | **P1** | Candidates cannot view or edit their headline, contact info, experience, or portfolio URLs. | Implement complete Candidate Profile view with form validation and verification status indicators. | Route render and interactive form submission test. |
| **DEF-07** | `src/lib/sandbox/runner.ts` | Python Sandbox Execution is a Simulation. | Python branch in sandbox runner does not invoke Python runtime. | **P1** | Python coding submissions are not actually evaluated. | Implement bounded Python execution via child process with strict timeout (2000ms), input piping, and memory caps. | Test case running Python algorithms against test inputs. |
| **DEF-08** | `src/app/recruiter/candidates/[id]/page.tsx` | Missing Recruiter Candidate Detail & Rubric Comparison Page. | Route was not created; recruiters cannot inspect candidate deep-dives from pipeline. | **P2** | Recruiters lack granular view comparing candidate competencies directly to job rubrics. | Implement `src/app/recruiter/candidates/[id]/page.tsx` with radar/comparison charts and interview transcripts. | Visual and functional route test. |
| **DEF-09** | `src/app/admin/gemini/page.tsx`, `src/app/admin/audit/page.tsx` | Static Mock Metrics on Admin Dashboards. | Admin views render hardcoded numbers instead of querying real audit and usage stores. | **P2** | Administrators see misleading telemetries and cannot audit real security events. | Wire views to dynamic repository APIs returning live audit logs and real token accounting. | API integration test verifying dynamic log population. |
| **DEF-10** | `src/app/recruiter/pipeline/page.tsx` | Pipeline Kanban Stage Transitions Non-Interactive. | Candidates in pipeline cannot have their status updated through the recruiter UI. | **P2** | Recruiter workflow is stunted; recruiters cannot advance candidate stages. | Add stage progression dropdown/actions wired to application status update API. | Interactive pipeline transition test. |

---

## 3. Remediation Order of Operations
1. **Milestone 2**: Fix P0 Security Defects (**DEF-01**, **DEF-02**).
2. **Milestone 3**: Fix P1 Gemini & Backend Model Architecture (**DEF-03**, **DEF-04**).
3. **Milestone 4**: Fix P1 Functional Persistence & Python Sandbox (**DEF-05**, **DEF-07**).
4. **Milestone 5**: Complete Missing Portals & Views (**DEF-06**, **DEF-08**, **DEF-09**, **DEF-10**).
5. **Milestone 6**: Execute Full Regression Suite, Security Tests, and Production Build.
