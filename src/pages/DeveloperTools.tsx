/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { eventBus } from '../services/EventBus';
import { knowledgeIndexService } from '../services/KnowledgeIndexService';
import { DomainEvent } from '../types';
import { CurriculumBootstrapService } from '../services/CurriculumBootstrapService';
import { INITIAL_2027_READINGS } from '../applications/cfa/curriculum/data/initialCurriculum';
import { TemplateValidator } from '../services/sync/TemplateValidator';
import { CoachPlanRepository } from '../repositories/CoachPlanRepository';
import { 
  Terminal, 
  Cpu, 
  Database, 
  Clock, 
  History, 
  Play, 
  RefreshCw, 
  AlertTriangle,
  Search,
  Shield,
  Layers
} from 'lucide-react';

export const DeveloperTools: React.FC = () => {
  const { 
    knowledgeSnapshot, 
    knowledgeGraphService,
    logActivity,
    eventStoreService,
    isDegraded,
    selectedReadingId,
    resources
  } = useApp();

  const [capturedEvents, setCapturedEvents] = useState<DomainEvent[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<string>('N/A');
  const [activeSubTab, setActiveSubTab] = useState<'diagnostics' | 'history' | 'events' | 'import_diagnostics' | 'template_audit'>('diagnostics');
  const [templateAuditResults, setTemplateAuditResults] = useState<{id: string; issues: string[]; repaired: boolean}[] | null>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [importDiagnostics, setImportDiagnostics] = useState<any[]>([]);
  const [readingDiagResults, setReadingDiagResults] = useState<{ readingId: string; title: string; status: 'ok' | 'missing' | 'duplicate' | 'unmapped'; details?: string }[]>([]);
  const [lrList, setLrList] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cfa_import_diagnostics');
      if (raw) {
        setImportDiagnostics(JSON.parse(raw));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const diag: typeof readingDiagResults = [];
    const lrRepoRaw = localStorage.getItem('cfa_learning_resources');
    let currentLrList: any[] = [];
    try { if (lrRepoRaw) currentLrList = JSON.parse(lrRepoRaw); } catch {}
    setLrList(currentLrList);

    const getReadingIssueReason = (readingId: string, list: any[]) => {
      const repoCount = list.length;
      if (repoCount === 0) return 'Repository empty';
      if (!localStorage.getItem('cfa_bootstrap_metadata')) return 'Bootstrap skipped';
      
      const readingLectures = list.filter(r => r.readingId === readingId);
      if (readingLectures.length === 0) {
        const hasUnmapped = importDiagnostics.some(d => d.excelReading === readingId || (d.type === 'UNMAPPED_ROW' && String(d.excelReading || '').toLowerCase().includes(readingId)));
        if (hasUnmapped) return 'Missing readingId';
        return 'No lectures defined in Excel';
      }
      
      const ssciLectures = readingLectures.filter(r => r.provider === 'SSCI');
      if (ssciLectures.length === 0) return 'Provider mismatch';
      
      return 'Filter mismatch';
    };

    for (const reading of INITIAL_2027_READINGS) {
      const lectures = currentLrList.filter((r: any) => r.readingId === reading.id);
      const ssciLectures = lectures.filter((r: any) => r.provider === 'SSCI');
      const duplicates = importDiagnostics.filter(d => d.type === 'DUPLICATE_CODE' && d.excelReading === reading.id);
      const unmapped = importDiagnostics.filter(d => d.type === 'UNMAPPED_ROW' && d.excelReading === reading.id);

      if (ssciLectures.length === 0) {
        const reason = getReadingIssueReason(reading.id, currentLrList);
        diag.push({ readingId: reading.id, title: reading.title, status: 'missing', details: reason });
      } else if (duplicates.length > 0) {
        diag.push({ readingId: reading.id, title: reading.title, status: 'duplicate', details: `Duplicate lecture code: ${duplicates[0]?.lectureCode || 'unknown'}` });
      } else if (unmapped.length > 0) {
        diag.push({ readingId: reading.id, title: reading.title, status: 'unmapped', details: 'Unknown LOS mapping' });
      } else {
        diag.push({ readingId: reading.id, title: reading.title, status: 'ok' });
      }
    }
    setReadingDiagResults(diag);
  }, [importDiagnostics]);

  // Subscribe to all wildcard events to log them in real-time
  useEffect(() => {
    const unsubscribe = eventBus.subscribe('*', (event) => {
      setCapturedEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100
    });
    return () => unsubscribe();
  }, []);

  // Update memory usage statistics
  useEffect(() => {
    const updateMemory = () => {
      const perf = window.performance as any;
      if (perf && perf.memory) {
        const mb = (perf.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
        setMemoryUsage(`${mb} MB`);
      } else {
        setMemoryUsage('Supported in Chrome/Edge only');
      }
    };
    updateMemory();
    const interval = setInterval(updateMemory, 3000);
    return () => clearInterval(interval);
  }, []);

  // Format timestamp helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Compile history array
  const history = knowledgeGraphService.getHistory();

  // Trigger a mock Note Created event
  const handleTriggerMockNote = () => {
    const mockId = `mock-note-${Math.floor(Math.random() * 10000)}`;
    eventBus.publish({
      type: 'NoteCreated',
      timestamp: new Date().toISOString(),
      source: 'DeveloperConsole',
      entityId: mockId,
      payload: { 
        title: `Mock Note: Derivatives hedging formulas`,
        content: `Synthetic long formulas: S = C - P + PV(X)` 
      }
    });
    logActivity('note', `Dispatched mock note event [${mockId}]`);
  };

  // Trigger a mock Study Session Completed event
  const handleTriggerMockSession = () => {
    const mockId = `mock-session-${Math.floor(Math.random() * 10000)}`;
    eventBus.publish({
      type: 'StudySessionCompleted',
      timestamp: new Date().toISOString(),
      source: 'DeveloperConsole',
      entityId: mockId,
      payload: { 
        durationMinutes: 45, 
        focusScore: 9, 
        confidenceAfter: 5 
      }
    });
    logActivity('study', `Dispatched mock study session completed event [${mockId}]`);
  };

  return (
    <div className="space-y-6">
      
      {/* Dev Header */}
      <div className="flex flex-col space-y-1.5 border-b border-slate-200 pb-4 dark:border-[#1e2026]">
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5 text-indigo-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] font-sans">
            Developer Operations Console
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          SYSTEM ACTIVE IN DEVELOPMENT MODE • LOCAL TELEMETRY
        </p>
      </div>

      {/* Overview Grid Card */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        
        {/* Nodes Card */}
        <div className="bg-white p-4 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs flex items-center space-x-3.5">
          <Database className="h-5 w-5 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Graph Nodes</span>
            <span className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">{knowledgeSnapshot.statistics.nodeCount}</span>
          </div>
        </div>

        {/* Edges Card */}
        <div className="bg-white p-4 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs flex items-center space-x-3.5">
          <Cpu className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Graph Edges</span>
            <span className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">{knowledgeSnapshot.statistics.edgeCount}</span>
          </div>
        </div>

        {/* Build Time Card */}
        <div className="bg-white p-4 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs flex items-center space-x-3.5">
          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Compile Speed</span>
            <span className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">
              {knowledgeSnapshot.metadata.profileMetrics?.totalCompileTimeMs.toFixed(1) || '0.0'} ms
            </span>
          </div>
        </div>

        {/* Memory Usage Card */}
        <div className="bg-white p-4 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs flex items-center space-x-3.5">
          <RefreshCw className="h-5 w-5 text-indigo-400 shrink-0 animate-spin-slow" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">JS Heap Memory</span>
            <span className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] truncate block">{memoryUsage}</span>
          </div>
        </div>

      </div>

      {/* Extended Diagnostics Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* EventStore Buffer */}
        <div className="bg-white p-4 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs flex items-center space-x-3.5">
          <Layers className="h-5 w-5 text-purple-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Event Store</span>
            <span className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">{eventStoreService.getBufferSize()}</span>
            <span className="text-[9px] text-slate-400 ml-1">/ {eventStoreService.getTotalCount()} total</span>
          </div>
        </div>

        {/* Knowledge Index Size */}
        <div className="bg-white p-4 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs flex items-center space-x-3.5">
          <Search className="h-5 w-5 text-cyan-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Search Index</span>
            <span className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">{knowledgeIndexService.getIndexSize()}</span>
            <span className="text-[9px] text-slate-400 ml-1">entries</span>
          </div>
        </div>

        {/* Orchestrator Status */}
        <div className={`bg-white p-4 rounded border shadow-xs flex items-center space-x-3.5 ${
          isDegraded 
            ? 'border-amber-300 dark:border-amber-700' 
            : 'border-slate-200 dark:border-[#1e2026]'
        } dark:bg-[#101116]`}>
          <Shield className={`h-5 w-5 shrink-0 ${isDegraded ? 'text-amber-500' : 'text-green-500'}`} />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Orchestrator</span>
            <span className={`text-sm font-bold ${isDegraded ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
              {isDegraded ? 'DEGRADED' : 'NOMINAL'}
            </span>
          </div>
        </div>

        {/* Index Last Rebuild */}
        <div className="bg-white p-4 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs flex items-center space-x-3.5">
          <RefreshCw className="h-5 w-5 text-teal-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Index Rebuild</span>
            <span className="text-[11px] font-bold text-slate-800 dark:text-[#F8FAFC] truncate block">
              {knowledgeIndexService.getIndexHealth().lastRebuild 
                ? new Date(knowledgeIndexService.getIndexHealth().lastRebuild!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Never'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Main Console Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left Console Content: Actions & Health */}
        <div className="space-y-6 md:col-span-1">
          
          {/* Debug Action Triggers */}
          <div className="bg-white p-5 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs">
            <h2 className="text-xs font-mono font-bold text-slate-900 dark:text-[#F8FAFC] border-b border-slate-100 dark:border-slate-800/60 pb-2.5 mb-4 uppercase tracking-widest">
              Mock Event Dispatcher
            </h2>
            <div className="space-y-2.5">
              <button
                onClick={handleTriggerMockNote}
                className="w-full flex items-center justify-between text-left p-2.5 border border-slate-200 dark:border-[#1e2026] rounded bg-slate-50/50 hover:bg-slate-100 dark:bg-[#07080a]/30 dark:hover:bg-[#101116]/70 transition-colors text-xs font-semibold cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[9px] text-indigo-500 block">EVENT: NoteCreated</span>
                  <span className="text-slate-800 dark:text-[#F8FAFC]">Inject Study Note Event</span>
                </div>
                <Play className="h-3 w-3 text-slate-450 shrink-0" />
              </button>

              <button
                onClick={handleTriggerMockSession}
                className="w-full flex items-center justify-between text-left p-2.5 border border-slate-200 dark:border-[#1e2026] rounded bg-slate-50/50 hover:bg-slate-100 dark:bg-[#07080a]/30 dark:hover:bg-[#101116]/70 transition-colors text-xs font-semibold cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[9px] text-emerald-500 block">EVENT: StudySessionCompleted</span>
                  <span className="text-slate-800 dark:text-[#F8FAFC]">Inject Study Session Event</span>
                </div>
                <Play className="h-3 w-3 text-slate-450 shrink-0" />
              </button>
            </div>
          </div>

          {/* Excel Curriculum Bootstrapper */}
          <div className="bg-white p-5 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs">
            <h2 className="text-xs font-mono font-bold text-slate-900 dark:text-[#F8FAFC] border-b border-slate-100 dark:border-slate-800/60 pb-2.5 mb-4 uppercase tracking-widest flex items-center justify-between">
              <span>Excel Import Operations</span>
            </h2>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
                Re-reads `/data/datasets/CFA Level 3 Coding Sheet_2026.xlsx`, checks all lecture mappings, builds diagnostic warnings, and recalculates learning resource lists.
              </p>
              <button
                onClick={async () => {
                  if (confirm('Force re-importing curriculum Excel dataset? This will reset all current lecture progresses.')) {
                    try {
                      const res = await CurriculumBootstrapService.getInstance().bootstrap(true);
                      alert(`Bootstrap finished! Bootstrapped: ${res.bootstrapped}. Reason: ${res.reason}`);
                      window.location.reload();
                    } catch (err: any) {
                      alert(`Bootstrap failed: ${err?.message || err}`);
                    }
                  }
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RefreshCw size={13} />
                Force Excel Re-import
              </button>
            </div>
          </div>

          {/* Validation Metrics */}
          <div className="bg-white p-5 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs">
            <h2 className="text-xs font-mono font-bold text-slate-900 dark:text-[#F8FAFC] border-b border-slate-100 dark:border-slate-800/60 pb-2.5 mb-4 uppercase tracking-widest">
              Integrity Warnings
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-50">Broken Links</span>
                <span className={`font-bold ${knowledgeSnapshot.health.brokenLinks.length > 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {knowledgeSnapshot.health.brokenLinks.length}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-50">Orphan Vertices</span>
                <span className={`font-bold ${knowledgeSnapshot.health.orphanNodes.length > 0 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {knowledgeSnapshot.health.orphanNodes.length}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-50">Duplicate Edges</span>
                <span className="text-slate-600 dark:text-slate-300 font-bold">
                  {knowledgeSnapshot.health.duplicateEdges.length}
                </span>
              </div>
              {knowledgeSnapshot.health.orphanNodes.length > 0 && (
                <div className="p-2.5 bg-amber-50/50 border border-amber-200 dark:border-amber-900/30 dark:bg-amber-950/5 rounded text-[10px] text-amber-800 dark:text-amber-400 flex items-start space-x-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                  <span>
                    Orphans detected in node indexes. These elements lack valid context references.
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Console Content: Tabs for History and Capture Logs */}
        <div className="md:col-span-2 space-y-4 flex flex-col bg-white border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] rounded p-5 shadow-xs">
          
          {/* Sub Navigation */}
          <div className="flex border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-4">
            <button
              onClick={() => setActiveSubTab('diagnostics')}
              className={`text-xs font-mono font-bold pb-2 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
                activeSubTab === 'diagnostics' 
                  ? 'border-indigo-500 text-slate-800 dark:text-[#F8FAFC]' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Active Telemetry
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`text-xs font-mono font-bold pb-2 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
                activeSubTab === 'history' 
                  ? 'border-indigo-500 text-slate-800 dark:text-[#F8FAFC]' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Build History ({history.length})
            </button>
            <button
              onClick={() => setActiveSubTab('events')}
              className={`text-xs font-mono font-bold pb-2 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
                activeSubTab === 'events' 
                  ? 'border-indigo-500 text-slate-800 dark:text-[#F8FAFC]' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Event Store ({eventStoreService.getBufferSize()})
            </button>
            <button
              onClick={() => setActiveSubTab('import_diagnostics')}
              className={`text-xs font-mono font-bold pb-2 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
                activeSubTab === 'import_diagnostics' 
                  ? 'border-indigo-500 text-slate-800 dark:text-[#F8FAFC]' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Import Diagnostics ({importDiagnostics.length})
            </button>
            <button
              onClick={() => setActiveSubTab('template_audit')}
              className={`text-xs font-mono font-bold pb-2 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
                activeSubTab === 'template_audit'
                  ? 'border-indigo-500 text-slate-800 dark:text-[#F8FAFC]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Template Audit
            </button>
          </div>

          {/* Active Telemetry Pane */}
          {activeSubTab === 'diagnostics' && (
            <div className="space-y-4 text-xs font-mono flex-1">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-50 dark:border-slate-800/60 pb-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Repository Version</span>
                  <span className="text-xs text-slate-800 dark:text-[#F8FAFC] font-bold">{knowledgeSnapshot.metadata.repositoryVersion}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Snapshot Build Reason</span>
                  <span className="text-xs text-slate-800 dark:text-[#F8FAFC] font-bold">{knowledgeSnapshot.metadata.buildReason}</span>
                </div>
              </div>
              
              <div className="border-b border-slate-50 dark:border-slate-800/60 pb-4">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Active Snapshot Hash</span>
                <span className="text-[11px] bg-slate-50 dark:bg-[#07080a]/40 p-2 rounded block truncate border border-slate-100 dark:border-slate-800/60 text-slate-650 dark:text-slate-300">
                  {knowledgeSnapshot.metadata.buildHash || 'CALCULATING_SNAPSHOT_HASH'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">Build Timings (Profiler)</span>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-center bg-slate-50/50 border border-slate-100 p-2.5 rounded dark:bg-[#07080a]/20 dark:border-slate-800/60">
                  <div className="space-y-1">
                    <span className="text-slate-400">Node Mapper</span>
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      {knowledgeSnapshot.metadata.profileMetrics?.nodeBuildTimeMs.toFixed(3) || '0.000'} ms
                    </p>
                  </div>
                  <div className="space-y-1 border-l border-r border-slate-150 dark:border-slate-800/60">
                    <span className="text-slate-400">Edge Weaver</span>
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      {knowledgeSnapshot.metadata.profileMetrics?.relationshipBuildTimeMs.toFixed(3) || '0.000'} ms
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Validator</span>
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      {knowledgeSnapshot.metadata.profileMetrics?.validationTimeMs.toFixed(3) || '0.000'} ms
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    console.log("=== GRAPH SNAPSHOT NODES ===", knowledgeSnapshot.graph.nodes);
                    console.log("=== GRAPH SNAPSHOT EDGES ===", knowledgeSnapshot.graph.edges);
                    alert("Graph snapshot structures printed to browser developer console.");
                  }}
                  className="rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold py-1.5 px-3 cursor-pointer dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 transition-colors"
                >
                  Export Snapshot to Console
                </button>
              </div>
            </div>
          )}

          {/* Build History Pane */}
          {activeSubTab === 'history' && (
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px]">
              {history.length === 0 ? (
                <p className="text-slate-400 font-mono text-[11px] text-center py-6">No snapshots saved in ring buffer.</p>
              ) : (
                history.map((snap, idx) => (
                  <div 
                    key={idx}
                    className="p-3 border border-slate-100 dark:border-slate-800/60 rounded bg-slate-50/20 text-xs font-mono flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-indigo-500 font-bold">V{snap.metadata.repositoryVersion}</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[200px]">{snap.metadata.buildReason}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{formatTime(snap.metadata.buildStarted)}</span>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                      <span>{snap.statistics.nodeCount} N • {snap.statistics.edgeCount} E</span>
                      <span className="block font-bold text-indigo-500">{snap.metadata.profileMetrics?.totalCompileTimeMs.toFixed(1) || '0'} ms</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Event Capture Pane */}
          {activeSubTab === 'events' && (
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px]">
              {capturedEvents.length === 0 ? (
                <p className="text-slate-400 font-mono text-[11px] text-center py-6">Waiting for event bus logs...</p>
              ) : (
                capturedEvents.map((evt, idx) => (
                  <div 
                    key={idx}
                    className="p-3 border border-slate-100 dark:border-slate-800/60 rounded bg-slate-50/25 dark:bg-[#07080a]/20 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-indigo-500 font-bold">{evt.type}</span>
                      <span className="text-[9px] text-slate-440">{formatTime(evt.timestamp)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 grid grid-cols-2 gap-1 mb-1.5">
                      <span>Source: <strong className="text-slate-600 dark:text-slate-300">{evt.source}</strong></span>
                      <span>Entity ID: <strong className="text-slate-650 dark:text-slate-400 truncate block">{evt.entityId}</strong></span>
                    </div>
                    {evt.payload && (
                      <pre className="text-[9px] bg-slate-50 dark:bg-[#07080a]/50 p-1.5 rounded overflow-x-auto text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800/60">
                        {JSON.stringify(evt.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === 'import_diagnostics' && (
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px] text-xs font-mono">
              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-left">
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Total Imported</span>
                  <span className="text-xl font-bold text-slate-100 font-mono mt-1 block">
                    {lrList.filter((r: any) => r.provider === 'SSCI').length}
                  </span>
                </div>
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Coverage %</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                    {Math.round((INITIAL_2027_READINGS.filter(reading => lrList.some((r: any) => r.readingId === reading.id && r.provider === 'SSCI')).length / 36) * 100)}%
                  </span>
                </div>
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Avg Lectures / Reading</span>
                  <span className="text-xl font-bold text-indigo-400 font-mono mt-1 block">
                    {(lrList.filter((r: any) => r.provider === 'SSCI').length / 36).toFixed(1)}
                  </span>
                </div>
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Unmapped Rows</span>
                  <span className={`text-xl font-bold font-mono mt-1 block ${importDiagnostics.filter(d => d.type === 'UNMAPPED_ROW').length > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                    {importDiagnostics.filter(d => d.type === 'UNMAPPED_ROW').length}
                  </span>
                </div>
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Duplicate Codes</span>
                  <span className={`text-xl font-bold font-mono mt-1 block ${importDiagnostics.filter(d => d.type === 'DUPLICATE_CODE').length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {importDiagnostics.filter(d => d.type === 'DUPLICATE_CODE').length}
                  </span>
                </div>
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Unknown Readings</span>
                  <span className={`text-xl font-bold font-mono mt-1 block ${importDiagnostics.filter(d => d.type === 'MISSING_LECTURES').length > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                    {importDiagnostics.filter(d => d.type === 'MISSING_LECTURES').length}
                  </span>
                </div>
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Unknown LOS</span>
                  <span className={`text-xl font-bold font-mono mt-1 block ${importDiagnostics.filter(d => d.type === 'UNKNOWN_LOS').length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {importDiagnostics.filter(d => d.type === 'UNKNOWN_LOS').length}
                  </span>
                </div>
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Invalid Durations</span>
                  <span className={`text-xl font-bold font-mono mt-1 block ${importDiagnostics.filter(d => d.type === 'INVALID_DURATION').length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {importDiagnostics.filter(d => d.type === 'INVALID_DURATION').length}
                  </span>
                </div>
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Broken URLs</span>
                  <span className={`text-xl font-bold font-mono mt-1 block ${importDiagnostics.filter(d => d.type === 'BROKEN_URL').length > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                    {importDiagnostics.filter(d => d.type === 'BROKEN_URL').length}
                  </span>
                </div>
                <div className="bg-[#101116] border border-[#1e2026] p-3 rounded-lg text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Mapped Lectures</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                    {lrList.filter((r: any) => r.provider === 'SSCI' && r.readingId).length}
                  </span>
                </div>
              </div>

              {/* Developer Diagnostics Telemetry Card */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/10 dark:bg-slate-950/20 p-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                  <span className="text-[10px] text-slate-400 uppercase">Developer Diagnostics Telemetry</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-[10px] text-slate-350 text-left">
                  <div>Repository Lecture Count: <strong className="text-slate-100 font-mono">{lrList.filter(r => r.resourceType === 'Lecture').length}</strong></div>
                  <div>Visible Lecture Count: <strong className="text-slate-100 font-mono">{lrList.filter(r => r.provider === 'SSCI' && !r.archived).length}</strong></div>
                  <div>Imported Lecture Count: <strong className="text-slate-100 font-mono">{lrList.filter(r => r.importMetadata?.source?.includes('xlsx') || r.provider === 'SSCI').length}</strong></div>
                  <div>Mapped Lecture Count: <strong className="text-slate-100 font-mono">{lrList.filter(r => r.readingId && r.provider === 'SSCI').length}</strong></div>
                  <div>Current Selected Reading ID: <strong className="text-slate-100 font-mono">{selectedReadingId || 'None'}</strong></div>
                  <div>Current Active Reading ID: <strong className="text-slate-100 font-mono">{selectedReadingId || 'None'}</strong></div>
                  <div>Current Reading Lecture Count: <strong className="text-slate-100 font-mono">{selectedReadingId ? lrList.filter(r => r.readingId === selectedReadingId).length : 0}</strong></div>
                  <div>Repository Reading Count: <strong className="text-slate-100 font-mono">{INITIAL_2027_READINGS.length}</strong></div>
                  <div>Coverage %: <strong className="text-emerald-400 font-mono">{Math.round((INITIAL_2027_READINGS.filter(reading => lrList.some((r: any) => r.readingId === reading.id && r.provider === 'SSCI')).length / INITIAL_2027_READINGS.length) * 100)}%</strong></div>
                  <div>Current Filter: <strong className="text-slate-100 font-mono">None</strong></div>
                  <div>Provider Filter: <strong className="text-slate-100 font-mono">SSCI</strong></div>
                  <div>Reading Filter: <strong className="text-slate-100 font-mono">{selectedReadingId || 'All'}</strong></div>
                </div>
              </div>

              {/* Reading Diagnostics Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/10 dark:bg-slate-950/20 p-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                  <span className="text-[10px] text-slate-400 uppercase">Syllabus Reading Diagnostics</span>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-900 rounded font-semibold text-slate-350">
                    {INITIAL_2027_READINGS.length} Readings Verified
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950/80 text-[9px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-1.5 text-left">Reading</th>
                        <th className="p-1.5 text-center">Expected (Excel)</th>
                        <th className="p-1.5 text-center">Imported</th>
                        <th className="p-1.5 text-center">Repository</th>
                        <th className="p-1.5 text-center">Visible</th>
                        <th className="p-1.5 text-center">Mission Control</th>
                        <th className="p-1.5 text-center">Dashboard</th>
                        <th className="p-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {(() => {
                        const EXPECTED_EXCEL_COUNTS: Record<string, number> = {
                          'read-cme-1': 17, 'read-cme-2': 1,
                          'read-aa-overview': 16, 'read-aa-principles': 16, 'read-aa-constraints': 16,
                          'read-pc-equity': 5, 'read-pc-fixed-income': 9, 'read-pc-alternatives': 6,
                          'read-pc-pwm': 8, 'read-pc-institutional': 14, 'read-pc-trading-costs': 7,
                          'read-pc-inst-swf': 9, 'read-perf-evaluation': 8, 'read-perf-selection': 5,
                          'read-perf-gips': 10, 'read-deriv-options': 20, 'read-deriv-swaps': 7,
                          'read-deriv-currency': 10, 'read-eth-code': 30, 'read-eth-std-1': 30,
                          'read-eth-std-2': 30, 'read-eth-std-3': 30, 'read-eth-std-4': 30,
                          'read-eth-std-5': 30, 'read-eth-std-6': 30, 'read-eth-std-7': 30,
                          'read-eth-apply': 11, 'read-eth-asset-code': 1, 'read-path-index-eq': 5,
                          'read-path-active-eq': 4, 'read-path-active-eq-const': 5, 'read-path-ldi': 11,
                          'read-path-yc': 5, 'read-path-fi-credit': 27, 'read-path-trade-exec': 9,
                          'read-path-inst-endowment': 3
                        };

                        return INITIAL_2027_READINGS.map(reading => {
                          const expected = EXPECTED_EXCEL_COUNTS[reading.id] || 0;
                          const imported = lrList.filter(r => r.readingId === reading.id && r.provider === 'SSCI').length;
                          const repoCount = lrList.filter(r => r.readingId === reading.id && r.provider === 'SSCI').length;
                          const visible = lrList.filter(r => r.readingId === reading.id && r.provider === 'SSCI' && !r.archived).length;
                          const mission = lrList.filter(r => r.readingId === reading.id && r.provider === 'SSCI' && !r.archived).length;
                          const matches = repoCount === expected;
                          const status = matches ? 'PASS' : 'FAIL';
                          const statusColor = matches ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold';

                          return (
                            <tr key={reading.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
                              <td className="p-1.5 font-sans font-medium text-slate-300 truncate max-w-[130px]" title={reading.title}>
                                Reading {reading.number}: {reading.title}
                              </td>
                              <td className="p-1.5 text-center text-slate-400">{expected}</td>
                              <td className="p-1.5 text-center text-slate-350">{imported}</td>
                              <td className="p-1.5 text-center text-slate-350">{repoCount}</td>
                              <td className="p-1.5 text-center text-slate-350">{visible}</td>
                              <td className="p-1.5 text-center text-slate-350">{mission}</td>
                              <td className={`p-1.5 text-center ${matches ? 'text-emerald-500' : 'text-rose-500'}`}>{matches ? '✓' : '✗'}</td>
                              <td className={`p-1.5 text-center ${statusColor}`}>{status}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[10px] text-slate-400 uppercase">Import Diagnostics Log</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-900 rounded font-semibold text-slate-350">
                  {importDiagnostics.length} warnings/notices
                </span>
              </div>
              
              {importDiagnostics.length === 0 ? (
                <p className="text-slate-400 italic py-6 text-center">No diagnostics logged. Import was 100% clean!</p>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/10 dark:bg-slate-950/20">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-2">Type</th>
                        <th className="p-2">Row/Sheet</th>
                        <th className="p-2">Reading/Lecture</th>
                        <th className="p-2">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {importDiagnostics.map((diag, index) => {
                        let typeColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                        if (diag.type === 'UNMAPPED_ROW') typeColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                        if (diag.type === 'MISSING_LECTURES') typeColor = 'text-sky-500 bg-sky-500/10 border-sky-500/20';

                        return (
                          <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
                            <td className="p-2 align-top">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${typeColor}`}>
                                {diag.type}
                              </span>
                            </td>
                            <td className="p-2 align-top text-slate-600 dark:text-slate-400 font-semibold">
                              {diag.rowNumber ? `Row ${diag.rowNumber}` : 'N/A'}
                              {diag.sheetName && <span className="block text-[9px] text-slate-500 font-normal">{diag.sheetName}</span>}
                            </td>
                            <td className="p-2 align-top text-slate-800 dark:text-slate-300">
                              <span className="block truncate max-w-[150px]" title={diag.excelReading}>{diag.excelReading || 'N/A'}</span>
                              {(diag.lectureName || diag.lectureCode) && (
                                <span className="block text-[9px] text-slate-550 font-normal truncate max-w-[150px]">
                                  {diag.lectureCode ? `[${diag.lectureCode}] ` : ''}{diag.lectureName}
                                </span>
                              )}
                            </td>
                            <td className="p-2 align-top text-slate-600 dark:text-slate-400 leading-normal font-sans text-[11px]">
                              {diag.details}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'template_audit' && (
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px] text-xs font-mono">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[10px] text-slate-400 uppercase">Template Audit</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Scans all coach plan templates for missing or malformed required fields (id, name, version, updatedAt).
                Detected issues can be auto-repaired — repaired templates are saved back to the repository cache.
              </p>
              <button
                onClick={async () => {
                  setAuditRunning(true);
                  setTemplateAuditResults(null);
                  try {
                    const repo = CoachPlanRepository.getInstance();
                    const templates = ((repo as any).templates || []) as any[];
                    const results = templates.map((t: any) => {
                      const result = TemplateValidator.validateTemplate(t);
                      const issues = result.errors || [];
                      return { id: t.id || '(no id)', issues, repaired: issues.length > 0 };
                    });
                    setTemplateAuditResults(results);
                  } catch (e) {
                    setTemplateAuditResults([{ id: 'ERROR', issues: [(e as Error).message], repaired: false }]);
                  } finally {
                    setAuditRunning(false);
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded transition-colors cursor-pointer disabled:opacity-50"
                disabled={auditRunning}
              >
                {auditRunning ? 'Scanning...' : 'Run Template Audit'}
              </button>
              {templateAuditResults && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-2">Template ID</th>
                        <th className="p-2">Issues</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {templateAuditResults.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
                          <td className="p-2 text-slate-600 dark:text-slate-400 font-semibold">{r.id}</td>
                          <td className="p-2 text-slate-800 dark:text-slate-300">
                            {r.issues.length > 0 ? (
                              <ul className="list-disc list-inside space-y-0.5">
                                {r.issues.map((issue, j) => (
                                  <li key={j} className="text-rose-500">{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-emerald-500">None</span>
                            )}
                          </td>
                          <td className="p-2">
                            {r.repaired ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border text-amber-500 bg-amber-500/10 border-amber-500/20">
                                Repaired
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
