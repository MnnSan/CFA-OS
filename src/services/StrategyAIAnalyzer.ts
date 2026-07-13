import { Subject, Reading, LearningOutcomeStatement, StudyStrategy, AIStrategySuggestion, TimelineBlock } from '../types';
import { aiJobQueue } from './AiJobQueueService';
import { ContextBuilderService } from './ContextBuilderService';
import { StudySettings } from '../types';

/**
 * Generate deterministic strategy suggestions based on curriculum data.
 */
export function generateStrategySuggestions(
  strategy: StudyStrategy,
  blocks: TimelineBlock[],
  subjects: Subject[],
  readings: Reading[],
  losList: LearningOutcomeStatement[]
): AIStrategySuggestion[] {
  const suggestions: AIStrategySuggestion[] = [];
  const readingSubjectMap: Record<string, string> = {};
  for (const r of readings) readingSubjectMap[r.id] = r.subjectId;

  const losCountBySubject: Record<string, number> = {};
  for (const sub of subjects) losCountBySubject[sub.id] = 0;
  for (const los of losList) {
    const subId = readingSubjectMap[los.readingId];
    if (subId && losCountBySubject[subId] !== undefined) losCountBySubject[subId]++;
  }

  const firstSubject = subjects.find(s => s.id === strategy.firstSubjectId);

  // 1. Check if another subject has higher exam weight
  if (firstSubject) {
    const firstWeight = parseFloat(firstSubject.cfaWeight?.replace('%', '') || '0');
    for (const sub of subjects) {
      if (sub.id === strategy.firstSubjectId) continue;
      const subWeight = parseFloat(sub.cfaWeight?.replace('%', '') || '0');
      if (subWeight > firstWeight && (losCountBySubject[sub.id] || 0) > 0) {
        suggestions.push({
          id: 'swap-priority-' + sub.id,
          type: 'reorder',
          targetSubjectId: sub.id,
          description: `Consider starting with ${sub.name} instead of ${firstSubject.name}`,
          impact: `${sub.name} has higher exam weight (${sub.cfaWeight || 'N/A'} vs ${firstSubject.cfaWeight || 'N/A'})`,
          action: (s: StudyStrategy) => ({ ...s, firstSubjectId: sub.id }),
          applied: false,
        });
      }
    }
  }

  // 2. Check time allocation adequacy
  for (const block of blocks) {
    const subject = subjects.find(s => s.id === block.subjectId);
    if (!subject) continue;
    const losCount = losCountBySubject[block.subjectId] || 1;
    const blockStart = new Date(block.startDate);
    const blockEnd = new Date(block.endDate);
    const days = Math.max(1, Math.round((blockEnd.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const losPerDay = losCount / days;

    if (losPerDay > 1.5) {
      suggestions.push({
        id: 'extend-' + block.subjectId,
        type: 'redistribute',
        targetSubjectId: block.subjectId,
        description: `Extend ${subject.name} allocation — ${days} days for ${losCount} LOS may be tight`,
        impact: `Current pace: ${losPerDay.toFixed(1)} LOS/day. Consider ${Math.ceil(losCount / 1.2)} days for comfortable pacing`,
        action: (s: StudyStrategy) => ({
          ...s,
          timeAllocations: [
            ...s.timeAllocations.filter(t => t.subjectId !== block.subjectId),
            { subjectId: block.subjectId, days: Math.ceil(losCount / 1.2) },
          ],
        }),
        applied: false,
      });
    }
  }

  // 3. Check parallel subject sequencing for logical ordering
  const firstBlock = blocks.find(b => b.subjectId === strategy.firstSubjectId);
  if (firstBlock) {
    const firstEnd = new Date(firstBlock.endDate);
    for (const parallel of strategy.parallelSubjects) {
      if (!parallel.enabled) continue;
      if (parallel.offsetType === 'relative' && parallel.relativeOffsetDays !== undefined) {
        const expectedStart = new Date(firstBlock.startDate);
        expectedStart.setDate(expectedStart.getDate() + parallel.relativeOffsetDays);
        if (expectedStart > firstEnd) {
          const gapDays = Math.round((expectedStart.getTime() - firstEnd.getTime()) / (1000 * 60 * 60 * 24));
          if (gapDays > 14) {
            const subject = subjects.find(s => s.id === parallel.subjectId);
            suggestions.push({
              id: 'close-gap-' + parallel.subjectId,
              type: 'reschedule',
              targetSubjectId: parallel.subjectId,
              description: `${subject?.name || parallel.subjectId} starts ${gapDays} days after first subject ends`,
              impact: `Consider reducing offset to start sooner or overlapping for better continuity`,
              action: (s: StudyStrategy) => ({
                ...s,
                parallelSubjects: s.parallelSubjects.map(p =>
                  p.subjectId === parallel.subjectId
                    ? { ...p, relativeOffsetDays: Math.max(1, parallel.relativeOffsetDays! - gapDays + 7) }
                    : p
                ),
              }),
              applied: false,
            });
          }
        }
      }
    }
  }

  // 4. Check first reading alignment
  if (strategy.firstReadingId) {
    const reading = readings.find(r => r.id === strategy.firstReadingId);
    if (reading && reading.subjectId !== strategy.firstSubjectId) {
      suggestions.push({
        id: 'fix-first-reading',
        type: 'repair',
        description: `First reading "${reading.title}" doesn't match first subject`,
        impact: `Reading belongs to a different subject. Either change first subject or pick a reading within ${firstSubject?.name || 'the first subject'}`,
        action: (s: StudyStrategy) => ({ ...s, firstReadingId: undefined }),
        applied: false,
      });
    }
  }

  return suggestions;
}

/**
 * Optionally queue an AI job for natural language reasoning about the strategy.
 * Returns the job key if queued, or null if AI is unavailable.
 */
export function queueStrategyAnalysis(
  strategy: StudyStrategy,
  blocks: TimelineBlock[],
  subjects: Subject[],
  readings: Reading[],
  settings: StudySettings,
  onResult?: (text: string) => void
): string | null {
  try {
    const totalDays = blocks.reduce((sum, b) => {
      const s = new Date(b.startDate);
      const e = new Date(b.endDate);
      return sum + Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, 0);

    const metrics = {
      totalSubjects: subjects.length,
      totalHoursEstimate: 300,
      daysRemaining: totalDays,
    };

    const planningContext = ContextBuilderService.buildPlanningContext(settings, metrics);

    const jobKey = aiJobQueue.queueJob(
      'task-plan-explain',
      `strategy-${strategy.id}`,
      () => ({
        ...planningContext,
        strategy: {
          firstSubject: strategy.firstSubjectId,
          firstReading: strategy.firstReadingId,
          parallelSubjects: strategy.parallelSubjects.filter(p => p.enabled).map(p => p.subjectId),
          blocks: blocks.map(b => ({
            subjectId: b.subjectId,
            startDate: b.startDate,
            endDate: b.endDate,
          })),
        },
      }),
      settings,
      (status, result, error) => {
        if (status === 'READY' && result?.text && onResult) {
          onResult(result.text);
        }
      }
    );

    return jobKey;
  } catch {
    return null;
  }
}

/**
 * Get effective strategy suggestions (deterministic + any cached AI result).
 */
export function getStrategySuggestions(
  strategy: StudyStrategy,
  blocks: TimelineBlock[],
  subjects: Subject[],
  readings: Reading[],
  losList: LearningOutcomeStatement[]
): AIStrategySuggestion[] {
  return generateStrategySuggestions(strategy, blocks, subjects, readings, losList);
}
