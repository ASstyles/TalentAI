# TALENTAI ENTERPRISE TESTING STRATEGY & QUALITY ASSURANCE

**Document Reference:** `DOC-QA-007`  
**System:** TalentAI Automated Verification Harness  
**Test Framework:** Vitest 4.1.x (`tests/`)  
**Target Coverage:** >85% Statements, 100% Security Invariants  
**Status:** 12 Test Files Passed / 65 Total Tests Passing

---

## 1. Testing Philosophy & Taxonomy

In an enterprise recruitment intelligence platform, evaluation errors lead to biased hiring, legal non-compliance, and security breaches. Testing cannot be an afterthought; it must enforce invariant correctness across four discrete tiers:

```
                  ┌──────────────────────────────┐
                  │ Tier 4: E2E Workflow Tests   │
                  │ (Complete Candidate Lifecycle)│
                  └──────────────┬───────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │ Tier 3: Zero-Trust Security │
                  │ (Auth, ABAC, Sandbox Caps)   │
                  └──────────────┬──────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │ Tier 2: Mathematical Engine │
                  │ (Scoring, Invariant Proofs) │
                  └──────────────┬──────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │ Tier 1: Unit & SDK Isolation│
                  │ (Modular Admin, Repositories)│
                  └─────────────────────────────┘
```

---

## 2. Test Suite Architecture & Inventory

### 2.1 Unit & Modular SDK Tests
- `tests/unit/admin-sdk-modular.test.ts`: Validates that `adminAuth`, `adminDb`, `adminStorage` load and execute modular methods without legacy namespace leakage.
- `tests/unit/persistence-repositories.test.ts`: Exercises repository converters (`ApplicationRepository`, `JobRepository`, `HiringDecisionRepository`, `AuditRepository`, `AssessmentRepository`) with full typed document mapping.
- `tests/unit/firebase-lazy-init.test.ts`: Proves that importing client modules does not trigger Firebase initialization during static compilation.

### 2.2 Mathematical Engine & Truthfulness Tests
- `tests/unit/scoring.test.ts`: Verifies mathematical invariants:
  - Claims alone cannot manufacture demonstrated score.
  - Multi-tier evidence produces weighted deterministic demonstrated score.
  - Verification records monotonically increase confidence while reducing uncertainty.
- `tests/unit/matching.test.ts`: Tests role compatibility benchmarks across 16 engineering roles with alias normalization.
- `tests/unit/gemini-truthfulness.test.ts`: Verifies strict adherence to grounded context and rejection of hallucinatory credentials.

### 2.3 Zero-Trust Security & Boundary Tests
- `tests/security/auth-gateway.test.ts`: Tests candidate registration, password entropy enforcement, role authorization barriers, and token issuance.
- `tests/security/auth-and-zero-trust.test.ts`: Validates:
  - Total rejection of client role spoofing headers (`x-user-role`).
  - Strict failure closed on missing or forged tokens.
  - Prohibition of candidate-submitted custom test cases (DEF-013).
  - Prevention of cross-candidate role recommendation generation (DEF-014 IDOR).
- `tests/security/sanitization.test.ts`: XSS, SQL/NoSQL injection filtering, and Markdown output escaping.

### 2.4 End-to-End Recruitment Workflow
- `tests/e2e/recruitment-workflow.test.ts`: 14-step simulated hiring pipeline:
  1. Candidate registration and profile instantiation.
  2. Resume upload and structured extraction.
  3. Competency profile calculation.
  4. Role recommendation generation.
  5. Recruiter job publishing.
  6. Application submission.
  7. Third-party credential verification.
  8. AI technical interview.
  9. Adaptive question evaluation.
  10. Bounded sandboxed algorithmic execution.
  11. Multi-tier competency aggregation.
  12. Recruiter candidate review.
  13. Transactional hiring decision.
  14. Immutable audit trail verification.

---

## 3. Continuous Execution Commands

```bash
# Run complete test suite once
npm test

# Run tests in watch mode during development
npx vitest

# Run specific security suite
npx vitest run tests/security/auth-and-zero-trust.test.ts

# Type-check test files without compiling
npx tsc --noEmit
```
