/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssetChunk } from '../types';

/**
 * Service to chunk extracted text into semantic, layout-aware paragraphs
 * while maintaining heading hierarchy paths.
 */
export class ChunkService {
  /**
   * Chunks text into semantic segments based on markdown headings and paragraph limits.
   */
  public chunkText(assetId: string, text: string): AssetChunk[] {
    const chunks: AssetChunk[] = [];
    const lines = text.split('\n');
    
    let currentHeading = 'General Reference';
    let currentParagraphs: string[] = [];
    let chunkIndex = 0;
    let simulatedPage = 1;
    let charCounter = 0;

    const createChunk = (contentStr: string) => {
      const trimmed = contentStr.trim();
      if (!trimmed) return;

      chunks.push({
        id: `${assetId}-chunk-${chunkIndex}`,
        assetId,
        chunkIndex,
        heading: currentHeading,
        content: trimmed,
        pageNumber: simulatedPage,
        formulas: [], // Populated by FormulaExtractionService
        losReferences: [], // Populated by LinkingService
        readingReferences: [] // Populated by LinkingService
      });
      chunkIndex++;
    };

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      charCounter += line.length;

      // Increment page number roughly every 1200 characters
      if (charCounter > 1200) {
        simulatedPage++;
        charCounter = 0;
      }

      // Check if it's a heading
      if (trimmedLine.startsWith('#')) {
        // Flush previous text before changing heading
        if (currentParagraphs.length > 0) {
          createChunk(currentParagraphs.join('\n'));
          currentParagraphs = [];
        }
        currentHeading = trimmedLine.replace(/^#+\s*/, '');
      } else if (trimmedLine === '') {
        // Blank line indicates paragraph boundary
        if (currentParagraphs.length > 0) {
          createChunk(currentParagraphs.join('\n'));
          currentParagraphs = [];
        }
      } else {
        currentParagraphs.push(trimmedLine);
      }
    });

    // Flush any remaining text
    if (currentParagraphs.length > 0) {
      createChunk(currentParagraphs.join('\n'));
    }

    return chunks;
  }
}

export const chunkService = new ChunkService();
