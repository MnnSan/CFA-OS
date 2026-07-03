import { Subject, Chapter, Reading, LearningOutcomeStatement } from '../../../../types';
import { eventBus } from '../../../../services/EventBus';
import { CurriculumRepository, ValidationError } from '../core/repositories/CurriculumRepository';

export type CurriculumChangeListener = () => void;

export class CurriculumService {
  private repository: CurriculumRepository;
  private listeners: Set<CurriculumChangeListener> = new Set();

  constructor(repository?: CurriculumRepository) {
    this.repository = repository || new CurriculumRepository();
  }

  /**
   * Register a subscriber to be notified when the curriculum data changes
   */
  public subscribe(listener: CurriculumChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error('Error firing curriculum change listener:', e);
      }
    });
  }

  // ==========================================
  // SUBJECT TRANSACTIONS
  // ==========================================
  public getSubjects(): Subject[] {
    return this.repository.getSubjects();
  }

  public getSubject(id: string): Subject | undefined {
    return this.repository.getSubject(id);
  }

  public addSubject(name: string, description: string, code: string): string {
    const id = `sub-${Math.random().toString(36).substring(2, 9)}`;
    const newSubject: Subject = {
      id,
      level: 'Level III',
      name,
      description,
      code,
      order: this.repository.getSubjects().length + 1,
      enabled: true
    };
    this.repository.addSubject(newSubject);

    eventBus.publish({
      type: 'CurriculumSubjectCreated',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: { name, code }
    });

    this.notifyListeners();
    return id;
  }

  public updateSubject(id: string, updates: Partial<Subject>): void {
    this.repository.updateSubject(id, updates);

    eventBus.publish({
      type: 'CurriculumSubjectUpdated',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: updates
    });

    this.notifyListeners();
  }

  public deleteSubject(id: string): void {
    const subject = this.repository.getSubject(id);
    this.repository.deleteSubject(id);

    eventBus.publish({
      type: 'CurriculumSubjectDeleted',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: { name: subject?.name }
    });

    this.notifyListeners();
  }

  public reorderSubjects(orderedIds: string[]): void {
    this.repository.reorderSubjects(orderedIds);

    eventBus.publish({
      type: 'CurriculumHierarchyChanged',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: 'root',
      payload: { level: 'Subject', orderedIds }
    });

    this.notifyListeners();
  }

  // ==========================================
  // CHAPTER TRANSACTIONS
  // ==========================================
  public getChapters(): Chapter[] {
    return this.repository.getChapters();
  }

  public getChapter(id: string): Chapter | undefined {
    return this.repository.getChapter(id);
  }

  public getChaptersForSubject(subjectId: string): Chapter[] {
    return this.repository.getChaptersForSubject(subjectId);
  }

  public addChapter(subjectId: string, name: string, description: string): string {
    const id = `chap-${Math.random().toString(36).substring(2, 9)}`;
    const newChapter: Chapter = {
      id,
      subjectId,
      name,
      description,
      order: this.repository.getChaptersForSubject(subjectId).length + 1,
      estimatedHours: 10,
      enabled: true
    };
    this.repository.addChapter(newChapter);

    eventBus.publish({
      type: 'CurriculumChapterCreated',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: { subjectId, name }
    });

    this.notifyListeners();
    return id;
  }

  public updateChapter(id: string, updates: Partial<Chapter>): void {
    this.repository.updateChapter(id, updates);

    this.notifyListeners();
  }

  public deleteChapter(id: string): void {
    this.repository.deleteChapter(id);

    eventBus.publish({
      type: 'CurriculumChapterDeleted',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: { id }
    });

    this.notifyListeners();
  }

  public reorderChapters(subjectId: string, orderedIds: string[]): void {
    this.repository.reorderChapters(subjectId, orderedIds);

    eventBus.publish({
      type: 'CurriculumHierarchyChanged',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: subjectId,
      payload: { level: 'Chapter', subjectId, orderedIds }
    });

    this.notifyListeners();
  }

  // ==========================================
  // READING TRANSACTIONS
  // ==========================================
  public getReadings(): Reading[] {
    return this.repository.getReadings();
  }

  public getReading(id: string): Reading | undefined {
    return this.repository.getReading(id);
  }

  public getReadingsForChapter(chapterId: string): Reading[] {
    return this.repository.getReadingsForChapter(chapterId);
  }

  public addReading(chapterId: string, name: string, description: string): string {
    const chapter = this.repository.getChapter(chapterId);
    if (!chapter) throw new Error(`Parent chapter ${chapterId} not found`);

    const id = `read-${Math.random().toString(36).substring(2, 9)}`;
    const newReading: Reading = {
      id,
      subjectId: chapter.subjectId,
      chapterId,
      name,
      title: name,
      readingNumber: this.repository.getReadingsForChapter(chapterId).length + 1,
      number: this.repository.getReadingsForChapter(chapterId).length + 1,
      description,
      estimatedHours: 5,
      difficulty: 'Medium',
      enabled: true,
      order: this.repository.getReadingsForChapter(chapterId).length + 1,
      targets: {
        pageCount: 30,
        totalLOSCount: 0,
        eocqCount: 10,
        videoDurationString: '01:00:00',
        videoDurationMinutes: 60,
        weightingFactor: 1.0
      }
    };
    this.repository.addReading(newReading);

    eventBus.publish({
      type: 'CurriculumReadingCreated',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: { chapterId, name }
    });

    this.notifyListeners();
    return id;
  }

  public updateReading(id: string, updates: Partial<Reading>): void {
    this.repository.updateReading(id, updates);

    eventBus.publish({
      type: 'CurriculumReadingUpdated',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: updates
    });

    this.notifyListeners();
  }

  public deleteReading(id: string): void {
    this.repository.deleteReading(id);

    eventBus.publish({
      type: 'CurriculumReadingDeleted',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: { id }
    });

    this.notifyListeners();
  }

  public reorderReadings(chapterId: string, orderedIds: string[]): void {
    this.repository.reorderReadings(chapterId, orderedIds);

    eventBus.publish({
      type: 'CurriculumHierarchyChanged',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: chapterId,
      payload: { level: 'Reading', chapterId, orderedIds }
    });

    this.notifyListeners();
  }

  // ==========================================
  // LOS TRANSACTIONS
  // ==========================================
  public getLOSList(): LearningOutcomeStatement[] {
    return this.repository.getLOSList();
  }

  public getLOS(id: string): LearningOutcomeStatement | undefined {
    return this.repository.getLOS(id);
  }

  public getLOSForReading(readingId: string): LearningOutcomeStatement[] {
    return this.repository.getLOSForReading(readingId);
  }

  public addLOS(readingId: string, code: string, statement: string): string {
    const reading = this.repository.getReading(readingId);
    if (!reading) throw new Error(`Parent reading ${readingId} not found`);

    const id = `los-${Math.random().toString(36).substring(2, 9)}`;
    const newLOS: LearningOutcomeStatement = {
      id,
      readingId,
      code,
      statement,
      title: statement,
      description: statement,
      difficulty: null,
      status: 'Not Started',
      confidence: null,
      bookmarked: false,
      order: this.repository.getLOSForReading(readingId).length + 1,
      enabled: true
    };
    this.repository.addLOS(newLOS);

    eventBus.publish({
      type: 'CurriculumLOSCreated',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: { readingId, code }
    });

    this.notifyListeners();
    return id;
  }

  public updateLOS(id: string, updates: Partial<LearningOutcomeStatement>): void {
    this.repository.updateLOS(id, updates);

    // Maintain existing event triggers for updates
    if (updates.confidence !== undefined && updates.confidence !== null) {
      eventBus.publish({
        type: 'ConfidenceChanged',
        timestamp: new Date().toISOString(),
        source: 'CurriculumService',
        entityId: id,
        payload: { confidence: updates.confidence }
      });
    }
    if (updates.status === 'Completed') {
      eventBus.publish({
        type: 'LOSCompleted',
        timestamp: new Date().toISOString(),
        source: 'CurriculumService',
        entityId: id,
        payload: { status: 'Completed' }
      });
    }

    this.notifyListeners();
  }

  public deleteLOS(id: string): void {
    this.repository.deleteLOS(id);

    eventBus.publish({
      type: 'CurriculumLOSDeleted',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: id,
      payload: { id }
    });

    this.notifyListeners();
  }

  public reorderLOS(readingId: string, orderedIds: string[]): void {
    this.repository.reorderLOS(readingId, orderedIds);

    eventBus.publish({
      type: 'CurriculumHierarchyChanged',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: readingId,
      payload: { level: 'LOS', readingId, orderedIds }
    });

    this.notifyListeners();
  }

  // ==========================================
  // BULK STORAGE TRANSACTIONS
  // ==========================================
  public exportCurriculum(): string {
    return this.repository.exportCurriculum();
  }

  public importCurriculum(jsonString: string): { success: boolean; errors: ValidationError[] } {
    const result = this.repository.importCurriculum(jsonString);
    if (result.success) {
      eventBus.publish({
        type: 'CurriculumImported',
        timestamp: new Date().toISOString(),
        source: 'CurriculumService',
        entityId: 'curriculum',
        payload: {}
      });
      this.notifyListeners();
    }
    return result;
  }

  public resetCurriculum(): void {
    this.repository.resetCurriculum();

    eventBus.publish({
      type: 'CurriculumReset',
      timestamp: new Date().toISOString(),
      source: 'CurriculumService',
      entityId: 'curriculum',
      payload: {}
    });

    this.notifyListeners();
  }

  public validateCurriculum(): ValidationError[] {
    return this.repository.validate();
  }
}
