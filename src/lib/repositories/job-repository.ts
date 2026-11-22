import { BaseRepository } from './base';
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
    } catch {
      // In case of read failure, proceed to demo fixtures check
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
    try {
      const doc = await this.db.collection(COLLECTION).doc(id).get();
      if (doc.exists) {
        return this.sanitizeDoc<JobOpening>(doc);
      }
    } catch {
      // Handled below
    }

    if (isDemoFixturesEnabled()) {
      return MOCK_JOBS.find((j) => j.id === id) || null;
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

    // DEF-012 Remediation: Fail closed. Throw error on Firestore write failure
    await this.db.collection(COLLECTION).doc(id).set(newJob);
    return newJob;
  }

  public static async update(id: string, updates: Partial<JobOpening>): Promise<JobOpening> {
    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };
    delete (cleanUpdates as any).id;
    delete (cleanUpdates as any).createdAt;

    await this.db.collection(COLLECTION).doc(id).update(cleanUpdates);
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Job ${id} not found after update`);
    return updated;
  }

  public static async updateStatus(id: string, status: JobStatus): Promise<JobOpening> {
    return await this.update(id, { status });
  }

  public static async delete(id: string): Promise<boolean> {
    await this.db.collection(COLLECTION).doc(id).delete();
    return true;
  }
}
