

import React, { useState } from 'react';
import { StudyStack, StudyPhase, StudyStepType, Reading, PlannerReadingProgress, LearningOutcomeStatement } from '../types';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  Sparkles, 
  HelpCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Check, 
  Edit, 
  FileText,
  Clock,
  BookOpen,
  Award,
  HelpCircle as QuestionIcon,
  Brain,
  Target,
  CheckCircle,
  Headphones,
  Presentation,
  Star,
  Layers,
  ExternalLink,
  Download,
  Video
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useMissionControl } from '../hooks/useMissionControl';
import { StackBuilderInput } from '../services/StudyStackBuilder';
import { aiJobQueue, AiJob } from '../services/AiJobQueueService';
import { ContextBuilderService } from '../services/ContextBuilderService';
import { useLearningResources } from '../context/LearningResourceRepositoryContext';
import { resourceLauncherService } from '../services/ResourceLauncherService';
import { eventBus } from '../services/EventBus';
import { missionEngineService } from '../services/MissionEngineService';

const PHASE_ICONS: Record<StudyStepType, string> = {
  Lecture: '🎥',
  Reading: '📘',
  Formula: '🔢',
  Notebook: '🧠',
  Questions: '❓',
  Reflection: '💬',
};

function formatMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// Helper to extract command word from LOS statement
function getCommandWord(statement: string): string {
  const match = statement.match(/^(describe|calculate|compare|explain|evaluate|analyze|determine|select|discuss|demonstrate|interpret|construct|formulate)/i);
  return match ? match[1].toUpperCase() : 'UNDERSTAND';
}

