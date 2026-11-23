import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/firebase/auth';
import { adminApp, adminAuth, adminDb } from '@/lib/firebase/admin';
import { classifyFirestoreError } from '@/lib/firebase/firestore-sanitizer';

export const dynamic = 'force-dynamic';

interface DiagnosticResult {
  requestId: string;
  timestamp: string;
  durationMs: number;
  environment: string;
  firebaseAdminInitialized: boolean;
  configuredProjectId: string;
  actualProjectId: string;
  databaseId: string;
  projectMatch: boolean;
  clientEmailMasked: string;
  hasPrivateKey: boolean;
  authOperational: boolean;
  readTested: boolean;
  writeTested: boolean;
  readBackTested: boolean;
  deleteTested: boolean;
  databaseReachable: boolean;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  failureCode?: string;
  sanitizedExplanation?: string;
  remediationGuide?: string;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Enforce admin authorization, with local development bypass for diagnostics
  const isDev = process.env.NODE_ENV === 'development';
  let isAuthorizedAdmin = false;

  try {
    const session = await authorizeRequest(req, ['admin']);
    if (session.role === 'admin') {
      isAuthorizedAdmin = true;
    }
  } catch {
    // If not authenticated as admin, allow ONLY in development mode for initial bootstrap diagnostics
    if (isDev) {
      isAuthorizedAdmin = true;
    }
  }

  if (!isAuthorizedAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Admin authorization required to access database diagnostics' },
      { status: 403 }
    );
  }

  const configuredProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'unconfigured';
  const actualProjectId = adminApp?.options?.projectId || (adminDb as unknown as { projectId?: string })?.projectId || configuredProjectId;
  const databaseId = (adminDb as unknown as { databaseId?: string })?.databaseId || '(default)';
  const projectMatch = Boolean(actualProjectId && configuredProjectId && actualProjectId === configuredProjectId);

  const rawEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const emailDomain = rawEmail.includes('@') ? `@${rawEmail.split('@')[1]}` : 'not-set';
  const clientEmailMasked = rawEmail ? `service-account${emailDomain}` : 'missing';
  const hasPrivateKey = Boolean(process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.length > 50);

  const report: DiagnosticResult = {
    requestId,
    timestamp: new Date().toISOString(),
    durationMs: 0,
    environment: process.env.NODE_ENV || 'development',
    firebaseAdminInitialized: Boolean(adminApp),
    configuredProjectId,
    actualProjectId,
    databaseId,
    projectMatch,
    clientEmailMasked,
    hasPrivateKey,
    authOperational: false,
    readTested: false,
    writeTested: false,
    readBackTested: false,
    deleteTested: false,
    databaseReachable: false,
    status: 'DOWN',
  };

  // 1. Verify Auth Service
  try {
    if (adminAuth) {
      report.authOperational = true;
    }
  } catch {
    report.failureCode = 'AUTH_INITIALIZATION_ERROR';
    report.sanitizedExplanation = 'Firebase Admin Auth failed to initialize.';
    report.durationMs = Date.now() - startTime;
    return NextResponse.json(report, { status: 500 });
  }

  // 2. Test Firestore Read & Write Operations against existing database
  const DIAGNOSTICS_COLLECTION = 'systemDiagnostics';
  const testDocId = `probe-${Date.now()}`;
  const testDocRef = adminDb.collection(DIAGNOSTICS_COLLECTION).doc(testDocId);

  try {
    // Probe 1: Genuine read operation on existing database (empty collection is healthy)
    await adminDb.collection(DIAGNOSTICS_COLLECTION).limit(1).get();
    report.readTested = true;

    // Probe 2: Controlled temporary write
    await testDocRef.set({
      testId: testDocId,
      timestamp: new Date().toISOString(),
      probe: 'health-verification',
    });
    report.writeTested = true;

    // Probe 3: Controlled read-back
    const snap = await testDocRef.get();
    report.readBackTested = Boolean(snap.exists && snap.data()?.testId === testDocId);

    // Probe 4: Immediate cleanup
    await testDocRef.delete();
    report.deleteTested = true;

    report.databaseReachable = true;
    report.status = 'HEALTHY';
    report.durationMs = Date.now() - startTime;

    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    // Attempt best-effort cleanup of test document if write succeeded before error
    if (report.writeTested && !report.deleteTested) {
      try {
        await testDocRef.delete();
        report.deleteTested = true;
      } catch {
        // Ignore secondary delete failure
      }
    }

    const classified = classifyFirestoreError(err, configuredProjectId);
    report.databaseReachable = report.readTested;
    report.status = report.readTested ? 'DEGRADED' : 'DOWN';
    report.failureCode = classified.code;
    report.sanitizedExplanation = classified.message;
    report.remediationGuide = classified.diagnosticHelp;
    report.durationMs = Date.now() - startTime;

    console.error(`[DatabaseDiagnostics] Failure detected [${requestId}]:`, {
      code: classified.code,
      message: classified.message,
      remediation: classified.diagnosticHelp,
    });

    return NextResponse.json(report, { status: 503 });
  }
}
