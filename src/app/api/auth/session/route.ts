import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession, setUserRole } from '@/lib/firebase/auth';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
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
        // Fallback to cookie
      }
    }

    if (!idToken) {
      idToken = req.cookies.get('session')?.value || null;
    }

    if (!idToken) {
      return NextResponse.json({ error: 'Missing authentication token' }, { status: 401 });
    }

    // Cryptographic token verification with revocation check
    const session = await verifyServerSession(idToken);

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

    // Set secure HTTP-only session cookie
    response.cookies.set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
