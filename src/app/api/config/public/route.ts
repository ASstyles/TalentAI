import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Public Firebase Client Configuration Endpoint.
 * Enables the browser to safely obtain the public Firebase configuration
 * at runtime if NEXT_PUBLIC_* variables were not inlined at build time.
 * NEVER exposes private keys or server-side credentials.
 */
export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '';
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      (projectId ? `${projectId}.firebaseapp.com` : ''),
    projectId,
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (projectId ? `${projectId}.firebasestorage.app` : ''),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  };

  return NextResponse.json({ success: true, data: config });
}
