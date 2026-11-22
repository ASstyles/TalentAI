import { JobOpening, JobStatus } from '@/types/job';
import { MOCK_JOBS } from '@/lib/data/mock-data';

// Persistent in-memory storage backed by seed data
let jobsStore: JobOpening[] = [...MOCK_JOBS];

export class JobService {
  public static async getJobs(): Promise<JobOpening[]> {
    return [...jobsStore];
  }

  public static async getJobById(id: string): Promise<JobOpening | null> {
    return jobsStore.find((j) => j.id === id) || null;
  }

  public static async createJob(jobData: Omit<JobOpening, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobOpening> {
    const newJob: JobOpening = {
      ...jobData,
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    jobsStore.unshift(newJob);
    return newJob;
  }

  public static async updateJobStatus(id: string, status: JobStatus): Promise<JobOpening> {
    const job = jobsStore.find((j) => j.id === id);
    if (!job) throw new Error(`Job opening ${id} not found`);
    job.status = status;
    job.updatedAt = new Date().toISOString();
    return { ...job };
  }
}
