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
import { collection, doc, getDoc, setDoc, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { aiStudyMemoryService } from '../AIStudyMemoryService';
import { analyticsAggregator } from './AnalyticsAggregator';
import { AuditService } from './AuditService';

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
  healthScore?: number;
  auditDetails?: string[];
  auditSummary?: any;
  syncState?: 'IDLE' | 'LOCAL_CHANGE' | 'QUEUED' | 'UPLOADING' | 'VERIFYING' | 'SYNCED' | 'OFFLINE' | 'RETRYING';
  firestoreInitStatus?: 'Success' | 'Failed' | 'Uninitialized';
  listenerStatus?: 'Active' | 'Failed' | 'Inactive';
  queueSize?: number;
  queueAgeSeconds?: number;
  queueRetryCount?: number;
  lastSuccessfulUpload?: string;
  lastFailedUpload?: string;
  lastFirestoreError?: string | null;
  lastPermissionError?: string | null;
  lastChecksumVerification?: string;
  syncLatencyMs?: number;
}

export interface PendingSyncOp {
  id: string;
  type: 'coachPlan' | 'deleteCoachPlan' | 'studyStrategy' | 'metadata' | 'aiStudyMemory' | 'analyticsSummary' | 'analyticsEvent';
  key: string;
  payload: any;
  timestamp: string;
}

export class SyncService {
  private static instance: SyncService;
  
  private status: SyncStatus = {
    authStatus: 'loading',
    firestoreStatus: 'offline',
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
    backupStatus: 'None',
    healthScore: 100,
    auditDetails: [],
    auditSummary: null,
    syncState: 'IDLE',
    firestoreInitStatus: 'Uninitialized',
    listenerStatus: 'Inactive',
    queueSize: 0,
    queueAgeSeconds: 0,
    queueRetryCount: 0,
    lastSuccessfulUpload: 'Never',
    lastFailedUpload: 'Never',
    lastFirestoreError: null,
    lastPermissionError: null,
    lastChecksumVerification: 'Never',
    syncLatencyMs: 0
  };

  private listeners: (() => void)[] = [];
  private unsubs: (() => void)[] = [];
  private reconciliationInterval: any = null;
  
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
      this.status.syncState = syncQueue.getSyncState();
      this.status.backupStatus = syncQueue.hasBackup() ? 'Active' : 'None';

      // Advanced Diagnostics Metrics
      this.status.queueSize = syncQueue.getQueueLength();
      this.status.queueAgeSeconds = syncQueue.getQueueAgeSeconds();
      this.status.queueRetryCount = syncQueue.getQueueRetryCount();
      this.status.lastSuccessfulUpload = syncQueue.getLastSuccessfulUpload();
      this.status.lastFailedUpload = syncQueue.getLastFailedUpload();
      this.status.lastFirestoreError = syncQueue.getLastFirestoreError();
      this.status.lastPermissionError = syncQueue.getLastPermissionError();
      this.status.syncLatencyMs = syncQueue.getSyncLatencyMs();
      
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
    console.warn(`[SyncTrace] SyncService.initialize: START uid=${uid.substring(0,8)}...`);

    const localTemplates = coachPlanRepository.getAll();
    const localStrategy = studyStrategyRepository.get();
    const localActiveId = coachPlanRepository.getActiveTemplateId();
    console.warn(`[SyncTrace] SyncService.initialize: Local state — templates=${localTemplates.length} strategy=${!!localStrategy} activeId=${localActiveId}`);

