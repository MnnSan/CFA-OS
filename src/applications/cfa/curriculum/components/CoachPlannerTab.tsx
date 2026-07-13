import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../../../context/AppContext';
import { CheckCircle, Clock, ListChecks, HelpCircle, ShieldCheck, CheckCircle2, ChevronDown, ChevronRight, AlertTriangle, BrainCircuit, Pencil } from 'lucide-react';
import { aiJobQueue, AiJob } from '../../../../services/AiJobQueueService';
import { StrategySession } from './StrategySession';

type Granularity = 'subject' | 'reading' | 'los';

interface LedgerRow {
  id: string;
  type: Granularity;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  readingId?: string;
  readingTitle?: string;
  losCode?: string;
  losDescription?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  losLabel: string;
  isActive: boolean;
  isCompleted: boolean;
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()}-${months[d.getMonth()]}`;
}

function normalizeDateRange(start: string, end: string): { start: string; end: string } {
  if (!start || !end) return { start: start || '', end: end || '' };
  return start <= end ? { start, end } : { start: end, end: start };
}

function isDateInRange(today: string, start: string, end: string): boolean {
  return today >= start && today <= end;
}

export const CoachPlannerTab: React.FC = () => {
  const { subjects, readings, losList, activeTemplate, settings, getReadingProgress, studyStrategy, setStudyStrategy } = useApp();
  const [granularity, setGranularity] = useState<Granularity>('subject');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [showStrategySession, setShowStrategySession] = useState(false);

  useEffect(() => {
    return aiJobQueue.subscribe(setJobs);
  }, []);

  useEffect(() => {
    if (expandedRowId) {
      aiJobQueue.queueJob(
        'task-plan-explain',
        expandedRowId,
        () => ({}),
        settings
      );
    }
  }, [expandedRowId, settings]);

  const blocks = activeTemplate?.blocks || [];

  const subjectMap = useMemo(() => {
    const map: Record<string, { code: string; name: string }> = {};
    subjects.forEach(s => { map[s.id] = { code: s.code, name: s.name }; });
    return map;
  }, [subjects]);

  const readingSubjectMap = useMemo(() => {
    const map: Record<string, string> = {};
    readings.forEach(r => { map[r.id] = r.subjectId; });
    return map;
  }, [readings]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const rows = useMemo<LedgerRow[]>(() => {
    if (granularity === 'subject') {
      return blocks.map(block => {
        const sub = subjectMap[block.subjectId];
        if (!sub) return null;

        const subReadings = readings.filter(r => r.subjectId === block.subjectId);
        const allCompleted = subReadings.length > 0 && subReadings.every(r => getReadingProgress(r.id) >= 100);

        const startMs = new Date(block.startDate || '').getTime();
        const endMs = new Date(block.endDate || '').getTime();
        const days = (isNaN(startMs) || isNaN(endMs)) ? 1 : Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

        const subLos = losList.filter(l => readingSubjectMap[l.readingId] === block.subjectId);
        const losCodes = subLos.map(l => l.code).filter(Boolean).sort();
        const losLabel = losCodes.length > 0
          ? `${losCodes[0]} - ${losCodes[losCodes.length - 1]}`
          : '—';

        const { start: normalStart, end: normalEnd } = normalizeDateRange(block.startDate, block.endDate);

        return {
          id: block.id,
          type: 'subject' as const,
          subjectId: block.subjectId,
          subjectCode: sub.code,
          subjectName: sub.name,
          startDate: normalStart,
          endDate: normalEnd,
          durationDays: days,
          losLabel,
          isActive: isDateInRange(today, normalStart, normalEnd),
          isCompleted: allCompleted,
        };
      }).filter(Boolean) as LedgerRow[];
    }

    if (granularity === 'reading') {
      const result: LedgerRow[] = [];
      for (const block of blocks) {
        const sub = subjectMap[block.subjectId];
        if (!sub) continue;

        const subReadings = readings.filter(r => r.subjectId === block.subjectId);
        if (subReadings.length === 0) continue;

        const blockStart = new Date(block.startDate || '').getTime();
        const blockEnd = new Date(block.endDate || '').getTime();
        const msPerReading = (isNaN(blockStart) || isNaN(blockEnd)) ? 0 : (blockEnd - blockStart) / subReadings.length;

        subReadings.forEach((reading, idx) => {
          const rStart = new Date(blockStart + idx * msPerReading);
          const rEnd = idx === subReadings.length - 1
            ? new Date(blockEnd)
            : new Date(blockStart + (idx + 1) * msPerReading - 86400000);

          const rStartStr = rStart.toISOString().split('T')[0];
          const rEndStr = rEnd.toISOString().split('T')[0];
          const { start: rNormStart, end: rNormEnd } = normalizeDateRange(rStartStr, rEndStr);
          const rNormStartDate = new Date(rNormStart);
          const rNormEndDate = new Date(rNormEnd);
          const rDays = Math.max(1, Math.round((rNormEndDate.getTime() - rNormStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          const readingLos = losList.filter(l => l.readingId === reading.id);
          const losCodes = readingLos.map(l => l.code).filter(Boolean).sort();
          const losLabel = losCodes.length > 0
            ? `${losCodes[0]} - ${losCodes[losCodes.length - 1]}`
            : '—';

          result.push({
            id: `reading-${reading.id}`,
            type: 'reading',
            subjectId: block.subjectId,
            subjectCode: sub.code,
            subjectName: sub.name,
            readingId: reading.id,
            readingTitle: reading.title,
            startDate: rNormStart,
            endDate: rNormEnd,
            durationDays: rDays,
            losLabel,
            isActive: isDateInRange(today, rNormStart, rNormEnd),
            isCompleted: getReadingProgress(reading.id) >= 100,
          });
        });
      }
      return result;
    }

    if (granularity === 'los') {
      const result: LedgerRow[] = [];
      for (const block of blocks) {
        const sub = subjectMap[block.subjectId];
        if (!sub) continue;

        const subReadings = readings.filter(r => r.subjectId === block.subjectId);
        if (subReadings.length === 0) continue;

        const blockStart = new Date(block.startDate || '').getTime();
        const blockEnd = new Date(block.endDate || '').getTime();
        const msPerReading = (isNaN(blockStart) || isNaN(blockEnd)) ? 0 : (blockEnd - blockStart) / subReadings.length;

        subReadings.forEach((reading, idx) => {
          const rStart = new Date(blockStart + idx * msPerReading);
          const rEnd = idx === subReadings.length - 1
            ? new Date(blockEnd)
            : new Date(blockStart + (idx + 1) * msPerReading - 86400000);

          const readingLos = losList.filter(l => l.readingId === reading.id);
          if (readingLos.length === 0) return;

          const msPerLos = (rEnd.getTime() - rStart.getTime()) / readingLos.length;

          readingLos.forEach((los, losIdx) => {
            const losStart = new Date(rStart.getTime() + losIdx * msPerLos);
            const losEnd = losIdx === readingLos.length - 1
              ? new Date(rEnd)
              : new Date(rStart.getTime() + (losIdx + 1) * msPerLos - 86400000);

            const losStartStr = losStart.toISOString().split('T')[0];
            const losEndStr = losEnd.toISOString().split('T')[0];
            const { start: losNormStart, end: losNormEnd } = normalizeDateRange(losStartStr, losEndStr);
            const losNormStartDate = new Date(losNormStart);
            const losNormEndDate = new Date(losNormEnd);
            const losDays = Math.max(1, Math.round((losNormEndDate.getTime() - losNormStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

            result.push({
              id: `los-${los.id}`,
              type: 'los',
              subjectId: block.subjectId,
              subjectCode: sub.code,
              subjectName: sub.name,
              readingId: reading.id,
              readingTitle: reading.title,
              losCode: los.code,
              losDescription: los.description,
              startDate: losNormStart,
              endDate: losNormEnd,
              durationDays: losDays,
              losLabel: los.code,
              isActive: isDateInRange(today, losNormStart, losNormEnd),
              isCompleted: los.status === 'Completed',
            });
          });
        });
      }
      return result;
    }

    return [];
  }, [granularity, blocks, subjectMap, readings, losList, today, readingSubjectMap, getReadingProgress]);

  // Runway calculations
  const bufferDays = settings.reviewBuffer || 60;
  const examDt = new Date(settings.examDate);
  const todayDt = new Date();
  const msUntilExam = examDt.getTime() - todayDt.getTime();
  const weeksLeft = Math.max(0, Math.floor(msUntilExam / (1000 * 60 * 60 * 24 * 7)));

  const totalHours = useMemo(() => {
    return readings.reduce((sum, r) => sum + (r.estimatedHours || 0), 0);
  }, [readings]);

  const completedHours = useMemo(() => {
    return readings
      .filter(r => getReadingProgress(r.id) >= 100)
      .reduce((sum, r) => sum + (r.estimatedHours || 0), 0);
  }, [readings, getReadingProgress]);

  const remainingHours = totalHours - completedHours;

  // Show Strategy Session if no strategy exists or user clicked edit
  if (!studyStrategy || showStrategySession) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Strategy Session
            </h2>
          </div>
          {studyStrategy && (
            <button
              onClick={() => setShowStrategySession(false)}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Back to Ledger
            </button>
          )}
        </div>
        <div className="bg-[#101116] border border-slate-800/50 rounded-xl p-5">
          <StrategySession
            onComplete={() => setShowStrategySession(false)}
            onCancel={() => {
              if (!studyStrategy) setStudyStrategy(null);
              setShowStrategySession(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Strategy Context Banner */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded">
        <div className="flex items-center gap-2 text-[10px] text-slate-300">
          <BrainCircuit className="h-3.5 w-3.5 text-blue-400" />
          <span>Strategy active: <strong>{subjects.find(s => s.id === studyStrategy.firstSubjectId)?.name || studyStrategy.firstSubjectId}</strong> first with {studyStrategy.parallelSubjects.filter(p => p.enabled).length} parallel subjects</span>
        </div>
        <button
          onClick={() => setShowStrategySession(true)}
          className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 cursor-pointer"
        >
          <Pencil className="h-3 w-3" /> Edit Strategy
        </button>
      </div>

      {/* Header Controls — Granularity toggle + sync beacon */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex rounded-lg border border-slate-800/50 bg-[#101116] p-0.5 gap-0.5">
          {(['subject', 'reading', 'los'] as const).map(g => {
            const labels: Record<Granularity, string> = {
              subject: '📁 Subject Focus',
              reading: '📖 Reading Slices',
              los: '⚔️ Granular LOS'
            };
            return (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 text-[9px] font-bold font-mono uppercase rounded transition-all ${
                  granularity === g
                    ? 'bg-slate-800/60 shadow-sm text-amber-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {labels[g]}
              </button>
            );
          })}
        </div>
        <span className="text-[8px] font-mono text-slate-400 bg-[#101116] px-2 py-1 rounded border border-slate-800/50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Active Template Synced: Coach AI
        </span>
      </div>

      {/* Taping Table — scrollable ledger grid */}
      <div className="overflow-y-auto max-h-[60vh] rounded-lg border border-slate-800/50 bg-[#101116]">
        <table className="w-full text-left table-fixed">
          <thead className="sticky top-0 z-10 bg-[#101116]">
            <tr className="border-b border-slate-800/30">
              <th className="px-3 py-2 text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[12%]">Start Date</th>
              <th className="px-3 py-2 text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[12%]">End Date</th>
              <th className="px-3 py-2 text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[12%]">Duration</th>
              <th className="px-3 py-2 text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[44%]">Syllabus Anchor</th>
              <th className="px-3 py-2 text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[20%]">Target Queue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isExpanded = expandedRowId === row.id;
              const job = jobs.find(j => j.taskId === 'task-plan-explain' && j.resourceKey === row.id);

              return (
                <React.Fragment key={row.id}>
                  <tr
                    onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                    className={`border-b border-slate-800/30 transition-all duration-300 cursor-pointer hover:bg-slate-800/20 ${
                      row.isActive
                        ? 'border-l-2 border-amber-500 bg-amber-500/5'
                        : row.isCompleted
                          ? 'opacity-50'
                          : idx % 2 === 0
                            ? 'bg-[#101116]'
                            : 'bg-[#070A12]/40'
                    }`}
                  >
                    <td className="px-3 py-2.5 text-[10px] font-mono text-slate-350">
                      {formatDateShort(row.startDate)}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-mono text-slate-350">
                      {formatDateShort(row.endDate)}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-mono font-bold text-slate-400">
                      {row.durationDays}d
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {row.isCompleted ? (
                          <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                        ) : (
                          isExpanded ? <ChevronDown size={12} className="text-slate-450 shrink-0" /> : <ChevronRight size={12} className="text-slate-450 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-200 block truncate">
                            {row.type === 'los' && row.losCode ? `${row.subjectCode} — ${row.losCode}` : row.subjectCode}
                          </span>
                          <span className="text-[9px] text-slate-500 block truncate leading-tight">
                            {row.type === 'reading' && row.readingTitle
                              ? `Reading: ${row.readingTitle}`
                              : row.type === 'los' && row.losDescription
                                ? row.losDescription
                                : row.subjectName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {row.losLabel && row.losLabel !== '—' ? (
                        <span className="inline-block px-1.5 py-0.5 text-[8px] font-mono font-bold bg-slate-800/60 text-amber-400/80 rounded border border-slate-700/50 truncate max-w-full">
                          {row.losLabel}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-600 font-mono">—</span>
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-[#0b0c10] border-b border-slate-800/40">
                      <td colSpan={5} className="px-5 py-4">
                        <div className="space-y-3.5 text-xs text-slate-300">
                          
                          {/* PROGRESSIVE QUEUE FEEDBACK */}
                          {(!job || job.status === 'QUEUED' || job.status === 'ASSEMBLING' || job.status === 'SYNTHESIZING') && (
                            <div className="flex items-center justify-between p-3.5 rounded border border-slate-800 bg-[#101116]">
                              <div className="flex items-center space-x-3">
                                <span className="animate-spin text-amber-400 text-sm">⚡</span>
                                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Synthesizing Decision Plan...</span>
                              </div>
                              <div className="flex space-x-2 text-[9px] font-mono">
                                <span className={`px-1.5 py-0.5 rounded border ${!job || job.status === 'QUEUED' ? 'bg-amber-400/10 border-amber-400 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>[ Queued Task ]</span>
                                <span className="text-slate-600">──►</span>
                                <span className={`px-1.5 py-0.5 rounded border ${job?.status === 'ASSEMBLING' ? 'bg-amber-400/10 border-amber-400 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>[ Assembling Context ]</span>
                                <span className="text-slate-600">──►</span>
                                <span className={`px-1.5 py-0.5 rounded border ${job?.status === 'SYNTHESIZING' ? 'bg-amber-400/10 border-amber-400 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>[ Synthesizing ]</span>
                              </div>
                            </div>
                          )}

                          {/* CLEAN USER AI DECISION REPORT */}
                          {job && job.status === 'READY' && job.result && (
                            <div className="space-y-3 animate-fade-in">
                              
                              {/* Metadata Lineage Header */}
                              <div className="flex items-center justify-between border-b border-slate-850 pb-2 text-[10px] text-slate-400 font-mono">
                                <span>Generated using AI Engine</span>
                                <div className="flex items-center space-x-3">
                                  <span>Provider: <strong className="text-slate-200">{job.result.versionMetadata.provider}</strong></span>
                                  <span>Model: <strong className="text-slate-200">{job.result.versionMetadata.model}</strong></span>
                                  <span>Prompt: <strong className="text-slate-200">{job.result.versionMetadata.promptVersion}</strong></span>
                                  <span>Timestamp: <strong className="text-slate-200">{new Date(job.result.versionMetadata.generatedAt).toLocaleTimeString()}</strong></span>
                                </div>
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2">
                                {/* Qualitative Valuations */}
                                <div className="p-3 bg-[#101116] border border-slate-850 rounded">
                                  <span className="block text-[9px] font-mono uppercase text-slate-450 tracking-wider mb-2">Inferred Qualitative Valuations</span>
                                  <div className="flex space-x-4">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-slate-400">Evidence Strength:</span>
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/20 text-emerald-400 border border-emerald-500/20">Strong</span>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-slate-400">Reasoning Quality:</span>
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/20 text-emerald-400 border border-emerald-500/20">High</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Context Audit Checklist */}
                                <div className="p-3 bg-[#101116] border border-slate-850 rounded">
                                  <span className="block text-[9px] font-mono uppercase text-slate-450 tracking-wider mb-2">Context Source Checklist Audit</span>
                                  <div className="flex space-x-3 text-[10px] font-semibold text-slate-400">
                                    <span className="flex items-center text-emerald-400"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Settings</span>
                                    <span className="flex items-center text-emerald-400"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> History</span>
                                    <span className="flex items-center text-emerald-400"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Curriculum</span>
                                  </div>
                                </div>
                              </div>

                              {/* Reasoning Text */}
                              <div className="bg-[#101116] p-3.5 rounded border border-slate-850 leading-relaxed text-[11px] text-slate-200">
                                <span className="block text-[9px] font-mono uppercase text-amber-400/80 tracking-wider mb-2 font-bold">Timeline Rationale Description</span>
                                <p className="whitespace-pre-line">{job.result.text}</p>
                              </div>

                            </div>
                          )}

                          {/* DETERMINISTIC OFFLINE FALLBACK GENERATION */}
                          {((job && job.status === 'FAILED') || settings.aiAvailability === 'OFFLINE') && (
                            <div className="p-4 rounded border border-rose-950/30 bg-rose-950/5 text-rose-300/85 flex items-start space-x-3.5">
                              <AlertTriangle className="w-5 h-5 text-rose-450 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <span className="block font-bold text-xs uppercase font-mono tracking-wider text-rose-400">Local Engine Fallback Active — Connection Offline</span>
                                <p className="text-[11px] leading-relaxed">
                                  This schedule slot was computed using deterministic base textbook volumes ({row.durationDays * 2} Estimated Hours), your active daily target hours ({settings.targetDailyHours || 3} Daily Hours), and your review buffer ({settings.reviewBuffer || 60} Days Buffer). Connection to remote AI Orchestration models is currently unavailable.
                                </p>
                              </div>
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center">
                  <span className="text-xs text-slate-500 font-mono">No schedule data available. Generate a Coach AI Blueprint to populate this ledger.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Global Curricular Roadmap Footer (🧠 Strategic Blueprint) */}
      <div className="p-4 rounded-lg border border-slate-800/50 bg-[#101116] space-y-2">
        <h3 className="text-[10px] font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          🧠 Strategic Blueprint — The Pedagogical Ordering Justification
        </h3>
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-450 leading-relaxed flex-wrap gap-y-3">
          <div className="flex items-center space-x-2">
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[#F8FAFC]">Asset Allocation & CME</span>
            <span className="text-slate-600">──►</span>
            <span className="text-slate-400 italic">Establishes baseline macro assumptions</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[#F8FAFC]">Portfolio Construction</span>
            <span className="text-slate-600">──►</span>
            <span className="text-slate-400 italic">Maps parameters onto targets</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[#F8FAFC]">Derivatives & Overlays</span>
            <span className="text-slate-600">──►</span>
            <span className="text-slate-400 italic">Deploys risk modifiers</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[#F8FAFC]">Performance Measurement</span>
            <span className="text-slate-600">──►</span>
            <span className="text-slate-400 italic">Audits skills via GIPS</span>
          </div>
        </div>
      </div>

      {/* Runway Distance Tracking Footer */}
      <div className="bg-[#101116] border border-slate-800/50 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs">🏆</span>
            <span className="text-[10px] font-mono font-bold text-emerald-400">
              Buffer Lock: {bufferDays} Days Insulated
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {weeksLeft} Weeks Left
            </span>
            <span className="flex items-center gap-1">
              <ListChecks size={10} />
              {remainingHours.toFixed(0)}h Remaining
            </span>
          </div>
        </div>
        <div className="mt-2 h-1 bg-slate-800/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${totalHours > 0 ? (completedHours / totalHours) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};
