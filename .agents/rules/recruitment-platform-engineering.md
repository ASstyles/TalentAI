# Non-Negotiable Recruitment Platform Engineering Rules

## 1. Core Architecture Principles
- **Separation of Evidence Levels**:
  1. *Candidate-Claimed*: Unverified claims made on resume/profile.
  2. *Resume-Extracted*: Parsed by NLP/Gemini with confidence metrics and snippet offsets.
  3. *Project-Supported*: Evidenced by repositories, architecture breakdowns, commit histories, or deployed work.
  4. *Independently Verified*: Validated via official issuers, academic records, third-party verification, or manual compliance review.
  5. *Assessment-Demonstrated*: Directly scored during adaptive technical interviews and deterministic coding sandboxes.
- **Explainable Role Recommendation**: Never emit opaque or global candidate rankings. Recommendations must compute against explicit role competency weights with coverage, confidence, and identified skill gaps.
- **Human-in-the-Loop Authority**: The platform delivers decision-support intelligence. The final hiring, rejection, or advancement action is strictly reserved for human recruiters and logged in audit trails.

## 2. Artificial Intelligence Standards (Gemini API)
- Use official `@google/genai` SDK.
- Configure models dynamically via environment variables (`GEMINI_MODEL_REASONING`, `GEMINI_MODEL_FAST`, `GEMINI_MODEL_FALLBACK`).
- Enforce strict JSON Schema / Zod validation on every AI response. Never accept unstructured string output as authoritative truth.
- Zero client-side API keys: Gemini requests are strictly orchestrated via secure backend services or Cloud Functions.
- Untrusted Input Sanitization: Treat resumes, code submissions, candidate interview responses, and job descriptions as untrusted to defend against prompt injection.

## 3. Security, Authorization & Privacy
- **Strict Role-Based Access Control (RBAC)**: Roles (`candidate`, `recruiter`, `admin`) are assigned and verified on the server via Firebase Custom Claims or server session tokens. Never rely on client state.
- **Firestore & Storage Security Rules**: Enforce strict tenant and user isolation. Candidates cannot view other candidates' data or recruiter internal evaluations/notes. Documents (resumes, identity files, transcripts) are stored in private buckets and accessed via short-lived signed URLs.
- **Isolated Code Execution**: Untrusted candidate code MUST NEVER execute directly on the primary host or privileged Cloud Functions. Use isolated sandbox adapters (e.g. Docker, gVisor, WebAssembly, or dedicated execution engines) with strict CPU, memory, and network boundaries.
- **Secrets Management**: No API keys, credentials, or service account secrets in client code or source control.

## 4. Engineering Quality & Testing
- Every major business workflow must be backed by unit, integration, and security tests.
- Every UI route must provide complete loading, error, empty, and success states.
- Follow enterprise SaaS UX guidelines: responsive layout, shadcn/ui design language, accessible color contrasts, clear typography, and zero decorative "AI slop".
