import { Resource } from '../../types';
import { LearningResource, LearningResourceType, ResourceProvider } from '../types';
import { StudyStepType } from '../../types';

const DEFAULT_DURATION_MINUTES: Record<StudyStepType, number> = {
  Lecture: 50,
  Reading: 35,
  Formula: 15,
  Notebook: 20,
  Questions: 45,
  Reflection: 5,
};

const FILE_TYPE_TO_RESOURCE_TYPE: Record<string, LearningResourceType> = {
  mp4: 'Video',
  pdf: 'PDF',
  xlsx: 'Spreadsheet',
  link: 'Interactive',
  doc: 'Notes',
  docx: 'Notes',
};

const CATEGORY_TO_PROVIDER: Record<string, ResourceProvider> = {
  Lecture: 'SSCI',
  Reading: 'SSCI',
  Formula: 'SSCI',
  Question: 'Question Bank',
  Note: 'Personal',
  Video: 'SSCI',
};

export class LearningResourceAdapter {
  toLearningResources(resources: Resource[]): LearningResource[] {
    return resources.map(r => this.toLearningResource(r));
  }

  toLearningResource(r: Resource): LearningResource {
    const resourceType = this.mapResourceType(r.fileType);
    return {
      id: r.id,
      provider: this.mapProvider(r.category, resourceType),
      resourceType,
      title: r.name,
      description: '',
      readingId: r.linkedReadingId || '',
      losIds: r.linkedLOSId ? [r.linkedLOSId] : [],
      duration: 0,
      launchUrl: r.url,
      importMetadata: {
        importedAt: r.dateAdded || new Date().toISOString(),
        source: r.category,
      },
      progress: {
        minutesCompleted: 0,
        completed: false,
        lastOpenedAt: null,
        resumeState: null,
      },
    };
  }

  getDefaultDuration(stepType: StudyStepType): number {
    return DEFAULT_DURATION_MINUTES[stepType] || 30;
  }

  getPhaseTitle(stepType: StudyStepType, resources: LearningResource[]): string {
    const titles: Record<StudyStepType, string> = {
      Lecture: `Watch Lecture${resources.length > 0 ? `: ${resources[0].title}` : ''}`,
      Reading: 'Read assigned content',
      Formula: 'Formula Review',
      Notebook: 'NotebookLM Review',
      Questions: `Practice Questions${resources.length > 0 ? ` (${resources.length})` : ''}`,
      Reflection: 'Learning Reflection',
    };
    return titles[stepType] || stepType;
  }

  private mapResourceType(fileType: string): LearningResourceType {
    return FILE_TYPE_TO_RESOURCE_TYPE[fileType.toLowerCase()] || 'Notes';
  }

  private mapProvider(category: string, resourceType: LearningResourceType): ResourceProvider {
    return CATEGORY_TO_PROVIDER[category] || CATEGORY_TO_PROVIDER[resourceType] || 'SSCI';
  }
}
