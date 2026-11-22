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
 * This is the authoritative source of truth for role-based authorization across frontend & Firestore.
 */
export async function setUserRole(uid: string, role: UserRole, orgId?: string): Promise<void> {
  const claims = {
    role,
    orgId: orgId || null,
  };
  await adminAuth.setCustomUserClaims(uid, claims);
  // Synchronize with the users document in Firestore
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
 * Validates a Bearer token or session cookie and verifies revocation status.
 * Fails closed if token is invalid, expired, or revoked.
 */
export async function verifyServerSession(token: string): Promise<DecodedSession> {
  try {
    // checkRevoked = true enforces checking token revocation against Firebase Auth
    const decoded = await adminAuth.verifyIdToken(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: (decoded.role as UserRole) || 'candidate',
      orgId: (decoded.orgId as string) || undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unauthorized: Invalid, expired, or revoked authentication token: ${message}`);
  }
}

/**
 * Authorizes an incoming Next.js server request against required roles.
 * Enforces Zero Trust:
 * - NO headers like x-user-role or x-user-id
 * - NO fallback default roles
 * - Fails closed if unauthenticated or without valid token
 */
export async function authorizeRequest(
  req: NextRequest,
  allowedRoles: UserRole[] = ['recruiter', 'admin']
): Promise<DecodedSession> {
  const authHeader = req.headers.get('authorization');
  const sessionCookie = req.cookies.get('session')?.value;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split('Bearer ')[1].trim()
    : sessionCookie;

  if (!token) {
    throw new Error('Unauthorized: Missing required authentication token');
  }

  // Verify token cryptographically with revocation check
  const session = await verifyServerSession(token);

  if (!allowedRoles.includes(session.role)) {
    throw new Error(`Forbidden: Role '${session.role}' is not authorized. Required: ${allowedRoles.join(', ')}`);
  }

  return session;
}
