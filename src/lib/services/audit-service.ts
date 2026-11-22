import { AuditRepository } from '../repositories/audit-repository';

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

export class AuditService {
  public static async recordLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    return await AuditRepository.recordLog(entry);
  }

  public static async getLogs(limitCount?: number): Promise<AuditLogEntry[]> {
    return await AuditRepository.getLogs(limitCount);
  }
}
