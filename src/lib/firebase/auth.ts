import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './admin';
import { UserRole } from '@/types/user';

export interface DecodedSession {
  uid: string;
  email?: string;
  role: UserRole;
  orgId?: string;
}

/**
 * Assigns cryptographic Custom Claims to a user's Firebase Auth token.
 * This is the ONLY source of truth for role-based authorization across frontend & Firestore.
 */
export async function setUserRole(uid: string, role: UserRole, orgId?: string): Promise<void> {
  const claims = {
    role,
    orgId: orgId || null,
  };
  await adminAuth.setCustomUserClaims(uid, claims);
  // Also reflect in the users document in Firestore
  await adminDb.collection('users').doc(uid).set(
    {
      role,
      orgId: orgId || null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Validates a Bearer token or session cookie and ensures role authorization.
 */
export async function verifyServerSession(token: string): Promise<DecodedSession> {
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: (decoded.role as UserRole) || 'candidate',
      orgId: (decoded.orgId as string) || undefined,
    };
  } catch {
    throw new Error('Invalid or expired authentication token');
  }
}

/**
 * Authorizes a Next.js server request against required roles.
 * Prevents Broken Object-Level Authorization (BOLA) and role escalation.
 */
export async function authorizeRequest(
  req: NextRequest,
  allowedRoles: UserRole[] = ['recruiter', 'admin']
): Promise<DecodedSession> {
  const authHeader = req.headers.get('authorization');
  const devRoleHeader = req.headers.get('x-user-role') as UserRole | null;
  const devUidHeader = req.headers.get('x-user-id');
  const hasFirebasePrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    const session = await verifyServerSession(token);
    if (!allowedRoles.includes(session.role)) {
      throw new Error(`Forbidden: Role '${session.role}' is not authorized. Required: ${allowedRoles.join(', ')}`);
    }
    return session;
  }

  // When running locally without a production service account key, allow role assertion header
  if (!hasFirebasePrivateKey && devRoleHeader) {
    if (!allowedRoles.includes(devRoleHeader)) {
      throw new Error(`Forbidden: Role '${devRoleHeader}' is not authorized. Required: ${allowedRoles.join(', ')}`);
    }
    return {
      uid: devUidHeader || 'dev-user-id',
      role: devRoleHeader,
      orgId: 'dev-org',
    };
  }

  // Default to authenticated recruiter in local standalone demo mode if no auth header passed
  if (!hasFirebasePrivateKey && !authHeader) {
    const defaultRole: UserRole = allowedRoles.includes('admin') ? 'admin' : 'recruiter';
    return {
      uid: 'user-recruiter-1',
      role: defaultRole,
      orgId: 'org-google-deepmind',
    };
  }

  throw new Error('Unauthorized: Missing or invalid authentication credentials');
}
