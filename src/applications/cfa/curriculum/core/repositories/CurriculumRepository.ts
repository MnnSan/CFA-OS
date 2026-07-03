import { Subject, Chapter, Reading, LearningOutcomeStatement } from '../../../../../types';
import {
  INITIAL_2027_SUBJECTS,
  INITIAL_2027_CHAPTERS,
  INITIAL_2027_READINGS,
  INITIAL_2027_LOS
} from '../../data/initialCurriculum';

export interface ValidationError {
  type: 'duplicate_id' | 'broken_ref' | 'circular_ref' | 'invalid_order' | 'missing_field';
  message: string;
  entityId: string;
}

export class CurriculumRepository {
  private subjects: Subject[] = [];
  private chapters: Chapter[] = [];
  private readings: Reading[] = [];
  private losList: LearningOutcomeStatement[] = [];

  constructor() {
    this.load();
  }

  /**
   * Load data from LocalStorage or fall back to 2027 seed data
   */
  public load(): void {
    const savedSubjects = localStorage.getItem('cfa_subjects');
    const savedChapters = localStorage.getItem('cfa_chapters');
    const savedReadings = localStorage.getItem('cfa_readings');
    const savedLOS = localStorage.getItem('cfa_los_state');

    try {
      this.subjects = savedSubjects ? JSON.parse(savedSubjects) : INITIAL_2027_SUBJECTS;
    } catch (e) {
      this.subjects = INITIAL_2027_SUBJECTS;
    }

    try {
      this.chapters = savedChapters ? JSON.parse(savedChapters) : INITIAL_2027_CHAPTERS;
    } catch (e) {
      this.chapters = INITIAL_2027_CHAPTERS;
    }

    try {
      this.readings = savedReadings ? JSON.parse(savedReadings) : INITIAL_2027_READINGS;
    } catch (e) {
      this.readings = INITIAL_2027_READINGS;
    }

    try {
      this.losList = savedLOS ? JSON.parse(savedLOS) : INITIAL_2027_LOS;
    } catch (e) {
      this.losList = INITIAL_2027_LOS;
    }

    // Sorting by order index initially
    this.subjects.sort((a, b) => a.order - b.order);
    this.chapters.sort((a, b) => a.order - b.order);
    this.readings.sort((a, b) => a.order - b.order);
    this.losList.sort((a, b) => a.order - b.order);
  }

  /**
   * Persist current state to LocalStorage
   */
  public save(): void {
    localStorage.setItem('cfa_subjects', JSON.stringify(this.subjects));
    localStorage.setItem('cfa_chapters', JSON.stringify(this.chapters));
    localStorage.setItem('cfa_readings', JSON.stringify(this.readings));
    localStorage.setItem('cfa_los_state', JSON.stringify(this.losList));
  }

  // ==========================================
  // SUBJECT CRUD
  // ==========================================
  public getSubjects(): Subject[] {
    return this.subjects;
  }

  public getSubject(id: string): Subject | undefined {
    return this.subjects.find(s => s.id === id);
  }

  public addSubject(sub: Subject): void {
    this.subjects.push(sub);
    this.save();
  }

  public updateSubject(id: string, updates: Partial<Subject>): void {
    this.subjects = this.subjects.map(s => (s.id === id ? { ...s, ...updates } : s));
    this.save();
  }

  public deleteSubject(id: string): void {
    // Delete subject
    this.subjects = this.subjects.filter(s => s.id !== id);
    // Delete child chapters
    const chaptersToDelete = this.chapters.filter(c => c.subjectId === id).map(c => c.id);
    this.chapters = this.chapters.filter(c => c.subjectId !== id);
    // Delete child readings
    const readingsToDelete = this.readings.filter(r => r.subjectId === id || chaptersToDelete.includes(r.chapterId)).map(r => r.id);
    this.readings = this.readings.filter(r => r.subjectId !== id && !chaptersToDelete.includes(r.chapterId));
    // Delete child LOS
    this.losList = this.losList.filter(l => !readingsToDelete.includes(l.readingId));
    this.save();
  }

