import React, { useState, useEffect } from 'react';
import { aiDiagnostics, AIDiagnosticRecord } from '../services/AIDiagnosticsService';
import { syncService, SyncStatus } from '../services/SyncService';
import { ChevronDown, ChevronRight, Trash2, AlertTriangle, CheckCircle2, Clock, XCircle, Database, Cpu, Wifi, RefreshCw } from 'lucide-react';

export const DeveloperDiagnosticsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'sync' | 'ai'>('sync');
  
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
          </div>
        )}
      </div>

      {isOpen && activeTab === 'sync' && (
        <div className="space-y-2 animate-fade-in">
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
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Sync</span>
              <span className="text-slate-300 font-bold text-[11px]">
                {syncStatus.lastSync === 'Never' ? 'Never' : new Date(syncStatus.lastSync).toLocaleTimeString()}
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
            <div className="p-2 bg-white dark:bg-[#101116] border border-slate-100 dark:border-slate-850 rounded col-span-5">
              <span className="block text-[8px] text-slate-500 uppercase font-semibold">Last Error</span>
              <span className={`block truncate ${syncStatus.lastError ? 'text-rose-450 font-bold' : 'text-slate-500'}`} title={syncStatus.lastError || ''}>
                {syncStatus.lastError || 'None'}
              </span>
            </div>
          </div>
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
    </div>
  );
};
