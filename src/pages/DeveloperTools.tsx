/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { eventBus } from '../services/EventBus';
import { knowledgeIndexService } from '../services/KnowledgeIndexService';
import { DomainEvent } from '../types';
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
    isDegraded
  } = useApp();

  const [capturedEvents, setCapturedEvents] = useState<DomainEvent[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<string>('N/A');
  const [activeSubTab, setActiveSubTab] = useState<'diagnostics' | 'history' | 'events'>('diagnostics');

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
            <span className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">{knowledgeSnapshot.metadata.nodeCount}</span>
          </div>
        </div>

        {/* Edges Card */}
        <div className="bg-white p-4 rounded border border-slate-200 dark:border-[#1e2026] dark:bg-[#101116] shadow-xs flex items-center space-x-3.5">
          <Cpu className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Graph Edges</span>
            <span className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">{knowledgeSnapshot.metadata.edgeCount}</span>
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
                    console.log("=== GRAPH SNAPSHOT NODES ===", knowledgeSnapshot.nodes);
                    console.log("=== GRAPH SNAPSHOT EDGES ===", knowledgeSnapshot.edges);
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
                      <span>{snap.metadata.nodeCount} N • {snap.metadata.edgeCount} E</span>
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

        </div>

      </div>

    </div>
  );
};
