import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../../../context/AppContext';
import {
  StudyStrategy,
  ParallelSubjectConfig,
  TimeAllocation,
  AIStrategySuggestion,
  TimelineBlock,
} from '../../../../types';
import { calculatePlan, detectCurrentProgress } from '../../../../services/StrategyEngine';
import { getStrategySuggestions, queueStrategyAnalysis } from '../../../../services/StrategyAIAnalyzer';
import {
  Target,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  BrainCircuit,
  Loader2,
  Calendar,
  BookOpen,
  Layers,
  ArrowRight,
  Sparkles,
  X,
  Clock,
} from 'lucide-react';

type Step = 1 | 2 | 3;

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export const StrategySession: React.FC<Props> = ({ onComplete, onCancel }) => {
  const {
    subjects,
    readings,
    losList,
    settings,
    recalculateFromStrategy,
  } = useApp();

  const [step, setStep] = useState<Step>(1);
  const [strategy, setStrategy] = useState<StudyStrategy>(() => {
    const detected = detectCurrentProgress(subjects, readings, losList);
    return {
      id: 'strategy-default',
      name: 'My Study Strategy',
      firstSubjectId: detected.subjectId || '',
      firstReadingId: detected.readingId || '',
      parallelSubjects: subjects
        .filter(s => s.id !== detected.subjectId && s.enabled !== false)
        .map(s => ({
          subjectId: s.id,
          enabled: false,
          offsetType: 'relative' as const,
          relativeOffsetDays: 14,
          estimatedDays: undefined,
        })),
      timeAllocations: [],
      autoBalanceRemaining: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [calculatedBlocks, setCalculatedBlocks] = useState<TimelineBlock[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<AIStrategySuggestion[]>([]);
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const detected = useMemo(() => detectCurrentProgress(subjects, readings, losList), [subjects, readings, losList]);

  const readingsForSubject = useMemo(() => {
    return readings.filter(r => r.subjectId === strategy.firstSubjectId && r.enabled !== false)
      .sort((a, b) => a.number - b.number);
  }, [readings, strategy.firstSubjectId]);

  const subjectsWithReadings = useMemo(() => {
    return subjects.filter(s => s.enabled !== false).map(s => ({
      ...s,
      readingCount: readings.filter(r => r.subjectId === s.id && r.enabled !== false).length,
    }));
  }, [subjects, readings]);

  const handleFirstSubjectChange = (subjectId: string) => {
    setStrategy(prev => ({
      ...prev,
      firstSubjectId: subjectId,
      firstReadingId: undefined,
      parallelSubjects: prev.parallelSubjects.map(p => ({
        ...p,
        enabled: p.subjectId === subjectId ? false : p.enabled,
      })),
    }));
  };

  const handleParallelToggle = (subjectId: string, enabled: boolean) => {
    setStrategy(prev => ({
      ...prev,
      parallelSubjects: prev.parallelSubjects.map(p =>
        p.subjectId === subjectId ? { ...p, enabled } : p
      ),
    }));
  };

  const handleParallelChange = (subjectId: string, updates: Partial<ParallelSubjectConfig>) => {
    setStrategy(prev => ({
      ...prev,
      parallelSubjects: prev.parallelSubjects.map(p =>
        p.subjectId === subjectId ? { ...p, ...updates } : p
      ),
    }));
  };

  const handleTimeAllocation = (subjectId: string, days: number) => {
    setStrategy(prev => ({
      ...prev,
      timeAllocations: [
        ...prev.timeAllocations.filter(t => t.subjectId !== subjectId),
        { subjectId, days },
      ],
    }));
  };

  const getTimeAllocation = (subjectId: string): number | undefined => {
    return strategy.timeAllocations.find(t => t.subjectId === subjectId)?.days;
  };

  const getEstimatedDays = (subjectId: string): number | undefined => {
    const parallel = strategy.parallelSubjects.find(p => p.subjectId === subjectId);
    return parallel?.estimatedDays ?? getTimeAllocation(subjectId);
  };

  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    try {
      const result = calculatePlan({
        strategy,
        subjects,
        readings,
        losList,
        startDate: settings.targetStartDate || settings.examDate,
        examDate: settings.examDate,
        bufferDays: settings.reviewBuffer || 30,
      });
      setCalculatedBlocks(result.blocks);
      setWarnings(result.warnings);

      const suggs = getStrategySuggestions(strategy, result.blocks, subjects, readings, losList);
      setSuggestions(suggs);

      setStep(2);

      setAiLoading(true);
      const jobKey = queueStrategyAnalysis(
        strategy,
        result.blocks,
        subjects,
        readings,
        settings,
        (text) => {
          setAiReasoning(text);
          setAiLoading(false);
        }
      );
      if (!jobKey) {
        setTimeout(() => setAiLoading(false), 1000);
      }
    } catch (err: any) {
      setWarnings(prev => [...prev, `Calculation error: ${err.message}`]);
    }
    setIsCalculating(false);
  }, [strategy, subjects, readings, losList, settings]);

  const handleToggleSuggestion = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, applied: !s.applied } : s));
  };

  const handleApplySelected = () => {
    const applied = suggestions.filter(s => s.applied);
    let updated = { ...strategy };
    for (const sug of applied) {
      updated = sug.action(updated);
    }
    setStrategy(updated);
    setSuggestions(prev => prev.map(s => s.applied ? { ...s, applied: false } : s));

    const result = calculatePlan({
      strategy: updated,
      subjects,
      readings,
      losList,
      startDate: settings.targetStartDate || settings.examDate,
      examDate: settings.examDate,
      bufferDays: settings.reviewBuffer || 30,
    });
    setCalculatedBlocks(result.blocks);
    setWarnings(result.warnings);
  };

  const handleAccept = () => {
    recalculateFromStrategy(strategy, calculatedBlocks);
    onComplete();
  };

  const renderProgressSteps = () => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 ${step === s ? 'text-white' : step > s ? 'text-emerald-400' : 'text-slate-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
              step === s ? 'border-white bg-white/10' :
              step > s ? 'border-emerald-400 bg-emerald-400/20' :
              'border-slate-600'
            }`}>
              {step > s ? <CheckCircle className="h-3.5 w-3.5" /> : s}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider hidden sm:inline">
              {s === 1 ? 'Strategy' : s === 2 ? 'Review' : 'Confirm'}
            </span>
          </div>
          {s < 3 && <div className={`h-px w-8 ${step > s ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      {detected.subjectId && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Detected progress: You're on <strong>{subjects.find(s => s.id === detected.subjectId)?.name}</strong>
            {detected.readingId && <> → <strong>{readings.find(r => r.id === detected.readingId)?.title}</strong></>}
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            First Subject to Study
          </label>
          <select
            value={strategy.firstSubjectId}
            onChange={e => handleFirstSubjectChange(e.target.value)}
            className="w-full bg-[#101116] border border-slate-700/50 px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-500"
          >
            <option value="">Select subject...</option>
            {subjectsWithReadings.filter(s => s.readingCount > 0).map(s => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Starting Reading (optional)
          </label>
          <select
            value={strategy.firstReadingId || ''}
            onChange={e => setStrategy(prev => ({ ...prev, firstReadingId: e.target.value || undefined }))}
            className="w-full bg-[#101116] border border-slate-700/50 px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-500"
            disabled={!strategy.firstSubjectId}
          >
            <option value="">Auto-detect from progress...</option>
            {readingsForSubject.map(r => (
              <option key={r.id} value={r.id}>R{r.number}: {r.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Parallel Subjects
          </label>
          <span className="text-[9px] text-slate-500">Subjects to study simultaneously</span>
        </div>
        <div className="border border-slate-800/50 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/50 bg-slate-900/30">
                <th className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 w-8">
                  <span className="sr-only">On</span>
                </th>
                <th className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Subject</th>
                <th className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Offset Type</th>
                <th className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Offset / Start Date</th>
                <th className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Est. Days</th>
              </tr>
            </thead>
            <tbody>
              {strategy.parallelSubjects.map(p => {
                const subject = subjects.find(s => s.id === p.subjectId);
                if (!subject) return null;
                return (
                  <tr key={p.subjectId} className="border-b border-slate-800/30">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleParallelToggle(p.subjectId, !p.enabled)}
                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${
                          p.enabled ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-700 text-transparent'
                        }`}
                      >
                        {p.enabled && <CheckCircle className="h-3 w-3" />}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-slate-300">{subject.code}</span>
                      <span className="text-slate-500 ml-1.5">{subject.name}</span>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={p.offsetType}
                        onChange={e => handleParallelChange(p.subjectId, { offsetType: e.target.value as 'relative' | 'absolute' })}
                        disabled={!p.enabled}
                        className="bg-transparent border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 outline-none disabled:opacity-40"
                      >
                        <option value="relative">Relative</option>
                        <option value="absolute">Absolute</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {p.offsetType === 'relative' ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">+</span>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={p.relativeOffsetDays || 14}
                            onChange={e => handleParallelChange(p.subjectId, { relativeOffsetDays: parseInt(e.target.value) || 14 })}
                            disabled={!p.enabled}
                            className="w-14 bg-transparent border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 outline-none disabled:opacity-40"
                          />
                          <span className="text-slate-500">days</span>
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={p.absoluteStartDate || ''}
                          onChange={e => handleParallelChange(p.subjectId, { absoluteStartDate: e.target.value })}
                          disabled={!p.enabled}
                          className="bg-transparent border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 outline-none disabled:opacity-40"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={p.estimatedDays || ''}
                        placeholder="Auto"
                        onChange={e => handleParallelChange(p.subjectId, { estimatedDays: parseInt(e.target.value) || undefined })}
                        disabled={!p.enabled}
                        className="w-16 bg-transparent border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 outline-none placeholder:text-slate-600 disabled:opacity-40"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setStrategy(prev => ({ ...prev, autoBalanceRemaining: !prev.autoBalanceRemaining }))}
          className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${
            strategy.autoBalanceRemaining ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-700'
          }`}
        >
          {strategy.autoBalanceRemaining && <CheckCircle className="h-3 w-3" />}
        </button>
        <span className="text-xs text-slate-400">Auto-balance remaining subjects proportionally</span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800/30">
        <button onClick={onCancel} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 cursor-pointer">
          Cancel
        </button>
        <button
          onClick={handleCalculate}
          disabled={!strategy.firstSubjectId || isCalculating}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 text-slate-900 text-[10px] font-bold uppercase tracking-wider hover:bg-white disabled:opacity-40 cursor-pointer"
        >
          {isCalculating ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Calculating...</>
          ) : (
            <><BrainCircuit className="h-3.5 w-3.5" /> Calculate Plan</>
          )}
        </button>
      </div>
    </div>
  );

  const renderGanttPreview = () => (
    <div className="border border-slate-800/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Calculated Timeline</span>
      </div>
      <div className="space-y-2">
        {calculatedBlocks.map((block, i) => {
          const subject = subjects.find(s => s.id === block.subjectId);
          const blockStart = new Date(block.startDate);
          const blockEnd = new Date(block.endDate);
          const duration = Math.round((blockEnd.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const isFirstBlock = i === 0;
          const isPast = blockEnd < new Date();

          return (
            <div key={block.id} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-right">
                <span className={`text-[10px] font-mono ${isFirstBlock ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {block.startDate}
                </span>
              </div>
              <div className="flex-1 relative">
                <div
                  className={`h-6 rounded flex items-center px-2 ${
                    isFirstBlock
                      ? 'bg-emerald-500/20 border border-emerald-500/40'
                      : isPast
                        ? 'bg-slate-700/30 border border-slate-700/30'
                        : 'bg-blue-500/15 border border-blue-500/30'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(20, duration / 2))}%` }}
                >
                  <span className={`text-[9px] font-bold truncate ${isFirstBlock ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {subject?.code || block.subjectId}
                  </span>
                  {isFirstBlock && (
                    <span className="ml-1 text-[8px] text-emerald-500/70">★ First</span>
                  )}
                </div>
              </div>
              <div className="w-20 shrink-0">
                <span className="text-[9px] text-slate-500 font-mono">{duration}d</span>
              </div>
              <div className="w-24 shrink-0">
                <span className="text-[9px] text-slate-500 font-mono">{block.endDate}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {renderGanttPreview()}

      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-amber-400 text-[10px]">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border border-slate-800/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Coach Recommendations</span>
          {aiLoading && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}
        </div>

        {suggestions.length === 0 ? (
          <p className="text-[10px] text-slate-500">No suggestions — your strategy looks well-balanced.</p>
        ) : (
          <div className="space-y-2">
            {suggestions.map(sug => (
              <div key={sug.id} className={`flex items-start gap-3 p-2 rounded border ${
                sug.applied ? 'bg-emerald-500/10 border-emerald-500/30' : 'border-slate-800/30 bg-slate-900/20'
              }`}>
                <button
                  onClick={() => handleToggleSuggestion(sug.id)}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                    sug.applied ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'
                  }`}
                >
                  {sug.applied && <CheckCircle className="h-3 w-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-200 font-medium">{sug.description}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{sug.impact}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {aiReasoning && (
          <div className="mt-3 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">AI Analysis</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed whitespace-pre-wrap">{aiReasoning}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800/30">
        <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 cursor-pointer">
          <ChevronLeft className="h-3 w-3" /> Refine Strategy
        </button>
        <div className="flex items-center gap-2">
          {suggestions.some(s => s.applied) && (
            <button
              onClick={handleApplySelected}
              className="flex items-center gap-1 px-3 py-2 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/10 cursor-pointer"
            >
              <CheckCircle className="h-3 w-3" /> Apply Selected
            </button>
          )}
          <button
            onClick={handleAccept}
            className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-400 cursor-pointer"
          >
            <CheckCircle className="h-3.5 w-3.5" /> Accept Plan
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 text-center py-8">
      <div className="flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-white mb-1">Strategy Applied</h3>
        <p className="text-[10px] text-slate-400">Your study strategy has been implemented across all surfaces:</p>
      </div>

      <div className="grid gap-2 max-w-md mx-auto text-left">
        {[
          { icon: Layers, label: 'Coach Planner Timeline', desc: 'Updated with your priority order' },
          { icon: Target, label: 'Dashboard — Mission Control', desc: 'Daily mission follows your strategy' },
          { icon: Calendar, label: 'Calendar — Macro Matrix View', desc: 'Timeline reflects your plan' },
          { icon: BookOpen, label: 'Study Plan Card', desc: 'Roadmap shows your chosen path' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 p-2 border border-slate-800/30 rounded">
              <Icon className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-slate-200">{item.label}</p>
                <p className="text-[9px] text-slate-500">{item.desc}</p>
              </div>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 ml-auto shrink-0" />
            </div>
          );
        })}
      </div>

      <button
        onClick={onComplete}
        className="mt-4 px-6 py-2.5 bg-slate-200 text-slate-900 text-[10px] font-bold uppercase tracking-wider hover:bg-white cursor-pointer"
      >
        View Coach Planner
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-slate-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Strategy Session
          </h2>
        </div>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {renderProgressSteps()}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
};
