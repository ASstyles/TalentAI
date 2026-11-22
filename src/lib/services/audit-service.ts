export interface AuditLogEntry {
  id: string;
  actor: string;
  actorId: string;
  role: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

// In-memory persistent backing store with file/Firestore capability
const inMemoryAuditLogs: AuditLogEntry[] = [
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

export class AuditService {
  public static async recordLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const log: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    inMemoryAuditLogs.unshift(log);
    return log;
  }

  public static async getLogs(): Promise<AuditLogEntry[]> {
    return [...inMemoryAuditLogs];
  }
}
