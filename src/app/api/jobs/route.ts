import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { JobService } from '@/lib/services/job-service';
import { authorizeRequest, verifyServerSession } from '@/lib/firebase/auth';

const CreateJobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  specialization: z.string().min(2),
  seniority: z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'staff']),
  status: z.enum(['draft', 'published', 'paused', 'closed']).default('published'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  responsibilities: z.array(z.string()).default([]),
  mandatoryCompetencies: z.array(
    z.object({
      skillId: z.string(),
      name: z.string(),
      category: z.enum(['languages', 'frameworks', 'databases', 'cloud', 'ml', 'systems', 'testing']),
      minLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      weight: z.number().min(1).max(10),
    })
  ).default([]),
  preferredCompetencies: z.array(
    z.object({
      skillId: z.string(),
      name: z.string(),
      category: z.enum(['languages', 'frameworks', 'databases', 'cloud', 'ml', 'systems', 'testing']),
      minLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      weight: z.number().min(1).max(10),
    })
  ).default([]),
  location: z.object({
    type: z.enum(['remote', 'hybrid', 'onsite']),
    locationString: z.string(),
  }),
});

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1].trim() : null;

    let userRole = 'candidate';
    let userOrgId: string | undefined;

    if (token) {
      try {
        const session = await verifyServerSession(token);
        userRole = session.role;
        userOrgId = session.orgId;
      } catch {
        // Fallback to public candidate browsing if token expired/anonymous
      }
    }

    if (userRole === 'admin') {
      const allJobs = await JobService.getJobs();
      return NextResponse.json({ success: true, data: allJobs });
    }

    if (userRole === 'recruiter' && userOrgId) {
      // Recruiter sees published jobs plus their organization's internal/draft jobs
      const allJobs = await JobService.getJobs();
      const filtered = allJobs.filter((j) => j.status === 'published' || j.orgId === userOrgId);
      return NextResponse.json({ success: true, data: filtered });
    }

    // Public / Candidate view: ONLY published jobs are discoverable
    const publishedJobs = await JobService.getJobs({ status: 'published' });
    return NextResponse.json({ success: true, data: publishedJobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only recruiters and admins can create job requisitions
    const session = await authorizeRequest(req, ['recruiter', 'admin']);

    if (session.role === 'recruiter' && !session.orgId) {
      return NextResponse.json(
        { error: 'Forbidden: Recruiter must be assigned to an organization to create jobs' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid job creation payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Enforce organization isolation: orgId is derived from authenticated recruiter session
    const orgId = session.role === 'admin' ? body.orgId || 'org-google-deepmind' : session.orgId!;

    const createdJob = await JobService.createJob({
      ...parsed.data,
      orgId,
      specialization: parsed.data.specialization as any,
    });

    return NextResponse.json({ success: true, data: createdJob }, { status: 201 });
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
