import { JobOpening, JobStatus } from '@/types/job';
import { JobRepository, JobFilters } from '../repositories/job-repository';

/**
 * Service facade delegating job operations to persistent JobRepository in Firestore.
 */
export class JobService {
  public static async getJobs(filters?: JobFilters): Promise<JobOpening[]> {
    return await JobRepository.getAll(filters);
  }

  public static async getJobById(id: string): Promise<JobOpening | null> {
    return await JobRepository.getById(id);
  }

  public static async createJob(jobData: Omit<JobOpening, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobOpening> {
    return await JobRepository.create(jobData);
  }

  public static async updateJob(id: string, updates: Partial<JobOpening>): Promise<JobOpening> {
    return await JobRepository.update(id, updates);
  }

  public static async updateJobStatus(id: string, status: JobStatus): Promise<JobOpening> {
    return await JobRepository.updateStatus(id, status);
  }

  public static async deleteJob(id: string): Promise<boolean> {
    return await JobRepository.delete(id);
  }
}
