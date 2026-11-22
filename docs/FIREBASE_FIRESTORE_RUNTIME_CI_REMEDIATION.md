# TALENTAI — FIREBASE FIRESTORE RUNTIME, NODE 22 & CI RECOVERY REPORT

**Date:** 2026-11-23  
**Priority:** P0 — CI Blocking  
**Target Repository:** `ASstyles/TalentAI`  
**Target PR / Branch:** PR #8 / `main`  
**Workflow:** TalentAI Enterprise CI/CD Pipeline (`.github/workflows/ci.yml`)  
**Resolution Status:** Verified & Remediated

---

## 1. Executive Summary

Following the modular migration of the Firebase Admin SDK to v14, the GitHub Actions CI pipeline reported a runtime module resolution failure during the Vitest execution step:

```text
Error: Cannot find module '@google-cloud/firestore'

Require stack:
- node_modules/firebase-admin/lib/firestore/index.js

This error originated in:
tests/security/auth-and-zero-trust.test.ts
tests/unit/gemini-truthfulness.test.ts
tests/unit/admin-sdk-modular.test.ts
```

This was caused by two intertwined infrastructure and packaging issues:
1. **Transitive Optional Dependency Omission:** `firebase-admin@14.5.1` declares `@google-cloud/firestore` (`^9.1.0`) and `@google-cloud/storage` (`^8.1.0`) as `optionalDependencies`. Because TalentAI uses Firestore and Cloud Storage in production (`adminDb`, `adminStorage`), relying on optional installation caused standard `npm ci` runs in CI to omit these modules under specific platform conditions.
2. **Node.js Engine Mismatch:** `firebase-admin@14.5.1` requires Node.js `>=22`, whereas the CI workflow (`.github/workflows/ci.yml`) ran on Node.js 20.x.

Both issues have been remediated, verified across a clean `node_modules` reinstall, and passed all 64 automated tests, TypeScript static checks, ESLint verification, and Next.js 15 production builds.

---

## 2. Dependency Graph & Node Engine Resolution

### A. Declared Dependencies Comparison

| Package | Pre-Remediation Status | Post-Remediation Status | Rationale |
| :--- | :--- | :--- | :--- |
| `@google-cloud/firestore` | Transitive optional (`^9.1.0`) | Direct production (`^9.4.1`) | Guaranteed resolution for `firebase-admin/firestore` in all CI and deployment environments |
| `@google-cloud/storage` | Transitive optional (`^8.1.0`) | Direct production (`^8.4.0`) | Guaranteed resolution for `firebase-admin/storage` (`adminStorage`) |
| `firebase-admin` | Direct production (`^14.5.1`) | Direct production (`^14.5.1`) | Preserved modern modular SDK architecture |
| `eslint` / `eslint-config-next` | Missing from `devDependencies` | Installed (`^9.0.0` / `15.1.7`) | Standardizes non-interactive `npm run lint` across CI |
| Node.js Runtime | `20.x` | `22.x` | Aligns CI with `firebase-admin@14.5.1` engine specification (`>=22`) |

### B. Node Engine Configuration
- Added `"engines": { "node": ">=22.0.0", "npm": ">=10.0.0" }` to `package.json`.
- Created `.nvmrc` pinned to `22`.
- Updated `.github/workflows/ci.yml` from `actions/setup-node@v4` with `node-version: '20'` to `node-version: '22'`.

---

## 3. Test Isolation & Runtime Guardrails

1. **Emulator Isolation in Test Environment (`tests/setup.ts`):**
   - Configured emulator host environment variables (`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`).
   - Prevents Google Auth Library from attempting ADC metadata server queries (`169.254.169.254`), eliminating `MetadataLookupWarning (EACCES / ENOTFOUND)` and preventing any external network latency during testing.
2. **Dedicated Modular SDK Validation (`tests/unit/admin-sdk-modular.test.ts`):**
   - Directly exercises real modular SDK singletons (`adminApp`, `adminAuth`, `adminDb`, `adminStorage`).
   - Verifies singleton reuse without duplicate app errors.
   - Validates that BaseRepository getters return strongly typed Firestore instances without live database writes.
