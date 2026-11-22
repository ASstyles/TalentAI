# FIRESTORE SECURITY RULES & ORGANIZATION ISOLATION SPECIFICATION

**Document Reference:** `DOC-SEC-002`  
**System:** TalentAI Cloud Firestore Security Architecture  
**Rule Engine:** Rules Version 2 (`rules_version = '2';`)  
**Security Model:** Zero-Trust, Attribute-Based Access Control (ABAC), Multi-Tenant Organization Boundary Isolation

---

## 1. Security Philosophy & Principles

Cloud Firestore security rules represent the first line of defense against unauthorized data access, privilege escalation, and cross-organization data leakage.

The TalentAI security architecture enforces:
1. **Deny-by-Default:** Every collection and subcollection path rejects read/write unless explicitly authorized. A catch-all `match /{document=**} { allow read, write: if false; }` prevents unmapped paths.
2. **Zero-Trust Identity Assertion:** No client-supplied headers (e.g., `x-user-role`, `x-user-id`) are trusted. All identity, role, and organization assertions must derive from `request.auth.uid` and cryptographically signed claims in `request.auth.token`.
3. **Multi-Tenant Organization Isolation:** Recruiters are bound to their organization (`token.orgId`). They can only query job openings, applications, and decisions created under that specific `orgId`.
4. **Candidate Dossier Confidentiality:** Candidate profiles, resumes, projects, and verifications are strictly private to the candidate owner and administrators. Recruiter access requires server-side validation of active job applications.
5. **Server-Only Mutation Invariant:** Critical workflows (audit logs, AI billing records, hiring decisions, verification outcomes, and hidden test cases) are strictly prohibited from client SDK write (`allow write: if false;`) and require authenticated Admin SDK transactions.

---

## 2. Role Hierarchy & Claim Structure

Custom claims encoded in the Firebase Authentication JWT:

```typescript
interface CustomAuthClaims {
  role: 'candidate' | 'recruiter' | 'admin';
  orgId?: string; // Required for recruiter role
  disabled?: boolean;
}
```

### Authorization Helper Functions

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

function getUserRole() {
  return request.auth.token.role;
}

function isAdmin() {
  return isAuthenticated() && getUserRole() == 'admin';
}

function isRecruiter() {
  return isAuthenticated() && (getUserRole() == 'recruiter' || isAdmin());
}

function isSameOrg(orgId) {
  return isAuthenticated() && request.auth.token.orgId == orgId;
}
```

---

## 3. Collection-by-Collection Security Rules Specification

### 3.1 Users (`/users/{userId}`)
- **Read:** Owner or Admin.
- **Create:** Owner only; role defaults to `candidate` if unspecified. Cannot self-assign `admin` or `recruiter`.
- **Update:** Owner only; fields `role`, `orgId`, and `status` are immutable via client SDK.
- **Delete:** Admin only.

### 3.2 Candidate Profiles (`/candidateProfiles/{candidateId}`)
- **Read:** Candidate owner or Admin. (Arbitrary recruiters cannot query dossiers).
- **Create:** Candidate owner only.
- **Update:** Candidate owner only; verification scores and verified record arrays are immutable by client.
- **Delete:** Admin only.

### 3.3 Organizations (`/organizations/{orgId}`)
- **Read:** Members belonging to `orgId` (`isSameOrg(orgId)`) or Admin.
- **Write:** Admin only.

### 3.4 Job Openings (`/jobOpenings/{jobId}`)
- **Read:** Publicly readable if `status == 'published'`. Draft or archived jobs are restricted to recruiters from the owning organization (`isRecruiter() && isSameOrg(resource.data.orgId)`) or Admin.
- **Create:** Recruiter belonging to the job's organization (`isRecruiter() && isSameOrg(request.resource.data.orgId)`).
- **Update / Delete:** Recruiter belonging to the job's organization or Admin.

### 3.5 Job Applications (`/jobApplications/{applicationId}`)
- **Read:** Applicant candidate (`resource.data.candidateId == request.auth.uid`), recruiters belonging to the job's organization (`isSameOrg(resource.data.orgId)`), or Admin.
- **Create:** Authenticated candidate applying on their own behalf (`request.resource.data.candidateId == request.auth.uid`).
- **Update:** Recruiters belonging to the job's organization or Admin.
- **Delete:** Admin only.

### 3.6 Candidate Private Submissions & Evidence
- **Resumes (`/resumes/{resumeId}`):** Read/write by candidate owner or Admin. Recruiter access is proxied via server-side signed URLs.
- **Projects (`/candidateProjects/{projectId}`):** Read/write by candidate owner or Admin.
- **Verifications (`/verifications/{verificationId}`):** Read by candidate owner or Admin. Writes strictly restricted to Admin (server-side verification).
- **Technical Interviews (`/interviews/{interviewId}`):** Read by candidate owner or Admin. Evaluated strictly via Admin SDK.
- **Coding Submissions (`/codingSubmissions/{submissionId}`):** Read by candidate owner or Admin. Writes strictly restricted to Admin SDK after container execution.

### 3.7 Coding Assessments (`/codingAssessments/{assessmentId}`)
- **Read:** Authenticated users.
- **Write:** Recruiter or Admin.
- **Private Subcollection (`/codingAssessments/{assessmentId}/privateTestCases/{caseId}`):** Read/write strictly restricted to Admin SDK. Hidden test cases are never leaked to client SDKs.

### 3.8 Hiring Decisions (`/hiringDecisions/{decisionId}`)
- **Read:** Recruiters belonging to the decision's organization (`isRecruiter() && isSameOrg(resource.data.orgId)`) or Admin.
- **Write:** `allow write: if false;` (Direct client writes strictly forbidden. All decisions must route through `/api/hiring/decide` via Admin SDK with atomic transaction).

### 3.9 Audit Logs & AI Usage (`/auditLogs/{logId}`, `/aiUsage/{usageId}`)
- **Read:** Admin only.
- **Write:** `allow write: if false;` (Server-side Admin SDK only).

---

## 4. Verification & Testing

The security rules are validated via comprehensive automated test suites (`tests/security/auth-and-zero-trust.test.ts` and `tests/security/auth-gateway.test.ts`) covering:
1. Rejection of unauthenticated requests across all sensitive routes.
2. Rejection of forged header roles (`x-user-role: admin`).
3. Blocking cross-candidate dossier access (IDOR prevention).
4. Prevention of candidate-submitted custom test cases.
5. Organization boundary enforcement on hiring decisions and recruiter job management.
