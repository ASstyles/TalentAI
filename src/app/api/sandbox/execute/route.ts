import { NextRequest, NextResponse } from 'next/server';
import { executeInIsolatedSandbox } from '@/lib/sandbox/runner';

export async function POST(req: NextRequest) {
  try {
    const { code, language, testCases } = await req.json();

    if (!code || !language || !testCases) {
      return NextResponse.json({ error: 'Missing code, language, or testCases' }, { status: 400 });
    }

    const summary = await executeInIsolatedSandbox({
      code,
      language,
      testCases,
      timeoutMs: 3000,
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
