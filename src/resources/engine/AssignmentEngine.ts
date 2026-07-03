import { LearningResource } from '../types';
import { LearningResourceRepository } from '../repository/LearningResourceRepository';

export interface AssignmentResult {
  todayLecture: LearningResource | null;
  partiallyCompleted: LearningResource[];
  incompleteResources: LearningResource[];
  estimatedWorkloadMinutes: number;
}

export class AssignmentEngine {
  constructor(private repository: LearningResourceRepository) {}

  determineTodayAssignment(readingId: string): AssignmentResult {
    const resources = this.repository.getByReadingId(readingId);

    const todayLecture = resources.find(
      r => r.resourceType === 'Lecture' && !r.progress.completed
    ) || resources.find(r => r.resourceType === 'Lecture') || null;

    const partiallyCompleted = resources.filter(
      r => !r.progress.completed && r.progress.minutesCompleted > 0
    );

    const incompleteResources = resources.filter(r => !r.progress.completed);

    const estimatedWorkloadMinutes = incompleteResources.reduce(
      (sum, r) => sum + Math.max(0, r.duration - r.progress.minutesCompleted), 0
    );

    return { todayLecture, partiallyCompleted, incompleteResources, estimatedWorkloadMinutes };
  }

  estimateWorkload(readingId: string): number {
    return this.determineTodayAssignment(readingId).estimatedWorkloadMinutes;
  }
}
