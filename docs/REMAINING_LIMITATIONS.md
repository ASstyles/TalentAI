# TalentAI Transparent Systems Limitations & External Dependencies

This document provides a truthful disclosure of platform limitations and external infrastructure dependencies.

---

## 1. External Infrastructure Requirements

1. **Google Cloud Secret Manager & Firebase Credentials**:
   - In production, server-side identity verification requires a valid Firebase service account (`FIREBASE_PRIVATE_KEY` and `FIREBASE_CLIENT_EMAIL`). Without credentials, the system fails closed (HTTP 401).
   - In offline local development without credentials, endpoints reject unauthenticated requests.
2. **Dedicated Isolated Container Worker (`SANDBOX_WORKER_URL`)**:
   - In accordance with DEF-002, `node:vm` has been decommissioned. In production, live arbitrary code execution requires a configured container worker daemon (e.g. gVisor, Firecracker, or Docker runner).
   - If `SANDBOX_WORKER_URL` is unconfigured and `ALLOW_LOCAL_SUBPROCESS_SANDBOX` is false, code execution is safely disabled (`EXECUTION_PROVIDER_UNCONFIGURED`) to protect the host server from arbitrary code execution.
3. **Google Gemini Developer API (`GEMINI_API_KEY`)**:
   - Real inference requires an active API key from Google AI Studio.
   - When the key is unconfigured, endpoints return `503 AI_UNAVAILABLE` rather than hallucinating synthetic profiles.

---

## 2. Platform Constraints

1. **Supported Code Execution Languages**:
   - Live sandboxed execution currently supports Python, JavaScript, and TypeScript. Additional compiled runtimes (Rust, Go, C++, Java) require dedicated language container images in the worker pool.
2. **Resume File Ingestion**:
   - Supported server-side text extraction formats: Plain text (`.txt`), PDF (`.pdf`), and Microsoft Word (`.docx`). OCR extraction for low-resolution scanned image PDFs requires configuring Google Cloud Vision API.
3. **Rate Limiting Scope**:
   - The current rate limiter operates on an in-memory sliding window per application instance. For multi-instance clustered deployments, configuring a distributed Redis / Memcached store (`UPSTASH_REDIS_REST_URL`) is recommended.