    try {
      // Perform connection probe
      const connectionProbe = await this.probeFirestoreConnection(uid);
      this.status.firestoreStatus = connectionProbe.status;

      if (connectionProbe.status === 'offline') {
        this.status.firestoreInitStatus = connectionProbe.errorType === 'Initialization Failure' ? 'Failed' : 'Uninitialized';
        throw new Error(connectionProbe.error || 'Firestore Offline');
      } else {
        this.status.firestoreInitStatus = 'Success';
      }

      console.warn(`[SyncTrace] SyncService.initialize: Firestore probe OK — status=${this.status.firestoreStatus}`);

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
      console.warn(`[SyncTrace] SyncService.initialize: Cloud download — plans=${Object.keys(cloudPlans).length} strategy=${!!rawCloudStrategy} metadata=${!!rawCloudMetadata}`);

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
      console.warn(`[SyncTrace] SyncService.initialize: Conflict resolution — final=${finalTemplates.length} cloudWins=${cloudWinsCount} localWins=${localWinsCount}`);
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

      // 8. Attach real-time Firestore listeners and reconcilers
      this.setupRealtimeListeners(uid, setters);
      this.setupReconciliationTimer(uid, setters);
      this.setupNetworkListeners();

      // Trigger sync of queued writes
      syncQueue.setNetworkStatus(navigator.onLine);
      await syncQueue.process();

      // Re-check equality after queue has been flushed
      try {
        const freshCloudPlans = await firestoreAdapter.getCoachPlans(uid);
        this.verifyAndRepairRepositoryEquality(uid, freshCloudPlans);
        console.warn(`[SyncTrace] SyncService.initialize: Post-sync equality — repo=${this.status.repositoryCount} cache=${this.status.cacheCount} cloud=${this.status.cloudCount}`);
      } catch (e) {
        console.error("[SyncTrace] SyncService: Post-sync equality check failed", e);
      }

    } catch (e: any) {
      console.error("SyncService: Startup synchronization failed. Offline fallback active.", e);
      this.status.firestoreStatus = 'offline';
      this.status.syncStatus = 'offline';
      const msg = e.message || String(e);
      this.status.lastError = msg;
      
      let errorType = 'Firestore Error';
      if (msg.includes('permission-denied') || msg.includes('Permission') || msg.includes('permission')) {
        errorType = 'Permission Denied';
        this.status.lastPermissionError = msg;
      } else if (msg.includes('unavailable') || msg.includes('Failed to get document') || msg.includes('network')) {
        errorType = 'Network Unavailable';
        this.status.lastFirestoreError = msg;
      } else if (msg.includes('initialization') || msg.includes('initialize') || msg.includes('init')) {
        errorType = 'Initialization Failure';
        this.status.firestoreInitStatus = 'Failed';
        this.status.lastFirestoreError = msg;
      } else {
        this.status.lastFirestoreError = msg;
      }
      
      this.notify();

      // Offline load fallback
      setters.setTemplates(localTemplates.filter(t => t.status !== 'DELETED'));
      setters.setActiveTemplateId(localActiveId);
      setters.setStudyStrategy(localStrategy);

      // Still try to process the queue even in fallback mode — uid IS set
      console.warn(`[SyncTrace] SyncService: Initialize failed but uid=${uid}, queue=${syncQueue.getQueueLength()} items — attempting process`);
      syncQueue.setNetworkStatus(navigator.onLine);
      syncQueue.process();
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
    this.status.listenerStatus = 'Inactive';
    this.status.firestoreStatus = 'offline';
    this.status.firestoreInitStatus = 'Uninitialized';

    // Clear listeners & timers
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
    this.clearListenerRetries();
    if (this.reconciliationInterval) {
      clearInterval(this.reconciliationInterval);
      this.reconciliationInterval = null;
    }
    this.removeNetworkListeners();

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
      // 1. Check cache values alignment
      const cachedTemplatesStr = localStorage.getItem('cfa_timeline_templates') || '[]';
      const cachedTemplates = JSON.parse(cachedTemplatesStr) as TimelineTemplate[];
      const cachedStrategyStr = localStorage.getItem('cfa_study_strategy');
      const cachedStrategy = cachedStrategyStr ? JSON.parse(cachedStrategyStr) : null;
      const cachedActiveId = localStorage.getItem('cfa_active_template_id');

      let inconsistent = false;
      let scoreDeduction = 0;
      const details: string[] = [];

      if (localTemplates.length !== cachedTemplates.length) {
        inconsistent = true;
        scoreDeduction += 15;
        details.push("Cache: Cached template count does not match memory repository.");
      }
      if (JSON.stringify(localStrategy) !== JSON.stringify(cachedStrategy)) {
        inconsistent = true;
        scoreDeduction += 15;
        details.push("Cache: Cached study strategy does not match memory repository.");
      }
      if (localActiveId !== cachedActiveId) {
        inconsistent = true;
        scoreDeduction += 10;
        details.push("Cache: Cached active template ID does not match memory repository.");
      }

      // 2. Perform Repository Audits
      const audit = AuditService.audit();
      if (audit.templates === 'FAIL') {
        inconsistent = true;
        scoreDeduction += 20;
      }
      if (audit.strategy === 'FAIL') {
        inconsistent = true;
        scoreDeduction += 20;
      }
      if (audit.readings === 'FAIL') {
        inconsistent = true;
        scoreDeduction += 10;
      }
      if (audit.resources === 'FAIL') {
        inconsistent = true;
        scoreDeduction += 10;
      }

      const allDetails = [...details, ...audit.details];
      
      this.status.healthScore = Math.max(0, 100 - scoreDeduction);
      this.status.auditDetails = allDetails;
      this.status.auditSummary = audit;

      if (inconsistent) {
        console.warn("SyncService Health Check: Inconsistencies detected! Executing auto-repair...", allDetails);
        this.status.healthCheckStatus = 'Inconsistent';
        this.notify();
        this.repairRepository();
        return false;
      }

      this.status.healthCheckStatus = 'Healthy';
      this.notify();
      return true;
    } catch (e: any) {
      console.error("SyncService: Health check error. Performing auto-repair.", e);
      this.status.healthScore = 50;
      this.status.healthCheckStatus = 'Inconsistent';
      this.status.auditDetails = [`Audit crashed: ${e.message || String(e)}`];
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
    this.triggerMutationActivity();
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

  private currentReconcileIntervalMs = 1800000; // 30 min default (Idle)
  private idleRevertTimeout: NodeJS.Timeout | null = null;

  public setReconcileIntervalMode(mode: 'IDLE' | 'EDITING' | 'IMMEDIATE') {
    const oldInterval = this.currentReconcileIntervalMs;
    if (mode === 'IDLE') {
      this.currentReconcileIntervalMs = 1800000; // 30 mins
    } else if (mode === 'EDITING') {
      this.currentReconcileIntervalMs = 120000; // 2 mins
    } else if (mode === 'IMMEDIATE') {
      this.currentReconcileIntervalMs = 5000; // 5s immediate retry
    }

    if (oldInterval !== this.currentReconcileIntervalMs) {
      console.log(`SyncService: Adaptive reconciliation interval adjusted to ${this.currentReconcileIntervalMs / 1000}s`);
      const uid = this.status.currentUid;
      if (uid && this.appContextSetters) {
        this.setupReconciliationTimer(uid, this.appContextSetters);
      }
    }
  }

  private triggerMutationActivity() {
    this.setReconcileIntervalMode('EDITING');
    if (this.idleRevertTimeout) clearTimeout(this.idleRevertTimeout);
    this.idleRevertTimeout = setTimeout(() => {
      this.setReconcileIntervalMode('IDLE');
    }, 10 * 60 * 1000); // revert to idle after 10 mins
  }

  private listenerRetryTimers: NodeJS.Timeout[] = [];

  private setupRealtimeListeners(uid: string, setters: any) {
    this.clearListenerRetries();
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];

    this.setupCoachPlansListener(uid, setters);
    this.setupStudyStrategyListener(uid, setters);
    this.setupMetadataListener(uid, setters);
  }

