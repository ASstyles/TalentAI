import { BaseRepository } from './base';
import { JobOpening, JobStatus } from '@/types/job';
import { MOCK_JOBS } from '@/lib/data/mock-data';

const COLLECTION = 'jobOpenings';

export class JobRepository extends BaseRepository {
  public static async getAll(filters?: { status?: JobStatus; orgId?: string }): Promise<JobOpening[]> {
    try {
      let query: FirebaseFirestore.Query = this.db.collection(COLLECTION);
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters?.orgId) {
        query = query.where('orgId', '==', filters.orgId);
      }

      const snap = await query.get();
      if (!snap.empty) {
        return snap.docs.map((doc) => this.sanitizeDoc<JobOpening>(doc));
      }

      // If Firestore collection is empty in local dev, seed initial published jobs
      return MOCK_JOBS.filter((j) => {
        if (filters?.status && j.status !== filters.status) return false;
        if (filters?.orgId && j.orgId !== filters.orgId) return false;
        return true;
      });
    } catch {
      // Graceful fallback to mock jobs if Firestore offline in local mode
      return MOCK_JOBS.filter((j) => {
        if (filters?.status && j.status !== filters.status) return false;
        if (filters?.orgId && j.orgId !== filters.orgId) return false;
        return true;
      });
    }
  }

  public static async getById(id: string): Promise<JobOpening | null> {
    try {
      const doc = await this.db.collection(COLLECTION).doc(id).get();
      if (doc.exists) {
        return this.sanitizeDoc<JobOpening>(doc);
      }
      return MOCK_JOBS.find((j) => j.id === id) || null;
    } catch {
      return MOCK_JOBS.find((j) => j.id === id) || null;
    }
  }

  public static async create(jobData: Omit<JobOpening, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobOpening> {
    const id = `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newJob: JobOpening = {
      ...jobData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.db.collection(COLLECTION).doc(id).set(newJob);
    } catch (err) {
      console.warn('[JobRepository] Firestore write skipped (offline/emulator):', err);
    }

    return newJob;
  }

  public static async updateStatus(id: string, status: JobStatus): Promise<JobOpening> {
    const now = new Date().toISOString();
    try {
      await this.db.collection(COLLECTION).doc(id).update({
        status,
        updatedAt: now,
      });
      const updated = await this.getById(id);
      if (!updated) throw new Error(`Job ${id} not found`);
      return updated;
    } catch {
      const existing = MOCK_JOBS.find((j) => j.id === id);
      if (!existing) throw new Error(`Job ${id} not found`);
      existing.status = status;
      existing.updatedAt = now;
      return { ...existing };
    }
  }
}
