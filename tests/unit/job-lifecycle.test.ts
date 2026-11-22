import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobRepository } from '@/lib/repositories/job-repository';
import { ApplicationRepository } from '@/lib/repositories/application-repository';
import { adminDb } from '@/lib/firebase/admin';
import { JobOpening } from '@/types/job';

describe('Job Lifecycle & Application Governance (Phase 3 & 12)', () => {
  const store = new Map<string, any>();

  beforeEach(() => {
    store.clear();

    vi.spyOn(adminDb, 'collection').mockImplementation((colName: string) => {
      return {
        doc: (docId: string) => {
          const key = `${colName}/${docId}`;
          return {
            id: docId,
            get: vi.fn().mockImplementation(async () => ({
              exists: store.has(key),
              id: docId,
              data: () => store.get(key),
            })),
            set: vi.fn().mockImplementation(async (data: any, opts?: any) => {
              if (opts?.merge && store.has(key)) {
                store.set(key, { ...store.get(key), ...data });
              } else {
                store.set(key, data);
              }
              return { writeTime: new Date() };
            }),
            update: vi.fn().mockImplementation(async (data: any) => {
              if (store.has(key)) {
                store.set(key, { ...store.get(key), ...data });
              }
              return { writeTime: new Date() };
            }),
            delete: vi.fn().mockImplementation(async () => {
              store.delete(key);
              return { writeTime: new Date() };
            }),
          };
        },
        where: vi.fn().mockImplementation((field: string, op: string, val: any) => {
          return {
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockImplementation(async () => {
              const docs: any[] = [];
              for (const [k, v] of store.entries()) {
                if (k.startsWith(`${colName}/`) && v[field] === val) {
                  docs.push({
                    id: k.split('/')[1],
                    data: () => v,
                  });
                }
              }
              return { empty: docs.length === 0, docs };
            }),
          };
        }),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockImplementation(async () => {
          const docs: any[] = [];
          for (const [k, v] of store.entries()) {
            if (k.startsWith(`${colName}/`)) {
              docs.push({
                id: k.split('/')[1],
                data: () => v,
              });
            }
          }
          return {
            empty: docs.length === 0,
            docs,
          };
        }),
      } as any;
    });
  });

  const sampleJobData: Omit<JobOpening, 'id' | 'createdAt' | 'updatedAt'> = {
    orgId: 'org-nexus-01',
    title: 'Staff Distributed Systems Engineer',
    specialization: 'Backend Engineer',
    seniority: 'staff',
    status: 'draft',
    description: 'Design and operate low-latency consensus protocols and event pipelines.',
    responsibilities: ['Architect Raft consensus clusters', 'Scale Kafka clusters to 1M events/sec'],
    mandatoryCompetencies: [
      { skillId: 'go', name: 'Go', category: 'languages', minLevel: 4, weight: 9 },
      { skillId: 'dist-sys', name: 'Distributed Systems', category: 'systems', minLevel: 4, weight: 10 },
    ],
    preferredCompetencies: [
      { skillId: 'raft', name: 'Raft', category: 'systems', minLevel: 3, weight: 8 },
    ],
    salaryRange: { min: 220000, max: 280000, currency: 'USD' },
    location: {
      type: 'hybrid',
      locationString: 'San Francisco, CA',
    },
  };

  it('creates and persists a new job requisition', async () => {
    const created = await JobRepository.create(sampleJobData);
    expect(created.id).toBeDefined();
    expect(created.status).toBe('draft');
    expect(created.title).toBe('Staff Distributed Systems Engineer');

    const fetched = await JobRepository.getById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Staff Distributed Systems Engineer');
  });

  it('updates job status through full recruitment lifecycle (draft -> published -> paused -> closed)', async () => {
    const created = await JobRepository.create(sampleJobData);

    // 1. Publish job
    await JobRepository.update(created.id, { status: 'published' });
    let current = await JobRepository.getById(created.id);
    expect(current?.status).toBe('published');

    // 2. Pause job (temporarily stop receiving applications)
    await JobRepository.update(created.id, { status: 'paused' });
    current = await JobRepository.getById(created.id);
    expect(current?.status).toBe('paused');

    // 3. Close job
    await JobRepository.update(created.id, { status: 'closed' });
    current = await JobRepository.getById(created.id);
    expect(current?.status).toBe('closed');
  });

  it('filters job requisitions by seniority and location type', async () => {
    await JobRepository.create(sampleJobData);
    await JobRepository.create({
      ...sampleJobData,
      title: 'Senior Frontend Engineer',
      specialization: 'Frontend Engineer',
      seniority: 'senior',
      location: { type: 'remote', locationString: 'Remote' },
      salaryRange: { min: 160000, max: 200000, currency: 'USD' },
      status: 'published',
    });

    const staffJobs = await JobRepository.getAll({ seniority: 'staff' });
    expect(staffJobs.every((j) => j.seniority === 'staff')).toBe(true);

    const remoteJobs = await JobRepository.getAll({ locationType: 'remote' });
    expect(remoteJobs.every((j) => j.location.type === 'remote')).toBe(true);
  });

  it('sorts jobs by salary descending', async () => {
    await JobRepository.create({
      ...sampleJobData,
      salaryRange: { min: 120000, max: 150000, currency: 'USD' },
    });
    await JobRepository.create({
      ...sampleJobData,
      salaryRange: { min: 250000, max: 320000, currency: 'USD' },
    });

    const sortedBySalary = await JobRepository.getAll({ sort: 'salary' });
    expect(sortedBySalary[0].salaryRange?.max).toBeGreaterThanOrEqual(
      sortedBySalary[sortedBySalary.length - 1].salaryRange?.max || 0
    );
  });

  it('submits a candidate application and handles duplicate applications safely', async () => {
    const job = await JobRepository.create({ ...sampleJobData, status: 'published' });

    const applicationPayload = {
      candidateId: 'cand-user-456',
      jobId: job.id,
      jobTitle: job.title,
      orgId: 'org-nexus-01',
      candidateName: 'Alex Mercer',
      candidateEmail: 'alex.mercer@gmail.com',
      resumeId: 'res-alex-001',
    };

    const firstApp = await ApplicationRepository.create(applicationPayload);
    expect(firstApp).toBeDefined();
    expect(firstApp.candidateId).toBe('cand-user-456');

    // Verify application recorded in store
    const app = await ApplicationRepository.getById(firstApp.id);
    expect(app).not.toBeNull();
    expect(app?.candidateId).toBe('cand-user-456');

    // Duplicate submission should safely return existing application without creating duplicate
    const secondApp = await ApplicationRepository.create(applicationPayload);
    expect(secondApp.id).toBe(firstApp.id);
  });

  it('deletes/archives a job requisition', async () => {
    const created = await JobRepository.create(sampleJobData);
    expect(await JobRepository.getById(created.id)).not.toBeNull();

    await JobRepository.delete(created.id);
    expect(await JobRepository.getById(created.id)).toBeNull();
  });
});
