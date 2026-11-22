import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness Probe: Returns HTTP 200 as long as the process is healthy.
 * Does not depend on external services (Firebase, Gemini, Redis) so orchestrators
 * do not restart healthy containers during transient third-party outages.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'talentai-web',
  });
}
