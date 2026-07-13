/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subject, Reading, LearningOutcomeStatement, TimelineBlock, StudyStrategy } from '../types';
import { calculatePlan } from './StrategyEngine';

export interface CoachEngineParams {
  startDate: string;
  examDate: string;
  bufferDays: number;
  subjects: Subject[];
  readings: Reading[];
  losList: LearningOutcomeStatement[];
}

function parseDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date();
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Enforce chronological ordering on raw block data at the structural level.
 * Swaps startDate/endDate if inverted — applied at the engine boundary
 * so no downstream consumer sees backward timelines.
 */
function sanitizeBlocks(blocks: TimelineBlock[]): TimelineBlock[] {
  return blocks.map(block => {
    const start = new Date(block.startDate).getTime();
    const end = new Date(block.endDate).getTime();
    if (start > end) {
      return { ...block, startDate: block.endDate, endDate: block.startDate };
    }
    return block;
  });
}

/**
 * Generates a Coach AI Blueprint — an immutable, contiguous block schedule
 * with proportional LOS-based time allocation.
 */
export function generateCoachTemplate(params: CoachEngineParams): TimelineBlock[] {
  const { startDate, examDate, bufferDays, subjects, losList } = params;

  const start = parseDate(startDate);
  const exam = parseDate(examDate);

  // Last day of coursework = examDate - bufferDays
  const courseworkEnd = new Date(exam);
  courseworkEnd.setDate(courseworkEnd.getDate() - bufferDays);

  // Total available coursework days (minimum 1)
  const courseworkDays = Math.max(
    1,
    Math.round((courseworkEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Build readingId → subjectId map
  const readingSubjectMap: Record<string, string> = {};
  for (const r of params.readings) {
    readingSubjectMap[r.id] = r.subjectId;
  }

  // Count LOS per subject
  const losCountBySubject: Record<string, number> = {};
  for (const sub of subjects) {
    losCountBySubject[sub.id] = 0;
  }
  for (const los of losList) {
    const subId = readingSubjectMap[los.readingId];
    if (subId && losCountBySubject[subId] !== undefined) {
      losCountBySubject[subId]++;
    }
  }

  // Filter active subjects that have at least one LOS
  const activeSubjects = [...subjects]
    .filter(s => s.enabled !== false && (losCountBySubject[s.id] || 0) > 0)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  const subjectCount = activeSubjects.length;
  if (subjectCount === 0) return [];

  const totalLOS = activeSubjects.reduce((sum, s) => sum + (losCountBySubject[s.id] || 0), 0);
  if (totalLOS === 0) return [];

  // Proportional allocation by LOS count
  const blocks: TimelineBlock[] = [];
  const currentDate = new Date(start);

  for (const subject of activeSubjects) {
    const subjectLosCount = losCountBySubject[subject.id] || 1;
    const allocatedDays = Math.max(1, Math.round((subjectLosCount / totalLOS) * courseworkDays));

    const blockStart = new Date(currentDate);
    const blockEnd = new Date(currentDate);
    blockEnd.setDate(blockEnd.getDate() + allocatedDays - 1);


    // Clamp to not exceed coursework deadline
    if (blockEnd > courseworkEnd) {
      blockEnd.setTime(courseworkEnd.getTime());
    }

    blocks.push({
      id: `coach-${subject.id}`,
      subjectId: subject.id,
      startDate: formatDate(blockStart),
      endDate: formatDate(blockEnd),
    });

    currentDate.setDate(currentDate.getDate() + allocatedDays);
    // If we've passed the coursework deadline, stop
    if (currentDate > courseworkEnd) break;
  }

  return sanitizeBlocks(blocks);
}

/**
 * Generates a strategy-based template using the user's study strategy preferences.
 * Delegates to StrategyEngine for the actual calculation.
 */
export function generateStrategyTemplate(
  strategy: StudyStrategy,
  subjects: Subject[],
  readings: Reading[],
  losList: LearningOutcomeStatement[],
  settings: { startDate: string; examDate: string; bufferDays: number }
): TimelineBlock[] {
  const result = calculatePlan({
    strategy,
    subjects,
    readings,
    losList,
    startDate: settings.startDate,
    examDate: settings.examDate,
    bufferDays: settings.bufferDays,
  });
  return result.blocks;
}