  private setupCoachPlansListener(uid: string, setters: any) {
    const plansUnsub = onSnapshot(collection(db, 'users', uid, 'coachPlans'), async (snapshot) => {
      this.status.listenerStatus = 'Active';
      let changed = false;
      const currentTemplates = coachPlanRepository.getAll();
      const updatedTemplates = [...currentTemplates];

      for (const change of snapshot.docChanges()) {
        const id = change.doc.id;
        const cloudPlanMetadata = change.doc.data() as any;

        if (!cloudPlanMetadata.templateId && !cloudPlanMetadata.id) continue;

        const localPlan = currentTemplates.find(t => t.id === id);

        if (change.type === 'removed') {
          if (localPlan && localPlan.status !== 'DELETED') {
            coachPlanRepository.softDelete(id);
            changed = true;
          }
        } else {
          let blocks: any[] = [];
          try {
            const blocksSnap = await getDocs(collection(db, 'users', uid, 'coachPlans', id, 'blocks'));
            blocksSnap.forEach(d => {
              const data = d.data();
              if (data) blocks.push(data);
            });
          } catch (e) {
            console.error(`SyncService: Failed to read blocks for plan ${id}`, e);
          }

          const cloudPlan: TimelineTemplate = {
            id: id,
            name: cloudPlanMetadata.templateName || cloudPlanMetadata.name || '',
            description: cloudPlanMetadata.description || '',
            createdAt: cloudPlanMetadata.createdAt || new Date().toISOString(),
            updatedAt: cloudPlanMetadata.updatedAt || new Date().toISOString(),
            status: cloudPlanMetadata.status || 'ACTIVE',
            version: cloudPlanMetadata.version || 1,
            archived: cloudPlanMetadata.archived || false,
            isEditable: cloudPlanMetadata.isEditable !== false,
            semanticVersion: cloudPlanMetadata.semanticVersion,
            blocks
          };

          // Validate required fields before merging
          if (!cloudPlan.name) continue;
          if (!cloudPlan.version) cloudPlan.version = 1;
          if (!cloudPlan.updatedAt) cloudPlan.updatedAt = new Date().toISOString();

          const resolved = ConflictResolver.resolveTemplate(localPlan, cloudPlan);
          if (resolved.winner === 'cloud') {
            const idx = updatedTemplates.findIndex(t => t.id === id);
            if (idx >= 0) {
              updatedTemplates[idx] = resolved.data;
            } else {
              updatedTemplates.push(resolved.data);
            }
            changed = true;
          }
        }
      }

      if (changed) {
        coachPlanRepository.setTemplates(updatedTemplates);
        localStorage.setItem('cfa_timeline_templates', JSON.stringify(updatedTemplates));
        setters.setTemplates(updatedTemplates.filter(t => t.status !== 'DELETED'));
        this.status.templateCount = updatedTemplates.filter(t => t.status !== 'DELETED').length;
        this.status.repositoryCount = updatedTemplates.length;
        this.healthCheck();
        this.notify();
      }
    }, (err) => {
      console.error("SyncService: Coach plans listener error", err);
      this.status.listenerStatus = 'Failed';
      this.notify();
      this.scheduleListenerRetry(() => this.setupCoachPlansListener(uid, setters));
    });
    this.unsubs.push(plansUnsub);
  }

