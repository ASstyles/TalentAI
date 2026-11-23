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
  projectId: string;
  clientEmailMasked: string;
  hasPrivateKey: boolean;
  authOperational: boolean;
  readTested: boolean;
  writeTested: boolean;
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

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'unconfigured';
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
    projectId,
    clientEmailMasked,
    hasPrivateKey,
    authOperational: false,
    readTested: false,
    writeTested: false,
    databaseReachable: false,
    status: 'DOWN',
  };

  // 1. Verify Auth Service
  try {
    if (adminAuth) {
      report.authOperational = true;
    }
  } catch (authErr) {
    report.failureCode = 'AUTH_INITIALIZATION_ERROR';
    report.sanitizedExplanation = 'Firebase Admin Auth failed to initialize.';
    report.durationMs = Date.now() - startTime;
    return NextResponse.json(report, { status: 500 });
  }

  // 2. Test Firestore Read & Write Operations
  const DIAGNOSTICS_COLLECTION = 'systemDiagnostics';
  const testDocId = `probe-${Date.now()}`;

  try {
    // Probe 1: Read operation
    await adminDb.collection(DIAGNOSTICS_COLLECTION).limit(1).get();
    report.readTested = true;

    // Probe 2: Write & Delete operation
    const testDocRef = adminDb.collection(DIAGNOSTICS_COLLECTION).doc(testDocId);
    await testDocRef.set({
      testId: testDocId,
      timestamp: new Date().toISOString(),
      probe: 'health-verification',
    });
    report.writeTested = true;

    // Cleanup immediately
    await testDocRef.delete();

    report.databaseReachable = true;
    report.status = 'HEALTHY';
    report.durationMs = Date.now() - startTime;

    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    const classified = classifyFirestoreError(err, projectId);
    report.databaseReachable = false;
    report.status = 'DOWN';
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
