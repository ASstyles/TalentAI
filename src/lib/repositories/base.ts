import { adminDb } from '../firebase/admin';
import type { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';
import { sanitizeForFirestore, PersistenceError, isFirestoreNative } from '../firebase/firestore-sanitizer';

export { sanitizeForFirestore, PersistenceError, isFirestoreNative };

export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Base repository utilities providing safe Firestore access and serialization.
 * Uses strongly-typed DocumentSnapshot from firebase-admin/firestore.
 */
export class BaseRepository {
  protected static get db(): Firestore {
    return adminDb;
  }

  /**
   * Recursively sanitizes any write payload for Firestore safety,
   * eliminating undefined fields while preserving null, dates, timestamps, sentinels, etc.
   */
  public static sanitizePayload<T>(payload: T): T {
    return sanitizeForFirestore(payload);
  }

  protected static sanitizeDoc<T>(doc: DocumentSnapshot): T {
    const data = doc.data();
    if (!data || typeof data !== 'object') {
      return { id: doc.id } as unknown as T;
    }
    return {
      id: doc.id,
      ...data,
    } as unknown as T;
  }
}
