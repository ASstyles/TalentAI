import { NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase/client';
import { GeminiClient } from '@/lib/gemini/client';
import { rateLimiter } from '@/lib/rate-limit/redis-limiter';

export const dynamic = 'force-dynamic';

/**
 * Readiness Probe: Checks whether the minimum required infrastructure is configured
 * and ready to serve live recruitment intelligence traffic.
 * Does NOT expose API keys, credentials, or internal exception stack traces.
 */
export async function GET() {
  const firebaseClientReady = isFirebaseConfigured();
  const firebaseAdminReady = Boolean(
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIRESTORE_EMULATOR_HOST
  );
  const geminiConfigured = GeminiClient.isConfigured();
  const redisConfigured = Boolean(process.env.REDIS_URL);
  let redisReachable = false;

  if (redisConfigured) {
    try {
      redisReachable = await rateLimiter.ping();
    } catch {
      redisReachable = false;
    }
  }

  const checks = {
    firebaseClient: firebaseClientReady ? 'configured' : 'unconfigured',
    firebaseAdmin: firebaseAdminReady ? 'configured' : 'unconfigured',
    geminiAi: geminiConfigured ? 'configured' : 'unconfigured',
    redisRateLimiter: redisConfigured ? (redisReachable ? 'healthy' : 'degraded') : 'in_memory_fallback',
  };

  const isReady = firebaseClientReady || firebaseAdminReady || process.env.NODE_ENV === 'test';

  return NextResponse.json(
    {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: isReady ? 200 : 503 }
  );
}
