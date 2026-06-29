/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssetChunk } from '../types';
import { ReadingRepository, LOSRepository } from '../repositories';

/**
 * Service to automatically scan chunk content and resolve curriculum Reading 
 * and LOS references to database UUIDs.
 */
export class KnowledgeLinkingService {
  private readingRepo: ReadingRepository | null = null;
  private losRepo: LOSRepository | null = null;

  public setRepositories(readingRepo: ReadingRepository, losRepo: LOSRepository) {
    this.readingRepo = readingRepo;
    this.losRepo = losRepo;
  }

  /**
   * Scans chunks to detect and populate Reading and LOS UUID references.
   */
  public linkCurriculum(chunks: AssetChunk[]): {
    linkedReadingIds: string[];
    linkedLOSIds: string[];
  } {
    const readingIdsSet = new Set<string>();
    const losIdsSet = new Set<string>();

    const readingRegex = /reading\s+(\d+)/gi;
    const losRegex = /los\s+(\d+\.[a-z])/gi;

    chunks.forEach(chunk => {
      const text = chunk.content;
      
      // 1. Detect Readings
      let readingMatch;
      readingRegex.lastIndex = 0; // Reset regex
      while ((readingMatch = readingRegex.exec(text)) !== null) {
        const readingNum = parseInt(readingMatch[1], 10);
        if (this.readingRepo) {
          const rd = this.readingRepo.getAll().find(r => r.number === readingNum);
          if (rd) {
            chunk.readingReferences.push(rd.id);
            readingIdsSet.add(rd.id);
          }
        }
      }

      // 2. Detect LOS
      let losMatch;
      losRegex.lastIndex = 0; // Reset regex
      while ((losMatch = losRegex.exec(text)) !== null) {
        const losCodeStr = losMatch[1].toLowerCase();
        if (this.losRepo) {
          const losObj = this.losRepo.getAll().find(l => l.code.toLowerCase() === losCodeStr);
          if (losObj) {
            chunk.losReferences.push(losObj.id);
            losIdsSet.add(losObj.id);
            // Also link the parent reading of the LOS if available
            if (losObj.readingId) {
              chunk.readingReferences.push(losObj.readingId);
              readingIdsSet.add(losObj.readingId);
            }
          }
        }
      }
    });

    return {
      linkedReadingIds: Array.from(readingIdsSet),
      linkedLOSIds: Array.from(losIdsSet)
    };
  }
}

export const knowledgeLinkingService = new KnowledgeLinkingService();
