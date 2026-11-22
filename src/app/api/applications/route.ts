import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApplicationService } from '@/lib/services/application-service';
import { JobService } from '@/lib/services/job-service';
import { authorizeRequest } from '@/lib/firebase/auth';

const CreateApplicationSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
  resumeId: z.string().min(1, 'resumeId is required'),
  candidateName: z.string().min(1).optional(),
  candidateEmail: z.string().email().optional(),
});

const UpdateStatusSchema = z.object({
  id: z.string().min(1, 'Application id is required'),
  status: z.enum([
    'applied',
    'screening',
    'interviewing',
    'assessing',
    'review',
    'offered',
    'rejected',
  ]),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate caller (candidates, recruiters, or admins)
    const session = await authorizeRequest(req, ['candidate', 'recruiter', 'admin']);

    if (session.role === 'candidate') {
      // Candidate can only view their own applications
      const apps = await ApplicationService.getApplications({ candidateId: session.uid });
      return NextResponse.json({ success: true, data: apps });
    }

    if (session.role === 'recruiter') {
      // Recruiter can only view applications for their organization
      if (!session.orgId) {
        return NextResponse.json(
          { error: 'Forbidden: Recruiter is not associated with an organization' },
          { status: 403 }
        );
      }
      const apps = await ApplicationService.getApplications({ orgId: session.orgId });
      return NextResponse.json({ success: true, data: apps });
    }

    // Admin can view all or filter by query params
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get('candidateId') || undefined;
    const orgId = searchParams.get('orgId') || undefined;
    const jobId = searchParams.get('jobId') || undefined;

    const apps = await ApplicationService.getApplications({ candidateId, orgId, jobId });
    return NextResponse.json({ success: true, data: apps });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized')
      ? 401
      : message.startsWith('Forbidden')
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only authenticated candidates can submit applications
    const session = await authorizeRequest(req, ['candidate']);

    const body = await req.json();
    const parsed = CreateApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid application submission payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { jobId, resumeId, candidateName, candidateEmail } = parsed.data;

    // Verify job exists and is open for applications
    const job = await JobService.getJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job opening not found' }, { status: 404 });
    }
    if (job.status !== 'published') {
      return NextResponse.json(
        { error: 'Cannot apply: This position is not currently accepting applications' },
        { status: 400 }
      );
    }

    const created = await ApplicationService.createApplication({
      jobId,
      jobTitle: job.title,
      orgId: job.orgId,
      candidateId: session.uid, // Derived strictly from verified session token
      candidateName: candidateName || session.email || 'Applicant',
      candidateEmail: candidateEmail || session.email || '',
      resumeId,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized')
      ? 401
      : message.startsWith('Forbidden')
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Only authorized recruiters or admins can update application statuses
    const session = await authorizeRequest(req, ['recruiter', 'admin']);

    const body = await req.json();
    const parsed = UpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update status payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, status } = parsed.data;

    // Verify existing application and organization relationship
    const existing = await ApplicationService.getApplicationById(id);
    if (!existing) {
      return NextResponse.json({ error: `Application ${id} not found` }, { status: 404 });
    }

    // Organization-level boundary check
    if (session.role === 'recruiter' && existing.orgId !== session.orgId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have authorization to modify applications for another organization' },
        { status: 403 }
      );
    }

    const updated = await ApplicationService.updateApplicationStatus(id, status);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized')
      ? 401
      : message.startsWith('Forbidden')
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
