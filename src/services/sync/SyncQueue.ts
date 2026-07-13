/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { PendingSyncOp } from './SyncService';
import { coachPlanRepository } from '../../repositories/CoachPlanRepository';
import { studyStrategyRepository } from '../../repositories/StudyStrategyRepository';

export class SyncQueue {
  private static instance: SyncQueue;
  private queue: PendingSyncOp[] = [];
  private isProcessing = false;
  private onStatusChange: (() => void) | null = null;
  private lastError: string | null = null;
  private firestoreStatus: 'connected' | 'offline' = 'connected';

  private constructor() {
    this.loadFromCache();
  }

  public static getInstance(): SyncQueue {
    if (!SyncQueue.instance) {
      SyncQueue.instance = new SyncQueue();
    }
    return SyncQueue.instance;
  }

  public registerCallbacks(onStatusChange: () => void) {
    this.onStatusChange = onStatusChange;
  }

  private loadFromCache() {
    try {
      const saved = localStorage.getItem('cfa_sync_pending_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (e) {
      console.error("SyncQueue: Failed to load queue from cache", e);
    }
  }

  private saveToCache() {
    try {
      localStorage.setItem('cfa_sync_pending_queue', JSON.stringify(this.queue));
      if (this.onStatusChange) this.onStatusChange();
    } catch (e) {
      console.error("SyncQueue: Failed to save queue to cache", e);
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getFirestoreStatus(): 'connected' | 'offline' {
    return this.firestoreStatus;
  }

  public setNetworkStatus(online: boolean) {
    this.firestoreStatus = online ? 'connected' : 'offline';
    if (online) {
      this.process();
    }
  }

  // --- Snapshot Backup & Recovery Operations ---

  private saveBackup() {
    try {
      const backup = {
        templates: coachPlanRepository.getAll(),
        activeTemplateId: coachPlanRepository.getActiveTemplateId(),
        studyStrategy: studyStrategyRepository.get(),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('cfa_sync_backup', JSON.stringify(backup));
    } catch (e) {
      console.error("SyncQueue: Failed to save snapshot backup", e);
    }
  }

  private clearBackup() {
    try {
      localStorage.removeItem('cfa_sync_backup');
    } catch (e) {
      console.error("SyncQueue: Failed to clear backup", e);
    }
  }

  public hasBackup(): boolean {
    return localStorage.getItem('cfa_sync_backup') !== null;
  }

  public restoreFromBackup(): boolean {
    try {
      const saved = localStorage.getItem('cfa_sync_backup');
      if (!saved) return false;
      const backup = JSON.parse(saved);
      if (backup.templates) {
        coachPlanRepository.setTemplates(backup.templates);
        localStorage.setItem('cfa_timeline_templates', JSON.stringify(backup.templates));
      }
      if (backup.activeTemplateId) {
        coachPlanRepository.setActiveTemplateId(backup.activeTemplateId);
        localStorage.setItem('cfa_active_template_id', backup.activeTemplateId);
      }
      if (backup.studyStrategy) {
        studyStrategyRepository.set(backup.studyStrategy);
        localStorage.setItem('cfa_study_strategy', JSON.stringify(backup.studyStrategy));
      }
      this.clearBackup();
      return true;
    } catch (e) {
      console.error("SyncQueue: Failed to restore backup", e);
      return false;
    }
  }

  // --- Queue Mutations & Deduplication ---

  public enqueue(type: PendingSyncOp['type'], key: string, payload: any) {
    // Remove previous operations targeting the exact same record (merges rapid updates)
    this.queue = this.queue.filter(op => !(op.type === type && op.key === key));
    
    // De-duplicate completed operations
    const opId = `op-${Math.random().toString(36).substring(7)}-${Date.now()}`;
    
    this.queue.push({
      id: opId,
      type,
      key,
      payload,
      timestamp: new Date().toISOString()
    });
    this.saveToCache();
  }

  public enqueueAnalytics(event: any) {
    this.queue.push({
      id: event.id || `op-an-${Math.random().toString(36).substring(7)}`,
      type: 'analyticsEvent' as any,
      key: event.id,
      payload: event,
      timestamp: event.timestamp || new Date().toISOString()
    });
    this.saveToCache();
  }

  public filterQueueAgainstCompleted(completedIds: string[]) {
    const originalLen = this.queue.length;
    this.queue = this.queue.filter(op => !completedIds.includes(op.id));
    if (this.queue.length !== originalLen) {
      this.saveToCache();
      console.log(`SyncQueue: Filtered out ${originalLen - this.queue.length} already completed operations.`);
    }
  }

  // --- Process Queue via WriteBatch ---

  public async process() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    const uid = localStorage.getItem('cfa_sync_uid');
    if (!uid) return;

    this.isProcessing = true;
    if (this.onStatusChange) this.onStatusChange();

    // 1. Take a safety backup of local storage
    this.saveBackup();

    try {
      // 2. Build a write batch
      const batch = writeBatch(db);
      
      // Limit to 200 ops to leave headroom for operationsLog logs (batch max is 500)
      const opsToProcess = this.queue.slice(0, 200);
      
      for (const op of opsToProcess) {
        // A. Add target document write
        if (op.type === 'coachPlan') {
          const docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          batch.set(docRef, op.payload, { merge: true });
        } else if (op.type === 'deleteCoachPlan') {
          const docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          batch.delete(docRef);
        } else if (op.type === 'studyStrategy') {
          const docRef = doc(db, 'users', uid, 'studyStrategy', 'main');
          batch.set(docRef, op.payload, { merge: true });
        } else if (op.type === 'metadata') {
          const docRef = doc(db, 'users', uid, 'metadata', 'main');
          batch.set(docRef, op.payload, { merge: true });
        } else if (op.type === 'analyticsEvent' as any) {
          const docRef = doc(db, 'users', uid, 'analyticsEvents', op.key);
          batch.set(docRef, op.payload);
        } else if (op.type === 'analyticsSummary' as any) {
          const docRef = doc(db, 'users', uid, 'analytics', 'summary');
          batch.set(docRef, op.payload, { merge: true });
        } else if (op.type === 'aiStudyMemory' as any) {
          const docRef = doc(db, 'users', uid, 'aiStudyMemory', 'main');
          batch.set(docRef, op.payload, { merge: true });
        }

        // B. Add Idempotent Operation receipt document to the SAME batch
        const logRef = doc(db, 'users', uid, 'operationsLog', op.id);
        batch.set(logRef, {
          operationId: op.id,
          type: op.type,
          key: op.key,
          timestamp: op.timestamp,
          status: 'SUCCESS',
          executedAt: new Date().toISOString()
        });
      }

      // 3. Atomically commit all writes
      await batch.commit();

      // 4. Update memory queue
      const processedIds = opsToProcess.map(o => o.id);
      this.queue = this.queue.filter(op => !processedIds.includes(op.id));
      
      // Update local storage completed set
      try {
        const completed = JSON.parse(localStorage.getItem('cfa_sync_completed_ops') || '[]');
        const updatedCompleted = Array.from(new Set([...completed, ...processedIds])).slice(-200); // keep last 200
        localStorage.setItem('cfa_sync_completed_ops', JSON.stringify(updatedCompleted));
      } catch (_) {}

      this.saveToCache();
      this.clearBackup();

      this.firestoreStatus = 'connected';
      this.lastError = null;

      // Flush error reports if we were offline
      this.flushOfflineErrors(uid);

      // If there are still items in the queue, schedule the next batch
      if (this.queue.length > 0) {
        this.isProcessing = false;
        setTimeout(() => this.process(), 300);
        return;
      }

    } catch (error: any) {
      console.error("SyncQueue: WriteBatch commit failed. Rolling back.", error);
      this.firestoreStatus = 'offline';
      this.lastError = error.message || String(error);
      
      // Report sync failure
      this.reportError(uid, error);
      
      if (this.onStatusChange) this.onStatusChange();
    }

    this.isProcessing = false;
    if (this.onStatusChange) this.onStatusChange();
  }

  // --- Cloud Error Reporting ---

  public reportError(uid: string, error: any) {
    const report = {
      id: `err-${Math.random().toString(36).substring(7)}-${Date.now()}`,
      message: error.message || String(error),
      stack: error.stack || null,
      timestamp: new Date().toISOString(),
      pendingQueueLength: this.queue.length,
      onlineStatus: navigator.onLine,
      userAgent: navigator.userAgent
    };

    try {
      const logs = JSON.parse(localStorage.getItem('cfa_sync_pending_errors') || '[]');
      logs.push(report);
      localStorage.setItem('cfa_sync_pending_errors', JSON.stringify(logs.slice(-20))); // keep last 20
    } catch (_) {}

    this.flushOfflineErrors(uid);
  }

  private async flushOfflineErrors(uid: string) {
    try {
      const logsStr = localStorage.getItem('cfa_sync_pending_errors');
      if (!logsStr) return;
      const logs = JSON.parse(logsStr);
      if (logs.length === 0) return;

      if (navigator.onLine) {
        const batch = writeBatch(db);
        for (const log of logs) {
          const docRef = doc(db, 'users', uid, 'errorReports', log.id);
          batch.set(docRef, log);
        }
        await batch.commit();
        localStorage.removeItem('cfa_sync_pending_errors');
        console.log("SyncQueue: Uploaded error reports to Cloud.");
      }
    } catch (e) {
      console.error("SyncQueue: Failed to flush error reports", e);
    }
  }
}

export const syncQueue = SyncQueue.getInstance();
