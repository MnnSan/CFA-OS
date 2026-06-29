/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Reading, LearningOutcomeStatement } from '../types';

export class ReadingRepository {
  private readingById = new Map<string, Reading>();
  private readingsBySubject = new Map<string, Reading[]>();
  private readingsByDifficulty = new Map<string, Reading[]>();
  private readingsByStatus = new Map<string, Reading[]>();

  constructor(private readings: Reading[], losList?: LearningOutcomeStatement[]) {
    this.rebuildIndex(readings, losList);
  }

  /** Rebuild internal indices — call when readings array changes externally */
  public rebuildIndex(readings?: Reading[], losList?: LearningOutcomeStatement[]): void {
    const r = readings ?? this.readings;
    this.readingById.clear();
    this.readingsBySubject.clear();
    this.readingsByDifficulty.clear();
    this.readingsByStatus.clear();

    r.forEach(rd => {
      this.readingById.set(rd.id, rd);

      if (!this.readingsBySubject.has(rd.subjectId)) {
        this.readingsBySubject.set(rd.subjectId, []);
      }
      this.readingsBySubject.get(rd.subjectId)!.push(rd);

      const diffKey = rd.difficulty || 'Unspecified';
      if (!this.readingsByDifficulty.has(diffKey)) {
        this.readingsByDifficulty.set(diffKey, []);
      }
      this.readingsByDifficulty.get(diffKey)!.push(rd);
    });

    const los = losList ?? [];
    const losByReadingId = new Map<string, LearningOutcomeStatement[]>();
    los.forEach(l => {
      if (!losByReadingId.has(l.readingId)) {
        losByReadingId.set(l.readingId, []);
      }
      losByReadingId.get(l.readingId)!.push(l);
    });

    r.forEach(rd => {
      const rLOS = losByReadingId.get(rd.id) || [];
      let status: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
      if (rLOS.length > 0) {
        const completedCount = rLOS.filter(l => l.status === 'Completed').length;
        if (completedCount === rLOS.length) {
          status = 'Completed';
        } else if (completedCount > 0 || rLOS.some(l => l.status === 'In Progress')) {
          status = 'In Progress';
        }
      }
      if (!this.readingsByStatus.has(status)) {
        this.readingsByStatus.set(status, []);
      }
      this.readingsByStatus.get(status)!.push(rd);
    });
  }

  public getById(id: string): Reading | undefined {
    return this.readingById.get(id);
  }

  public getAll(): Reading[] {
    return this.readings;
  }

  public getBySubjectId(subjectId: string): Reading[] {
    return this.readingsBySubject.get(subjectId) || [];
  }

  public getByDifficulty(difficulty: 'Easy' | 'Medium' | 'Hard' | 'Unspecified'): Reading[] {
    return this.readingsByDifficulty.get(difficulty) || [];
  }

  public getByStatus(status: 'Not Started' | 'In Progress' | 'Completed'): Reading[] {
    return this.readingsByStatus.get(status) || [];
  }
}
