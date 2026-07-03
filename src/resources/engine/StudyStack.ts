import { LearningResource } from '../types';
import { LearningResourceRepository } from '../repository/LearningResourceRepository';
import { AssignmentEngine } from './AssignmentEngine';

export interface StudyStackItem {
  resourceId: string;
  resourceTitle: string;
  provider: string;
  resourceType: string;
  estimatedMinutes: number;
  progressPercent: number;
  isCompleted: boolean;
  launchUrl: string;
}

export interface StudyStackResult {
  readingId: string;
  readingTitle: string;
  items: StudyStackItem[];
  totalEstimatedMinutes: number;
  totalProgressPercent: number;
}

export class StudyStackBuilder {
  constructor(
    private repository: LearningResourceRepository,
    private assignmentEngine: AssignmentEngine
  ) {}

  buildForReading(readingId: string, readingTitle: string): StudyStackResult {
    const resources = this.repository.getByReadingId(readingId);
    const assignment = this.assignmentEngine.determineTodayAssignment(readingId);

    const items: StudyStackItem[] = resources.map(r => ({
      resourceId: r.id,
      resourceTitle: r.title,
      provider: r.provider,
      resourceType: r.resourceType,
      estimatedMinutes: Math.max(0, r.duration - r.progress.minutesCompleted),
      progressPercent: r.duration > 0
        ? Math.min(100, Math.round((r.progress.minutesCompleted / r.duration) * 100))
        : 0,
      isCompleted: r.progress.completed,
      launchUrl: r.launchUrl,
    }));

    const totalEstimatedMinutes = items.reduce((sum, i) => sum + i.estimatedMinutes, 0);
    const totalProgressPercent = items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.progressPercent, 0) / items.length)
      : 0;

    return {
      readingId,
      readingTitle,
      items,
      totalEstimatedMinutes,
      totalProgressPercent,
    };
  }
}
