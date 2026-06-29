/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SearchIndexEntry {
  id: string;
  type: 'subject' | 'reading' | 'los' | 'note' | 'formula' | 'asset' | 'chunk' | 'highlight' | 'annotation' | 'session';
  title: string;
  subtitle: string;
  content: string; // Text indexed for deep-searching
  route: string;
  metadata: {
    subjectId?: string;
    readingId?: string;
    losId?: string;
    pageNumber?: number;
    parentAssetId?: string;
    [key: string]: any;
  };
}

/**
 * KnowledgeIndexService is a **read-optimized projection cache**.
 *
 * It is NOT a second database.
 * The Knowledge Graph (via repositories) is the single source of truth.
 * This index is fully rebuildable at any time from Graph state via `rebuildIndex()`.
 * No write path should mutate the index directly — only `rebuildIndex()` replaces it wholesale.
 */
export class KnowledgeIndexService {
  private index: SearchIndexEntry[] = [];
  private lastRebuildTimestamp: string | null = null;

  /**
   * Completely discards the current index and reconstructs it from repository state.
   * This is the ONLY write path. The index is ephemeral and always rebuildable.
   */
  public rebuildIndex(
    subjects: any[],
    readings: any[],
    losList: any[],
    notes: any[],
    formulas: any[],
    assets: any[]
  ): void {
    const newIndex: SearchIndexEntry[] = [];

    // 1. Index Subjects
    subjects.forEach(sub => {
      newIndex.push({
        id: sub.id,
        type: 'subject',
        title: sub.name,
        subtitle: `Subject • L${sub.level || 'III'}`,
        content: `${sub.name} ${sub.code || ''} ${sub.description || ''}`,
        route: 'curriculum',
        metadata: { subjectId: sub.id }
      });
    });

    // 2. Index Readings
    readings.forEach(rd => {
      newIndex.push({
        id: rd.id,
        type: 'reading',
        title: `Reading ${rd.number}: ${rd.title}`,
        subtitle: `Reading • ${rd.subject || 'Curriculum'}`,
        content: `${rd.title} Reading ${rd.number} R${rd.number} ${rd.description || ''}`,
        route: 'curriculum',
        metadata: { subjectId: rd.subjectId, readingId: rd.id }
      });
    });

    // 3. Index LOS
    losList.forEach(los => {
      newIndex.push({
        id: los.id,
        type: 'los',
        title: `LOS ${los.code.toUpperCase()}`,
        subtitle: los.statement.slice(0, 100) + '...',
        content: `${los.code} ${los.statement}`,
        route: 'curriculum',
        metadata: { subjectId: los.subjectId, readingId: los.readingId, losId: los.id }
      });
    });

    // 4. Index Formulas
    formulas.forEach(form => {
      newIndex.push({
        id: form.id,
        type: 'formula',
        title: `Formula: ${form.name}`,
        subtitle: `${form.latexExpression}`,
        content: `${form.name} ${form.description} ${form.latexExpression} ${form.variables.map((v: any) => v.meaning + ' ' + v.symbol).join(' ')}`,
        route: 'curriculum',
        metadata: { subjectId: form.linkedSubjectId, readingId: form.linkedReadingId, losId: form.linkedLOSId }
      });
    });

    // 5. Index Notes
    notes.forEach(note => {
      newIndex.push({
        id: note.id,
        type: 'note',
        title: note.title,
        subtitle: `Study Note • ${note.content.slice(0, 80)}...`,
        content: `${note.title} ${note.content}`,
        route: 'notes',
        metadata: { subjectId: note.linkedSubjectId, readingId: note.linkedReadingId, losId: note.linkedLOSId }
      });
    });

    // 6. Index Assets (Metadata)
    assets.forEach(asset => {
      newIndex.push({
        id: asset.id,
        type: 'asset',
        title: asset.name,
        subtitle: `Knowledge Asset • ${asset.fileType.toUpperCase()} • ${asset.fileSize || 'Unknown Size'}`,
        content: `${asset.name} ${asset.category} ${asset.tags?.join(' ') || ''} ${asset.metadata?.topics.join(' ') || ''} ${asset.metadata?.keywords.join(' ') || ''}`,
        route: 'resources',
        metadata: { subjectId: asset.linkedSubjectId, readingId: asset.linkedReadingId, losId: asset.linkedLOSId }
      });

      // 7. Index Asset Chunks
      if (asset.chunks && asset.chunks.length > 0) {
        asset.chunks.forEach((chunk: any) => {
          newIndex.push({
            id: chunk.id,
            type: 'chunk',
            title: `Doc Section: ${chunk.heading}`,
            subtitle: `Page ${chunk.pageNumber} in ${asset.name}`,
            content: `${chunk.heading} ${chunk.content}`,
            route: 'resources',
            metadata: { 
              subjectId: asset.linkedSubjectId, 
              readingId: asset.linkedReadingId, 
              losId: asset.linkedLOSId, 
              pageNumber: chunk.pageNumber,
              parentAssetId: asset.id
            }
          });
        });
      }

      // 8. Index Highlights
      if (asset.highlightsList && asset.highlightsList.length > 0) {
        asset.highlightsList.forEach((hl: any) => {
          newIndex.push({
            id: hl.id,
            type: 'highlight',
            title: `Highlight: "${hl.text.slice(0, 40)}..."`,
            subtitle: `Page ${hl.pageNumber} in ${asset.name}`,
            content: hl.text,
            route: 'resources',
            metadata: {
              subjectId: asset.linkedSubjectId,
              readingId: asset.linkedReadingId,
              losId: asset.linkedLOSId,
              pageNumber: hl.pageNumber,
              parentAssetId: asset.id
            }
          });
        });
      }

      // 9. Index Annotations
      if (asset.annotations && asset.annotations.length > 0) {
        asset.annotations.forEach((ann: any) => {
          newIndex.push({
            id: ann.id,
            type: 'annotation',
            title: `Note: "${ann.text.slice(0, 40)}..."`,
            subtitle: `Page ${ann.pageNumber} in ${asset.name}`,
            content: ann.text,
            route: 'resources',
            metadata: {
              subjectId: asset.linkedSubjectId,
              readingId: asset.linkedReadingId,
              losId: asset.linkedLOSId,
              pageNumber: ann.pageNumber,
              parentAssetId: asset.id
            }
          });
        });
      }
    });

    this.index = newIndex;
    this.lastRebuildTimestamp = new Date().toISOString();
  }

  public register(entry: SearchIndexEntry): void {
    this.index.push(entry);
  }

  public deregister(id: string): void {
    this.index = this.index.filter(e => e.id !== id);
  }

  public getAllEntries(): SearchIndexEntry[] {
    return this.index;
  }

  /** Total number of entries currently in the projection cache. */
  public getIndexSize(): number {
    return this.index.length;
  }

  /** Diagnostic snapshot for Developer Tools display. */
  public getIndexHealth(): { totalEntries: number; lastRebuild: string | null; typeCounts: Record<string, number> } {
    const typeCounts: Record<string, number> = {};
    this.index.forEach(e => {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    });
    return {
      totalEntries: this.index.length,
      lastRebuild: this.lastRebuildTimestamp,
      typeCounts
    };
  }
}

export const knowledgeIndexService = new KnowledgeIndexService();
