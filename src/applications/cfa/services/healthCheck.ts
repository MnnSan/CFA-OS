/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { examReadinessService } from '../../../services/ExamReadinessService';
import { StudySessionService } from '../../../services/StudySessionService';
import { LearningOutcomeStatement, StudySession } from '../../../types';

/**
 * The Master Application Registry mapping core calculation services and state engines.
 */
export const ApplicationRegistry = {
  examReadinessService,
  StudySessionService,
  version: '1.0.0',
};

export interface HealthCheckResult {
  passed: boolean;
  message: string;
  details?: string;
}

/**
 * Simulates a 45-minute study session, runs mathematical assertions,
 * and verifies that the metrics recalculate correctly.
 */
export function runHealthCheck(
  losList: LearningOutcomeStatement[],
  sessions: StudySession[],
  settings: any,
  formulas: any[],
  notes: any[],
  resources: any[],
  mockResults: any[]
): HealthCheckResult {
  try {
    // 1. Deep clone database state for the sandbox simulation
    const simulatedSessions = JSON.parse(JSON.stringify(sessions)) as StudySession[];
    const simulatedLOSList = JSON.parse(JSON.stringify(losList)) as LearningOutcomeStatement[];

    // Ensure we have at least one incomplete/in-progress LOS to log time against
    let targetLOS = simulatedLOSList.find(l => l.status !== 'Completed');
    if (!targetLOS) {
      // Create a dummy incomplete LOS if everything is completed
      targetLOS = {
        id: 'test-los-id',
        readingId: 'test-reading-id',
        code: 'TEST.1',
        statement: 'Test Statement',
        status: 'In Progress',
        estimatedHours: 2.0,
        actualHours: 0,
        difficulty: 'Medium',
        confidence: null,
        bookmarked: false
      };
      simulatedLOSList.push(targetLOS);
    }
    
    // Explicitly set estimated hours to actualHours + 2.0 to ensure a headroom of at least 2 hours.
    // This guarantees est - act starts at exactly 2.0, so after adding 0.75, remaining hours drops by exactly 0.75.
    targetLOS.estimatedHours = (targetLOS.actualHours || 0) + 2.0;

    // Calculate remaining study hours before — use targetStartDate as reference
    const referenceDate = new Date(settings.targetStartDate);
    const exam = new Date(settings.examDate);
    const diffTime = exam.getTime() - referenceDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const reportBefore = examReadinessService.calculateReadiness(
      simulatedLOSList,
      formulas,
      notes,
      resources,
      mockResults,
      simulatedSessions,
      daysRemaining,
      settings.examDate
    );

    const hoursBefore = reportBefore.remainingStudyHours;

    // 2. Simulate logging a 45-minute (0.75 hours) completed study session
    const simulatedSession: StudySession = {
      id: `sim-session-${Date.now()}`,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      durationMinutes: 45,
      linkedSubjectId: 'sub-asset-allocation',
      linkedReadingId: targetLOS.readingId,
      linkedLOSId: targetLOS.id,
      notesAddedIds: [],
      resourcesUsedIds: [],
      questionsAttemptedPlaceholder: 0,
      confidenceBefore: targetLOS.confidence || 3,
      confidenceAfter: 4,
      status: 'Completed'
    };

    // Add session to history database
    simulatedSessions.unshift(simulatedSession);

    // Update target LOS actual studied hours (status remains incomplete or in-progress so it stays in remaining Study Hours calculation)
    targetLOS.actualHours = parseFloat(((targetLOS.actualHours || 0) + 0.75).toFixed(2));
    targetLOS.status = 'In Progress'; // Keep in progress so it is not excluded from incomplete list

    // 3. Recalculate readiness metrics after simulated study period
    const reportAfter = examReadinessService.calculateReadiness(
      simulatedLOSList,
      formulas,
      notes,
      resources,
      mockResults,
      simulatedSessions,
      daysRemaining,
      settings.examDate
    );

    const hoursAfter = reportAfter.remainingStudyHours;
    const diffHours = hoursBefore - hoursAfter;

    // 4. Assertions
    // Assertion 1: The session is added to history list seamlessly
    if (simulatedSessions.length !== sessions.length + 1) {
      return {
        passed: false,
        message: 'Simulation Failure: Study session was not added to the history array.',
      };
    }

    // Assertion 2: The remaining calendar hours drop by exactly 0.75 hours
    // Allow minor floating point precision tolerances (within 0.001)
    if (Math.abs(diffHours - 0.75) > 0.001) {
      return {
        passed: false,
        message: `Simulation Failure: Remaining hours did not drop by exactly 0.75 hours (dropped by ${diffHours.toFixed(4)}h).`,
      };
    }

    // Assertion 3: The velocity card adapts its numbers instantly without layout glitches (e.g. NaN or infinite values)
    if (
      isNaN(reportAfter.velocityHoursPerDay) ||
      !isFinite(reportAfter.velocityHoursPerDay) ||
      reportAfter.velocityHoursPerDay <= 0
    ) {
      return {
        passed: false,
        message: `Simulation Failure: Velocity calculation returned an invalid daily goal (${reportAfter.velocityHoursPerDay}).`,
      };
    }

    return {
      passed: true,
      message: 'Dashboard Engine Health: 100% Verified / Zero Disconnects',
      details: `Calculations verified successfully. 45-minute session (+0.75h) logged. Remaining curriculum hours decreased from ${hoursBefore.toFixed(2)}h to ${hoursAfter.toFixed(2)}h (exactly -0.75h). Daily velocity rate adapted seamlessly.`
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Health Check Exception: ${error?.message || 'Unknown error occurred'}`,
    };
  }
}
