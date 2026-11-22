import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/firebase/auth';
import { UserRepository } from '@/lib/repositories/user-repository';

export async function GET(req: NextRequest) {
  try {
    await authorizeRequest(req, ['admin']);
    const users = await UserRepository.listUsers(100);
    return NextResponse.json({ success: true, data: users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
