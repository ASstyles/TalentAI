import { BaseRepository } from './base';
import { User, UserRole } from '@/types/user';

const COLLECTION = 'users';

export class UserRepository extends BaseRepository {
  public static async getById(uid: string): Promise<User | null> {
    try {
      const doc = await this.db.collection(COLLECTION).doc(uid).get();
      if (doc.exists) {
        return this.sanitizeDoc<User>(doc);
      }
      return null;
    } catch {
      return null;
    }
  }

  public static async createOrUpdate(uid: string, userData: Partial<User>): Promise<User> {
    const now = new Date().toISOString();
    const existing = await this.getById(uid);
    const merged: User = {
      id: uid,
      email: userData.email || existing?.email || '',
      displayName: userData.displayName || existing?.displayName || '',
      role: userData.role || existing?.role || 'candidate',
      status: userData.status || existing?.status || 'active',
      orgId: userData.orgId || existing?.orgId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastLoginAt: userData.lastLoginAt || existing?.lastLoginAt || now,
    };

    try {
      await this.db.collection(COLLECTION).doc(uid).set(merged, { merge: true });
    } catch (err) {
      console.warn('[UserRepository] Firestore write skipped:', err);
    }

    return merged;
  }
}