  private setupStudyStrategyListener(uid: string, setters: any) {
    const strategyUnsub = onSnapshot(doc(db, 'users', uid, 'studyStrategy', 'main'), (snap) => {
      this.status.listenerStatus = 'Active';
      if (snap.exists()) {
        const cloudStrategy = snap.data() as StudyStrategy;
        const localStrategy = studyStrategyRepository.get();
        const resolved = ConflictResolver.resolveStrategy(localStrategy || undefined, cloudStrategy);
        
        if (resolved.winner === 'cloud') {
          studyStrategyRepository.set(resolved.data);
          localStorage.setItem('cfa_study_strategy', JSON.stringify(resolved.data));
          setters.setStudyStrategy(resolved.data);
          this.status.strategyLoaded = true;
          this.healthCheck();
          this.notify();
        }
      }
    }, (err) => {
      console.error("SyncService: Strategy listener error", err);
      this.status.listenerStatus = 'Failed';
      this.notify();
      this.scheduleListenerRetry(() => this.setupStudyStrategyListener(uid, setters));
    });
    this.unsubs.push(strategyUnsub);
  }

  private setupMetadataListener(uid: string, setters: any) {
    const metadataUnsub = onSnapshot(doc(db, 'users', uid, 'metadata', 'main'), (snap) => {
      this.status.listenerStatus = 'Active';
      if (snap.exists()) {
        const cloudMetadata = snap.data();
        const localActiveId = coachPlanRepository.getActiveTemplateId();
        if (cloudMetadata && cloudMetadata.activeTemplateId && cloudMetadata.activeTemplateId !== localActiveId) {
          coachPlanRepository.setActiveTemplateId(cloudMetadata.activeTemplateId);
          localStorage.setItem('cfa_active_template_id', cloudMetadata.activeTemplateId);
          setters.setActiveTemplateId(cloudMetadata.activeTemplateId);
          this.status.activeTemplateId = cloudMetadata.activeTemplateId;
          this.healthCheck();
          this.notify();
        }
      }
    }, (err) => {
      console.error("SyncService: Metadata listener error", err);
      this.status.listenerStatus = 'Failed';
      this.notify();
      this.scheduleListenerRetry(() => this.setupMetadataListener(uid, setters));
    });
    this.unsubs.push(metadataUnsub);
  }

