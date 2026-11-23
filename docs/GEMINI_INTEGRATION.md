# TalentAI Gemini Integration & AI Governance Specification

## 1. SDK & Architecture Overview

TalentAI integrates with the official Google Gen AI SDK:
```json
"@google/genai": "^3.6.1"
```
The integration is centralized in `src/lib/gemini/client.ts` via the `GeminiClient` singleton. The client enforces structured JSON output schema validation via Zod, model selection, request timeouts, and error classification.

---

## 2. Configurable Model Tiers

The platform defines four centrally configurable model tiers managed via environment variables:

| Tier | Environment Variable | Default Model Identifier | Workload Purpose |
| :--- | :--- | :--- | :--- |
| **Primary** | `GEMINI_MODEL_PRIMARY` | `gemini-2.5-flash` | Core recruitment intelligence and multi-modal candidate reasoning |
| **Reasoning** | `GEMINI_MODEL_REASONING` | `gemini-2.5-pro` | Complex architecture evaluation, rubric extraction, and synthesis |
| **Fast** | `GEMINI_MODEL_FAST` | `gemini-2.0-flash` | Low-latency adaptive interview turns and conversational follow-ups |
| **Fallback** | `GEMINI_MODEL_FALLBACK` | `gemini-1.5-flash` | Resilient fallback tier for standard structured extractions |

---

## 3. Zero-Fabrication AI Governance Policy

In accordance with strict recruitment compliance and anti-bias principles:
1. **No Simulated Fallbacks**: When `GEMINI_API_KEY` is not present, or if quota is exhausted, endpoints NEVER return synthetic "Alex Mercer" profiles or word-count-based evaluation scores.
2. **Truthful Status Reporting**: The system reports explicit, machine-readable statuses:
   - `AI_UNAVAILABLE` (HTTP 503)
   - `PROCESSING_FAILED` (HTTP 502)
   - `ASSESSMENT_PENDING` (HTTP 202)
3. **Error Classification**:
   - `MISSING_API_KEY`: Credentials not configured in Secret Manager
   - `UNAUTHORIZED`: 401 Invalid or revoked API key
   - `RATE_LIMIT_EXCEEDED`: 429 Quota exhausted
   - `MODEL_NOT_FOUND`: 404 Model identifier unavailable
   - `TIMEOUT`: 504 Request exceeded 15s deadline

---

## 4. Prompt Injection Defense & Data Sanitization

All user-supplied content passing into Gemini inference (resumes, interview answers, GitHub code snippets) is sanitized:
1. **Pattern Stripping**: Sequences such as `<system>`, `[SYSTEM]`, `'''rm -rf /'''`, and instruction-override phrases are stripped.
2. **Boundary Encapsulation**: Inputs are wrapped in clear XML boundary tags (e.g. `<candidate_resume>...</candidate_resume>`).
3. **Zod Validation**: Raw Gemini outputs are parsed strictly against Zod schemas before being returned or stored.
