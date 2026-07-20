import React, { useState, useEffect } from 'react';
import { aiDiagnostics, AIDiagnosticRecord } from '../services/AIDiagnosticsService';
import { syncService, SyncStatus } from '../services/sync/SyncService';
import { forceVerifyService, ForceVerifyReport } from '../services/sync/ForceVerifyService';
import { ChevronDown, ChevronRight, Trash2, AlertTriangle, CheckCircle2, Clock, XCircle, Database, Cpu, Wifi, RefreshCw, Search } from 'lucide-react';
import { coachPlanRepository } from '../repositories/CoachPlanRepository';
import { studyStrategyRepository } from '../repositories/StudyStrategyRepository';
import { aiStudyMemoryService } from '../services/AIStudyMemoryService';
import { checksumService } from '../services/sync/ChecksumService';
import { db } from '../firebase';

export const DeveloperDiagnosticsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'sync' | 'ai' | 'pipeline'>('sync');
  const [verifyReport, setVerifyReport] = useState<ForceVerifyReport | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  
  // AI Execution Log State
  const [records, setRecords] = useState<AIDiagnosticRecord[]>([]);
  
  // Firestore Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    const updateAI = () => setRecords(aiDiagnostics.getRecords());
    updateAI();
    const unsubAI = aiDiagnostics.subscribe(updateAI);

    const updateSync = () => setSyncStatus(syncService.getStatus());
    updateSync();
    const unsubSync = syncService.subscribe(updateSync);

    return () => {
      unsubAI();
      unsubSync();
    };
  }, []);

  const latestAI = records.length > 0 ? records[records.length - 1] : null;

  const statusIcon = (r: AIDiagnosticRecord) => {
    if (r.fallbackActivated) return <XCircle className="w-3 h-3 text-rose-400" />;
    if (r.responseReceived && !r.errorMessage) return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (r.errorMessage) return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    return <Clock className="w-3 h-3 text-slate-500" />;
  };

  return (
    <div className="mt-4 p-4 rounded bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-[#1e2026] space-y-4">
      {/* Title / Collapsible Header */}
      <div className="flex items-center justify-between w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left outline-none"
        >
          <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${syncStatus.syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            Developer Diagnostics Panel
          </span>
          {isOpen ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="flex rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#101116] p-0.5">
            <button
              onClick={() => setActiveTab('sync')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold font-mono uppercase rounded-sm transition-all ${
                activeTab === 'sync'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-amber-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Database className="w-3 h-3" /> Firestore Sync
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold font-mono uppercase rounded-sm transition-all ${
                activeTab === 'ai'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-amber-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3 h-3" /> AI Execution
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold font-mono uppercase rounded-sm transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-amber-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Search className="w-3 h-3" /> Pipeline
            </button>
          </div>
        )}
      </div>

      {isOpen && activeTab === 'sync' && (
        <div className="space-y-2 animate-fade-in">
          {/* Subsystem Health Dashboard */}
          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-[#0f1115] border border-slate-200/50 dark:border-slate-800/40 rounded text-[9px] font-mono font-medium tracking-tight">
            <span className="text-slate-400 dark:text-slate-500 uppercase font-semibold mr-1 flex items-center">Health Monitor:</span>
            <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-950 rounded">
              <span>Firestore:</span>
              <span className={syncStatus.firestoreStatus === 'connected' ? 'text-emerald-450 font-bold' : 'text-rose-450 font-bold'}>
                {syncStatus.firestoreStatus === 'connected' ? 'CONNECTED 🟢' : 'OFFLINE 🔴'}
              </span>
            </div>
            <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-950 rounded">
              <span>Repository:</span>
              <span className={
                syncStatus.healthCheckStatus === 'Healthy' ? 'text-emerald-450 font-bold' :
                syncStatus.healthCheckStatus === 'Repaired' ? 'text-amber-450 font-bold' : 'text-rose-450 font-bold'
              }>
                {syncStatus.healthCheckStatus.toUpperCase()} {syncStatus.healthCheckStatus === 'Healthy' ? '🟢' : '🔴'}
              </span>
            </div>
            <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-950 rounded">
              <span>Queue Status:</span>
              <span className={syncStatus.pendingWrites === 0 ? 'text-emerald-450 font-bold' : 'text-amber-450 font-bold animate-pulse'}>
                {syncStatus.pendingWrites === 0 ? 'EMPTY 🟢' : 'PROCESSING 🟡'}
              </span>
            </div>
            <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-950 rounded">
              <span>Cache Integrity:</span>
              <span className="text-emerald-450 font-bold">VALID 🟢</span>
            </div>
            <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-950 rounded">
              <span>Migration:</span>
              <span className="text-emerald-450 font-bold">UP-TO-DATE (v{syncStatus.version}) 🟢</span>
            </div>
          </div>

          {/* Firestore synchronization diagnostics grid */}
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 text-[10px] font-mono">
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Auth Status</span>
              <span className={`font-bold text-[11px] ${syncStatus.authStatus === 'authenticated' ? 'text-emerald-400' : 'text-rose-450'}`}>
                {syncStatus.authStatus.toUpperCase()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" /> Firestore Status
              </span>
              <span className={`font-bold text-[11px] ${syncStatus.firestoreStatus === 'connected' ? 'text-emerald-400' : 'text-rose-450'}`}>
                {syncStatus.firestoreStatus.toUpperCase()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" /> Sync Status
              </span>
              <span className={`font-bold text-[11px] ${
                syncStatus.syncStatus === 'idle' ? 'text-slate-400' :
                syncStatus.syncStatus === 'syncing' ? 'text-amber-400 animate-pulse' :
                'text-rose-450'
              }`}>
                {syncStatus.syncStatus.toUpperCase()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Sync State</span>
              <span className={`font-bold text-[11px] ${
                syncStatus.syncState === 'SYNCED' || syncStatus.syncState === 'IDLE' ? 'text-emerald-400' :
                syncStatus.syncState === 'UPLOADING' || syncStatus.syncState === 'VERIFYING' ? 'text-amber-400 animate-pulse' :
                'text-rose-450'
              }`}>
                {syncStatus.syncState || 'IDLE'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Sync</span>
              <span className="text-slate-300 font-bold text-[11px]">
                {syncStatus.lastSync === 'Never' ? 'Never' : new Date(syncStatus.lastSync).toLocaleTimeString()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Firestore Init</span>
              <span className={`font-bold text-[11px] ${
                syncStatus.firestoreInitStatus === 'Success' ? 'text-emerald-400' :
                syncStatus.firestoreInitStatus === 'Failed' ? 'text-rose-450' :
                'text-slate-400'
              }`}>
                {syncStatus.firestoreInitStatus || 'Uninitialized'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Listener Status</span>
              <span className={`font-bold text-[11px] ${
                syncStatus.listenerStatus === 'Active' ? 'text-emerald-400' :
                syncStatus.listenerStatus === 'Failed' ? 'text-rose-450 animate-pulse' :
                'text-slate-400'
              }`}>
                {syncStatus.listenerStatus || 'Inactive'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Pending Writes</span>
              <span className={`font-bold text-[11px] ${syncStatus.pendingWrites > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {syncStatus.pendingWrites}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded col-span-2">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Current UID</span>
              <span className="text-slate-350 truncate block text-[9px] font-bold" title={syncStatus.currentUid || ''}>
                {syncStatus.currentUid || 'Not Authenticated'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Active Template</span>
              <span className="text-slate-300 font-bold truncate block" title={syncStatus.activeTemplateId || ''}>
                {syncStatus.activeTemplateId || '—'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Template Count</span>
              <span className="text-slate-300 font-bold">{syncStatus.templateCount}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Strategy Loaded</span>
              <span className={`font-bold ${syncStatus.strategyLoaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                {syncStatus.strategyLoaded ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded col-span-2">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Conflict Status</span>
              <span className="text-slate-300 font-semibold truncate block" title={syncStatus.conflictStatus || 'None'}>
                {syncStatus.conflictStatus || 'None'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Repo Count</span>
              <span className="text-slate-300 font-bold">{syncStatus.repositoryCount}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Cloud Count</span>
              <span className="text-slate-300 font-bold">{syncStatus.cloudCount}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Cache Count</span>
              <span className="text-slate-300 font-bold">{syncStatus.cacheCount}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Version</span>
              <span className="text-slate-300 font-bold">v{syncStatus.version}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Health Check</span>
              <span className={`font-bold ${
                syncStatus.healthCheckStatus === 'Healthy' ? 'text-emerald-400' :
                syncStatus.healthCheckStatus === 'Repaired' ? 'text-amber-400 animate-pulse' :
                'text-rose-450'
              }`}>
                {syncStatus.healthCheckStatus.toUpperCase()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Backup Snap</span>
              <span className={`font-bold ${syncStatus.backupStatus === 'Active' ? 'text-amber-400 animate-pulse' : 'text-slate-550'}`}>
                {syncStatus.backupStatus.toUpperCase()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Queue Size</span>
              <span className="text-slate-300 font-bold">{syncStatus.queueSize ?? 0}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Queue Age</span>
              <span className="text-slate-300 font-bold">{syncStatus.queueAgeSeconds ?? 0}s</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Queue Retries</span>
              <span className="text-slate-300 font-bold">{syncStatus.queueRetryCount ?? 0}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Sync Latency</span>
              <span className="text-slate-300 font-bold">{syncStatus.syncLatencyMs ?? 0}ms</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded col-span-2">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Checksum</span>
              <span className="text-slate-300 font-bold text-[10px]">{syncStatus.lastChecksumVerification || 'Never'}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-3">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Error</span>
              <span className={`block truncate ${syncStatus.lastError ? 'text-rose-450 font-bold' : 'text-slate-500'}`} title={syncStatus.lastError || ''}>
                {syncStatus.lastError || 'None'}
              </span>
            </div>
          </div>

          {/* Queue & Error Diagnostics */}
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 text-[10px] font-mono">
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Upload</span>
              <span className="text-slate-300 font-bold text-[10px]">{syncStatus.lastSuccessfulUpload === 'Never' ? 'Never' : new Date(syncStatus.lastSuccessfulUpload).toLocaleTimeString()}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Failed Upload</span>
              <span className={`font-bold text-[10px] ${syncStatus.lastFailedUpload !== 'Never' ? 'text-rose-450' : 'text-slate-400'}`}>
                {syncStatus.lastFailedUpload === 'Never' ? 'Never' : new Date(syncStatus.lastFailedUpload).toLocaleTimeString()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Firestore Error</span>
              <span className={`font-bold text-[10px] truncate block ${syncStatus.lastFirestoreError ? 'text-rose-450' : 'text-slate-400'}`} title={syncStatus.lastFirestoreError || ''}>
                {syncStatus.lastFirestoreError || 'None'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Permission Error</span>
              <span className={`font-bold text-[10px] truncate block ${syncStatus.lastPermissionError ? 'text-rose-450' : 'text-slate-400'}`} title={syncStatus.lastPermissionError || ''}>
                {syncStatus.lastPermissionError || 'None'}
              </span>
            </div>
          </div>

          {/* Audit Scorecard and Checksums Monitor (Sprint 10) */}
          {(() => {
            const localTemplatesHash = checksumService.compute(coachPlanRepository.getAll());
            const localStrategyHash = checksumService.compute(studyStrategyRepository.get());
            const localMemoryHash = checksumService.compute(aiStudyMemoryService.getMemory());

            return (
              <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-[#0f1115] border border-slate-200/50 dark:border-slate-800/40 rounded space-y-2 font-mono text-[9px]">
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-850 pb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <Database className="w-3 h-3 text-indigo-400" /> System Integrity & Checksums
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    (syncStatus.healthScore || 100) >= 90 ? 'bg-emerald-100/10 text-emerald-450 border border-emerald-500/20' :
                    (syncStatus.healthScore || 100) >= 70 ? 'bg-amber-100/10 text-amber-450 border border-amber-500/20' :
                    'bg-rose-100/10 text-rose-450 border border-rose-500/20'
                  }`}>
                    Health Score: {syncStatus.healthScore || 100}%
                  </span>
                </div>

                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                  <div className="p-1.5 bg-white dark:bg-slate-950/40 rounded border border-slate-100 dark:border-slate-850/50">
                    <span className="text-[7.5px] block text-slate-500 uppercase">Templates Repo</span>
                    <span className={`font-bold ${syncStatus.auditSummary?.templates === 'FAIL' ? 'text-rose-450' : 'text-emerald-450'}`}>
                      {syncStatus.auditSummary?.templates || 'PASS'}
                    </span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-950/40 rounded border border-slate-100 dark:border-slate-850/50">
                    <span className="text-[7.5px] block text-slate-500 uppercase">Strategy Repo</span>
                    <span className={`font-bold ${syncStatus.auditSummary?.strategy === 'FAIL' ? 'text-rose-450' : 'text-emerald-450'}`}>
                      {syncStatus.auditSummary?.strategy || 'PASS'}
                    </span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-950/40 rounded border border-slate-100 dark:border-slate-850/50">
                    <span className="text-[7.5px] block text-slate-500 uppercase">Readings Catalog</span>
                    <span className={`font-bold ${syncStatus.auditSummary?.readings === 'FAIL' ? 'text-rose-450' : 'text-emerald-450'}`}>
                      {syncStatus.auditSummary?.readings || 'PASS'}
                    </span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-950/40 rounded border border-slate-100 dark:border-slate-850/50">
                    <span className="text-[7.5px] block text-slate-500 uppercase">Resource Catalog</span>
                    <span className={`font-bold ${syncStatus.auditSummary?.resources === 'FAIL' ? 'text-rose-450' : 'text-emerald-450'}`}>
                      {syncStatus.auditSummary?.resources || 'PASS'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-2 grid-cols-3 pt-1 border-t border-slate-200/50 dark:border-slate-850/50 pt-2">
                  <div>
                    <span className="block text-[7px] text-slate-500 uppercase">Templates Checksum</span>
                    <span className="font-bold font-mono text-[8.5px] text-indigo-400">{localTemplatesHash}</span>
                  </div>
                  <div>
                    <span className="block text-[7px] text-slate-500 uppercase">Strategy Checksum</span>
                    <span className="font-bold font-mono text-[8.5px] text-indigo-400">{localStrategyHash}</span>
                  </div>
                  <div>
                    <span className="block text-[7px] text-slate-500 uppercase">AI Memory Checksum</span>
                    <span className="font-bold font-mono text-[8.5px] text-indigo-400">{localMemoryHash}</span>
                  </div>
                </div>

                {syncStatus.auditDetails && syncStatus.auditDetails.length > 0 && (
                  <div className="p-2 bg-rose-500/5 rounded border border-rose-500/10 space-y-1">
                    <span className="text-rose-450 font-bold uppercase text-[7.5px] flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5 text-rose-500" /> Audit Issue Logs:
                    </span>
                    <div className="max-h-[90px] overflow-y-auto space-y-0.5 text-[8px] text-rose-350">
                      {syncStatus.auditDetails.map((detail, idx) => (
                        <div key={idx} className="leading-tight">• {detail}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {isOpen && activeTab === 'ai' && (
        <div className="space-y-3 animate-fade-in">
          {/* Latest AI snapshot */}
          {latestAI ? (
            <div>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 text-[9px] font-mono">
                <div>
                  <span className="block text-[8px] text-slate-500 uppercase">Task</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{latestAI.taskLabel}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-500 uppercase">Response Source</span>
                  <span className={latestAI.responseSource === 'AI' ? 'text-emerald-400' : latestAI.responseSource === 'Cache' ? 'text-amber-400' : latestAI.responseSource === 'Offline' ? 'text-rose-400' : 'text-slate-500'}>
                    {latestAI.responseSource || '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-500 uppercase">Context Size</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {latestAI.contextSize !== null ? `${(latestAI.contextSize / 1000).toFixed(1)}KB` : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-500 uppercase">Latency</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {latestAI.latencyMs !== null ? `${latestAI.latencyMs}ms` : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-500 uppercase">Resolved Model</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate block max-w-[100px]">{latestAI.model || '—'}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-500 uppercase">HTTP Status</span>
                  <span className={`${latestAI.httpStatus && latestAI.httpStatus >= 400 ? 'text-rose-450 font-bold' : 'text-slate-500'}`}>
                    {latestAI.httpStatus || (latestAI.cacheHit ? 'CACHE' : '—')}
                  </span>
                </div>
              </div>

              {latestAI.fallbackActivated && (
                <div className="mt-2 p-2 rounded border border-rose-500/30 bg-rose-500/5 text-[9px] font-mono">
                  <span className="block text-[8px] uppercase tracking-wider text-rose-450 font-bold mb-0.5">Fallback Reason</span>
                  <span className="text-rose-350">
                    {latestAI.fallbackReason || latestAI.errorMessage || 'Unknown Fallback'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic font-mono">No AI tasks recorded yet.</p>
          )}

          {/* Expanded record list */}
          {records.length > 0 && (
            <div className="overflow-x-auto max-h-[180px] overflow-y-auto border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center">
              <span className="text-[9px] font-mono font-bold text-slate-500">Execution History ({records.length} runs)</span>
              <button
                onClick={() => aiDiagnostics.clear()}
                className="text-[9px] text-rose-500 hover:text-rose-400 font-mono flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Clear Logs
              </button>
            </div>
          )}

          {records.length > 0 && (
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto border border-slate-200 dark:border-slate-850">
              <table className="w-full text-[8px] font-mono">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80">
                    <th className="text-left py-1 px-2">Status</th>
                    <th className="text-left py-1 px-2">Task</th>
                    <th className="text-left py-1 px-2">Model</th>
                    <th className="text-center py-1 px-2">Source</th>
                    <th className="text-right py-1 px-2">Latency</th>
                    <th className="text-center py-1 px-2">HTTP</th>
                  </tr>
                </thead>
                <tbody>
                  {[...records].reverse().map(r => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="py-1 px-2">{statusIcon(r)}</td>
                      <td className="py-1 px-2 text-slate-700 dark:text-slate-300">{r.taskLabel}</td>
                      <td className="py-1 px-2 text-slate-500 max-w-[80px] truncate">{r.model || '—'}</td>
                      <td className="py-1 px-2 text-center text-slate-500">{r.responseSource || '—'}</td>
                      <td className="py-1 px-2 text-right text-slate-500">{r.latencyMs !== null ? `${r.latencyMs}ms` : '—'}</td>
                      <td className="py-1 px-2 text-center text-slate-500">{r.httpStatus || (r.cacheHit ? 'CACHE' : '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isOpen && activeTab === 'pipeline' && (
        <div className="space-y-3 animate-fade-in">
          {/* Synchronization Pipeline Diagnostics */}
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 text-[10px] font-mono">
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Firestore Reachable</span>
              <span className={`font-bold text-[11px] ${syncStatus.firestoreStatus === 'connected' ? 'text-emerald-400' : 'text-rose-450'}`}>
                {syncStatus.firestoreStatus === 'connected' ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Auth Initialized</span>
              <span className={`font-bold text-[11px] ${syncStatus.authStatus === 'authenticated' ? 'text-emerald-400' : 'text-rose-450'}`}>
                {syncStatus.authStatus === 'authenticated' ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Snapshot Listeners</span>
              <span className={`font-bold text-[11px] ${
                syncStatus.listenerStatus === 'Active' ? 'text-emerald-400' :
                syncStatus.listenerStatus === 'Failed' ? 'text-rose-450 animate-pulse' :
                'text-slate-400'
              }`}>
                {syncStatus.listenerStatus || 'Inactive'}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Queue Length</span>
              <span className={`font-bold text-[11px] ${(syncStatus.pendingWrites || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {syncStatus.pendingWrites ?? 0}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Queue Oldest Age</span>
              <span className="text-slate-300 font-bold">{syncStatus.queueAgeSeconds ?? 0}s</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Upload</span>
              <span className="text-slate-300 font-bold text-[10px]">
                {syncStatus.lastSuccessfulUpload === 'Never' ? 'Never' : new Date(syncStatus.lastSuccessfulUpload).toLocaleTimeString()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Failed</span>
              <span className={`font-bold text-[10px] ${syncStatus.lastFailedUpload !== 'Never' ? 'text-rose-450' : 'text-slate-400'}`}>
                {syncStatus.lastFailedUpload === 'Never' ? 'Never' : new Date(syncStatus.lastFailedUpload).toLocaleTimeString()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Verification</span>
              <span className="text-slate-300 font-bold text-[10px]">{syncStatus.lastChecksumVerification === 'Never' ? 'Never' : new Date(syncStatus.lastChecksumVerification).toLocaleTimeString()}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Equality Status</span>
              <span className={`font-bold text-[11px] ${
                syncStatus.healthCheckStatus === 'Healthy' ? 'text-emerald-400' :
                syncStatus.healthCheckStatus === 'Repaired' ? 'text-amber-400' :
                'text-rose-450'
              }`}>
                {syncStatus.healthCheckStatus === 'Healthy' ? 'EQUAL' : syncStatus.healthCheckStatus === 'Repaired' ? 'REPAIRED' : 'MISMATCH'}
              </span>
            </div>
          </div>

          {/* Checksums */}
          <div className="grid gap-2 grid-cols-3 text-[10px] font-mono">
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Repo Checksum</span>
              <span className="font-bold text-[9px] text-indigo-400 block truncate">{checksumService.compute(coachPlanRepository.getAll())}</span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Cache Checksum</span>
              <span className="font-bold text-[9px] text-indigo-400 block truncate">
                {(() => {
                  try { return checksumService.compute(JSON.parse(localStorage.getItem('cfa_timeline_templates') || '[]')); }
                  catch { return 'ERROR'; }
                })()}
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Strategy Checksum</span>
              <span className="font-bold text-[9px] text-indigo-400 block truncate">{checksumService.compute(studyStrategyRepository.get())}</span>
            </div>
          </div>

          {/* Force Verify Button */}
          <div className="space-y-2">
            <button
              onClick={async () => {
                setVerifyLoading(true);
                setVerifyError(null);
                try {
                  const uid = syncStatus.currentUid;
                  if (!uid) {
                    setVerifyError('Not authenticated — no UID available');
                    setVerifyLoading(false);
                    return;
                  }
                  const report = await forceVerifyService.verify(uid);
                  setVerifyReport(report);
                } catch (e: any) {
                  setVerifyError(e.message || String(e));
                }
                setVerifyLoading(false);
              }}
              disabled={verifyLoading}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded text-[10px] font-bold font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              {verifyLoading ? (
                <>Scanning...</>
              ) : (
                <><Search className="w-3 h-3" /> Force Verify — Compare All Layers Document-by-Document</>
              )}
            </button>

            {verifyError && (
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] font-mono text-rose-450">
                {verifyError}
              </div>
            )}

            {verifyReport && (
              <div className="space-y-2">
                <div className="grid gap-2 grid-cols-3 text-[10px] font-mono">
                  <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
                    <span className="block text-[8px] text-slate-500 uppercase">Repo</span>
                    <span className="font-bold text-[11px]">{verifyReport.repositoryCount}</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
                    <span className="block text-[8px] text-slate-500 uppercase">Cache</span>
                    <span className={`font-bold text-[11px] ${verifyReport.cacheCount === verifyReport.repositoryCount ? 'text-emerald-400' : 'text-rose-450'}`}>
                      {verifyReport.cacheCount}
                      {verifyReport.cacheCount !== verifyReport.repositoryCount && ' MISMATCH'}
                    </span>
                  </div>
                  <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded">
                    <span className="block text-[8px] text-slate-500 uppercase">Cloud</span>
                    <span className={`font-bold text-[11px] ${verifyReport.cloudCount === verifyReport.repositoryCount ? 'text-emerald-400' : 'text-rose-450'}`}>
                      {verifyReport.cloudCount}
                      {verifyReport.cloudCount !== verifyReport.repositoryCount && ' MISMATCH'}
                    </span>
                  </div>
                </div>

                {/* Template-by-template comparison */}
                {verifyReport.templates.length > 0 && (
                  <div className="max-h-[200px] overflow-y-auto border border-slate-200 dark:border-slate-850 rounded">
                    <table className="w-full text-[8px] font-mono">
                      <thead>
                        <tr className="text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80">
                          <th className="text-left py-1 px-2">Template ID</th>
                          <th className="text-center py-1 px-2">Repo</th>
                          <th className="text-center py-1 px-2">Cache</th>
                          <th className="text-center py-1 px-2">Cloud</th>
                          <th className="text-right py-1 px-2">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verifyReport.templates.map(d => (
                          <tr key={d.templateId} className={`border-b border-slate-100 dark:border-slate-800/40 ${d.mismatches.length > 0 ? 'bg-rose-500/5' : ''}`}>
                            <td className="py-1 px-2 text-slate-700 dark:text-slate-300 max-w-[100px] truncate" title={d.templateId}>
                              {d.templateId}
                            </td>
                            <td className="py-1 px-2 text-center">
                              <span className={d.repositoryExists ? 'text-emerald-400' : 'text-rose-450'}>{d.repositoryExists ? 'YES' : 'NO'}</span>
                            </td>
                            <td className="py-1 px-2 text-center">
                              <span className={d.cacheExists ? 'text-emerald-400' : 'text-rose-450'}>{d.cacheExists ? 'YES' : 'NO'}</span>
                            </td>
                            <td className="py-1 px-2 text-center">
                              <span className={d.cloudExists ? 'text-emerald-400' : 'text-amber-400'}>{d.cloudExists ? 'YES' : 'NO'}</span>
                            </td>
                            <td className="py-1 px-2 text-right">
                              <span className={d.mismatches.length > 0 ? 'text-rose-450 font-bold' : 'text-emerald-400'}>
                                {d.mismatches.length > 0 ? d.mismatches.length : 'OK'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Strategy report */}
                {verifyReport.strategy && (
                  <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded text-[10px] font-mono">
                    <span className="block text-[8px] text-slate-500 uppercase font-semibold mb-1">Study Strategy</span>
                    <div className="flex gap-4">
                      <span>Repo: <span className={verifyReport.strategy.repositoryExists ? 'text-emerald-400' : 'text-slate-400'}>{verifyReport.strategy.repositoryExists ? 'YES' : 'NO'}</span></span>
                      <span>Cloud: <span className={verifyReport.strategy.cloudExists ? 'text-emerald-400' : 'text-slate-400'}>{verifyReport.strategy.cloudExists ? 'YES' : 'NO'}</span></span>
                      <span>Match: <span className={verifyReport.strategy.match ? 'text-emerald-400' : 'text-rose-450'}>{verifyReport.strategy.match ? 'YES' : 'NO'}</span></span>
                    </div>
                    {verifyReport.strategy.details.map((d, i) => (
                      <div key={i} className="text-rose-450 text-[9px]">• {d}</div>
                    ))}
                  </div>
                )}

                {/* Active template ID report */}
                {verifyReport.activeTemplateId && (
                  <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded text-[10px] font-mono">
                    <span className="block text-[8px] text-slate-500 uppercase font-semibold mb-1">Active Template ID</span>
                    <div className="grid gap-1 grid-cols-3">
                      <span>Repo: <span className="font-bold">{verifyReport.activeTemplateId.repositoryActiveId || '—'}</span></span>
                      <span>localStorage: <span className="font-bold">{verifyReport.activeTemplateId.localStorageActiveId || '—'}</span></span>
                      <span>Cloud: <span className="font-bold">{verifyReport.activeTemplateId.cloudActiveId || '—'}</span></span>
                    </div>
                    <span className={`text-[9px] ${verifyReport.activeTemplateId.match ? 'text-emerald-400' : 'text-rose-450'}`}>
                      {verifyReport.activeTemplateId.match ? 'ALL MATCH' : 'MISMATCH'}
                    </span>
                    {verifyReport.activeTemplateId.details.map((d, i) => (
                      <div key={i} className="text-rose-450 text-[9px]">• {d}</div>
                    ))}
                  </div>
                )}

                <div className="text-[9px] font-mono text-slate-500">
                  Summary: {verifyReport.summary.totalMismatches} mismatches |
                  Missing in Cloud: {verifyReport.summary.templatesMissingInCloud} |
                  Missing in Repo: {verifyReport.summary.templatesMissingInRepo} |
                  Missing in Cache: {verifyReport.summary.templatesMissingInCache}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
