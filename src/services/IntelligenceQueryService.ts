import {
  IntelligenceStore,
  RevisionItem,
  RevisionQueueSummary,
  WeakTopicsSummary,
  BurnoutRiskReport,
  LearningOutcomeStatement,
  StudyNote,
  Formula,
  Reading,
  Subject
} from '../types';
import { DailyMission } from './MissionEngineService';
import { ExamReadinessReport } from './ExamReadinessService';

/**
 * IntelligenceQueryService – Read Model API
 *
 * Provides a clean query interface over the IntelligenceStore so that
 * UI components never need to know the internal structure of the store.
 *
 * Each method is a derived read: it takes what it needs from the store
 * and returns a purpose-shaped response.
 */
export class IntelligenceQueryService {
  constructor(
    private getStore: () => IntelligenceStore | null,
    private getAuxData?: () => {
      losList: LearningOutcomeStatement[];
      notes: StudyNote[];
      formulas: Formula[];
      readings: Reading[];
      subjects: Subject[];
    }
  ) {}

  /** Today's recommended learning mission */
  getTodayMission(): DailyMission | null {
    const store = this.getStore();
    return store?.dailyMission ?? null;
  }

  /** Structured weak topics report */
  getWeakTopics(): WeakTopicsSummary {
    const store = this.getStore();
    const aux = this.getAuxData?.();

    const empty: WeakTopicsSummary = {
      subjectWeakness: [],
      readingWeakness: [],
      topWeakestSubject: '',
      topWeakestReading: ''
    };

    if (!store || !aux) return empty;

    const {
      disconnectedLOS,
      missingResourcesReadings,
      isolatedNotes
    } = store.graphAnalyzerHealthReport ?? {
      disconnectedLOS: [],
      missingResourcesReadings: [],
      isolatedNotes: []
    };

    // Compute subject-level weakness
    const disconnectedSubjectIds = new Set(disconnectedLOS.map(l => {
      const r = aux.readings.find(rd => rd.id === l.readingId);
      return r?.subjectId;
    }).filter(Boolean));

    const missingReadingSubjectIds = new Set(missingResourcesReadings.map(r => r.subjectId));

    const allWeakSubjectIds = new Set([...disconnectedSubjectIds, ...missingReadingSubjectIds]);

    const subjectWeakness = aux.subjects
      .filter(s => allWeakSubjectIds.has(s.id))
      .map(s => {
        const subjectLOS = aux.losList.filter(l => {
          const rd = aux.readings.find(r => r.id === l.readingId);
          return rd?.subjectId === s.id;
        });
        const completedCount = subjectLOS.filter(l => l.status === 'Completed').length;
        const weakScore = subjectLOS.length > 0
          ? Math.round((1 - completedCount / subjectLOS.length) * 100)
          : 50;

        return {
          subjectId: s.id,
          name: s.name,
          code: s.code,
          weaknessScore: weakScore,
          reason: weakScore > 70
            ? 'Most LOS not yet completed'
            : weakScore > 40
              ? 'Significant progress remaining'
              : 'Near complete, needs revision'
        };
      })
      .sort((a, b) => b.weaknessScore - a.weaknessScore);

    // Compute reading-level weakness
    const readingWeakness = missingResourcesReadings.map(r => ({
      readingId: r.id,
      name: r.title,
      weaknessScore: 70,
      reason: 'Missing linked resources or notes'
    }));

    const topWeakestSubject = subjectWeakness[0]?.name ?? '';
    const topWeakestReading = readingWeakness[0]?.name ?? '';

    return {
      subjectWeakness,
      readingWeakness,
      topWeakestSubject,
      topWeakestReading
    };
  }

  /** Exam readiness report */
  getExamReadiness(): ExamReadinessReport | null {
    const store = this.getStore();
    return store?.examReadinessReport ?? null;
  }

  /** Burnout risk assessment */
  getBurnoutRisk(): BurnoutRiskReport {
    const store = this.getStore();
    const aux = this.getAuxData?.();

    if (!store) {
      return {
        detected: false,
        riskLevel: 'low',
        recentSessionCount: 0,
        avgSessionDurationMin: 0,
        recommendation: 'No data available.'
      };
    }

    const sessions = aux?.losList
      ? []
      : [];

    return {
      detected: store.burnoutDetected,
      riskLevel: store.burnoutDetected ? 'high' : 'low',
      recentSessionCount: 0,
      avgSessionDurationMin: 0,
      recommendation: store.burnoutDetected
        ? 'Reduce study load. Take a lighter day with revision-only tasks.'
        : 'Study load appears healthy. Continue your current pace.'
    };
  }

  /** Structured revision queue with summary */
  getRevisionQueue(): RevisionQueueSummary {
    const store = this.getStore();
    const items = store?.revisionQueue ?? [];
    const today = new Date().toISOString().split('T')[0];

    const highPriorityCount = items.filter(i => i.priorityScore >= 70).length;
    const dueToday = items.filter(i => {
      const dueDate = i.dueTimestamp.split('T')[0];
      return dueDate <= today;
    }).length;

    const oldestDueItem = items.length > 0
      ? items.reduce((a, b) => a.dueTimestamp < b.dueTimestamp ? a : b).title
      : null;

    return {
      items,
      totalCount: items.length,
      highPriorityCount,
      dueToday,
      estimatedReviewMinutes: items.length * 8,
      oldestDueItem
    };
  }

  /** Is the system in degraded mode? */
  isDegraded(): boolean {
    return this.getStore()?.isDegraded ?? false;
  }
}

export const intelligenceQueryService = new IntelligenceQueryService(
  () => null
);
