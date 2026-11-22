import { VerificationRecord, VerificationStatus, ClaimType } from '@/types/verification';

export class VerificationEngine {
  /**
   * Allowed state transitions for evidence verification:
   * pending -> in_progress -> (verified | partially_verified | unverified | failed | requires_manual_review)
   */
  public static isValidTransition(current: VerificationStatus, target: VerificationStatus): boolean {
    const transitions: Record<VerificationStatus, VerificationStatus[]> = {
      pending: ['in_progress', 'requires_manual_review', 'failed'],
      in_progress: ['verified', 'partially_verified', 'unverified', 'failed', 'requires_manual_review'],
      requires_manual_review: ['verified', 'partially_verified', 'unverified', 'failed'],
      verified: ['requires_manual_review'], // Can be flagged for re-audit
      partially_verified: ['verified', 'failed', 'requires_manual_review'],
      unverified: ['in_progress', 'requires_manual_review'],
      failed: ['in_progress', 'requires_manual_review'],
    };

    return transitions[current]?.includes(target) || false;
  }

  /**
   * Applies a verified status change with strict audit attribution.
   */
  public static updateRecordStatus({
    record,
    targetStatus,
    reviewerId,
    confidence,
    auditNotes,
    failureReason,
  }: {
    record: VerificationRecord;
    targetStatus: VerificationStatus;
    reviewerId: string;
    confidence?: number;
    auditNotes?: string;
    failureReason?: string;
  }): VerificationRecord {
    if (!this.isValidTransition(record.status, targetStatus)) {
      throw new Error(`Illegal verification state transition from ${record.status} to ${targetStatus}`);
    }

    return {
      ...record,
      status: targetStatus,
      confidence: confidence !== undefined ? confidence : record.confidence,
      reviewedBy: reviewerId,
      auditNotes: auditNotes || record.auditNotes,
      failureReason: targetStatus === 'failed' ? failureReason || 'Verification check criteria not met' : undefined,
      verifiedAt: targetStatus === 'verified' || targetStatus === 'partially_verified' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
  }
}
