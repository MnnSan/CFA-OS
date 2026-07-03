import React from 'react';
import { StudyStack, StudyPhase, StudyStepType, Resource, Reading, PlannerReadingProgress } from '../types';
import { ChevronDown, ChevronRight, CheckSquare, Sparkles, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useMissionControl } from '../hooks/useMissionControl';
import { StackBuilderInput } from '../services/StudyStackBuilder';
import { aiJobQueue, AiJob } from '../services/AiJobQueueService';
import { ContextBuilderService } from '../services/ContextBuilderService';

const PHASE_ICONS: Record<StudyStepType, string> = {
  Lecture: '\uD83C\uDFA5',
  Reading: '\uD83D\uDCD6',
  Formula: '\uD83D\uDCD0',
  Notebook: '\uD83E\uDDE0',
  Questions: '\u2705',
  Reflection: '\uD83D\uDCAD',
};

function formatMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

const PhaseRow: React.FC<{
  phase: StudyPhase;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onResume: () => void;
  onGenerateInsight: () => void;
  cachedInsight: any;
  aiJob: any;
}> = ({ phase, index, isExpanded, onToggle, onResume, onGenerateInsight, cachedInsight, aiJob }) => {
  const icon = PHASE_ICONS[phase.stepType] || '\uD83D\uDCCB';
  const isGenerating = aiJob?.status === 'QUEUED' || aiJob?.status === 'ASSEMBLING' || aiJob?.status === 'SYNTHESIZING';

  return (
    <div className="border border-slate-200/80 dark:border-[#1e2026]/80 overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700/60">
      <div className="flex items-center justify-between p-3.5 bg-white dark:bg-[#101116]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-[9px] font-mono text-slate-400 w-8 shrink-0">
            Phase {phase.phaseNumber}
          </span>
          <span className="text-base shrink-0 leading-none">{icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                {phase.phaseLabel}
              </span>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                {phase.title}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono text-slate-400">{formatMinutes(phase.estimatedMinutes)}</span>
              {phase.completionEvidence.readingProgress !== undefined && phase.completionEvidence.readingProgress > 0 && !phase.completed && (
                <span className="text-[9px] font-mono text-amber-500">{phase.completionEvidence.readingProgress}%</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!phase.completed && phase.status !== 'SKIPPED' && (
            <>
              {phase.locked ? (
                <span className="text-[9px] font-mono text-slate-400/60 flex items-center gap-1.5">
                  <span className="opacity-50">{'\uD83D\uDD12'}</span>
                  <span className="italic text-slate-400/50">Locked</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onResume}
                  className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 rounded cursor-pointer transition-all duration-150"
                >
                  {phase.completionEvidence.readingProgress && phase.completionEvidence.readingProgress > 0 ? 'Resume' : 'Start'}
                </button>
              )}
            </>
          )}
          {phase.completed && (
            <span className="text-[9px] font-mono text-emerald-500 font-bold flex items-center gap-1">
              <CheckSquare size={10} /> Done
            </span>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 transition-colors duration-150"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-0 bg-slate-50/[0.3] dark:bg-[#0a0b10]/30 animate-slide-down border-t border-slate-100 dark:border-[#1e2026]">
          <div className="pl-[4.5rem] space-y-2 pt-2.5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
              {phase.resources.length > 0 && (
                <>
                  <span className="text-slate-500">Runtime</span>
                  <span className="text-slate-700 dark:text-slate-300">{formatMinutes(phase.estimatedMinutes)}</span>
                  <span className="text-slate-500">Source</span>
                  <span className="text-slate-700 dark:text-slate-300">{phase.resources[0].provider}</span>
                  <span className="text-slate-500">Resource</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate">{phase.resources[0].title}</span>
                </>
              )}
              {phase.resources.length === 0 && phase.stepType === 'Reflection' && (
                <>
                  <span className="text-slate-500">Duration</span>
                  <span className="text-slate-700 dark:text-slate-300">{formatMinutes(phase.estimatedMinutes)}</span>
                </>
              )}
            </div>

            {phase.dependsOn.length > 0 && phase.locked && (
              <div className="text-[9px] text-slate-400/60 italic flex items-center gap-1.5">
                <HelpCircle size={10} className="opacity-50" />
                Complete previous phase to unlock this step
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-[#1e2026] pt-2.5 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={10} className="text-amber-500" />
                  <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-wider">Coach Insight</span>
                </div>
                {!cachedInsight && (
                  <button
                    type="button"
                    onClick={onGenerateInsight}
                    disabled={isGenerating}
                    className="text-[9px] font-mono text-amber-500 hover:text-amber-400 cursor-pointer disabled:cursor-not-allowed px-1 transition-colors duration-150"
                  >
                    {isGenerating ? 'Generating...' : '[ Generate ]'}
                  </button>
                )}
              </div>
              {isGenerating && !cachedInsight && (
                <div className="mt-2 space-y-1.5">
                  <div className="h-2.5 w-full rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full w-2/3 rounded animate-shimmer" />
                  </div>
                  <div className="h-2.5 w-4/5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full w-1/2 rounded animate-shimmer" />
                  </div>
                </div>
              )}
              {cachedInsight && (
                <p className="text-[10px] text-slate-600 dark:text-slate-350 mt-1.5 leading-relaxed font-sans animate-fade-in">
                  {cachedInsight.response || cachedInsight}
                </p>
              )}
              {!cachedInsight && !isGenerating && aiJob?.status === 'READY' && aiJob?.result && (
                <p className="text-[10px] text-slate-600 dark:text-slate-350 mt-1.5 leading-relaxed font-sans animate-fade-in">
                  {aiJob.result.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MissionControlCard: React.FC = () => {
  const {
    dailyMission,
    settings,
    resources,
    formulas,
    notes,
    readings,
    plannerReadings,
    plannerProgress,
  } = useApp();

  const { missionControl, execution, coachRepository, adapter } = useMissionControl();

  const [expandedPhases, setExpandedPhases] = React.useState<Record<string, boolean>>({});
  const [jobs, setJobs] = React.useState<AiJob[]>([]);

  React.useEffect(() => {
    return aiJobQueue.subscribe(setJobs);
  }, []);

  const todayStudyStack: StudyStack | null = React.useMemo(() => {
    if (!dailyMission) return null;
    const filtered = (resources || []).filter(
      (r: Resource) => r.linkedReadingId === dailyMission.readingId
    );
    const learningResources = adapter.toLearningResources(filtered);
    const input: StackBuilderInput = {
      learningResources,
      formulas,
      notes,
      questionCount: filtered.length,
      dailyTargetHours: settings?.targetDailyHours || 2,
    };
    const stack = missionControl.buildMission(dailyMission, input);
    return execution.applyPersistedStates(stack);
  }, [dailyMission, resources, formulas, notes, settings?.targetDailyHours]);

  if (!dailyMission || !todayStudyStack) return null;

  const stack = todayStudyStack;

  const currentPhase = stack.activePhase || stack.nextPhase;

  const nextReading = React.useMemo(() => {
    if (!plannerReadings || plannerReadings.length === 0) return null;
    const currentNumber = dailyMission.readingNumber;
    return plannerReadings.find((r: Reading) => (r.number || r.readingNumber || 0) > currentNumber) || null;
  }, [plannerReadings, dailyMission.readingNumber]);

  const currentReadingProgress = React.useMemo(() => {
    if (!plannerProgress) return null;
    return plannerProgress.find((p: PlannerReadingProgress) => p.readingId === dailyMission.readingId) || null;
  }, [plannerProgress, dailyMission.readingId]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const handleResume = (phaseId: string) => {
    execution.resumePhase(stack, phaseId);
  };

  const handleGenerateInsight = (phase: StudyPhase) => {
    if (!settings) return;
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
      settings
    );
  };

  const getCachedInsight = (phaseId: string) => {
    return coachRepository.get(phaseId, stack.readingId);
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
  const stackedHours = dailyMission.estimatedDurationHours
    ? `${dailyMission.estimatedDurationHours}h`
    : formatMinutes(stack.totalEstimatedMinutes);

  return (
    <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-0.5 h-full bg-slate-900 dark:bg-slate-200" />

      <div className="p-5 pb-4 border-b border-slate-100 dark:border-[#1e2026]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-200 font-sans">
            MISSION CONTROL
          </h2>
          <span className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider">
            {dailyMission.subjectCode}
          </span>
        </div>

        {currentPhase && (
          <div className="mb-4 p-3.5 border border-amber-500/15 bg-amber-500/[0.03] dark:bg-amber-500/[0.05]">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 min-w-0 flex-1">
                <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-wider block">
                  {'\u25B6'} Current Phase
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg shrink-0 leading-none">{PHASE_ICONS[currentPhase.stepType] || '\uD83D\uDCCB'}</span>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block truncate leading-tight">
                      {currentPhase.phaseLabel}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate leading-snug mt-0.5">
                      {currentPhase.title}
                    </span>
                  </div>
                </div>
                {!currentPhase.completed && !currentPhase.locked && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                      {formatMinutes(currentPhase.estimatedMinutes)} remaining
                    </span>
                    <span className="text-[8px] text-slate-400">\u2022</span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Phase {currentPhase.phaseNumber} of {stack.totalPhases}
                    </span>
                  </div>
                )}
              </div>
              <div className="shrink-0 ml-4 mt-0.5">
                {!currentPhase.completed && !currentPhase.locked && (
                  <button
                    type="button"
                    onClick={() => handleResume(currentPhase.id)}
                    className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 rounded cursor-pointer transition-all duration-150"
                  >
                    {currentPhase.completionEvidence.readingProgress && currentPhase.completionEvidence.readingProgress > 0 ? 'Resume' : 'Start'}
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
          <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
            <span>Mission Progress</span>
            <span>{stack.progressPercent}% \u00B7 {stack.completedPhases} of {stack.totalPhases} Phases Complete</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-slate-600 to-slate-900 dark:from-slate-400 dark:to-white rounded-full transition-all duration-700 ease-out ${notComplete ? 'animate-progress-pulse' : ''}`}
              style={{ width: `${stack.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border rounded ${loadColors[stack.cognitiveLoad] || loadColors.LOW}`}>
            {'\u26A1'} {stack.cognitiveLoad}
          </span>
          <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border rounded ${profileBadgeClass}`}>
            {'\uD83D\uDCCA'} {stack.missionProfile}
          </span>
          {stack.cognitiveLoadReason && stack.cognitiveLoad !== 'LOW' && (
            <span className="text-[8px] font-mono text-slate-400 italic self-center">
              {stack.cognitiveLoadReason}
            </span>
          )}
        </div>
      </div>

      <div className="p-3.5 space-y-2">
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
              onResume={() => handleResume(phase.id)}
              onGenerateInsight={() => handleGenerateInsight(phase)}
              cachedInsight={getCachedInsight(phase.id)}
              aiJob={getAiJobForPhase(phase.id)}
            />
          ))
        )}
      </div>

      {nextReading && (
        <div className="border-t border-slate-100 dark:border-[#1e2026] px-5 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[9px] font-mono font-bold text-slate-400/70 uppercase tracking-wider">
              {'\u2500'.repeat(22)} After today's mission
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-base shrink-0 leading-none">{'\uD83D\uDCD6'}</span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                Reading {nextReading.number || nextReading.readingNumber}: {nextReading.title}
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-mono text-slate-500">
                  Estimated {nextReading.estimatedHours ? `${nextReading.estimatedHours}h` : stackedHours}
                </span>
                {currentReadingProgress && (
                  <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                    {'\u2713'} Reading {dailyMission.readingNumber} in progress
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionControlCard;
