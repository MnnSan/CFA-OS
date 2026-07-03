import React, { useState } from 'react';
import { Subject, Reading, LearningOutcomeStatement } from '../../../../types';
import { Calendar, Trash2, Plus } from 'lucide-react';

export interface SubjectSchedule {
  subjectId: string;
  startMonthIndex: number;
  startDay: number;
  endMonthIndex: number;
  endDay: number;
}

export interface ReadingSchedule {
  readingId: string;
  startMonthIndex: number;
  startDay: number;
  endMonthIndex: number;
  endDay: number;
}

interface CfaTimelineInspectorProps {
  selectedSubject: Subject | null;
  selectedReading: Reading | null;
  subjectSchedule: SubjectSchedule | null;
  readingSchedule: ReadingSchedule | null;
  onUpdateSubjectSchedule: (startM: number, startD: number, endM: number, endD: number) => void;
  onUpdateReadingSchedule: (startM: number, startD: number, endM: number, endD: number) => void;
  onDeleteSubjectSchedule: () => void;
  onDeleteReadingSchedule: () => void;
  onAddSubjectSchedule: (subId: string) => void;
  months: { label: string; year: number; index: number }[];
  unscheduledSubjects: Subject[];
  readings: Reading[];
  losList: LearningOutcomeStatement[];
  isEditable?: boolean;
}

