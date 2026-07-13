import { eventBus } from './EventBus';

export interface AuditLogEntry {
  id: string;
  eventType: string;
  timestamp: string;
  entityId?: string;
  payload?: any;
}

export class MissionAuditService {
  private static instance: MissionAuditService;
  private STORAGE_KEY = 'cfa_mission_audit_log';

  private constructor() {
    // Automatically log all domain events to our append-only store
    eventBus.subscribe('*', (event) => {
      this.log(event.type, event.entityId, event.payload);
    });
  }

  private readonly ARCHIVE_KEY = 'cfa_mission_audit_log_archive';
  private readonly MAX_ACTIVE_ENTRIES = 500;
  private readonly MAX_ARCHIVE_ENTRIES = 5000;
  private readonly THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  public static getInstance(): MissionAuditService {
    if (!MissionAuditService.instance) {
      MissionAuditService.instance = new MissionAuditService();
    }
    return MissionAuditService.instance;
  }

  public getLogs(): AuditLogEntry[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getArchiveLogs(): AuditLogEntry[] {
    try {
      const raw = localStorage.getItem(this.ARCHIVE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public log(eventType: string, entityId?: string, payload?: any): void {
    try {
      const logs = this.getLogs();
      const entry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        eventType,
        timestamp: new Date().toISOString(),
        entityId,
        payload
      };
      logs.push(entry);

      const now = Date.now();
      const activeLogs: AuditLogEntry[] = [];
      const toArchive: AuditLogEntry[] = [];
      const boundaryIndex = logs.length - this.MAX_ACTIVE_ENTRIES;

      for (let i = 0; i < logs.length; i++) {
        const item = logs[i];
        const age = now - new Date(item.timestamp).getTime();
        const isRecent = age <= this.THIRTY_DAYS_MS;
        const isInLast500 = i >= boundaryIndex;

        if (isInLast500 || isRecent) {
          activeLogs.push(item);
        } else {
          toArchive.push(item);
        }
      }

      if (toArchive.length > 0) {
        try {
          const archive = this.getArchiveLogs();
          archive.push(...toArchive);
          const finalArchive = archive.slice(-this.MAX_ARCHIVE_ENTRIES);
          localStorage.setItem(this.ARCHIVE_KEY, JSON.stringify(finalArchive));
        } catch (archiveErr) {
          console.warn('[MissionAuditService] Failed to write archive logs to localStorage:', archiveErr);
        }
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activeLogs));
    } catch (e) {
      console.error('[MissionAuditService] Failed to append log entry:', e);
    }
  }

  public clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.ARCHIVE_KEY);
  }
}

export const missionAuditService = MissionAuditService.getInstance();
