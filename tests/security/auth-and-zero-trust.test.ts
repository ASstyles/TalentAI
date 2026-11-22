import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { authorizeRequest, verifyServerSession } from '@/lib/firebase/auth';

describe('Zero-Trust Authentication & Authorization Guardrails (DEF-001 & DEF-009)', () => {
  it('strictly rejects requests missing authorization headers (fails closed)', async () => {
    const req = new NextRequest('http://localhost:3000/api/hiring/decide', {
      method: 'POST',
      headers: {},
    });

    await expect(authorizeRequest(req, ['recruiter', 'admin'])).rejects.toThrow(
      'Unauthorized: Missing required authentication token'
    );
  });

  it('strictly rejects unverified client role spoofing headers (x-user-role)', async () => {
    const req = new NextRequest('http://localhost:3000/api/hiring/decide', {
      method: 'POST',
      headers: {
        'x-user-role': 'admin',
        'x-user-id': 'hacker-uid',
      },
    });

    await expect(authorizeRequest(req, ['admin'])).rejects.toThrow(
      'Unauthorized: Missing required authentication token'
    );
  });

  it('strictly fails closed when token is malformed or invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/hiring/decide', {
      method: 'POST',
      headers: {
        authorization: 'Bearer forged-invalid-token-xyz',
      },
    });

    await expect(authorizeRequest(req, ['recruiter', 'admin'])).rejects.toThrow(
      'Unauthorized: Invalid, expired, or revoked authentication token'
    );
  });

  it('blocks candidates attempting to access recruiter or admin endpoints', async () => {
    // Mock verifyIdToken returning a candidate session
    const mockToken = 'mock-candidate-token';
    const admin = await import('@/lib/firebase/admin');
    const spy = vi.spyOn(admin.adminAuth, 'verifyIdToken').mockResolvedValueOnce({
      uid: 'cand-user-123',
      role: 'candidate',
      email: 'candidate@test.com',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/hiring/decide', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${mockToken}`,
      },
    });

    await expect(authorizeRequest(req, ['recruiter', 'admin'])).rejects.toThrow(
      "Forbidden: Role 'candidate' is not authorized. Required: recruiter, admin"
    );

    spy.mockRestore();
  });

  it('allows verified recruiter token to access recruiter endpoints', async () => {
    const mockToken = 'mock-recruiter-token';
    const admin = await import('@/lib/firebase/admin');
    const spy = vi.spyOn(admin.adminAuth, 'verifyIdToken').mockResolvedValueOnce({
      uid: 'recruiter-user-456',
      role: 'recruiter',
      orgId: 'org-google-deepmind',
      email: 'recruiter@deepmind.com',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/hiring/decide', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${mockToken}`,
      },
    });

    const session = await authorizeRequest(req, ['recruiter', 'admin']);
    expect(session.uid).toBe('recruiter-user-456');
    expect(session.role).toBe('recruiter');
    expect(session.orgId).toBe('org-google-deepmind');

    spy.mockRestore();
  });

  it('rejects candidate attempting to pass custom test cases to sandbox API (DEF-013)', async () => {
    const { POST } = await import('@/app/api/sandbox/execute/route');
    const admin = await import('@/lib/firebase/admin');
    const spy = vi.spyOn(admin.adminAuth, 'verifyIdToken').mockResolvedValueOnce({
      uid: 'cand-user-789',
      role: 'candidate',
      email: 'cand@test.com',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/sandbox/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer valid-candidate-token',
      },
      body: JSON.stringify({
        code: 'function solution() { return true; }',
        language: 'javascript',
        customTestCases: [
          { id: 'fake-tc', input: '1', expectedOutput: 'true' }
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Candidates cannot supply custom evaluation test cases');

    spy.mockRestore();
  });

  it('rejects candidate attempting to generate recommendations for a different candidate (DEF-014)', async () => {
    const { POST } = await import('@/app/api/matching/recommend/route');
    const admin = await import('@/lib/firebase/admin');
    const spy = vi.spyOn(admin.adminAuth, 'verifyIdToken').mockResolvedValueOnce({
      uid: 'cand-user-alice',
      role: 'candidate',
      email: 'alice@test.com',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/matching/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer valid-candidate-token',
      },
      body: JSON.stringify({
        candidateId: 'cand-user-bob',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden: You cannot request role recommendations for another candidate');

    spy.mockRestore();
  });
});
