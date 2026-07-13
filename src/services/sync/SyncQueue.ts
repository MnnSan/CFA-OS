/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeBatch, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { PendingSyncOp } from './SyncService';
import { coachPlanRepository } from '../../repositories/CoachPlanRepository';
import { studyStrategyRepository } from '../../repositories/StudyStrategyRepository';
import { checksumService } from './ChecksumService';

// --- Command / Operation Pattern (Sprint 10) ---

export interface SyncOperation {
  operationId: string;
  type: string;
  key: string;
  payload: any;
  timestamp: string;
  checksum: string;
  execute(): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
}

export class MoveStudyBlockOperation implements SyncOperation {
  public type = 'moveStudyBlock';
  constructor(
    public operationId: string,
    public key: string, // format: "templateId/blockId"
    public payload: any, // the modified block object
    public timestamp: string,
    public checksum: string,
    private previousBlockState: any // saved for undo
  ) {}

  public async execute() {
    const [templateId] = this.key.split('/');
    const template = coachPlanRepository.getById(templateId);
    if (template && template.blocks) {
      const updated = template.blocks.map(b => b.id === this.payload.id ? { ...b, ...this.payload } : b);
      coachPlanRepository.updateBlocks(templateId, updated);
    }
  }

  public async undo() {
    const [templateId] = this.key.split('/');
    const template = coachPlanRepository.getById(templateId);
    if (template && template.blocks && this.previousBlockState) {
      const restored = template.blocks.map(b => b.id === this.payload.id ? this.previousBlockState : b);
      coachPlanRepository.updateBlocks(templateId, restored);
    }
  }

  public async redo() {
    await this.execute();
  }
}

export class RenameTemplateOperation implements SyncOperation {
  public type = 'renameTemplate';
  constructor(
    public operationId: string,
    public key: string, // templateId
    public payload: { name: string; oldName: string },
    public timestamp: string,
    public checksum: string
  ) {}

  public async execute() {
    coachPlanRepository.rename(this.key, this.payload.name);
  }

  public async undo() {
    coachPlanRepository.rename(this.key, this.payload.oldName);
  }

  public async redo() {
    await this.execute();
  }
}

export class DeleteTemplateOperation implements SyncOperation {
  public type = 'deleteTemplate';
  constructor(
    public operationId: string,
    public key: string, // templateId
    public payload: { status: string; oldStatus: string },
    public timestamp: string,
    public checksum: string
  ) {}

  public async execute() {
    const template = coachPlanRepository.getById(this.key);
    if (template) {
      coachPlanRepository.save({ ...template, status: this.payload.status as any });
    }
  }

  public async undo() {
    const template = coachPlanRepository.getById(this.key);
    if (template) {
      coachPlanRepository.save({ ...template, status: this.payload.oldStatus as any });
    }
  }

  public async redo() {
    await this.execute();
  }
}

export class GenericOperation implements SyncOperation {
  constructor(
    public operationId: string,
    public type: string,
    public key: string,
    public payload: any,
    public timestamp: string,
    public checksum: string
  ) {}

  public async execute() {}
  public async undo() {}
  public async redo() {}
}

// --- History Manager (Undo / Redo Stack) ---

export class HistoryManager {
  private static instance: HistoryManager;
  private undoStack: SyncOperation[] = [];
  private redoStack: SyncOperation[] = [];

  private constructor() {}

  public static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }

  public push(op: SyncOperation) {
    this.undoStack.push(op);
    this.redoStack = [];
    if (this.undoStack.length > 50) this.undoStack.shift(); // Cap stack at 50
  }

  public async undo(): Promise<boolean> {
    const op = this.undoStack.pop();
    if (op) {
      await op.undo();
      this.redoStack.push(op);
      return true;
    }
    return false;
  }

  public async redo(): Promise<boolean> {
    const op = this.redoStack.pop();
    if (op) {
      await op.redo();
      this.undoStack.push(op);
      return true;
    }
    return false;
  }

  public clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export const historyManager = HistoryManager.getInstance();

// --- Sync Queue Engine ---

export class SyncQueue {
  private static instance: SyncQueue;
  private queue: PendingSyncOp[] = [];
  private isProcessing = false;
  private onStatusChange: (() => void) | null = null;

  // Status Metrics
  private lastError: string | null = null;
  private firestoreStatus: 'connected' | 'offline' = 'connected';
  private lastSyncTimestamp: string = 'Never';
  private currentSyncState: 'IDLE' | 'LOCAL_CHANGE' | 'QUEUED' | 'UPLOADING' | 'VERIFYING' | 'SYNCED' | 'OFFLINE' | 'RETRYING' = 'IDLE';

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

