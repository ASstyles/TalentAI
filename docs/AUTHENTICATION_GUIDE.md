# TalentAI — Authentication Gateway & Zero-Trust Access Guide

This guide documents the enterprise authentication gateway, server-controlled role provisioning, dual-layer route protection, and cryptographic custom claims architecture implemented in **TalentAI**.

---

## 1. Architectural Principles

TalentAI enforces a strict separation between **portal intent** and **authoritative privileges**:
- **Portal Selection as Preference**: Choosing "Candidate Login" or "Recruiter Login" communicates the user's intended portal workspace. It is **never** accepted as permission to assign or escalate account roles.
- **Server-Only Role Authority**: User roles (`candidate`, `recruiter`, `admin`) and organization tenants (`orgId`) are cryptographically signed into Firebase Auth custom claims exclusively by the Firebase Admin SDK on the server.
- **Zero Role Self-Assignment**: Registration endpoints strictly assign the `candidate` role. Recruiter privileges can only be granted through administrator-approved access requests or direct administrative provisioning.
- **Zero-Trust Denial on Role Mismatch**: If an authenticated candidate logs in through the Recruiter Portal, the application strictly denies access to recruiter workspaces and displays:
  > *"Recruiter access has not been enabled for this account. Your account has verified Candidate permissions."*

---

## 2. Authentication Gateway Topology

```
                              Public User Entry
                                      |
                                      v
                            [/login Gateway]
                           /                \
                          v                  v
             [Candidate Portal Card]    [Recruiter Portal Card]
                        |                          |
                        v                          v
              /login?role=candidate       /login?role=recruiter
                        |                          |
                +-------+-------+                  |
                |               |                  |
                v               v                  v
          [Email / Pass]   [Google OAuth]    [Work Email / Pass]
                \               /                  |
                 v             v                   v
              [Firebase Auth Client]     [Firebase Auth Client]
                         \                        /
                          v                      v
                       POST /api/auth/session (Verify Token)
                                      |
                         +------------+------------+
                         |  Authoritative Claims   |
                         |  Verification & Cookie  |
                         +------------+------------+
                                      |
             +------------------------+------------------------+
             |                                                 |
             v                                                 v
  Verified role == 'candidate'                     Verified role == 'recruiter'
             |                                                 |
             v                                                 v
     Intended: candidate?                              Intended: recruiter?
     YES -> /candidate/dashboard                       YES -> /recruiter/dashboard
     NO  -> Display Mismatch Notice                    NO  -> Display Mismatch Notice
```

---

## 3. Route Inventory & Protection Matrix

| Route | Classification | Allowed Roles | Guard Enforcement | Redirect Behavior on Unauthenticated |
|---|:---:|:---:|:---:|---|
| `/` | Public | All | None | Accessible |
| `/login` | Public Gateway | All | None | Accessible |
| `/register` | Public Onboarding | All | None | Accessible |
| `/forgot-password` | Public Recovery | All | None | Accessible |
| `/recruiter/access-request` | Public Application | All | None | Accessible |
| `/candidate/*` | Protected Workspace | `candidate`, `admin` | Middleware + `RouteGuard` | Redirects to `/login?role=candidate` |
| `/recruiter/*` | Protected Workspace | `recruiter`, `admin` | Middleware + `RouteGuard` | Redirects to `/login?role=recruiter` |
| `/admin/*` | Governance Console | `admin` | Middleware + `RouteGuard` | Redirects to `/login` |

---

## 4. Key Endpoints & APIs

### 4.1 `POST /api/auth/register`
- **Purpose**: Secure candidate registration.
- **Payload**:
  ```json
  {
    "fullName": "Alex Mercer",
    "email": "alex@mercer.dev",
    "password": "StrongPassword123!@#",
    "confirmPassword": "StrongPassword123!@#",
    "acceptedTerms": true
  }
  ```
- **Validation**:
  - Minimum 8 characters.
  - Requires uppercase letter, lowercase letter, number, and special symbol (`[@$!%*?&_\-#]`).
  - Verifies passwords match.
  - Requires terms acceptance.
- **Security Enforcement**: Automatically assigns `{ role: 'candidate', orgId: null }` via `adminAuth.setCustomUserClaims`. Initializes `users` and `candidateProfiles` documents. Client cannot pass custom roles.

### 4.2 `POST /api/auth/session`
- **Purpose**: Authenticates Firebase ID token on the server and issues secure session cookie.
- **Transport**: `Authorization: Bearer <ID_TOKEN>` or body `{ idToken }`.
- **Validation**: Cryptographically decodes token with `checkRevoked = true`.
- **Behavior**: Sets HTTP-only, `sameSite: 'lax'`, `secure` cookie (`session`) for server route guards. Returns `{ uid, email, displayName, role, orgId }`.

### 4.3 `POST /api/auth/logout`
- **Purpose**: Invalidates session cookie and resets client state.
- **Behavior**: Sets `session` cookie with `maxAge: 0`.

### 4.4 `POST /api/recruiter/access-request`
- **Purpose**: Enterprise recruiter onboarding workflow.
- **Payload**:
  ```json
  {
    "fullName": "Sarah Chen",
    "workEmail": "sarah.chen@nexuscloud.io",
    "companyName": "Nexus Cloud Technologies",
    "jobTitle": "Lead Technical Talent Partner",
    "businessWebsite": "https://nexuscloud.io",
    "reason": "Scaling Core Infrastructure & AI Systems engineering teams across 15 requisitions."
  }
  ```
- **Domain Verification**: Rejects public freemail providers (`gmail.com`, `yahoo.com`, `hotmail.com`). Requires valid URL.
- **Persistence**: Commits to `recruiterAccessRequests` with status `pending`. Logs an immutable audit entry.

### 4.5 `POST /api/admin/recruiter-requests`
- **Purpose**: Administrative review and role provisioning.
- **Authorization**: Required role `admin`.
- **Payload**: `{ "requestId": "req-...", "action": "approve" | "reject" }`
- **On Approval**:
  1. Creates or associates company record in `organizations` collection.
  2. Provisions or associates user in Firebase Auth.
  3. Cryptographically sets custom claims: `{ role: 'recruiter', orgId: 'org-...' }`.
  4. Creates `recruiterProfiles` record with acquisition permissions.
  5. Commits immutable audit entry to `auditLogs`.

---

## 5. Automated Verification Results

The authentication gateway and role security have been validated via automated test suites:
- **Test Suite**: `tests/security/auth-gateway.test.ts` (11 tests | 100% Passed)
- **Zero-Trust Auth Suite**: `tests/security/auth-and-zero-trust.test.ts` (7 tests | 100% Passed)
- **Total Test Suite**: **10 suites, 54/54 tests passing (100%)**

```bash
# Run the complete test suite
npm test
```
