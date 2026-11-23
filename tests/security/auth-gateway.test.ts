import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { authorizeRequest, setUserRole } from '@/lib/firebase/auth';

describe('Candidate & Recruiter Authentication Gateway & Zero-Trust Governance', () => {
  const store = new Map<string, any>();

  beforeEach(() => {
    vi.restoreAllMocks();
    store.clear();

    vi.spyOn(adminDb, 'collection').mockImplementation((colName: string) => {
      return {
        doc: (docId: string) => {
          const key = `${colName}/${docId}`;
          return {
            id: docId,
            get: vi.fn().mockImplementation(async () => ({
              exists: store.has(key),
              id: docId,
              data: () => store.get(key),
            })),
            set: vi.fn().mockImplementation(async (data: any, opts?: any) => {
              if (opts?.merge && store.has(key)) {
                store.set(key, { ...store.get(key), ...data });
              } else {
                store.set(key, data);
              }
              return { writeTime: new Date() };
            }),
            update: vi.fn().mockImplementation(async (data: any) => {
              if (store.has(key)) {
                store.set(key, { ...store.get(key), ...data });
              }
              return { writeTime: new Date() };
            }),
          };
        },
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockImplementation(async () => {
          const docs: any[] = [];
          for (const [k, v] of store.entries()) {
            if (k.startsWith(`${colName}/`)) {
              docs.push({
                id: k.split('/')[1],
                data: () => v,
              });
            }
          }
          return { empty: docs.length === 0, docs };
        }),
      } as any;
    });
  });

  // --------------------------------------------------------------------------
  // 1. CANDIDATE REGISTRATION & ZERO ROLE ESCALATION
  // --------------------------------------------------------------------------
  describe('Candidate Registration Security', () => {
    it('rejects candidate registration with weak passwords (fails complexity check)', async () => {
      const { POST } = await import('@/app/api/auth/register/route');

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test Candidate',
          email: 'weakpass@test.com',
          password: 'weak', // Missing uppercase, length, number, special char
          confirmPassword: 'weak',
          acceptedTerms: true,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Password must be at least 8 characters');
    });

    it('rejects registration when Terms of Service are not accepted', async () => {
      const { POST } = await import('@/app/api/auth/register/route');

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test Candidate',
          email: 'noterms@test.com',
          password: 'Password123!@#',
          confirmPassword: 'Password123!@#',
          acceptedTerms: false,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('You must accept the Terms of Service');
    });

    it('rejects candidate registration when passwords do not match', async () => {
      const { POST } = await import('@/app/api/auth/register/route');

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test Candidate',
          email: 'mismatch@test.com',
          password: 'Password123!@#',
          confirmPassword: 'DifferentPassword123!@#',
          acceptedTerms: true,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Passwords do not match');
    });

    it('creates candidate with strictly candidate role claims (no role self-assignment)', async () => {
      const { POST } = await import('@/app/api/auth/register/route');

      // Spy on adminAuth.createUser and setCustomUserClaims
      const mockUid = 'cand-reg-test-101';
      vi.spyOn(adminAuth, 'getUserByEmail').mockRejectedValueOnce(new Error('User not found'));
      vi.spyOn(adminAuth, 'createUser').mockResolvedValueOnce({
        uid: mockUid,
        email: 'engineer@candidate.com',
        displayName: 'Engineer Candidate',
      } as any);

      const claimsSpy = vi.spyOn(adminAuth, 'setCustomUserClaims').mockResolvedValueOnce(undefined);

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Engineer Candidate',
          email: 'engineer@candidate.com',
          password: 'StrongP@ssw0rd2026',
          confirmPassword: 'StrongP@ssw0rd2026',
          acceptedTerms: true,
          // Malicious attempt to self-assign recruiter role during registration
          role: 'recruiter',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.uid).toBe(mockUid);

      // Verify that claims were STRICTLY assigned as 'candidate'
      expect(claimsSpy).toHaveBeenCalledWith(mockUid, {
        role: 'candidate',
        orgId: null,
      });
    });
  });

  // --------------------------------------------------------------------------
  // 2. RECRUITER ACCESS REQUEST & PROVISIONING
  // --------------------------------------------------------------------------
  describe('Recruiter Access Request & Administrative Provisioning', () => {
    it('rejects recruiter access request with generic non-corporate email', async () => {
      const { POST } = await import('@/app/api/recruiter/access-request/route');

      const req = new NextRequest('http://localhost:3000/api/recruiter/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Jane Recruiter',
          workEmail: 'jane.recruiter@gmail.com', // Public freemail
          companyName: 'Acme Corp',
          jobTitle: 'Senior Talent Partner',
          businessWebsite: 'https://acme.com',
          reason: 'We are scaling our engineering team across multiple distributed systems roles.',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('official company work email');
    });

    it('submits valid recruiter access request with status PENDING', async () => {
      const { POST } = await import('@/app/api/recruiter/access-request/route');

      let savedDoc: any = null;
      vi.spyOn(adminDb, 'collection').mockImplementation((col: string) => {
        if (col === 'recruiterAccessRequests') {
          return {
            doc: (id: string) => ({
              set: vi.fn().mockImplementation(async (data: any) => {
                savedDoc = data;
              }),
            }),
          } as any;
        }
        return {
          doc: () => ({ set: vi.fn(), get: vi.fn() }),
        } as any;
      });

      const req = new NextRequest('http://localhost:3000/api/recruiter/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Jane Recruiter',
          workEmail: 'jane@enterprise-tech.io',
          companyName: 'Enterprise Tech',
          jobTitle: 'VP Talent Acquisition',
          businessWebsite: 'https://enterprise-tech.io',
          reason: 'Actively recruiting 15 Senior Full-Stack and AI Systems Engineers.',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.requestId).toBeDefined();

      expect(savedDoc.status).toBe('pending');
      expect(savedDoc.workEmail).toBe('jane@enterprise-tech.io');
    });

    it('blocks non-admin from approving recruiter access requests', async () => {
      const { POST } = await import('@/app/api/admin/recruiter-requests/route');

      vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({
        uid: 'recruiter-123',
        role: 'recruiter', // Recruiter attempting to approve requests
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/recruiter-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: 'Bearer valid-recruiter-token',
        },
        body: JSON.stringify({
          requestId: 'req-123',
          action: 'approve',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Role 'recruiter' is not authorized");
    });

    it('allows admin to approve recruiter request and provisions role & org custom claims', async () => {
      const { POST } = await import('@/app/api/admin/recruiter-requests/route');

      vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({
        uid: 'admin-super-uid',
        role: 'admin',
      } as any);

      const mockRequestData = {
        id: 'req-enterprise-456',
        fullName: 'Approved Recruiter',
        workEmail: 'recruiter@deepmind-partner.io',
        companyName: 'DeepMind Partner Labs',
        jobTitle: 'Head of Recruiting',
        businessWebsite: 'https://deepmind-partner.io',
        status: 'pending',
      };

      const updateSpy = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(adminDb, 'collection').mockImplementation((col: string) => {
        if (col === 'recruiterAccessRequests') {
          return {
            doc: () => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => mockRequestData,
              }),
              update: updateSpy,
            }),
          } as any;
        }
        return {
          doc: () => ({
            set: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue({ exists: false }),
          }),
        } as any;
      });

      vi.spyOn(adminAuth, 'getUserByEmail').mockResolvedValueOnce({
        uid: 'user-recruiter-new',
        email: 'recruiter@deepmind-partner.io',
      } as any);

      const claimsSpy = vi.spyOn(adminAuth, 'setCustomUserClaims').mockResolvedValueOnce(undefined);

      const req = new NextRequest('http://localhost:3000/api/admin/recruiter-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: 'Bearer admin-token',
        },
        body: JSON.stringify({
          requestId: 'req-enterprise-456',
          action: 'approve',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify custom claims were set for recruiter role
      expect(claimsSpy).toHaveBeenCalledWith(
        'user-recruiter-new',
        expect.objectContaining({ role: 'recruiter' })
      );
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. ZERO-TRUST PORTAL DEFENSE & FORGERY RESISTANCE
  // --------------------------------------------------------------------------
  describe('Zero-Trust Portal Defense', () => {
    it('candidate cannot access recruiter endpoints even if sending recruiter portal origin', async () => {
      vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({
        uid: 'cand-alex-mercer',
        role: 'candidate',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/hiring/decide?role=recruiter', {
        method: 'POST',
        headers: {
          authorization: 'Bearer candidate-token',
          'x-portal-intent': 'recruiter',
        },
      });

      // authorizeRequest strictly checks server claims, ignoring client intent
      await expect(authorizeRequest(req, ['recruiter', 'admin'])).rejects.toThrow(
        "Forbidden: Role 'candidate' is not authorized. Required: recruiter, admin"
      );
    });

    it('session endpoint returns verified role and sets HTTP-only session cookie', async () => {
      const { POST } = await import('@/app/api/auth/session/route');

      vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({
        uid: 'user-recruiter-chen',
        email: 'sarah.chen@nexuscloud.io',
        role: 'recruiter',
        orgId: 'org-google-deepmind',
      } as any);
      vi.spyOn(adminAuth, 'createSessionCookie').mockResolvedValueOnce('mock-session-cookie-value');

      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: 'Bearer valid-id-token',
        },
        body: JSON.stringify({ idToken: 'valid-id-token' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.role).toBe('recruiter');
      expect(json.user.orgId).toBe('org-google-deepmind');

      // Verify session cookie was set
      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toContain('session=');
      expect(cookieHeader).toContain('HttpOnly');
    });

    it('logout endpoint clears session cookie', async () => {
      const { POST } = await import('@/app/api/auth/logout/route');

      const res = await POST();
      expect(res.status).toBe(200);
      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toContain('session=;');
      expect(cookieHeader).toContain('Max-Age=0');
    });
  });
});
