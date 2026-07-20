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

  private retryCount = 0;
  private lastSuccessfulUpload: string = 'Never';
  private lastFailedUpload: string = 'Never';
  private lastFirestoreError: string | null = null;
  private lastPermissionError: string | null = null;
  private syncLatencyMs = 0;
  private opRetries: Map<string, number> = new Map();
  private readonly MAX_OP_RETRIES = 5;
  private readonly BASE_RETRY_MS = 1000;
  private readonly MAX_BACKOFF_MS = 30000;

  public getQueueAgeSeconds(): number {
    if (this.queue.length === 0) return 0;
    const firstOp = this.queue[0];
    const ageMs = Date.now() - new Date(firstOp.timestamp).getTime();
    return Math.max(0, Math.round(ageMs / 1000));
  }

  public getQueueRetryCount(): number {
    return this.retryCount;
  }

  public getLastSuccessfulUpload(): string {
    return this.lastSuccessfulUpload;
  }

  public getLastFailedUpload(): string {
    return this.lastFailedUpload;
  }

  public getLastFirestoreError(): string | null {
    return this.lastFirestoreError;
  }

  public getLastPermissionError(): string | null {
    return this.lastPermissionError;
  }

  public getSyncLatencyMs(): number {
    return this.syncLatencyMs;
  }

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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.queue = parsed;
          console.warn(`[SyncTrace] SyncQueue: Restored ${parsed.length} pending ops from cache — scheduling process`);
          this.setSyncState('QUEUED');
          setTimeout(() => this.process(), 500);
        }
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
    console.warn(`[SyncTrace] SyncQueue.enqueue: type=${type} key=${key} queueBefore=${this.queue.length}`);
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
    console.warn(`[SyncTrace] SyncQueue.enqueue: done queueAfter=${this.queue.length} opId=${opId}`);
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

  private getBackoffMs(opId: string): number {
    const retries = this.opRetries.get(opId) || 0;
    const backoff = Math.min(this.BASE_RETRY_MS * Math.pow(2, retries), this.MAX_BACKOFF_MS);
    return backoff + Math.random() * 500;
  }

  private async verifyWrites(opsToProcess: PendingSyncOp[], uid: string, succeededIds: Set<string>): Promise<void> {
    this.setSyncState('VERIFYING');
    
    for (const op of opsToProcess) {
      if (op.type !== 'coachPlan' && op.type !== 'studyStrategy' && op.type !== 'aiStudyMemory' && op.type !== ('moveStudyBlock' as any)) {
        succeededIds.add(op.id);
        continue;
      }
      
      try {
        let docRef;
        let localPayload = op.payload;

        if (op.type === 'coachPlan') {
          docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          const { blocks, ...metadata } = op.payload;
          localPayload = metadata;
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
          console.error(`[SyncTrace] Verify: Missing doc for ${op.type} key ${op.key}`);
          const retries = this.opRetries.get(op.id) || 0;
          if (retries >= this.MAX_OP_RETRIES) {
            console.error(`[SyncTrace] Verify: Op ${op.id} exceeded max retries for missing doc — discarding`);
          } else {
            this.opRetries.set(op.id, retries + 1);
          }
          continue;
        }
        
        const cloudData = snap.data();
        const cloudHash = checksumService.compute(cloudData);
        const localHash = checksumService.compute(localPayload);
        
        if (cloudHash !== localHash) {
          console.warn(`[SyncTrace] Verify: Checksum mismatch for ${op.type} key ${op.key}`);
          const retries = this.opRetries.get(op.id) || 0;
          if (retries >= this.MAX_OP_RETRIES) {
            console.error(`[SyncTrace] Verify: Op ${op.id} exceeded max retries for checksum mismatch — discarding`);
          } else {
            this.opRetries.set(op.id, retries + 1);
          }
        } else {
          succeededIds.add(op.id);
          this.opRetries.delete(op.id);
        }
      } catch (e) {
        console.error(`[SyncTrace] Verify: Failed to verify op ${op.id}`, e);
        const retries = this.opRetries.get(op.id) || 0;
        if (retries >= this.MAX_OP_RETRIES) {
          console.error(`[SyncTrace] Verify: Op ${op.id} exceeded max retries for exception — discarding`);
        } else {
          this.opRetries.set(op.id, retries + 1);
        }
      }
    }
  }

  /**
   * Assert that every path segment is a non-empty string.
   * Logs the offending op and returns false if any segment is invalid.
   */
  private assertPathSegments(op: PendingSyncOp, segments: any[]): string[] | null {
    const errors: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (s === undefined || s === null) {
        errors.push(`Segment[${i}] is ${String(s)}`);
      } else if (typeof s !== 'string') {
        errors.push(`Segment[${i}] is not a string: ${typeof s}=${JSON.stringify(s)}`);
      } else if (s.length === 0) {
        errors.push(`Segment[${i}] is empty string`);
      }
    }
    if (errors.length > 0) {
      console.error(`[SyncTrace] PATH ASSERTION FAILED for op:`, {
        id: op.id,
        type: op.type,
        key: op.key,
        payload: op.payload,
        timestamp: op.timestamp,
        segmentErrors: errors,
        segments
      });
      return errors;
    }
    return null;
  }

  public async process() {
    if (this.isProcessing) {
      console.warn(`[SyncTrace] SyncQueue.process: ALREADY PROCESSING (queue=${this.queue.length})`);
      return;
    }
    if (this.queue.length === 0) {
      console.warn(`[SyncTrace] SyncQueue.process: queue empty — setting SYNCED`);
      this.setSyncState('SYNCED');
      return;
    }

    const uid = this.resolveUid();
    if (!uid) {
      console.warn(`[SyncTrace] SyncQueue.process: NO UID — cannot process queue (${this.queue.length} items stuck)`);
      setTimeout(() => this.process(), 2000);
      return;
    }

    const startTime = Date.now();
    this.isProcessing = true;
    this.setSyncState('UPLOADING');
    console.warn(`[SyncTrace] SyncQueue.process: START queue=${this.queue.length} uid=${uid.substring(0,8)}...`);

    this.saveBackup();

    try {
      const batch = writeBatch(db);
      const opsToProcess = this.queue.slice(0, 200);

      // Pre-validate uid once
      const uidError = this.assertPathSegments({ id: 'SYSTEM', type: '', key: '', payload: {}, timestamp: '' } as any, ['users', uid]);
      if (uidError) {
        throw new Error(`Invalid uid path segment: uid=${uid}`);
      }

      const skippedOps: PendingSyncOp[] = [];

      for (const op of opsToProcess) {
        // Log every op before path construction
        console.warn(`[SyncTrace] PROCESS OP:`, {
          id: op.id,
          type: op.type,
          key: op.key,
          keyType: typeof op.key,
          payloadKeys: op.payload ? Object.keys(op.payload) : '(no payload)',
          timestamp: op.timestamp
        });

        let skipThisOp = false;

        // Assert: op.key must be a non-empty string for all types that use it
        if (op.type !== 'studyStrategy' && op.type !== 'metadata' && op.type !== ('analyticsSummary' as any) && op.type !== ('aiStudyMemory' as any)) {
          if (op.key === undefined || op.key === null || typeof op.key !== 'string' || op.key.length === 0) {
            console.error(`[SyncTrace] INVALID OP: op.key is invalid`, {
              id: op.id, type: op.type, key: op.key, keyType: typeof op.key, payload: op.payload
            });
            skipThisOp = true;
          }
        }

        if (!skipThisOp && op.type === 'coachPlan') {
          // Validate: op.key (templateId), blocks[*].id
          const pathErrors = this.assertPathSegments(op, ['users', uid, 'coachPlans', op.key]);
          if (pathErrors) { skipThisOp = true; }

          if (!skipThisOp) {
            const { blocks } = op.payload || {};
            if (blocks && Array.isArray(blocks)) {
              for (let bi = 0; bi < blocks.length; bi++) {
                const b = blocks[bi];
                const be = this.assertPathSegments(op, ['users', uid, 'coachPlans', op.key, 'blocks', b?.id]);
                if (be) {
                  console.error(`[SyncTrace] INVALID OP: coachPlan block[${bi}] has invalid id`, { block: b });
                  skipThisOp = true;
                  break;
                }
              }
            }
          }
        }

        if (!skipThisOp && (op.type === ('moveStudyBlock' as any))) {
          const parts = typeof op.key === 'string' ? op.key.split('/') : [];
          if (parts.length < 2) {
            console.error(`[SyncTrace] INVALID OP: moveStudyBlock key="${op.key}" missing templateId/blockId`, { op });
            skipThisOp = true;
          } else {
            const pathErrors = this.assertPathSegments(op, ['users', uid, 'coachPlans', parts[0], 'blocks', parts[1]]);
            if (pathErrors) { skipThisOp = true; }
          }
        }

        if (!skipThisOp && (op.type === ('renameTemplate' as any) || op.type === 'deleteCoachPlan')) {
          const pathErrors = this.assertPathSegments(op, ['users', uid, 'coachPlans', op.key]);
          if (pathErrors) { skipThisOp = true; }
        }

        if (!skipThisOp && (op.type === ('analyticsEvent' as any))) {
          const pathErrors = this.assertPathSegments(op, ['users', uid, 'analyticsEvents', op.key]);
          if (pathErrors) { skipThisOp = true; }
        }

        if (!skipThisOp && (op.type === ('event' as any))) {
          const pathErrors = this.assertPathSegments(op, ['users', uid, 'events', op.key]);
          if (pathErrors) { skipThisOp = true; }
        }

        // Assert: operationsLog path
        if (!skipThisOp) {
          const logErrors = this.assertPathSegments(op, ['users', uid, 'operationsLog', op.id]);
          if (logErrors) {
            console.error(`[SyncTrace] INVALID OP: op.id is invalid for operationsLog`, { op });
            skipThisOp = true;
          }
        }

        if (skipThisOp) {
          skippedOps.push(op);
          continue;
        }

        // === Build batch writes for this op ===
        const opLog = { collection: '', document: '', templateId: '' };

        if (op.type === 'coachPlan') {
          const docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          const { blocks, ...metadata } = op.payload;
          batch.set(docRef, metadata, { merge: true });
          opLog.collection = 'coachPlans';
          opLog.document = op.key;
          opLog.templateId = op.key;

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
          opLog.collection = 'coachPlans/templateId/blocks';
          opLog.document = `${templateId}/${blockId}`;
          opLog.templateId = templateId;
        } else if (op.type === ('renameTemplate' as any)) {
          const docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          batch.set(docRef, { name: op.payload.name }, { merge: true });
          opLog.collection = 'coachPlans';
          opLog.document = op.key;
          opLog.templateId = op.key;
        } else if (op.type === 'deleteCoachPlan') {
          const docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          batch.delete(docRef);
          opLog.collection = 'coachPlans';
          opLog.document = op.key;
          opLog.templateId = op.key;
        } else if (op.type === 'studyStrategy') {
          const docRef = doc(db, 'users', uid, 'studyStrategy', 'main');
          batch.set(docRef, op.payload, { merge: true });
          opLog.collection = 'studyStrategy';
          opLog.document = 'main';
        } else if (op.type === 'metadata') {
          const docRef = doc(db, 'users', uid, 'metadata', 'main');
          batch.set(docRef, op.payload, { merge: true });
          opLog.collection = 'metadata';
          opLog.document = 'main';
        } else if (op.type === 'analyticsEvent' as any) {
          const docRef = doc(db, 'users', uid, 'analyticsEvents', op.key);
          batch.set(docRef, op.payload);
          opLog.collection = 'analyticsEvents';
          opLog.document = op.key;
        } else if (op.type === 'analyticsSummary' as any) {
          const docRef = doc(db, 'users', uid, 'analytics', 'summary');
          batch.set(docRef, op.payload, { merge: true });
          opLog.collection = 'analytics';
          opLog.document = 'summary';
        } else if (op.type === 'aiStudyMemory' as any) {
          const docRef = doc(db, 'users', uid, 'aiStudyMemory', 'main');
          batch.set(docRef, op.payload, { merge: true });
          opLog.collection = 'aiStudyMemory';
          opLog.document = 'main';
        } else if (op.type === ('event' as any)) {
          const docRef = doc(db, 'users', uid, 'events', op.key);
          batch.set(docRef, op.payload);
          opLog.collection = 'events';
          opLog.document = op.key;
        }

        const logRef = doc(db, 'users', uid, 'operationsLog', op.id);
        batch.set(logRef, {
          operationId: op.id,
          type: op.type,
          key: op.key,
          timestamp: op.timestamp,
          status: 'SUCCESS',
          executedAt: new Date().toISOString()
        });

        console.warn(`[SyncTrace] OP ADDED TO BATCH:`, { ...opLog, opId: op.id, type: op.type });
      }

      // Remove skipped ops from queue permanently
      if (skippedOps.length > 0) {
        console.error(`[SyncTrace] SYNC QUEUE: Skipping ${skippedOps.length} invalid ops permanently. Offending ops:`, JSON.stringify(skippedOps, null, 2));
        this.queue = this.queue.filter(op => !skippedOps.find(s => s.id === op.id));
        this.saveToCache();
      }

      if (opsToProcess.filter(op => !skippedOps.find(s => s.id === op.id)).length === 0) {
        console.warn(`[SyncTrace] SyncQueue.process: All ${opsToProcess.length} ops were invalid, setting SYNCED`);
        this.lastSuccessfulUpload = new Date().toISOString();
        this.syncLatencyMs = Date.now() - startTime;
        this.retryCount = 0;
        this.firestoreStatus = 'connected';
        this.lastError = null;
        this.lastSyncTimestamp = new Date().toISOString();
        this.isProcessing = false;
        this.setSyncState('SYNCED');
        return;
      }

      console.warn(`[SyncTrace] SyncQueue.process: Committing ${opsToProcess.length - skippedOps.length} valid ops (${skippedOps.length} skipped)`);
      await batch.commit();
      console.warn(`[SyncTrace] SyncQueue.process: BATCH COMMIT SUCCEEDED (${opsToProcess.length - skippedOps.length} ops)`);

      this.lastSuccessfulUpload = new Date().toISOString();
      this.syncLatencyMs = Date.now() - startTime;
      this.retryCount = 0;

      // Verify only — do NOT remove from queue until verified
      const succeededIds = new Set<string>();
      await this.verifyWrites(opsToProcess, uid, succeededIds);
      console.warn(`[SyncTrace] SyncQueue.process: Verification result — ${succeededIds.size}/${opsToProcess.length} succeeded`);

      // Remove only verified ops
      const failedIds = opsToProcess
        .map(o => o.id)
        .filter(id => !succeededIds.has(id));

      this.queue = this.queue.filter(op => succeededIds.has(op.id) === false);
      
      // Track completed ops
      const verifiedIds = Array.from(succeededIds);
      try {
        const completed = JSON.parse(localStorage.getItem('cfa_sync_completed_ops') || '[]');
        const updatedCompleted = Array.from(new Set([...completed, ...verifiedIds])).slice(-200);
        localStorage.setItem('cfa_sync_completed_ops', JSON.stringify(updatedCompleted));
      } catch (_) {}

      this.saveToCache();
      this.clearBackup();

      this.firestoreStatus = 'connected';
      this.lastError = null;
      this.lastSyncTimestamp = new Date().toISOString();

      this.flushOfflineErrors(uid);

      // Schedule retry for failed ops with exponential backoff
      if (failedIds.length > 0) {
        this.retryCount++;
        this.lastFailedUpload = new Date().toISOString();
        this.setSyncState('RETRYING');

        // Permanently discard ops that exceed max retries
        const permanentlyFailed: string[] = [];
        for (const id of failedIds) {
          const retries = this.opRetries.get(id) || 0;
          if (retries >= this.MAX_OP_RETRIES) {
            permanentlyFailed.push(id);
            console.error(`[SyncTrace] SyncQueue: Op ${id} exceeded ${this.MAX_OP_RETRIES} retries — permanently discarding`);
          }
        }
        if (permanentlyFailed.length > 0) {
          this.queue = this.queue.filter(op => !permanentlyFailed.includes(op.id));
          this.saveToCache();
        }

        const remainingFailed = failedIds.filter(id => !permanentlyFailed.includes(id));
        if (remainingFailed.length > 0) {
          const maxBackoff = Math.max(...remainingFailed.map(id => this.getBackoffMs(id)));
          console.warn(`[SyncTrace] SyncQueue: ${remainingFailed.length} ops failed verification. Retrying in ${maxBackoff}ms. ${permanentlyFailed.length} permanently discarded.`);
          this.isProcessing = false;
          setTimeout(() => {
            this.setSyncState('QUEUED');
            this.process();
          }, maxBackoff);
          return;
        }
      }

      if (this.queue.length > 0) {
        this.isProcessing = false;
        setTimeout(() => this.process(), 300);
        return;
      }

      this.opRetries.clear();
      this.setSyncState('SYNCED');
      console.warn(`[SyncTrace] SyncQueue.process: COMPLETED — all ${succeededIds.size} ops synced, queue=${this.queue.length}`);

    } catch (error: any) {
      console.error(`[SyncTrace] SyncQueue.process: BATCH COMMIT FAILED (queue=${this.queue.length})`, error);
      this.firestoreStatus = 'offline';
      this.lastError = error.message || String(error);
      this.lastFailedUpload = new Date().toISOString();
      this.retryCount++;
      const msg = error.message || String(error);
      if (msg.includes('permission-denied') || msg.includes('Permission') || msg.includes('permission')) {
        this.lastPermissionError = msg;
      } else {
        this.lastFirestoreError = msg;
      }
      this.setSyncState('OFFLINE');
      this.reportError(uid, error);
      
      // Retry with backoff
      const backoff = this.getBackoffMs(`batch-${Date.now()}`);
      this.isProcessing = false;
      setTimeout(() => this.process(), backoff);
      return;
    }

    this.isProcessing = false;
    if (this.onStatusChange) this.onStatusChange();
  }

  private resolveUid(): string | null {
    // Try multiple sources for uid
    const fromLocal = localStorage.getItem('cfa_sync_uid');
    if (fromLocal) return fromLocal;
    try {
      const userData = localStorage.getItem('cfa_user');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed && parsed.id) return parsed.id;
      }
    } catch (_) {}
    return null;
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
