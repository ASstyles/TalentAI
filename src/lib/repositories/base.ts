import { adminDb } from '../firebase/admin';

export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Base repository utilities providing safe Firestore access and serialization.
 */
export class BaseRepository {
  protected static get db() {
    return adminDb;
  }

  protected static sanitizeDoc<T>(doc: FirebaseFirestore.DocumentSnapshot): T {
    const data = doc.data() as Record<string, any>;
    return {
      id: doc.id,
      ...data,
    } as unknown as T;
  }
}
