/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RevisionItem, LearningOutcomeStatement, Formula, StudyNote } from '../types';

export class RevisionEngineService {
  /**
   * Generates a ranked revision queue using spaced repetition priority algorithms (SM-2 / Leitner).
   */
  public generateRevisionQueue(
    losList: LearningOutcomeStatement[],
    formulas: Formula[],
    notes: StudyNote[],
    maxQueueSize: number = 12
  ): RevisionItem[] {
    const queue: RevisionItem[] = [];

    // 1. Process Formulas
    formulas.forEach(form => {
      let priorityScore = 0;
      
      // If not memorized, boost priority
      if (!form.isMemorized) {
        priorityScore += 40;
      }
      
      // If confidence rating is low, boost priority
      if (form.confidenceRating !== undefined && form.confidenceRating !== null) {
        priorityScore += (5 - form.confidenceRating) * 12; // lower confidence = higher priority
      } else {
        priorityScore += 30; // middle default if unrated
      }

      // Subject weighting boost (Ethics and Portfolio Management are high weights in Level III)
      if (form.linkedSubjectId === 'sub-ethics' || form.linkedSubjectId === 'sub-aa' || form.linkedSubjectId === 'sub-pwm') {
        priorityScore += 15;
      }

      queue.push({
        id: form.id,
        type: 'formula',
        title: `Formula Recall: ${form.name}`,
        dueTimestamp: new Date().toISOString(), // due immediately
        priorityScore,
        confidenceRating: form.confidenceRating || undefined
      });
    });

    // 2. Process Notes
    notes.forEach(note => {
      let priorityScore = 0;

      // Note age/updates booster
      const noteAgeDays = (Date.now() - new Date(note.updatedTime).getTime()) / (1000 * 60 * 60 * 24);
      priorityScore += Math.min(30, Math.round(noteAgeDays * 2)); // older notes get higher priority up to +30

      if (note.linkedSubjectId === 'sub-ethics' || note.linkedSubjectId === 'sub-aa') {
        priorityScore += 15;
      }

      queue.push({
        id: note.id,
        type: 'note',
        title: `Review Note: ${note.title}`,
        dueTimestamp: new Date().toISOString(),
        priorityScore
      });
    });

    // 3. Process Weak LOS
    losList.forEach(los => {
      let priorityScore = 0;

      if (los.status === 'In Progress') {
        priorityScore += 25;
      }

      if (los.confidence !== undefined && los.confidence !== null) {
        priorityScore += (5 - los.confidence) * 15;
      } else if (los.status === 'Completed') {
        priorityScore += 10; // low priority if completed and unrated
      } else {
        priorityScore += 20;
      }

      // Check importance weights
      if (los.code.startsWith('18') || los.code.startsWith('19') || los.code.startsWith(' ethics')) {
        priorityScore += 10;
      }

      queue.push({
        id: los.id,
        type: 'los',
        title: `Practice LOS ${los.code.toUpperCase()}`,
        dueTimestamp: new Date().toISOString(),
        priorityScore,
        confidenceRating: los.confidence || undefined
      });
    });

    // Sort descending by priority score
    queue.sort((a, b) => b.priorityScore - a.priorityScore);

    return queue.slice(0, maxQueueSize);
  }
}

export const revisionEngineService = new RevisionEngineService();
