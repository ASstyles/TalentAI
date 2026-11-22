import { BaseRepository } from './base';
import { JobApplication, ApplicationStatus } from '@/types/application';
import { MOCK_APPLICATIONS, isDemoFixturesEnabled } from '@/lib/data/mock-data';

const COLLECTION = 'jobApplications';

export class ApplicationRepository extends BaseRepository {
  public static async getAll(filters?: { candidateId?: string; orgId?: string; jobId?: string }): Promise<JobApplication[]> {
    try {
      let query: FirebaseFirestore.Query = this.db.collection(COLLECTION);
      if (filters?.candidateId) {
        query = query.where('candidateId', '==', filters.candidateId);
      }
      if (filters?.orgId) {
        query = query.where('orgId', '==', filters.orgId);
      }
      if (filters?.jobId) {
        query = query.where('jobId', '==', filters.jobId);
      }

      const snap = await query.get();
      if (!snap.empty) {
        return snap.docs.map((doc) => this.sanitizeDoc<JobApplication>(doc));
      }
    } catch {
      // In case of read failure, check demo fixtures
    }

    if (isDemoFixturesEnabled()) {
      return MOCK_APPLICATIONS.filter((a) => {
        if (filters?.candidateId && a.candidateId !== filters.candidateId) return false;
        if (filters?.orgId && a.orgId !== filters.orgId) return false;
        if (filters?.jobId && a.jobId !== filters.jobId) return false;
        return true;
      });
    }

    return [];
  }

  public static async getById(id: string): Promise<JobApplication | null> {
    try {
      const doc = await this.db.collection(COLLECTION).doc(id).get();
      if (doc.exists) {
        return this.sanitizeDoc<JobApplication>(doc);
      }
    } catch {
      // Handled below
    }

    if (isDemoFixturesEnabled()) {
      return MOCK_APPLICATIONS.find((a) => a.id === id) || null;
    }
    return null;
  }

  public static async create(appData: {
    jobId: string;
    jobTitle?: string;
    orgId: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    resumeId: string;
  }): Promise<JobApplication> {
    // Check for existing application to avoid duplicate submissions
    const existing = await this.getAll({ candidateId: appData.candidateId, jobId: appData.jobId });
    if (existing.length > 0) {
      return existing[0];
    }

    const id = `app-${appData.candidateId}-${appData.jobId}`;
    const now = new Date().toISOString();
    const newApp: JobApplication = {
      ...appData,
      id,
      status: 'applied',
      appliedAt: now,
      updatedAt: now,
    };

    // DEF-012 Remediation: Fail closed. Throw error on Firestore write failure
    await this.db.collection(COLLECTION).doc(id).set(newApp);
    return newApp;
  }

  public static async updateStatus(id: string, status: ApplicationStatus): Promise<JobApplication> {
    const now = new Date().toISOString();
    await this.db.collection(COLLECTION).doc(id).update({
      status,
      updatedAt: now,
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Application ${id} not found`);
    return updated;
  }
}
