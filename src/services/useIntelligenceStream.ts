import { useState, useEffect } from 'react';
import { intelligenceStream } from './IntelligenceStream';
import type {
  IntelligenceStore,
  BurnoutRiskReport,
  RevisionQueueSummary,
  WeakTopicsSummary
} from '../types';
import type { ExamReadinessReport } from './ExamReadinessService';
import type { DailyMission } from './MissionEngineService';

// ──────────────────────────────────────────────
// Generic stream consumer hook
// ──────────────────────────────────────────────

function useStreamValue<T>(
  channel: { subscribe(cb: (v: T) => void): () => void; getCurrent(): T | undefined },
  initial?: T
): T | undefined {
  const [value, setValue] = useState<T | undefined>(initial ?? channel.getCurrent());

  useEffect(() => {
    setValue(channel.getCurrent());
    return channel.subscribe((next) => {
      setValue(next);
    });
  }, [channel]);

  return value;
}

// ──────────────────────────────────────────────
// Named hooks — each subscribes to exactly one slice
// ──────────────────────────────────────────────

/**
 * Reactively subscribe to exam readiness.
 * Only re-renders when the readiness score actually changes.
 */
export function useExamReadiness(): ExamReadinessReport | undefined {
  return useStreamValue(intelligenceStream.readiness);
}

/**
 * Reactively subscribe to today's mission.
 * Only re-renders when the daily mission changes.
 */
export function useTodayMission(): DailyMission | undefined {
  return useStreamValue(intelligenceStream.mission);
}

/**
 * Reactively subscribe to burnout risk.
 * Only re-renders when burnout state changes.
 */
export function useBurnoutRisk(): BurnoutRiskReport | undefined {
  return useStreamValue(intelligenceStream.burnout);
}

/**
 * Reactively subscribe to the revision queue.
 * Only re-renders when queue composition changes.
 */
export function useRevisionQueue(): RevisionQueueSummary | undefined {
  return useStreamValue(intelligenceStream.revisionQueue);
}

/**
 * Reactively subscribe to weak topics.
 * Only re-renders when weakness profile changes.
 */
export function useWeakTopics(): WeakTopicsSummary | undefined {
  return useStreamValue(intelligenceStream.weakTopics);
}

/**
 * Raw intelligence store subscription (broad — re-renders on any change).
 */
export function useIntelligenceStore(): IntelligenceStore | undefined {
  return useStreamValue(intelligenceStream.raw);
}
