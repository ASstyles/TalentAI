# TalentAI Security Threat Model & Defense-in-Depth Specification

## 1. Threat Modeling Overview (STRIDE Analysis)

TalentAI enforces a Zero-Trust security model designed to resist adversarial attacks, prompt injection, role spoofing, Broken Object-Level Authorization (BOLA), and remote code execution.

| Threat Category | Potential Attack Vector | TalentAI Mitigation Architecture |
| :--- | :--- | :--- |
| **Spoofing** | Forging `x-user-role` or client headers to impersonate recruiter or administrator. | **Eliminated (DEF-001)**: All header-based role spoofing removed. Server calls `adminAuth.verifyIdToken(token, true)` enforcing checkRevoked. |
| **Tampering** | Candidate tampering with assessment scores, test case results, or verifications. | **Enforced (DEF-008 & DEF-013)**: Candidates cannot supply arbitrary test cases. The server evaluates solutions against authoritative private test cases. Client writes to `hiringDecisions` are strictly forbidden (`allow write: if false`). |
| **Evidence Forgery** | Candidate submitting tampered skills or fake verification claims to role matching engine. | **Enforced (DEF-014)**: Role recommendation endpoint strictly queries authoritative Firestore database records for verifications, coding assessments, and interviews. Client-asserted claims are discarded. |
| **Repudiation** | Recruiter denying making an overriding hiring or rejection decision. | **Enforced (DEF-010 & DEF-016)**: Every hiring decision is written transactionally with mandatory rationale to an immutable audit trail in `auditLogs`. Direct client writes are blocked. |
| **Information Disclosure** | Candidate reading another candidate's private resume, contact info, or dossier. | **Enforced (DEF-015)**: Candidate profiles and storage files are strictly restricted to owner and admin in security rules (`isOwner(candidateId) \|\| isAdmin()`). Recruiter access is gated by active job application verification on the backend. |
| **Data Inconsistency** | Swallowed database write errors causing dirty in-memory state and silent data loss. | **Enforced (DEF-012)**: All repositories fail closed and re-throw database write rejections. In-memory simulated fallbacks are eliminated. |
| **Denial of Service** | Flooding sandbox execution or LLM endpoints with excessive requests. | **Enforced (DEF-003)**: In-memory sliding window rate limiting (10 requests/minute per UID) and request payload limits (max 50KB code, max 20 test cases). |
| **Elevation of Privilege** | Candidate escaping sandbox execution environment to compromise host server. | **Eliminated (DEF-007)**: Decommissioned `node:vm`. Isolated execution provider requires container/worker isolation; host environment variables and secrets are stripped. |

---

## 2. Authentication & Authorization Boundaries

### 2.1 Cryptographic Token Verification
```typescript
// src/lib/firebase/auth.ts
export async function verifyServerSession(token: string): Promise<DecodedSession> {
  const decoded = await adminAuth.verifyIdToken(token, true); // checkRevoked = true
  return {
    uid: decoded.uid,
    email: decoded.email,
    role: (decoded.role as UserRole) || 'candidate',
    orgId: (decoded.orgId as string) || undefined,
  };
}
```
- **Fail-Closed Design**: Unauthenticated requests or invalid tokens immediately reject with HTTP 401 Unauthorized.
- **Custom Claims Authorization**: Role information is signed by Firebase Admin and verified on every sensitive route handler.

### 2.2 Multi-Tenant Organization Isolation
- Every recruiter account contains an authoritative `orgId` custom claim.
- All recruiter operations (`/api/jobs`, `/api/applications`, `/api/hiring/decide`) verify that the target resource belongs to `session.orgId`.
- Cross-organization manipulation attempts are rejected with HTTP 403 Forbidden.

---

## 3. Code Execution Sandboxing (Defense Against Arbitrary Execution)

### 3.1 Neutralization of Node.js `node:vm`
Node.js documentation explicitly notes that `node:vm` is not a security boundary for untrusted code execution. TalentAI decommissioned all `node:vm` usage across the platform.

### 3.2 Isolated Execution Architecture
1. **Remote Container Sandbox Provider**: Untrusted code is dispatched to ephemeral container workers (e.g. gVisor/Docker) with:
   - Non-root user execution
   - Network egress disabled (`--network none`)
   - Read-only base filesystem with tmpfs scratchpad
   - CPU quota: 1 core
   - Memory limit: 128 MB
   - Timeout: 3000 ms
2. **Subprocess Test Runner**: In development and test environments, an isolated child process runs with completely sanitized environment (`delete global.process.env`, `NODE_ENV: 'test'`). No database secrets or Gemini API keys are accessible.

---

## 4. Prompt Injection & AI Safety Guardrails

1. **Input Neutralization**: Untrusted inputs (resumes, candidate answers, job descriptions) are sanitized via `sanitizeForPrompt()` to strip pseudo-system tags (`<system>`, `[SYSTEM]`, `'''rm -rf /'''`).
2. **Structural Encapsulation**: Untrusted input is strictly enclosed in XML boundary tags:
   ```
   <candidate_resume>
   [SANITIZED_UNTRUSTED_CONTENT]
   </candidate_resume>
   ```
3. **Strict JSON Schema Enforcement**: All Gemini responses are parsed and validated via Zod schemas. Hallucinated schemas or malformed outputs trigger schema validation errors rather than entering the database.
4. **Zero-Fabrication Policy**: Endpoints return honest failure statuses (`AI_UNAVAILABLE`, `PROCESSING_FAILED`) when AI services are offline, preventing fabricated profiles or false recruiter signals.
