import { describe, it, expect, vi } from 'vitest';
import { GeminiClient, GeminiServiceError } from '@/lib/gemini/client';
import { POST as parseResumeRoute } from '@/app/api/resume/parse/route';
import { POST as evaluateInterviewRoute } from '@/app/api/interview/evaluate/route';
import { NextRequest } from 'next/server';

describe('Gemini AI Truthfulness & Zero-Fabrication Pipeline (DEF-004 & DEF-005)', () => {
  it('returns explicit AI_UNAVAILABLE status when GEMINI_API_KEY is not configured (NEVER fake Alex Mercer)', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    // Mock authorized session token
    const admin = await import('@/lib/firebase/admin');
    const spy = vi.spyOn(admin.adminAuth, 'verifyIdToken').mockResolvedValueOnce({
      uid: 'cand-user-789',
      role: 'candidate',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/resume/parse', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ rawText: 'Senior Backend Engineer with 5 years experience in Go and Redis.' }),
    });

    const res = await parseResumeRoute(req);
    expect(res.status).toBe(503);

    const json = await res.json();
    expect(json.status).toBe('AI_UNAVAILABLE');
    expect(json.success).toBe(false);
    expect(json.data).toBeUndefined(); // MUST NOT contain fabricated Alex Mercer data!

    spy.mockRestore();
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  });

  it('interview evaluation returns AI_UNAVAILABLE rather than word-count based scores when AI is offline', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const admin = await import('@/lib/firebase/admin');
    const spy = vi.spyOn(admin.adminAuth, 'verifyIdToken').mockResolvedValueOnce({
      uid: 'cand-user-789',
      role: 'candidate',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/interview/evaluate', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        questionText: 'How do you design a high-throughput event processing queue?',
        candidateResponse: 'I utilize Kafka with partitioned consumers and idempotent database writes.',
      }),
    });

    const res = await evaluateInterviewRoute(req);
    expect(res.status).toBe(503);

    const json = await res.json();
    expect(json.status).toBe('AI_UNAVAILABLE');
    expect(json.success).toBe(false);

    spy.mockRestore();
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  });

  it('correctly classifies Gemini error codes and HTTP statuses', () => {
    const authErr = GeminiClient.classifyError(new Error('API_KEY_INVALID: API key not valid. Please pass a valid API key.'));
    expect(authErr.code).toBe('UNAUTHORIZED');
    expect(authErr.status).toBe(401);

    const rateLimitErr = GeminiClient.classifyError(new Error('ResourceExhausted: 429 Resource has been exhausted'));
    expect(rateLimitErr.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimitErr.status).toBe(429);

    const notFoundErr = GeminiClient.classifyError(new Error('models/gemini-invalid is not found for API version v1beta'));
    expect(notFoundErr.code).toBe('MODEL_NOT_FOUND');
    expect(notFoundErr.status).toBe(404);

    const timeoutErr = GeminiClient.classifyError(new Error('DeadlineExceeded: request timed out'));
    expect(timeoutErr.code).toBe('TIMEOUT');
    expect(timeoutErr.status).toBe(504);
  });
});
