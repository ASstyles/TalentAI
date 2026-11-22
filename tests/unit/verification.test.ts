import { describe, it, expect } from 'vitest';
import { VerificationEngine } from '@/lib/verification/engine';
import { VerificationRecord } from '@/types/verification';

describe('Evidence Verification Engine', () => {
  const sampleRecord: VerificationRecord = {
    id: 'ver-1',
    candidateId: 'cand-1',
    claimType: 'education',
    claimTitle: 'B.S. in Computer Science',
    claimDetails: 'Stanford University, 2024',
    status: 'pending',
    verificationSource: 'National Student Clearinghouse',
    confidence: 0,
    reviewedBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('allows valid transitions from pending to in_progress to verified', () => {
    expect(VerificationEngine.isValidTransition('pending', 'in_progress')).toBe(true);
    expect(VerificationEngine.isValidTransition('in_progress', 'verified')).toBe(true);

    const updated = VerificationEngine.updateRecordStatus({
      record: sampleRecord,
      targetStatus: 'in_progress',
      reviewerId: 'auditor-1',
    });
    expect(updated.status).toBe('in_progress');
    expect(updated.reviewedBy).toBe('auditor-1');

    const finalized = VerificationEngine.updateRecordStatus({
      record: updated,
      targetStatus: 'verified',
      reviewerId: 'auditor-1',
      confidence: 98,
    });
    expect(finalized.status).toBe('verified');
    expect(finalized.confidence).toBe(98);
    expect(finalized.verifiedAt).toBeDefined();
  });

  it('rejects illegal transitions (e.g. pending directly to verified)', () => {
    expect(VerificationEngine.isValidTransition('pending', 'verified')).toBe(false);
    expect(() => {
      VerificationEngine.updateRecordStatus({
        record: sampleRecord,
        targetStatus: 'verified',
        reviewerId: 'auditor-1',
      });
    }).toThrow(/Illegal verification state transition/);
  });
});
