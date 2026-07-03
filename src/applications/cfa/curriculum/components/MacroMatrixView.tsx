import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Subject, Reading, LearningOutcomeStatement, TimelineBlock } from '../../../../types';
import { CfaTimelineInspector, SubjectSchedule, ReadingSchedule } from './CfaTimelineInspector';
import { useApp } from '../../../../context/AppContext';

interface MacroMatrixViewProps {
  subjects: Subject[];
  startDate: string;
  examDate: string;
  onScheduleChange?: () => void;
  // Sprint 10 — Template Engine integration
  blocks?: TimelineBlock[];
  readOnly?: boolean;
  onBlocksChange?: (blocks: TimelineBlock[]) => void;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_IN_MONTH = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
const SCHEDULE_KEY = 'cfa_subject_schedule';
const READING_SCHEDULE_KEY = 'cfa_reading_schedule';
const HEADER_HEIGHT = 40;
const COL_WIDTH = 150;
const DAY_ROW_HEIGHT = 22;
const WEEK_ROW_HEIGHT = 120;

const SUBJECT_COLORS = [
  'bg-indigo-500/20 border-indigo-500/40 hover:bg-indigo-500/30 text-indigo-300',
  'bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300',
  'bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30 text-amber-300',
  'bg-sky-500/20 border-sky-500/40 hover:bg-sky-500/30 text-sky-300',
  'bg-violet-500/20 border-violet-500/40 hover:bg-violet-500/30 text-violet-300',
  'bg-rose-500/20 border-rose-500/40 hover:bg-rose-500/30 text-rose-300',
  'bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300',
  'bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/30 text-orange-300',
  'bg-teal-500/20 border-teal-500/40 hover:bg-teal-500/30 text-teal-300',
  'bg-pink-500/20 border-pink-500/40 hover:bg-pink-500/30 text-pink-300',
];

function parseDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date();
  }
  const parts = dateStr.split('-');
  if (parts.length < 2) {
    return new Date();
  }
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m)) {
    return new Date();
  }
  return new Date(y, m - 1, d || 1);
}

function loadSchedule(): SubjectSchedule[] {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSchedule(schedule: SubjectSchedule[]) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
}

