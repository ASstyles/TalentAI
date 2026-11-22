import { JobApplication, ApplicationStatus } from '@/types/application';
import { MOCK_APPLICATIONS } from '@/lib/data/mock-data';

let applicationsStore: JobApplication[] = [...MOCK_APPLICATIONS];

export class ApplicationService {
  public static async getApplications(): Promise<JobApplication[]> {
    return [...applicationsStore];
  }

  public static async getApplicationById(id: string): Promise<JobApplication | null> {
    return applicationsStore.find((a) => a.id === id) || null;
  }

  public static async createApplication({
    jobId,
    jobTitle,
    orgId,
    candidateId,
    candidateName,
    candidateEmail,
    resumeId,
  }: {
    jobId: string;
    jobTitle?: string;
    orgId: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    resumeId: string;
  }): Promise<JobApplication> {
    // Prevent duplicate applications
    const existing = applicationsStore.find((a) => a.jobId === jobId && a.candidateId === candidateId);
    if (existing) return existing;

    const newApp: JobApplication = {
      id: `app-${candidateId}-${jobId}`,
      jobId,
      jobTitle,
      orgId,
      candidateId,
      candidateName,
      candidateEmail,
      resumeId,
      status: 'applied',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    applicationsStore.unshift(newApp);
    return newApp;
  }

  public static async updateApplicationStatus(id: string, status: ApplicationStatus): Promise<JobApplication> {
    const app = applicationsStore.find((a) => a.id === id);
    if (!app) throw new Error(`Application ${id} not found`);
    app.status = status;
    app.updatedAt = new Date().toISOString();
    return { ...app };
  }
}
