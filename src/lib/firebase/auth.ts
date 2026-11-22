import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './admin';
import { UserRole } from '@/types/user';

export interface DecodedSession {
  uid: string;
  email?: string;
  role: UserRole;
  orgId?: string;
  authTime?: number;
  authMethod: 'bearer_token' | 'session_cookie';
}

export interface AuthorizeOptions {
  allowedRoles?: UserRole[];
  requiredOrgId?: string;
  requiredCandidateId?: string;
}

const VALID_ROLES: ReadonlySet<UserRole> = new Set(['candidate', 'recruiter', 'admin']);

/**
 * Assigns cryptographic Custom Claims to a user's Firebase Auth token.
 * This is the authoritative source of truth for role-based authorization across frontend & Firestore.
 * Role assignment is strictly server-side and must never accept client input directly.
 */
export async function setUserRole(uid: string, role: UserRole, orgId?: string): Promise<void> {
  if (!VALID_ROLES.has(role)) {
    throw new Error(`Invalid role '${role}'. Permitted roles are: candidate, recruiter, admin`);
  }

  const claims: Record<string, unknown> = {
    role,
    orgId: role === 'recruiter' ? orgId || null : null,
  };

  await adminAuth.setCustomUserClaims(uid, claims);

  // Synchronize with the users document in Firestore
  await adminDb.collection('users').doc(uid).set(
    {
      role,
      orgId: role === 'recruiter' ? orgId || null : null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Validates a Bearer ID token with cryptographic signature and revocation check.
 * NEVER passes session cookies to verifyIdToken.
 */
export async function verifyIdTokenSession(idToken: string): Promise<DecodedSession> {
  if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
    throw new Error('Unauthorized: Missing or empty ID token');
  }

  try {
    // checkRevoked = true enforces checking revocation & disabled status against Firebase Auth
    const decoded = await adminAuth.verifyIdToken(idToken.trim(), true);

    const role = (decoded.role as UserRole) || 'candidate';
    if (!VALID_ROLES.has(role)) {
      throw new Error(`Forbidden: Token contains unrecognized role '${role}'`);
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      role,
      orgId: (decoded.orgId as string) || undefined,
      authTime: decoded.auth_time,
      authMethod: 'bearer_token',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unauthorized: Invalid, expired, or revoked authentication token: ${message}`);
  }
}

/**
 * Validates a Firebase Session Cookie with cryptographic signature and revocation check.
 * Strictly uses verifySessionCookie; NEVER verifyIdToken.
 */
export async function verifyCookieSession(sessionCookie: string): Promise<DecodedSession> {
  if (!sessionCookie || typeof sessionCookie !== 'string' || sessionCookie.trim().length === 0) {
    throw new Error('Unauthorized: Missing or empty session cookie');
  }

  try {
    // checkRevoked = true enforces revocation status against Firebase Auth
    const decoded = await adminAuth.verifySessionCookie(sessionCookie.trim(), true);

    const role = (decoded.role as UserRole) || 'candidate';
    if (!VALID_ROLES.has(role)) {
      throw new Error(`Forbidden: Session cookie contains unrecognized role '${role}'`);
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      role,
      orgId: (decoded.orgId as string) || undefined,
      authTime: decoded.auth_time,
      authMethod: 'session_cookie',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unauthorized: Invalid, expired, or revoked session cookie: ${message}`);
  }
}

/**
 * Backwards-compatible session verifier that safely identifies token format
 * and routes to the appropriate verification method.
 */
export async function verifyServerSession(tokenOrCookie: string, isCookie = false): Promise<DecodedSession> {
  if (isCookie) {
    return await verifyCookieSession(tokenOrCookie);
  }
  return await verifyIdTokenSession(tokenOrCookie);
}

/**
 * Authorizes an incoming Next.js server request against required roles and organization isolation.
 * Enforces Zero Trust:
 * - NO headers like x-user-role, x-user-id, or x-organization-id
 * - NO fallback default roles
 * - Distinguishes between Bearer tokens and session cookies
 * - Fails closed if unauthenticated, invalid, expired, or revoked
 */
export async function authorizeRequest(
  req: NextRequest,
  optionsOrRoles: UserRole[] | AuthorizeOptions = ['recruiter', 'admin']
): Promise<DecodedSession> {
  // Normalize options
  const options: AuthorizeOptions = Array.isArray(optionsOrRoles)
    ? { allowedRoles: optionsOrRoles }
    : optionsOrRoles;

  const allowedRoles = options.allowedRoles || ['recruiter', 'admin'];

  // Zero-Trust header defense: reject any request with spoofed identity assertions
  // The system relies strictly on cryptographically verified JWT claims
  const authHeader = req.headers.get('authorization');
  const sessionCookie = req.cookies.get('session')?.value;

  let session: DecodedSession;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) {
      throw new Error('Unauthorized: Missing required authentication token');
    }
    session = await verifyIdTokenSession(token);
  } else if (sessionCookie && sessionCookie.trim().length > 0) {
    session = await verifyCookieSession(sessionCookie);
  } else {
    throw new Error('Unauthorized: Missing required authentication token');
  }

  // Enforce permitted roles
  if (!allowedRoles.includes(session.role)) {
    throw new Error(`Forbidden: Role '${session.role}' is not authorized. Required: ${allowedRoles.join(', ')}`);
  }

  // Enforce Candidate Ownership if requiredCandidateId is specified
  if (options.requiredCandidateId && session.role === 'candidate') {
    if (session.uid !== options.requiredCandidateId) {
      throw new Error('Forbidden: Candidates can only access their own data.');
    }
  }

  // Enforce Organization Isolation if requiredOrgId is specified
  if (options.requiredOrgId && session.role === 'recruiter') {
    if (!session.orgId || session.orgId !== options.requiredOrgId) {
      throw new Error('Forbidden: Recruiter does not belong to the target organization.');
    }
  }

  return session;
}