  public getSyncState() {
    return this.currentSyncState;
  }

  private setSyncState(state: typeof this.currentSyncState) {
    this.currentSyncState = state;
    if (this.onStatusChange) this.onStatusChange();
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
    this.setSyncState('LOCAL_CHANGE');
    
    // Deduplicate rapid writes to same document
    this.queue = this.queue.filter(op => !(op.type === type && op.key === key));
    
    const opId = `op-${Math.random().toString(36).substring(7)}-${Date.now()}`;
    const checksum = checksumService.compute(payload);

    // Push into History Manager if it's a known mutation operation
    if (type === 'coachPlan') {
      const previousState = coachPlanRepository.getById(key);
      const op = new GenericOperation(opId, type, key, payload, new Date().toISOString(), checksum);
      historyManager.push(op);
    }

    this.queue.push({
      id: opId,
      type,
      key,
      payload,
      timestamp: new Date().toISOString()
    });
    this.saveToCache();
    this.setSyncState('QUEUED');
  }

  public enqueueMoveStudyBlock(templateId: string, blockId: string, block: any, previousState: any) {
    this.setSyncState('LOCAL_CHANGE');
    const key = `${templateId}/${blockId}`;
    this.queue = this.queue.filter(op => !(op.type === 'moveStudyBlock' as any && op.key === key));

    const opId = `op-move-${Math.random().toString(36).substring(7)}`;
    const checksum = checksumService.compute(block);

    const op = new MoveStudyBlockOperation(opId, key, block, new Date().toISOString(), checksum, previousState);
    historyManager.push(op);

    this.queue.push({
      id: opId,
      type: 'moveStudyBlock' as any,
      key,
      payload: block,
      timestamp: new Date().toISOString()
    });
    this.saveToCache();
    this.setSyncState('QUEUED');
  }

  public enqueueRenameTemplate(templateId: string, name: string, oldName: string) {
    this.setSyncState('LOCAL_CHANGE');
    this.queue = this.queue.filter(op => !(op.type === 'renameTemplate' as any && op.key === templateId));

    const opId = `op-ren-${Math.random().toString(36).substring(7)}`;
    const checksum = checksumService.compute({ name });

    const op = new RenameTemplateOperation(opId, templateId, { name, oldName }, new Date().toISOString(), checksum);
    historyManager.push(op);

    this.queue.push({
      id: opId,
      type: 'renameTemplate' as any,
      key: templateId,
      payload: { name, oldName },
      timestamp: new Date().toISOString()
    });
    this.saveToCache();
    this.setSyncState('QUEUED');
  }

  public enqueueAnalytics(event: any) {
    this.setSyncState('LOCAL_CHANGE');
    this.queue.push({
      id: event.id || `op-an-${Math.random().toString(36).substring(7)}`,
      type: 'analyticsEvent' as any,
      key: event.id,
      payload: event,
      timestamp: event.timestamp || new Date().toISOString()
    });
    this.saveToCache();
    this.setSyncState('QUEUED');
  }

  // --- Process Queue via WriteBatch ---

  private async verifyWrites(opsToProcess: PendingSyncOp[], uid: string): Promise<boolean> {
    this.setSyncState('VERIFYING');
    let success = true;
    
    for (const op of opsToProcess) {
      if (op.type !== 'coachPlan' && op.type !== 'studyStrategy' && op.type !== 'aiStudyMemory' && op.type !== ('moveStudyBlock' as any)) {
        continue;
      }
      
      try {
        let docRef;
        let localPayload = op.payload;

        if (op.type === 'coachPlan') {
          docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          const { blocks, ...metadata } = op.payload;
          localPayload = metadata; // We only verify metadata level on main doc
        } else if (op.type === ('moveStudyBlock' as any)) {
          const [templateId, blockId] = op.key.split('/');
          docRef = doc(db, 'users', uid, 'coachPlans', templateId, 'blocks', blockId);
        } else if (op.type === 'studyStrategy') {
          docRef = doc(db, 'users', uid, 'studyStrategy', 'main');
        } else {
          docRef = doc(db, 'users', uid, 'aiStudyMemory', 'main');
        }
        
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          console.error(`SyncQueue Verification: Document missing for ${op.type} key ${op.key}`);
          success = false;
          this.enqueue(op.type, op.key, op.payload);
          continue;
        }
        
        const cloudData = snap.data();
        const cloudHash = checksumService.compute(cloudData);
        const localHash = checksumService.compute(localPayload);
        
        if (cloudHash !== localHash) {
          console.warn(`SyncQueue Verification: Checksum mismatch for ${op.type} key ${op.key}. Cloud: ${cloudHash}, Local: ${localHash}. Triggering automatic repair.`);
          success = false;
          this.enqueue(op.type, op.key, op.payload);
        } else {
          console.log(`SyncQueue Verification: Checksum MATCH for ${op.type} key ${op.key} (hash: ${cloudHash})`);
        }
      } catch (e) {
        console.error(`SyncQueue Verification: Failed to verify op ${op.id}`, e);
        success = false;
      }
    }
    
