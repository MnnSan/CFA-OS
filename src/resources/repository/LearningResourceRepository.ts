import { LearningResource, ResourceProvider, LearningResourceType, ResourceCompletionStats } from '../types';
import { eventBus } from '../../services/EventBus';

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

function calculateFNV1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

export class LearningResourceRepository {
  private resources: LearningResource[];
  private backup: LearningResource[] | null = null;
  private inTransaction = false;

  constructor() {
    console.log('[DevLog] LearningResourceRepository initialized');
    this.resources = loadFromStorage();
  }

  // --- Transactions ---
  public beginTransaction(): void {
    if (this.inTransaction) {
      console.warn('[LearningResourceRepository] Transaction already active, nested transaction ignored.');
      return;
    }
    this.backup = JSON.parse(JSON.stringify(this.resources));
    this.inTransaction = true;
    console.log('[LearningResourceRepository] Transaction started.');
  }

  public commitTransaction(): void {
    if (!this.inTransaction) {
      console.warn('[LearningResourceRepository] No active transaction to commit.');
      return;
    }
    this.backup = null;
    this.inTransaction = false;
    saveToStorage(this.resources);
    console.log('[LearningResourceRepository] Transaction committed successfully.');
  }

  public rollbackTransaction(): void {
    if (!this.inTransaction || !this.backup) {
      console.warn('[LearningResourceRepository] No active transaction to rollback.');
      return;
    }
    this.resources = this.backup;
    this.backup = null;
    this.inTransaction = false;
    saveToStorage(this.resources);
    console.log('[LearningResourceRepository] Transaction rolled back to previous state.');
  }

  // --- Validation ---
  public validate(resource: LearningResource): string[] {
    const errors: string[] = [];
    if (!resource.id || resource.id.trim() === '') errors.push('Resource ID is required');
    if (!resource.title || resource.title.trim() === '') errors.push('Title is required');
    if (!resource.provider || resource.provider.trim() === '') errors.push('Provider is required');
    if (!resource.resourceType || resource.resourceType.trim() === '') errors.push('ResourceType is required');
    if (resource.duration < 0) errors.push('Duration cannot be negative');
    if (!resource.readingId || resource.readingId.trim() === '') errors.push('Reading ID link is required');
    return errors;
  }

  // --- Checksum Support ---
  public getChecksum(): string {
    const str = JSON.stringify(this.resources);
    return calculateFNV1a(str);
  }

  // --- CRUD Operations ---
  getAll(includeArchived = false): LearningResource[] {
    return this.resources.filter(r => includeArchived || !r.archived);
  }


  getById(id: string): LearningResource | undefined {
    return this.resources.find(r => r.id === id);
  }

  getByReadingId(readingId: string, includeArchived = false): LearningResource[] {
    return this.resources.filter(r => r.readingId === readingId && (includeArchived || !r.archived));
  }

  getByLOSId(losId: string, includeArchived = false): LearningResource[] {
    return this.resources.filter(r => r.losIds && r.losIds.includes(losId) && (includeArchived || !r.archived));
  }

  getBySubject(subjectId: string, readingsBySubject: Map<string, string[]>, includeArchived = false): LearningResource[] {
    const readingIds = readingsBySubject.get(subjectId) || [];
    return this.resources.filter(r => readingIds.includes(r.readingId) && (includeArchived || !r.archived));
  }

  getByProvider(provider: ResourceProvider, includeArchived = false): LearningResource[] {
    return this.resources.filter(r => r.provider === provider && (includeArchived || !r.archived));
  }

  getByReadingIdAndProvider(readingId: string, provider: ResourceProvider, includeArchived = false): LearningResource[] {
    return this.resources.filter(r => r.readingId === readingId && r.provider === provider && (includeArchived || !r.archived));
  }

  getByType(resourceType: LearningResourceType, includeArchived = false): LearningResource[] {
    return this.resources.filter(r => r.resourceType === resourceType && (includeArchived || !r.archived));
  }

  getIncomplete(includeArchived = false): LearningResource[] {
    return this.resources.filter(r => !r.progress.completed && (includeArchived || !r.archived));
  }