  private clearListenerRetries() {
    this.listenerRetryTimers.forEach(t => clearTimeout(t));
    this.listenerRetryTimers = [];
  }

  private scheduleListenerRetry(setupFn: () => void) {
    const timer = setTimeout(() => {
      setupFn();
    }, 3000);
    this.listenerRetryTimers.push(timer);
  }

  private networkOnlineHandler: (() => void) | null = null;
  private networkOfflineHandler: (() => void) | null = null;

  private setupNetworkListeners() {
    this.removeNetworkListeners();
    this.networkOnlineHandler = () => {
      if (this.status.firestoreStatus === 'offline' && this.status.currentUid) {
        this.status.firestoreStatus = 'connected';
        this.status.lastError = null;
        syncQueue.setNetworkStatus(true);
        this.notify();
      }
    };
    this.networkOfflineHandler = () => {
      this.status.firestoreStatus = 'offline';
      this.status.syncStatus = 'offline';
      this.notify();
    };
    window.addEventListener('online', this.networkOnlineHandler);
    window.addEventListener('offline', this.networkOfflineHandler);
  }

  private removeNetworkListeners() {
    if (this.networkOnlineHandler) {
      window.removeEventListener('online', this.networkOnlineHandler);
      this.networkOnlineHandler = null;
    }
    if (this.networkOfflineHandler) {
      window.removeEventListener('offline', this.networkOfflineHandler);
      this.networkOfflineHandler = null;
    }
  }