    return success;
  }

  public async process() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) {
      this.setSyncState('SYNCED');
      return;
    }

    const uid = localStorage.getItem('cfa_sync_uid');
    if (!uid) return;

    this.isProcessing = true;
    this.setSyncState('UPLOADING');

    // 1. Take safety backup
    this.saveBackup();

    try {
      // 2. Build write batch
      const batch = writeBatch(db);
      const opsToProcess = this.queue.slice(0, 200);
      
      for (const op of opsToProcess) {
        // A. Add target document write
        if (op.type === 'coachPlan') {
          const docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          const { blocks, ...metadata } = op.payload;
          
          // Write template metadata only
          batch.set(docRef, metadata, { merge: true });
          
          // Write individual blocks as separate documents under blocks subcollection (Sprint 10)
          if (blocks && Array.isArray(blocks)) {
            blocks.forEach((block: any) => {
              const blockRef = doc(db, 'users', uid, 'coachPlans', op.key, 'blocks', block.id);
              batch.set(blockRef, block);
            });
          }
        } else if (op.type === ('moveStudyBlock' as any)) {
          const [templateId, blockId] = op.key.split('/');
          const docRef = doc(db, 'users', uid, 'coachPlans', templateId, 'blocks', blockId);
          batch.set(docRef, op.payload, { merge: true });
        } else if (op.type === ('renameTemplate' as any)) {
          const docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          batch.set(docRef, { name: op.payload.name }, { merge: true });
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
        } else if (op.type === ('event' as any)) {
          const docRef = doc(db, 'users', uid, 'events', op.key);
          batch.set(docRef, op.payload);
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

      // 4. Perform Write Verification (Acknowledgement)
      const verificationSuccess = await this.verifyWrites(opsToProcess, uid);

      // 5. Update memory queue
      const processedIds = opsToProcess.map(o => o.id);
      this.queue = this.queue.filter(op => !processedIds.includes(op.id));
      
      try {
        const completed = JSON.parse(localStorage.getItem('cfa_sync_completed_ops') || '[]');
        const updatedCompleted = Array.from(new Set([...completed, ...processedIds])).slice(-200);
        localStorage.setItem('cfa_sync_completed_ops', JSON.stringify(updatedCompleted));
      } catch (_) {}

      this.saveToCache();
      this.clearBackup();

      this.firestoreStatus = 'connected';
      this.lastError = null;
      this.lastSyncTimestamp = new Date().toISOString();

      this.flushOfflineErrors(uid);

      if (!verificationSuccess) {
        this.setSyncState('RETRYING');
        this.isProcessing = false;
        setTimeout(() => this.process(), 500);
        return;
      }

      if (this.queue.length > 0) {
        this.isProcessing = false;
        setTimeout(() => this.process(), 300);
        return;
      }

      this.setSyncState('SYNCED');

    } catch (error: any) {
      console.error("SyncQueue: WriteBatch commit failed. Rolling back.", error);
      this.firestoreStatus = 'offline';
      this.lastError = error.message || String(error);
      this.setSyncState('OFFLINE');
      this.reportError(uid, error);
    }

    this.isProcessing = false;
    if (this.onStatusChange) this.onStatusChange();
  }

  public filterQueueAgainstCompleted(completedIds: string[]) {
    const originalLen = this.queue.length;
    this.queue = this.queue.filter(op => !completedIds.includes(op.id));
    if (this.queue.length !== originalLen) {
      this.saveToCache();
      console.log(`SyncQueue: Filtered out ${originalLen - this.queue.length} already completed operations.`);
    }
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
      localStorage.setItem('cfa_sync_pending_errors', JSON.stringify(logs.slice(-20)));
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
