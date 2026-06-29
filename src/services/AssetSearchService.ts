/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchResult } from '../types';
import { knowledgeIndexService, SearchIndexEntry } from './KnowledgeIndexService';

/**
 * Service managing the search queries over the global KnowledgeIndexService registry,
 * applying Graph-Boosted Semantic ranking to return relevant notes, formulas, and resources.
 */
export class AssetSearchService {
  /**
   * Legacy wrapper - calls the registry rebuilder to maintain backward compatibility.
   */
  public rebuildIndex(
    subjects: any[],
    readings: any[],
    losList: any[],
    notes: any[],
    formulas: any[],
    assets: any[]
  ): void {
    knowledgeIndexService.rebuildIndex(subjects, readings, losList, notes, formulas, assets);
  }

  /**
   * Searches across the unified index, scoring entries and applying graph-traversal boosts.
   */
  public search(query: string): SearchResult[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const indexEntries = knowledgeIndexService.getAllEntries();
    const results: Array<{ entry: SearchIndexEntry; score: number }> = [];

    // Stage 1: Exact and Keyword Matching
    indexEntries.forEach(entry => {
      let score = 0;

      const titleLower = entry.title.toLowerCase();
      if (titleLower === q) score += 100;
      else if (titleLower.includes(q)) score += 50;

      if (entry.subtitle.toLowerCase().includes(q)) score += 20;

      const contentLower = entry.content.toLowerCase();
      if (contentLower.includes(q)) {
        score += 10;
        const occurrences = contentLower.split(q).length - 1;
        score += occurrences * 2;
      }

      if (score > 0) {
        results.push({ entry, score });
      }
    });

    if (results.length === 0) return [];

    // Stage 2: Graph-Boosted Semantic Ranking
    // If a node matches with a significant score, identify the linked subjects/readings/LOS.
    const activeSubjectLinks = new Set<string>();
    const activeReadingLinks = new Set<string>();
    const activeLOSLinks = new Set<string>();

    results.forEach(res => {
      if (res.score >= 40) {
        const meta = res.entry.metadata;
        if (meta.subjectId) activeSubjectLinks.add(meta.subjectId);
        if (meta.readingId) activeReadingLinks.add(meta.readingId);
        if (meta.losId) activeLOSLinks.add(meta.losId);
      }
    });

    // Traverse index entries and apply a +25% score boost to adjacent/connected nodes in the graph
    results.forEach(res => {
      const meta = res.entry.metadata;
      let hasConnection = false;

      if (meta.losId && activeLOSLinks.has(meta.losId)) hasConnection = true;
      if (meta.readingId && activeReadingLinks.has(meta.readingId)) hasConnection = true;
      if (meta.subjectId && activeSubjectLinks.has(meta.subjectId)) hasConnection = true;

      if (hasConnection) {
        res.score = Math.round(res.score * 1.25); // +25% boost for semantic graph adjacency
      }
    });

    // Sort descending by final boosted score
    results.sort((a, b) => b.score - a.score);

    // Map to standard SearchResult interface for UI compatibility
    return results.slice(0, 15).map(res => {
      const typeMap: Record<string, string> = {
        asset: 'resource',
        chunk: 'resource',
        highlight: 'resource',
        annotation: 'resource'
      };

      return {
        id: res.entry.id,
        type: (typeMap[res.entry.type] || res.entry.type) as SearchResult['type'],
        title: res.entry.title,
        subtitle: res.entry.subtitle,
        route: res.entry.route
      };
    });
  }
}

export const assetSearchService = new AssetSearchService();
