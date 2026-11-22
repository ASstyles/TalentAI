import { NextRequest, NextResponse } from 'next/server';
import { verifyIdTokenSession, verifyCookieSession, setUserRole, DecodedSession } from '@/lib/firebase/auth';
import { adminAuth } from '@/lib/firebase/admin';
import { UserRepository } from '@/lib/repositories/user-repository';
import { CandidateRepository } from '@/lib/repositories/candidate-repository';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    let idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1].trim() : null;

    if (!idToken) {
      try {
        const body = await req.json();
        idToken = body.idToken || null;
      } catch {
        // Fallback to cookie check
      }
    }

    const sessionCookie = req.cookies.get('session')?.value || null;

    if (!idToken && !sessionCookie) {
      return NextResponse.json({ error: 'Missing authentication token' }, { status: 401 });
    }

    // Cryptographic verification: verify ID token if provided; otherwise verify session cookie
    let session: DecodedSession;
    if (idToken) {
      session = await verifyIdTokenSession(idToken);
    } else {
      session = await verifyCookieSession(sessionCookie!);
    }

    // Retrieve user record from Firestore
    let userDoc = await UserRepository.getById(session.uid);

    // If user has no custom claim role yet (e.g. initial Google sign-in), provision candidate role
    let effectiveRole = session.role;
    if (!effectiveRole || (effectiveRole !== 'candidate' && effectiveRole !== 'recruiter' && effectiveRole !== 'admin')) {
      effectiveRole = 'candidate';
      await setUserRole(session.uid, 'candidate');
      await CandidateRepository.saveProfile(session.uid, {
        headline: 'Software Engineer',
        summary: '',
        yearsOfExperience: 0,
        overallVerificationScore: 0,
      });
    }

    if (!userDoc) {
      let displayName = session.email?.split('@')[0] || 'User';
      try {
        const authUser = await adminAuth.getUser(session.uid);
        if (authUser.displayName) displayName = authUser.displayName;
      } catch {
        // Fallback to email username if getUser is offline or mocked
      }

      userDoc = await UserRepository.createOrUpdate(session.uid, {
        email: session.email || '',
        displayName,
        role: effectiveRole,
        status: 'active',
        orgId: session.orgId,
      });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        uid: session.uid,
        email: session.email || userDoc.email,
        displayName: userDoc.displayName,
        role: effectiveRole,
        orgId: session.orgId || userDoc.orgId || null,
      },
    });

    // Generate genuine Firebase Session Cookie if ID token was supplied
    if (idToken) {
      const expiresInMs = 60 * 60 * 24 * 7 * 1000; // 7 days
      let cookieValue = idToken;
      try {
        cookieValue = await adminAuth.createSessionCookie(idToken, { expiresIn: expiresInMs });
      } catch {
        // In local/emulator tests, retain idToken if createSessionCookie is not supported
      }

      response.cookies.set('session', cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
