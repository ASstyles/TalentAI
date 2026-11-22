import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/firebase/auth';
import { AuditService } from '@/lib/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    await authorizeRequest(req, ['admin', 'recruiter']);
    const logs = await AuditService.getLogs();
    return NextResponse.json({ success: true, data: logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
