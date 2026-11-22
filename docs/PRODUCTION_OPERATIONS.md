# TALENTAI PRODUCTION OPERATIONS, OBSERVABILITY & RUNBOOKS

**Document Reference:** `DOC-OPS-009`  
**System:** TalentAI Production Operational Guidelines & SRE Procedures  
**Key Metrics:** P99 Latency < 400ms, Error Rate < 0.05%, Uptime 99.95%  
**Status:** Operationalized

---

## 1. Health Probes & Orchestrator Integration

TalentAI exposes two dedicated HTTP probes compliant with Kubernetes and cloud orchestrator standards:

### 1.1 Liveness Probe (`GET /api/health/live`)
- **Purpose:** Verifies that the Node.js event loop is responsive and the process is alive.
- **Dependencies:** Independent of external databases or third-party APIs.
- **Expected Response:** HTTP 200 OK
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-23T00:55:00.000Z",
    "uptime": 142.5
  }
  ```
- **Orchestrator Action:** If the liveness probe fails for 3 consecutive intervals (30s), Kubernetes automatically restarts the container.

### 1.2 Readiness Probe (`GET /api/health/ready`)
- **Purpose:** Verifies that upstream dependencies (Firebase Admin, Firestore, Redis, Gemini AI configuration) are connected and ready to serve user traffic.
- **Expected Response:** HTTP 200 OK (or HTTP 503 if upstream dependencies are unreachable)
  ```json
  {
    "status": "ready",
    "timestamp": "2026-11-23T00:55:00.000Z",
    "checks": {
      "firebaseClientConfig": "healthy",
      "firebaseAdmin": "healthy",
      "geminiConfig": "healthy",
      "redis": "healthy"
    }
  }
  ```
- **Orchestrator Action:** If readiness fails, load balancers pull the container out of the traffic pool until healthy without terminating the process.

---

## 2. Structured JSON Logging Specification

Every operational event, error, and audit record is output as single-line structured JSON to `stdout` for ingestion by Cloud Logging or Datadog:

```json
{
  "timestamp": "2026-11-23T00:55:01.120Z",
  "level": "INFO",
  "service": "talentai-web",
  "traceId": "c8a412f8-7b90-4e31-901b",
  "route": "/api/hiring/decide",
  "userId": "recruiter-user-456",
  "orgId": "org-google-deepmind",
  "action": "HIRING_DECISION_SUBMITTED",
  "applicationId": "app-789",
  "decision": "advance_to_offer",
  "durationMs": 42
}
```

---

## 3. Incident Response Runbooks

### Runbook 1: Redis Rate Limiter Connection Failure
- **Symptom:** Logs report `[RateLimiter] Redis connection failed`. Rate limiter degrades to in-memory sliding window or high-risk endpoints fail closed.
- **Diagnostic Steps:**
  1. Inspect Redis container logs: `docker compose logs redis`.
  2. Test internal network reachability: `docker compose exec app nc -zv redis 6379`.
  3. Verify password authentication match in `REDIS_URL`.
- **Mitigation:**
  - Restart Redis service: `docker compose restart redis`.
  - In extreme cases, rotate Redis cluster node and update `REDIS_URL`.

### Runbook 2: Gemini API Quota Exhaustion (HTTP 429)
- **Symptom:** `/api/resume/parse` or `/api/interview/evaluate` report rate limit errors from `@google/genai`.
- **Diagnostic Steps:**
  1. Inspect Google Cloud Console API Quota dashboard for Gemini models.
  2. Verify token consumption in `/admin/audit` AI usage logs.
- **Mitigation:**
  - The client automatically falls back from `gemini-2.5-pro` to `gemini-2.5-flash` or `gemini-2.0-flash`.
  - Temporarily throttle non-critical background parsing via feature flag.
