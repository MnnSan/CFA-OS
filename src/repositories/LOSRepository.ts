/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LearningOutcomeStatement } from '../types';

export class LOSRepository {
  private losById = new Map<string, LearningOutcomeStatement>();
  private losByReading = new Map<string, LearningOutcomeStatement[]>();
  private losByStatus = new Map<string, LearningOutcomeStatement[]>();
  private losByDifficulty = new Map<string, LearningOutcomeStatement[]>();

  constructor(private losList: LearningOutcomeStatement[]) {
    losList.forEach(l => {
      this.losById.set(l.id, l);

      // Group by Reading ID
      if (!this.losByReading.has(l.readingId)) {
        this.losByReading.set(l.readingId, []);
      }
      this.losByReading.get(l.readingId)!.push(l);

      // Group by Status
      if (!this.losByStatus.has(l.status)) {
        this.losByStatus.set(l.status, []);
      }
      this.losByStatus.get(l.status)!.push(l);

      // Group by Difficulty
      const diffKey = l.difficulty || 'Unspecified';
      if (!this.losByDifficulty.has(diffKey)) {
        this.losByDifficulty.set(diffKey, []);
      }
      this.losByDifficulty.get(diffKey)!.push(l);
    });
  }

  public getById(id: string): LearningOutcomeStatement | undefined {
    return this.losById.get(id);
  }

  public getAll(): LearningOutcomeStatement[] {
    return this.losList;
  }

  public getByReadingId(readingId: string): LearningOutcomeStatement[] {
    return this.losByReading.get(readingId) || [];
  }

  public getByStatus(status: 'Not Started' | 'In Progress' | 'Completed'): LearningOutcomeStatement[] {
    return this.losByStatus.get(status) || [];
  }

  public getByDifficulty(difficulty: 'Easy' | 'Medium' | 'Hard' | 'Unspecified'): LearningOutcomeStatement[] {
    return this.losByDifficulty.get(difficulty) || [];
  }
}
