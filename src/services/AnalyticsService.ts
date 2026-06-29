/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SubjectRepository,
  ReadingRepository,
  LOSRepository,
  NoteRepository,
  ResourceRepository,
  FormulaRepository,
  StudySessionRepository
} from '../repositories';
import { Subject, Reading, LearningOutcomeStatement, StudySession } from '../types';

/**
 * Service dedicated to calculating derived study statistics and progress metrics.
 * Separated from relationship resolver logic to adhere to Single Responsibility principles.
 */
export class AnalyticsService {
  constructor(
    private subjectRepo: SubjectRepository,
    private readingRepo: ReadingRepository,
    private losRepo: LOSRepository,
    private resourceRepo: ResourceRepository,
    private noteRepo: NoteRepository,
    private sessionRepo: StudySessionRepository,
    private formulaRepo: FormulaRepository
  ) {}

  /**
   * Calculates overall progress across the entire syllabus (completed LOS percentage).
   */
  public getSyllabusCompletionPercentage(): number {
    const losList = this.losRepo.getAll();
    const total = losList.length;
    if (total === 0) return 0;
    const completed = this.losRepo.getByStatus('Completed').length;
    return Math.round((completed / total) * 100);
  }

  /**
   * Calculates total hours invested across all completed study sessions.
   */
  public getTotalHoursStudied(): number {
    const sessions = this.sessionRepo.getAll();
    const totalMinutes = sessions.reduce(
      (sum, s) => sum + (s.status === 'Completed' ? s.durationMinutes : 0),
      0
    );
    return Number((totalMinutes / 60).toFixed(1));
  }

  /**
   * Calculates study velocity: total study hours completed in the last 7 days.
   */
  public getStudyVelocity(): number {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sessions = this.sessionRepo.getAll();

    const recentMinutes = sessions.reduce((sum, s) => {
      if (s.status !== 'Completed') return sum;
      const startMs = new Date(s.startTime).getTime();
      return startMs >= sevenDaysAgo ? sum + s.durationMinutes : sum;
    }, 0);

    return Number((recentMinutes / 60).toFixed(1));
  }

  /**
   * Calculates study session frequency: number of completed sessions in the last 7 days.
   */
  public getSessionFrequency(): number {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sessions = this.sessionRepo.getAll();

    return sessions.filter(s => {
      if (s.status !== 'Completed') return false;
      const startMs = new Date(s.startTime).getTime();
      return startMs >= sevenDaysAgo;
    }).length;
  }

  /**
   * Calculates completion statistics for a specific Subject.
   */
  public getSubjectCompletion(subjectId: string): { total: number; completed: number; pct: number } {
    const subjectReadings = this.readingRepo.getBySubjectId(subjectId);
    let total = 0;
    let completed = 0;

    subjectReadings.forEach(r => {
      const rdLOS = this.losRepo.getByReadingId(r.id);
      total += rdLOS.length;
      completed += rdLOS.filter(l => l.status === 'Completed').length;
    });

    if (total === 0) return { total: 0, completed: 0, pct: 0 };
    return {
      total,
      completed,
      pct: Math.round((completed / total) * 100)
    };
  }

  /**
   * Calculates completion statistics for a specific Reading.
   */
  public getReadingCompletion(readingId: string): { total: number; completed: number; pct: number } {
    const rdLOS = this.losRepo.getByReadingId(readingId);
    const total = rdLOS.length;
    if (total === 0) return { total: 0, completed: 0, pct: 0 };
    const completed = rdLOS.filter(l => l.status === 'Completed').length;
    return {
      total,
      completed,
      pct: Math.round((completed / total) * 100)
    };
  }

  /**
   * Calculates the average confidence level (1-5) for a Subject.
   */
  public getAverageConfidenceForSubject(subjectId: string): number {
    const subjectReadings = this.readingRepo.getBySubjectId(subjectId);
    let ratedSum = 0;
    let ratedCount = 0;

    subjectReadings.forEach(r => {
      const rdLOS = this.losRepo.getByReadingId(r.id);
      const rated = rdLOS.filter(l => l.confidence !== null && l.confidence !== undefined);
      rated.forEach(l => {
        ratedSum += l.confidence || 0;
        ratedCount++;
      });
    });

    if (ratedCount === 0) return 0;
    return Number((ratedSum / ratedCount).toFixed(1));
  }

  /**
   * Calculates the average confidence level (1-5) for a Reading.
   */
  public getAverageConfidenceForReading(readingId: string): number {
    const rdLOS = this.losRepo.getByReadingId(readingId);
    const rated = rdLOS.filter(l => l.confidence !== null && l.confidence !== undefined);
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, l) => acc + (l.confidence || 0), 0);
    return Number((sum / rated.length).toFixed(1));
  }

  /**
   * Calculates the estimated remaining study hours for a specific Subject.
   */
  public getEstimatedRemainingHoursForSubject(subjectId: string): number {
    const subjectReadings = this.readingRepo.getBySubjectId(subjectId);
    let remainingHours = 0;

    subjectReadings.forEach(r => {
      const uncompletedLOS = this.losRepo.getByReadingId(r.id).filter(l => l.status !== 'Completed');
      remainingHours += uncompletedLOS.reduce((sum, l) => sum + (l.estimatedHours || 2), 0);
    });

    return remainingHours;
  }

  /**
   * Calculates the estimated remaining study hours for a specific Reading.
   */
  public getEstimatedRemainingHoursForReading(readingId: string): number {
    const uncompletedLOS = this.losRepo.getByReadingId(readingId).filter(l => l.status !== 'Completed');
    return uncompletedLOS.reduce((sum, l) => sum + (l.estimatedHours || 2), 0);
  }

  /**
   * Ranks subjects by average confidence level, lowest first (weakest).
   */
  public getWeakTopicRanking(): Array<{ subject: Subject; confidence: number; completion: number }> {
    const subjects = this.subjectRepo.getAll();
    return subjects
      .map(sub => ({
        subject: sub,
        confidence: this.getAverageConfidenceForSubject(sub.id),
        completion: this.getSubjectCompletion(sub.id).pct
      }))
      .sort((a, b) => {
        if (a.confidence === 0) return -1;
        if (b.confidence === 0) return 1;
        return a.confidence - b.confidence;
      });
  }

  /**
   * Ranks subjects by average confidence level, highest first (strongest).
   */
  public getStrongTopicRanking(): Array<{ subject: Subject; confidence: number; completion: number }> {
    const subjects = this.subjectRepo.getAll();
    return subjects
      .map(sub => ({
        subject: sub,
        confidence: this.getAverageConfidenceForSubject(sub.id),
        completion: this.getSubjectCompletion(sub.id).pct
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Finds readings that have 0 study sessions logged in the last N days.
   */
  public getInactiveReadings(daysThreshold: number = 7): Reading[] {
    const limitMs = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;
    const readings = this.readingRepo.getAll();

    return readings.filter(rd => {
      const completion = this.getReadingCompletion(rd.id);
      if (completion.pct === 100) return false;

      const sessions = this.sessionRepo.getByReadingId(rd.id);
      const recentSession = sessions.some(s => {
        if (s.status !== 'Completed') return false;
        return new Date(s.startTime).getTime() >= limitMs;
      });

      return !recentSession;
    });
  }
}
