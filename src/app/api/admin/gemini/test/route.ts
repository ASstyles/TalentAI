import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/firebase/auth';
import { runGeminiDiagnostics } from '@/lib/gemini/connectivity';

export async function GET(req: NextRequest) {
  try {
    // Only administrators and recruiters can run diagnostics
    await authorizeRequest(req, ['admin', 'recruiter']);
    const diagnostics = await runGeminiDiagnostics();
    return NextResponse.json({ success: true, data: diagnostics });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
