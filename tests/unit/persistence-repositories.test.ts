import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobRepository } from '@/lib/repositories/job-repository';
import { ApplicationRepository } from '@/lib/repositories/application-repository';
import { CandidateRepository } from '@/lib/repositories/candidate-repository';
import { HiringDecisionRepository } from '@/lib/repositories/hiring-decision-repository';
import { AuditRepository } from '@/lib/repositories/audit-repository';
import { adminDb } from '@/lib/firebase/admin';

describe('Firestore Persistence Repositories (DEF-006 & DEF-011)', () => {
  const store = new Map<string, any>();

  beforeEach(() => {
    store.clear();

    // Mock Firestore collection & doc behavior for fast, deterministic unit testing
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
          };
        },
        where: vi.fn().mockReturnThis(),
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

    vi.spyOn(adminDb, 'runTransaction').mockImplementation(async (updateFn: any) => {
      const mockTx = {
        get: vi.fn().mockImplementation(async (ref: any) => {
          return await ref.get();
        }),
        set: vi.fn().mockImplementation((ref: any, data: any) => {
          const key = `hiringDecisions/${ref.id}`;
          store.set(key, data);
        }),
        update: vi.fn().mockImplementation((ref: any, data: any) => {
          const key = `jobApplications/${ref.id}`;
          if (store.has(key)) {
            store.set(key, { ...store.get(key), ...data });
          }
        }),
      };
      return await updateFn(mockTx);
    });
  });

  it('JobRepository creates and retrieves job openings with persistent fields', async () => {
    const job = await JobRepository.create({
      orgId: 'org-google-deepmind',
      title: 'Staff Distributed Systems Engineer',
      specialization: 'Backend Engineer',
      seniority: 'staff',
      status: 'published',
      description: 'Architect world-class distributed storage systems with microsecond latencies.',
      responsibilities: ['Build distributed consensus algorithms', 'Lead technical design reviews'],
      mandatoryCompetencies: [
        { skillId: 'systems', name: 'Distributed Systems', category: 'systems', minLevel: 5, weight: 10 },
      ],
      preferredCompetencies: [],
      location: { type: 'remote', locationString: 'Global' },
    });

    expect(job.id).toBeDefined();
    expect(job.title).toBe('Staff Distributed Systems Engineer');
    expect(job.status).toBe('published');

    const fetched = await JobRepository.getById(job.id);
    expect(fetched).toBeDefined();
    expect(fetched?.specialization).toBe('Backend Engineer');
  });

  it('ApplicationRepository prevents duplicate candidate applications for the same job', async () => {
    const candidateId = 'cand-persist-test-101';
    const jobId = 'job-lead-fullstack';

    const app1 = await ApplicationRepository.create({
      jobId,
      orgId: 'org-google-deepmind',
      candidateId,
      candidateName: 'Persistence Tester',
      candidateEmail: 'persist@test.com',
      resumeId: 'res-101',
    });

    const app2 = await ApplicationRepository.create({
      jobId,
      orgId: 'org-google-deepmind',
      candidateId,
      candidateName: 'Persistence Tester',
      candidateEmail: 'persist@test.com',
      resumeId: 'res-101',
    });

    expect(app1.id).toBe(app2.id);
  });

  it('CandidateRepository saves and merges candidate profile updates', async () => {
    const candidateId = 'cand-profile-test-999';
    const saved = await CandidateRepository.saveProfile(candidateId, {
      headline: 'Principal Security Architect',
      yearsOfExperience: 12,
      summary: 'Specializing in Zero-Trust and Cloud Architecture.',
    });

    expect(saved.id).toBe(candidateId);
    expect(saved.headline).toBe('Principal Security Architect');
    expect(saved.yearsOfExperience).toBe(12);

    const retrieved = await CandidateRepository.getProfile(candidateId);
    expect(retrieved?.headline).toBe('Principal Security Architect');
    expect(retrieved?.summary).toContain('Zero-Trust');
  });

  it('HiringDecisionRepository records human decision and appends immutable audit log entry', async () => {
    const decision = await HiringDecisionRepository.recordDecision({
      applicationId: 'app-persist-101',
      candidateId: 'cand-persist-101',
      decision: 'advance_to_offer',
      rationale: 'Demonstrated outstanding technical leadership and 100% test pass rate in assessment.',
      decidedBy: {
        id: 'recruiter-sarah-chen',
        role: 'recruiter',
        orgId: 'org-google-deepmind',
      },
      isOverride: false,
    });

    expect(decision.id).toBeDefined();
    expect(decision.decision).toBe('advance_to_offer');
    expect(decision.decidedBy.role).toBe('recruiter');

    const auditLogs = await AuditRepository.getLogs();
    const matchingLog = auditLogs.find((l) => l.target.includes('app-persist-101'));
    expect(matchingLog).toBeDefined();
    expect(matchingLog?.action).toBe('RECORD_HIRING_DECISION');
  });
});
