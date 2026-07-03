export type ResourceProvider = 'SSCI' | 'NotebookLM' | 'CFA Institute' | 'Personal' | 'Question Bank' | 'Future';

export type LearningResourceType = 'Lecture' | 'PDF' | 'Spreadsheet' | 'Question Bank' | 'Notes' | 'Video' | 'Audio' | 'Interactive';

export interface LearningResource {
  id: string;
  provider: ResourceProvider;
  resourceType: LearningResourceType;
  title: string;
  description: string;
  readingId: string;
  losIds: string[];
  duration: number;
  launchUrl: string;
  importMetadata: {
    importedAt: string;
    source: string;
    originalId?: string;
  };
  progress: {
    minutesCompleted: number;
    completed: boolean;
    lastOpenedAt: string | null;
    resumeState: string | null;
  };
  lectureCode?: string;
  subject?: string;
  reading?: string;
  subReadingTag?: string;
  runtimeMinutes?: number;
  resourceLinks?: string[];
}

export interface ResourceCompletionStats {
  totalResources: number;
  completedResources: number;
  totalMinutesCompleted: number;
  totalDurationMinutes: number;
  completionPercent: number;
}
