/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PendingSyncOp } from './SyncService';
import { firestoreAdapter } from './FirestoreAdapter';
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

  // --- Queue Mutations ---

  public enqueue(type: PendingSyncOp['type'], key: string, payload: any) {
    // Remove previous operations targeting the exact same record (merges rapid updates)
    this.queue = this.queue.filter(op => !(op.type === type && op.key === key));
    
    this.queue.push({
      id: Math.random().toString(36).substring(7),
      type,
      key,
      payload,
      timestamp: new Date().toISOString()
    });
    this.saveToCache();
  }

  public enqueueAnalytics(event: any) {
    this.queue.push({
      id: Math.random().toString(36).substring(7),
      type: 'analyticsEvent' as any,
      key: event.id,
      payload: event,
      timestamp: new Date().toISOString()
    });
    this.saveToCache();
  }

  // --- Process Queue ---

  public async process() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    const uid = localStorage.getItem('cfa_sync_uid');
    if (!uid) return;

    this.isProcessing = true;
    if (this.onStatusChange) this.onStatusChange();

    while (this.queue.length > 0) {
      const op = this.queue[0];
      
      // Before writing, save a recovery backup snapshot
      this.saveBackup();

      try {
        if (op.type === 'coachPlan') {
          await firestoreAdapter.saveCoachPlan(uid, op.key, op.payload);
        } else if (op.type === 'deleteCoachPlan') {
          await firestoreAdapter.deleteCoachPlan(uid, op.key);
        } else if (op.type === 'studyStrategy') {
          await firestoreAdapter.saveStudyStrategy(uid, op.payload);
        } else if (op.type === 'metadata') {
          await firestoreAdapter.saveMetadata(uid, op.payload);
        } else if (op.type === 'analyticsEvent' as any) {
          await firestoreAdapter.saveAnalyticsEvent(uid, op.payload);
        }

        // Successfully synchronized! Dequeue and clear backup
        this.queue.shift();
        this.saveToCache();
        this.clearBackup();
        
        this.firestoreStatus = 'connected';
        this.lastError = null;

      } catch (error: any) {
        console.error("SyncQueue: Network write error. Will retry later.", error);
        this.firestoreStatus = 'offline';
        this.lastError = error.message || String(error);
        if (this.onStatusChange) this.onStatusChange();
        break; // Stop and retry later when online
      }
    }

    this.isProcessing = false;
    if (this.onStatusChange) this.onStatusChange();
  }
}

export const syncQueue = SyncQueue.getInstance();
