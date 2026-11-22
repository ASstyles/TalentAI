import { NextRequest, NextResponse } from 'next/server';
import { JobService } from '@/lib/services/job-service';
import { authorizeRequest } from '@/lib/firebase/auth';

export async function GET() {
  try {
    const jobs = await JobService.getJobs();
    return NextResponse.json({ success: true, data: jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await authorizeRequest(req, ['recruiter', 'admin']);
    const body = await req.json();
    const createdJob = await JobService.createJob(body);
    return NextResponse.json({ success: true, data: createdJob }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
