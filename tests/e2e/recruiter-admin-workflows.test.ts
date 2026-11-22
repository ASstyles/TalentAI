import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminDb } from '@/lib/firebase/admin';
import { UserRepository } from '@/lib/repositories/user-repository';
import { JobRepository } from '@/lib/repositories/job-repository';
import { ApplicationRepository } from '@/lib/repositories/application-repository';
import { HiringDecisionRepository } from '@/lib/repositories/hiring-decision-repository';
import { AuditRepository } from '@/lib/repositories/audit-repository';
import { generateHiringRecommendation } from '@/lib/hiring/decision-support';
import { RecruiterAccessRequest } from '@/types/user';
import { JobOpening } from '@/types/job';

describe('Recruiter & Admin Governance End-to-End Workflows (Phase 10 & 12)', () => {
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

  it('Workflow: Recruiter access request -> Admin approval -> Recruiter provisions job -> Candidate applies -> Decision report generated', async () => {
    // 1. Recruiter submits access request
    const request: RecruiterAccessRequest = {
      id: 'req-recruiter-001',
      userId: 'user-recruiter-001',
      fullName: 'Sarah Chen',
      workEmail: 'sarah.chen@nexuscloud.io',
      companyName: 'Nexus Cloud Technologies',
      businessWebsite: 'https://nexuscloud.io',
      jobTitle: 'Head of Talent Acquisition',
      reason: 'Scaling core cloud platform engineering organization',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.set(`recruiterAccessRequests/${request.id}`, request);

    // 2. Admin reviews and approves request
    const retrievedReq = store.get(`recruiterAccessRequests/${request.id}`);
    expect(retrievedReq.status).toBe('pending');

    // Admin approval action
    store.set(`recruiterAccessRequests/${request.id}`, {
      ...retrievedReq,
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'admin-root-001',
    });

    const recruiterUid = request.userId || 'user-recruiter-001';

    // Update user role to recruiter
    await UserRepository.createOrUpdate(recruiterUid, {
      role: 'recruiter',
      orgId: 'org-nexuscloud',
      email: request.workEmail,
      displayName: request.fullName,
    });

    const recruiterUser = await UserRepository.getById(recruiterUid);
    expect(recruiterUser?.role).toBe('recruiter');
    expect(recruiterUser?.orgId).toBe('org-nexuscloud');

    // 3. Recruiter creates job opening
    const jobData: Omit<JobOpening, 'id' | 'createdAt' | 'updatedAt'> = {
      orgId: recruiterUser!.orgId!,
      title: 'Principal Distributed Systems Architect',
      specialization: 'Backend Engineer',
      seniority: 'staff',
      status: 'published',
      description: 'Lead next-generation distributed consensus storage engine.',
      responsibilities: ['Architect Multi-Paxos engine', 'Lead platform reliability'],
      mandatoryCompetencies: [
        { skillId: 'go', name: 'Go', category: 'languages', minLevel: 5, weight: 10 },
        { skillId: 'raft', name: 'Raft', category: 'systems', minLevel: 4, weight: 9 },
      ],
      preferredCompetencies: [],
      salaryRange: { min: 250000, max: 320000, currency: 'USD' },
      location: { type: 'hybrid', locationString: 'New York, NY' },
    };
    const createdJob = await JobRepository.create(jobData);
    expect(createdJob.id).toBeDefined();

    const publishedJob = await JobRepository.getById(createdJob.id);
    expect(publishedJob?.status).toBe('published');

    // 4. Candidate applies for job
    const candidateUid = 'cand-alex-001';
    const application = await ApplicationRepository.create({
      candidateId: candidateUid,
      jobId: createdJob.id,
      jobTitle: createdJob.title,
      orgId: createdJob.orgId,
      candidateName: 'Alex Mercer',
      candidateEmail: 'alex.mercer@gmail.com',
      resumeId: 'res-alex-001',
    });
    expect(application.id).toBeDefined();

    // 5. Recruiter updates application stage to assessing
    await ApplicationRepository.updateStatus(application.id, 'assessing');
    const updatedApp = await ApplicationRepository.getById(application.id);
    expect(updatedApp?.status).toBe('assessing');

    // 6. Hiring Decision Report synthesis
    const competencyProfile = {
      candidateId: candidateUid,
      calculatedAt: new Date().toISOString(),
      overallProficiencyScore: 90,
      evidenceIntegrityScore: 95,
      strongestSkills: ['Go', 'Raft', 'Distributed Systems'],
      growthAreas: ['Frontend Styling'],
      competencies: {
        'Go': { score: 95, confidence: 95, sources: [] },
        'Distributed Systems': { score: 90, confidence: 90, sources: [] },
      },
    } as any;

    const interviewSession = {
      id: 'int-001',
      candidateId: candidateUid,
      jobId: createdJob.id,
      overallScore: 88,
      totalQuestions: 5,
      completedQuestions: 5,
      status: 'completed',
    } as any;

    const codingSubmission = {
      id: 'sub-001',
      candidateId: candidateUid,
      assessmentId: 'code-001',
      score: 95,
      passedTests: 10,
      totalTests: 10,
    } as any;

    const recommendation = generateHiringRecommendation({
      applicationId: application.id,
      candidateId: candidateUid,
      candidateName: 'Alex Mercer',
      job: createdJob as any,
      competencyProfile,
      interviewSession,
      codingSubmission,
    });

    expect(recommendation.recommendationStatus).toBe('strong_match');
    expect(recommendation.summaryExecutive).toContain('readiness score');

    // 7. Persist hiring decision
    const record = await HiringDecisionRepository.recordDecision({
      applicationId: application.id,
      candidateId: candidateUid,
      decision: 'advance_to_offer',
      rationale: recommendation.summaryExecutive,
      decidedBy: {
        id: recruiterUid,
        role: 'recruiter',
        orgId: recruiterUser!.orgId,
      },
      isOverride: false,
    });
    expect(record.id).toBeDefined();
    expect(record.decision).toBe('advance_to_offer');

    const recordedDecision = await HiringDecisionRepository.getByApplicationId(application.id);
    expect(recordedDecision).not.toBeNull();
    expect(recordedDecision?.decision).toBe('advance_to_offer');

    // 8. Immutable audit event recorded
    await AuditRepository.recordLog({
      actor: request.fullName,
      actorId: recruiterUid,
      role: 'recruiter',
      action: 'HIRING_DECISION_FINALIZED',
      target: application.id,
      details: 'Recorded advance_to_offer recommendation with score 94%',
    });

    const auditLogs = await AuditRepository.getLogs(10);
    expect(auditLogs.some((l) => l.action === 'HIRING_DECISION_FINALIZED')).toBe(true);
  });
});