const PhaseRow: React.FC<{
  phase: StudyPhase;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onStartResume: () => void;
  onPause: () => void;
  onToggleComplete: () => void;
  onProgressPercentChange: (percent: number) => void;
  onReset: () => void;
  onGenerateInsight: () => void;
  cachedInsight: any;
  aiJob: any;
  lrRepo: any;
  updateWorkspaceState: any;
  selectLOS: any;
  updateLOS: (id: string, updates: Partial<LearningOutcomeStatement>) => void;
  updateTrigger: number;
  readings: any[];
  losList: any[];
  formulas: any[];
  notes: any[];
  allPhasesInStack: StudyPhase[];
}> = ({
  phase,
  index,
  isExpanded,
  onToggle,
  onStartResume,
  onPause,
  onToggleComplete,
  onProgressPercentChange,
  onReset,
  onGenerateInsight,
  cachedInsight,
  aiJob,
  lrRepo,
  updateWorkspaceState,
  selectLOS,
  updateLOS,
  updateTrigger,
  readings,
  losList,
  formulas,
  notes,
  allPhasesInStack
}) => {
  const icon = PHASE_ICONS[phase.stepType] || '📝';
  const isGenerating = aiJob?.status === 'QUEUED' || aiJob?.status === 'ASSEMBLING' || aiJob?.status === 'SYNTHESIZING';

  // Sub-item expanded states (e.g. expanding individual lecture, individual LOS, or individual note)
  const [expandedSubItems, setExpandedSubItems] = useState<Record<string, boolean>>({});
  // NotebookLM output mode selection ('report' | 'audiobook' | 'ppt' | null)
  const [notebookMode, setNotebookMode] = useState<'report' | 'audiobook' | 'ppt' | null>(null);

  const toggleSubItem = (id: string) => {
    setExpandedSubItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Find all learning resources for this reading
  const allReadingResources = React.useMemo(() => {
    return lrRepo.getByReadingId(phase.readingId);
  }, [lrRepo, phase.readingId, updateTrigger]);

  // Filter lectures specifically
  const lectureList = React.useMemo(() => {
    return allReadingResources.filter((r: any) => 
      r.resourceType === 'Video' || 
      r.provider === 'SSCI' || 
      r.id.startsWith('lrs-sec-') || 
      r.id.startsWith('lrs-yt-')
    );
  }, [allReadingResources]);

  // Filter ALL LOS items for this reading
  const readingLosList = React.useMemo(() => {
    return losList.filter(l => l.readingId === phase.readingId);
  }, [losList, phase.readingId]);

  // Filter notes and formulas for this reading
  const readingNotes = React.useMemo(() => {
    return notes.filter(n => n.linkedReadingId === phase.readingId);
  }, [notes, phase.readingId]);

  const readingFormulas = React.useMemo(() => {
    return formulas.filter(f => f.readingId === phase.readingId);
  }, [formulas, phase.readingId]);

  const isRunning = phase.status === 'RUNNING';
  const isPaused = phase.status === 'PAUSED';

  const completedCount = readingLosList.filter(l => l.status === 'Completed').length;
  const totalLosCount = readingLosList.length;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${
      isRunning 
        ? 'border-indigo-500 bg-indigo-500/[0.02] shadow-[0_0_15px_rgba(99,102,241,0.08)]' 
        : 'border-slate-200 dark:border-[#1e2026] bg-white dark:bg-[#101116] hover:border-slate-350 dark:hover:border-slate-800'
    }`}>
      {/* Header Row */}
      <div className="flex items-center justify-between p-4 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {isRunning ? (
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 w-8 shrink-0">
              S{phase.phaseNumber}
            </span>
          )}
          
          <span className="text-xl shrink-0 leading-none">{icon}</span>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono shrink-0">
                {phase.stepType === 'Lecture' ? 'LECTURES SESSION' : phase.stepType === 'Reading' ? 'UNDERSTAND SESSION' : phase.stepType === 'Notebook' || phase.stepType === 'Formula' ? 'CONSOLIDATE SESSION' : phase.stepType === 'Questions' ? 'VALIDATE SESSION' : 'REFLECT SESSION'}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                {phase.stepType === 'Lecture'
                  ? `Video & SSCI Lectures (${lectureList.length} Lectures)`
                  : phase.stepType === 'Reading'
                  ? `Curriculum Learning Outcomes (${readingLosList.length} LOS Items)`
                  : phase.stepType === 'Notebook' || phase.stepType === 'Formula'
                  ? `NotebookLM Review & Study Notes (${readingNotes.length} Notes • ${readingFormulas.length} Formulas)`
                  : phase.stepType === 'Questions'
                  ? `Practice Questions & EOCQ Drills`
                  : `Mastery Reflection & Self-Check`}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock size={11} /> {formatMinutes(phase.estimatedMinutes)}
              </span>
              {phase.stepType === 'Reading' && totalLosCount > 0 && (
                <>
                  <span className="text-[8px] text-slate-400 font-mono">•</span>
                  <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                    {completedCount}/{totalLosCount} LOS Mastered
                  </span>
                </>
              )}
              {phase.stepType === 'Lecture' && lectureList.length > 0 && (
                <>
                  <span className="text-[8px] text-slate-400 font-mono">•</span>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                    {lectureList.filter((l: any) => l.progress?.completed).length}/{lectureList.length} Lectures Completed
                  </span>
                </>
              )}
              {phase.completed && (
                <>
                  <span className="text-[8px] text-slate-400 font-mono">•</span>
                  <span className="text-[9px] font-mono font-bold text-emerald-500 uppercase tracking-wider">
                    ✓ EVIDENCE OK
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
          {!phase.completed && !phase.locked && (
            <button
              type="button"
              onClick={isRunning ? onPause : onStartResume}
              className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition-all duration-200 shadow-sm ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-transparent'
                  : isPaused
                  ? 'border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10'
                  : 'border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10'
              }`}
            >
              {isRunning ? 'Pause' : isPaused ? 'Resume' : 'Start'}
            </button>
          )}

          {!phase.locked && (
            <select
              value={phase.progress !== undefined ? Math.round(phase.progress * 100) : (phase.completed ? 100 : 0)}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onProgressPercentChange(val);
              }}
              className="text-[10px] font-mono border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-[#101116] text-slate-700 dark:text-slate-350 px-1 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="0">0%</option>
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
            </select>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 transition flex items-center gap-1"
          >
            <span className="text-[10px] font-mono font-semibold uppercase">{isExpanded ? 'Collapse' : 'Expand'}</span>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Session View */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-0 bg-slate-50/[0.15] dark:bg-[#0a0b10]/20 border-t border-slate-100 dark:border-[#1e2026] animate-slide-down">
          <div className="space-y-4 pt-4">

            {/* 🎥 LECTURES SESSION VIEW */}
            {phase.stepType === 'Lecture' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <Video size={13} /> SSCI & Video Lectures ({lectureList.length} Total)
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Total Duration: {formatMinutes(lectureList.reduce((sum: number, l: any) => sum + (l.duration || 0), 0))}
                  </span>
                </div>

                {lectureList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-900/10 rounded">No video lectures found for this reading.</p>
                ) : (
                  <div className="space-y-2">
                    {lectureList.map((lec: any, idx: number) => {
                      const isLecCompleted = lec.progress?.completed;
                      const isLecSubExpanded = !!expandedSubItems[lec.id];
                      return (
                        <div key={lec.id} className="border border-slate-200 dark:border-slate-800/80 rounded-lg bg-white dark:bg-[#121319] overflow-hidden">
                          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50" onClick={() => toggleSubItem(lec.id)}>
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 rounded">
                                L{idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{lec.title}</span>
                                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                  {lec.provider || 'SSCI'} • {lec.duration} mins • {isLecCompleted ? '✓ Completed' : 'Pending'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  resourceLauncherService.launch(lec);
                                  lrRepo.markOpened(lec.id);
                                }}
                                className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer flex items-center gap-1"
                              >
                                <Play size={10} /> Launch Lecture
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  lrRepo.updateProgress(lec.id, { completed: !isLecCompleted, minutesCompleted: isLecCompleted ? 0 : lec.duration });
                                  eventBus.publish({
                                    type: 'ReadingProgressUpdated',
                                    timestamp: new Date().toISOString(),
                                    source: 'MissionControlCard',
                                    entityId: lec.readingId,
                                    payload: { readingId: lec.readingId }
                                  });
                                }}
                                className={`px-2 py-1 text-[9px] font-mono font-bold uppercase border rounded cursor-pointer ${
                                  isLecCompleted
                                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                                    : 'border-slate-300 dark:border-slate-800 text-slate-400 hover:bg-slate-800'
                                }`}
                              >
                                {isLecCompleted ? '✓ Done' : 'Mark Complete'}
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleSubItem(lec.id)}
                                className="text-slate-400 hover:text-slate-200 p-1"
                              >
                                {isLecSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Individual Lecture Details */}
                          {isLecSubExpanded && (
                            <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-900 text-xs font-mono space-y-1.5 text-slate-400">
                              <p><strong className="text-slate-300">Code:</strong> {lec.lectureCode || lec.id}</p>
                              <p><strong className="text-slate-300">Description:</strong> {lec.description || `SSCI Comprehensive Video Lecture for ${phase.readingId}`}</p>
                              {lec.launchUrl && (
                                <p className="truncate"><strong className="text-slate-300">URL:</strong> <a href={lec.launchUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">{lec.launchUrl}</a></p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 📘 UNDERSTAND SESSION VIEW — ALL LOS ITEMS */}
            {phase.stepType === 'Reading' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <BookOpen size={13} /> Curriculum Learning Outcomes — All LOS Items ({readingLosList.length} Total)
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Mastery: {completedCount}/{totalLosCount} ({totalLosCount > 0 ? Math.round((completedCount/totalLosCount)*100) : 0}%)
                  </span>
                </div>

                {readingLosList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-900/10 rounded">No LOS items found for this reading in curriculum database.</p>
                ) : (
                  <div className="space-y-2.5">
                    {readingLosList.map((los) => {
                      const isLosCompleted = los.status === 'Completed';
                      const isLosSubExpanded = !!expandedSubItems[los.id];
                      const commandWord = getCommandWord(los.statement || los.description || '');
                      const confidenceVal = los.confidence || 0;

                      return (
                        <div key={los.id} className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#121319] overflow-hidden">
                          <div className="p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-indigo-500/15 text-indigo-400 rounded border border-indigo-500/20">
                                    LOS {los.code}
                                  </span>
                                  <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 uppercase">
                                    [{commandWord}]
                                  </span>
                                  {los.difficulty && (
                                    <span className="text-[8px] font-mono text-slate-500 uppercase">
                                      Difficulty: {los.difficulty}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug pt-1">
                                  {los.statement || los.description || los.title}
                                </h5>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleSubItem(los.id)}
                                className="text-slate-400 hover:text-slate-200 p-1 shrink-0"
                              >
                                {isLosSubExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            </div>

                            {/* Confidence Star Rating & Status Controls */}
                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-900/80 flex-wrap gap-2">
                              {/* 5-Star Confidence Rating */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Confidence:</span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => updateLOS(los.id, { confidence: star })}
                                      className="p-0.5 text-amber-400 hover:scale-110 transition cursor-pointer"
                                      title={`Set confidence ${star}/5`}
                                    >
                                      <Star
                                        size={13}
                                        className={star <= confidenceVal ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                                      />
                                    </button>
                                  ))}
                                </div>
                                <span className="text-[10px] font-mono text-amber-400 font-bold ml-1">
                                  {confidenceVal > 0 ? `${confidenceVal}/5` : 'Unrated'}
                                </span>
                              </div>

                              {/* Status Toggle Button */}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextStatus = isLosCompleted ? 'Not Started' : 'Completed';
                                    updateLOS(los.id, { status: nextStatus });
                                  }}
                                  className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase border rounded cursor-pointer transition ${
                                    isLosCompleted
                                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                                      : 'border-slate-300 dark:border-slate-800 text-slate-400 hover:bg-slate-800'
                                  }`}
                                >
                                  {isLosCompleted ? '✓ LOS Mastered' : 'Mark Mastered'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => selectLOS(los.id)}
                                  className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 rounded cursor-pointer"
                                >
                                  Study Workspace
                                </button>
                              </div>
                            </div>

                            {/* Sub-item Expansion: Formulas, Notes & AI Summary */}
                            {isLosSubExpanded && (
                              <div className="mt-3 p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 rounded-lg text-xs space-y-2">
                                {los.aiSummary && (
                                  <div>
                                    <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider block mb-0.5">AI Concept Summary:</span>
                                    <p className="text-slate-300 leading-relaxed font-sans">{los.aiSummary}</p>
                                  </div>
                                )}
                                {los.cfaWeight && (
                                  <p className="font-mono text-[10px] text-slate-400">
                                    <strong className="text-slate-300">Exam Weighting:</strong> {los.cfaWeight}
                                  </p>
                                )}
                                <div className="flex gap-2 pt-1 font-mono text-[9px]">
                                  <span className="text-slate-500">Related Formulas: {los.relatedFormulas?.length || 0}</span>
                                  <span>•</span>
                                  <span className="text-slate-500">Related Notes: {los.relatedNotes?.length || 0}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 🧠 CONSOLIDATE SESSION VIEW — NOTEBOOKLM REVIEW & STUDY NOTES */}
            {(phase.stepType === 'Notebook' || phase.stepType === 'Formula') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-violet-400 flex items-center gap-1.5">
                    <Brain size={13} /> NotebookLM Review & Synthesis — All LOS ({readingLosList.length} LOS Covered)
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {readingNotes.length} Notes • {readingFormulas.length} Formulas
                  </span>
                </div>

                {/* 3 Prominent NotebookLM Action Output Trigger Cards */}
                <div className="grid md:grid-cols-3 gap-3">
                  {/* Card 1: Prepare Report */}
                  <div className={`p-3.5 border rounded-xl bg-white dark:bg-[#121319] space-y-2 cursor-pointer transition-all ${notebookMode === 'report' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/50'}`} onClick={() => setNotebookMode(notebookMode === 'report' ? null : 'report')}>
                    <div className="flex items-center gap-2 text-indigo-400">
                      <FileText size={16} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Prepare Report</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                      Generate an executive study report summarizing all LOS concepts for this reading.
                    </p>
                    <button
                      type="button"
                      className="w-full py-1 text-[9px] font-mono font-bold uppercase bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={10} /> {notebookMode === 'report' ? 'Hide Report' : 'View Executive Report'}
                    </button>
                  </div>

                  {/* Card 2: Generate Audiobook / Audio Overview */}
                  <div className={`p-3.5 border rounded-xl bg-white dark:bg-[#121319] space-y-2 cursor-pointer transition-all ${notebookMode === 'audiobook' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/50'}`} onClick={() => setNotebookMode(notebookMode === 'audiobook' ? null : 'audiobook')}>
                    <div className="flex items-center gap-2 text-amber-400">
                      <Headphones size={16} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Audiobook Overview</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                      NotebookLM audio podcast discussion overview covering all LOS items of this reading.
                    </p>
                    <button
                      type="button"
                      className="w-full py-1 text-[9px] font-mono font-bold uppercase bg-amber-500 hover:bg-amber-400 text-slate-950 rounded flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play size={10} /> {notebookMode === 'audiobook' ? 'Hide Audio Player' : 'Launch Audio Overview'}
                    </button>
                  </div>

                  {/* Card 3: Create PPT Presentation Deck */}
                  <div className={`p-3.5 border rounded-xl bg-white dark:bg-[#121319] space-y-2 cursor-pointer transition-all ${notebookMode === 'ppt' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'}`} onClick={() => setNotebookMode(notebookMode === 'ppt' ? null : 'ppt')}>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Presentation size={16} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">PPT Slide Deck</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                      Key concept presentation slide deck outline covering formulas and core LOS items.
                    </p>
                    <button
                      type="button"
                      className="w-full py-1 text-[9px] font-mono font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Layers size={10} /> {notebookMode === 'ppt' ? 'Hide Slide Deck' : 'Generate PPT Deck'}
                    </button>
                  </div>
                </div>

                {/* NotebookLM Output Mode Panels */}
                {notebookMode === 'report' && (
                  <div className="p-4 bg-indigo-500/[0.04] border border-indigo-500/20 rounded-xl space-y-2 text-xs">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">📄 NotebookLM Executive Study Report — Reading {phase.readingId}</span>
                    <p className="text-slate-300 leading-relaxed font-sans">
                      This executive report synthesizes all {readingLosList.length} Learning Outcome Statements for {phase.readingId}. Key focus areas include instrument valuation mechanics, payoff formulas, and strategic risk management applications.
                    </p>
                    <div className="space-y-1 font-mono text-[10px] text-slate-400 pt-1">
                      {readingLosList.map(l => (
                        <div key={l.id} className="flex items-center gap-2">
                          <span className="text-indigo-400">► LOS {l.code}:</span>
                          <span className="truncate">{l.statement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {notebookMode === 'audiobook' && (
                  <div className="p-4 bg-amber-500/[0.04] border border-amber-500/20 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Headphones size={13} /> NotebookLM Deep Dive Audio Overview
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Duration: 18m 42s</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg flex items-center gap-3">
                      <button type="button" className="p-2 bg-amber-500 text-slate-950 rounded-full hover:scale-105 cursor-pointer">
                        <Play size={14} className="fill-current" />
                      </button>
                      <div className="flex-1 space-y-1">
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-amber-400 rounded-full" />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>06:12</span>
                          <span>18:42</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {notebookMode === 'ppt' && (
                  <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">📊 PPT Presentation Deck Outline ({readingLosList.length + 2} Slides)</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[10px] pt-1">
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-300">Slide 1: Executive Overview</div>
                      {readingLosList.map((l, i) => (
                        <div key={l.id} className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-300">
                          Slide {i + 2}: LOS {l.code} Breakdown
                        </div>
                      ))}
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-300">Slide {readingLosList.length + 2}: Exam Formula Matrix</div>
                    </div>
                  </div>
                )}

                {/* List of Notes & Formulas for this Reading */}
                <div className="space-y-2 pt-2">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Study Notes & Formula References</span>
                  {readingNotes.length === 0 && readingFormulas.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-900/10 rounded">No custom notes created for this reading yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {readingNotes.map(n => (
                        <div key={n.id} className="p-3 bg-white dark:bg-[#121319] border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{n.title}</span>
                            <span className="text-[9px] font-mono text-slate-500">{n.updatedAt?.split('T')[0]}</span>
                          </div>
                          <p className="text-slate-400 font-sans leading-relaxed">{n.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ❓ VALIDATE SESSION VIEW — PRACTICE QUESTIONS & EOCQ */}
            {phase.stepType === 'Questions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
                    <QuestionIcon size={13} /> Practice Questions & EOCQ Drills — All LOS
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Target: 20 EOCQ Drills
                  </span>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-slate-300 font-bold">End-of-Chapter Questions (EOCQ) Drill Set</span>
                    <span className="text-sky-400 font-bold">20 Drills Available</span>
                  </div>
                  <p className="text-slate-400 leading-snug font-sans">
                    Execute practice drills covering calculation items, scenario vignettes, and conceptual questions for all {readingLosList.length} LOS items.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      updateWorkspaceState({ mode: 'reading', activeTab: 'analytics' });
                    }}
                    className="px-3 py-1 text-[9px] font-mono font-bold uppercase bg-sky-600 hover:bg-sky-500 text-white rounded cursor-pointer flex items-center gap-1"
                  >
                    Launch Practice Question Bank
                  </button>
                </div>
              </div>
            )}

            {/* 💬 REFLECT SESSION VIEW — MASTERY & CONFIDENCE REVIEW */}
            {phase.stepType === 'Reflection' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <Award size={13} /> Mastery Reflection & Self-Check — All LOS
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {completedCount}/{totalLosCount} Mastered
                  </span>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <span className="font-bold text-amber-400 font-mono text-[10px] uppercase">LOS Confidence Diagnostic Summary</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                    {readingLosList.map(l => (
                      <div key={l.id} className="p-2 bg-slate-950 border border-slate-800 rounded">
                        <span className="text-slate-400 block">LOS {l.code}</span>
                        <span className="text-amber-400 font-bold">{l.confidence ? `${l.confidence}/5 Stars` : 'Unrated'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reference Links & Action Buttons */}
            <div className="flex gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-[#1e2026]">
              <button
                type="button"
                onClick={() => {
                  const rd = readings.find(r => r.id === phase.readingId);
                  if (rd) {
                    updateWorkspaceState({
                      selectedSubjectId: rd.subjectId,
                      selectedReadingId: rd.id,
                      mode: 'reading',
                      activeTab: 'overview'
                    });
                  }
                }}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded cursor-pointer"
              >
                Open Full Reading Workspace
              </button>
              
              <button
                type="button"
                onClick={() => {
                  updateWorkspaceState({ mode: 'reading', activeTab: 'los' });
                }}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded cursor-pointer"
              >
                Open LOS Matrix
              </button>

              <button
                type="button"
                onClick={onReset}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 rounded ml-auto cursor-pointer"
              >
                Reset Progress
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

interface MissionControlCardProps {
  onTriggerBrief?: () => void;
}

const MissionControlCard: React.FC<MissionControlCardProps> = ({ onTriggerBrief }) => {
  const {
    dailyMission,
    settings,
    formulas,
    notes,
    readings,
    plannerReadings,
    plannerProgress,
    losList,
    sessionHistory,
    updateWorkspaceState,
    selectLOS,
    updateLOS,
    activeTemplate,
  } = useApp();

  const lrRepo = useLearningResources();
  const { missionControl, execution, coachRepository } = useMissionControl();

  const [expandedPhases, setExpandedPhases] = React.useState<Record<string, boolean>>({});
  const [jobs, setJobs] = React.useState<AiJob[]>([]);
  const [updateTrigger, setUpdateTrigger] = React.useState(0);

  React.useEffect(() => {
    return aiJobQueue.subscribe(setJobs);
  }, []);

  // Tick timer every second to update active running phase duration in UI
  React.useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reactive subscription to Event Bus
  React.useEffect(() => {
    const eventTypes = [
      'StudySessionCompleted',
      'ReadingProgressUpdated',
      'LOSCompleted',
      'ResourceLaunched',
      'ResourceResumed',
      'ResourceProgressUpdated',
      'PhaseCompleted',
      'PhaseUncompleted',
      'PhaseStarted',
      'PhasePaused',
      'CoachInsightGenerated'
    ];
    const unsubscribes = eventTypes.map(type =>
      eventBus.subscribe(type, () => {
        setUpdateTrigger(prev => prev + 1);
      })
    );
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const todayStudyStack: StudyStack | null = React.useMemo(() => {
    if (!dailyMission) return null;
    
    const learningResources = lrRepo.getByReadingId(dailyMission.readingId);
    
    const targetEOCQ = readings
      .filter(r => r.id === dailyMission.readingId)
      .reduce((sum, r) => sum + (r.targets?.eocqCount || 20), 0);
      
    const input: StackBuilderInput = {
      learningResources,
      formulas: formulas || [],
      notes: notes || [],
      losList: losList || [],
      plannerProgress: plannerProgress || [],
      targetEOCQ,
      questionCount: learningResources.filter(r => r.resourceType === 'Question Bank').length || 20,
      dailyTargetHours: settings?.targetDailyHours || 2,
    };
    
    const stack = missionControl.buildMission(dailyMission, input);
    return execution.applyPersistedStates(stack);
  }, [dailyMission, formulas, notes, settings?.targetDailyHours, updateTrigger]);

  if (!dailyMission || !todayStudyStack) return null;

  const stack = todayStudyStack;
  
  // Find currently running phase, else the next ready/unlocked phase
  const currentPhase = stack.phases.find(p => p.status === 'RUNNING') || stack.activePhase || stack.nextPhase;

  // "Coming Up Next" is literally the next executable/unlocked phase (not RUNNING, not completed)
  const nextPhasePreview = React.useMemo(() => {
    if (!stack.phases || stack.phases.length === 0) return null;
    return stack.phases.find(p => p.status === 'READY' && !p.locked && p.id !== currentPhase?.id) || null;
  }, [stack.phases, currentPhase]);

  // Calculate next mission after today's mission using getNextMission candidate helper
  const nextMissionCandidate = React.useMemo(() => {
    return missionEngineService.getNextMission(stack.readingId, readings, losList);
  }, [stack.readingId, readings, losList]);

  const scheduleDates = React.useMemo(() => {
    if (!activeTemplate || !stack.readingId) return null;
    const block = activeTemplate.blocks.find(b => b.readingId === stack.readingId);
    if (!block) return null;
    
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      } catch {
        return dateStr;
      }
    };
    return `[ Target Schedule: ${formatDate(block.startDate)} ──► ${formatDate(block.endDate)} ]`;
  }, [activeTemplate, stack.readingId]);

  const handleProgressChange = (phase: StudyPhase, progressPercent: number) => {
    execution.recordProgress(phase.id, progressPercent);

    // Update individual resources progress proportionally
    phase.resources.forEach(ref => {
      const res = lrRepo.getById(ref.resourceId);
      if (res) {
        const completed = progressPercent === 100;
        const minutesCompleted = Math.round((progressPercent / 100) * res.duration);
        lrRepo.updateProgress(ref.resourceId, { completed, minutesCompleted });
      }
    });

     eventBus.publish({
      type: 'ResourceProgressUpdated',
      timestamp: new Date().toISOString(),
      source: 'MissionControlCard',
      entityId: phase.id,
      payload: { 
        phaseId: phase.id, 
        progressPercent,
        readingId: phase.readingId,
        linkedLosIds: phase.linkedLosIds,
        resourceName: phase.resourceName
      }
    });

    setUpdateTrigger(prev => prev + 1);
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const handleStartResume = (phaseId: string) => {
    execution.startPhase(phaseId);
    setUpdateTrigger(prev => prev + 1);

    // Sync progress updates to dashboard
    eventBus.publish({
      type: 'ResourceProgressUpdated',
      timestamp: new Date().toISOString(),
      source: 'MissionControlCard',
      entityId: stack.readingId,
      payload: { readingId: stack.readingId }
    });
  };

  const handlePause = (phaseId: string) => {
    execution.pausePhase(phaseId);
    setUpdateTrigger(prev => prev + 1);

    eventBus.publish({
      type: 'ResourceProgressUpdated',
      timestamp: new Date().toISOString(),
      source: 'MissionControlCard',
      entityId: stack.readingId,
      payload: { readingId: stack.readingId }
    });
  };

  const handleToggleComplete = (phase: StudyPhase) => {
    if (phase.completed) {
      execution.uncompletePhase(phase.id);
      
      // Update individual resources progress if split
      phase.resources.forEach(ref => {
        lrRepo.updateProgress(ref.resourceId, { completed: false, minutesCompleted: 0 });
      });
      
      eventBus.publish({
        type: 'PhaseUncompleted',
        timestamp: new Date().toISOString(),
        source: 'MissionControlCard',
        entityId: phase.id,
        payload: { readingId: stack.readingId }
      });
    } else {
      execution.completePhase(phase, undefined, "Evidence validation succeeded.");
      
      phase.resources.forEach(ref => {
        const res = lrRepo.getById(ref.resourceId);
        if (res) {
          lrRepo.updateProgress(ref.resourceId, { completed: true, minutesCompleted: res.duration });
        }
      });

      eventBus.publish({
        type: 'PhaseCompleted',
        timestamp: new Date().toISOString(),
        source: 'MissionControlCard',
        entityId: phase.id,
        payload: { readingId: stack.readingId }
      });
    }
    setUpdateTrigger(prev => prev + 1);
  };

  const handleReset = (phaseId: string) => {
    const phase = stack.phases.find(p => p.id === phaseId);
    if (!phase) return;

    execution.uncompletePhase(phaseId);
    execution.resetPhaseOverride(phaseId);

    phase.resources.forEach(ref => {
      lrRepo.resetProgress(ref.resourceId);
    });

    eventBus.publish({
      type: 'ResourceProgressUpdated',
      timestamp: new Date().toISOString(),
      source: 'MissionControlCard',
      entityId: stack.readingId,
      payload: { readingId: stack.readingId }
    });
    setUpdateTrigger(prev => prev + 1);
  };

  const handleGenerateInsight = (phase: StudyPhase) => {
    if (!settings) return;
    const promptVersion = 'COACH_INSIGHT_V1';
    const curriculumVersion = '2027_v1';
    const provider = settings.aiProvider || 'google-gemini';

    aiJobQueue.queueJob(
      'task-coach-insight',
      `coach-insight-${phase.id}`,
      () => ContextBuilderService.buildCoachInsightContext(
        {
          phaseNumber: phase.phaseNumber,
          phaseLabel: phase.phaseLabel,
          stepType: phase.stepType,
          title: phase.title,
          estimatedMinutes: phase.estimatedMinutes,
          dependsOn: phase.dependsOn,
        },
        {
          readingTitle: stack.readingTitle,
          losCode: dailyMission.losCode,
          totalPhases: stack.totalPhases,
          cognitiveLoadReason: stack.cognitiveLoadReason,
        }
      ),
      settings,
      (status, result) => {
        if (status === 'READY' && result?.text) {
          coachRepository.save(
            phase.id,
            stack.readingId,
            provider,
            promptVersion,
            curriculumVersion,
            {
              response: result.text,
              generatedAt: new Date().toISOString()
            }
          );
          
          eventBus.publish({
            type: 'CoachInsightGenerated',
            timestamp: new Date().toISOString(),
            source: 'MissionControlCard',
            entityId: phase.id,
            payload: { readingId: stack.readingId }
          });
        }
      }
    );
  };

  const getCachedInsight = (phaseId: string) => {
    const promptVersion = 'COACH_INSIGHT_V1';
    const curriculumVersion = '2027_v1';
    const provider = settings?.aiProvider || 'google-gemini';
    return coachRepository.get(phaseId, stack.readingId, provider, promptVersion, curriculumVersion);
  };

  const getAiJobForPhase = (phaseId: string) => {
    return jobs.find((j: any) => j.resourceKey === `coach-insight-${phaseId}`);
  };

  const loadColors: Record<string, string> = {
    LOW: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    MEDIUM: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    HIGH: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  };

  const profileBadgeClass = (() => {
    const map: Record<string, string> = {
      Balanced: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      'Calculation Intensive': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      'Reading Intensive': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      'Revision Day': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      'Recovery Day': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      'Momentum Builder': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    };
    return map[stack.missionProfile] || map.Balanced;
  })();

  const notComplete = stack.completedPhases < stack.totalPhases;
  const explain = dailyMission.explanation;

  // Compute AI Explainability Checklist
  const explanationChecklist = React.useMemo(() => {
    if (!explain) return [];
    const items: { label: string; satisfied: boolean; icon: React.ReactNode }[] = [];

    const confidenceVal = dailyMission.confidenceLevel ?? 3;
    const isWeakTopic = confidenceVal < 3 || explain.selectionMethod === 'weakness';
    items.push({
      label: 'Weak Topic',
      satisfied: isWeakTopic,
      icon: <Brain size={10} className="shrink-0" />,
    });

    const subjCode = (dailyMission.subjectCode || '').toLowerCase();
    const isHighWeight = subjCode.includes('pf') || subjCode.includes('pm') || subjCode.includes('equity') || subjCode.includes('portfolio');
    items.push({
      label: 'High Exam Weight',
      satisfied: isHighWeight,
      icon: <Target size={10} className="shrink-0" />,
    });

    const lastSessionForReading = sessionHistory
      .filter(s => s.linkedReadingId === dailyMission.readingId && s.status === 'Completed')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
    const daysSinceLastStudy = lastSessionForReading
      ? Math.round((Date.now() - new Date(lastSessionForReading.startTime).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    items.push({
      label: `Last Studied ${daysSinceLastStudy === 999 ? 'N/A' : `${daysSinceLastStudy} Days Ago`}`,
      satisfied: daysSinceLastStudy > 3 || daysSinceLastStudy === 999,
      icon: <Clock size={10} className="shrink-0" />,
    });

    const confidencePct = Math.round((confidenceVal / 5) * 100);
    items.push({
      label: `Confidence ${confidencePct}%`,
      satisfied: confidencePct < 60,
      icon: <Award size={10} className="shrink-0" />,
    });

    const targetHours = settings?.targetDailyHours || 2;
    const fitsTime = dailyMission.estimatedDurationHours <= targetHours;
    items.push({
      label: `Fits Today's Available Time (${dailyMission.estimatedDurationHours.toFixed(1)}h ≤ ${targetHours}h)`,
      satisfied: fitsTime,
      icon: <BookOpen size={10} className="shrink-0" />,
    });

    const revisionDue = confidenceVal >= 3 && daysSinceLastStudy > 7;
    items.push({
      label: 'Revision Window Due',
      satisfied: revisionDue,
      icon: <CheckCircle size={10} className="shrink-0" />,
    });

    return items;
  }, [explain, dailyMission, sessionHistory, settings?.targetDailyHours]);

  return (
    <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] relative overflow-hidden rounded-xl shadow-md">
      <div className="absolute top-0 left-0 w-0.5 h-full bg-slate-900 dark:bg-slate-200" />

      {/* AI Study Brief Explanation Panel with Checklist */}
      {explain && (
        <div className="p-4 bg-slate-50/50 dark:bg-[#15161d]/30 border-b border-slate-100 dark:border-[#1e2026]/80 text-[11px] leading-relaxed">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-indigo-400 font-mono uppercase tracking-widest flex items-center gap-1.5 text-[9px]">
              <Sparkles size={11} className="text-amber-500" /> AI Study Brief Explanation
            </span>
            <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              Priority: {explain.priorityScore}/100
            </span>
          </div>
          <div className="space-y-1.5 text-slate-350 dark:text-slate-350">
            <p>
              <strong className="text-slate-400 dark:text-slate-400 font-mono">Selection Method: </strong>
              <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 rounded font-semibold text-slate-300 dark:text-slate-200">{explain.selectionMethod}</span>
            </p>
            <p>
              <strong className="text-slate-400 dark:text-slate-400 font-mono">Why This Reading: </strong>
              {explain.whySelected}
            </p>
            <p>
              <strong className="text-slate-400 dark:text-slate-400 font-mono">Why Now: </strong>
              {explain.whyNow}
            </p>
            <p>
              <strong className="text-slate-400 dark:text-slate-400 font-mono">Expected Outcome: </strong>
              {explain.expectedOutcome}
            </p>
            {explain.blockingFactors && explain.blockingFactors.length > 0 && (
              <p className="text-rose-400 font-mono text-[10px] flex items-center gap-1">
                <AlertTriangle size={10} /> Blocking Factors: {explain.blockingFactors.join(', ')}
              </p>
            )}

            {/* Why Checklist */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
              <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Why?</span>
              <div className="space-y-1">
                {explanationChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <span className={`${item.satisfied ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {item.satisfied ? '✓' : '○'}
                    </span>
                    <span className={`${item.satisfied ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.icon}
                    </span>
                    <span className={`${item.satisfied ? 'text-slate-300 font-semibold' : 'text-slate-500'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mission Timeline Stepper */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-[#1e2026]">
        <div className="flex items-center justify-between mb-2 overflow-x-auto py-1">
          {stack.phases.filter(p => p.status !== 'SKIPPED').map((phase, idx, arr) => {
            const isCompleted = phase.completed;
            const isActive = phase.status === 'RUNNING' || phase.status === 'PAUSED';
            const isLocked = phase.locked && !isCompleted;
            return (
              <React.Fragment key={phase.id}>
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold font-mono transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-indigo-500 text-white ring-2 ring-indigo-300 animate-pulse'
                      : isLocked
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {isCompleted ? (
                      <Check size={12} />
                    ) : (
                      <span>{phase.phaseNumber}</span>
                    )}
                  </div>
                  <span className={`text-[7px] font-mono mt-1 whitespace-nowrap ${
                    isCompleted ? 'text-emerald-500 font-bold' : isActive ? 'text-indigo-500 font-bold' : isLocked ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {phase.phaseLabel || phase.stepType}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="p-5 pb-4 border-b border-slate-100 dark:border-[#1e2026]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-200 font-sans">
              MISSION CONTROL
            </h2>
            {scheduleDates && (
              <span className="text-xs font-mono text-indigo-500 dark:text-indigo-400 font-semibold">
                {scheduleDates}
              </span>
            )}
          </div>
          <span className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider">
            {dailyMission.subjectCode}
          </span>
        </div>

        {/* Current Active Phase Panel */}
        {currentPhase && (
          <div className={`mb-4 p-4 border rounded-lg transition-all duration-300 ${
            currentPhase.status === 'RUNNING' 
              ? 'border-indigo-500/25 bg-indigo-500/[0.03] shadow-[0_0_12px_rgba(99,102,241,0.05)]' 
              : 'border-amber-500/15 bg-amber-500/[0.03]'
          }`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 min-w-0 flex-1">
                <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                  {currentPhase.status === 'RUNNING' ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                      <span>Running Timer Active</span>
                    </>
                  ) : (
                    <span>▶ Current Study Phase</span>
                  )}
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg shrink-0 leading-none">{PHASE_ICONS[currentPhase.stepType] || '📝'}</span>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block truncate leading-tight">
                      {currentPhase.phaseLabel}: {currentPhase.title}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate leading-snug mt-0.5">
                      {currentPhase.description}
                    </span>
                  </div>
                </div>
                {!currentPhase.completed && !currentPhase.locked && (
                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-slate-500">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatMinutes(currentPhase.estimatedMinutes)} remaining
                    </span>
                    <span>•</span>
                    <span>
                      Phase {currentPhase.phaseNumber} of {stack.totalPhases}
                    </span>
                  </div>
                )}
              </div>
              <div className="shrink-0 ml-4 mt-1">
                {!currentPhase.completed && !currentPhase.locked && (
                  <button
                    type="button"
                    onClick={currentPhase.status === 'RUNNING' ? () => handlePause(currentPhase.id) : () => handleStartResume(currentPhase.id)}
                    className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-md shadow-sm transition-all duration-200 ${
                      currentPhase.status === 'RUNNING'
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-transparent'
                        : 'border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10'
                    }`}
                  >
                    {currentPhase.status === 'RUNNING' ? 'Pause' : currentPhase.status === 'PAUSED' ? 'Resume' : 'Start'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatMinutes(stack.totalEstimatedMinutes)}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {stack.remainingMinutes < stack.totalEstimatedMinutes
              ? `Remaining ${formatMinutes(stack.remainingMinutes)}`
              : "Today's Mission"}
          </span>
          <span className="text-[9px] font-mono text-slate-400 italic ml-auto">
            {stack.completionForecast}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono font-bold text-slate-505 dark:text-slate-400">
            <span>Mission Progress</span>
            <span>{stack.progressPercent}% · {stack.completedPhases} of {stack.totalPhases} Phases Complete</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-indigo-500 to-indigo-700 dark:from-indigo-400 dark:to-white rounded-full transition-all duration-700 ease-out ${notComplete ? 'animate-progress-pulse' : ''}`}
              style={{ width: `${stack.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border rounded ${loadColors[stack.cognitiveLoad] || loadColors.LOW}`}>
            ⚡ {stack.cognitiveLoad}
          </span>
          <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border rounded ${profileBadgeClass}`}>
            📊 {stack.missionProfile}
          </span>
          {stack.cognitiveLoadReason && stack.cognitiveLoad !== 'LOW' && (
            <span className="text-[8px] font-mono text-slate-400 italic self-center">
              {stack.cognitiveLoadReason}
            </span>
          )}
          {onTriggerBrief && (
            <button
              type="button"
              onClick={onTriggerBrief}
              className="px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 rounded cursor-pointer transition-all duration-150 flex items-center gap-1 ml-auto"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>Pre-Study Brief</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3.5 space-y-2.5">
        {stack.phases.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-4">No phases available for today's mission.</p>
        ) : (
          stack.phases.filter(p => p.status !== 'SKIPPED').map((phase, idx) => (
            <PhaseRow
              key={phase.id}
              phase={phase}
              index={idx}
              isExpanded={!!expandedPhases[phase.id]}
              onToggle={() => togglePhase(phase.id)}
              onStartResume={() => handleStartResume(phase.id)}
              onPause={() => handlePause(phase.id)}
              onToggleComplete={() => handleToggleComplete(phase)}
              onProgressPercentChange={(percent) => handleProgressChange(phase, percent)}
              onReset={() => handleReset(phase.id)}
              onGenerateInsight={() => handleGenerateInsight(phase)}
              cachedInsight={getCachedInsight(phase.id)}
              aiJob={getAiJobForPhase(phase.id)}
              lrRepo={lrRepo}
              updateWorkspaceState={updateWorkspaceState}
              selectLOS={selectLOS}
              updateLOS={updateLOS}
              updateTrigger={updateTrigger}
              readings={readings}
              losList={losList}
              formulas={formulas}
              notes={notes}
              allPhasesInStack={stack.phases}
            />
          ))
        )}
      </div>

      {/* Next Phase Preview Panel ("Coming Up Next") */}
      <div className="mx-3.5 mb-3.5 p-3 rounded-lg border border-blue-500/10 bg-blue-500/[0.02] border-l-2 border-l-blue-500 font-sans">
        {nextPhasePreview ? (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 flex items-center gap-1">
                <span>▶</span> Coming Up Next
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                Cognitive Effort: {nextPhasePreview.estimatedCognitiveEffort}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {nextPhasePreview.phaseLabel}: {nextPhasePreview.title} ({formatMinutes(nextPhasePreview.estimatedMinutes)})
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {nextPhasePreview.whyThisNow} Target Bloom Level: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{nextPhasePreview.bloomLevel}</span>.
            </p>
          </>
        ) : (
          <div className="text-center py-1.5 text-xs font-mono font-bold text-emerald-500 flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} /> Mission Complete! All phases completed.
          </div>
        )}
      </div>

      {/* After Today's Mission candidate display */}
      {nextMissionCandidate && (
        <div className="border-t border-slate-100 dark:border-[#1e2026] px-5 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[9px] font-mono font-bold text-slate-400/70 uppercase tracking-widest">
              ── AFTER TODAY'S MISSION
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-base shrink-0 leading-none">📘</span>
            <div className="min-w-0 flex-1 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                Reading {nextMissionCandidate.reading.number || nextMissionCandidate.reading.readingNumber}: {nextMissionCandidate.reading.title}
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                <strong className="text-slate-400 font-mono">Reason: </strong> {nextMissionCandidate.reason}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-500">
                <span>Duration: {nextMissionCandidate.estimatedDurationMinutes}m</span>
                <span>•</span>
                <span>LOS Count: {nextMissionCandidate.losCount}</span>
                <span>•</span>
                <span className={`font-semibold ${nextMissionCandidate.priority === 'High' ? 'text-rose-500' : 'text-slate-400'}`}>
                  Priority: {nextMissionCandidate.priority}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionControlCard;
