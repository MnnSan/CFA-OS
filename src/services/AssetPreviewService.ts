/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Asset } from '../types';
import { indexedDBService } from './IndexedDBService';

/**
 * Service to fetch document chunk contents and generate high-fidelity,
 * paginated previews inside the application.
 */
export class AssetPreviewService {
  /**
   * Fetches chunks from IndexedDB and formats them into a clean paginated preview structure.
   */
  public async getPreviewPages(asset: Asset): Promise<{ pageNumber: number; heading: string; content: string }[]> {
    // If it's a web link, return a placeholder link content
    if (asset.fileType === 'link') {
      return [{
        pageNumber: 1,
        heading: 'External Link',
        content: `This asset is an external web resource. Please click "Open External Link" to view it directly: ${asset.url}`
      }];
    }

    // Fetch chunks from IndexedDB
    const chunks = await indexedDBService.getChunks(asset.id);
    if (chunks.length === 0) {
      return [{
        pageNumber: 1,
        heading: 'No Content Found',
        content: 'This document has no extracted text contents available for preview.'
      }];
    }

    // Group chunks by page numbers
    const pagesMap = new Map<number, { pageNumber: number; heading: string; textParts: string[] }>();
    
    chunks.forEach(chunk => {
      const pg = chunk.pageNumber || 1;
      if (!pagesMap.has(pg)) {
        pagesMap.set(pg, {
          pageNumber: pg,
          heading: chunk.heading,
          textParts: []
        });
      }
      pagesMap.get(pg)!.textParts.push(chunk.content);
    });

    // Sort by page number and return formatted pages
    return Array.from(pagesMap.values())
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map(p => ({
        pageNumber: p.pageNumber,
        heading: p.heading,
        content: p.textParts.join('\n\n')
      }));
  }
}

export const assetPreviewService = new AssetPreviewService();
