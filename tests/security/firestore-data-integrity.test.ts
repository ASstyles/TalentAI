import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeForFirestore, isFirestoreNative, PersistenceError } from '@/lib/firebase/firestore-sanitizer';
import { UserRepository } from '@/lib/repositories/user-repository';
import { CandidateRepository } from '@/lib/repositories/candidate-repository';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Validates Firestore documents according to the official @google-cloud/firestore specification:
 * Throws when any property or nested property contains `undefined`.
 */
function assertValidFirestoreDocument(data: unknown, fieldPath = ''): void {
  if (data === undefined) {
    throw new Error(
      `Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value (found in field "${fieldPath}").`
    );
  }
  if (data === null || typeof data !== 'object') {
    return;
  }
  if (isFirestoreNative(data)) {
    return;
  }
  if (Array.isArray(data)) {
    data.forEach((item, index) => assertValidFirestoreDocument(item, `${fieldPath}[${index}]`));
    return;
  }
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const fullPath = fieldPath ? `${fieldPath}.${key}` : key;
    assertValidFirestoreDocument(val, fullPath);
  }
}

describe('Firestore Data Integrity & orgId Regression Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Exact Screenshot Error Reproduction & Sanitizer Remediation', () => {
    it('reproduces the exact Firestore failure when undefined orgId is supplied', () => {
      const unsanitizedCandidateData = {
        id: 'cand-001',
        email: 'alex.mercer@example.com',
        role: 'candidate',
        orgId: undefined,
      };

      expect(() => {
        assertValidFirestoreDocument(unsanitizedCandidateData);
      }).toThrowError(
        'Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value (found in field "orgId").'
      );
    });

    it('sanitizes undefined orgId by completely omitting the key', () => {
      const unsanitizedCandidateData = {
        id: 'cand-001',
        email: 'alex.mercer@example.com',
        role: 'candidate',
        orgId: undefined,
      };

      const sanitized = sanitizeForFirestore(unsanitizedCandidateData);

      expect(sanitized).toEqual({
        id: 'cand-001',
        email: 'alex.mercer@example.com',
        role: 'candidate',
      });
      expect('orgId' in (sanitized as Record<string, unknown>)).toBe(false);
      expect(() => assertValidFirestoreDocument(sanitized)).not.toThrow();
    });
  });

  describe('2. Recursive Sanitization Capabilities', () => {
    it('omits deeply nested undefined properties', () => {
      const payload = {
        user: 'cand-002',
        profile: {
          location: {
            city: 'San Francisco',
            state: undefined,
            country: 'USA',
          },
          settings: {
            theme: undefined,
            notifications: true,
          },
        },
      };

      const sanitized = sanitizeForFirestore(payload);

      expect(sanitized).toEqual({
        user: 'cand-002',
        profile: {
          location: {
            city: 'San Francisco',
            country: 'USA',
          },
          settings: {
            notifications: true,
          },
        },
      });
      expect(() => assertValidFirestoreDocument(sanitized)).not.toThrow();
    });

    it('filters out undefined elements from arrays and sanitizes objects inside arrays', () => {
      const payload = {
        tags: ['fullstack', undefined, 'typescript', undefined],
        projects: [
          { name: 'App 1', url: 'https://app1.com', demo: undefined },
          undefined,
          { name: 'App 2', url: undefined },
        ],
      };

      const sanitized = sanitizeForFirestore(payload);

      expect(sanitized).toEqual({
        tags: ['fullstack', 'typescript'],
        projects: [
          { name: 'App 1', url: 'https://app1.com' },
          { name: 'App 2' },
        ],
      });
      expect(() => assertValidFirestoreDocument(sanitized)).not.toThrow();
    });

    it('strictly preserves deliberate null values', () => {
      const payload = {
        id: 'cand-003',
        photoURL: null,
        revokedAt: null,
        metadata: {
          secondaryEmail: null,
        },
      };

      const sanitized = sanitizeForFirestore(payload);

      expect(sanitized).toEqual(payload);
      expect((sanitized as typeof payload).photoURL).toBeNull();
      expect((sanitized as typeof payload).metadata.secondaryEmail).toBeNull();
      expect(() => assertValidFirestoreDocument(sanitized)).not.toThrow();
    });

    it('preserves native Dates and Firestore native types', () => {
      const now = new Date();
      const mockTimestamp = {
        seconds: 1774320000,
        nanoseconds: 0,
        toDate: () => now,
      };
      const mockGeoPoint = {
        latitude: 37.7749,
        longitude: -122.4194,
        constructor: { name: 'GeoPoint' },
      };
      const mockDocRef = {
        id: 'doc-123',
        path: 'users/doc-123',
        parent: {},
        firestore: {},
        constructor: { name: 'DocumentReference' },
      };
      const mockFieldValue = {
        _methodName: 'serverTimestamp',
        isEqual: () => true,
        constructor: { name: 'FieldValue' },
      };

      const payload = {
        createdAt: now,
        timestamp: mockTimestamp,
        location: mockGeoPoint,
        ownerRef: mockDocRef,
        updatedAt: mockFieldValue,
        badField: undefined,
      };

      const sanitized = sanitizeForFirestore(payload);

      expect(sanitized.createdAt).toBe(now);
      expect(sanitized.timestamp).toBe(mockTimestamp);
      expect(sanitized.location).toBe(mockGeoPoint);
      expect(sanitized.ownerRef).toBe(mockDocRef);
      expect(sanitized.updatedAt).toBe(mockFieldValue);
      expect('badField' in sanitized).toBe(false);
      expect(() => assertValidFirestoreDocument(sanitized)).not.toThrow();
    });
  });

  describe('3. UserRepository & Role-Specific Schema Rules', () => {
    it('creates a candidate user strictly without an orgId field', async () => {
      const capturedPayloads: unknown[] = [];
      vi.spyOn(UserRepository, 'getById').mockResolvedValue(null);
      vi.spyOn(adminDb, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue({
          set: vi.fn().mockImplementation((payload) => {
            assertValidFirestoreDocument(payload);
            capturedPayloads.push(payload);
            return Promise.resolve();
          }),
        }),
      } as any);

      const candidate = await UserRepository.createOrUpdate('cand-new-01', {
        email: 'new.candidate@example.com',
        displayName: 'New Candidate',
        role: 'candidate',
        orgId: undefined, // Simulating undefined input
      });

      expect(candidate.role).toBe('candidate');
      expect('orgId' in candidate).toBe(false);
      expect(capturedPayloads.length).toBe(1);
      expect('orgId' in (capturedPayloads[0] as Record<string, unknown>)).toBe(false);
      expect(() => assertValidFirestoreDocument(capturedPayloads[0])).not.toThrow();
    });

    it('creates a recruiter user with valid orgId', async () => {
      const capturedPayloads: unknown[] = [];
      vi.spyOn(UserRepository, 'getById').mockResolvedValue(null);
      vi.spyOn(adminDb, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue({
          set: vi.fn().mockImplementation((payload) => {
            assertValidFirestoreDocument(payload);
            capturedPayloads.push(payload);
            return Promise.resolve();
          }),
        }),
      } as any);

      const recruiter = await UserRepository.createOrUpdate('rec-01', {
        email: 'recruiter@techcorp.com',
        displayName: 'Tech Recruiter',
        role: 'recruiter',
        orgId: 'org-techcorp',
      });

      expect(recruiter.role).toBe('recruiter');
      expect(recruiter.orgId).toBe('org-techcorp');
      expect((capturedPayloads[0] as Record<string, unknown>).orgId).toBe('org-techcorp');
      expect(() => assertValidFirestoreDocument(capturedPayloads[0])).not.toThrow();
    });

    it('preserves existing orgId when a recruiter updates profile properties', async () => {
      const existingRecruiter = {
        id: 'rec-02',
        email: 'jane@enterprise.com',
        displayName: 'Jane Partner',
        role: 'recruiter' as const,
        status: 'active' as const,
        orgId: 'org-enterprise-global',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        lastLoginAt: '2026-01-01T00:00:00.000Z',
      };

      const capturedPayloads: unknown[] = [];
      vi.spyOn(UserRepository, 'getById').mockResolvedValue(existingRecruiter);
      vi.spyOn(adminDb, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue({
          set: vi.fn().mockImplementation((payload) => {
            assertValidFirestoreDocument(payload);
            capturedPayloads.push(payload);
            return Promise.resolve();
          }),
        }),
      } as any);

      // Recruiter updates displayName without passing orgId
      const updated = await UserRepository.createOrUpdate('rec-02', {
        displayName: 'Jane Senior Partner',
      });

      expect(updated.displayName).toBe('Jane Senior Partner');
      expect(updated.orgId).toBe('org-enterprise-global');
      expect((capturedPayloads[0] as Record<string, unknown>).orgId).toBe('org-enterprise-global');
      expect(() => assertValidFirestoreDocument(capturedPayloads[0])).not.toThrow();
    });

    it('candidate update never creates an undefined organization field', async () => {
      const existingCandidate = {
        id: 'cand-03',
        email: 'bob@example.com',
        displayName: 'Bob Dev',
        role: 'candidate' as const,
        status: 'active' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        lastLoginAt: '2026-01-01T00:00:00.000Z',
      };

      const capturedPayloads: unknown[] = [];
      vi.spyOn(UserRepository, 'getById').mockResolvedValue(existingCandidate);
      vi.spyOn(adminDb, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue({
          set: vi.fn().mockImplementation((payload) => {
            assertValidFirestoreDocument(payload);
            capturedPayloads.push(payload);
            return Promise.resolve();
          }),
        }),
      } as any);

      const updated = await UserRepository.createOrUpdate('cand-03', {
        displayName: 'Bob Senior Dev',
        orgId: undefined, // Explicit undefined attempt
      });

      expect(updated.displayName).toBe('Bob Senior Dev');
      expect('orgId' in updated).toBe(false);
      expect('orgId' in (capturedPayloads[0] as Record<string, unknown>)).toBe(false);
      expect(() => assertValidFirestoreDocument(capturedPayloads[0])).not.toThrow();
    });
  });

  describe('4. Firestore Outage & Error Handling Resilience', () => {
    it('throws PersistenceError on Firestore read failure and does not return null', async () => {
      vi.spyOn(adminDb, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockRejectedValue(new Error('DEADLINE_EXCEEDED: Connection reset by peer')),
        }),
      } as any);

      await expect(UserRepository.getById('cand-down-01')).rejects.toThrow(PersistenceError);
    });

    it('returns null strictly when the document genuinely does not exist', async () => {
      vi.spyOn(adminDb, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
        }),
      } as any);

      const user = await UserRepository.getById('non-existent-user');
      expect(user).toBeNull();
    });

    it('does not create a duplicate user when a Firestore read outage occurs', async () => {
      vi.spyOn(UserRepository, 'getById').mockRejectedValue(
        new PersistenceError('Firestore network timeout', 'UNAVAILABLE')
      );

      // UserRepository.createOrUpdate must fail-closed and throw, not proceed to write
      await expect(
        UserRepository.createOrUpdate('cand-outage', {
          email: 'outage@example.com',
          displayName: 'Outage User',
        })
      ).rejects.toThrow(PersistenceError);
    });
  });

  describe('5. CandidateRepository Profile Sanitization', () => {
    it('sanitizes undefined optional fields during profile updates', async () => {
      const capturedPayloads: unknown[] = [];
      vi.spyOn(CandidateRepository, 'getProfile').mockResolvedValue(null);
      vi.spyOn(adminDb, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue({
          set: vi.fn().mockImplementation((payload) => {
            assertValidFirestoreDocument(payload);
            capturedPayloads.push(payload);
            return Promise.resolve();
          }),
        }),
      } as any);

      const profile = await CandidateRepository.saveProfile('cand-prof-01', {
        headline: 'Staff Infrastructure Engineer',
        githubUsername: undefined,
        linkedinUrl: undefined,
        portfolioUrl: undefined,
      });

      expect(profile.headline).toBe('Staff Infrastructure Engineer');
      expect('githubUsername' in (capturedPayloads[0] as Record<string, unknown>)).toBe(false);
      expect('linkedinUrl' in (capturedPayloads[0] as Record<string, unknown>)).toBe(false);
      expect(() => assertValidFirestoreDocument(capturedPayloads[0])).not.toThrow();
    });
  });
});
