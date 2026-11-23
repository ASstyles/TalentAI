import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeForFirestore,
  isFirestoreNative,
  PersistenceError,
  classifyFirestoreError,
} from '@/lib/firebase/firestore-sanitizer';
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

  describe('6. Firestore Permission & API Disabled Error Classification', () => {
    it('classifies gRPC code 7 with disabled message as FIRESTORE_API_DISABLED with console URL', () => {
      const gRpcError = {
        code: 7,
        message:
          '7 PERMISSION_DENIED: Cloud Firestore API has not been used in project talentai-dba5f before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=talentai-dba5f then retry.',
      };

      const err = classifyFirestoreError(gRpcError, 'talentai-dba5f');

      expect(err.code).toBe('FIRESTORE_API_DISABLED');
      expect(err.message).toContain('Cloud Firestore API is disabled');
      expect(err.diagnosticHelp).toContain('https://console.developers.google.com/apis/api/firestore.googleapis.com');
    });

    it('classifies gRPC code 7 without disabled message as FIRESTORE_PERMISSION_DENIED with IAM guidance', () => {
      const gRpcError = {
        code: 7,
        message: '7 PERMISSION_DENIED: Missing or insufficient permissions for service account.',
      };

      const err = classifyFirestoreError(gRpcError, 'talentai-dba5f');

      expect(err.code).toBe('FIRESTORE_PERMISSION_DENIED');
      expect(err.diagnosticHelp).toContain('Cloud Datastore User (roles/datastore.user)');
    });

    it('classifies gRPC code 14 as FIRESTORE_UNAVAILABLE', () => {
      const gRpcError = {
        code: 14,
        message: '14 UNAVAILABLE: Connection reset by peer',
      };

      const err = classifyFirestoreError(gRpcError, 'talentai-dba5f');

      expect(err.code).toBe('FIRESTORE_UNAVAILABLE');
    });

    it('classifies project mismatch as PROJECT_ID_MISMATCH', () => {
      const mismatchError = {
        message: 'The project id in credentials (other-project) does not match the project id requested (talentai-dba5f)',
      };
      const err = classifyFirestoreError(mismatchError, 'talentai-dba5f');
      expect(err.code).toBe('PROJECT_ID_MISMATCH');
      expect(err.diagnosticHelp).toContain('FIREBASE_PROJECT_ID');
    });

    it('classifies missing database as FIRESTORE_DATABASE_NOT_FOUND', () => {
      const notFoundError = {
        code: 5,
        message: '5 NOT_FOUND: Database (default) was not found in project talentai-dba5f',
      };
      const err = classifyFirestoreError(notFoundError, 'talentai-dba5f');
      expect(err.code).toBe('FIRESTORE_DATABASE_NOT_FOUND');
      expect(err.diagnosticHelp).toContain('Native mode');
    });

    it('classifies invalid token/grant as FIREBASE_ADMIN_AUTH_FAILURE', () => {
      const authError = {
        message: 'invalid_grant: Invalid JWT Signature',
      };
      const err = classifyFirestoreError(authError, 'talentai-dba5f');
      expect(err.code).toBe('FIREBASE_ADMIN_AUTH_FAILURE');
      expect(err.diagnosticHelp).toContain('FIREBASE_PRIVATE_KEY');
    });

    it('classifies missing service account as INVALID_SERVICE_ACCOUNT', () => {
      const saError = {
        message: 'Service account firebase-adminsdk-fbsvc@talentai-dba5f.iam.gserviceaccount.com was deleted or disabled',
      };
      const err = classifyFirestoreError(saError, 'talentai-dba5f');
      expect(err.code).toBe('INVALID_SERVICE_ACCOUNT');
    });

    it('classifies gRPC code 4 as FIRESTORE_TIMEOUT', () => {
      const timeoutError = {
        code: 4,
        message: '4 DEADLINE_EXCEEDED: The deadline was reached before the request completed',
      };
      const err = classifyFirestoreError(timeoutError, 'talentai-dba5f');
      expect(err.code).toBe('FIRESTORE_TIMEOUT');
    });

    it('classifies credential load failure as FIRESTORE_CONFIGURATION_ERROR', () => {
      const configError = {
        message: 'Could not load the default credentials or invalid private key',
      };
      const err = classifyFirestoreError(configError, 'talentai-dba5f');
      expect(err.code).toBe('FIRESTORE_CONFIGURATION_ERROR');
    });

    it('re-throws classified PersistenceError during UserRepository.getById when Firestore API is disabled', async () => {
      const disabledApiError = {
        code: 7,
        message: '7 PERMISSION_DENIED: Cloud Firestore API has not been used in project talentai-dba5f before or it is disabled.',
      };

      vi.spyOn(adminDb, 'collection').mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockRejectedValue(disabledApiError),
        }),
      } as any);

      try {
        await UserRepository.getById('cand-test-disabled');
        expect.fail('Should have thrown PersistenceError');
      } catch (e: any) {
        expect(e.code).toBe('FIRESTORE_API_DISABLED');
        expect(e.message).toContain('Cloud Firestore API is disabled');
      }
    });
  });
});