export const CfaTimelineInspector: React.FC<CfaTimelineInspectorProps> = ({
  selectedSubject,
  selectedReading,
  subjectSchedule,
  readingSchedule,
  onUpdateSubjectSchedule,
  onUpdateReadingSchedule,
  onDeleteSubjectSchedule,
  onDeleteReadingSchedule,
  onAddSubjectSchedule,
  months,
  unscheduledSubjects,
  readings,
  losList,
  isEditable = true,
}) => {
  const [showAddSelector, setShowAddSelector] = useState(false);
  const [selectedSubToAdd, setSelectedSubToAdd] = useState('');

  const getDateString = (monthIdx: number, day: number) => {
    if (monthIdx < 0 || monthIdx >= months.length) return '';
    const m = months[monthIdx];
    const maxDays = new Date(m.year, m.index + 1, 0).getDate();
    const safeDay = Math.min(day, maxDays);
    return `${m.year}-${String(m.index + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  };

  const parseDateString = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    const [y, m, d] = parts.map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    const mIdx = months.findIndex(month => month.year === y && month.index === m - 1);
    if (mIdx === -1) return null;
    return { monthIdx: mIdx, day: d };
  };

  const getRunwayDays = (startM: number, startD: number, endM: number, endD: number) => {
    const startStr = getDateString(startM, startD);
    const endStr = getDateString(endM, endD);
    if (!startStr || !endStr) return 0;
    const diff = new Date(endStr).getTime() - new Date(startStr).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  // Precalculate Selected Subject Data
  const subReadings = selectedSubject ? readings.filter(r => r.subjectId === selectedSubject.id) : [];
  const subjectTotalHours = subReadings.reduce((sum, r) => sum + (r.estimatedHours || 0), 0);

  // Precalculate Selected Reading Data
  const readingTotalHours = selectedReading?.estimatedHours || 0;

  return (
    <div className="h-full flex flex-col justify-between space-y-5 text-slate-500 dark:text-slate-400">
      
      {/* 1. Header Title */}
      <div className="border-b border-slate-100 dark:border-[#1e2026] pb-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1.5 uppercase font-mono tracking-wider">
          <span>🕵️‍♂️</span> Timeline Inspector
        </h3>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Select a block to inspect parameters</p>
      </div>

      {/* 2. Content Inspector Area */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {selectedReading && readingSchedule ? (
          /* ====== READING SELECTED ====== */
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-50 dark:bg-[#101116] border border-sky-500/20 p-3.5 rounded-lg flex flex-col gap-1.5">
              <span className="text-[9px] font-mono font-bold text-sky-500 dark:text-sky-400 uppercase tracking-widest">Selected Reading Block</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] font-sans">
                Reading {selectedReading.number}: {selectedReading.title}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans line-clamp-3 leading-relaxed">{selectedReading.description}</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50/50 dark:bg-[#0d0e12] p-2.5 border border-slate-200 dark:border-[#1e2026] rounded">
                <span className="block text-[8px] font-mono text-slate-500 dark:text-slate-400 uppercase">Allocated Runway</span>
                <span className="text-xs font-mono font-bold text-sky-500 dark:text-sky-400">
                  {getRunwayDays(readingSchedule.startMonthIndex, readingSchedule.startDay, readingSchedule.endMonthIndex, readingSchedule.endDay)} Days
                </span>
              </div>
              <div className="bg-slate-50/50 dark:bg-[#0d0e12] p-2.5 border border-slate-200 dark:border-[#1e2026] rounded">
                <span className="block text-[8px] font-mono text-slate-500 dark:text-slate-400 uppercase">Study Target Hours</span>
                <span className="text-xs font-mono font-bold text-sky-500 dark:text-sky-400">{readingTotalHours.toFixed(1)}h</span>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="block text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Start Date</label>
                {isEditable ? (
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#1e2026] rounded p-2 text-xs font-mono text-slate-900 dark:text-[#F8FAFC] outline-none focus:border-sky-500/50"
                    value={getDateString(readingSchedule.startMonthIndex, readingSchedule.startDay)}
                    onChange={(e) => {
                      const parsed = parseDateString(e.target.value);
                      if (parsed) {
                        onUpdateReadingSchedule(parsed.monthIdx, parsed.day, readingSchedule.endMonthIndex, readingSchedule.endDay);
                      }
                    }}
                  />
                ) : (
                  <span className="block w-full bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#1e2026] rounded p-2 text-xs font-mono text-slate-900 dark:text-[#F8FAFC] cursor-default select-none">
                    {getDateString(readingSchedule.startMonthIndex, readingSchedule.startDay)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">End Date</label>
                {isEditable ? (
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#1e2026] rounded p-2 text-xs font-mono text-slate-900 dark:[#F8FAFC] outline-none focus:border-sky-500/50"
                    value={getDateString(readingSchedule.endMonthIndex, readingSchedule.endDay)}
                    onChange={(e) => {
                      const parsed = parseDateString(e.target.value);
                      if (parsed) {
                        onUpdateReadingSchedule(readingSchedule.startMonthIndex, readingSchedule.startDay, parsed.monthIdx, parsed.day);
                      }
                    }}
                  />
                ) : (
                  <span className="block w-full bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#1e2026] rounded p-2 text-xs font-mono text-slate-900 dark:text-[#F8FAFC] cursor-default select-none">
                    {getDateString(readingSchedule.endMonthIndex, readingSchedule.endDay)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {isEditable && (
            <div className="pt-2 flex gap-2">
              <button
                onClick={onDeleteReadingSchedule}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 dark:text-rose-400 text-xs font-mono font-bold uppercase rounded cursor-pointer transition-colors"
              >
                <Trash2 size={12} />
                <span>Delete Block</span>
              </button>
            </div>
            )}
          </div>
        ) : selectedSubject && subjectSchedule ? (
          /* ====== SUBJECT SELECTED ====== */
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-50 dark:bg-[#101116] border border-amber-500/20 p-3.5 rounded-lg flex flex-col gap-1.5">
              <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest">Selected Subject Block</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] font-sans">
                {selectedSubject.code} - {selectedSubject.name}
              </h4>
              <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400">CFA Topic Weight: {selectedSubject.cfaWeight}</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-slate-50/50 dark:bg-[#0d0e12] p-2 border border-slate-200 dark:border-[#1e2026] rounded">
                <span className="block text-[7px] font-mono text-slate-500 dark:text-slate-400 uppercase leading-none">Allocated Runway</span>
                <span className="text-[10px] font-mono font-bold text-amber-500 mt-1 block">
                  {getRunwayDays(subjectSchedule.startMonthIndex, subjectSchedule.startDay, subjectSchedule.endMonthIndex, subjectSchedule.endDay)} Days
                </span>
              </div>
              <div className="bg-slate-50/50 dark:bg-[#0d0e12] p-2 border border-slate-200 dark:border-[#1e2026] rounded">
                <span className="block text-[7px] font-mono text-slate-500 dark:text-slate-400 uppercase leading-none">Readings Count</span>
                <span className="text-[10px] font-mono font-bold text-amber-500 mt-1 block">{subReadings.length}</span>
              </div>
              <div className="bg-slate-50/50 dark:bg-[#0d0e12] p-2 border border-slate-200 dark:border-[#1e2026] rounded">
                <span className="block text-[7px] font-mono text-slate-500 dark:text-slate-400 uppercase leading-none">Est Study Time</span>
                <span className="text-[10px] font-mono font-bold text-amber-500 mt-1 block">{subjectTotalHours.toFixed(1)}h</span>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="block text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Start Date</label>
                {isEditable ? (
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#1e2026] rounded p-2 text-xs font-mono text-slate-900 dark:text-[#F8FAFC] outline-none focus:border-amber-500/50"
                    value={getDateString(subjectSchedule.startMonthIndex, subjectSchedule.startDay)}
                    onChange={(e) => {
                      const parsed = parseDateString(e.target.value);
                      if (parsed) {
                        onUpdateSubjectSchedule(parsed.monthIdx, parsed.day, subjectSchedule.endMonthIndex, subjectSchedule.endDay);
                      }
                    }}
                  />
                ) : (
                  <span className="block w-full bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#1e2026] rounded p-2 text-xs font-mono text-slate-900 dark:text-[#F8FAFC] cursor-default select-none">
                    {getDateString(subjectSchedule.startMonthIndex, subjectSchedule.startDay)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">End Date</label>
                {isEditable ? (
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#1e2026] rounded p-2 text-xs font-mono text-slate-900 dark:text-[#F8FAFC] outline-none focus:border-amber-500/50"
                    value={getDateString(subjectSchedule.endMonthIndex, subjectSchedule.endDay)}
                    onChange={(e) => {
                      const parsed = parseDateString(e.target.value);
                      if (parsed) {
                        onUpdateSubjectSchedule(subjectSchedule.startMonthIndex, subjectSchedule.startDay, parsed.monthIdx, parsed.day);
                      }
                    }}
                  />
                ) : (
                  <span className="block w-full bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#1e2026] rounded p-2 text-xs font-mono text-slate-900 dark:text-[#F8FAFC] cursor-default select-none">
                    {getDateString(subjectSchedule.endMonthIndex, subjectSchedule.endDay)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {isEditable && (
            <div className="pt-2 flex gap-2">
              <button
                onClick={onDeleteSubjectSchedule}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 dark:text-rose-400 text-xs font-mono font-bold uppercase rounded cursor-pointer transition-colors"
              >
                <Trash2 size={12} />
                <span>Delete Block</span>
              </button>
            </div>
            )}
          </div>
        ) : (
          /* ====== DEFAULT EMPTY STATE ====== */
          <div className="py-16 text-center space-y-2">
            <span className="text-3xl block">📋</span>
            <p className="text-xs text-slate-500 font-sans">No subject or reading block selected.</p>
            <p className="text-[10px] text-slate-600 font-mono leading-relaxed">Click a schedule item on the grid to inspect details and dates.</p>
          </div>
        )}
      </div>

      {/* 3. Action Matrix Footer */}
      <div className="border-t border-slate-100 dark:border-[#1e2026] pt-4 space-y-3">
        {showAddSelector ? (
          <div className="space-y-2 animate-fade-in">
            <label className="block text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Select Subject to Schedule</label>
            <div className="flex gap-2">
              <select
                className="flex-1 bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#1e2026] rounded p-2 text-xs text-slate-800 dark:text-slate-350 outline-none focus:border-amber-500/50"
                value={selectedSubToAdd}
                onChange={(e) => setSelectedSubToAdd(e.target.value)}
              >
                <option value="">-- Choose Subject --</option>
                {unscheduledSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.code} - {sub.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (selectedSubToAdd) {
                    onAddSubjectSchedule(selectedSubToAdd);
                    setSelectedSubToAdd('');
                    setShowAddSelector(false);
                  }
                }}
                disabled={!selectedSubToAdd}
                className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-mono font-bold text-xs uppercase px-3 rounded cursor-pointer transition-colors disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            <button
              onClick={() => setShowAddSelector(false)}
              className="text-[10px] text-slate-500 hover:text-slate-400 font-mono block underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSelector(true)}
            disabled={unscheduledSubjects.length === 0}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 disabled:border-slate-200 dark:disabled:border-[#1e2026] disabled:text-slate-400 dark:disabled:text-slate-600 text-emerald-500 dark:text-emerald-400 text-xs font-mono font-bold uppercase rounded cursor-pointer transition-colors disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            <span>Add Event Slot</span>
          </button>
        )}
      </div>
    </div>
  );
};
