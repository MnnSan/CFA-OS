import React, { useState, useEffect } from 'react';
import { aiDiagnostics, AIDiagnosticRecord } from '../services/AIDiagnosticsService';
import { ChevronDown, ChevronRight, Trash2, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';

export const DeveloperDiagnosticsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<AIDiagnosticRecord[]>([]);

  useEffect(() => {
    const update = () => setRecords(aiDiagnostics.getRecords());
    update();
    return aiDiagnostics.subscribe(update);
  }, []);

  const latest = records.length > 0 ? records[records.length - 1] : null;

  const statusIcon = (r: AIDiagnosticRecord) => {
    if (r.fallbackActivated) return <XCircle className="w-3 h-3 text-rose-400" />;
    if (r.responseReceived && !r.errorMessage) return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (r.errorMessage) return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    return <Clock className="w-3 h-3 text-slate-500" />;
  };

  return (
    <div className="mt-4 p-4 rounded bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-[#1e2026] space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Developer Diagnostics — AI Execution Log
          {latest && (
            <span className="text-[8px] text-slate-400 font-normal normal-case">
              (latest: {latest.taskLabel})
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); aiDiagnostics.clear(); }}
            className="text-[9px] text-rose-500 hover:text-rose-450 font-mono flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
          {isOpen ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
        </div>
      </button>

      {/* Latest snapshot */}
      {latest && (
        <div>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 text-[9px] font-mono">
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Task</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">{latest.taskLabel}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Response Source</span>
              <span className={latest.responseSource === 'AI' ? 'text-emerald-400' : latest.responseSource === 'Cache' ? 'text-amber-400' : latest.responseSource === 'Offline' ? 'text-rose-400' : 'text-slate-500'}>
                {latest.responseSource || '—'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Job ID</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono text-[8px] truncate block max-w-[120px]" title={latest.jobId || ''}>{latest.jobId || '—'}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Context Size</span>
              <span className="text-slate-700 dark:text-slate-300">
                {latest.contextSize !== null ? `${(latest.contextSize / 1000).toFixed(1)}KB` : '—'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Context Version</span>
              <span className="text-slate-700 dark:text-slate-300">{latest.contextVersion || '—'}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Prompt Version</span>
              <span className="text-slate-700 dark:text-slate-300">{latest.promptVersion || '—'}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Requested Task ID</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono text-[8px]">{latest.taskId}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Task Found</span>
              <span className={latest.taskFound ? 'text-emerald-400' : 'text-rose-400'}>
                {latest.taskFound ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Prompt Found</span>
              <span className={latest.promptFound ? 'text-emerald-400' : 'text-rose-400'}>
                {latest.promptFound ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Context Built</span>
              <span className={latest.contextBuilt ? 'text-emerald-400' : 'text-slate-500'}>
                {latest.contextBuilt ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Stored API Key</span>
              <span className={latest.apiKeyStored ? 'text-emerald-400' : 'text-rose-400'}>
                {latest.apiKeyStored ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Execution API Key</span>
              <span className={latest.apiKeyExecution ? 'text-emerald-400' : 'text-rose-400'}>
                {latest.apiKeyExecution ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Resolved Provider</span>
              <span className="text-slate-700 dark:text-slate-300">{latest.provider || '—'}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Resolved Model</span>
              <span className="text-slate-700 dark:text-slate-300">{latest.model || '—'}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Provider Instance</span>
              <span className={latest.providerResolved ? 'text-emerald-400' : 'text-rose-400'}>
                {latest.providerResolved ? 'Created' : 'Failed'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">HTTP Status</span>
              <span className={`${latest.httpStatus && latest.httpStatus >= 400 ? 'text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {latest.httpStatus || (latest.cacheHit ? 'CACHE' : '—')}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Tokens (in/out)</span>
              <span className="text-slate-700 dark:text-slate-300">
                {latest.inputTokens !== null ? `${latest.inputTokens} / ${latest.outputTokens}` : '—'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Latency</span>
              <span className="text-slate-700 dark:text-slate-300">
                {latest.latencyMs !== null ? `${latest.latencyMs}ms` : '—'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Cache Hit</span>
              <span className={latest.cacheHit ? 'text-amber-400' : 'text-slate-500'}>
                {latest.cacheHit ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Cache Key</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono text-[8px] truncate block max-w-[120px]" title={latest.cacheKey || ''}>{latest.cacheKey || '—'}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Fallback</span>
              <span className={latest.fallbackActivated ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {latest.fallbackActivated ? 'YES' : 'No'}
              </span>
            </div>
          </div>

          {/* Fallback reason — prominent when active */}
          {latest.fallbackActivated && (
            <div className="mt-2 p-2 rounded border border-rose-500/30 bg-rose-500/5 text-[9px] font-mono">
              <span className="block text-[8px] uppercase tracking-wider text-rose-400 font-bold mb-0.5">Fallback Reason</span>
              <span className="text-rose-300">
                {latest.fallbackReason || latest.errorMessage || 'Unknown — fallback was triggered but no reason was recorded'}
                {latest.errorMessage && latest.fallbackReason !== latest.errorMessage ? `: ${latest.errorMessage}` : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {!latest && (
        <p className="text-[10px] text-slate-500 italic font-mono">No AI tasks recorded yet. Trigger a Coach Insight, Prepare Me, or any AI-powered action to populate diagnostics.</p>
      )}

      {/* Expanded record table */}
      {isOpen && records.length > 0 && (
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto border-t border-slate-200 dark:border-slate-800 pt-2">
          <table className="w-full text-[8px] font-mono">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="text-left py-1 pr-2"></th>
                <th className="text-left py-1 pr-2">Task</th>
                <th className="text-left py-1 pr-2">Prov</th>
                <th className="text-left py-1 pr-2">Model</th>
                <th className="text-center py-1 pr-2">Src</th>
                <th className="text-center py-1 pr-2">PVer</th>
                <th className="text-center py-1 pr-2">CVer</th>
                <th className="text-center py-1 pr-2">Task</th>
                <th className="text-center py-1 pr-2">P</th>
                <th className="text-center py-1 pr-2">Ctx</th>
                <th className="text-center py-1 pr-2">Stor</th>
                <th className="text-center py-1 pr-2">Exec</th>
                <th className="text-center py-1 pr-2">Prov</th>
                <th className="text-center py-1 pr-2">Sent</th>
                <th className="text-center py-1 pr-2">Resp</th>
                <th className="text-center py-1 pr-2">HTTP</th>
                <th className="text-left py-1 pr-2">Error / Fallback</th>
                <th className="text-right py-1 pr-2">In</th>
                <th className="text-right py-1 pr-2">Out</th>
                <th className="text-right py-1 pr-2">Lat</th>
                <th className="text-center py-1 pr-2">Cache</th>
              </tr>
            </thead>
            <tbody>
              {[...records].reverse().map(r => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                  <td className="py-1 pr-2">{statusIcon(r)}</td>
                  <td className="py-1 pr-2 text-slate-700 dark:text-slate-300" title={r.resourceKey}>{r.taskLabel}</td>
                  <td className="py-1 pr-2 text-slate-500">{r.provider || '—'}</td>
                  <td className="py-1 pr-2 text-slate-500 max-w-[70px] truncate" title={r.model || ''}>{r.model || '—'}</td>
                  <td className={`py-1 pr-2 text-center ${r.responseSource === 'AI' ? 'text-emerald-400' : r.responseSource === 'Cache' ? 'text-amber-400' : r.responseSource === 'Offline' ? 'text-rose-400' : 'text-slate-500'}`}>
                    {r.responseSource === 'AI' ? 'AI' : r.responseSource === 'Cache' ? 'C' : r.responseSource === 'Offline' ? 'Off' : '—'}
                  </td>
                  <td className="py-1 pr-2 text-center text-slate-500" title={r.promptVersion || ''}>{r.promptVersion ? r.promptVersion.substring(0, 4) : '—'}</td>
                  <td className="py-1 pr-2 text-center text-slate-500" title={r.contextVersion || ''}>{r.contextVersion || '—'}</td>
                  <td className={`py-1 pr-2 text-center ${r.taskFound ? 'text-emerald-400' : 'text-rose-400'}`}>{r.taskFound ? 'Y' : 'N'}</td>
                  <td className={`py-1 pr-2 text-center ${r.promptFound ? 'text-emerald-400' : 'text-rose-400'}`}>{r.promptFound ? 'Y' : 'N'}</td>
                  <td className={`py-1 pr-2 text-center ${r.contextBuilt ? 'text-emerald-400' : 'text-slate-500'}`}>{r.contextBuilt ? 'Y' : 'N'}</td>
                  <td className={`py-1 pr-2 text-center ${r.apiKeyStored ? 'text-emerald-400' : 'text-rose-400'}`}>{r.apiKeyStored ? 'Y' : 'N'}</td>
                  <td className={`py-1 pr-2 text-center ${r.apiKeyExecution ? 'text-emerald-400' : 'text-rose-400'}`}>{r.apiKeyExecution ? 'Y' : 'N'}</td>
                  <td className={`py-1 pr-2 text-center ${r.providerResolved ? 'text-emerald-400' : 'text-rose-400'}`}>{r.providerResolved ? 'Y' : 'N'}</td>
                  <td className={`py-1 pr-2 text-center ${r.requestSent ? 'text-emerald-400' : 'text-slate-500'}`}>{r.requestSent ? 'Y' : 'N'}</td>
                  <td className={`py-1 pr-2 text-center ${r.responseReceived ? 'text-emerald-400' : 'text-slate-500'}`}>{r.responseReceived ? 'Y' : 'N'}</td>
                  <td className={`py-1 pr-2 text-center ${r.httpStatus && r.httpStatus >= 400 ? 'text-rose-400' : 'text-slate-500'}`}>{r.httpStatus || (r.cacheHit ? 'CACHE' : '—')}</td>
                  <td className="py-1 pr-2 text-rose-400 max-w-[100px] truncate" title={`${r.fallbackReason || ''}${r.errorMessage ? ': ' + r.errorMessage : ''}`}>
                    {r.fallbackActivated ? (r.fallbackReason || r.errorMessage || 'FALLBACK') : '—'}
                  </td>
                  <td className="py-1 pr-2 text-right text-slate-500">{r.inputTokens !== null ? r.inputTokens : '—'}</td>
                  <td className="py-1 pr-2 text-right text-slate-500">{r.outputTokens !== null ? r.outputTokens : '—'}</td>
                  <td className="py-1 pr-2 text-right text-slate-500">{r.latencyMs !== null ? `${r.latencyMs}ms` : '—'}</td>
                  <td className={`py-1 pr-2 text-center ${r.cacheHit ? 'text-amber-400' : 'text-slate-500'}`}>{r.cacheHit ? 'Y' : 'N'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
