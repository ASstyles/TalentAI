import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { JobService } from '@/lib/services/job-service';
import { authorizeRequest, verifyServerSession } from '@/lib/firebase/auth';

const UpdateJobSchema = z.object({
  title: z.string().min(3).optional(),
  specialization: z.string().min(2).optional(),
  seniority: z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'staff']).optional(),
  status: z.enum(['draft', 'published', 'paused', 'closed']).optional(),
  description: z.string().min(10).optional(),
  responsibilities: z.array(z.string()).optional(),
  mandatoryCompetencies: z
    .array(
      z.object({
        skillId: z.string(),
        name: z.string(),
        category: z.enum(['languages', 'frameworks', 'databases', 'cloud', 'ml', 'systems', 'testing']),
        minLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
        weight: z.number().min(1).max(10),
      })
    )
    .optional(),
  preferredCompetencies: z
    .array(
      z.object({
        skillId: z.string(),
        name: z.string(),
        category: z.enum(['languages', 'frameworks', 'databases', 'cloud', 'ml', 'systems', 'testing']),
        minLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
        weight: z.number().min(1).max(10),
      })
    )
    .optional(),
  location: z
    .object({
      type: z.enum(['remote', 'hybrid', 'onsite']),
      locationString: z.string(),
    })
    .optional(),
  salaryRange: z
    .object({
      min: z.number().min(0),
      max: z.number().min(0),
      currency: z.string().default('USD'),
    })
    .optional(),
  applicationDeadline: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await JobService.getJobById(id);
    if (!job) {
      return NextResponse.json({ error: `Job ${id} not found` }, { status: 404 });
    }

    // Published jobs are visible to anyone
    if (job.status === 'published') {
      return NextResponse.json({ success: true, data: job });
    }

    // Draft / paused / closed jobs require authentication from the owning organization or admin
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1].trim() : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Position is not publicly accessible' }, { status: 401 });
    }

    const session = await verifyServerSession(token);
    if (session.role === 'admin' || (session.role === 'recruiter' && session.orgId === job.orgId)) {
      return NextResponse.json({ success: true, data: job });
    }

    return NextResponse.json({ error: 'Forbidden: You do not have access to this unpublished requisition' }, { status: 403 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authorizeRequest(req, ['recruiter', 'admin']);
    const { id } = await params;

    const existing = await JobService.getJobById(id);
    if (!existing) {
      return NextResponse.json({ error: `Job ${id} not found` }, { status: 404 });
    }

    // Multi-tenant boundary check: recruiter can only edit jobs from their own organization
    if (session.role === 'recruiter' && existing.orgId !== session.orgId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify job openings for another organization' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update payload', details: parsed.error.issues }, { status: 400 });
    }

    const updated = await JobService.updateJob(id, parsed.data as any);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized') ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authorizeRequest(req, ['recruiter', 'admin']);
    const { id } = await params;

    const existing = await JobService.getJobById(id);
    if (!existing) {
      return NextResponse.json({ error: `Job ${id} not found` }, { status: 404 });
    }

    if (session.role === 'recruiter' && existing.orgId !== session.orgId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete job openings for another organization' },
        { status: 403 }
      );
    }

    await JobService.deleteJob(id);
    return NextResponse.json({ success: true, message: `Job ${id} deleted successfully` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized') ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
