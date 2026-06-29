import {
  LearningOutcomeStatement,
  Reading,
  Subject,
  Formula,
  StudyNote,
  Asset,
  StudySession,
  RevisionItem,
  GraphAnalyzerHealth,
  IntelligenceStore,
  ReadingIntelligence,
  DailySnapshot,
  MockResult,
  IntelligenceDerivedMetrics,
  PlannerReadingProgress
} from '../types';
import { learningIntelligenceService } from './LearningIntelligenceService';
import { examReadinessService, ExamReadinessReport } from './ExamReadinessService';
import { revisionEngineService } from './RevisionEngineService';
import { missionEngineService, DailyMission } from './MissionEngineService';
import { learningGraphAnalyzerService } from './LearningGraphAnalyzerService';

export interface AggregatorInput {
  subjects: Subject[];
  readings: Reading[];
  losList: LearningOutcomeStatement[];
  formulas: Formula[];
  notes: StudyNote[];
  resources: Asset[];
  sessions: StudySession[];
  mockResults: MockResult[];
  settings: {
    examDate: string;
    targetDailyHours: number;
  };
  activeSessionLOSId?: string;
  selectedLOSId: string | null;
  activeReadingAssetId: string | null;
  readingSessionActiveReport: ReadingIntelligence | null;
  dailySnapshotsList: DailySnapshot[];
  plannerProgress: PlannerReadingProgress[];
}

export interface AggregatorOutput {
  graphAnalyzerHealthReport: {
    health: GraphAnalyzerHealth;
    isolatedNotes: StudyNote[];
    orphanFormulas: Formula[];
    disconnectedLOS: LearningOutcomeStatement[];
    missingResourcesReadings: Reading[];
  } | null;
  burnoutDetected: boolean;
  revisionQueue: RevisionItem[];
  examReadinessReport: ExamReadinessReport | null;
  dailyMission: DailyMission | null;
}

export class IntelligenceAggregator {
  /**
   * Pure computation: takes all service inputs, returns computed intelligence.
   * No side effects, no caching, no fallback. Throws on invalid input.
   */
  static compute(input: AggregatorInput): AggregatorOutput {
    // 1. Graph Health
    const graphAnalyzerHealthReport = learningGraphAnalyzerService.calculateGraphHealth(
      input.subjects,
      input.readings,
      input.losList,
      input.notes,
      input.formulas,
      input.resources
    );

    // 2. Burnout Detection
    const burnoutDetected = learningIntelligenceService.detectBurnout(input.sessions);

    // 3. Revision Queue
    const revisionQueue = revisionEngineService.generateRevisionQueue(
      input.losList,
      input.formulas,
      input.notes
    );

    // 4. Exam Readiness
    const today = new Date();
    const exam = new Date(input.settings.examDate);
    const diffTime = exam.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const examReadinessReport = examReadinessService.calculateReadiness(
      input.losList,
      input.formulas,
      input.notes,
      input.resources,
      input.mockResults,
      input.sessions,
      daysRemaining,
      input.settings.examDate
    );

    // 5. Daily Mission
    const dailyMission = missionEngineService.calculateMission(
      input.activeSessionLOSId,
      input.selectedLOSId,
      input.losList,
      input.readings,
      input.subjects,
      input.formulas,
      input.notes,
      input.resources,
      burnoutDetected
    );

    return {
      graphAnalyzerHealthReport,
      burnoutDetected,
      revisionQueue,
      examReadinessReport,
      dailyMission
    };
  }

  /**
   * Computes derived metrics for event snapshot recording.
   * Stateless, no side effects.
   */
  static computeDerivedMetrics(input: AggregatorInput, output: AggregatorOutput): IntelligenceDerivedMetrics {
    const completedLOS = input.losList.filter(l => l.status === 'Completed').length;
    const syllabusCompletionPct = input.losList.length > 0
      ? (completedLOS / input.losList.length) * 100
      : 0;

    const ratedLOS = input.losList.filter(l => l.confidence != null);
    const avgConfidence = ratedLOS.length > 0
      ? ratedLOS.reduce((acc, l) => acc + l.confidence!, 0) / ratedLOS.length
      : 2.5;

    const memorizedFormulas = input.formulas.filter(f => f.isMemorized || (f.confidenceRating && f.confidenceRating >= 4)).length;
    const formulaRecallPct = input.formulas.length > 0 ? (memorizedFormulas / input.formulas.length) * 100 : 0;

    const totalHours = input.sessions.reduce((acc, s) => acc + s.durationMinutes / 60, 0);
    const uniqueDays = new Set(input.sessions.map(s => s.startTime.split('T')[0])).size;
    const studyVelocityHours = uniqueDays > 0 ? totalHours / uniqueDays : 0;

    const exam = new Date(input.settings.examDate);
    const today = new Date();
    const daysUntilExam = Math.max(0, Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      syllabusCompletionPct: Math.round(syllabusCompletionPct),
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      formulaRecallPct: Math.round(formulaRecallPct),
      studyVelocityHours: Math.round(studyVelocityHours * 10) / 10,
      projectedFinishDays: output.examReadinessReport?.projectedFinishDays ?? 0,
      weakTopicCount: output.graphAnalyzerHealthReport
        ? output.graphAnalyzerHealthReport.health.disconnectedLOSCount +
          output.graphAnalyzerHealthReport.health.isolatedNotesCount
        : 0,
      revisionQueueLength: output.revisionQueue.length,
      daysUntilExam
    };
  }

  /**
   * Applies conflict resolution rules to the aggregator output.
   * Still pure - returns modified copy, no side effects.
   */
  static resolveConflicts(output: AggregatorOutput): AggregatorOutput {
    let { dailyMission, revisionQueue, burnoutDetected, examReadinessReport } = output;

    if (burnoutDetected && dailyMission && !dailyMission.isRecoveryMission) {
      dailyMission = {
        ...dailyMission,
        isRecoveryMission: true,
        reason: 'ORCHESTRATOR OVERRIDE: Burnout indicators detected. Reducing intensity.',
        estimatedDurationHours: Math.min(dailyMission.estimatedDurationHours, 0.5)
      };
    }

    if (examReadinessReport && examReadinessReport.preparationRiskLevel === 'High') {
      revisionQueue = revisionQueue.map(item => ({
        ...item,
        priorityScore: item.priorityScore + 20
      }));
    }

    return {
      graphAnalyzerHealthReport: output.graphAnalyzerHealthReport,
      burnoutDetected,
      revisionQueue,
      examReadinessReport,
      dailyMission
    };
  }
}
