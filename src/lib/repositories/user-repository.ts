import { BaseRepository, PersistenceError, sanitizeForFirestore } from './base';
import { User, UserRole, UserStatus } from '@/types/user';

const COLLECTION = 'users';

export class UserRepository extends BaseRepository {
  /**
   * Retrieves a user by their Firebase UID.
   * Returns null strictly when the document does NOT exist.
   * Throws a PersistenceError for actual database or network failures.
   */
  public static async getById(uid: string): Promise<User | null> {
    if (!uid || typeof uid !== 'string' || !uid.trim()) {
      return null;
    }

    try {
      const doc = await this.db.collection(COLLECTION).doc(uid.trim()).get();
      if (doc.exists) {
        return this.sanitizeDoc<User>(doc);
      }
      return null;
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      console.error(`[UserRepository.getById] Firestore read failure for UID '${uid}':`, errorObj?.message || err);
      throw new PersistenceError(
        `Failed to retrieve user document '${uid}': ${errorObj?.message || 'Database error'}`,
        errorObj?.code || 'FIRESTORE_READ_ERROR',
        err
      );
    }
  }

  /**
   * Creates or updates a user document in Firestore.
   * Sanitizes all payloads to guarantee no 'undefined' fields are passed to Firestore.
   *
   * Invariant Rules:
   * 1. Candidate and Admin accounts NEVER contain an 'orgId' field (omitted entirely).
   * 2. Recruiter accounts retain existing 'orgId' unless explicitly provided.
   * 3. Missing orgId is never fabricated; undefined values are omitted.
   * 4. Does not swallow write exceptions (fails closed with PersistenceError).
   */
  public static async createOrUpdate(uid: string, userData: Partial<User>): Promise<User> {
    if (!uid || typeof uid !== 'string' || !uid.trim()) {
      throw new PersistenceError('Invalid user ID provided for createOrUpdate', 'INVALID_ARGUMENT');
    }

    const cleanUid = uid.trim();
    const now = new Date().toISOString();

    // Fetch existing user. If a Firestore error occurs, this throws PersistenceError.
    const existing = await this.getById(cleanUid);

    const role: UserRole = userData.role || existing?.role || 'candidate';
    const status: UserStatus = userData.status || existing?.status || 'active';

    // Strict orgId resolution:
    // Only recruiters may have an orgId. Candidates and Admins never carry orgId.
    let resolvedOrgId: string | undefined = undefined;
    if (role === 'recruiter') {
      const candidateOrgId = userData.orgId !== undefined ? userData.orgId : existing?.orgId;
      if (typeof candidateOrgId === 'string' && candidateOrgId.trim()) {
        resolvedOrgId = candidateOrgId.trim();
      }
    }

    const payload: Record<string, unknown> = {
      id: cleanUid,
      email: userData.email ?? existing?.email ?? '',
      displayName: userData.displayName ?? existing?.displayName ?? '',
      role,
      status,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastLoginAt: userData.lastLoginAt || existing?.lastLoginAt || now,
    };

    if (userData.photoURL !== undefined || existing?.photoURL !== undefined) {
      const photo = userData.photoURL ?? existing?.photoURL;
      if (photo) payload.photoURL = photo;
    }

    // Only attach orgId if resolved as a valid string
    if (resolvedOrgId !== undefined) {
      payload.orgId = resolvedOrgId;
    }

    const sanitizedPayload = sanitizeForFirestore(payload);

    try {
      await this.db.collection(COLLECTION).doc(cleanUid).set(sanitizedPayload, { merge: true });
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      console.error(`[UserRepository.createOrUpdate] Firestore write failure for UID '${cleanUid}':`, errorObj?.message || err);
      throw new PersistenceError(
        `Failed to persist user document '${cleanUid}': ${errorObj?.message || 'Write error'}`,
        errorObj?.code || 'FIRESTORE_WRITE_ERROR',
        err
      );
    }

    return sanitizedPayload as unknown as User;
  }

  /**
   * Lists users up to the specified limit.
   * Throws a PersistenceError on database read failure.
   */
  public static async listUsers(limitCount = 50): Promise<User[]> {
    try {
      const snap = await this.db.collection(COLLECTION).limit(limitCount).get();
      return snap.docs.map((doc) => this.sanitizeDoc<User>(doc));
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      console.error('[UserRepository.listUsers] Firestore read failure:', errorObj?.message || err);
      throw new PersistenceError(
        `Failed to list users: ${errorObj?.message || 'Database error'}`,
        errorObj?.code || 'FIRESTORE_READ_ERROR',
        err
      );
    }
  }
}