  public reorderSubjects(orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const sub = this.subjects.find(s => s.id === id);
      if (sub) sub.order = index + 1;
    });
    this.subjects.sort((a, b) => a.order - b.order);
    this.save();
  }

  // ==========================================
  // CHAPTER CRUD
  // ==========================================
  public getChapters(): Chapter[] {
    return this.chapters;
  }

  public getChapter(id: string): Chapter | undefined {
    return this.chapters.find(c => c.id === id);
  }

  public getChaptersForSubject(subjectId: string): Chapter[] {
    return this.chapters.filter(c => c.subjectId === subjectId).sort((a, b) => a.order - b.order);
  }

  public addChapter(chap: Chapter): void {
    this.chapters.push(chap);
    this.save();
  }

  public updateChapter(id: string, updates: Partial<Chapter>): void {
    this.chapters = this.chapters.map(c => (c.id === id ? { ...c, ...updates } : c));
    this.save();
  }

  public deleteChapter(id: string): void {
    this.chapters = this.chapters.filter(c => c.id !== id);
    // Delete readings under chapter
    const readingsToDelete = this.readings.filter(r => r.chapterId === id).map(r => r.id);
    this.readings = this.readings.filter(r => r.chapterId !== id);
    // Delete child LOS
    this.losList = this.losList.filter(l => !readingsToDelete.includes(l.readingId));
    this.save();
  }

  public reorderChapters(subjectId: string, orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const chap = this.chapters.find(c => c.id === id && c.subjectId === subjectId);
      if (chap) chap.order = index + 1;
    });
    this.chapters.sort((a, b) => a.order - b.order);
    this.save();
  }

  // ==========================================
  // READING CRUD
  // ==========================================
  public getReadings(): Reading[] {
    return this.readings;
  }

  public getReading(id: string): Reading | undefined {
    return this.readings.find(r => r.id === id);
  }

  public getReadingsForChapter(chapterId: string): Reading[] {
    return this.readings.filter(r => r.chapterId === chapterId).sort((a, b) => a.order - b.order);
  }

  public addReading(rd: Reading): void {
    this.readings.push(rd);
    this.save();
  }

  public updateReading(id: string, updates: Partial<Reading>): void {
    this.readings = this.readings.map(r => {
      if (r.id === id) {
        const merged = { ...r, ...updates };
        // Ensure title matches name & number matches readingNumber for backward compatibility
        if (updates.name !== undefined) merged.title = updates.name;
        if (updates.title !== undefined) merged.name = updates.title;
        if (updates.readingNumber !== undefined) merged.number = updates.readingNumber;
        if (updates.number !== undefined) merged.readingNumber = updates.number;
        return merged;
      }
      return r;
    });
    this.save();
  }

  public deleteReading(id: string): void {
    this.readings = this.readings.filter(r => r.id !== id);
    this.losList = this.losList.filter(l => l.readingId !== id);
    this.save();
  }

  public reorderReadings(chapterId: string, orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const rd = this.readings.find(r => r.id === id && r.chapterId === chapterId);
      if (rd) {
        rd.order = index + 1;
        rd.readingNumber = index + 1;
        rd.number = index + 1;
      }
    });
    this.readings.sort((a, b) => a.order - b.order);
    this.save();
  }

  // ==========================================
  // LOS CRUD
  // ==========================================
  public getLOSList(): LearningOutcomeStatement[] {
    return this.losList;
  }

  public getLOS(id: string): LearningOutcomeStatement | undefined {
    return this.losList.find(l => l.id === id);
  }

  public getLOSForReading(readingId: string): LearningOutcomeStatement[] {
    return this.losList.filter(l => l.readingId === readingId).sort((a, b) => a.order - b.order);
  }

  public addLOS(los: LearningOutcomeStatement): void {
    this.losList.push(los);
    this.save();
  }

  public updateLOS(id: string, updates: Partial<LearningOutcomeStatement>): void {
    this.losList = this.losList.map(l => {
      if (l.id === id) {
        const merged = { ...l, ...updates };
        if (updates.title !== undefined) merged.statement = updates.title;
        if (updates.description !== undefined) merged.statement = updates.description;
        if (updates.statement !== undefined) {
          merged.title = updates.statement;
          merged.description = updates.statement;
        }
        return merged;
      }
      return l;
    });
    this.save();
  }

  public deleteLOS(id: string): void {
    this.losList = this.losList.filter(l => l.id !== id);
    this.save();
  }

  public reorderLOS(readingId: string, orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const los = this.losList.find(l => l.id === id && l.readingId === readingId);
      if (los) los.order = index + 1;
    });
    this.losList.sort((a, b) => a.order - b.order);
    this.save();
  }

  // ==========================================
  // IMPORT / EXPORT / RESET
  // ==========================================
  public exportCurriculum(): string {
    return JSON.stringify({
      subjects: this.subjects,
      chapters: this.chapters,
      readings: this.readings,
      losList: this.losList
    }, null, 2);
  }

  public importCurriculum(jsonString: string): { success: boolean; errors: ValidationError[] } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.subjects || !data.chapters || !data.readings || !data.losList) {
        return {
          success: false,
          errors: [{ type: 'missing_field', message: 'Missing core tables (subjects, chapters, readings, or losList)', entityId: 'root' }]
        };
      }

      // Temporary assignment to run validation checks
      const originalSubjects = this.subjects;
      const originalChapters = this.chapters;
      const originalReadings = this.readings;
      const originalLOS = this.losList;

      this.subjects = data.subjects;
      this.chapters = data.chapters;
      this.readings = data.readings;
      this.losList = data.losList;

      const validationErrors = this.validate();
      if (validationErrors.length > 0) {
        // Rollback
        this.subjects = originalSubjects;
        this.chapters = originalChapters;
        this.readings = originalReadings;
        this.losList = originalLOS;
        return { success: false, errors: validationErrors };
      }

      this.save();
      return { success: true, errors: [] };
    } catch (e: any) {
      return {
        success: false,
        errors: [{ type: 'missing_field', message: `JSON parsing failed: ${e.message}`, entityId: 'root' }]
      };
    }
  }

  public resetCurriculum(): void {
    localStorage.removeItem('cfa_subjects');
    localStorage.removeItem('cfa_chapters');
    localStorage.removeItem('cfa_readings');
    localStorage.removeItem('cfa_los_state');
    this.load();
  }

  // ==========================================
  // DIAGNOSTIC VALIDATION ENGINE
  // ==========================================
  public validate(): ValidationError[] {
    const errors: ValidationError[] = [];
    errors.push(...this.checkDuplicateIds());
    errors.push(...this.checkBrokenReferences());
    errors.push(...this.checkCircularReferences());
    errors.push(...this.checkOrdering());
    return errors;
  }

  public checkDuplicateIds(): ValidationError[] {
    const errors: ValidationError[] = [];
    const seen = new Set<string>();

    const checkId = (id: string, type: string) => {
      if (!id) return;
      if (seen.has(id)) {
        errors.push({
          type: 'duplicate_id',
          message: `Duplicate ID found: '${id}' in entity type ${type}`,
          entityId: id
        });
      }
      seen.add(id);
    };

    this.subjects.forEach(s => checkId(s.id, 'Subject'));
    this.chapters.forEach(c => checkId(c.id, 'Chapter'));
    this.readings.forEach(r => checkId(r.id, 'Reading'));
    this.losList.forEach(l => checkId(l.id, 'LOS'));

    return errors;
  }

  public checkBrokenReferences(): ValidationError[] {
    const errors: ValidationError[] = [];

    const subjectIds = new Set(this.subjects.map(s => s.id));
    const chapterIds = new Set(this.chapters.map(c => c.id));
    const readingIds = new Set(this.readings.map(r => r.id));

    this.chapters.forEach(chap => {
      if (!subjectIds.has(chap.subjectId)) {
        errors.push({
          type: 'broken_ref',
          message: `Chapter '${chap.name}' references non-existent Subject ID '${chap.subjectId}'`,
          entityId: chap.id
        });
      }
    });

    this.readings.forEach(rd => {
      if (!chapterIds.has(rd.chapterId)) {
        errors.push({
          type: 'broken_ref',
          message: `Reading '${rd.name}' references non-existent Chapter ID '${rd.chapterId}'`,
          entityId: rd.id
        });
      }
      if (rd.subjectId && !subjectIds.has(rd.subjectId)) {
        errors.push({
          type: 'broken_ref',
          message: `Reading '${rd.name}' references non-existent Subject ID '${rd.subjectId}'`,
          entityId: rd.id
        });
      }
    });

    this.losList.forEach(los => {
      if (!readingIds.has(los.readingId)) {
        errors.push({
          type: 'broken_ref',
          message: `LOS '${los.code}' references non-existent Reading ID '${los.readingId}'`,
          entityId: los.id
        });
      }
    });

    return errors;
  }

  public checkCircularReferences(): ValidationError[] {
    // Top-down hierarchy has no back-references, but validation is useful for custom extensions
    return [];
  }

  public checkOrdering(): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check subjects orders
    const subOrders = new Set<number>();
    this.subjects.forEach(s => {
      if (subOrders.has(s.order)) {
        errors.push({
          type: 'invalid_order',
          message: `Multiple subjects share order index '${s.order}'`,
          entityId: s.id
        });
      }
      subOrders.add(s.order);
    });

    // Check chapters orders per subject
    const chaptersBySub = new Map<string, number[]>();
    this.chapters.forEach(c => {
      if (!chaptersBySub.has(c.subjectId)) chaptersBySub.set(c.subjectId, []);
      const orders = chaptersBySub.get(c.subjectId)!;
      if (orders.includes(c.order)) {
        errors.push({
          type: 'invalid_order',
          message: `Multiple chapters under Subject ID '${c.subjectId}' share order index '${c.order}'`,
          entityId: c.id
        });
      }
      orders.push(c.order);
    });

    // Check readings orders per chapter
    const readingsByChap = new Map<string, number[]>();
    this.readings.forEach(r => {
      if (!readingsByChap.has(r.chapterId)) readingsByChap.set(r.chapterId, []);
      const orders = readingsByChap.get(r.chapterId)!;
      if (orders.includes(r.order)) {
        errors.push({
          type: 'invalid_order',
          message: `Multiple readings under Chapter ID '${r.chapterId}' share order index '${r.order}'`,
          entityId: r.id
        });
      }
      orders.push(r.order);
    });

    return errors;
  }
}
