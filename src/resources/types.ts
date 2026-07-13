export type ResourceProvider = 'SSCI' | 'NotebookLM' | 'CFA Institute' | 'Personal' | 'Question Bank' | 'Future';

export type LearningResourceType = 'Lecture' | 'PDF' | 'Spreadsheet' | 'Question Bank' | 'Notes' | 'Video' | 'Audio' | 'Interactive' | 'Video Lecture';

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
    originalReadingStr?: string;
  };
  progress: {
    minutesCompleted: number;
    completed: boolean;
    lastOpenedAt: string | null;
    resumeState: string | null;
  };
  archived?: boolean;
  updateHistory?: Array<{ timestamp: string; action: string; details?: string }>;
  version?: number;
  lectureCode?: string;
  subject?: string;
  reading?: string;
  subReadingTag?: string;
  runtimeMinutes?: number;
  resourceLinks?: string[];
  notes?: string;
  tags?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  priority?: 'Low' | 'Medium' | 'High';
  estimatedTime?: number;
  order?: number;
  durationMinutes?: number;
  completed?: boolean;
  lastOpened?: string | null;
  launchURL?: string;
  importedFromExcel?: boolean;
  importedAt?: string;
  checksum?: string;
}

export interface ResourceCompletionStats {
  totalResources: number;
  completedResources: number;
  totalMinutesCompleted: number;
  totalDurationMinutes: number;
  completionPercent: number;
}
