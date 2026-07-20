/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { useLearningResources } from '../context/LearningResourceRepositoryContext';
import { FormulaCard } from '../components/FormulaCard';
import MissionControlCard from '../components/MissionControlCard';
import MissionBriefDrawer from '../components/MissionBriefDrawer';
import { CfaSyllabusProgressPanel } from '../applications/cfa/curriculum/components/CfaSyllabusProgressPanel';
import { CfaStudyPlanCard } from '../applications/cfa/curriculum/components/CfaStudyPlanCard';
import { Formula, PlannerReadingProgress, WeakTopicsSummary } from '../types';
import { useWeakTopics } from '../services/useIntelligenceStream';
import { aiJobQueue } from '../services/AiJobQueueService';
import { ContextBuilderService } from '../services/ContextBuilderService';
import { eventBus } from '../services/EventBus';
import { 
  Calendar, 
  FileText, 
  Flame, 
  Activity, 
  ArrowUpRight, 
  CheckSquare, 
  Plus, 
  BookOpen, 
  TrendingUp,
  Clock,
  Compass,
  Play,
  Pause,
  Square,
  RotateCcw,
  Timer,
  Award,
  AlertCircle,
  ChevronRight,
  Gauge,
  HelpCircle,
  GitBranch,
  ActivityIcon,
  X,
  AlertTriangle,
  BarChart3,
  Target,
  Sparkles,
  Brain,
  BrainCircuit
} from 'lucide-react';

interface MissionBriefData {
  priorKnowledge: string[];
  difficulty: string;
  formulaLoad: string;
  mentalMode: string;
  estimatedFocus: string;
  coachingTip: string;
  expectedSuccess: string;
}

