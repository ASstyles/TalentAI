import { BaseRepository, PersistenceError, sanitizeForFirestore } from './base';
import { JobOpening, JobStatus, SeniorityLevel } from '@/types/job';
import { MOCK_JOBS, isDemoFixturesEnabled } from '@/lib/data/mock-data';
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';

const COLLECTION = 'jobOpenings';

export interface JobFilters {
  status?: JobStatus;
  orgId?: string;
  search?: string;
  seniority?: SeniorityLevel | string;
  specialization?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  sort?: 'newest' | 'salary';
}

export class JobRepository extends BaseRepository {
  public static async getAll(filters?: JobFilters): Promise<JobOpening[]> {
    let jobs: JobOpening[] = [];

    try {
      let query: Query = this.db.collection(COLLECTION);
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters?.orgId) {
        query = query.where('orgId', '==', filters.orgId);
      }

      const snap = await query.get();
      if (!snap.empty) {
        jobs = snap.docs.map((doc: QueryDocumentSnapshot) => this.sanitizeDoc<JobOpening>(doc));
      }
    } catch (err: unknown) {
      if (!isDemoFixturesEnabled()) {
        const errorObj = err as { code?: string; message?: string };
        throw new PersistenceError(
          `Failed to list jobs: ${errorObj?.message || 'Database error'}`,
          errorObj?.code || 'FIRESTORE_READ_ERROR',
          err
        );
      }
    }

    if (jobs.length === 0 && isDemoFixturesEnabled()) {
      jobs = MOCK_JOBS.filter((j) => {
        if (filters?.status && j.status !== filters.status) return false;
        if (filters?.orgId && j.orgId !== filters.orgId) return false;
        return true;
      });
    }

    // Apply in-memory search, specialization, seniority, and location filters
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.specialization.toLowerCase().includes(q) ||
          j.location.locationString.toLowerCase().includes(q) ||
          j.mandatoryCompetencies.some((c) => c.name.toLowerCase().includes(q))
      );
    }

    if (filters?.seniority) {
      jobs = jobs.filter((j) => j.seniority.toLowerCase() === filters.seniority?.toLowerCase());
    }

    if (filters?.specialization) {
      jobs = jobs.filter((j) => j.specialization.toLowerCase() === filters.specialization?.toLowerCase());
    }

    if (filters?.locationType) {
      jobs = jobs.filter((j) => j.location.type === filters.locationType);
    }

    // Apply sorting
    if (filters?.sort === 'salary') {
      jobs.sort((a, b) => (b.salaryRange?.max || 0) - (a.salaryRange?.max || 0));
    } else {
      // Default to newest
      jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return jobs;
  }

  public static async getById(id: string): Promise<JobOpening | null> {
    if (!id || typeof id !== 'string') return null;
    const cleanId = id.trim();

    try {
      const doc = await this.db.collection(COLLECTION).doc(cleanId).get();
      if (doc.exists) {
        return this.sanitizeDoc<JobOpening>(doc);
      }
    } catch (err: unknown) {
      if (!isDemoFixturesEnabled()) {
        const errorObj = err as { code?: string; message?: string };
        throw new PersistenceError(
          `Failed to get job '${cleanId}': ${errorObj?.message || 'Database error'}`,
          errorObj?.code || 'FIRESTORE_READ_ERROR',
          err
        );
      }
    }

    if (isDemoFixturesEnabled()) {
      return MOCK_JOBS.find((j) => j.id === cleanId) || null;
    }
    return null;
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

    const sanitized = sanitizeForFirestore(newJob);

    try {
      await this.db.collection(COLLECTION).doc(id).set(sanitized);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      throw new PersistenceError(
        `Failed to create job '${id}': ${errorObj?.message || 'Write error'}`,
        errorObj?.code || 'FIRESTORE_WRITE_ERROR',
        err
      );
    }

    return sanitized as unknown as JobOpening;
  }

  public static async update(id: string, updates: Partial<JobOpening>): Promise<JobOpening> {
    const cleanId = id.trim();
    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };
    delete (cleanUpdates as { id?: string }).id;
    delete (cleanUpdates as { createdAt?: string }).createdAt;

    const sanitized = sanitizeForFirestore(cleanUpdates);

    try {
      await this.db.collection(COLLECTION).doc(cleanId).update(sanitized);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      throw new PersistenceError(
        `Failed to update job '${cleanId}': ${errorObj?.message || 'Update error'}`,
        errorObj?.code || 'FIRESTORE_WRITE_ERROR',
        err
      );
    }

    const updated = await this.getById(cleanId);
    if (!updated) throw new PersistenceError(`Job '${cleanId}' not found after update`, 'NOT_FOUND');
    return updated;
  }

  public static async updateStatus(id: string, status: JobStatus): Promise<JobOpening> {
    return await this.update(id, { status });
  }

  public static async delete(id: string): Promise<boolean> {
    const cleanId = id.trim();
    try {
      await this.db.collection(COLLECTION).doc(cleanId).delete();
      return true;
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      throw new PersistenceError(
        `Failed to delete job '${cleanId}': ${errorObj?.message || 'Delete error'}`,
        errorObj?.code || 'FIRESTORE_WRITE_ERROR',
        err
      );
    }
  }
}
