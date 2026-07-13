/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Coach Planner & Study Strategy Firestore Synchronization Service.
 * Canonical Source of Truth: Firestore
 * Offline Cache & Temporary Sync Cache: localStorage
 */

import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { TimelineTemplate, StudyStrategy } from '../types';
import { eventBus } from './EventBus';

export interface SyncStatus {
  authStatus: 'authenticated' | 'unauthenticated' | 'loading';
  firestoreStatus: 'connected' | 'offline' | 'error';
  lastSync: string;
  pendingWrites: number;
  lastError: string | null;
  currentUid: string | null;
  templateCount: number;
  strategyLoaded: boolean;
  activeTemplateId: string | null;
  repositoryCount: number;
  cloudCount: number;
  cacheCount: number;
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
  version: number;
  conflictStatus: string | null;
}

export interface PendingSyncOp {
  id: string;
  type: 'coachPlan' | 'deleteCoachPlan' | 'studyStrategy' | 'metadata';
  key: string;
  payload: any;
  timestamp: string;
}

export class SyncService {
  private static instance: SyncService;
  
  private status: SyncStatus = {
    authStatus: 'loading',
    firestoreStatus: 'connected',
    lastSync: 'Never',
    pendingWrites: 0,
    lastError: null,
    currentUid: null,
    templateCount: 0,
    strategyLoaded: false,
    activeTemplateId: null,
    repositoryCount: 0,
    cloudCount: 0,
    cacheCount: 0,
    syncStatus: 'idle',
    version: 1,
    conflictStatus: null
  };

  private listeners: (() => void)[] = [];
  private pendingQueue: PendingSyncOp[] = [];
  
  // Buffers for debouncing
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingCoachPlans: Record<string, TimelineTemplate> = {};
  private pendingStudyStrategy: StudyStrategy | null = null;
  private pendingMetadata: { activeTemplateId: string | null } | null = null;
  
