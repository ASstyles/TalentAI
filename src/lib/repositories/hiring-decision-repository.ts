import { BaseRepository } from './base';
import { RecruiterDecision } from '@/types/hiring';
import { ApplicationRepository } from './application-repository';
import { AuditRepository } from './audit-repository';

const COLLECTION = 'hiringDecisions';

export interface HiringDecisionRecord {
  id: string;
  applicationId: string;
  candidateId: string;
  decision: RecruiterDecision;
  rationale: string;
  decidedBy: {
    id: string;
    role: string;
    orgId?: string;
  };
  isOverride: boolean;
  timestamp: string;
}

export class HiringDecisionRepository extends BaseRepository {
  public static async recordDecision(params: {
    applicationId: string;
    candidateId: string;
    decision: RecruiterDecision;
    rationale: string;
    decidedBy: {
      id: string;
      role: string;
      orgId?: string;
    };
    isOverride: boolean;
  }): Promise<HiringDecisionRecord> {
    const id = `dec-${params.applicationId}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const record: HiringDecisionRecord = {
      id,
      applicationId: params.applicationId,
      candidateId: params.candidateId,
      decision: params.decision,
      rationale: params.rationale,
      decidedBy: params.decidedBy,
      isOverride: params.isOverride,
      timestamp,
    };

    // 1. Transactional write in Firestore if available
    try {
      const decisionRef = this.db.collection(COLLECTION).doc(id);
      const appRef = this.db.collection('jobApplications').doc(params.applicationId);

      await this.db.runTransaction(async (transaction) => {
        const appDoc = await transaction.get(appRef);
        const nextStatus =
          params.decision === 'advance_to_offer'
            ? 'offered'
            : params.decision === 'reject'
            ? 'rejected'
            : params.decision === 'schedule_panel'
            ? 'interviewing'
            : 'review';

        transaction.set(decisionRef, record);
        if (appDoc.exists) {
          transaction.update(appRef, {
            status: nextStatus,
            hiringRecommendationId: id,
            updatedAt: timestamp,
          });
        }
      });
    } catch (err) {
      console.warn('[HiringDecisionRepository] Firestore transaction fallback:', err);
      // Fallback local update
      const nextStatus =
        params.decision === 'advance_to_offer'
          ? 'offered'
          : params.decision === 'reject'
          ? 'rejected'
          : params.decision === 'schedule_panel'
          ? 'interviewing'
          : 'review';
      await ApplicationRepository.updateStatus(params.applicationId, nextStatus as any).catch(() => {});
    }

    // 2. Commit immutable audit log
    await AuditRepository.recordLog({
      actor: `User ${params.decidedBy.id}`,
      actorId: params.decidedBy.id,
      role: params.decidedBy.role,
      action: params.isOverride ? 'OVERRIDE_AND_RECORD_DECISION' : 'RECORD_HIRING_DECISION',
      target: `Application: ${params.applicationId} (Candidate: ${params.candidateId})`,
      details: `Decision: ${params.decision.toUpperCase()}. Rationale: "${params.rationale}"`,
    });

    return record;
  }
}
