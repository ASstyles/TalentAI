import { BaseRepository, PersistenceError, sanitizeForFirestore } from './base';
import { RecruiterDecision } from '@/types/hiring';
import { AuditRepository } from './audit-repository';
import type { Transaction } from 'firebase-admin/firestore';

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

    // DEF-006 & DEF-012: Enforce true atomic Firestore transaction. Fail closed on transaction error.
    const decisionRef = this.db.collection(COLLECTION).doc(id);
    const appRef = this.db.collection('jobApplications').doc(params.applicationId);

    const sanitizedRecord = sanitizeForFirestore(record);

    try {
      await this.db.runTransaction(async (transaction: Transaction) => {
        const appDoc = await transaction.get(appRef);
        const nextStatus =
          params.decision === 'advance_to_offer'
            ? 'offered'
            : params.decision === 'reject'
            ? 'rejected'
            : params.decision === 'schedule_panel'
            ? 'interviewing'
            : 'review';

        transaction.set(decisionRef, sanitizedRecord);
        if (appDoc.exists) {
          transaction.update(
            appRef,
            sanitizeForFirestore({
              status: nextStatus,
              hiringRecommendationId: id,
              updatedAt: timestamp,
            })
          );
        }
      });
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      throw new PersistenceError(
        `Failed to record hiring decision transaction: ${errorObj?.message || 'Transaction error'}`,
        errorObj?.code || 'FIRESTORE_WRITE_ERROR',
        err
      );
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

  public static async getById(id: string): Promise<HiringDecisionRecord | null> {
    try {
      const doc = await this.db.collection(COLLECTION).doc(id).get();
      if (doc.exists) {
        return this.sanitizeDoc<HiringDecisionRecord>(doc);
      }
    } catch {
      // Handled below
    }
    return null;
  }

  public static async getByApplicationId(applicationId: string): Promise<HiringDecisionRecord | null> {
    try {
      const snap = await this.db.collection(COLLECTION).where('applicationId', '==', applicationId).limit(1).get();
      if (!snap.empty) {
        return this.sanitizeDoc<HiringDecisionRecord>(snap.docs[0]);
      }
    } catch {
      // Handled below
    }
    return null;
  }
}
