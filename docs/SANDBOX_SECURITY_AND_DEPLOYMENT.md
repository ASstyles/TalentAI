# SANDBOX SECURITY & EXECUTION INFRASTRUCTURE SPECIFICATION

**Document Reference:** `DOC-SEC-004`  
**System:** TalentAI Untrusted Algorithmic Code Execution Sandbox  
**Module:** `src/app/api/sandbox/execute/route.ts` & `src/lib/sandbox/runner.ts`  
**Classification:** Infrastructure & Application Security Specification  
**Status:** Hardened & Containerized

---

## 1. Threat Profile & Sandboxing Requirements

The TalentAI platform permits candidates to write and submit executable algorithmic code (JavaScript/TypeScript and Python) during automated technical assessments. Executing arbitrary candidate code presents severe security threats:
1. **Remote Code Execution (RCE):** Malicious payloads attempting shell access, process spawning, or host filesystem traversal.
2. **Denial of Service (DoS):** Infinite loops, fork bombs, memory starvation (`malloc` exhaustion), and disk space exhaustion.
3. **Data Exfiltration:** Network sockets attempting to connect to external Command-and-Control (C2) servers or internal VPC microservices.
4. **Test Evaluation Tampering:** Candidates attempting to inspect or override system test cases (DEF-013).

---

## 2. Multi-Layer Containment Architecture

To neutralize these threats, the execution pipeline utilizes a 4-tier containment architecture:

```
[ Candidate Code Submission ]
             │
             ▼
[ 1. API Gateway / Zero-Trust Sanitization ]
    ├── Token Authentication & Candidate Binding
    ├── AST Static Inspection & Forbidden Keyword Filter
    └── Distributed Redis Rate Limiting (10 req/min)
             │
             ▼
[ 2. Ephemeral MicroVM / Container Runner (gVisor / Firecracker) ]
    ├── Non-root execution (`sandboxuser:10001`)
    ├── Read-only root filesystem (`--read-only`)
    ├── Total Network Isolation (`--network none`)
    └── Ephemeral tmpfs mounts (max 32MB, cleared on process exit)
             │
             ▼
[ 3. Kernel cgroups & Resource Quotas ]
    ├── Hard CPU Quota (1.0 vCPU)
    ├── Memory Ceiling (128 MB RAM, zero swap)
    └── Max Process Limit (pids-limit 32, fork-bomb immune)
             │
             ▼
[ 4. Deterministic Test Harness & Timeouts ]
    ├── Execution Wall-Clock Cap: 3000ms
    ├── Hidden System Test Cases injected exclusively by Admin SDK
    └── Strict Output Truncation (Max 16KB stdout/stderr)
```

---

## 3. High-Availability Provider Handling (`EXECUTION_PROVIDER_UNCONFIGURED`)

In production environments, external container orchestrators (e.g., Nomad, Kubernetes ephemeral jobs, or remote runner microVMs) may undergo rolling updates, cold starts, or network partitions.

Rather than failing with an opaque 500 error or hanging indefinitely:
- When the runner engine is unavailable or unconfigured, `/api/sandbox/execute` responds with HTTP 503 and a structured JSON payload:
```json
{
  "status": "EXECUTION_PROVIDER_UNCONFIGURED",
  "error": "The sandboxed execution environment is currently unconfigured or undergoing maintenance. Please retry or contact platform administration.",
  "executionTimeMs": 0,
  "memoryUsedMb": 0,
  "testsPassed": 0,
  "totalTests": 0,
  "results": []
}
```
- The frontend UI gracefully captures this status code, preserving the candidate's code in local storage and notifying them that evaluation is temporarily paused without penalizing their score or time limit.

---

## 4. Defect DEF-013 Remediation (Test Case Isolation)

Previously, candidates could pass `customTestCases` in the request body to force passing results:
- **Remediation:** The API route strictly checks `session.role`. If `session.role === 'candidate'`, any request containing `customTestCases` is immediately rejected with HTTP 403:
  `"Forbidden: Candidates cannot supply custom evaluation test cases. System rubrics are mandatory."`
- Authorized recruiters and administrators may supply custom test cases for authoring assessments, but candidate submissions strictly load private test cases from `/codingAssessments/{assessmentId}/privateTestCases` via the Admin SDK.
