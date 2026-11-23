import { BaseRepository, PersistenceError, sanitizeForFirestore } from './base';
import { CandidateProfile } from '@/types/user';
import { MOCK_CANDIDATE, isDemoFixturesEnabled } from '@/lib/data/mock-data';

const COLLECTION = 'candidateProfiles';

export class CandidateRepository extends BaseRepository {
  public static async getProfile(candidateId: string): Promise<CandidateProfile | null> {
    if (!candidateId || typeof candidateId !== 'string') return null;
    const cleanId = candidateId.trim();

    try {
      const doc = await this.db.collection(COLLECTION).doc(cleanId).get();
      if (doc.exists) {
        return this.sanitizeDoc<CandidateProfile>(doc);
      }
    } catch (err: unknown) {
      if (!isDemoFixturesEnabled()) {
        const errorObj = err as { code?: string; message?: string };
        throw new PersistenceError(
          `Failed to get candidate profile '${candidateId}': ${errorObj?.message || 'Database error'}`,
          errorObj?.code || 'FIRESTORE_READ_ERROR',
          err
        );
      }
    }

    if (isDemoFixturesEnabled()) {
      if (cleanId === MOCK_CANDIDATE.id || cleanId === MOCK_CANDIDATE.userId || cleanId.includes('alex')) {
        return { ...MOCK_CANDIDATE, id: cleanId };
      }
    }
    return null;
  }

  public static async saveProfile(
    candidateId: string,
    updates: Partial<CandidateProfile>
  ): Promise<CandidateProfile> {
    if (!candidateId || typeof candidateId !== 'string') {
      throw new PersistenceError('Invalid candidate ID provided for saveProfile', 'INVALID_ARGUMENT');
    }
    const cleanId = candidateId.trim();
    const now = new Date().toISOString();

    let existing: CandidateProfile | null = null;
    try {
      existing = await this.getProfile(cleanId);
    } catch {
      // Continue with default profile initialization
    }

    const defaultProfile: CandidateProfile = {
      id: cleanId,
      userId: cleanId,
      headline: '',
      summary: '',
      yearsOfExperience: 0,
      location: { city: '', country: '', remotePreference: 'flexible' },
      overallVerificationScore: 0,
      createdAt: now,
      updatedAt: now,
    };

    const merged = {
      ...defaultProfile,
      ...(existing || {}),
      ...updates,
      id: cleanId,
      userId: cleanId,
      updatedAt: now,
    };

    const sanitized = sanitizeForFirestore(merged);

    try {
      await this.db.collection(COLLECTION).doc(cleanId).set(sanitized, { merge: true });
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      throw new PersistenceError(
        `Failed to save candidate profile '${cleanId}': ${errorObj?.message || 'Write error'}`,
        errorObj?.code || 'FIRESTORE_WRITE_ERROR',
        err
      );
    }

    return sanitized as unknown as CandidateProfile;
  }
}
