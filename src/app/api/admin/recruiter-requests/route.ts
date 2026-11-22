import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, setUserRole } from '@/lib/firebase/auth';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AuditRepository } from '@/lib/repositories/audit-repository';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

// GET: List all recruiter access requests (Admin Only)
export async function GET(req: NextRequest) {
  try {
    const session = await authorizeRequest(req, ['admin']);

    const snap = await adminDb
      .collection('recruiterAccessRequests')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const requests = snap.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json({ success: true, data: requests });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized') ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST: Approve or reject recruiter access request (Admin Only)
export async function POST(req: NextRequest) {
  try {
    const session = await authorizeRequest(req, ['admin']);
    const body = await req.json();
    const { requestId, action } = body;

    if (!requestId || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { error: 'Invalid request: requestId and action (approve | reject) are required' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('recruiterAccessRequests').doc(requestId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Recruiter access request not found' }, { status: 404 });
    }

    const reqData = docSnap.data()!;
    const now = new Date().toISOString();

    if (action === 'approve') {
      // 1. Create or associate organization
      const orgDomain = reqData.workEmail.split('@')[1];
      const orgId = `org-${orgDomain.replace(/[^a-zA-Z0-9]/g, '-')}`;

      await adminDb.collection('organizations').doc(orgId).set(
        {
          id: orgId,
          name: reqData.companyName,
          domain: orgDomain,
          tier: 'enterprise',
          settings: { requireIdentityVerification: true, allowVoiceInterview: false },
          updatedAt: now,
        },
        { merge: true }
      );

      // 2. Find or provision user in Firebase Auth
      let targetUid = reqData.userId;
      if (!targetUid) {
        try {
          const existingUser = await adminAuth.getUserByEmail(reqData.workEmail);
          targetUid = existingUser.uid;
        } catch {
          // Create user placeholder with random temporary password
          const newUser = await adminAuth.createUser({
            email: reqData.workEmail,
            displayName: reqData.fullName,
            emailVerified: true,
          });
          targetUid = newUser.uid;
        }
      }

      // 3. Cryptographically set recruiter custom claims
      await setUserRole(targetUid, 'recruiter', orgId);

      // 4. Create recruiter profile
      await adminDb.collection('recruiterProfiles').doc(targetUid).set({
        id: targetUid,
        userId: targetUid,
        orgId,
        title: reqData.jobTitle,
        department: 'Talent Acquisition & Engineering Hiring',
        permissions: ['view_pipeline', 'edit_jobs', 'record_decisions', 'override_evaluations'],
        createdAt: now,
      });

      // 5. Update request status to approved
      await docRef.update({
        status: 'approved',
        reviewedBy: session.uid,
        reviewedAt: now,
        orgId,
      });

      // 6. Record immutable audit log
      await AuditRepository.recordLog({
        actor: `Admin ${session.uid}`,
        actorId: session.uid,
        role: 'admin',
        action: 'APPROVE_RECRUITER_ACCESS',
        target: `User: ${targetUid} (Company: ${reqData.companyName}, Org: ${orgId})`,
        details: `Approved recruiter privileges for ${reqData.fullName} (${reqData.workEmail}).`,
      });

      return NextResponse.json({
        success: true,
        message: `Recruiter access approved. Role assigned with organization ${orgId}.`,
      });
    } else {
      // Rejection branch
      await docRef.update({
        status: 'rejected',
        reviewedBy: session.uid,
        reviewedAt: now,
      });

      await AuditRepository.recordLog({
        actor: `Admin ${session.uid}`,
        actorId: session.uid,
        role: 'admin',
        action: 'REJECT_RECRUITER_ACCESS',
        target: `Request: ${requestId} (${reqData.workEmail})`,
        details: `Rejected recruiter access request for ${reqData.fullName} (${reqData.companyName}).`,
      });

      return NextResponse.json({
        success: true,
        message: 'Recruiter access request rejected.',
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized') ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
