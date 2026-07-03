/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LearningOutcomeStatement, Formula, StudyNote, Asset, StudySession, MockResult } from '../types';

export interface ExamReadinessReport {
  readinessScore: number;
  projectedFinishDays: number;
  projectedFinishDate: string;
  velocityHoursPerDay: number;
  remainingStudyHours: number;
  preparationRiskLevel: 'Low' | 'Medium' | 'High';
  riskFactors: string[];
}

export class ExamReadinessService {
  /**
   * Evaluates current mock accuracy, formula recall, study session histories, and time remaining.
   */
  public calculateReadiness(
    losList: LearningOutcomeStatement[],
    formulas: Formula[],
    notes: StudyNote[],
    resources: Asset[],
    mockResults: MockResult[],
    sessions: StudySession[],
    daysRemaining: number,
    examDateStr: string
  ): ExamReadinessReport {
    // 1. Syllabus Completion (Completed LOS ratio)
    const completedLOS = losList.filter(l => l.status === 'Completed').length;
    const syllabusCompletion = losList.length > 0 ? (completedLOS / losList.length) * 100 : 0;

    // 2. Average Confidence Score (Scale 1-5 to percentage)
    const ratedLOS = losList.filter(l => l.confidence !== undefined && l.confidence !== null);
    const avgConfidenceVal = ratedLOS.length > 0 
      ? ratedLOS.reduce((acc, l) => acc + (l.confidence || 0), 0) / ratedLOS.length 
      : 2.5; // default middle
    const confidencePercentage = ((avgConfidenceVal - 1) / 4) * 100; // Map 1-5 to 0-100

    // 3. Formula Recall Rate
    const memorizedFormulas = formulas.filter(f => f.isMemorized || (f.confidenceRating && f.confidenceRating >= 4)).length;
    const formulaMastery = formulas.length > 0 ? (memorizedFormulas / formulas.length) * 100 : 0;

    // 4. Notes & Asset Coverage of Syllabus
    // Percent of readings covered by notes
    const readingIdsWithNotes = new Set(notes.map(n => n.linkedReadingId).filter(Boolean));
    const uniqueReadingIds = new Set(losList.map(l => l.readingId).filter(Boolean));
    const notesCoverage = uniqueReadingIds.size > 0 
      ? (readingIdsWithNotes.size / uniqueReadingIds.size) * 100 
      : 0;

    // 5. Mock Exam Accuracy
    let mockAccuracy = 70; // baseline default if no mocks attempted
    if (mockResults && mockResults.length > 0) {
      mockAccuracy = mockResults.reduce((acc, r) => acc + r.scorePercentage, 0) / mockResults.length;
    }

    // Readiness formula: 30% Completion + 30% Confidence + 20% Formulas + 10% Notes + 10% Mock Accuracy
    let readinessScore = Math.round(
      0.3 * syllabusCompletion + 
      0.3 * confidencePercentage + 
      0.2 * formulaMastery + 
      0.1 * notesCoverage + 
      0.1 * mockAccuracy
    );
    readinessScore = Math.max(10, Math.min(99, readinessScore)); // Cap below 100 to show room for final polish

    // 6. Projections
    // Sum remaining hours estimate
    const incompleteLOS = losList.filter(l => l.status !== 'Completed');
    const remainingStudyHours = incompleteLOS.reduce((acc, l) => {
      const est = l.estimatedHours || 1.5;
      const act = l.actualHours || 0;
      return acc + Math.max(0, est - act);
    }, 0);

    // Calculate historical study velocity (over past 7 days)
    const today = new Date('2026-06-28'); // Consistent reference date
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const recentSessions = sessions.filter(s => {
      const sDate = new Date(s.startTime);
      return sDate >= oneWeekAgo && sDate <= today && s.status === 'Completed';
    });

    const totalRecentMinutes = recentSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalRecentHours = totalRecentMinutes / 60;
    const velocityHoursPerDay = Number((totalRecentHours / 7).toFixed(2)) || 1.2; // default fallback if velocity is 0

    // Days required to finish
    const projectedFinishDays = Math.ceil(remainingStudyHours / velocityHoursPerDay);
    const finishDate = new Date(today);
    finishDate.setDate(today.getDate() + projectedFinishDays);
    const projectedFinishDate = finishDate.toISOString().split('T')[0];

    // 7. Risk Factors Analysis
    const riskFactors: string[] = [];
    if (projectedFinishDays > daysRemaining) {
      riskFactors.push(`Velocity warning: Study speed (${velocityHoursPerDay} hrs/day) projects syllabus completion in ${projectedFinishDays} days, which exceeds the exam date deadline (${daysRemaining} days left).`);
    }
    if (avgConfidenceVal < 3.0) {
      riskFactors.push(`Weak recall warning: Average syllabus confidence is low (${avgConfidenceVal.toFixed(1)}/5.0). Require active spaced recall.`);
    }
    if (formulaMastery < 50) {
      riskFactors.push(`Formula memorization gap: Only ${Math.round(formulaMastery)}% of required CFA Level III equations are marked as memorized.`);
    }
    if (notesCoverage < 60) {
      riskFactors.push(`Notes coverage warning: Missing custom study summaries for ${Math.round(100 - notesCoverage)}% of syllabus reading modules.`);
    }

    let preparationRiskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (riskFactors.length >= 3 || projectedFinishDays > daysRemaining + 15) {
      preparationRiskLevel = 'High';
    } else if (riskFactors.length >= 1) {
      preparationRiskLevel = 'Medium';
    }

    return {
      readinessScore,
      projectedFinishDays,
      projectedFinishDate,
      velocityHoursPerDay,
      remainingStudyHours,
      preparationRiskLevel,
      riskFactors
    };
  }
}

export const examReadinessService = new ExamReadinessService();