  private setupReconciliationTimer(uid: string, setters: any) {
    if (this.reconciliationInterval) {
      clearInterval(this.reconciliationInterval);
    }

    this.reconciliationInterval = setInterval(async () => {
      if (syncQueue.getSyncState() === 'IDLE' && navigator.onLine) {
        console.log(`SyncService: Running background reconciliation check (interval: ${this.currentReconcileIntervalMs / 1000}s)...`);
        try {
          const cloudPlans = await firestoreAdapter.getCoachPlans(uid);
          const rawCloudStrategy = await firestoreAdapter.getStudyStrategy(uid);
          const rawCloudMetadata = await firestoreAdapter.getMetadata(uid);

          const localTemplates = coachPlanRepository.getAll();
          const localStrategy = studyStrategyRepository.get();
          const localActiveId = coachPlanRepository.getActiveTemplateId();

          let changed = false;
          
          const mergedTemplatesMap: Record<string, TimelineTemplate> = {};
          const allTemplateIds = new Set([
            ...localTemplates.map(t => t.id),
            ...Object.keys(cloudPlans)
          ]);

          for (const id of allTemplateIds) {
            const cloudPlan = cloudPlans[id];
            const localPlan = localTemplates.find(t => t.id === id);

            const res = ConflictResolver.resolveTemplate(localPlan, cloudPlan);
            mergedTemplatesMap[id] = res.data;
            if (res.winner === 'cloud') {
              changed = true;
            } else if (res.winner === 'local') {
              syncQueue.enqueue('coachPlan', id, this.mapPlanForFirestore(res.data));
            }
          }

          let finalStrategy = localStrategy;
          if (rawCloudStrategy || localStrategy) {
            const res = ConflictResolver.resolveStrategy(localStrategy || undefined, rawCloudStrategy);
            finalStrategy = res.data;
            if (res.winner === 'cloud') {
              changed = true;
            } else if (res.winner === 'local') {
              syncQueue.enqueue('studyStrategy', 'main', finalStrategy);
            }
          }

          let finalActiveId = localActiveId;
          if (rawCloudMetadata && rawCloudMetadata.activeTemplateId) {
            if (rawCloudMetadata.activeTemplateId !== localActiveId) {
              finalActiveId = rawCloudMetadata.activeTemplateId;
              changed = true;
            }
          } else if (localActiveId) {
            syncQueue.enqueue('metadata', 'main', { activeTemplateId: localActiveId });
          }

          if (changed) {
            const finalTemplates = Object.values(mergedTemplatesMap);
            coachPlanRepository.setTemplates(finalTemplates);
            coachPlanRepository.setActiveTemplateId(finalActiveId);
            studyStrategyRepository.set(finalStrategy);

            localStorage.setItem('cfa_timeline_templates', JSON.stringify(finalTemplates));
            localStorage.setItem('cfa_active_template_id', finalActiveId || '');
            localStorage.setItem('cfa_study_strategy', JSON.stringify(finalStrategy));

            setters.setTemplates(finalTemplates.filter(t => t.status !== 'DELETED'));
            setters.setActiveTemplateId(finalActiveId);
            setters.setStudyStrategy(finalStrategy);

            this.healthCheck();
            this.notify();
            console.log("SyncService: Background reconciliation successfully repaired out-of-sync states.");
          } else {
            console.log("SyncService: Background reconciliation verified all repositories are fully synchronized.");
          }

          // Periodic equality verification
          this.verifyAndRepairRepositoryEquality(uid, cloudPlans);
        } catch (e) {
          console.error("SyncService: Background reconciliation failed", e);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  public exportBackup(): string {
    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      templates: coachPlanRepository.getAll(),
      activeTemplateId: coachPlanRepository.getActiveTemplateId(),
      studyStrategy: studyStrategyRepository.get(),
      aiStudyMemory: aiStudyMemoryService.getMemory(),
      localStorage: {
        cfa_study_settings: localStorage.getItem('cfa_study_settings'),
        cfa_user_profile: localStorage.getItem('cfa_user_profile'),
        cfa_note_data: localStorage.getItem('cfa_note_data'),
        cfa_study_session_history: localStorage.getItem('cfa_study_session_history'),
        cfa_planner_progress: localStorage.getItem('cfa_planner_progress')
      }
    };
    return JSON.stringify(backupData, null, 2);
  }

  public restoreBackup(backupJson: string): boolean {
    try {
      const backup = JSON.parse(backupJson);
      if (!backup || !backup.version) return false;

      // Restore repositories
      if (backup.templates) {
        coachPlanRepository.setTemplates(backup.templates);
        localStorage.setItem('cfa_timeline_templates', JSON.stringify(backup.templates));
        
        backup.templates.forEach((t: any) => {
          syncQueue.enqueue('coachPlan', t.id, this.mapPlanForFirestore(t));
        });
      }
      if (backup.activeTemplateId) {
        coachPlanRepository.setActiveTemplateId(backup.activeTemplateId);
        localStorage.setItem('cfa_active_template_id', backup.activeTemplateId);
        syncQueue.enqueue('metadata', 'main', { activeTemplateId: backup.activeTemplateId });
      }
      if (backup.studyStrategy) {
        studyStrategyRepository.set(backup.studyStrategy);
        localStorage.setItem('cfa_study_strategy', JSON.stringify(backup.studyStrategy));
        syncQueue.enqueue('studyStrategy', 'main', backup.studyStrategy);
      }
      if (backup.aiStudyMemory) {
        aiStudyMemoryService.setMemory(backup.aiStudyMemory);
        syncQueue.enqueue('aiStudyMemory' as any, 'main', backup.aiStudyMemory);
      }

      // Restore localStorage properties
      if (backup.localStorage) {
        Object.entries(backup.localStorage).forEach(([key, val]) => {
          if (val) {
            localStorage.setItem(key, val as string);
          }
        });
      }

      // Trigger React context updates
      if (this.appContextSetters) {
        const finalTemplates = coachPlanRepository.getAll();
        this.appContextSetters.setTemplates(finalTemplates.filter(t => t.status !== 'DELETED'));
        this.appContextSetters.setActiveTemplateId(coachPlanRepository.getActiveTemplateId());
        this.appContextSetters.setStudyStrategy(studyStrategyRepository.get());
        
        try {
          if (localStorage.getItem('cfa_user_profile') && (this.appContextSetters as any).setUserProfile) {
            const profile = JSON.parse(localStorage.getItem('cfa_user_profile') || '{}');
            (this.appContextSetters as any).setUserProfile(profile);
          }
          if (localStorage.getItem('cfa_study_settings') && (this.appContextSetters as any).setSettings) {
            const settings = JSON.parse(localStorage.getItem('cfa_study_settings') || '{}');
            (this.appContextSetters as any).setSettings(settings);
          }
        } catch (_) {}
      }

      this.healthCheck();
      syncQueue.process();
      return true;
    } catch (e) {
      console.error("SyncService: Restore backup failed", e);
      return false;
    }
  }

  private async probeFirestoreConnection(uid: string): Promise<{ status: 'connected' | 'offline'; error: string | null; errorType: string | null }> {
    if (!navigator.onLine) {
      return { status: 'offline', error: 'Browser network is offline', errorType: 'Network Unavailable' };
    }
    try {
      const probePromise = (async () => {
        const probeDocRef = doc(db, 'users', uid, '_probe', 'connection');
        const probePayload = { timestamp: new Date().toISOString(), probe: true };
        await setDoc(probeDocRef, probePayload);
        const probeRead = await getDoc(probeDocRef);
        if (!probeRead.exists()) {
          return { status: 'offline' as const, error: 'Write succeeded but read-back failed', errorType: 'Firestore Error' };
        }
        const readData = probeRead.data();
        if (readData?.probe !== true) {
          return { status: 'offline' as const, error: 'Read-back data mismatch', errorType: 'Firestore Error' };
        }
        await deleteDoc(probeDocRef).catch(() => {});
        console.warn(`[SyncTrace] probeFirestoreConnection: LIVE PROBE PASSED — write+read+delete OK`);
        return { status: 'connected' as const, error: null, errorType: null };
      })();

      const timeoutPromise = new Promise<{ status: 'offline'; error: string; errorType: string }>(resolve => {
        setTimeout(() => {
          resolve({ status: 'offline', error: 'Firestore connection probe timed out (2.5s)', errorType: 'Network Unavailable' });
        }, 2500);
      });

      return await Promise.race([probePromise, timeoutPromise]);
    } catch (e: any) {
      const msg = e.message || String(e);
      console.warn(`[SyncTrace] probeFirestoreConnection: FAILED — ${msg}`);
      let errorType = 'Firestore Error';
      if (msg.includes('permission-denied') || msg.includes('Permission') || msg.includes('permission')) {
        errorType = 'Permission Denied';
      } else if (msg.includes('unavailable') || msg.includes('Failed to get document') || msg.includes('network')) {
        errorType = 'Network Unavailable';
      } else if (msg.includes('initialization') || msg.includes('initialize') || msg.includes('init')) {
        errorType = 'Initialization Failure';
      }
      return { status: 'offline', error: msg, errorType };
    }
  }

  public verifyAndRepairRepositoryEquality(uid: string, cloudPlans: Record<string, any>) {
    this.status.lastChecksumVerification = new Date().toISOString();
    const localTemplates = coachPlanRepository.getAll();
    
    const cachedTemplatesStr = localStorage.getItem('cfa_timeline_templates') || '[]';
    let cachedTemplates: TimelineTemplate[] = [];
    try {
      cachedTemplates = JSON.parse(cachedTemplatesStr);
    } catch (_) {}
    
    const repoCount = localTemplates.length;
    const cacheCount = cachedTemplates.length;
    const cloudCount = Object.keys(cloudPlans).length;

    this.status.repositoryCount = repoCount;
    this.status.cacheCount = cacheCount;
    this.status.cloudCount = cloudCount;

    if (repoCount !== cacheCount || repoCount !== cloudCount) {
      console.warn(`[IntegrityValidator] Mismatch detected! Repo: ${repoCount}, Cache: ${cacheCount}, Cloud: ${cloudCount}. Initiating repair...`);
      
      let repairedTemplates = [...localTemplates];
      
      if (repoCount !== cacheCount) {
        localStorage.setItem('cfa_timeline_templates', JSON.stringify(localTemplates));
        this.status.cacheCount = repoCount;
        console.log(`[IntegrityValidator] Cache repaired matching Repository (${repoCount} templates)`);
      }
      
      if (repoCount !== cloudCount) {
        const localKeys = localTemplates.map(t => t.id);
        const cloudKeys = Object.keys(cloudPlans);
        
        localTemplates.forEach(t => {
          if (!cloudKeys.includes(t.id) && t.status !== 'DELETED') {
            console.log(`[IntegrityValidator] Template ${t.id} missing in Cloud. Enqueueing write.`);
            syncQueue.enqueue('coachPlan', t.id, this.mapPlanForFirestore(t));
          }
        });
        
        cloudKeys.forEach(id => {
          if (!localKeys.includes(id)) {
            const cloudPlanRaw = cloudPlans[id];
            const cloudPlan = MigrationService.migrate(cloudPlanRaw, 'coachPlan') as TimelineTemplate;
            if (cloudPlan && cloudPlan.id && cloudPlan.name) {
              console.log(`[IntegrityValidator] Template ${id} missing in Local. Restoring from Cloud.`);
              repairedTemplates.push(cloudPlan);
            }
          }
        });
        
        if (repairedTemplates.length !== localTemplates.length) {
          coachPlanRepository.setTemplates(repairedTemplates);
          localStorage.setItem('cfa_timeline_templates', JSON.stringify(repairedTemplates));
          if (this.appContextSetters) {
            this.appContextSetters.setTemplates(repairedTemplates.filter(t => t.status !== 'DELETED'));
          }
          this.status.repositoryCount = repairedTemplates.length;
          this.status.cacheCount = repairedTemplates.length;
        }
      }
      
      this.status.healthCheckStatus = 'Repaired';
      this.status.healthScore = 100;
      this.notify();
    } else {
      this.status.healthCheckStatus = 'Healthy';
      this.status.healthScore = 100;
      this.notify();
    }
  }
}

export const syncService = SyncService.getInstance();
export type { SyncService as SyncServiceClass };
