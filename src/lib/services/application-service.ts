import { JobApplication, ApplicationStatus } from '@/types/application';
import { ApplicationRepository } from '../repositories/application-repository';

/**
 * Service facade delegating application operations to persistent ApplicationRepository in Firestore.
 */
export class ApplicationService {
  public static async getApplications(filters?: { candidateId?: string; orgId?: string; jobId?: string }): Promise<JobApplication[]> {
    return await ApplicationRepository.getAll(filters);
  }

  public static async getApplicationById(id: string): Promise<JobApplication | null> {
    return await ApplicationRepository.getById(id);
  }

  public static async createApplication(appData: {
    jobId: string;
    jobTitle?: string;
    orgId: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    resumeId: string;
  }): Promise<JobApplication> {
    return await ApplicationRepository.create(appData);
  }

  public static async updateApplicationStatus(id: string, status: ApplicationStatus): Promise<JobApplication> {
    return await ApplicationRepository.updateStatus(id, status);
  }
}
