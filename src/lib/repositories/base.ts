import { adminDb } from '../firebase/admin';
import type { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';

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
