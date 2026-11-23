import { NextRequest, NextResponse } from 'next/server';
import { verifyIdTokenSession, verifyCookieSession, setUserRole, DecodedSession } from '@/lib/firebase/auth';
import { adminAuth } from '@/lib/firebase/admin';
import { UserRepository } from '@/lib/repositories/user-repository';
import { CandidateRepository } from '@/lib/repositories/candidate-repository';
import { PersistenceError, classifyFirestoreError } from '@/lib/firebase/firestore-sanitizer';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const authHeader = req.headers.get('authorization');
    let idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1].trim() : null;

    if (!idToken) {
      try {
        const body = await req.json();
        idToken = body.idToken || null;
      } catch {
        // Fallback to checking session cookie
      }
    }

    const sessionCookie = req.cookies.get('session')?.value || null;

    if (!idToken && !sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing authentication token or session cookie' },
        { status: 401 }
      );
    }

    let session: DecodedSession;
    let verifiedVia: 'id_token' | 'session_cookie' = 'id_token';

    if (idToken) {
      session = await verifyIdTokenSession(idToken);
      verifiedVia = 'id_token';
    } else {
      session = await verifyCookieSession(sessionCookie!);
      verifiedVia = 'session_cookie';
    }

    // Retrieve user record from persistent Firestore
    let userDoc: Awaited<ReturnType<typeof UserRepository.getById>> = null;
    let claimsAssigned = false;

    try {
      userDoc = await UserRepository.getById(session.uid);
    } catch (dbErr: unknown) {
      const errorObj = dbErr instanceof PersistenceError ? dbErr : classifyFirestoreError(dbErr, process.env.FIREBASE_PROJECT_ID);
      console.error('[SessionRoute] Persistent database failure during user lookup:', {
        code: errorObj.code,
        message: errorObj.message,
        diagnosticHelp: errorObj.diagnosticHelp,
      });

      const userMessage =
        errorObj.code === 'FIRESTORE_API_DISABLED'
          ? 'Database not initialized: Cloud Firestore API is disabled for this project. Please contact administrator.'
          : errorObj.code === 'FIRESTORE_PERMISSION_DENIED'
          ? 'Database authorization error: Service account permissions require configuration.'
          : 'Database unavailable: Unable to verify account permissions. Please retry.';

      return NextResponse.json(
        {
          success: false,
          error: userMessage,
          code: errorObj.code,
          ...(process.env.NODE_ENV === 'development' && errorObj.diagnosticHelp
            ? { diagnosticHelp: errorObj.diagnosticHelp }
            : {}),
        },
        { status: 503 }
      );
    }

    // Phase 1 Problem D Fix: Explicit trusted candidate provisioning for eligible new accounts
    if (!userDoc) {
      let displayName = session.email?.split('@')[0] || 'User';
      try {
        const authUser = await adminAuth.getUser(session.uid);
        if (authUser.displayName) displayName = authUser.displayName;
      } catch {
        // Fallback to email username if getUser is offline or mock emulator
      }

      // If token already has verified recruiter or admin claims, preserve it; otherwise provision candidate
      const roleToAssign = (session.role === 'recruiter' || session.role === 'admin') ? session.role : 'candidate';
      if (!session.role) {
        try {
          await setUserRole(session.uid, 'candidate');
          claimsAssigned = true;
        } catch (claimsErr) {
          console.warn('[SessionRoute] setUserRole warning (offline emulator/mock):', claimsErr);
        }
      }

      const newUserData: { email: string; displayName: string; role: typeof roleToAssign; status: 'active'; orgId?: string } = {
        email: session.email || '',
        displayName,
        role: roleToAssign,
        status: 'active',
      };

      if (roleToAssign === 'recruiter' && session.orgId) {
        newUserData.orgId = session.orgId;
      }

      userDoc = await UserRepository.createOrUpdate(session.uid, newUserData);

      if (roleToAssign === 'candidate') {
        await CandidateRepository.saveProfile(session.uid, {
          headline: 'Software Engineer',
          summary: '',
          yearsOfExperience: 0,
          overallVerificationScore: 0,
        }).catch(() => null);
      }
    } else {
      // Existing accounts: NEVER silently upgrade. Reconcile claims if divergent.
      if (session.role !== userDoc.role) {
        try {
          await adminAuth.setCustomUserClaims(session.uid, {
            role: userDoc.role,
            orgId: userDoc.role === 'recruiter' && userDoc.orgId ? userDoc.orgId : null,
          });
          claimsAssigned = true;
        } catch (claimsErr) {
          console.warn('[SessionRoute] setCustomUserClaims warning:', claimsErr);
        }
      }
    }

    const effectiveRole = userDoc.role;
    const effectiveOrgId = userDoc.orgId || null;

    const response = NextResponse.json({
      success: true,
      user: {
        uid: session.uid,
        email: session.email || userDoc.email,
        displayName: userDoc.displayName,
        role: effectiveRole,
        orgId: effectiveOrgId,
      },
      claimsAssigned,
      verifiedVia,
    });

    // Generate genuine Firebase Session Cookie ONLY when ID token was supplied
    if (idToken) {
      const expiresInMs = 60 * 60 * 24 * 7 * 1000; // 7 days in milliseconds
      try {
        const cookieValue = await adminAuth.createSessionCookie(idToken, { expiresIn: expiresInMs });

        response.cookies.set('session', cookieValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
        });
      } catch (cookieErr: unknown) {
        const message = cookieErr instanceof Error ? cookieErr.message : String(cookieErr);
        console.error('[SessionRoute] Firebase createSessionCookie failed:', message);
        // Phase 1 Problem C Fix: NEVER fall back to ID token as session cookie!
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed: Could not issue genuine session cookie. Please retry.',
          },
          { status: 401 }
        );
      }
    }

    const duration = Date.now() - startTime;
    response.headers.set('Server-Timing', `session;dur=${duration}`);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[SessionRoute] Verification error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 401 }
    );
  }
}
