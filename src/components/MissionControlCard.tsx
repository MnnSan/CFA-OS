import React from 'react';
import { StudyStack, StudyPhase, StudyStepType, Reading, PlannerReadingProgress } from '../types';
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
  CheckCircle
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
  updateTrigger: number;
  readings: any[];
  losList: any[];
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
  updateTrigger,
  readings,
  losList,
  allPhasesInStack
}) => {
  const icon = PHASE_ICONS[phase.stepType] || '📝';
  const isGenerating = aiJob?.status === 'QUEUED' || aiJob?.status === 'ASSEMBLING' || aiJob?.status === 'SYNTHESIZING';

  // Find all learning resources for this phase
  const resourcesList = React.useMemo(() => {
    return phase.resources.map(ref => lrRepo.getById(ref.resourceId)).filter(Boolean);
  }, [phase.resources, lrRepo, updateTrigger]);

  const isRunning = phase.status === 'RUNNING';
  const isPaused = phase.status === 'PAUSED';

  // Calculate requirement checks for lock presentation
  const lockRequirements = React.useMemo(() => {
    const reqs: { label: string; completed: boolean }[] = [];
    
    const hasLecture = allPhasesInStack.some(p => p.stepType === 'Lecture');
    const hasReading = allPhasesInStack.some(p => p.stepType === 'Reading');
    const hasFormula = allPhasesInStack.some(p => p.stepType === 'Formula');
    const hasQuestions = allPhasesInStack.some(p => p.stepType === 'Questions');

    if (phase.stepType === 'Reading') {
      if (hasLecture) {
        const completed = allPhasesInStack.filter(p => p.stepType === 'Lecture').every(p => p.completed);
        reqs.push({ label: 'Lecture', completed });
      }
    } else if (phase.stepType === 'Formula' || phase.stepType === 'Notebook' || phase.stepType === 'Questions') {
      if (hasReading) {
        const completed = allPhasesInStack.filter(p => p.stepType === 'Reading').every(p => p.completed);
        reqs.push({ label: 'Reading', completed });
      }
    } else if (phase.stepType === 'Reflection') {
      if (hasLecture) {
        const completed = allPhasesInStack.filter(p => p.stepType === 'Lecture').every(p => p.completed);
        reqs.push({ label: 'Lecture', completed });
      }
      if (hasReading) {
        const completed = allPhasesInStack.filter(p => p.stepType === 'Reading').every(p => p.completed);
        reqs.push({ label: 'Reading', completed });
      }
      if (hasFormula) {
        const completed = allPhasesInStack.filter(p => p.stepType === 'Formula').every(p => p.completed);
        reqs.push({ label: 'Formula', completed });
      }
      if (hasQuestions) {
        const completed = allPhasesInStack.filter(p => p.stepType === 'Questions').every(p => p.completed);
        reqs.push({ label: 'Questions', completed });
      }
    }
    return reqs;
  }, [phase.stepType, allPhasesInStack]);

  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${
      isRunning 
        ? 'border-indigo-500 bg-indigo-500/[0.02] shadow-[0_0_15px_rgba(99,102,241,0.08)]' 
        : 'border-slate-200 dark:border-[#1e2026] bg-white dark:bg-[#101116] hover:border-slate-350 dark:hover:border-slate-800'
    }`}>
      {/* Header Row */}
      <div className="flex items-center justify-between p-4 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Running Indicator */}
          {isRunning ? (
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 w-8 shrink-0">
              P{phase.phaseNumber}
            </span>
          )}
          
          <span className="text-xl shrink-0 leading-none">{icon}</span>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono shrink-0">
                {phase.phaseLabel}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                {phase.title}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock size={11} /> {formatMinutes(phase.estimatedMinutes)}
              </span>
              {phase.elapsedMinutes && phase.elapsedMinutes > 0 ? (
                <>
                  <span className="text-[8px] text-slate-400 font-mono">•</span>
                  <span className="text-[10px] font-mono text-indigo-500 flex items-center gap-0.5">
                    ⏱ {Math.round(phase.elapsedMinutes)}m tracked
                  </span>
                </>
              ) : null}
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

        {/* Buttons / Controls */}
        <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
          {/* Action Trigger button */}
          {!phase.completed && (
            <>
              {phase.locked ? (
                <span className="text-[10px] font-mono text-slate-400/50 flex items-center gap-1 italic">
                  🔒 Locked
                </span>
              ) : (
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
            </>
          )}

          {/* Dropdown selector for completion levels */}
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
            className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 transition"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Pane Details */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-0 bg-slate-50/[0.15] dark:bg-[#0a0b10]/20 border-t border-slate-100 dark:border-[#1e2026] animate-slide-down">
          <div className="space-y-4 pt-4">
            
            {/* Prerequisite Lock Requirements checklist representation */}
            {phase.locked && lockRequirements.length > 0 && (
              <div className="p-3 bg-rose-500/[0.04] border border-rose-500/15 rounded-lg text-xs space-y-1.5">
                <span className="font-bold text-rose-400 block font-mono">🔒 Locked: {phase.lockedReason}</span>
                <div className="space-y-1 font-mono text-[10px]">
                  <span className="text-slate-500 block font-semibold uppercase text-[9px] tracking-wider mb-0.5">Completion Requirements:</span>
                  {lockRequirements.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-slate-400">
                      <span>{r.completed ? '✓' : '□'}</span>
                      <span className={r.completed ? 'text-slate-450 line-through' : 'text-slate-300 font-semibold'}>
                        {r.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cognitive parameters & Dynamic directive details */}
            <div className="grid md:grid-cols-2 gap-5 border-b border-slate-100 dark:border-[#1e2026] pb-4 text-xs">
              <div className="space-y-2">
                <h4 className="text-[9px] font-bold font-mono uppercase tracking-widest text-slate-500">COGNITIVE CONTEXT</h4>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-slate-400 font-mono text-[11px]">
                  <span>Memory Stage</span>
                  <span className="text-slate-200">{phase.memoryStage || 'Encoding'}</span>
                  <span>Bloom Level</span>
                  <span className="text-slate-200">{phase.bloomLevel || 'Understand'}</span>
                  <span>Cognitive Effort</span>
                  <span className={`font-bold ${phase.estimatedCognitiveEffort === 'High' ? 'text-rose-400' : phase.estimatedCognitiveEffort === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {phase.estimatedCognitiveEffort}
                  </span>
                  <span>Success Probability</span>
                  <span className="text-slate-200">{phase.estimatedSuccessPercent}%</span>
                  <span>Confidence Target</span>
                  <span className="text-slate-200">{phase.confidenceRequirement} Requirement</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-[9px] font-bold font-mono uppercase tracking-widest text-slate-500">COGNITIVE JUSTIFICATION</h4>
                <div className="space-y-1.5 font-sans leading-relaxed text-slate-300 text-[11px]">
                  <p>
                    <strong className="text-amber-500 font-mono">Why Now: </strong>
                    {phase.whyThisNow}
                  </p>
                  <p>
                    <strong className="text-emerald-500 font-mono">Outcome: </strong>
                    {phase.expectedOutcome}
                  </p>
                  <p>
                    <strong className="text-blue-500 font-mono">Objective: </strong>
                    {phase.learningObjective}
                  </p>
                  {phase.prerequisites && phase.prerequisites.length > 0 && (
                    <p className="text-slate-400 font-mono text-[10px] italic pt-0.5">
                      Prerequisites: {phase.prerequisites.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Learning Resources section inside phase */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-bold font-mono uppercase tracking-widest text-slate-500">Learning Resources</h4>
              {resourcesList.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No resources attached to this phase.</p>
              ) : (
                <div className="space-y-2">
                  {resourcesList.map(res => {
                    const isResCompleted = res.progress?.completed;
                    const isResInProgress = !isResCompleted && (res.progress?.minutesCompleted || 0) > 0;
                    return (
                      <div key={res.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900 rounded-lg gap-3">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <FileText size={14} className="text-indigo-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{res.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                              {res.provider} • {res.resourceType} • {res.duration}m
                              {isResCompleted ? ' • ✓ Completed' : isResInProgress ? ` • In Progress (${res.progress.minutesCompleted}m)` : ' • Not Started'}
                            </span>
                          </div>
                        </div>

                        {/* Resource Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (isResInProgress) {
                                resourceLauncherService.resume(res);
                              } else {
                                resourceLauncherService.launch(res);
                              }
                              lrRepo.markOpened(res.id);
                              eventBus.publish({
                                type: 'ReadingProgressUpdated',
                                timestamp: new Date().toISOString(),
                                source: 'MissionControlCard',
                                entityId: res.readingId,
                                payload: { readingId: res.readingId }
                              });
                            }}
                            className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 rounded cursor-pointer"
                          >
                            {isResInProgress ? 'Resume' : 'Launch'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (isResCompleted) {
                                lrRepo.updateProgress(res.id, { completed: false, minutesCompleted: 0 });
                              } else {
                                lrRepo.updateProgress(res.id, { completed: true, minutesCompleted: res.duration });
                              }
                              eventBus.publish({
                                type: 'ReadingProgressUpdated',
                                timestamp: new Date().toISOString(),
                                source: 'MissionControlCard',
                                entityId: res.readingId,
                                payload: { readingId: res.readingId }
                              });
                            }}
                            className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase border rounded cursor-pointer ${
                              isResCompleted
                                ? 'border-emerald-500 text-emerald-450 bg-emerald-500/10'
                                : 'border-slate-300 dark:border-slate-800 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {isResCompleted ? 'Completed' : 'Mark Complete'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              lrRepo.resetProgress(res.id);
                              eventBus.publish({
                                type: 'ReadingProgressUpdated',
                                timestamp: new Date().toISOString(),
                                source: 'MissionControlCard',
                                entityId: res.readingId,
                                payload: { readingId: res.readingId }
                              });
                            }}
                            className="p-1 border border-transparent text-slate-500 hover:text-slate-350 hover:bg-slate-900 rounded"
                            title="Reset Progress"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reference Links & Navigation shortcuts */}
            <div className="flex gap-2 flex-wrap pt-2">
              <button
                type="button"
                onClick={() => {
                  const rd = readings.find(r => r.id === phase.id.split('-')[1]);
                  if (rd) {
                    updateWorkspaceState({
                      selectedSubjectId: rd.subjectId,
                      selectedReadingId: rd.id,
                      mode: 'reading',
                      activeTab: 'overview'
                    });
                  } else {
                    updateWorkspaceState({ mode: 'reading', activeTab: 'overview' });
                  }
                }}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded"
              >
                Open Reading
              </button>
              
              <button
                type="button"
                onClick={() => {
                  updateWorkspaceState({ mode: 'reading', activeTab: 'los' });
                }}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded"
              >
                Open LOS
              </button>

              <button
                type="button"
                onClick={() => {
                  updateWorkspaceState({ mode: 'reading', activeTab: 'formulas' });
                }}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded"
              >
                Open Formula
              </button>
              
              <button
                type="button"
                onClick={onReset}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 rounded ml-auto"
              >
                Reset
              </button>
            </div>

            {/* AI Recommendation Insight section */}
            <div className="border-t border-slate-100 dark:border-[#1e2026] pt-3 mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Sparkles size={11} className="text-amber-500" />
                  <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest">COACH INTELLIGENCE</span>
                </div>
                {!cachedInsight && (
                  <button
                    type="button"
                    onClick={onGenerateInsight}
                    disabled={isGenerating}
                    className="text-[9px] font-mono text-amber-500 hover:text-amber-400 cursor-pointer disabled:opacity-40"
                  >
                    {isGenerating ? 'Generating...' : '[ Generate Recommendation ]'}
                  </button>
                )}
              </div>
              {isGenerating && !cachedInsight && (
                <div className="space-y-1.5 mt-2">
                  <div className="h-2.5 w-full rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full w-2/3 bg-indigo-500 rounded animate-shimmer" />
                  </div>
                  <div className="h-2.5 w-4/5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full w-1/2 bg-indigo-500 rounded animate-shimmer" />
                  </div>
                </div>
              )}
              {(cachedInsight || (aiJob?.status === 'READY' && aiJob?.result)) && (
                <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed font-sans font-medium bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900 p-2.5 rounded-lg mt-1 leading-relaxed">
                  {cachedInsight?.response || cachedInsight || aiJob?.result?.text}
                </p>
              )}
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
              updateTrigger={updateTrigger}
              readings={readings}
              losList={losList}
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