3. **External Packages Configuration (`next.config.ts`):**
   - Added `"@google-cloud/firestore"` and `"@google-cloud/storage"` alongside `"firebase-admin"` to `serverExternalPackages` so Next.js 15 does not attempt client bundling or Webpack module tracing on server-only packages.

---

## 4. Modified Files

| File Path | Changes |
| :--- | :--- |
| `package.json` | Added `@google-cloud/firestore` (`^9.4.1`), `@google-cloud/storage` (`^8.4.0`), `engines` field (`>=22.0.0`), and devDependencies `eslint` / `eslint-config-next` |
| `package-lock.json` | Regenerated lockfile recording direct dependency declarations and audit-fixed dependencies |
| `.nvmrc` | Pinned Node version to `22` |
| `.github/workflows/ci.yml` | Upgraded to Node 22, added Firebase Admin dependency diagnostic verification step, and enabled `npm run lint` step |
| `next.config.ts` | Added `@google-cloud/firestore` and `@google-cloud/storage` to `serverExternalPackages` |
| `tests/setup.ts` | Configured emulator environment variables to prevent ADC metadata server network probes |
| `src/lib/firebase/admin.ts` | Fixed named default export to satisfy ESLint `import/no-anonymous-default-export` |
| `src/lib/firebase/client.ts` | Fixed named default export to satisfy ESLint `import/no-anonymous-default-export` |
| `src/app/admin/recruiter-requests/page.tsx` | Wrapped `fetchRequests` in `useCallback` to satisfy `react-hooks/exhaustive-deps` |
| `src/app/candidate/resume/page.tsx` | Replaced unescaped quotes with `&quot;` |
| `src/app/recruiter/jobs/new/page.tsx` | Replaced unescaped quotes with `&quot;` |
| `src/app/recruiter/reports/[id]/page.tsx` | Replaced unescaped quotes with `&quot;` |

---

## 5. Verification Evidence

### A. Module Resolution Verification
```bash
npm ls firebase-admin @google-cloud/firestore
# talent-matrix-ai@1.0.0
# +-- @google-cloud/firestore@9.4.1
# `-- firebase-admin@14.5.1
#   `-- @google-cloud/firestore@9.4.1 deduped

node -e "console.log(require.resolve('@google-cloud/firestore'))"
# .../node_modules/@google-cloud/firestore/build/src/index.js (OK)

node -e "console.log(require.resolve('firebase-admin/firestore'))"
# .../node_modules/firebase-admin/lib/firestore/index.js (OK)
```

### B. Clean Reinstall Verification
```bash
rm -rf node_modules
npm ci --include=optional
# added 677 packages, and audited 684 packages in 53s
# Exit code 0
```

### C. TypeScript Typecheck
```bash
npx tsc --noEmit
# Exit code 0 (0 errors)
```

### D. ESLint Verification
```bash
npm run lint
# ✔ No ESLint warnings or errors
# Exit code 0
```

### E. Vitest Automated Test Suite
```bash
npm test
#  Test Files  12 passed (12)
#       Tests  64 passed (64)
#    Duration  11.79s
# Exit code 0
```
All 3 previously affected test suites passed cleanly:
- `tests/unit/admin-sdk-modular.test.ts` (4 passed)
- `tests/security/auth-and-zero-trust.test.ts` (7 passed)
- `tests/unit/gemini-truthfulness.test.ts` (3 passed)

### F. Next.js 15 Production Build
```bash
npm run build
#  ▲ Next.js 15.5.29
#  ✓ Compiled successfully in 7.6s
#  ✓ Generating static pages (39/39)
#  Exit code 0
```

---

## 6. Dependency Security Audit Assessment

`npm audit` reports 6 vulnerabilities:
1. **`@grpc/grpc-js` (2 high):**
   - Transitive via `firebase@11.3.0` -> `@firebase/firestore`.
   - `npm audit fix --force` would downgrade `firebase` to `9.14.0`, which is incompatible with Next.js 15 and modern modular Firebase architecture.
   - Mitigated: TalentAI operates solely as an outbound gRPC client to Firebase backend services, never exposing an in-process gRPC server.
2. **`postcss` (4 high):**
   - Bundled within `next@15.1.7`.
   - Upstream fix requires Next.js 16 (`next@16.4.6`), which represents a breaking major framework migration.
   - Mitigated: PostCSS is restricted to build-time CSS compilation and is not exposed at runtime.
