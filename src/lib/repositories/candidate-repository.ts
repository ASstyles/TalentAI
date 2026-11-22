import { BaseRepository } from './base';
import { CandidateProfile } from '@/types/user';
import { MOCK_CANDIDATE } from '@/lib/data/mock-data';

const COLLECTION = 'candidateProfiles';

export class CandidateRepository extends BaseRepository {
  public static async getProfile(candidateId: string): Promise<CandidateProfile | null> {
    try {
      const doc = await this.db.collection(COLLECTION).doc(candidateId).get();
      if (doc.exists) {
        return this.sanitizeDoc<CandidateProfile>(doc);
      }
      // If mock candidate matches, return initial seed data
      if (candidateId === MOCK_CANDIDATE.id || candidateId === MOCK_CANDIDATE.userId) {
        return { ...MOCK_CANDIDATE };
      }
      return null;
    } catch {
      if (candidateId === MOCK_CANDIDATE.id || candidateId === MOCK_CANDIDATE.userId) {
        return { ...MOCK_CANDIDATE };
      }
      return null;
    }
  }

  public static async saveProfile(
    candidateId: string,
    updates: Partial<CandidateProfile>
  ): Promise<CandidateProfile> {
    const now = new Date().toISOString();
    const existing = (await this.getProfile(candidateId)) || {
      id: candidateId,
      userId: candidateId,
      headline: '',
      summary: '',
      yearsOfExperience: 0,
      location: { city: '', country: '', remotePreference: 'flexible' },
      overallVerificationScore: 0,
      createdAt: now,
      updatedAt: now,
    };

    const merged: CandidateProfile = {
      ...existing,
      ...updates,
      id: candidateId,
      updatedAt: now,
    };

    try {
      await this.db.collection(COLLECTION).doc(candidateId).set(merged, { merge: true });
    } catch (err) {
      console.warn('[CandidateRepository] Firestore write skipped (offline/emulator):', err);
    }

    return merged;
  }
}