export const Dashboard: React.FC = () => {
  const { 
    user, 
    settings, 
    losList, 
    activityFeed, 
    setActiveTab, 
    addEvent,
    addNote,
    clearActivityLog,
    selectedLOSId,
    readings,
    subjects,
    activeSession,
    isSessionPaused,
    sessionElapsedTime,
    startStudySession,
    pauseStudySession,
    resumeStudySession,
    finishStudySession,
    cancelStudySession,
    sessionHistory,
    updateLOS,
    formulas,
    updateFormula,
    setSelectedNoteId,
    setSelectedResourceId,
    selectLOS,
    setSelectedReadingId,
    setSelectedSubjectId,
    readingSessionActiveReport,
    revisionQueue,
    dailySnapshotsList,
    graphAnalyzerHealthReport,
    examReadinessReport,
    burnoutDetected,
    dailyMission,
    isDegraded,
    plannerProgress,
    plannerReadings,
    notes,
    resources,
    studyStrategy
  } = useApp();

  const lrRepo = useLearningResources();

  const [showFinishRating, setShowFinishRating] = React.useState(false);
  const [focusRating, setFocusRating] = React.useState(7);
  const [confidenceRatingAfter, setConfidenceRatingAfter] = React.useState(4);
  const [questionsSolved, setQuestionsSolved] = React.useState(0);
  const [selectedDashboardFormula, setSelectedDashboardFormula] = React.useState<Formula | null>(null);
  const [showSessionSaved, setShowSessionSaved] = React.useState(false);
  const [sessionSavedProgress, setSessionSavedProgress] = React.useState(0);
  const [showDailyReview, setShowDailyReview] = React.useState(false);
  const [dailyReviewData, setDailyReviewData] = React.useState<any>(null);
  const [coachInsight, setCoachInsight] = React.useState<string | null>(null);
  const [coachInsightLoading, setCoachInsightLoading] = React.useState(false);
  const [showMissionBrief, setShowMissionBrief] = React.useState(false);
  const [missionBriefLoading, setMissionBriefLoading] = React.useState(false);
  const [missionBrief, setMissionBrief] = React.useState<MissionBriefData | null>(null);
  const [missionBriefFailed, setMissionBriefFailed] = React.useState(false);

  const weakTopics = useWeakTopics();

  const [updateTrigger, setUpdateTrigger] = React.useState(0);

  React.useEffect(() => {
    const eventTypes = [
      'StudySessionCompleted',
      'ReadingProgressUpdated',
      'LOSCompleted',
      'FormulaMemorized',
      'FormulaReviewed',
      'ResourceLaunched',
      'ResourceResumed',
      'ResourceProgressUpdated',
      'PhaseCompleted',
      'PhaseUncompleted'
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

  const triggerMissionBrief = () => {
    if (!settings || !dailyMission) return;
    setMissionBriefLoading(true);
    setMissionBriefFailed(false);
    setShowMissionBrief(true);

    const jobKey = `mission-brief-${dailyMission.readingId}-${dailyMission.losId}`;
    
    aiJobQueue.queueJob(
      'task-mission-brief',
      jobKey,
      () => ContextBuilderService.buildMissionBriefContext(
        {
          number: dailyMission.readingNumber,
          title: dailyMission.readingTitle,
          subjectCode: dailyMission.subjectCode
        },
        {
          code: dailyMission.losCode,
          statement: dailyMission.statement,
          difficulty: dailyMission.confidenceLevel ? String(dailyMission.confidenceLevel) : 'Medium',
          estimatedHours: dailyMission.estimatedDurationHours,
          confidence: typeof dailyMission.confidenceLevel === 'number' ? dailyMission.confidenceLevel : null
        },
        [], // prerequisites
        formulas.filter(f => f.linkedReadingId === dailyMission.readingId),
        notes.filter(n => n.linkedReadingId === dailyMission.readingId),
        resources.filter(r => r.linkedReadingId === dailyMission.readingId),
        [], // previousReflections
        7, // studyStreak
        revisionQueue?.length || 0,
        settings.examDate,
        dailyMission.reason
      ),
      settings,
      (status, result) => {
        if (status === 'READY' && result?.text) {
          try {
            let parsedBrief: MissionBriefData;
            try {
              parsedBrief = JSON.parse(result.text);
            } catch {
              const text = result.text;
              const extractArray = (header: string): string[] => {
                const match = text.match(new RegExp(`${header}:?\\s*\\n?([\\s\\S]*?)(?:\\n\\n|\\n[A-Z]|$)`, 'i'));
                if (!match) return [];
                return match[1].split('\n').map(l => l.replace(/^[-\*\s\d\.]+\s*/, '').trim()).filter(Boolean);
              };
              const extractString = (header: string): string => {
                const match = text.match(new RegExp(`${header}:?\\s*\\n?([\\s\\S]*?)(?:\\n\\n|\\n[A-Z]|$)`, 'i'));
                return match ? match[1].trim() : '';
              };
              parsedBrief = {
                priorKnowledge: extractArray('Prior Knowledge') || extractArray('Prerequisites'),
                difficulty: extractString('Difficulty') || 'Medium',
                formulaLoad: extractString('Formula Load') || 'Moderate',
                mentalMode: extractString('Mental Mode') || 'Conceptual',
                estimatedFocus: extractString('Estimated Focus') || `${dailyMission.estimatedDurationHours}h`,
                coachingTip: extractString('Coaching Tip') || extractString('Tip'),
                expectedSuccess: extractString('Expected Success') || extractString('Success')
              };
            }
            setMissionBrief(parsedBrief);
          } catch (err) {
            console.error('Failed to parse mission brief result:', err);
            setMissionBriefFailed(true);
          }
        }
        if (status === 'FAILED') {
          setMissionBriefFailed(true);
        }
        if (status === 'READY' || status === 'FAILED') {
          setMissionBriefLoading(false);
        }
      }
    );
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  const activeLOS = selectedLOSId ? losList.find(l => l.id === selectedLOSId) : null;
  const activeLOSReading = activeLOS ? readings.find(r => r.id === activeLOS.readingId) : null;

  const totalHoursPlanned = losList.reduce((acc, l) => acc + (l.estimatedHours || 0), 0);
  const totalResourceMinutes = lrRepo.getAll().reduce((sum, r) => sum + (r.progress?.minutesCompleted || 0), 0);
  const totalHoursStudied = (
    sessionHistory.reduce((acc, s) => acc + (s.durationMinutes / 60), 0) + 
    (totalResourceMinutes / 60)
  ).toFixed(1);

  const handleQuickAddEvent = () => {
    addEvent({
      title: 'Revision: Strategic Asset Allocation',
      date: '2026-06-29',
      startTime: '10:00',
      endTime: '11:00',
      type: 'Revision',
      description: 'Review strategic asset allocation constraints in Institutional settings.',
      isCompleted: false
    });
    setActiveTab('calendar');
  };

  const handleQuickAddNote = () => {
    const noteId = addNote({
      title: 'Strategic Asset Allocation Formulas',
      content: `# Strategic Asset Allocation Formulas\n\nKey formulations for Mean-Variance optimization:\n\n- **Expected Return:**\n  $$E(R_p) = \\sum w_i E(R_i)$$\n\n- **Portfolio Variance:**\n  $$\\sigma_p^2 = w^T \\Sigma w$$\n\nEnsure you account for the corner portfolio constraints when using strategic models without short sales.\n`,
      linkedSubjectId: 'sub-aa',
      linkedReadingId: 'rd-8'
    });
    setSelectedNoteId(noteId);
    setActiveTab('notes');
  };

  const yesterdayStr = '2026-06-27';
  const yesterdaySessions = sessionHistory.filter(s => s.startTime.startsWith(yesterdayStr) && s.status === 'Completed');
  const yesterdayMinutes = yesterdaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const yesterdayHours = (yesterdayMinutes / 60).toFixed(1);

  // ── SSCI Lectures 60/40 Knowledge Coverage ──
  const ssciResources = lrRepo.getAll().filter(r => r.provider === 'SSCI' || r.title.includes('CLS (NEW)'));
  const totalVideoTarget = ssciResources.reduce((sum, r) => sum + r.duration, 0);
  const totalVideoLogged = ssciResources.reduce((sum, r) => sum + r.progress.minutesCompleted, 0);
  const videoPct = totalVideoTarget > 0 ? Math.min(100, Math.round((totalVideoLogged / totalVideoTarget) * 100)) : 0;
  const videoComponent = totalVideoTarget > 0 ? Math.min(60, Math.round((totalVideoLogged / totalVideoTarget) * 60)) : 0;

  const totalEOCQTarget = plannerReadings.reduce((sum, r) => sum + (r.targets?.eocqCount || 0), 0);
  const totalEOCQCompleted = plannerProgress.reduce((sum, p) => sum + p.completedEOCQ, 0);
  const eocqPct = totalEOCQTarget > 0 ? Math.min(100, Math.round((totalEOCQCompleted / totalEOCQTarget) * 100)) : 0;
  const eocqComponent = totalEOCQTarget > 0 ? Math.min(40, Math.round((totalEOCQCompleted / totalEOCQTarget) * 40)) : 0;

  const totalMMProgress = Math.min(100, videoComponent + eocqComponent);

  // ── Study Resource Alignment (notes coverage ratio) ──
  const uniqueReadingIdsWithNotes = new Set(notes.filter(n => n.linkedReadingId).map(n => n.linkedReadingId));
  const totalReadings = readings.length;
  const notesCoveragePct = totalReadings > 0 ? Math.round((uniqueReadingIdsWithNotes.size / totalReadings) * 100) : 0;

  // ── Study Runway Velocity ──
  const currentVelocity = examReadinessReport?.velocityHoursPerDay || 0;
  const targetVelocity = settings.targetDailyHours;
  const velocityRatio = targetVelocity > 0 ? Math.min(100, Math.round((currentVelocity / targetVelocity) * 100)) : 0;
  const weeklyRequired = targetVelocity * 7;
  const currentWeekly = currentVelocity * 7;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Morning Briefing Header */}
      <div className="bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-white p-6 border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 font-bold uppercase">
              CFA EXECUTIVE COCKPIT
            </span>
            <button
              onClick={() => setActiveTab('help')}
              className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-400 font-mono font-bold uppercase transition bg-slate-900 border border-slate-800 px-2.5 py-1 hover:bg-slate-800 cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Getting Started
            </button>
          </div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl font-sans">
            Good Morning, {user?.name || 'Candidate'}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans max-w-2xl">
            Yesterday you studied <strong className="text-slate-900 dark:text-white">{yesterdayHours} hours</strong>. 
            Your average decayed syllabus confidence is rated at <strong className="text-slate-900 dark:text-white">
              {(losList.reduce((acc, l) => acc + (l.confidence || 2.5), 0) / losList.length).toFixed(2)}/5.0
            </strong>. Spaced repetition revisions have been loaded into your daily study focus mission.
          </p>
        </div>
      </div>

      {/* SESSION SAVED SUCCESS BANNER */}
      {showSessionSaved && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 flex items-start gap-3 dark:bg-emerald-950/30 dark:border-emerald-700 animate-fade-in">
          <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">Session Saved Successfully</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
              Your study session has been recorded and applied to curriculum progress. Confidence levels updated.
            </p>
            {/* Micro-progress bar showing session contribution toward daily mission */}
            {sessionSavedProgress > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                  {sessionSavedProgress}% of daily target
                </span>
                <div className="flex-1 h-2 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${sessionSavedProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setShowSessionSaved(false)} className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-200 p-1 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* STRATEGY BADGE */}
      {studyStrategy && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded">
          <BrainCircuit className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="text-[10px] text-slate-400">
            Strategy: <strong className="text-slate-200">{subjects.find(s => s.id === studyStrategy.firstSubjectId)?.name || 'Custom'}</strong> first
            {studyStrategy.parallelSubjects.filter(p => p.enabled).length > 0 && (
              <> · {studyStrategy.parallelSubjects.filter(p => p.enabled).length} parallel subjects</>
            )}
          </span>
          <button
            onClick={() => setActiveTab('planner')}
            className="ml-auto text-[9px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            View Plan
          </button>
        </div>
      )}

      {/* DEGRADED INTELLIGENCE MODE ALERT */}
      {isDegraded && (
        <div className="bg-amber-50 border border-amber-300 p-4 flex items-start gap-3 dark:bg-amber-950/30 dark:border-amber-700">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Intelligence Subsystem Degraded</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              One or more intelligence services returned an error. Metrics shown below may reflect a cached snapshot rather than live data.
              A <span className="font-mono bg-amber-200/60 dark:bg-amber-800/40 px-1">STALE</span> badge indicates cached values.
              Check Developer Tools for diagnostic details.
            </p>
          </div>
        </div>
      )}

      {/* 2. Key Intelligence Metrics row */}
      {examReadinessReport && graphAnalyzerHealthReport && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Exam Readiness Probability */}
          <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-0.5 bg-blue-500 h-full"></div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-1">Exam Readiness Probability</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-900 dark:text-white font-mono">{examReadinessReport.readinessScore}%</span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 px-1 py-0.5 shrink-0">
                  {examReadinessReport.preparationRiskLevel} Risk
                </span>
              </div>
            </div>
            <div className="mt-4 text-[10px] text-slate-500 dark:text-slate-500 font-mono">
              Target Finish: {examReadinessReport.projectedFinishDate} ({examReadinessReport.projectedFinishDays} days)
            </div>
          </div>

          {/* Knowledge Coverage — MM 60/40 Dual Bar */}
          <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-0.5 bg-amber-500 h-full"></div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-1">Knowledge Coverage</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-900 dark:text-white font-mono">{totalMMProgress}%</span>
                <span className="text-xs text-slate-500 dark:text-slate-500 font-sans">MM 60/40</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] font-mono text-slate-500 dark:text-slate-500">
                  <span>SSCI Lectures (60%) — {videoPct}%</span>
                  <span>{Math.round(totalVideoLogged)} / {Math.round(totalVideoTarget)} min</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${videoPct}%` }}></div>
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] font-mono text-slate-500 dark:text-slate-500">
                  <span>Application (40%) — {eocqPct}%</span>
                  <span>{totalEOCQCompleted} / {totalEOCQTarget} Qs</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 overflow-hidden">
                  <div className="bg-amber-500/60 h-full" style={{ width: `${eocqPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Study Resource Alignment */}
          <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-0.5 bg-emerald-500 h-full"></div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-1">Study Resource Alignment</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-900 dark:text-white font-mono">{notesCoveragePct}%</span>
                <span className="text-xs text-slate-500 dark:text-slate-500 font-sans">Notes Coverage</span>
              </div>
            </div>
            <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-1 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${notesCoveragePct}%` }}></div>
            </div>
          </div>

          {/* Study Runway Velocity */}
          <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-0.5 bg-indigo-500 h-full"></div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-1">Study Runway Velocity</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-900 dark:text-white font-mono">{currentVelocity.toFixed(1)}h</span>
                <span className="text-xs text-slate-500 dark:text-slate-500 font-sans">/ {targetVelocity}h target</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-500 font-mono">
              <span>{currentWeekly.toFixed(1)}h / {weeklyRequired.toFixed(1)}h this week</span>
              <span className={velocityRatio >= 100 ? 'text-emerald-500 font-bold' : 'text-slate-500'}>
                {velocityRatio >= 100 ? 'On Track' : `${velocityRatio}%`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Primary Working Section split */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left Column (2/3): Combined Mission + Timer Workspace + Timeline */}
        <div className="space-y-6 md:col-span-2">
          
          {/* Today's Directives: Combined Study Mission & Timer */}
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-0.5 h-full ${dailyMission?.isRecoveryMission ? 'bg-rose-500' : activeSession ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-slate-200'}`}></div>
            
            {/* Sprint M10 — Mission Control */}
            {dailyMission && <MissionControlCard onTriggerBrief={triggerMissionBrief} />}
            {/* Legacy preserved for rollback via {false && (...)} */}
            {false && (
              <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-0.5">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                      {dailyMission.isRecoveryMission ? 'Active Recovery Alert Mission' : 'Today\'s Recommended Study Mission'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wider">OPERATIONAL PRIORITY VECTOR</p>
                  </div>
                  <span className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider">
                    {dailyMission.subjectCode}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                       1. Active Target Sector
                     </span>
                     <div className="flex items-center space-x-2">
                       <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 dark:text-slate-300 dark:bg-slate-800 font-mono">
                         Reading {dailyMission.readingNumber}
                       </span>
                       <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 dark:text-slate-300 dark:bg-slate-800 font-mono">
                         LOS {dailyMission.losCode}
                       </span>
                     </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-1 font-sans">
                      {dailyMission.readingTitle}
                    </h3>
                    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans mt-0.5">
                      {dailyMission.statement}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                       2. Priority Vector (Why)
                     </span>
                    <p className="text-base text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                      {dailyMission.reason}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                       3. Target Duration & Reading Gaps
                     </span>
                     <p className="text-base text-slate-700 dark:text-slate-300 font-mono">
                       Estimated Time: <strong className="text-slate-900 dark:text-white">{dailyMission.estimatedDurationHours} hours</strong> 
                       <span className="block text-sm text-slate-500 dark:text-slate-400 mt-1">
                         Remaining reading target time: {dailyMission.remainingReadingHours} hours
                       </span>
                     </p>
                     {/* Micro-progress: live session elapsed vs daily target */}
                     {activeSession && (
                       <div className="mt-2 space-y-1">
                         <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                           <span>Session elapsed vs daily target</span>
                           <span>{formatTime(sessionElapsedTime)} / {dailyMission.remainingReadingHours.toFixed(1)}h</span>
                         </div>
                         <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((sessionElapsedTime / 3600 / (dailyMission.remainingReadingHours || 1)) * 100))}%` }}></div>
                         </div>
                       </div>
                     )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                       4. Prepared Study Assets
                     </span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {dailyMission.suggestedNotes.length > 0 ? (
                        dailyMission.suggestedNotes.map(n => (
                          <button
                            key={n.id}
                            onClick={() => {
                              setSelectedNoteId(n.id);
                              setActiveTab('notes');
                            }}
                            className="inline-flex items-center space-x-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-1 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <FileText className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                            <span className="max-w-[120px] truncate">{n.title}</span>
                          </button>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No notes created yet.</span>
                      )}

                      {dailyMission.suggestedFormulae.length > 0 ? (
                        dailyMission.suggestedFormulae.map(f => (
                          <div
                            key={f.id}
                            className="inline-flex items-center space-x-1 bg-amber-50/50 border border-amber-100 px-2 py-0.5 text-[9px] text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-300 font-mono"
                            title={f.description}
                          >
                            <span className="font-bold shrink-0">Formula:</span>
                            <code className="truncate max-w-[150px]">{f.latexExpression}</code>
                          </div>
                        ))
                      ) : null}

                      {dailyMission.requiredResources.map(r => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedResourceId(r.id);
                            setActiveTab('resources');
                          }}
                          className="inline-flex items-center space-x-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer font-sans"
                        >
                          <BookOpen className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                          <span className="max-w-[120px] truncate">{r.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timer Workspace — Direct extension of mission */}
            <div className={`p-6 ${dailyMission ? '' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${(!activeSession || isSessionPaused) ? 'hidden' : ''}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${!activeSession ? 'bg-slate-300' : isSessionPaused ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
                    </span>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                      Today's Active Study Session Workspace
                    </h2>
                  </div>
                  <p className="text-base text-slate-500 dark:text-slate-400 font-sans">
                    {!activeSession ? 'Study timer is idle' : isSessionPaused ? 'Timer is paused' : 'Active focus session timing'}
                  </p>
                </div>

                <div className="mt-2 md:mt-0 flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-mono text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {formatTime(sessionElapsedTime)}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 dark:text-slate-500 uppercase">
                      {!activeSession ? 'Idle' : isSessionPaused ? 'Paused' : 'Active Elapsed'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Controller Body */}
              {!activeSession ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/[0.15] dark:bg-slate-900/20 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider block mb-1">
                        Mission Study Target
                      </span>
                      {dailyMission ? (
                        <div className="space-y-1">
                          <span className="bg-slate-900 text-white px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider dark:bg-white dark:text-slate-900">
                            {dailyMission.subjectCode}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            Reading {dailyMission.readingNumber}: {dailyMission.readingTitle}
                          </h4>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No mission active.</p>
                      )}
                    </div>
                    {dailyMission && (
                      <button
                        onClick={triggerMissionBrief}
                        className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-bold uppercase tracking-wider cursor-pointer font-sans dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        Trigger Pre-Study Brief
                      </button>
                    )}
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/[0.15] dark:bg-slate-900/20 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider block mb-1">
                        Unlinked Timer Session
                      </span>
                      <p className="text-base text-slate-500 dark:text-slate-400">
                        Record review periods, general reading speed checks, or mock exams with an unlinked stopwatch.
                      </p>
                    </div>
                    <button
                      onClick={() => startStudySession({})}
                      className="mt-4 w-full border border-slate-300 hover:bg-slate-50 text-slate-800 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer font-sans dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Start General Stopwatch
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3 bg-slate-50/[0.2] dark:bg-slate-900/10 p-3 border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Linked Subject</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {activeSession.linkedSubjectId ? subjects.find(s => s.id === activeSession.linkedSubjectId)?.code : 'General'}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Linked Reading</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {activeSession.linkedReadingId ? `Reading ${readings.find(r => r.id === activeSession.linkedReadingId)?.number}` : 'None'}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Starting Confidence</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {activeSession.confidenceBefore ? `${activeSession.confidenceBefore}/5` : 'Not rated'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1.5 justify-end">
                    {isSessionPaused ? (
                      <button
                        onClick={resumeStudySession}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center space-x-1.5 cursor-pointer font-sans"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Resume</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => pauseStudySession()}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold flex items-center space-x-1.5 cursor-pointer font-sans dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        <Pause className="h-3.5 w-3.5 fill-current" />
                        <span>Pause</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setFocusRating(7);
                        setConfidenceRatingAfter(4);
                        setShowFinishRating(true);
                      }}
                      className="border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center space-x-1.5 cursor-pointer font-sans dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Square className="h-3.5 w-3.5" />
                      <span>Finish & Save</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm("Discard active session?")) {
                          cancelStudySession();
                          setShowFinishRating(false);
                        }
                      }}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 cursor-pointer"
                      title="Discard Session"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>

                  {showFinishRating && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Mental Focus (1-10):</label>
                        <div className="flex justify-between gap-1">
                          {[1,2,3,4,5,6,7,8,9,10].map(val => (
                            <button
                              key={val}
                              onClick={() => setFocusRating(val)}
                              className={`flex-1 text-center py-1.5 text-xs font-mono border cursor-pointer ${focusRating === val ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 font-bold' : 'border-slate-200 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50'}`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Post-Session Confidence (1-5):</label>
                        <div className="flex justify-between gap-1">
                          {[1,2,3,4,5].map(val => (
                            <button
                              key={val}
                              onClick={() => setConfidenceRatingAfter(val)}
                              className={`flex-1 text-center py-1.5 text-xs font-mono border cursor-pointer ${confidenceRatingAfter === val ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 font-bold' : 'border-slate-200 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50'}`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Questions Solved:</label>
                        <input
                          type="number"
                          min={0}
                          value={questionsSolved}
                          onChange={e => setQuestionsSolved(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full py-1.5 px-3 text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] text-slate-800 dark:text-slate-200 rounded"
                          placeholder="Enter number of questions attempted..."
                        />
                      </div>

                      <button
                        onClick={() => {
                          finishStudySession(focusRating, confidenceRatingAfter);
                          const todayStr = new Date().toISOString().split('T')[0];
                          const todaySessions = sessionHistory.filter(s => s.startTime.startsWith(todayStr) && s.status === 'Completed');
                          const todayMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
                          const todayHours = (todayMinutes / 60).toFixed(1);
                          const losCompletedToday = losList.filter(l => l.status === 'Completed' && l.lastReviewed === todayStr).length;
                          const formulasCovered = formulas.filter(f => f.isMemorized).length;
                          const avgConfidence = losList.length > 0
                            ? (losList.reduce((acc, l) => acc + (l.confidence || 2.5), 0) / losList.length).toFixed(1)
                            : '2.5';
                          const tomorrowMission = dailyMission?.readingTitle || 'Review weak areas';
                          const reflections = [
                            'Great focus session! Keep the momentum going.',
                            'Consider revisiting formulas tomorrow for reinforcement.',
                            activeSession?.linkedReadingId ? `You covered reading content - try practice questions next.` : 'Solid session - try linking to a specific LOS next time.',
                            'Consistency is key - every session builds toward exam day.',
                          ];
                          setDailyReviewData({
                            todayHours,
                            losCompletedToday,
                            questionsSolved: questionsSolved || 0,
                            formulasCovered,
                            avgConfidence,
                            tomorrowMission,
                            reflection: reflections[Math.floor(Math.random() * reflections.length)],
                            focusRating,
                            confidenceRatingAfter,
                          });
                          setShowFinishRating(false);
                          setShowDailyReview(true);
                          setQuestionsSolved(0);
                        }}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer font-sans"
                      >
                        Save Study Session
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mission Controls Footer */}
            {dailyMission && (
              <div className="px-6 pb-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  onClick={() => setActiveTab('curriculum')}
                  className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span>Syllabus Navigation</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>

                {!activeSession ? (
                  <button
                    onClick={triggerMissionBrief}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Launch Focused Mission</span>
                  </button>
                ) : activeSession.linkedLOSId === dailyMission.losId ? (
                  <span className="inline-flex items-center space-x-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 px-3 py-1.5">
                    <span className="animate-pulse h-1.5 w-1.5 bg-emerald-500"></span>
                    <span>Active In Progress</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (window.confirm("Switch current active study timer session?")) {
                        cancelStudySession();
                        startStudySession({
                          linkedSubjectId: dailyMission.subjectId,
                          linkedReadingId: dailyMission.readingId,
                          linkedLOSId: dailyMission.losId
                        });
                      }
                    }}
                    className="border border-slate-200 text-slate-500 hover:bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer dark:border-slate-700 dark:text-slate-400"
                  >
                    <span>Switch Session</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Planner Widget */}
          <CfaStudyPlanCard
            readings={plannerReadings}
            losList={losList}
            sessionHistory={sessionHistory}
            plannerProgress={plannerProgress}
            targetFinishDateStr={examReadinessReport?.projectedFinishDate || settings.examDate || '2026-09-01'}
            reviewBuffer={settings.reviewBuffer || 14}
            examDate={settings.examDate || '2026-09-01'}
            events={[]}
            dailyMission={dailyMission}
            studyStrategy={studyStrategy}
            subjects={subjects}
          />

          {/* 7-Day Performance Dynamics */}
          {dailySnapshotsList.length > 0 && (
            <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    7-Day Performance Dynamics
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wider">HISTORICAL SNAPSHOT PROGRESS</p>
                </div>
                <TrendingUp className="h-4 w-4 text-indigo-500" />
              </div>

              {/* SVG Line Graph */}
              <div className="w-full h-36 relative pt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 120">
                  <line x1="0" y1="20" x2="600" y2="20" className="stroke-slate-100 dark:stroke-slate-800 stroke-1" strokeDasharray="3" />
                  <line x1="0" y1="60" x2="600" y2="60" className="stroke-slate-100 dark:stroke-slate-800 stroke-1" strokeDasharray="3" />
                  <line x1="0" y1="100" x2="600" y2="100" className="stroke-slate-100 dark:stroke-slate-800 stroke-1" strokeDasharray="3" />
                  
                  {(() => {
                    const width = 600;
                    const height = 120;
                    const pointsCount = dailySnapshotsList.length;
                    const step = width / (pointsCount - 1);
                    
                    const readinessPoints = dailySnapshotsList.map((snap, i) => {
                      const x = i * step;
                      const y = height - 10 - ((snap.readinessScore / 100) * 100);
                      return `${x},${y}`;
                    }).join(' ');

                    const healthPoints = dailySnapshotsList.map((snap, i) => {
                      const x = i * step;
                      const y = height - 10 - ((snap.knowledgeHealth / 100) * 100);
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <>
                        <polyline fill="none" stroke="#4f46e5" strokeWidth="2.5" points={readinessPoints} strokeLinecap="round" />
                        <polyline fill="none" stroke="#10b981" strokeWidth="2" points={healthPoints} strokeLinecap="round" strokeDasharray="4 2" />
                        
                        {dailySnapshotsList.map((snap, i) => {
                          const x = i * step;
                          const yR = height - 10 - ((snap.readinessScore / 100) * 100);
                          const yH = height - 10 - ((snap.knowledgeHealth / 100) * 100);
                          return (
                            <g key={i} className="cursor-pointer">
                              <title>{`Date: ${snap.date}`}</title>
                              <circle cx={x} cy={yR} r="3" fill="#4f46e5" />
                              <circle cx={x} cy={yH} r="2.5" fill="#10b981" />
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-0.5 bg-indigo-500 inline-block"></span>
                    <span>Readiness Probability</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-0.5 bg-emerald-500 inline-block"></span>
                    <span>Knowledge Health</span>
                  </div>
                </div>
                <span>Timeline Interval: Daily startup snapshot</span>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (1/3): Active Memory Drawer */}
        <div className="space-y-6 flex flex-col">
          {/* Active Revision Queue */}
          {revisionQueue && (
            <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 relative overflow-hidden space-y-4">
              <div className="absolute top-0 left-0 w-0.5 h-full bg-indigo-500"></div>
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                    Active Revision Queue
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wider">SPACED CARD INTERVAL QUEUE ({revisionQueue.length} items)</p>
                </div>
                <Award className="h-4 w-4 text-indigo-500 shrink-0" />
              </div>

              {revisionQueue.length === 0 ? (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic">Revision queue completely clear! Awesome recall.</p>
              ) : (
                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                  {revisionQueue.map((item, idx) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        if (item.type === 'note') {
                          setSelectedNoteId(item.id);
                          setActiveTab('notes');
                        } else if (item.type === 'formula') {
                          const f = formulas.find(form => form.id === item.id);
                          if (f) setSelectedDashboardFormula(f);
                        } else if (item.type === 'los') {
                          selectLOS(item.id);
                          setActiveTab('curriculum');
                        }
                      }}
                      className="p-2.5 border border-slate-100 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-slate-50/[0.1] cursor-pointer transition-colors flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate flex-1 min-w-0 pr-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block font-sans">
                          {item.title}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded uppercase inline-block mt-0.5">
                          {item.type}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-500">
                          Priority {item.priorityScore}
                        </span>
                        {item.confidenceRating && (
                          <span className="block text-[8px] text-amber-500 font-bold font-mono">
                            {item.confidenceRating.toFixed(1)} ★
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Burnout Warning Card */}
          {burnoutDetected && (
            <div className="bg-rose-50 border border-rose-200 dark:border-rose-950/20 dark:bg-rose-950/10 p-4 flex items-start space-x-3 text-rose-800 dark:text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Burnout Alert Detected</span>
                <p className="text-base leading-relaxed">
                  High studying frequency or multiple sessions completed after 11 PM have been recorded. System recommends activating a Recovery study mission.
                </p>
              </div>
            </div>
          )}

          {/* Curriculum Blindspots & Gaps */}
          {graphAnalyzerHealthReport && (
            <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                    Curriculum Blindspots & Gaps
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wider">MISSING LINKS CHECKLIST</p>
                </div>
                <GitBranch className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>

              <div className="space-y-3">
                {/* Disconnected Notes */}
                {graphAnalyzerHealthReport.isolatedNotes.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-500 uppercase block">Unlinked Notes ({graphAnalyzerHealthReport.isolatedNotes.length})</span>
                    <div className="space-y-1">
                      {graphAnalyzerHealthReport.isolatedNotes.slice(0, 2).map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            setSelectedNoteId(n.id);
                            setActiveTab('notes');
                          }}
                          className="p-2 border border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-[10px] cursor-pointer dark:border-slate-800 dark:bg-slate-900/20 truncate"
                        >
                          {n.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orphan Formulas */}
                {graphAnalyzerHealthReport.orphanFormulas.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-500 uppercase block">Unlinked Formulas ({graphAnalyzerHealthReport.orphanFormulas.length})</span>
                    <div className="space-y-1">
                      {graphAnalyzerHealthReport.orphanFormulas.slice(0, 2).map(f => (
                        <div 
                          key={f.id} 
                          className="p-2 border border-slate-100 bg-slate-50/50 text-[10px] dark:border-slate-800 dark:bg-slate-900/20 font-mono truncate"
                          title={f.description}
                        >
                          {f.name} (<code>{f.latexExpression}</code>)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Resources Readings */}
                {graphAnalyzerHealthReport.missingResourcesReadings.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-500 uppercase block">Missing Resources ({graphAnalyzerHealthReport.missingResourcesReadings.length})</span>
                    <div className="space-y-1">
                      {graphAnalyzerHealthReport.missingResourcesReadings.slice(0, 2).map(r => (
                        <div 
                          key={r.id} 
                          onClick={() => {
                            setSelectedReadingId(r.id);
                            setActiveTab('curriculum');
                          }}
                          className="p-2 border border-rose-100 bg-rose-50/[0.03] hover:bg-rose-50/[0.08] text-[10px] cursor-pointer dark:border-rose-950/10 truncate font-sans text-rose-800 dark:text-rose-400"
                        >
                          Reading {r.number}: {r.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reading Completion Statistics */}
          <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                  Reading Completion
                </h2>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">READING-LEVEL PROGRESS</p>
              </div>
              <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
            {(() => {
              const totalReadings = readings.length;
              const completedReadings = readings.filter(r => {
                const readingLos = losList.filter(l => l.readingId === r.id);
                return readingLos.length > 0 && readingLos.every(l => l.status === 'Completed');
              }).length;
              const pct = totalReadings > 0 ? Math.round((completedReadings / totalReadings) * 100) : 0;
              return (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{pct}%</span>
                    <span className="text-[10px] font-mono text-slate-500">{completedReadings} / {totalReadings} readings</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Formula Coverage */}
          <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                  Formula Coverage
                </h2>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">MEMORIZED EQUATIONS</p>
              </div>
              <HelpCircle className="h-4 w-4 text-amber-500 shrink-0" />
            </div>
            {(() => {
              const total = formulas.length;
              const memorized = formulas.filter(f => f.isMemorized).length;
              const pct = total > 0 ? Math.round((memorized / total) * 100) : 0;
              return (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{pct}%</span>
                    <span className="text-[10px] font-mono text-slate-500">{memorized} / {total} formulas</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* AI Executive Coach Insight */}
          <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                  Executive Coach
                </h2>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">DAILY RECOMMENDATION</p>
              </div>
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            </div>
            {coachInsight ? (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {coachInsight}
              </p>
            ) : coachInsightLoading ? (
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full w-3/4 rounded animate-shimmer" />
                </div>
                <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full w-1/2 rounded animate-shimmer" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-400 italic">
                  Generate a personalized coaching tip based on your current study patterns.
                </p>
                <button
                  onClick={() => {
                    if (!settings || !dailyMission) return;
                    setCoachInsightLoading(true);
                    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                    const yesterdaySessions = sessionHistory.filter(s =>
                      s.startTime.startsWith(yesterdayStr) && s.status === 'Completed'
                    );
                    aiJobQueue.queueJob(
                      'task-coach-recommendation',
                      'dashboard-coach-tip',
                      () => ContextBuilderService.buildCoachRecommendationContext(
                        settings,
                        {
                          yesterdayHours: yesterdaySessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60,
                          streakDays: user?.streakDays || 0,
                          averageConfidence: losList.length > 0
                            ? losList.reduce((acc, l) => acc + (l.confidence || 2.5), 0) / losList.length
                            : 2.5,
                          recentSessionsCount: sessionHistory.filter(s => s.status === 'Completed').length
                        },
                        {
                          readingTitle: dailyMission.readingTitle,
                          losCode: dailyMission.losCode,
                          estimatedDurationHours: dailyMission.estimatedDurationHours
                        }
                      ),
                      settings,
                      (status, result) => {
                        if (status === 'READY' && result?.text) {
                          setCoachInsight(result.text);
                        }
                        if (status === 'READY' || status === 'FAILED') {
                          setCoachInsightLoading(false);
                        }
                      }
                    );
                  }}
                  className="px-3 py-1.5 text-[9px] font-mono font-bold uppercase border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer transition-all"
                >
                  Generate Tip
                </button>
              </div>
            )}
          </div>

          {/* Weak Topics Detection */}
          {weakTopics && weakTopics.subjectWeakness.length > 0 && (
            <div className="bg-white dark:bg-[#0B0F19] p-5 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                    Weak Topics
                  </h2>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">INTELLIGENCE DETECTION</p>
                </div>
                <Brain className="h-4 w-4 text-rose-500 shrink-0" />
              </div>
              <div className="space-y-2">
                {weakTopics.subjectWeakness.slice(0, 4).map(w => (
                  <div key={w.subjectId} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {w.code}
                      </span>
                      <span className="truncate text-slate-700 dark:text-slate-300">{w.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold shrink-0 ml-2 ${
                      w.weaknessScore > 70 ? 'text-rose-500' : w.weaknessScore > 40 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {w.weaknessScore}%
                    </span>
                  </div>
                ))}
              </div>
              {weakTopics.topWeakestSubject && (
                <p className="text-[9px] text-slate-400 italic">
                  Weakest: {weakTopics.topWeakestSubject}
                </p>
              )}
            </div>
          )}

          {/* Syllabus Progress (moved to right column) */}
          <CfaSyllabusProgressPanel
            subjects={subjects}
            readings={readings}
            losList={losList}
          />

        </div>

      </div>

      {/* Mission Brief Drawer */}
      {dailyMission && (
        <MissionBriefDrawer
          isOpen={showMissionBrief}
          onClose={() => setShowMissionBrief(false)}
          onBeginStudy={() => {
            setShowMissionBrief(false);
            startStudySession({
              linkedSubjectId: dailyMission.subjectId,
              linkedReadingId: dailyMission.readingId,
              linkedLOSId: dailyMission.losId
            });
          }}
          mission={{
            subjectCode: dailyMission.subjectCode,
            readingNumber: dailyMission.readingNumber,
            readingTitle: dailyMission.readingTitle,
            losCode: dailyMission.losCode,
            statement: dailyMission.statement,
            estimatedDurationHours: dailyMission.estimatedDurationHours,
            confidenceLevel: dailyMission.confidenceLevel
          }}
          loading={missionBriefLoading}
          failed={missionBriefFailed}
          brief={missionBrief}
        />
      )}

      {/* Daily Session Review Modal */}
      {showDailyReview && dailyReviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
              <h2 className="text-lg font-bold text-white">Today's Summary</h2>
              <p className="text-indigo-200 text-xs font-mono mt-0.5">SESSION COMPLETED · {new Date().toLocaleDateString()}</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Time Studied</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{dailyReviewData.todayHours}h</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Questions Solved</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{dailyReviewData.questionsSolved}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">LOS Completed</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{dailyReviewData.losCompletedToday}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Avg Confidence</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{dailyReviewData.avgConfidence}/5.0</p>
                </div>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-lg p-3 space-y-1">
                <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} /> AI Reflection
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{dailyReviewData.reflection}</p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
                <div className="text-xs text-slate-500 font-mono">
                  Tomorrow's Mission: <span className="font-bold text-slate-800 dark:text-slate-200">{dailyReviewData.tomorrowMission}</span>
                </div>
                <button
                  onClick={() => setShowDailyReview(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formula Active Recall Modal */}
      {selectedDashboardFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden dark:border-slate-800 dark:bg-slate-900 animate-fade-in p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Active Recall Card
              </h3>
              <button 
                onClick={() => setSelectedDashboardFormula(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FormulaCard 
              formula={selectedDashboardFormula} 
              onUpdate={(id, updates) => {
                updateFormula(selectedDashboardFormula.id, updates);
                setSelectedDashboardFormula(prev => prev ? { ...prev, ...updates } : null);
              }} 
            />
          </div>
        </div>
      )}

    </div>
  );
};
