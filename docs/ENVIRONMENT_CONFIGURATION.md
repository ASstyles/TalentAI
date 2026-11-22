# TALENTAI ENVIRONMENT CONFIGURATION SPECIFICATION

**Document Reference:** `DOC-OPS-006`  
**System:** TalentAI Production Environment Variables & Secrets Hierarchy  
**Template File:** `.env.docker.example`  
**Classification:** Operational Security Reference

---

## 1. Secrets Separation & Security Rules

TalentAI enforces strict separation between:
1. **Public Client Variables (`NEXT_PUBLIC_*`):** Bundled into client-side JavaScript by Next.js during build. These must NEVER contain private keys, API secrets, or administrative credentials.
2. **Private Server-Only Variables:** Loaded exclusively in server-side Node.js environments (Next.js route handlers, server actions, and background workers). Never exposed to browser bundles.

> [!CAUTION]
> Never commit `.env`, `.env.local`, or `.env.production` files containing live credentials to version control. Always use `.env.docker.example` as a template and inject production secrets via secret managers (Google Secret Manager, HashiCorp Vault, or GitHub Secrets).

---

## 2. Complete Environment Variable Reference

### 2.1 Public Client Variables (Firebase Web Client SDK)
| Variable Name | Required | Default / Format | Description |
|:---|:---:|:---|:---|
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | `talentai-prod` | Google Cloud project ID for Firebase Client SDK. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | `AIzaSy...` | Firebase Web API key for client-side Auth. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | `talentai-prod.firebaseapp.com` | Authorized OAuth redirect domain. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | `talentai-prod.firebasestorage.app` | Cloud Storage bucket for resume and document uploads. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | No | Numeric string | Firebase Cloud Messaging project number. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | `1:123456...:web:...` | Unique Firebase Web Application identifier. |

### 2.2 Private Server Variables (Firebase Admin SDK v14)
| Variable Name | Required | Description |
|:---|:---:|:---|
| `FIREBASE_PROJECT_ID` | Yes | Target Google Cloud project ID for Admin SDK. |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account email with Firestore/Auth Admin privileges. |
| `FIREBASE_PRIVATE_KEY` | Yes | PEM-encoded RSA private key (`"-----BEGIN PRIVATE KEY-----\n..."`). |
| `FIREBASE_STORAGE_BUCKET` | Yes | Cloud Storage bucket for server-side signed URL generation. |

### 2.3 Google Gemini AI Configuration (`@google/genai`)
| Variable Name | Required | Default | Description |
|:---|:---:|:---|:---|
| `GEMINI_API_KEY` | Yes | `AIzaSy...` | Official Google AI Studio API key. |
| `GEMINI_MODEL_PRIMARY` | No | `gemini-2.5-flash` | Default high-speed model for structured extraction. |
| `GEMINI_MODEL_REASONING` | No | `gemini-2.5-pro` | Advanced model for deep interview and rubric reasoning. |

### 2.4 Redis Infrastructure (Distributed Rate Limiting & Caching)
| Variable Name | Required | Default | Description |
|:---|:---:|:---|:---|
| `REDIS_URL` | Yes (in prod) | `redis://:password@redis:6379` | Full connection URI for Redis cluster or standalone node. |
| `REDIS_PASSWORD` | Optional | String | Separate password if not included in `REDIS_URL`. |

### 2.5 Sandboxed Code Execution
| Variable Name | Required | Default | Description |
|:---|:---:|:---|:---|
| `SANDBOX_EXECUTION_ENABLED` | Yes | `true` | Feature flag to enable/disable code execution runners. |
| `SANDBOX_RUNNER_TIMEOUT_MS` | No | `3000` | Hard wall-clock execution cap per candidate submission. |
| `SANDBOX_RUNNER_MEMORY_MB` | No | `128` | Maximum RAM allocation per execution process. |

---

## 3. Pre-Flight Validation

The platform includes an automated pre-flight environment verification script (`scripts/verify-environment.sh`):
```bash
bash scripts/verify-environment.sh
```
It ensures all mandatory variables are configured with correct formats before the containerized service begins accepting traffic.
