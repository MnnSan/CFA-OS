import { LearningResource, ResourceProvider, LearningResourceType, ResourceCompletionStats } from '../types';

const STORAGE_KEY = 'cfa_learning_resources';

function loadFromStorage(): LearningResource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((r: any) => {
          if (!r) return null;
          return {
            ...r,
            progress: r.progress || {
              minutesCompleted: 0,
              completed: false,
              lastOpenedAt: null,
              resumeState: null,
            }
          };
        }).filter((item): item is LearningResource => item !== null);
      }
    }
  } catch {}
  return [];
}

function saveToStorage(resources: LearningResource[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
}

let idCounter = 0;
function generateId(): string {
  return `lrs-${Date.now()}-${++idCounter}-${Math.random().toString(36).substring(2, 7)}`;
}

export class LearningResourceRepository {
  private resources: LearningResource[];

  constructor() {
    console.log('[DevLog] LearningResourceRepository initialized');
    this.resources = loadFromStorage();
  }

  getAll(): LearningResource[] {
    return [...this.resources];
  }

  getById(id: string): LearningResource | undefined {
    return this.resources.find(r => r.id === id);
  }

  getByReadingId(readingId: string): LearningResource[] {
    return this.resources.filter(r => r.readingId === readingId);
  }

  getBySubject(subjectId: string, readingsBySubject: Map<string, string[]>): LearningResource[] {
    const readingIds = readingsBySubject.get(subjectId) || [];
    return this.resources.filter(r => readingIds.includes(r.readingId));
  }

  getByProvider(provider: ResourceProvider): LearningResource[] {
    return this.resources.filter(r => r.provider === provider);
  }

  getByType(resourceType: LearningResourceType): LearningResource[] {
    return this.resources.filter(r => r.resourceType === resourceType);
  }

  getIncomplete(): LearningResource[] {
    return this.resources.filter(r => !r.progress.completed);
  }

  getCompleted(): LearningResource[] {
    return this.resources.filter(r => r.progress.completed);
  }

  getIncompleteByReadingId(readingId: string): LearningResource[] {
    return this.resources.filter(r => r.readingId === readingId && !r.progress.completed);
  }

  add(resource: Omit<LearningResource, 'id' | 'importMetadata'> & { importMetadata?: Partial<LearningResource['importMetadata']> }): LearningResource {
    const newResource: LearningResource = {
      ...resource,
      id: generateId(),
      importMetadata: {
        importedAt: new Date().toISOString(),
        source: 'manual',
        ...resource.importMetadata,
      },
      progress: {
        minutesCompleted: 0,
        completed: false,
        lastOpenedAt: null,
        resumeState: null,
      },
    };
    this.resources.push(newResource);
    saveToStorage(this.resources);
    return newResource;
  }

  addMany(resources: Array<Omit<LearningResource, 'id' | 'importMetadata'> & { importMetadata?: Partial<LearningResource['importMetadata']> } & { id?: string }>): LearningResource[] {
    const created: LearningResource[] = resources.map(r => ({
      ...r,
      id: r.id || generateId(),
      importMetadata: {
        importedAt: new Date().toISOString(),
        source: 'manual',
        ...r.importMetadata,
      },
      progress: {
        minutesCompleted: 0,
        completed: false,
        lastOpenedAt: null,
        resumeState: null,
      },
    }));
    this.resources.push(...created);
    saveToStorage(this.resources);
    return created;
  }

  updateProgress(id: string, updates: Partial<LearningResource['progress']>): LearningResource | undefined {
    const idx = this.resources.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.resources[idx] = {
      ...this.resources[idx],
      progress: {
        ...this.resources[idx].progress,
        ...updates,
      },
    };
    saveToStorage(this.resources);
    return this.resources[idx];
  }

  markCompleted(id: string): LearningResource | undefined {
    return this.updateProgress(id, { completed: true });
  }

  markOpened(id: string): LearningResource | undefined {
    return this.updateProgress(id, { lastOpenedAt: new Date().toISOString() });
  }

  logMinutes(id: string, minutes: number): LearningResource | undefined {
    const resource = this.getById(id);
    if (!resource) return undefined;
    const newTotal = resource.progress.minutesCompleted + minutes;
    return this.updateProgress(id, {
      minutesCompleted: newTotal,
      completed: newTotal >= resource.duration,
    });
  }

  setResumeState(id: string, resumeState: string): LearningResource | undefined {
    return this.updateProgress(id, { resumeState });
  }

  delete(id: string): boolean {
    const idx = this.resources.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.resources.splice(idx, 1);
    saveToStorage(this.resources);
    return true;
  }

  getCompletionStats(readingId?: string): ResourceCompletionStats {
    const filtered = readingId
      ? this.resources.filter(r => r.readingId === readingId)
      : this.resources;

    const totalResources = filtered.length;
    const completedResources = filtered.filter(r => r.progress.completed).length;
    const totalMinutesCompleted = filtered.reduce((sum, r) => sum + r.progress.minutesCompleted, 0);
    const totalDurationMinutes = filtered.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalResources,
      completedResources,
      totalMinutesCompleted,
      totalDurationMinutes,
      completionPercent: totalDurationMinutes > 0
        ? Math.round((totalMinutesCompleted / totalDurationMinutes) * 100)
        : 0,
    };
  }

  getAggregateCompletionStats(): ResourceCompletionStats {
    return this.getCompletionStats();
  }

  count(): number {
    return this.resources.length;
  }

  clear(): void {
    this.resources = [];
    saveToStorage(this.resources);
  }

  getAllGroupedByReading(): Map<string, LearningResource[]> {
    const map = new Map<string, LearningResource[]>();
    for (const r of this.resources) {
      const existing = map.get(r.readingId) || [];
      existing.push(r);
      map.set(r.readingId, existing);
    }
    return map;
  }
}
