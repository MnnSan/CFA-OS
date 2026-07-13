import { Subject, Reading, LearningOutcomeStatement, TimelineBlock, StudyStrategy } from '../types';

export interface StrategyEngineParams {
  strategy: StudyStrategy;
  subjects: Subject[];
  readings: Reading[];
  losList: LearningOutcomeStatement[];
  startDate: string;
  examDate: string;
  bufferDays: number;
}

export interface CalculatedPlan {
  blocks: TimelineBlock[];
  warnings: string[];
  detectedSubjectId?: string;
  detectedReadingId?: string;
}

function parseDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
 * Detect current progress from LOS statuses.
 * Returns the subject and reading with the most recent in-progress LOS.
 */
export function detectCurrentProgress(
  subjects: Subject[],
  readings: Reading[],
  losList: LearningOutcomeStatement[]
): { subjectId?: string; readingId?: string } {
  const inProgress = losList
    .filter(l => l.status === 'In Progress')
    .sort((a, b) => (b.lastReviewed || '').localeCompare(a.lastReviewed || ''));

  if (inProgress.length === 0) {
    const completed = losList.filter(l => l.status === 'Completed');
    if (completed.length === 0) return {};

    const lastCompleted = completed.reduce((latest, l) =>
      (l.lastReviewed || '') > (latest.lastReviewed || '') ? l : latest
    );
    const reading = readings.find(r => r.id === lastCompleted.readingId);
    if (!reading) return {};
    const subject = subjects.find(s => s.id === reading.subjectId);
    const nextReadings = readings
      .filter(r => r.subjectId === reading.subjectId && r.number > reading.number)
      .sort((a, b) => a.number - b.number);
    return {
      subjectId: subject?.id,
      readingId: nextReadings.length > 0 ? nextReadings[0].id : reading.id,
    };
  }

  const latest = inProgress[0];
  const reading = readings.find(r => r.id === latest.readingId);
  if (!reading) return {};
  const subject = subjects.find(s => s.id === reading.subjectId);
  return { subjectId: subject?.id, readingId: reading.id };
}

/**
 * Calculate estimated days for a subject based on LOS count proportional to total.
 */
function estimateSubjectDays(
  subjectId: string,
  totalDays: number,
  subjects: Subject[],
  losList: LearningOutcomeStatement[],
  readingSubjectMap: Record<string, string>
): number {
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

  const activeSubjects = subjects.filter(
    s => s.enabled !== false && (losCountBySubject[s.id] || 0) > 0
  );
  const totalLOS = activeSubjects.reduce((sum, s) => sum + (losCountBySubject[s.id] || 0), 0);
  if (totalLOS === 0) return Math.max(1, Math.floor(totalDays / Math.max(1, activeSubjects.length)));

  const subjectLos = losCountBySubject[subjectId] || 1;
  return Math.max(1, Math.round((subjectLos / totalLOS) * totalDays));
}

