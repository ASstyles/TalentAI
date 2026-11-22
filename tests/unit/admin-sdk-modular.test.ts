import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApp, adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';
import { BaseRepository } from '@/lib/repositories/base';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

describe('Firebase Admin Modular SDK & Type Safety (P0 Migration)', () => {
  it('1. Exports correctly typed modular Admin SDK singletons', () => {
    expect(adminApp).toBeDefined();
    expect(adminApp.name).toBeDefined();
    expect(adminAuth).toBeDefined();
    expect(typeof adminAuth.verifyIdToken).toBe('function');
    expect(adminDb).toBeDefined();
    expect(typeof adminDb.collection).toBe('function');
    expect(adminStorage).toBeDefined();
    expect(typeof adminStorage.bucket).toBe('function');
  });

  it('2. BaseRepository db getter returns strongly typed Firestore instance', () => {
    class TestRepo extends BaseRepository {
      public static getTestDb() {
        return this.db;
      }

      public static testSanitize<T>(doc: DocumentSnapshot): T {
        return this.sanitizeDoc<T>(doc);
      }
    }

    const db = TestRepo.getTestDb();
    expect(db).toBe(adminDb);
    expect(typeof db.collection).toBe('function');
  });

  it('3. BaseRepository.sanitizeDoc correctly preserves ID and handles missing or empty data safely', () => {
    class TestRepo extends BaseRepository {
      public static testSanitize<T>(doc: DocumentSnapshot): T {
        return this.sanitizeDoc<T>(doc);
      }
    }

    // Normal document
    const mockDoc1 = {
      id: 'doc-123',
      data: () => ({ title: 'Test Job', salary: 150000 }),
    } as unknown as DocumentSnapshot;

    const res1 = TestRepo.testSanitize<{ id: string; title: string; salary: number }>(mockDoc1);
    expect(res1.id).toBe('doc-123');
    expect(res1.title).toBe('Test Job');
    expect(res1.salary).toBe(150000);

    // Empty document data (e.g. non-existent or null data)
    const mockDoc2 = {
      id: 'doc-empty',
      data: () => undefined,
    } as unknown as DocumentSnapshot;

    const res2 = TestRepo.testSanitize<{ id: string }>(mockDoc2);
    expect(res2.id).toBe('doc-empty');
  });

  it('4. Admin SDK does not re-initialize duplicate applications on repeated module calls', async () => {
    const { getApps } = await import('firebase-admin/app');
    const appsBefore = getApps().length;
    expect(appsBefore).toBeGreaterThanOrEqual(1);

    // Re-importing admin module returns existing singleton
    const reimported = await import('@/lib/firebase/admin');
    expect(reimported.adminApp).toBe(adminApp);
    expect(getApps().length).toBe(appsBefore);
  });
});
