/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimelineTemplate, StudyStrategy, SemanticVersion } from '../../types';
import { eventBus } from '../EventBus';
import { firestoreAdapter } from './FirestoreAdapter';
import { syncQueue } from './SyncQueue';
import { ConflictResolver } from './ConflictResolver';
import { MigrationService } from './MigrationService';
import { coachPlanRepository } from '../../repositories/CoachPlanRepository';
import { studyStrategyRepository } from '../../repositories/StudyStrategyRepository';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { aiStudyMemoryService } from '../AIStudyMemoryService';
import { analyticsAggregator } from './AnalyticsAggregator';

export interface SyncStatus {
  authStatus: 'authenticated' | 'unauthenticated' | 'loading';
  firestoreStatus: 'connected' | 'offline';
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
  version: string;
  conflictStatus: string | null;
  healthCheckStatus: 'Healthy' | 'Inconsistent' | 'Repaired' | 'Unchecked';
  backupStatus: 'Active' | 'None';
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
    version: 'v3',
    conflictStatus: null,
    healthCheckStatus: 'Unchecked',
    backupStatus: 'None'
  };

  private listeners: (() => void)[] = [];
  
  // Buffers for 2-second debounce
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingCoachPlans: Record<string, TimelineTemplate> = {};
  private pendingStudyStrategy: StudyStrategy | null = null;
  private pendingMetadata: { activeTemplateId: string | null } | null = null;

  // React state synchronization triggers
  private appContextSetters: {
    setTemplates: React.Dispatch<React.SetStateAction<TimelineTemplate[]>>;
    setStudyStrategy: (strategy: StudyStrategy | null) => void;
    setActiveTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  } | null = null;

  private constructor() {
    // Connect SyncQueue status changes to SyncService status updates
    syncQueue.registerCallbacks(() => {
      this.status.pendingWrites = syncQueue.getQueueLength();
      this.status.lastError = syncQueue.getLastError();
      this.status.firestoreStatus = syncQueue.getFirestoreStatus();
      this.status.syncStatus = this.status.firestoreStatus === 'offline' 
        ? 'offline' 
        : (this.status.pendingWrites > 0 ? 'syncing' : 'idle');
      this.status.backupStatus = syncQueue.hasBackup() ? 'Active' : 'None';
      this.notify();
    });

    // Subscribe to EventBus mutations
    eventBus.subscribe('TimelineTemplateUpdated', (event) => this.handleEventBusMutation(event));
    eventBus.subscribe('StudyStrategyUpdated', (event) => this.handleEventBusMutation(event));

    // Subscribe to Analytics Events
    const analyticsEvents = [
      'PlanGenerated', 'PlanEdited', 'PlanAccepted', 'PlanArchived', 
      'BlockMoved', 'StudyCompleted', 'StrategyChanged'
    ];
    analyticsEvents.forEach(evt => {
      eventBus.subscribe(evt, (event) => {
        this.trackAnalytics(evt, event.payload);
      });
    });
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
      try { cb(); } catch (e) { console.error("SyncService: Notify listener error", e); }
    });
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Startup sync: downloads Cloud database, migrates structure, resolves conflicts, and populates repositories.
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
    this.appContextSetters = setters;
    this.status.syncStatus = 'syncing';
    localStorage.setItem('cfa_sync_uid', uid);
    this.notify();

    const localTemplates = coachPlanRepository.getAll();
    const localStrategy = studyStrategyRepository.get();
    const localActiveId = coachPlanRepository.getActiveTemplateId();

    try {
      // 1. Download plans, strategy, and operationsLog (for idempotency checks)
      const cloudPlans = await firestoreAdapter.getCoachPlans(uid);
      const rawCloudStrategy = await firestoreAdapter.getStudyStrategy(uid);
      const rawCloudMetadata = await firestoreAdapter.getMetadata(uid);

      // Download completed operation logs to filter syncQueue (Idempotency check)
      try {
        const logsSnap = await getDocs(collection(db, 'users', uid, 'operationsLog'));
        const completedIds: string[] = [];
        logsSnap.forEach(d => completedIds.push(d.id));
        syncQueue.filterQueueAgainstCompleted(completedIds);
      } catch (e) {
        console.error("SyncService: Failed to retrieve operations log on boot", e);
      }

      this.status.cloudCount = Object.keys(cloudPlans).length;

      // 2. Run Migration Service on cloud data
      const migratedPlans: Record<string, any> = {};
      Object.keys(cloudPlans).forEach(id => {
        migratedPlans[id] = MigrationService.migrate(cloudPlans[id], 'coachPlan');
      });
      const cloudStrategy = MigrationService.migrate(rawCloudStrategy, 'studyStrategy');

      // 3. Compare with local repositories (Run Conflict Resolution)
      this.status.cacheCount = localTemplates.length;

      const mergedTemplatesMap: Record<string, TimelineTemplate> = {};
      let cloudWinsCount = 0;
      let localWinsCount = 0;

      const allTemplateIds = new Set([
        ...localTemplates.map(t => t.id),
        ...Object.keys(migratedPlans)
      ]);

      for (const id of allTemplateIds) {
        const cloudPlan = migratedPlans[id];
        const localPlan = localTemplates.find(t => t.id === id);

        const res = ConflictResolver.resolveTemplate(localPlan, cloudPlan);
        mergedTemplatesMap[id] = res.data;
        if (res.winner === 'cloud') {
          cloudWinsCount++;
        } else if (res.winner === 'local') {
          localWinsCount++;
          // Queue write to Firestore
          syncQueue.enqueue('coachPlan', id, this.mapPlanForFirestore(res.data));
        }
      }

      // Resolve Strategy
      let finalStrategy: StudyStrategy | null = null;
      if (cloudStrategy || localStrategy) {
        const res = ConflictResolver.resolveStrategy(localStrategy || undefined, cloudStrategy);
        finalStrategy = res.data;
        if (res.winner === 'cloud') {
          cloudWinsCount++;
        } else if (res.winner === 'local') {
          localWinsCount++;
          syncQueue.enqueue('studyStrategy', 'main', finalStrategy);
        }
      }

      // Resolve Metadata
      let finalActiveId = localActiveId;
      if (rawCloudMetadata && rawCloudMetadata.activeTemplateId) {
        finalActiveId = rawCloudMetadata.activeTemplateId;
      } else if (localActiveId) {
        syncQueue.enqueue('metadata', 'main', { activeTemplateId: localActiveId });
      }

      // 4. Update repositories with resolved data
      const finalTemplates = Object.values(mergedTemplatesMap);
      coachPlanRepository.setTemplates(finalTemplates);
      coachPlanRepository.setActiveTemplateId(finalActiveId);
      studyStrategyRepository.set(finalStrategy);

      // Save repository states to local cache
      localStorage.setItem('cfa_timeline_templates', JSON.stringify(finalTemplates));
      if (finalActiveId) {
        localStorage.setItem('cfa_active_template_id', finalActiveId);
      } else {
        localStorage.removeItem('cfa_active_template_id');
      }
      if (finalStrategy) {
        localStorage.setItem('cfa_study_strategy', JSON.stringify(finalStrategy));
      } else {
        localStorage.removeItem('cfa_study_strategy');
      }

      // Load AI Study Memory & Analytics Summary from Cloud
      try {
        const memorySnap = await getDoc(doc(db, 'users', uid, 'aiStudyMemory', 'main'));
        if (memorySnap.exists()) {
          aiStudyMemoryService.setMemory(memorySnap.data() as any);
        }
        
        const summarySnap = await getDoc(doc(db, 'users', uid, 'analytics', 'summary'));
        if (summarySnap.exists()) {
          analyticsAggregator.setSummary(summarySnap.data() as any);
        }
      } catch (e) {
        console.error("SyncService: Failed to initialize auxiliary memory services", e);
      }

      // Automated Nightly Backup check
      try {
        const lastBackup = localStorage.getItem('cfa_last_nightly_backup');
        const backupOverdue = !lastBackup || (Date.now() - new Date(lastBackup).getTime() > 24 * 60 * 60 * 1000);
        if (backupOverdue) {
          const dateStr = new Date().toISOString().split('T')[0];
          const backupRef = doc(db, 'users', uid, 'backups', dateStr);
          const backupSnapshot = {
            templates: finalTemplates,
            activeTemplateId: finalActiveId,
            studyStrategy: finalStrategy,
            timestamp: new Date().toISOString()
          };
          await setDoc(backupRef, backupSnapshot);
          localStorage.setItem('cfa_last_nightly_backup', new Date().toISOString());
          console.log(`SyncService: Nightly backup snapshot created for date ${dateStr}`);
        }
      } catch (e) {
        console.error("SyncService: Failed to execute automated nightly backup", e);
      }

      // 5. Update React AppContext state setters
      setters.setTemplates(finalTemplates.filter(t => t.status !== 'DELETED'));
      setters.setActiveTemplateId(finalActiveId);
      setters.setStudyStrategy(finalStrategy);

      // 6. Update status metrics
      this.status.templateCount = finalTemplates.filter(t => t.status !== 'DELETED').length;
      this.status.strategyLoaded = finalStrategy !== null;
      this.status.activeTemplateId = finalActiveId;
      this.status.repositoryCount = finalTemplates.length;
      
      this.status.firestoreStatus = 'connected';
      this.status.syncStatus = 'idle';
      this.status.lastSync = new Date().toISOString();
      this.status.lastError = null;

      if (cloudWinsCount > 0 && localWinsCount > 0) {
        this.status.conflictStatus = `Resolved (Cloud wins ${cloudWinsCount}, Local wins ${localWinsCount})`;
      } else if (cloudWinsCount > 0) {
        this.status.conflictStatus = "Resolved - Cloud Wins";
      } else if (localWinsCount > 0) {
        this.status.conflictStatus = "Resolved - Local Wins";
      } else {
        this.status.conflictStatus = "No Conflict";
      }

      // 7. Perform repository health check
      this.healthCheck();

      // Trigger sync of queued writes
      syncQueue.setNetworkStatus(navigator.onLine);
      syncQueue.process();

    } catch (e: any) {
      console.error("SyncService: Startup synchronization failed. Offline fallback active.", e);
      this.status.firestoreStatus = 'offline';
      this.status.syncStatus = 'offline';
      this.status.lastError = e.message || String(e);
      this.notify();

      // Offline load fallback
      setters.setTemplates(localTemplates.filter(t => t.status !== 'DELETED'));
      setters.setActiveTemplateId(localActiveId);
      setters.setStudyStrategy(localStrategy);
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
    this.status.healthCheckStatus = 'Unchecked';
    localStorage.removeItem('cfa_sync_uid');
    this.notify();
  }

  // --- Health Checks & Repairs ---

  /**
   * Verifies that Local Storage cache, Repositories, and AppContext state are equal. Repairs if not.
   */
  public healthCheck(): boolean {
    this.status.healthCheckStatus = 'Unchecked';
    const localTemplates = coachPlanRepository.getAll();
    const localStrategy = studyStrategyRepository.get();
    const localActiveId = coachPlanRepository.getActiveTemplateId();

    try {
      // Check cache values
      const cachedTemplatesStr = localStorage.getItem('cfa_timeline_templates') || '[]';
      const cachedTemplates = JSON.parse(cachedTemplatesStr) as TimelineTemplate[];
      const cachedStrategyStr = localStorage.getItem('cfa_study_strategy');
      const cachedStrategy = cachedStrategyStr ? JSON.parse(cachedStrategyStr) : null;
      const cachedActiveId = localStorage.getItem('cfa_active_template_id');

      let inconsistent = false;

      // 1. Validate template lengths and IDs
      if (localTemplates.length !== cachedTemplates.length) inconsistent = true;
      for (const t of localTemplates) {
        if (!cachedTemplates.some(o => o.id === t.id)) inconsistent = true;
      }

      // 2. Validate strategy and active template ID
      if (JSON.stringify(localStrategy) !== JSON.stringify(cachedStrategy)) inconsistent = true;
      if (localActiveId !== cachedActiveId) inconsistent = true;

      if (inconsistent) {
        console.warn("SyncService Health Check: Inconsistencies detected! Executing auto-repair...");
        this.status.healthCheckStatus = 'Inconsistent';
        this.notify();
        this.repairRepository();
        return false;
      }

      this.status.healthCheckStatus = 'Healthy';
      this.notify();
      return true;
    } catch (e) {
      console.error("SyncService: Health check error. Performing auto-repair.", e);
      this.repairRepository();
      return false;
    }
  }

  private repairRepository() {
    console.log("SyncService: Executing Repository Auto-Repair...");
    try {
      const localTemplates = coachPlanRepository.getAll();
      const localStrategy = studyStrategyRepository.get();
      const localActiveId = coachPlanRepository.getActiveTemplateId();

      // Write values securely back to cache
      localStorage.setItem('cfa_timeline_templates', JSON.stringify(localTemplates));
      if (localActiveId) {
        localStorage.setItem('cfa_active_template_id', localActiveId);
      } else {
        localStorage.removeItem('cfa_active_template_id');
      }
      if (localStrategy) {
        localStorage.setItem('cfa_study_strategy', JSON.stringify(localStrategy));
      } else {
        localStorage.removeItem('cfa_study_strategy');
      }

      // Push back to React context setters
      if (this.appContextSetters) {
        this.appContextSetters.setTemplates(localTemplates.filter(t => t.status !== 'DELETED'));
        this.appContextSetters.setActiveTemplateId(localActiveId);
        this.appContextSetters.setStudyStrategy(localStrategy);
      }

      this.status.healthCheckStatus = 'Repaired';
      this.notify();
    } catch (e) {
      console.error("SyncService: Auto-repair failed.", e);
    }
  }

  // --- Debounced Mutation Handler ---

  private handleEventBusMutation(event: any) {
    const uid = this.status.currentUid;
    if (!uid) return;

    if (event.type === 'TimelineTemplateUpdated') {
      const templates = coachPlanRepository.getAll();
      templates.forEach(t => {
        this.pendingCoachPlans[t.id] = t;
      });
      
      // Update UI counts immediately
      this.status.templateCount = templates.filter(t => t.status !== 'DELETED').length;
      this.status.activeTemplateId = coachPlanRepository.getActiveTemplateId();
      this.status.repositoryCount = templates.length;

      // Handle activeTemplateId changes
      const activeId = coachPlanRepository.getActiveTemplateId();
      this.pendingMetadata = { activeTemplateId: activeId };

      this.resetDebounce();
    } else if (event.type === 'StudyStrategyUpdated') {
      const strategy = studyStrategyRepository.get();
      if (strategy) {
        this.pendingStudyStrategy = strategy;
        this.status.strategyLoaded = true;
      } else {
        this.status.strategyLoaded = false;
      }
      this.resetDebounce();
    }
  }

  private resetDebounce() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => this.flush(), 2000);
  }

  private flush() {
    const uid = this.status.currentUid;
    if (!uid) return;

    let queued = false;

    // Enqueue Coach Plans
    for (const id of Object.keys(this.pendingCoachPlans)) {
      const template = this.pendingCoachPlans[id];
      if (template.status === 'DELETED') {
        syncQueue.enqueue('deleteCoachPlan', id, null);
      } else {
        syncQueue.enqueue('coachPlan', id, this.mapPlanForFirestore(template));
      }
      queued = true;
    }
    this.pendingCoachPlans = {};

    // Enqueue Strategy
    if (this.pendingStudyStrategy) {
      syncQueue.enqueue('studyStrategy', 'main', this.pendingStudyStrategy);
      this.pendingStudyStrategy = null;
      queued = true;
    }

    // Enqueue Metadata
    if (this.pendingMetadata) {
      syncQueue.enqueue('metadata', 'main', {
        activeTemplateId: this.pendingMetadata.activeTemplateId,
        updatedAt: new Date().toISOString(),
        modifiedBy: 'CFA Candidate'
      });
      this.pendingMetadata = null;
      queued = true;
    }

    if (queued) {
      syncQueue.process();
    }
  }

  // --- Analytics Tracking ---

  private trackAnalytics(eventName: string, payload: any) {
    const uid = this.status.currentUid;
    if (!uid) return;

    const event = {
      id: Math.random().toString(36).substring(7),
      eventName,
      payload: payload || {},
      timestamp: new Date().toISOString()
    };
    
    // Save to local analytics log
    try {
      const logs = localStorage.getItem('cfa_analytics_events') || '[]';
      const events = JSON.parse(logs);
      events.push(event);
      localStorage.setItem('cfa_analytics_events', JSON.stringify(events.slice(-100))); // keep last 100
    } catch (_) {}

    // Enqueue for cloud sync
    syncQueue.enqueueAnalytics(event);
  }

  // --- Helper Mapping ---

  private mapPlanForFirestore(template: TimelineTemplate): any {
    return {
      templateId: template.id,
      templateName: template.name,
      studyBlocks: template.blocks || [],
      generatedByAI: template.id === 'coach-blueprint',
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      status: template.status || 'ACTIVE',
      completionStatistics: {
        totalBlocks: template.blocks?.length || 0,
        completedBlocks: 0,
        percentage: 0
      },
      version: template.version || 1,
      semanticVersion: template.semanticVersion || {
        coachPlanVersion: template.version || 1,
        studyStrategyVersion: 1,
        schemaVersion: MigrationService.CURRENT_SCHEMA_VERSION,
        resourceVersion: 1
      },
      modifiedBy: 'CFA Candidate'
    };
  }
}

export const syncService = SyncService.getInstance();
export type { SyncService as SyncServiceClass };