function loadReadingSchedule(): ReadingSchedule[] {
  try {
    const raw = localStorage.getItem(READING_SCHEDULE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveReadingSchedule(schedule: ReadingSchedule[]) {
  localStorage.setItem(READING_SCHEDULE_KEY, JSON.stringify(schedule));
}

const initReadingSchedules = (
  subjectId: string,
  parentStartM: number,
  parentStartD: number,
  parentEndM: number,
  parentEndD: number,
  subReadings: Reading[],
  months: { year: number; index: number }[]
): ReadingSchedule[] => {
  const totalReadings = subReadings.length;
  if (totalReadings === 0 || months.length === 0) return [];

  const pStart = months[Math.min(parentStartM, months.length - 1)];
  const pEnd = months[Math.min(parentEndM, months.length - 1)];
  const startDate = new Date(pStart.year, pStart.index, parentStartD);
  const endDate = new Date(pEnd.year, pEnd.index, parentEndD);
  const totalMs = endDate.getTime() - startDate.getTime();
  if (totalMs <= 0) return [];
  const totalDays = Math.round(totalMs / 86400000) + 1;
  
  const schedules: ReadingSchedule[] = [];

  subReadings.forEach((r, idx) => {
    const rStartOffset = Math.round((idx / totalReadings) * (totalDays - 1));
    const rEndOffset = Math.round(((idx + 1) / totalReadings) * (totalDays - 1));
    const rStartDate = new Date(startDate.getTime() + rStartOffset * 86400000);
    const rEndDate = new Date(startDate.getTime() + rEndOffset * 86400000);

    const rStartM = months.findIndex(m => m.year === rStartDate.getFullYear() && m.index === rStartDate.getMonth());
    const rEndM = months.findIndex(m => m.year === rEndDate.getFullYear() && m.index === rEndDate.getMonth());

    schedules.push({
      readingId: r.id,
      startMonthIndex: Math.max(parentStartM, Math.min(rStartM >= 0 ? rStartM : parentStartM, parentEndM)),
      startDay: rStartDate.getDate(),
      endMonthIndex: Math.max(parentStartM, Math.min(rEndM >= 0 ? rEndM : parentEndM, parentEndM)),
      endDay: rEndDate.getDate()
    });
  });

  return schedules;
};

// Convert date string (YYYY-MM-DD) to monthIndex/day using the month array
function dateToPosition(dateStr: string, months: { year: number; index: number }[]): { monthIndex: number; day: number } {
  const d = parseDate(dateStr);
  const idx = months.findIndex(m => m.year === d.getFullYear() && m.index === d.getMonth());
  return {
    monthIndex: idx >= 0 ? idx : 0,
    day: d.getDate(),
  };
}

export const MacroMatrixView: React.FC<MacroMatrixViewProps> = ({
  subjects,
  startDate,
  examDate,
  onScheduleChange,
  blocks: externalBlocks,
  readOnly,
  onBlocksChange,
}) => {
  const { readings, losList } = useApp();
  const isReadOnly = readOnly === true;

  const start = parseDate(startDate);
  const exam = parseDate(examDate);

  // Constrain month columns to terminate immediately following the Feb 2027 column boundary
  const months = useMemo(() => {
    const list: { label: string; year: number; index: number }[] = [];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endLimit = new Date(2027, 1, 1); // Feb 2027 boundary
    const end = exam < endLimit ? exam : endLimit;
    while (cur <= end) {
      list.push({ label: `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear()}`, year: cur.getFullYear(), index: cur.getMonth() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return list;
  }, [start, exam]);

  const activeSubjects = useMemo(() => subjects.filter(s => s.enabled !== false), [subjects]);

  // Use external blocks when provided, otherwise use internal schedule state
  const [schedule, setSchedule] = useState<SubjectSchedule[]>(() => {
    const saved = loadSchedule();
    if (saved.length === activeSubjects.length) return saved;
    return activeSubjects.map((sub, i) => {
      const existing = saved.find(s => s.subjectId === sub.id);
      if (existing) return existing;
      const mid = Math.floor(months.length / activeSubjects.length) * i;
      const mIdx = Math.min(mid, months.length - 1);
      const m = months[mIdx];
      return {
        subjectId: sub.id,
        startMonthIndex: mIdx,
        startDay: 1,
        endMonthIndex: Math.min(mIdx + 1, months.length - 1),
        endDay: DAYS_IN_MONTH(m.index, m.year),
      };
    });
  });

  // When external blocks are provided (Coach Blueprint), sync internal schedule
  useEffect(() => {
    if (isReadOnly && externalBlocks && months.length > 0) {
      const converted: SubjectSchedule[] = externalBlocks.map(b => {
        const startPos = dateToPosition(b.startDate, months);
        const endPos = dateToPosition(b.endDate, months);
        return {
          subjectId: b.subjectId,
          startMonthIndex: startPos.monthIndex,
          startDay: startPos.day,
          endMonthIndex: endPos.monthIndex,
          endDay: endPos.day,
        };
      });
      setSchedule(converted);
    }
  }, [externalBlocks, months, isReadOnly]);

  const [readingSchedules, setReadingSchedules] = useState<ReadingSchedule[]>(() => loadReadingSchedule());

  // Interactive View Modes & Selection States
  const [temporalScale, setTemporalScale] = useState<'days' | 'weeks'>('days');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedReadingId, setSelectedReadingId] = useState<string | null>(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  // Dynamic initialization of expanded Reading timelines
  useEffect(() => {
    if (expandedSubjectId) {
      const parentSched = schedule.find(s => s.subjectId === expandedSubjectId);
      if (parentSched) {
        const allSubReadings = readings.filter(r => r.subjectId === expandedSubjectId);
        const hasMissing = allSubReadings.some(r => !readingSchedules.some(rs => rs.readingId === r.id));
        if (hasMissing) {
          const newSchedules = initReadingSchedules(
            expandedSubjectId,
            parentSched.startMonthIndex,
            parentSched.startDay,
            parentSched.endMonthIndex,
            parentSched.endDay,
            allSubReadings,
            months
          );
          const updated = [
            ...readingSchedules.filter(rs => !allSubReadings.some(r => r.id === rs.readingId)),
            ...newSchedules
          ];
          setReadingSchedules(updated);
          saveReadingSchedule(updated);
        }
      }
    }
  }, [expandedSubjectId, schedule, readings, readingSchedules]);

  // Convert SubjectSchedule to TimelineBlock for parent sync
  const scheduleToBlocks = useCallback((subSchedule: SubjectSchedule[]): TimelineBlock[] => {
    if (months.length === 0) return [];
    return subSchedule.map(s => {
      const startMonth = months[Math.min(s.startMonthIndex, months.length - 1)];
      const endMonth = months[Math.min(s.endMonthIndex, months.length - 1)];
      const startDate = `${startMonth.year}-${String(startMonth.index + 1).padStart(2, '0')}-${String(s.startDay).padStart(2, '0')}`;
      const endDate = `${endMonth.year}-${String(endMonth.index + 1).padStart(2, '0')}-${String(s.endDay).padStart(2, '0')}`;
      return {
        id: `block-${s.subjectId}`,
        subjectId: s.subjectId,
        startDate,
        endDate,
      };
    });
  }, [months]);

  const persistAndNotify = useCallback((newSchedule: SubjectSchedule[]) => {
    setSchedule(newSchedule);
    saveSchedule(newSchedule);
    if (onScheduleChange) onScheduleChange();
    if (onBlocksChange) {
      onBlocksChange(scheduleToBlocks(newSchedule));
    }
  }, [onScheduleChange, onBlocksChange, scheduleToBlocks]);

  const colorMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeSubjects.forEach((s, i) => { map[s.id] = i % SUBJECT_COLORS.length; });
    return map;
  }, [activeSubjects]);

  const gridRef = useRef<HTMLDivElement>(null);

  // Exact coordinates matching offset row header and month header
  const rowHeight = temporalScale === 'days' ? DAY_ROW_HEIGHT : WEEK_ROW_HEIGHT;
  const getCellFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left - 40;
    const y = clientY - rect.top - HEADER_HEIGHT;
    const col = Math.floor(x / COL_WIDTH);
    const row = Math.floor(y / rowHeight);
    
    const monthIdx = Math.max(0, Math.min(col, months.length - 1));
    const dayVal = temporalScale === 'days' 
      ? Math.max(1, Math.min(row + 1, 31)) 
      : Math.max(0, Math.min(row, 4)) * 7 + 1;
      
    return { monthIdx, day: dayVal };
  }, [months.length, temporalScale, rowHeight]);

  // Clamp helper for keeping reading bounds enclosed inside parent subject bounds
  const clampToParent = useCallback((
    mIdx: number,
    d: number,
    parentMStart: number,
    parentDStart: number,
    parentMEnd: number,
    parentDEnd: number
  ) => {
    const val = mIdx * 31 + d;
    const minVal = parentMStart * 31 + parentDStart;
    const maxVal = parentMEnd * 31 + parentDEnd;
    const clampedVal = Math.max(minVal, Math.min(val, maxVal));
    return {
      monthIdx: Math.floor(clampedVal / 31),
      day: Math.max(1, clampedVal % 31)
    };
  }, []);

  // ── Click-vs-Drag Guard + Visual Drag Transform ──
  const dragVisualRef = useRef<{
    id: string;
    type: 'subject' | 'reading';
    startClientY: number;
    deltaY: number;
    origTop: number;
    origStartMonth: number;
    origStartDay: number;
    origEndMonth: number;
    origEndDay: number;
    mode: 'move' | 'resize-start' | 'resize-end';
  } | null>(null);

  const clickTargetRef = useRef<{ id: string; type: 'subject' | 'reading' } | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragTransform, setDragTransform] = useState<string>('');

  const handleSlicePointerDown = useCallback((
    e: React.PointerEvent,
    id: string,
    type: 'subject' | 'reading',
    mode: 'move' | 'resize-start' | 'resize-end',
  ) => {
    clickTargetRef.current = { id, type };
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    if (isReadOnly) return;

    e.preventDefault();
    const rowH = temporalScale === 'days' ? DAY_ROW_HEIGHT : WEEK_ROW_HEIGHT;
    const sliceTop = type === 'subject'
      ? (() => {
          const block = schedule.find(s => s.subjectId === id);
          if (!block) return 0;
          return block.startMonthIndex * rowH * 31 + (block.startDay - 1) * rowH + HEADER_HEIGHT;
        })()
      : (() => {
          const block = readingSchedules.find(rs => rs.readingId === id);
          if (!block) return 0;
          return block.startMonthIndex * rowH * 31 + (block.startDay - 1) * rowH + HEADER_HEIGHT;
        })();

    if (type === 'subject') {
      const block = schedule.find(s => s.subjectId === id);
      if (!block) return;
      dragVisualRef.current = {
        id, type, mode,
        startClientY: e.clientY, deltaY: 0, origTop: sliceTop,
        origStartMonth: block.startMonthIndex, origStartDay: block.startDay,
        origEndMonth: block.endMonthIndex, origEndDay: block.endDay,
      };
    } else {
      const block = readingSchedules.find(rs => rs.readingId === id);
      if (!block) return;
      dragVisualRef.current = {
        id, type, mode,
        startClientY: e.clientY, deltaY: 0, origTop: sliceTop,
        origStartMonth: block.startMonthIndex, origStartDay: block.startDay,
        origEndMonth: block.endMonthIndex, origEndDay: block.endDay,
      };
    }
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
  }, [isReadOnly, schedule, readingSchedules, temporalScale]);

  const handleSlicePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragVisualRef.current) return;
    // For readsOnly, don't drag but still track for click
    if (isReadOnly) return;

    const d = dragVisualRef.current;
    const rawDeltaY = e.clientY - d.startClientY;

    // Apply transform for smooth visual feedback (throttled via RAF)
    const rowH = temporalScale === 'days' ? DAY_ROW_HEIGHT : WEEK_ROW_HEIGHT;
    const snappedDeltaY = Math.round(rawDeltaY / (rowH / 4)) * (rowH / 4);

    d.deltaY = snappedDeltaY;
    setDraggedId(d.id);
    setDragTransform(`translateY(${snappedDeltaY}px)`);
  }, [isReadOnly, temporalScale]);

  const handleSlicePointerUp = useCallback((e: React.PointerEvent) => {
    const target = clickTargetRef.current;
    const pPos = pointerDownPosRef.current;
    const dist = pPos
      ? Math.sqrt(Math.pow(e.clientX - pPos.x, 2) + Math.pow(e.clientY - pPos.y, 2))
      : Infinity;

    // ── Pure click handling (dist < 3px) ──
    if (dist < 3 && target) {
      if (target.type === 'subject') {
        setSelectedSubjectId(target.id);
        setSelectedReadingId(null);
        setExpandedSubjectId(prev => prev === target.id ? null : target.id);
      } else {
        setSelectedReadingId(target.id);
      }
      dragVisualRef.current = null;
      setDraggedId(null);
      setDragTransform('');
      pointerDownPosRef.current = null;
      clickTargetRef.current = null;
      return;
    }

    // ── Drag commit ──
    const d = dragVisualRef.current;
    if (!d || isReadOnly) {
      dragVisualRef.current = null;
      setDraggedId(null);
      setDragTransform('');
      pointerDownPosRef.current = null;
      clickTargetRef.current = null;
      return;
    }
    const rowH = temporalScale === 'days' ? DAY_ROW_HEIGHT : WEEK_ROW_HEIGHT;
    const deltaRows = Math.round(d.deltaY / rowH);
    if (deltaRows === 0) {
      dragVisualRef.current = null;
      setDraggedId(null);
      setDragTransform('');
      pointerDownPosRef.current = null;
      clickTargetRef.current = null;
      return;
    }

    const deltaDays = temporalScale === 'days' ? deltaRows : deltaRows * 7;

    if (d.type === 'subject') {
      setSchedule(prev => {
        const next = prev.map(s => {
          if (s.subjectId !== d.id) return s;
          if (d.mode === 'move') {
            const newStartM = Math.max(0, Math.min(d.origStartMonth, months.length - 1));
            const newStartD = Math.max(1, Math.min(d.origStartDay + deltaDays, 31));
            const newEndM = Math.max(0, Math.min(d.origEndMonth, months.length - 1));
            const newEndD = Math.max(1, Math.min(d.origEndDay + deltaDays, 31));
            return { ...s, startMonthIndex: newStartM, startDay: newStartD, endMonthIndex: newEndM, endDay: newEndD };
          }
          if (d.mode === 'resize-start') {
            const rawDay = d.origStartDay + deltaDays;
            const clampedDay = Math.max(1, Math.min(rawDay, 31));
            return { ...s, startDay: Math.min(clampedDay, s.endDay >= 1 ? s.endDay : 31) };
          }
          if (d.mode === 'resize-end') {
            const rawDay = d.origEndDay + deltaDays;
            const clampedDay = Math.max(1, Math.min(rawDay, 31));
            return { ...s, endDay: Math.max(s.startDay, clampedDay) };
          }
          return s;
        });
        saveSchedule(next);
        if (onScheduleChange) onScheduleChange();
        if (onBlocksChange) onBlocksChange(scheduleToBlocks(next));
        return next;
      });
    } else {
      const targetReading = readings.find(r => r.id === d.id);
      if (targetReading) {
        const parentSched = schedule.find(s => s.subjectId === targetReading.subjectId);
        if (parentSched) {
          setReadingSchedules(prev => {
            const next = prev.map(rs => {
              if (rs.readingId !== d.id) return rs;
              if (d.mode === 'move') {
                const newStartD = Math.max(1, Math.min(d.origStartDay + deltaDays, 31));
                const newEndD = Math.max(1, Math.min(d.origEndDay + deltaDays, 31));
                const clampedStart = clampToParent(d.origStartMonth, newStartD, parentSched.startMonthIndex, parentSched.startDay, parentSched.endMonthIndex, parentSched.endDay);
                const clampedEnd = clampToParent(d.origEndMonth, newEndD, parentSched.startMonthIndex, parentSched.startDay, parentSched.endMonthIndex, parentSched.endDay);
                return { ...rs, startMonthIndex: clampedStart.monthIdx, startDay: clampedStart.day, endMonthIndex: clampedEnd.monthIdx, endDay: clampedEnd.day };
              }
              if (d.mode === 'resize-start') {
                const rawDay = d.origStartDay + deltaDays;
                const clamped = clampToParent(d.origStartMonth, rawDay, parentSched.startMonthIndex, parentSched.startDay, parentSched.endMonthIndex, parentSched.endDay);
                return { ...rs, startMonthIndex: clamped.monthIdx, startDay: clamped.day };
              }
              if (d.mode === 'resize-end') {
                const rawDay = d.origEndDay + deltaDays;
                const clamped = clampToParent(d.origEndMonth, rawDay, parentSched.startMonthIndex, parentSched.startDay, parentSched.endMonthIndex, parentSched.endDay);
                return { ...rs, endMonthIndex: clamped.monthIdx, endDay: clamped.day };
              }
              return rs;
            });
            saveReadingSchedule(next);
            return next;
          });
        }
      }
    }

    dragVisualRef.current = null;
    setDraggedId(null);
    setDragTransform('');
    pointerDownPosRef.current = null;
    clickTargetRef.current = null;
  }, [isReadOnly, schedule, readingSchedules, onScheduleChange, onBlocksChange, scheduleToBlocks, months.length, temporalScale, readings, clampToParent]);

  // Selected object getters for inspector panel
  const selectedSubject = useMemo(() => {
    return activeSubjects.find(s => s.id === selectedSubjectId) || null;
  }, [selectedSubjectId, activeSubjects]);

  const selectedReading = useMemo(() => {
    return readings.find(r => r.id === selectedReadingId) || null;
  }, [selectedReadingId, readings]);

  const selectedSubjectSchedule = useMemo(() => {
    return schedule.find(s => s.subjectId === selectedSubjectId) || null;
  }, [selectedSubjectId, schedule]);

  const selectedReadingSchedule = useMemo(() => {
    return readingSchedules.find(rs => rs.readingId === selectedReadingId) || null;
  }, [selectedReadingId, readingSchedules]);

  const unscheduledSubjects = useMemo(() => {
    return activeSubjects.filter(sub => !schedule.some(s => s.subjectId === sub.id));
  }, [activeSubjects, schedule]);

  // Date updates from Inspector Panel
  const handleUpdateSubjectSchedule = useCallback((startM: number, startD: number, endM: number, endD: number) => {
    const updated = schedule.map(s => {
      if (s.subjectId === selectedSubjectId) {
        return { ...s, startMonthIndex: startM, startDay: startD, endMonthIndex: endM, endDay: endD };
      }
      return s;
    });
    persistAndNotify(updated);
  }, [schedule, selectedSubjectId, persistAndNotify]);

  const handleUpdateReadingSchedule = useCallback((startM: number, startD: number, endM: number, endD: number) => {
    if (!selectedReading) return;
    const parentSched = schedule.find(s => s.subjectId === selectedReading.subjectId);
    if (!parentSched) return;
    
    const clampedStart = clampToParent(startM, startD, parentSched.startMonthIndex, parentSched.startDay, parentSched.endMonthIndex, parentSched.endDay);
    const clampedEnd = clampToParent(endM, endD, parentSched.startMonthIndex, parentSched.startDay, parentSched.endMonthIndex, parentSched.endDay);
    
    const startVal = clampedStart.monthIdx * 31 + clampedStart.day;
    const endVal = clampedEnd.monthIdx * 31 + clampedEnd.day;
    if (startVal > endVal) return;
    
    const updated = readingSchedules.map(rs => {
      if (rs.readingId === selectedReading.id) {
        return {
          ...rs,
          startMonthIndex: clampedStart.monthIdx,
          startDay: clampedStart.day,
          endMonthIndex: clampedEnd.monthIdx,
          endDay: clampedEnd.day
        };
      }
      return rs;
    });
    setReadingSchedules(updated);
    saveReadingSchedule(updated);
  }, [readingSchedules, selectedReading, schedule, clampToParent]);

  const handleDeleteSubjectSchedule = useCallback(() => {
    if (!selectedSubjectId) return;
    const updated = schedule.filter(s => s.subjectId !== selectedSubjectId);
    persistAndNotify(updated);
    setSelectedSubjectId(null);
  }, [schedule, selectedSubjectId, persistAndNotify]);

  const handleDeleteReadingSchedule = useCallback(() => {
    if (!selectedReadingId) return;
    const updated = readingSchedules.filter(rs => rs.readingId !== selectedReadingId);
    setReadingSchedules(updated);
    saveReadingSchedule(updated);
    setSelectedReadingId(null);
  }, [readingSchedules, selectedReadingId]);

  const handleAddSubjectSchedule = useCallback((subId: string) => {
    if (schedule.some(s => s.subjectId === subId)) return;
    const newSlot = {
      subjectId: subId,
      startMonthIndex: 0,
      startDay: 1,
      endMonthIndex: 0,
      endDay: 15
    };
    const updated = [...schedule, newSlot];
    persistAndNotify(updated);
    setSelectedSubjectId(subId);
  }, [schedule, persistAndNotify]);

  // Slices generation per column based on month coordinates overlap
  const getMonthSlicesForColumn = useCallback((monthIndex: number, monthLabel: string) => {
    const slices: any[] = [];
    const targetMonth = months[monthIndex];
    const maxDays = DAYS_IN_MONTH(targetMonth.index, targetMonth.year);

    schedule.forEach(block => {
      const colorIdx = colorMap[block.subjectId];
      const sub = activeSubjects.find(s => s.id === block.subjectId);
      if (!sub) return;

      // Check if this month overlaps the subject schedule
      if (block.startMonthIndex <= monthIndex && block.endMonthIndex >= monthIndex) {
        const isExpanded = expandedSubjectId === block.subjectId;

        if (isExpanded) {
          // Drill Down: Render nested individual Readings of this Subject
          const subReadingsList = readings.filter(r => r.subjectId === block.subjectId);
          subReadingsList.forEach(reading => {
            const rSched = readingSchedules.find(rs => rs.readingId === reading.id);
            if (rSched && rSched.startMonthIndex <= monthIndex && rSched.endMonthIndex >= monthIndex) {
              const startD = rSched.startMonthIndex === monthIndex ? rSched.startDay : 1;
              const endD = rSched.endMonthIndex === monthIndex ? rSched.endDay : maxDays;
              
              const isSel = selectedReadingId === reading.id;
              
              if (temporalScale === 'days') {
                const top = (startD - 1) * DAY_ROW_HEIGHT + HEADER_HEIGHT;
                const height = (endD - startD + 1) * DAY_ROW_HEIGHT;
                slices.push({
                  id: reading.id,
                  type: 'reading',
                  title: `R${reading.number}`,
                  top,
                  height,
                  colorIdx,
                  isSel,
                  hoverTitle: `Reading ${reading.number}: ${reading.title}`
                });
              } else {
                const startW = Math.min(4, Math.floor((startD - 1) / 7));
                const endW = Math.min(4, Math.floor((endD - 1) / 7));
                const top = startW * WEEK_ROW_HEIGHT + HEADER_HEIGHT;
                const height = (endW - startW + 1) * WEEK_ROW_HEIGHT;
                slices.push({
                  id: reading.id,
                  type: 'reading',
                  title: `R${reading.number}`,
                  top,
                  height,
                  colorIdx,
                  isSel,
                  hoverTitle: `Reading ${reading.number}: ${reading.title}`
                });
              }
            }
          });
        } else {
          // Standard Subject Block Slice
          const startD = block.startMonthIndex === monthIndex ? block.startDay : 1;
          const endD = block.endMonthIndex === monthIndex ? block.endDay : maxDays;
          
          const isSel = selectedSubjectId === block.subjectId;

          if (temporalScale === 'days') {
            const top = (startD - 1) * DAY_ROW_HEIGHT + HEADER_HEIGHT;
            const height = (endD - startD + 1) * DAY_ROW_HEIGHT;
            slices.push({
              id: block.subjectId,
              type: 'subject',
              title: sub.code,
              top,
              height,
              colorIdx,
              isSel,
              hoverTitle: sub.name
            });
          } else {
            const startW = Math.min(4, Math.floor((startD - 1) / 7));
            const endW = Math.min(4, Math.floor((endD - 1) / 7));
            const top = startW * WEEK_ROW_HEIGHT + HEADER_HEIGHT;
            const height = (endW - startW + 1) * WEEK_ROW_HEIGHT;
            slices.push({
              id: block.subjectId,
              type: 'subject',
              title: sub.code,
              top,
              height,
              colorIdx,
              isSel,
              hoverTitle: sub.name
            });
          }
        }
      }
    });

    return slices;
  }, [months, schedule, colorMap, activeSubjects, expandedSubjectId, readings, readingSchedules, selectedSubjectId, selectedReadingId, temporalScale]);

  return (
    <div className="grid grid-cols-12 gap-4 w-full h-full min-h-[80vh]">
      
      {/* 📊 MACRO STUDY MATRIX (65% Width Node) */}
      <div className="col-span-8 overflow-x-auto overflow-y-hidden border border-slate-200 dark:border-[#1e2026] rounded-xl bg-white dark:bg-[#101116] p-3 flex flex-col">
        <div className="flex-1 flex flex-col space-y-3">
          
          {/* Controls Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e2026] pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] font-mono tracking-wide uppercase">Macro Study Matrix</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Timeline Slices capped at Feb 2027 boundary
                {isReadOnly && (
                  <span className="ml-2 inline-block bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border border-amber-500/30">
                    Read-Only — Drag Disabled
                  </span>
                )}
              </p>
            </div>

            {/* Scale switch */}
            <div className="flex rounded-md border border-slate-200 dark:border-[#1e2026] overflow-hidden bg-white dark:bg-[#101116] p-0.5">
              <button
                onClick={() => setTemporalScale('days')}
                className={`px-3 py-1 text-[10px] font-bold font-mono uppercase transition-colors rounded ${
                  temporalScale === 'days'
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Days (1-31)
              </button>
              <button
                onClick={() => setTemporalScale('weeks')}
                className={`px-3 py-1 text-[10px] font-bold font-mono uppercase transition-colors rounded ${
                  temporalScale === 'weeks'
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Weeks (W1-W5)
              </button>
            </div>
          </div>

          {/* Matrix Grid — fills available space */}
          <div className="overflow-auto flex-1 border border-slate-200 dark:border-[#1e2026] rounded-lg">
            <div className="inline-flex" ref={gridRef}>
              
              {/* Row Index Column (Days vs Weeks scale) */}
              <div className="sticky left-0 z-20 bg-slate-50/40 dark:bg-[#07080a]/30 w-10 border-r border-slate-200 dark:border-[#1e2026]">
                <div className="border-b border-slate-100 dark:border-[#1e2026]" style={{ height: HEADER_HEIGHT }} />
                {temporalScale === 'days' ? (
                  Array.from({ length: 31 }, (_, i) => (
                    <div
                      key={`day-idx-${i}`}
                      className="flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-[#1e2026]/60"
                      style={{ height: DAY_ROW_HEIGHT }}
                    >
                      {i + 1}
                    </div>
                  ))
                ) : (
                  Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={`week-idx-${i}`}
                      className="flex items-center justify-center text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-[#1e2026]/60"
                      style={{ height: WEEK_ROW_HEIGHT }}
                    >
                      W{i + 1}
                    </div>
                  ))
                )}
              </div>

              {/* Month Columns */}
              <div className="flex">
                {months.map((month, mIdx) => {
                  const columnSlices = getMonthSlicesForColumn(mIdx, month.label);
                  return (
                    <div key={`month-col-${mIdx}`} className="flex-shrink-0 relative border-r border-slate-200 dark:border-[#1e2026]/80" style={{ width: COL_WIDTH }}>
                      
                      {/* Month Header */}
                      <div className="flex items-center justify-center text-[10px] font-bold font-mono tracking-wider text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-[#1e2026] bg-white dark:bg-[#101116] sticky top-0 z-10 select-none" style={{ height: HEADER_HEIGHT }}>
                        {month.label}
                      </div>

                      {/* Grid Cells background */}
                      {temporalScale === 'days' ? (
                        Array.from({ length: 31 }, (_, dayIdx) => {
                          const day = dayIdx + 1;
                          const maxDay = DAYS_IN_MONTH(month.index, month.year);
                          const isValidDate = day <= maxDay;
                          return (
                            <div
                              key={`cell-day-${dayIdx}`}
                              className={`border-b border-slate-100 dark:border-[#1e2026]/30 flex items-center justify-center ${
                                isValidDate ? 'bg-transparent' : 'bg-slate-50/60 dark:bg-[#0b0c10]/70'
                              }`}
                              style={{ height: DAY_ROW_HEIGHT }}
                            >
                              {!isValidDate && <span className="text-[8px] text-slate-300 dark:text-slate-700 font-mono">✕</span>}
                            </div>
                          );
                        })
                      ) : (
                        Array.from({ length: 5 }, (_, weekIdx) => (
                          <div
                            key={`cell-week-${weekIdx}`}
                            className="border-b border-slate-100 dark:border-[#1e2026]/30 bg-transparent"
                            style={{ height: WEEK_ROW_HEIGHT }}
                          />
                        ))
                      )}

                      {/* Render Column Slices directly in Month column container absolute */}
                      {columnSlices.map(slice => {
                        const isDragged = draggedId === slice.id;
                        return (
                        <div
                          key={`${slice.id}-${slice.type}-${mIdx}`}
                          onPointerDown={(e) => handleSlicePointerDown(e, slice.id, slice.type, 'move')}
                          onPointerMove={handleSlicePointerMove}
                          onPointerUp={handleSlicePointerUp}
                          onPointerCancel={handleSlicePointerUp}
                          title={slice.hoverTitle}
                          className={`absolute left-1 right-1 rounded border select-none ${
                            isReadOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                          } ${
                            SUBJECT_COLORS[slice.colorIdx]
                          } ${slice.isSel ? 'ring-2 ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] z-10' : ''} ${
                            slice.type === 'reading' ? 'border-dashed border-sky-400 bg-sky-950/20' : ''
                          } ${isDragged ? 'z-50 opacity-90' : ''}`}
                          style={{
                            top: slice.top,
                            height: Math.max(slice.height, 24),
                            transform: isDragged ? dragTransform : undefined,
                            transition: isDragged ? 'none' : undefined,
                          }}
                        >
                          {/* Resize handles (hidden in readOnly mode) */}
                          {!isReadOnly && (
                            <>
                              <div
                                className="absolute top-0 left-0 right-0 h-[6px] cursor-ns-resize hover:bg-white/20"
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  handleSlicePointerDown(e, slice.id, slice.type, 'resize-start');
                                }}
                              />
                              <div
                                className="absolute bottom-0 left-0 right-0 h-[6px] cursor-ns-resize hover:bg-white/20"
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  handleSlicePointerDown(e, slice.id, slice.type, 'resize-end');
                                }}
                              />
                            </>
                          )}

                          {/* Block Text */}
                          <div className="flex items-center justify-between h-full px-1.5 py-0.5 text-[8px] font-mono font-bold leading-none select-none truncate">
                            <span className="truncate">{slice.title}</span>
                          </div>
                        </div>
                        );
                      })}

                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#1e2026] flex flex-wrap gap-2.5 mt-2">
          {activeSubjects.map((sub, i) => (
            <span
              key={sub.id}
              onClick={() => handleSubjectClick(sub.id)}
              className={`flex items-center gap-1 text-[9px] font-mono font-bold cursor-pointer transition-opacity ${
                selectedSubjectId === sub.id ? 'opacity-100 text-amber-400' : 'opacity-60 hover:opacity-90'
              }`}
            >
              <span className={`w-2 h-2 rounded-sm ${SUBJECT_COLORS[i % SUBJECT_COLORS.length].split(' ')[0]}`} />
              {sub.code}
            </span>
          ))}
        </div>
      </div>

      {/* 🔍 TIMELINE INSPECTOR (35% Width Node) */}
      <div className="col-span-4 border border-slate-200 dark:border-[#1e2026] rounded-xl bg-white dark:bg-[#101116] p-5 sticky top-6">
        <CfaTimelineInspector
          selectedSubject={selectedSubject}
          selectedReading={selectedReading}
          subjectSchedule={selectedSubjectSchedule}
          readingSchedule={selectedReadingSchedule}
          onUpdateSubjectSchedule={handleUpdateSubjectSchedule}
          onUpdateReadingSchedule={handleUpdateReadingSchedule}
          onDeleteSubjectSchedule={handleDeleteSubjectSchedule}
          onDeleteReadingSchedule={handleDeleteReadingSchedule}
          onAddSubjectSchedule={handleAddSubjectSchedule}
          months={months}
          unscheduledSubjects={unscheduledSubjects}
          readings={readings}
          losList={losList}
          isEditable={!isReadOnly}
        />
      </div>

    </div>
  );

  function handleSubjectClick(subId: string) {
    setSelectedSubjectId(subId);
    setSelectedReadingId(null);
    setExpandedSubjectId(prev => prev === subId ? null : subId);
  }
};