export function calculatePlan(params: StrategyEngineParams): CalculatedPlan {
  const { strategy, subjects, readings, losList, startDate, examDate, bufferDays } = params;

  const start = parseDate(startDate);
  const exam = parseDate(examDate);
  const courseworkEnd = new Date(exam);
  courseworkEnd.setDate(courseworkEnd.getDate() - bufferDays);
  const courseworkDays = Math.max(1, Math.round((courseworkEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  const warnings: string[] = [];

  // Build readingId -> subjectId map
  const readingSubjectMap: Record<string, string> = {};
  for (const r of readings) {
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

  const activeSubjects = subjects
    .filter(s => s.enabled !== false && (losCountBySubject[s.id] || 0) > 0)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  if (activeSubjects.length === 0) {
    return { blocks: [], warnings: ['No active subjects found.'] };
  }

  // Gather all subject IDs we need to schedule
  const enabledParallelIds = strategy.parallelSubjects
    .filter(p => p.enabled)
    .map(p => p.subjectId);

  const allSubjectIds = new Set([
    strategy.firstSubjectId,
    ...enabledParallelIds,
    ...activeSubjects.map(s => s.id),
  ]);

  // Build time allocation map
  const timeAllocMap: Record<string, number | undefined> = {};
  for (const ta of strategy.timeAllocations) {
    timeAllocMap[ta.subjectId] = ta.days;
  }

  const currentDate = new Date(start);
  const blocks: TimelineBlock[] = [];

  // Place first subject block
  const firstSubjectDays =
    timeAllocMap[strategy.firstSubjectId] ??
    estimateSubjectDays(strategy.firstSubjectId, courseworkDays, subjects, losList, readingSubjectMap);

  let firstBlockEnd = new Date(currentDate);
  firstBlockEnd.setDate(firstBlockEnd.getDate() + firstSubjectDays - 1);
  if (firstBlockEnd > courseworkEnd) {
    firstBlockEnd = new Date(courseworkEnd);
    warnings.push(`First subject block exceeds coursework deadline. Clamped to ${formatDate(courseworkEnd)}.`);
  }

  blocks.push({
    id: `coach-${strategy.firstSubjectId}`,
    subjectId: strategy.firstSubjectId,
    readingId: strategy.firstReadingId,
    startDate: formatDate(currentDate),
    endDate: formatDate(firstBlockEnd),
  });

  currentDate.setDate(currentDate.getDate() + firstSubjectDays);

  // Get first subject start date for relative offset calculations
  const firstSubjectStart = new Date(start);

  // Place parallel subject blocks
  for (const parallel of strategy.parallelSubjects) {
    if (!parallel.enabled) continue;
    if (parallel.subjectId === strategy.firstSubjectId) continue;

    let blockStart: Date;
    if (parallel.offsetType === 'absolute' && parallel.absoluteStartDate) {
      blockStart = parseDate(parallel.absoluteStartDate);
    } else if (parallel.offsetType === 'relative' && parallel.relativeOffsetDays !== undefined) {
      blockStart = new Date(firstSubjectStart);
      blockStart.setDate(blockStart.getDate() + parallel.relativeOffsetDays);
    } else {
      blockStart = new Date(currentDate);
    }

    // Don't start before today or before the first subject
    if (blockStart < start) blockStart = new Date(start);

    const subjectDays =
      parallel.estimatedDays ??
      timeAllocMap[parallel.subjectId] ??
      estimateSubjectDays(parallel.subjectId, courseworkDays, subjects, losList, readingSubjectMap);

    let blockEnd = new Date(blockStart);
    blockEnd.setDate(blockEnd.getDate() + subjectDays - 1);
    if (blockEnd > courseworkEnd) {
      blockEnd = new Date(courseworkEnd);
      warnings.push(`Subject block for ${parallel.subjectId} exceeds coursework deadline. Clamped.`);
    }

    if (blockStart <= courseworkEnd) {
      blocks.push({
        id: `coach-${parallel.subjectId}`,
        subjectId: parallel.subjectId,
        startDate: formatDate(blockStart),
        endDate: formatDate(blockEnd),
      });
    }

    // Advance sequential cursor if this block starts after it
    if (blockStart > currentDate) {
      currentDate.setTime(blockStart.getTime());
    }
    currentDate.setDate(currentDate.getDate() + subjectDays);
  }

  // Auto-balance remaining subjects that weren't explicitly configured
  if (strategy.autoBalanceRemaining) {
    const scheduledIds = new Set(blocks.map(b => b.subjectId));
    const unscheduled = activeSubjects.filter(s => !scheduledIds.has(s.id));

    if (unscheduled.length > 0) {
      const remainingDays = Math.max(1, Math.round((courseworkEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));

      if (remainingDays > 0) {
        const unscheduledTotalLOS = unscheduled.reduce(
          (sum, s) => sum + (losCountBySubject[s.id] || 0),
          0
        );

        if (unscheduledTotalLOS > 0) {
          for (const subject of unscheduled) {
            const subjectLos = losCountBySubject[subject.id] || 1;
            const allocatedDays = Math.max(1, Math.round((subjectLos / unscheduledTotalLOS) * remainingDays));

            let blockEnd = new Date(currentDate);
            blockEnd.setDate(blockEnd.getDate() + allocatedDays - 1);
            if (blockEnd > courseworkEnd) {
              blockEnd = new Date(courseworkEnd);
            }

            if (currentDate <= courseworkEnd) {
              blocks.push({
                id: `coach-${subject.id}`,
                subjectId: subject.id,
                startDate: formatDate(currentDate),
                endDate: formatDate(blockEnd),
              });
            }

            currentDate.setDate(currentDate.getDate() + allocatedDays);
          }
        }
      } else {
        warnings.push('No remaining coursework days for auto-balanced subjects.');
      }
    }
  }

  return { blocks: sanitizeBlocks(blocks), warnings };
}