  getCompleted(includeArchived = false): LearningResource[] {
    return this.resources.filter(r => r.progress.completed && (includeArchived || !r.archived));
  }

  getIncompleteByReadingId(readingId: string, includeArchived = false): LearningResource[] {
    return this.resources.filter(r => r.readingId === readingId && !r.progress.completed && (includeArchived || !r.archived));
  }

  private logUpdateHistory(resource: LearningResource, action: string, details?: string): void {
    if (!resource.updateHistory) {
      resource.updateHistory = [];
    }
    resource.updateHistory.push({
      timestamp: new Date().toISOString(),
      action,
      details
    });
    resource.version = (resource.version || 0) + 1;
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
      updateHistory: [],
      version: 1
    };

    const errors = this.validate(newResource);
    if (errors.length > 0) {
      throw new Error(`[LearningResourceRepository] Validation failed for new resource: ${errors.join(', ')}`);
    }

    this.resources.push(newResource);
    if (!this.inTransaction) saveToStorage(this.resources);

    eventBus.publish({
      type: 'ResourceCreated',
      timestamp: new Date().toISOString(),
      source: 'LearningResourceRepository',
      entityId: newResource.id,
      payload: { title: newResource.title }
    });

    return newResource;
  }

  create(resource: Omit<LearningResource, 'id' | 'importMetadata'> & { importMetadata?: Partial<LearningResource['importMetadata']> }): LearningResource {
    return this.add(resource);
  }

  addMany(resources: Array<Omit<LearningResource, 'id' | 'importMetadata'> & { importMetadata?: Partial<LearningResource['importMetadata']> } & { id?: string }>): LearningResource[] {
    const created: LearningResource[] = resources.map(r => {
      const res: LearningResource = {
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
        updateHistory: [],
        version: 1
      };

      const errors = this.validate(res);
      if (errors.length > 0) {
        throw new Error(`[LearningResourceRepository] Validation failed during bulk add: ${errors.join(', ')}`);
      }
      return res;
    });

    this.resources.push(...created);
    if (!this.inTransaction) saveToStorage(this.resources);

    eventBus.publish({
      type: 'BulkResourcesCreated',
      timestamp: new Date().toISOString(),
      source: 'LearningResourceRepository',
      entityId: 'bulk',
      payload: { count: created.length }
    });

    return created;
  }

  update(id: string, updates: Partial<LearningResource>): LearningResource | undefined {
    const idx = this.resources.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const current = this.resources[idx];
    
    const updated: LearningResource = {
      ...current,
      ...updates,
      progress: updates.progress ? {
        ...current.progress,
        ...updates.progress
      } : current.progress
    };

    const errors = this.validate(updated);
    if (errors.length > 0) {
      throw new Error(`[LearningResourceRepository] Validation failed for update: ${errors.join(', ')}`);
    }

    this.logUpdateHistory(updated, 'Update', JSON.stringify(updates));
    this.resources[idx] = updated;
    
    if (!this.inTransaction) saveToStorage(this.resources);

    eventBus.publish({
      type: 'ResourceUpdated',
      timestamp: new Date().toISOString(),
      source: 'LearningResourceRepository',
      entityId: id,
      payload: { updates }
    });

    return updated;
  }

  duplicate(id: string): LearningResource | undefined {
    const original = this.getById(id);
    if (!original) return undefined;
    
    const clone: LearningResource = {
      ...original,
      title: `${original.title} (Copy)`,
      id: generateId(),
      progress: {
        minutesCompleted: 0,
        completed: false,
        lastOpenedAt: null,
        resumeState: null,
      },
      updateHistory: [{ timestamp: new Date().toISOString(), action: 'Duplicated', details: `Cloned from ${original.id}` }],
      version: 1
    };

    this.resources.push(clone);
    if (!this.inTransaction) saveToStorage(this.resources);

    eventBus.publish({
      type: 'ResourceCreated',
      timestamp: new Date().toISOString(),
      source: 'LearningResourceRepository',
      entityId: clone.id,
      payload: { title: clone.title, duplicatedFrom: id }
    });

    return clone;
  }

  archive(id: string): boolean {
    const resource = this.getById(id);
    if (!resource) return false;
    resource.archived = true;
    this.logUpdateHistory(resource, 'Archive');
    
    if (!this.inTransaction) saveToStorage(this.resources);

    eventBus.publish({
      type: 'ResourceArchived',
      timestamp: new Date().toISOString(),
      source: 'LearningResourceRepository',
      entityId: id,
      payload: { title: resource.title }
    });

    return true;
  }

  restore(id: string): boolean {
    const resource = this.getById(id);
    if (!resource) return false;
    resource.archived = false;
    this.logUpdateHistory(resource, 'Restore');
    
    if (!this.inTransaction) saveToStorage(this.resources);

    eventBus.publish({
      type: 'ResourceRestored',
      timestamp: new Date().toISOString(),
      source: 'LearningResourceRepository',
      entityId: id,
      payload: { title: resource.title }
    });

    return true;
  }

  updateProgress(id: string, updates: Partial<LearningResource['progress']>): LearningResource | undefined {
    const idx = this.resources.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const current = this.resources[idx];
    
    const updatedProgress = {
      ...current.progress,
      ...updates
    };

    this.resources[idx] = {
      ...current,
      progress: updatedProgress
    };
    
    this.logUpdateHistory(this.resources[idx], 'ProgressUpdate', JSON.stringify(updates));
    
    if (!this.inTransaction) saveToStorage(this.resources);

    eventBus.publish({
      type: 'ResourceProgressUpdated',
      timestamp: new Date().toISOString(),
      source: 'LearningResourceRepository',
      entityId: id,
      payload: { progress: updatedProgress }
    });

    return this.resources[idx];
  }

  markCompleted(id: string): LearningResource | undefined {
    return this.updateProgress(id, { completed: true });
  }

  markIncomplete(id: string): LearningResource | undefined {
    return this.updateProgress(id, { completed: false });
  }

  toggleComplete(id: string): LearningResource | undefined {
    const resource = this.getById(id);
    if (!resource) return undefined;
    const completed = !resource.progress.completed;
    return this.updateProgress(id, {
      completed,
      minutesCompleted: completed ? resource.duration : 0
    });
  }

  resetProgress(id: string): LearningResource | undefined {
    const res = this.updateProgress(id, {
      completed: false,
      minutesCompleted: 0,
      resumeState: null
    });
    
    if (res) {
      eventBus.publish({
        type: 'ResourceProgressReset',
        timestamp: new Date().toISOString(),
        source: 'LearningResourceRepository',
        entityId: id,
        payload: { title: res.title }
      });
    }
    
    return res;
  }

  linkToReading(id: string, readingId: string): LearningResource | undefined {
    return this.update(id, { readingId, reading: readingId });
  }

  linkToLOS(id: string, losIds: string[]): LearningResource | undefined {
    return this.update(id, { losIds });
  }

  linkToFormula(id: string, formulaIds: string[]): LearningResource | undefined {
    return this.update(id, { resourceLinks: formulaIds });
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
    const title = this.resources[idx].title;
    this.resources.splice(idx, 1);
    
    if (!this.inTransaction) saveToStorage(this.resources);

    eventBus.publish({
      type: 'ResourceDeleted',
      timestamp: new Date().toISOString(),
      source: 'LearningResourceRepository',
      entityId: id,
      payload: { title }
    });

    return true;
  }

  getCompletionStats(readingId?: string): ResourceCompletionStats {
    const filtered = readingId
      ? this.getByReadingId(readingId)
      : this.getAll();

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

  count(includeArchived = false): number {
    return this.resources.filter(r => includeArchived || !r.archived).length;
  }

  clear(): void {
    this.resources = [];
    if (!this.inTransaction) saveToStorage(this.resources);
  }

  getAllGroupedByReading(): Map<string, LearningResource[]> {
    const map = new Map<string, LearningResource[]>();
    for (const r of this.getAll()) {
      const existing = map.get(r.readingId) || [];
      existing.push(r);
      map.set(r.readingId, existing);
    }
    return map;
  }
}

export const learningResourceRepository = new LearningResourceRepository();
