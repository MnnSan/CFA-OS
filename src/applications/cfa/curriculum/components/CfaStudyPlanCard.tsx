import React, { useMemo } from 'react';
import { Reading, LearningOutcomeStatement, StudySession, PlannerReadingProgress, CalendarEvent, StudyStrategy } from '../../../../types';
import { BrainCircuit } from 'lucide-react';

interface StudyPlanCardProps {
  readings: Reading[];
  losList: LearningOutcomeStatement[];
  sessionHistory: StudySession[];
  plannerProgress: PlannerReadingProgress[];
  targetFinishDateStr: string;
  reviewBuffer: number;
  examDate: string;
  events: CalendarEvent[];
  dailyMission: {
    subjectCode: string;
    readingNumber: number;
    readingTitle: string;
  } | null;
  studyStrategy?: StudyStrategy | null;
  subjects?: { id: string; name: string; code: string }[];
}

const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateLabel(d: Date): string {
  return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const agendaSubjects: Array<{ code: string; subjectId: string; name: string }> = [
  { code: 'AA', subjectId: 'sub-asset-allocation', name: 'Asset Allocation' },
  { code: 'PC', subjectId: 'sub-portfolio-construction', name: 'Portfolio Construction' },
  { code: 'PM', subjectId: 'sub-performance-measurement', name: 'Performance Measurement' },
  { code: 'DRM', subjectId: 'sub-derivatives-risk-mgmt', name: 'Derivatives & Risk Mgmt' },
  { code: 'ETH', subjectId: 'sub-ethical-professional', name: 'Ethical & Professional' },
];

export const CfaStudyPlanCard: React.FC<StudyPlanCardProps> = ({
  readings,
  losList,
  sessionHistory,
  plannerProgress,
  targetFinishDateStr,
  reviewBuffer,
  examDate,
  events,
  dailyMission,
  studyStrategy,
  subjects: propSubjects,
}) => {
  const today = new Date('2026-06-30');
  const finishDate = new Date(targetFinishDateStr);
  const examDateTime = new Date(examDate);

  const studyDaysLeft = useMemo(() => {
    return Math.max(0, Math.ceil((finishDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }, [finishDate]);

  const weeksRemaining = useMemo(() => (studyDaysLeft / 7).toFixed(1), [studyDaysLeft]);

  const totalEOCQ = useMemo(() => {
    return readings.reduce((sum, r) => sum + (r.targets?.eocqCount || 0), 0);
  }, [readings]);

  const completedEOCQ = useMemo(() => {
    return plannerProgress.reduce((sum, p) => sum + (p.completedEOCQ || 0), 0);
  }, [plannerProgress]);

  const remainingQBank = totalEOCQ - completedEOCQ;

  const totalDays = useMemo(() => {
    return Math.max(1, Math.ceil((finishDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }, [finishDate]);

  const foundationPct = 35;
  const buildPct = 45;
  const masterPct = 100 - foundationPct - buildPct;
  const bufferDays = reviewBuffer;
  const activeDays = totalDays - bufferDays;

  const foundationDays = Math.round(activeDays * (foundationPct / 100));
  const buildDays = Math.round(activeDays * (buildPct / 100));
  const masteryDays = activeDays - foundationDays - buildDays;

  const totalForBar = activeDays + bufferDays;
  const foundationWidth = (foundationDays / totalForBar) * 100;
  const buildWidth = (buildDays / totalForBar) * 100;
  const masteryWidth = (masteryDays / totalForBar) * 100;
  const sandboxWidth = (bufferDays / totalForBar) * 100;

  const fiveDayAgenda = useMemo(() => {
    const days: Array<{
      date: Date;
      dayName: string;
      dateStr: string;
      shortDate: string;
      subjectCode: string;
      subjectName: string;
      label: string;
      isMock?: boolean;
    }> = [];

    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];

      const dayEvent = events.find(e => e.date === iso);
      const isMock = dayEvent?.type === 'Mock Exam';

      const subjIdx = i % agendaSubjects.length;
      const subj = agendaSubjects[subjIdx];
      const reading = readings.find(r => r.subjectId === subj.subjectId);

      days.push({
        date: d,
        dayName: weekDayNames[d.getDay()],
        dateStr: iso,
        shortDate: `${monthNames[d.getMonth()]} ${d.getDate()}`,
        subjectCode: subj.code,
        subjectName: subj.name,
        label: isMock ? `Diagnostic mock ~68 min` : (reading ? `Reading ${reading.number}` : 'Review session'),
        isMock,
      });
    }
    return days;
  }, [readings, events]);

  return (
    <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-[#1e2026]">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-[10px] font-mono tracking-widest bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 font-bold uppercase">
            MACRO STUDY PLAN
          </span>
          {studyStrategy && (
            <span className="flex items-center gap-1 text-[9px] text-blue-400 ml-2">
              <BrainCircuit className="h-3 w-3" />
              {propSubjects?.find(s => s.id === studyStrategy.firstSubjectId)?.name || studyStrategy.firstSubjectId} first
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-200 font-sans">
          Your CFA L3: PM plan is ready
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 dark:bg-[#1e2026]">
        <div className="bg-white dark:bg-[#101116] p-5 flex flex-col items-center justify-center space-y-1">
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-200 font-mono">{studyDaysLeft}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Study Days Left</span>
          <span className="text-[9px] text-slate-400 font-mono">Target: {formatDateLabel(finishDate)}</span>
        </div>
        <div className="bg-white dark:bg-[#101116] p-5 flex flex-col items-center justify-center space-y-1">
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-200 font-mono">{weeksRemaining}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Weeks Remaining</span>
          <span className="text-[9px] text-slate-400 font-mono">Review buffer: {bufferDays}d</span>
        </div>
        <div className="bg-white dark:bg-[#101116] p-5 flex flex-col items-center justify-center space-y-1">
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-200 font-mono">~{remainingQBank.toLocaleString()}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Remaining Q Bank</span>
          <span className="text-[9px] text-slate-400 font-mono">{completedEOCQ} of {totalEOCQ} completed</span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            4-Phase Chronological Progress
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            {formatDateLabel(today)} → {formatDateLabel(examDateTime)}
          </span>
        </div>

        <div className="w-full h-6 flex rounded-sm overflow-hidden border border-slate-200 dark:border-slate-700/60">
          <div
            className="bg-emerald-500/80 h-full flex items-center justify-center text-[8px] font-mono font-bold text-white"
            style={{ width: `${foundationWidth}%` }}
          >Foundation</div>
          <div
            className="bg-amber-500/80 h-full flex items-center justify-center text-[8px] font-mono font-bold text-white"
            style={{ width: `${buildWidth}%` }}
          >Build</div>
          <div
            className="bg-rose-500/70 h-full flex items-center justify-center text-[8px] font-mono font-bold text-white"
            style={{ width: `${masteryWidth}%` }}
          >Mastery</div>
          <div
            className="bg-slate-300 dark:bg-slate-600 h-full flex items-center justify-center text-[8px] font-mono font-bold text-slate-600 dark:text-slate-300"
            style={{ width: `${sandboxWidth}%` }}
          >Review</div>
        </div>

        <div className="flex justify-between text-[9px] font-mono">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-500/80 inline-block"></span>
            <span className="text-slate-500 dark:text-slate-400">Foundation ({foundationPct}%)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-amber-500/80 inline-block"></span>
            <span className="text-slate-500 dark:text-slate-400">Build ({buildPct}%)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-rose-500/70 inline-block"></span>
            <span className="text-slate-500 dark:text-slate-400">Mastery ({masterPct}%)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block"></span>
            <span className="text-slate-500 dark:text-slate-400">Review Sandbox</span>
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-[#1e2026] p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Rolling 5-Day Micro-Agenda Ledger
          </span>
          <span className="text-[9px] font-mono text-slate-400">{formatDateLabel(today)} onwards</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-sans">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/60">
                <th className="text-left py-2 pr-3 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Day</th>
                <th className="text-left py-2 pr-3 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-left py-2 pr-3 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</th>
                <th className="text-left py-2 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Activity</th>
              </tr>
            </thead>
            <tbody>
              {fiveDayAgenda.map((day, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/40 last:border-0">
                  <td className="py-2.5 pr-3">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{day.dayName}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{day.shortDate}</td>
                  <td className="py-2.5 pr-3">
                    <span className="bg-slate-100 dark:bg-[#1e2026] text-slate-700 dark:text-slate-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {day.subjectCode}
                    </span>
                  </td>
                  <td className={`py-2.5 ${day.isMock ? 'text-indigo-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
