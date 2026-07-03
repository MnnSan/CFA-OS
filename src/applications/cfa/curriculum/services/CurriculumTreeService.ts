import { CurriculumService } from './CurriculumService';

export class CurriculumTreeService {
  constructor(private curriculumService: CurriculumService) {}

  /**
   * Moves a node of any level in the hierarchy to a new parent at a specific position.
   * Handles re-indexing order values.
   */
  public moveNode(
    nodeType: 'subject' | 'chapter' | 'reading' | 'los',
    nodeId: string,
    targetParentId: string, // subjectId for chapters, chapterId for readings, readingId for LOS, or 'root' for subjects
    targetIndex: number
  ): void {
    if (nodeType === 'subject') {
      const subjects = [...this.curriculumService.getSubjects()];
      const subIndex = subjects.findIndex(s => s.id === nodeId);
      if (subIndex === -1) return;

      const [movedSub] = subjects.splice(subIndex, 1);
      subjects.splice(targetIndex, 0, movedSub);

      const orderedIds = subjects.map(s => s.id);
      this.curriculumService.reorderSubjects(orderedIds);
    } else if (nodeType === 'chapter') {
      // Find source chapter
      const chapter = this.curriculumService.getChapter(nodeId);
      if (!chapter) return;

      const sourceParentId = chapter.subjectId;
      const isSameParent = sourceParentId === targetParentId;

      if (isSameParent) {
        const chapters = [...this.curriculumService.getChaptersForSubject(sourceParentId)];
        const index = chapters.findIndex(c => c.id === nodeId);
        if (index === -1) return;

        const [movedChap] = chapters.splice(index, 1);
        chapters.splice(targetIndex, 0, movedChap);

        this.curriculumService.reorderChapters(sourceParentId, chapters.map(c => c.id));
      } else {
        // Move to new parent subject
        this.curriculumService.updateChapter(nodeId, { subjectId: targetParentId });

        // Update readings under this chapter to have the new subjectId for compatibility
        const readings = this.curriculumService.getReadingsForChapter(nodeId);
        readings.forEach(r => {
          this.curriculumService.updateReading(r.id, { subjectId: targetParentId });
        });

        // Reorder old parent
        const oldChapters = this.curriculumService.getChaptersForSubject(sourceParentId).filter(c => c.id !== nodeId);
        this.curriculumService.reorderChapters(sourceParentId, oldChapters.map(c => c.id));

        // Reorder new parent
        const newChapters = [...this.curriculumService.getChaptersForSubject(targetParentId)];
        const indexInNew = newChapters.findIndex(c => c.id === nodeId);
        if (indexInNew !== -1) {
          const [moved] = newChapters.splice(indexInNew, 1);
          newChapters.splice(targetIndex, 0, moved);
        } else {
          newChapters.splice(targetIndex, 0, chapter);
        }
        this.curriculumService.reorderChapters(targetParentId, newChapters.map(c => c.id));
      }
    } else if (nodeType === 'reading') {
      const reading = this.curriculumService.getReading(nodeId);
      if (!reading) return;

      const sourceParentId = reading.chapterId;
      const isSameParent = sourceParentId === targetParentId;

      if (isSameParent) {
        const readings = [...this.curriculumService.getReadingsForChapter(sourceParentId)];
        const index = readings.findIndex(r => r.id === nodeId);
        if (index === -1) return;

        const [movedRd] = readings.splice(index, 1);
        readings.splice(targetIndex, 0, movedRd);

        this.curriculumService.reorderReadings(sourceParentId, readings.map(r => r.id));
      } else {
        // Get target chapter details to resolve subjectId
        const targetChapter = this.curriculumService.getChapter(targetParentId);
        if (!targetChapter) return;

        // Move to new parent chapter
        this.curriculumService.updateReading(nodeId, {
          chapterId: targetParentId,
          subjectId: targetChapter.subjectId
        });

        // Reorder old parent
        const oldReadings = this.curriculumService.getReadingsForChapter(sourceParentId).filter(r => r.id !== nodeId);
        this.curriculumService.reorderReadings(sourceParentId, oldReadings.map(r => r.id));

        // Reorder new parent
        const newReadings = [...this.curriculumService.getReadingsForChapter(targetParentId)];
        const indexInNew = newReadings.findIndex(r => r.id === nodeId);
        if (indexInNew !== -1) {
          const [moved] = newReadings.splice(indexInNew, 1);
          newReadings.splice(targetIndex, 0, moved);
        } else {
          newReadings.splice(targetIndex, 0, reading);
        }
        this.curriculumService.reorderReadings(targetParentId, newReadings.map(r => r.id));
      }
    } else if (nodeType === 'los') {
      const los = this.curriculumService.getLOS(nodeId);
      if (!los) return;

      const sourceParentId = los.readingId;
      const isSameParent = sourceParentId === targetParentId;

      if (isSameParent) {
        const losList = [...this.curriculumService.getLOSForReading(sourceParentId)];
        const index = losList.findIndex(l => l.id === nodeId);
        if (index === -1) return;

        const [movedLOS] = losList.splice(index, 1);
        losList.splice(targetIndex, 0, movedLOS);

        this.curriculumService.reorderLOS(sourceParentId, losList.map(l => l.id));
      } else {
        // Move to new parent reading
        this.curriculumService.updateLOS(nodeId, { readingId: targetParentId });

        // Reorder old parent
        const oldLOS = this.curriculumService.getLOSForReading(sourceParentId).filter(l => l.id !== nodeId);
        this.curriculumService.reorderLOS(sourceParentId, oldLOS.map(l => l.id));

        // Reorder new parent
        const newLOS = [...this.curriculumService.getLOSForReading(targetParentId)];
        const indexInNew = newLOS.findIndex(l => l.id === nodeId);
        if (indexInNew !== -1) {
          const [moved] = newLOS.splice(indexInNew, 1);
          newLOS.splice(targetIndex, 0, moved);
        } else {
          newLOS.splice(targetIndex, 0, los);
        }
        this.curriculumService.reorderLOS(targetParentId, newLOS.map(l => l.id));
      }
    }
  }

