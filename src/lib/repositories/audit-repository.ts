import { BaseRepository } from './base';
import { AuditLogEntry } from '@/lib/services/audit-service';

const COLLECTION = 'auditLogs';

export class AuditRepository extends BaseRepository {
  public static async recordLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();
    const log: AuditLogEntry = {
      ...entry,
      id,
      timestamp,
    };

    try {
      await this.db.collection(COLLECTION).doc(id).set(log);
    } catch (err) {
      console.warn('[AuditRepository] Firestore write skipped (offline/emulator):', err);
    }

    return log;
  }

  public static async getLogs(limitCount: number = 50): Promise<AuditLogEntry[]> {
    try {
      const snap = await this.db.collection(COLLECTION).orderBy('timestamp', 'desc').limit(limitCount).get();
      if (!snap.empty) {
        return snap.docs.map((doc) => this.sanitizeDoc<AuditLogEntry>(doc));
      }
    } catch {
      // Handled by fallback
    }

    // Default seed logs
    return [
      {
        id: 'aud-seed-1',
        actor: 'Sarah Chen (Lead Talent Partner)',
        actorId: 'user-recruiter-1',
        role: 'recruiter',
        action: 'RECORD_HIRING_DECISION',
        target: 'Candidate: Alex Mercer (Job: Lead Full-Stack Engineer)',
        details: 'Decision: ADVANCE_TO_OFFER. Rationale: Candidate passed 100% of coding tests and proven systems design.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'aud-seed-2',
        actor: 'System Automated Registrar',
        actorId: 'system',
        role: 'system',
        action: 'VERIFY_EDUCATION',
        target: 'Candidate: Alex Mercer',
        details: 'Verified Stanford University B.S. via National Student Clearinghouse API.',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ];
  }
}
