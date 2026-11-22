import { NextRequest, NextResponse } from 'next/server';
import { ApplicationService } from '@/lib/services/application-service';
import { authorizeRequest } from '@/lib/firebase/auth';

export async function GET() {
  try {
    const applications = await ApplicationService.getApplications();
    return NextResponse.json({ success: true, data: applications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await ApplicationService.createApplication(body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await authorizeRequest(req, ['recruiter', 'admin']);
    const { id, status } = await req.json();
    const updated = await ApplicationService.updateApplicationStatus(id, status);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