  private isProcessingQueue = false;
  private syncContextSetters: {
    setTemplates: React.Dispatch<React.SetStateAction<TimelineTemplate[]>>;
    setStudyStrategy: (strategy: StudyStrategy | null) => void;
    setActiveTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  } | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkStatusChange(true));
      window.addEventListener('offline', () => this.handleNetworkStatusChange(false));
      this.loadQueueFromLocalStorage();
      
      // Periodically check queue if we have pending writes and firestore status is online
      setInterval(() => {
        if (this.pendingQueue.length > 0 && this.status.firestoreStatus === 'connected' && !this.isProcessingQueue) {
          this.processQueue();
        }
      }, 5000);
    }
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.error("Error updating SyncService subscriber:", e); }
    });
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  private loadQueueFromLocalStorage() {
    try {
      const saved = localStorage.getItem('cfa_sync_pending_queue');
      if (saved) {
        this.pendingQueue = JSON.parse(saved);
        this.status.pendingWrites = this.pendingQueue.length;
        this.notify();
      }
    } catch (e) {
      console.error("SyncService: Failed to load pending queue from cache", e);
    }
  }

  private saveQueueToLocalStorage() {
    try {
      localStorage.setItem('cfa_sync_pending_queue', JSON.stringify(this.pendingQueue));
      this.status.pendingWrites = this.pendingQueue.length;
      this.notify();
    } catch (e) {
      console.error("SyncService: Failed to save pending queue to cache", e);
    }
  }

  private handleNetworkStatusChange(online: boolean) {
    this.status.firestoreStatus = online ? 'connected' : 'offline';
    this.status.syncStatus = online ? (this.pendingQueue.length > 0 ? 'syncing' : 'idle') : 'offline';
    this.notify();
    if (online) {
      this.processQueue();
    }
  }

  /**
   * Startup sync: downloads Cloud database data, runs Conflict Resolution, and populates AppContext
   */
  public async initialize(
    uid: string,
    setters: {
      setTemplates: React.Dispatch<React.SetStateAction<TimelineTemplate[]>>;
      setStudyStrategy: (strategy: StudyStrategy | null) => void;
      setActiveTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
    }
  ): Promise<void> {
    this.status.currentUid = uid;
    this.status.authStatus = 'authenticated';
    this.syncContextSetters = setters;
    this.status.syncStatus = 'syncing';
    this.notify();

    try {
      // 1. Fetch Cloud Plans from Firestore
      const coachPlansColRef = collection(db, 'users', uid, 'coachPlans');
      const coachPlansSnap = await getDocs(coachPlansColRef);
      const cloudPlans: Record<string, any> = {};
      coachPlansSnap.forEach(docSnap => {
        cloudPlans[docSnap.id] = docSnap.data();
      });
      this.status.cloudCount = Object.keys(cloudPlans).length;

      // 2. Fetch Cloud Study Strategy from Firestore
      const strategyDocRef = doc(db, 'users', uid, 'studyStrategy', 'main');
      const strategyDocSnap = await getDoc(strategyDocRef);
      const cloudStrategy = strategyDocSnap.exists() ? strategyDocSnap.data() : null;

      // 3. Fetch Cloud Metadata (activeTemplateId)
      const metadataDocRef = doc(db, 'users', uid, 'metadata', 'main');
      const metadataDocSnap = await getDoc(metadataDocRef);
      const cloudMetadata = metadataDocSnap.exists() ? metadataDocSnap.data() : null;

      // 4. Load local storage cache
      let localTemplates: TimelineTemplate[] = [];
      const savedTemplates = localStorage.getItem('cfa_timeline_templates');
      if (savedTemplates) {
        try { localTemplates = JSON.parse(savedTemplates); } catch (_) {}
      }
      this.status.cacheCount = localTemplates.length;

      let localStrategy: StudyStrategy | null = null;
      const savedStrategy = localStorage.getItem('cfa_study_strategy');
      if (savedStrategy) {
        try { localStrategy = JSON.parse(savedStrategy); } catch (_) {}
      }

      const localActiveTemplateId = localStorage.getItem('cfa_active_template_id');

      // 5. Conflict Resolution & Mapping
      const mergedTemplatesMap: Record<string, TimelineTemplate> = {};
      let cloudWinsCount = 0;
      let localWinsCount = 0;

      const allTemplateIds = new Set([
        ...localTemplates.map(t => t.id),
        ...Object.keys(cloudPlans)
      ]);

      for (const id of allTemplateIds) {
        const cloudPlan = cloudPlans[id];
        const localTemplate = localTemplates.find(t => t.id === id);

        if (cloudPlan && localTemplate) {
          const cloudUpdatedAt = new Date(cloudPlan.updatedAt).getTime();
          const localUpdatedAt = new Date(localTemplate.updatedAt).getTime();
          const cloudVersion = cloudPlan.version || 0;
          const localVersion = (localTemplate as any).version || 0;

          if (cloudVersion > localVersion || (cloudVersion === localVersion && cloudUpdatedAt > localUpdatedAt)) {
            // Cloud version is newer
            mergedTemplatesMap[id] = this.mapFirestorePlanToLocal(cloudPlan);
            cloudWinsCount++;
          } else if (localVersion > cloudVersion || (localVersion === cloudVersion && localUpdatedAt > cloudUpdatedAt)) {
            // Local version is newer (queue write to cloud)
            mergedTemplatesMap[id] = localTemplate;
            localWinsCount++;
            this.queueWriteOp('coachPlan', id, this.mapLocalPlanToFirestore(localTemplate));
          } else {
            // Equal version
            mergedTemplatesMap[id] = this.mapFirestorePlanToLocal(cloudPlan);
          }
        } else if (cloudPlan) {
          // Cloud only
          mergedTemplatesMap[id] = this.mapFirestorePlanToLocal(cloudPlan);
        } else if (localTemplate) {
          // Local only (not yet saved in cloud)
          mergedTemplatesMap[id] = localTemplate;
          localWinsCount++;
          this.queueWriteOp('coachPlan', id, this.mapLocalPlanToFirestore(localTemplate));
        }
      }

      const finalTemplates = Object.values(mergedTemplatesMap);

      // Strategy Conflict Resolution
      let finalStrategy: StudyStrategy | null = null;
      if (cloudStrategy && localStrategy) {
        const cloudUpdatedAt = new Date(cloudStrategy.updatedAt).getTime();
        const localUpdatedAt = new Date(localStrategy.updatedAt).getTime();
        const cloudVersion = cloudStrategy.version || 0;
        const localVersion = (localStrategy as any).version || 0;

        if (cloudVersion > localVersion || (cloudVersion === localVersion && cloudUpdatedAt > localUpdatedAt)) {
          finalStrategy = cloudStrategy as StudyStrategy;
          cloudWinsCount++;
        } else if (localVersion > cloudVersion || (localVersion === cloudVersion && localUpdatedAt > cloudUpdatedAt)) {
          finalStrategy = localStrategy;
          localWinsCount++;
          this.queueWriteOp('studyStrategy', 'main', {
            ...localStrategy,
            version: localVersion,
            updatedAt: localStrategy.updatedAt || new Date().toISOString(),
            modifiedBy: 'CFA Candidate'
          });
        } else {
          finalStrategy = cloudStrategy as StudyStrategy;
        }
      } else if (cloudStrategy) {
        finalStrategy = cloudStrategy as StudyStrategy;
      } else if (localStrategy) {
        finalStrategy = localStrategy;
        this.queueWriteOp('studyStrategy', 'main', {
          ...localStrategy,
          version: (localStrategy as any).version || 1,
          updatedAt: localStrategy.updatedAt || new Date().toISOString(),
          modifiedBy: 'CFA Candidate'
        });
      }

      // Metadata / Active Template conflict resolution
      let finalActiveTemplateId: string | null = null;
      if (cloudMetadata) {
        finalActiveTemplateId = cloudMetadata.activeTemplateId;
      } else if (localActiveTemplateId) {
        finalActiveTemplateId = localActiveTemplateId;
        this.queueWriteOp('metadata', 'main', {
          activeTemplateId: localActiveTemplateId,
          version: 1,
          updatedAt: new Date().toISOString(),
          modifiedBy: 'CFA Candidate'
        });
      }

      // If we don't have any templates at all, but we have a templateId saved, let's restore it
      if (finalTemplates.length > 0 && !finalActiveTemplateId) {
        // Fallback to first available template
        finalActiveTemplateId = finalTemplates.find(t => t.id === 'sandbox-default')?.id || finalTemplates[0].id;
      }

      // Write Resolved Conflicts back to Context
      setters.setTemplates(finalTemplates);
      setters.setStudyStrategy(finalStrategy);
      setters.setActiveTemplateId(finalActiveTemplateId);

      // Save resolved state to localStorage cache
      localStorage.setItem('cfa_timeline_templates', JSON.stringify(finalTemplates));
      if (finalStrategy) {
        localStorage.setItem('cfa_study_strategy', JSON.stringify(finalStrategy));
      } else {
        localStorage.removeItem('cfa_study_strategy');
      }
      if (finalActiveTemplateId) {
        localStorage.setItem('cfa_active_template_id', finalActiveTemplateId);
      } else {
        localStorage.removeItem('cfa_active_template_id');
      }

      // Update Diagnostics
      this.status.templateCount = finalTemplates.length;
      this.status.strategyLoaded = finalStrategy !== null;
      this.status.activeTemplateId = finalActiveTemplateId;
      this.status.repositoryCount = finalTemplates.length;
      this.status.firestoreStatus = 'connected';
      this.status.syncStatus = 'idle';
      this.status.lastSync = new Date().toISOString();
      this.status.lastError = null;
      this.status.version = finalTemplates.reduce((max, t) => Math.max(max, (t as any).version || 1), 1);
      
      if (cloudWinsCount > 0 && localWinsCount > 0) {
        this.status.conflictStatus = `Resolved (Cloud wins ${cloudWinsCount}, Local wins ${localWinsCount})`;
      } else if (cloudWinsCount > 0) {
        this.status.conflictStatus = "Resolved - Cloud Wins";
      } else if (localWinsCount > 0) {
        this.status.conflictStatus = "Resolved - Local Wins";
      } else {
        this.status.conflictStatus = "No Conflict";
      }
      this.notify();

      // Dispatch load event
      eventBus.publish({
        type: 'TimelineUpdated',
        timestamp: new Date().toISOString(),
        source: 'SyncService',
        entityId: 'all',
        payload: { templates: finalTemplates }
      });

      // Trigger upload of any locally queued items
      this.processQueue();

    } catch (e: any) {
      console.error("SyncService: Startup sync failed. Falling back to local offline cache.", e);
      this.status.firestoreStatus = 'offline';
      this.status.syncStatus = 'offline';
      this.status.lastError = e.message || String(e);
      this.notify();

      // Offline load fallback
      let localTemplates: TimelineTemplate[] = [];
      const savedTemplates = localStorage.getItem('cfa_timeline_templates');
      if (savedTemplates) {
        try { localTemplates = JSON.parse(savedTemplates); } catch (_) {}
      }
      let localStrategy: StudyStrategy | null = null;
      const savedStrategy = localStorage.getItem('cfa_study_strategy');
      if (savedStrategy) {
        try { localStrategy = JSON.parse(savedStrategy); } catch (_) {}
      }
      const localActiveTemplateId = localStorage.getItem('cfa_active_template_id');

      setters.setTemplates(localTemplates);
      setters.setStudyStrategy(localStrategy);
      setters.setActiveTemplateId(localActiveTemplateId);

      this.status.templateCount = localTemplates.length;
      this.status.strategyLoaded = localStrategy !== null;
      this.status.activeTemplateId = localActiveTemplateId;
      this.status.repositoryCount = localTemplates.length;
    }
  }

  public clearUser() {
    this.status.currentUid = null;
    this.status.authStatus = 'unauthenticated';
    this.status.activeTemplateId = null;
    this.status.templateCount = 0;
    this.status.strategyLoaded = false;
    this.status.cloudCount = 0;
    this.status.conflictStatus = null;
    this.notify();
  }

  /**
   * Debounced mutators called from AppContext
   */
  public triggerSyncCoachPlan(template: TimelineTemplate) {
    // 1. Immediately update cache so UI renders synchronously
    const saved = localStorage.getItem('cfa_timeline_templates') || '[]';
    let localTemplates: TimelineTemplate[] = [];
    try { localTemplates = JSON.parse(saved); } catch (_) {}

    const newVersion = ((template as any).version || 0) + 1;
    const updatedTemplate = {
      ...template,
      version: newVersion,
      updatedAt: new Date().toISOString()
    } as any;

    localTemplates = localTemplates.filter(t => t.id !== template.id);
    localTemplates.push(updatedTemplate);
    localStorage.setItem('cfa_timeline_templates', JSON.stringify(localTemplates));
    
    this.status.cacheCount = localTemplates.length;
    this.status.templateCount = localTemplates.length;
    this.status.repositoryCount = localTemplates.length;
    this.status.version = Math.max(this.status.version, newVersion);

    // 2. Buffer change
    this.pendingCoachPlans[template.id] = updatedTemplate;
    this.resetDebounceTimer();
  }

  public triggerDeleteCoachPlan(templateId: string) {
    // 1. Update cache
    const saved = localStorage.getItem('cfa_timeline_templates') || '[]';
    let localTemplates: TimelineTemplate[] = [];
    try { localTemplates = JSON.parse(saved); } catch (_) {}

    localTemplates = localTemplates.filter(t => t.id !== templateId);
    localStorage.setItem('cfa_timeline_templates', JSON.stringify(localTemplates));

    this.status.cacheCount = localTemplates.length;
    this.status.templateCount = localTemplates.length;
    this.status.repositoryCount = localTemplates.length;

    // 2. Clear buffers and queue delete
    delete this.pendingCoachPlans[templateId];
    this.pendingQueue = this.pendingQueue.filter(op => !(op.type === 'coachPlan' && op.key === templateId));
    
    this.pendingQueue.push({
      id: Math.random().toString(36).substring(7),
      type: 'deleteCoachPlan',
      key: templateId,
      payload: null,
      timestamp: new Date().toISOString()
    });
    this.saveQueueToLocalStorage();
    this.processQueue();
  }

  public triggerSyncStudyStrategy(strategy: StudyStrategy) {
    // 1. Update cache
    const newVersion = ((strategy as any).version || 0) + 1;
    const updatedStrategy = {
      ...strategy,
      version: newVersion,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('cfa_study_strategy', JSON.stringify(updatedStrategy));
    this.status.strategyLoaded = true;

    // 2. Buffer change
    this.pendingStudyStrategy = updatedStrategy;
    this.resetDebounceTimer();
  }

  public triggerSyncMetadata(activeTemplateId: string | null) {
    // 1. Update cache
    if (activeTemplateId) {
      localStorage.setItem('cfa_active_template_id', activeTemplateId);
    } else {
      localStorage.removeItem('cfa_active_template_id');
    }
    this.status.activeTemplateId = activeTemplateId;

    // 2. Buffer change
    this.pendingMetadata = { activeTemplateId };
    this.resetDebounceTimer();
  }

  private resetDebounceTimer() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => this.flushBufferedWrites(), 2000);
  }

  private flushBufferedWrites() {
    const uid = this.status.currentUid;
    if (!uid) return;

    let queuedCount = 0;

    // Flush templates
    for (const id of Object.keys(this.pendingCoachPlans)) {
      const template = this.pendingCoachPlans[id];
      const docPayload = this.mapLocalPlanToFirestore(template);
      this.queueWriteOp('coachPlan', id, docPayload);
      queuedCount++;
    }
    this.pendingCoachPlans = {};

    // Flush strategy
    if (this.pendingStudyStrategy) {
      const docPayload = {
        ...this.pendingStudyStrategy,
        version: (this.pendingStudyStrategy as any).version || 1,
        updatedAt: this.pendingStudyStrategy.updatedAt || new Date().toISOString(),
        modifiedBy: 'CFA Candidate'
      };
      this.queueWriteOp('studyStrategy', 'main', docPayload);
      this.pendingStudyStrategy = null;
      queuedCount++;
    }

    // Flush metadata
    if (this.pendingMetadata) {
      const docPayload = {
        activeTemplateId: this.pendingMetadata.activeTemplateId,
        version: 1,
        updatedAt: new Date().toISOString(),
        modifiedBy: 'CFA Candidate'
      };
      this.queueWriteOp('metadata', 'main', docPayload);
      this.pendingMetadata = null;
      queuedCount++;
    }

    if (queuedCount > 0) {
      this.processQueue();
    }
  }

  private queueWriteOp(type: PendingSyncOp['type'], key: string, payload: any) {
    // Merge writes: remove duplicate write ops for the same target in the queue
    this.pendingQueue = this.pendingQueue.filter(op => !(op.type === type && op.key === key));
    
    this.pendingQueue.push({
      id: Math.random().toString(36).substring(7),
      type,
      key,
      payload,
      timestamp: new Date().toISOString()
    });
    this.saveQueueToLocalStorage();
  }

  /**
   * Loops through queue and uploads items to Firestore
   */
  private async processQueue() {
    if (this.isProcessingQueue) return;
    if (this.pendingQueue.length === 0) {
      this.status.syncStatus = 'idle';
      this.notify();
      return;
    }

    const uid = this.status.currentUid;
    if (!uid) return;

    this.isProcessingQueue = true;
    this.status.syncStatus = 'syncing';
    this.notify();

    while (this.pendingQueue.length > 0) {
      const op = this.pendingQueue[0];

      try {
        if (op.type === 'coachPlan') {
          const docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          await setDoc(docRef, op.payload, { merge: true });
        } else if (op.type === 'deleteCoachPlan') {
          const docRef = doc(db, 'users', uid, 'coachPlans', op.key);
          await deleteDoc(docRef);
        } else if (op.type === 'studyStrategy') {
          const docRef = doc(db, 'users', uid, 'studyStrategy', op.key);
          await setDoc(docRef, op.payload, { merge: true });
        } else if (op.type === 'metadata') {
          const docRef = doc(db, 'users', uid, 'metadata', op.key);
          await setDoc(docRef, op.payload, { merge: true });
        }

        // Success! Dequeue and save
        this.pendingQueue.shift();
        this.saveQueueToLocalStorage();
        
        this.status.lastSync = new Date().toISOString();
        this.status.firestoreStatus = 'connected';
        this.status.lastError = null;

        // Fetch new cloud count
        try {
          const coachPlansColRef = collection(db, 'users', uid, 'coachPlans');
          const coachPlansSnap = await getDocs(coachPlansColRef);
          this.status.cloudCount = coachPlansSnap.size;
        } catch (_) {}

        // Publish event to EventBus
        if (op.type === 'coachPlan' || op.type === 'deleteCoachPlan') {
          eventBus.publish({
            type: 'CoachPlanUpdated',
            timestamp: new Date().toISOString(),
            source: 'SyncService',
            entityId: op.key,
            payload: op.payload
          });
          eventBus.publish({
            type: 'TimelineUpdated',
            timestamp: new Date().toISOString(),
            source: 'SyncService',
            entityId: op.key,
            payload: op.payload
          });
        } else if (op.type === 'studyStrategy') {
          eventBus.publish({
            type: 'StudyStrategyUpdated',
            timestamp: new Date().toISOString(),
            source: 'SyncService',
            entityId: op.key,
            payload: op.payload
          });
          eventBus.publish({
            type: 'TimelineUpdated',
            timestamp: new Date().toISOString(),
            source: 'SyncService',
            entityId: op.key,
            payload: op.payload
          });
        }

      } catch (error: any) {
        console.error("SyncService: Queue processing error, will retry later.", error);
        this.status.firestoreStatus = 'offline';
        this.status.syncStatus = 'offline';
        this.status.lastError = error.message || String(error);
        this.notify();
        break; // Pause queue processing
      }
    }

    this.isProcessingQueue = false;
    if (this.pendingQueue.length === 0) {
      this.status.syncStatus = 'idle';
    }
    this.notify();
  }

  // --- Mappings ---
  private mapLocalPlanToFirestore(template: TimelineTemplate): any {
    return {
      templateId: template.id,
      templateName: template.name,
      studyBlocks: template.blocks || [],
      generatedByAI: template.id === 'coach-blueprint',
      createdAt: template.createdAt || new Date().toISOString(),
      updatedAt: template.updatedAt || new Date().toISOString(),
      status: template.id === 'coach-blueprint' ? 'read-only' : 'active',
      completionStatistics: {
        totalBlocks: template.blocks?.length || 0,
        completedBlocks: 0, // dynamic
        percentage: 0
      },
      version: (template as any).version || 1,
      modifiedBy: 'CFA Candidate'
    };
  }

  private mapFirestorePlanToLocal(firestorePlan: any): TimelineTemplate {
    return {
      id: firestorePlan.templateId,
      name: firestorePlan.templateName,
      description: firestorePlan.templateId === 'coach-blueprint' 
        ? 'AI-generated study schedule based on LOS distribution and exam timeline.'
        : 'Your editable schedule. Modify blocks, dates, and order freely.',
      isEditable: firestorePlan.templateId !== 'coach-blueprint',
      blocks: firestorePlan.studyBlocks || [],
      createdAt: firestorePlan.createdAt,
      updatedAt: firestorePlan.updatedAt,
      version: firestorePlan.version || 1
    } as any;
  }
}

export const syncService = SyncService.getInstance();