  /**
   * Duplicates a node recursively along with its subtree
   */
  public duplicateNode(
    nodeType: 'subject' | 'chapter' | 'reading' | 'los',
    nodeId: string
  ): string | undefined {
    if (nodeType === 'subject') {
      const subject = this.curriculumService.getSubject(nodeId);
      if (!subject) return;

      const newSubId = this.curriculumService.addSubject(
        `Copy of ${subject.name}`,
        subject.description,
        `${subject.code}C`
      );

      // Duplicate child chapters
      const chapters = this.curriculumService.getChaptersForSubject(nodeId);
      chapters.forEach(c => {
        this.duplicateChapterWithParent(c.id, newSubId);
      });

      return newSubId;
    } else if (nodeType === 'chapter') {
      const chapter = this.curriculumService.getChapter(nodeId);
      if (!chapter) return;

      return this.duplicateChapterWithParent(nodeId, chapter.subjectId);
    } else if (nodeType === 'reading') {
      const reading = this.curriculumService.getReading(nodeId);
      if (!reading) return;

      return this.duplicateReadingWithParent(nodeId, reading.chapterId);
    } else if (nodeType === 'los') {
      const los = this.curriculumService.getLOS(nodeId);
      if (!los) return;

      const newLOSId = this.curriculumService.addLOS(
        los.readingId,
        `${los.code} (Copy)`,
        los.statement
      );
      return newLOSId;
    }
  }

  private duplicateChapterWithParent(chapterId: string, targetSubjectId: string): string {
    const chapter = this.curriculumService.getChapter(chapterId)!;
    const newChapId = this.curriculumService.addChapter(
      targetSubjectId,
      `Copy of ${chapter.name}`,
      chapter.description
    );

    // Duplicate readings
    const readings = this.curriculumService.getReadingsForChapter(chapterId);
    readings.forEach(r => {
      this.duplicateReadingWithParent(r.id, newChapId);
    });

    return newChapId;
  }

  private duplicateReadingWithParent(readingId: string, targetChapterId: string): string {
    const reading = this.curriculumService.getReading(readingId)!;
    const newRdId = this.curriculumService.addReading(
      targetChapterId,
      `Copy of ${reading.name}`,
      reading.description
    );

    // Duplicate child LOS
    const losList = this.curriculumService.getLOSForReading(readingId);
    losList.forEach(l => {
      this.curriculumService.addLOS(newRdId, l.code, l.statement);
    });

    return newRdId;
  }
}
