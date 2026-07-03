import React from 'react';
import { useApp } from '../context/AppContext';
import { CoachPlannerTab } from '../applications/cfa/curriculum/components/CoachPlannerTab';
import {
  Calendar,
  Clock,
  Target,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Play,
  BarChart3,
  Timer,
  Layers,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import {
  MM_START_DATE, MM_END_DATE, MM_TARGET_BUDGET_HOURS,
  MM_DAYS_OF_REVIEW, MM_PLANNED_HOURS_PER_WEEK,
  Reading, Subject, ReadingStudyTargets
} from '../types';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const TODAY = new Date('2026-06-28');

function parseDate(s: string): Date { return new Date(s + 'T00:00:00'); }
function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function diffDays(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}



// ──────────────────────────────────────────────
// Tab 1: MM Planner Dashboard Block
// ──────────────────────────────────────────────

const MMPlannerDashboard: React.FC = () => {
  const { plannerReadings, plannerProgress, sessionHistory, settings } = useApp();

  const startDate = parseDate(MM_START_DATE);
  const endDate = parseDate(MM_END_DATE);
  const totalDays = diffDays(startDate, endDate);
  const workWeeks = Math.floor(totalDays / 7);

  // Unweighted analysis
  const totalReadingsCount = plannerReadings.length;
  const totalVideoMinutesRaw = plannerReadings.reduce((sum, r) => sum + (r.targets?.videoDurationMinutes || 0), 0);
  const avgHoursPerReading = totalReadingsCount > 0 ? (totalVideoMinutesRaw / 60) / totalReadingsCount : 0;

  // Weighted analysis
  const totalWeightedHours = plannerReadings.reduce((sum, r) => {
    const baseHours = (r.targets?.videoDurationMinutes || 0) / 60;
    return sum + baseHours * (r.targets?.weightingFactor || 1);
  }, 0);

  const totalLoggedMinutes = plannerProgress.reduce((sum, p) => sum + p.loggedVideoMinutes, 0);
  const totalLoggedHours = totalLoggedMinutes / 60;

  // Runway alert
  const latestStartDays = Math.ceil(MM_TARGET_BUDGET_HOURS / MM_PLANNED_HOURS_PER_WEEK * 7);
  const latestStart = addDays(endDate, -latestStartDays);
  const displayLatestStart = latestStart > TODAY ? latestStart : TODAY;

  const requiredHoursPerWeek = MM_TARGET_BUDGET_HOURS / workWeeks;
  const hoursPerDay = MM_TARGET_BUDGET_HOURS / totalDays;

  // Velocity guidance
  const daysSinceStart = diffDays(startDate, TODAY);
  const currentPace = daysSinceStart > 0 ? totalLoggedHours / daysSinceStart : 0;
  const remainingDays = diffDays(TODAY, endDate);
  const remainingHours = Math.max(0, MM_TARGET_BUDGET_HOURS - totalLoggedHours);
  const requiredPace = remainingDays > 0 ? remainingHours / remainingDays : 0;
  const isOnTrack = currentPace >= requiredPace;
  const extraHoursNeeded = Math.max(0, requiredPace - currentPace);

  return (
    <div className="space-y-6">
      {/* Unweighted vs Weighted Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Unweighted Panel */}
        <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-0.5 h-full bg-blue-500"></div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold block mb-3">
            Unweighted Analysis
          </span>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500 uppercase block">Total Readings</span>
              <span className="text-2xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono">{totalReadingsCount}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500 uppercase block">Avg Hours / Reading</span>
              <span className="text-2xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono">{avgHoursPerReading.toFixed(1)}h</span>
            </div>
          </div>
          <div className="mt-4 text-[10px] text-slate-500 dark:text-slate-500 font-mono">
            Raw video total: {fmtDuration(totalVideoMinutesRaw)}
          </div>
        </div>

        {/* Weighted Panel */}
        <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-0.5 h-full bg-amber-500"></div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold block mb-3">
            Weighted Analysis
          </span>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500 uppercase block">Required Hours</span>
              <span className="text-2xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono">
                {totalWeightedHours.toFixed(0)}h
              </span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500 uppercase block">Hours Logged</span>
              <span className="text-2xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono">
                {totalLoggedHours.toFixed(1)}h
              </span>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 dark:bg-[#101116] h-1 overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${totalWeightedHours > 0 ? Math.min(100, Math.round((totalLoggedHours / totalWeightedHours) * 100)) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Runway Alert */}
      <div className="flex items-start gap-3 border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Deadline Alert:</span>{' '}
          With {fmtHours(MM_TARGET_BUDGET_HOURS * 60)} required weighted study hours, putting in{' '}
          {MM_PLANNED_HOURS_PER_WEEK} hours per week, the latest you can start studying is{' '}
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {fmtDate(displayLatestStart)}
          </span>
          .
          <div className="mt-1 text-[10px] text-amber-600/70 dark:text-amber-400/70">
            ({requiredHoursPerWeek.toFixed(1)} hrs/wk required | ~{hoursPerDay.toFixed(2)} hrs/day)
          </div>
        </div>
      </div>

      {/* Velocity Guidance */}
      <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Study Velocity Guidance
          </span>
        </div>
        {isOnTrack ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-bold">ON TRACK</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              — You are studying at {currentPace.toFixed(2)} hrs/day, exceeding the required {requiredPace.toFixed(2)} hrs/day pace.
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-bold uppercase">Delayed</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
              Current pace: <strong>{currentPace.toFixed(2)} hrs/day</strong> — Required pace: <strong>{requiredPace.toFixed(2)} hrs/day</strong>
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 font-sans">
              You need to add <strong className="text-amber-600 dark:text-amber-400">{extraHoursNeeded.toFixed(2)} extra hours per day</strong> to your routine to reach the {MM_TARGET_BUDGET_HOURS}-hour target by {fmtDate(endDate)}.
            </p>
          </div>
        )}
        <div className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          {remainingHours.toFixed(0)} hours remaining • {remainingDays} days to go
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Tab 2: Dynamic Ramp-Up Timeline
// ──────────────────────────────────────────────

const RampUpMatrix: React.FC = () => {
  const startDate = parseDate(MM_START_DATE);
  const endDate = parseDate(MM_END_DATE);
  const deadlineAnchor = parseDate('2026-09-13');
  const criticalThreshold = parseDate('2026-10-11');

  const rows: Array<{ weekStart: Date; label: string }> = [];
  let cursor = new Date(startDate);
  while (cursor < endDate) {
    const label = cursor >= TODAY ? fmtDate(cursor) : '✓ ' + fmtDate(cursor);
    rows.push({ weekStart: new Date(cursor), label });
    cursor = addDays(cursor, 7);
  }

  return (
    <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#F8FAFC]">
          Dynamic Ramp-Up Timeline
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#1e2026]">
              <th className="py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400">Start Date</th>
              <th className="py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400">Days Until Review</th>
              <th className="py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400">8 Hrs/Wk</th>
              <th className="py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400">10 Hrs/Wk</th>
              <th className="py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400">12 Hrs/Wk</th>
              <th className="py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400">14 Hrs/Wk</th>
              <th className="py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400">16 Hrs/Wk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const daysUntil = diffDays(row.weekStart, endDate);
              const weeksRemaining = daysUntil / 7;
              const isPast = row.weekStart <= TODAY;
              const isDeadlineAnchor = row.weekStart.toDateString() === deadlineAnchor.toDateString();
              const isCritical = row.weekStart > criticalThreshold;

              let rowClass = 'border-b border-slate-100 dark:border-[#1e2026]';
              if (isDeadlineAnchor) rowClass += ' border-2 border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-900/10';
              else if (isPast) rowClass += ' opacity-60';

              const cellClass = isCritical && !isPast ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300';

              return (
                <tr key={i} className={rowClass}>
                  <td className={`py-2 pr-3 font-medium ${isDeadlineAnchor ? 'text-amber-700 dark:text-amber-300' : cellClass}`}>
                    {row.label}
                  </td>
                  <td className={`py-2 pr-3 ${cellClass}`}>{daysUntil}</td>
                  {[8, 10, 12, 14, 16].map(hrs => {
                    const val = hrs * weeksRemaining;
                    const sufficient = val >= MM_TARGET_BUDGET_HOURS;
                    return (
                      <td key={hrs} className={`py-2 pr-3 ${isPast ? 'text-green-600 dark:text-green-400' : sufficient ? 'text-emerald-600 dark:text-emerald-400' : cellClass}`}>
                        {isPast ? <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{val.toFixed(0)}</span> : val.toFixed(0)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Tab 3: 60/40 Progress Matrix with CRUD
// ──────────────────────────────────────────────

const SubjectAccordion: React.FC<{
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  readingIds: string[];
}> = ({ subjectId, subjectName, subjectCode, readingIds }) => {
  const { plannerReadings, plannerProgress, logVideoMinutes, recordEOCQCompleted, getReadingProgress } = useApp();
  const [open, setOpen] = React.useState(true);

  const readings = plannerReadings.filter(r => readingIds.includes(r.id));

  return (
    <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{subjectCode}</span>
        <span className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC]">{subjectName}</span>
        <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">{readings.length} readings</span>
      </button>

      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800/60 dark:border-[#1e2026]">
          {readings.map(r => {
            const prog = plannerProgress.find(p => p.readingId === r.id);
            const loggedMin = prog?.loggedVideoMinutes ?? 0;
            const completedEOCQ = prog?.completedEOCQ ?? 0;
            const pct = getReadingProgress(r.id);
            const t = r.targets;
            if (!t) return null;

            return (
              <div key={r.id} className="px-4 py-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-[#101116] dark:text-slate-400">
                    {subjectCode}
                  </span>
                  <span className="text-xs font-medium text-slate-800 dark:text-[#F8FAFC]">
                    R{r.number}: {r.title}
                  </span>
                  <span className="ml-auto text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {pct}%
                  </span>

                </div>

                <div className="mb-3 h-1 w-full overflow-hidden bg-slate-100 dark:bg-[#101116]">
                  <div
                    className="h-full bg-slate-900 transition-all duration-300 dark:bg-white"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="border border-slate-200 dark:border-[#1e2026] px-1.5 py-0.5">
                    {t.pageCount} pages
                  </span>
                  <span className="border border-slate-200 dark:border-[#1e2026] px-1.5 py-0.5">
                    {t.totalLOSCount} LOS
                  </span>
                  <span className="border border-slate-200 dark:border-[#1e2026] px-1.5 py-0.5">
                    {t.eocqCount} EOCQ
                  </span>
                  <span className="border border-slate-200 dark:border-[#1e2026] px-1.5 py-0.5">
                    WF: {t.weightingFactor}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* Video track (60%) */}
                  <div className="border border-slate-100 dark:border-[#1e2026] bg-slate-50/[0.15] dark:bg-[#101116]/30 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Play className="h-3 w-3" />
                        Video Viewing
                        <span className="ml-1 bg-blue-100 px-1 text-[9px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">60%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Target: {t.videoDurationString}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border border-slate-200 dark:border-[#1e2026] bg-white dark:bg-[#101116] px-2 py-1">
                        <Timer className="h-3 w-3 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {fmtDuration(loggedMin)}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          / {fmtDuration(t.videoDurationMinutes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => logVideoMinutes(r.id, 5)}
                          className="border border-slate-200 dark:border-[#1e2026] px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                          +5m
                        </button>
                        <button onClick={() => logVideoMinutes(r.id, 15)}
                          className="border border-slate-200 dark:border-[#1e2026] px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                          +15m
                        </button>
                        <button onClick={() => logVideoMinutes(r.id, 30)}
                          className="border border-slate-200 dark:border-[#1e2026] px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                          +30m
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Application track (40%) */}
                  <div className="border border-slate-100 dark:border-[#1e2026] bg-slate-50/[0.15] dark:bg-[#101116]/30 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <BookOpen className="h-3 w-3" />
                        Q-Bank Application
                        <span className="ml-1 bg-emerald-100 px-1 text-[9px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">40%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Target: {t.eocqCount} Qs
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border border-slate-200 dark:border-[#1e2026] bg-white dark:bg-[#101116] px-2 py-1">
                        <CheckCircle className="h-3 w-3 text-slate-400" />
                        <input
                          type="number"
                          min={0}
                          max={t.eocqCount}
                          value={completedEOCQ}
                          onChange={e => recordEOCQCompleted(r.id, Math.min(t.eocqCount, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-12 text-xs font-medium text-slate-700 outline-none dark:bg-transparent dark:text-slate-300"
                        />
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          / {t.eocqCount}
                        </span>
                      </div>
                      <button onClick={() => recordEOCQCompleted(r.id, Math.min(t.eocqCount, completedEOCQ + 1))}
                        className="border border-slate-200 dark:border-[#1e2026] px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                        +1
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Main Planner Page
// ──────────────────────────────────────────────

export const Planner: React.FC = () => {
  const {
    plannerSubjects, plannerReadings,
    setActiveTab: setGlobalTab
  } = useApp();

  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'runway' | 'matrix' | 'planner'>('dashboard');

  const subjectsWithReadings = plannerSubjects
    .map(s => ({
      ...s,
      readingIds: plannerReadings.filter(r => r.subjectId === s.id).map(r => r.id),
    }))
    .filter(s => s.readingIds.length > 0);

  const tabs = [
    { id: 'dashboard' as const, label: 'Planner Dashboard', icon: Layers },
    { id: 'runway' as const, label: 'Operational Runway', icon: BarChart3 },
    { id: 'matrix' as const, label: '60/40 Progress Matrix', icon: Target },
    { id: 'planner' as const, label: 'Coach Planner', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
            Mark Meldrum Study Planner
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            60/40 weighted progress tracking • Video + Q-Bank application
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-[#1e2026]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                isActive
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-[#F8FAFC]'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <MMPlannerDashboard />}

      {activeTab === 'runway' && <RampUpMatrix />}

      {activeTab === 'matrix' && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#F8FAFC]">
                Multi-Dimensional Progress Tracking
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              Managed via Curriculum Database
            </span>
          </div>

          {subjectsWithReadings.length === 0 ? (
            <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] p-10 text-center">
              <p className="text-xs text-slate-400">No readings found. Add subjects and readings in the Curriculum Database tab.</p>
              <button
                onClick={() => setGlobalTab('curriculum')}
                className="mt-3 px-4 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-[#07080a] text-[10px] font-bold uppercase tracking-wider hover:opacity-90 cursor-pointer"
              >
                Go to Curriculum Database
              </button>
            </div>
          ) : (
            subjectsWithReadings.map(s => (
              <SubjectAccordion
                key={s.id}
                subjectId={s.id}
                subjectName={s.name}
                subjectCode={s.code}
                readingIds={s.readingIds}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'planner' && (
        <div className="bg-[#101116] border border-slate-800/50 rounded-xl p-5">
          <CoachPlannerTab />
        </div>
      )}
    </div>
  );
};

