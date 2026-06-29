/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Asset, AssetHealth } from '../types';
import { indexedDBService } from '../services/IndexedDBService';

/**
 * Repository to index and query Asset metadata.
 */
export class AssetRepository {
  private assetsById = new Map<string, Asset>();
  private assetsBySubject = new Map<string, Asset[]>();
  private assetsByReading = new Map<string, Asset[]>();
  private assetsByLOS = new Map<string, Asset[]>();

  constructor(private assets: Asset[]) {
    assets.forEach(asset => {
      this.assetsById.set(asset.id, asset);

      // Subject Index
      if (asset.linkedSubjectId) {
        if (!this.assetsBySubject.has(asset.linkedSubjectId)) {
          this.assetsBySubject.set(asset.linkedSubjectId, []);
        }
        this.assetsBySubject.get(asset.linkedSubjectId)!.push(asset);
      }

      // Reading Index
      if (asset.linkedReadingId) {
        if (!this.assetsByReading.has(asset.linkedReadingId)) {
          this.assetsByReading.set(asset.linkedReadingId, []);
        }
        this.assetsByReading.get(asset.linkedReadingId)!.push(asset);
      }

      // LOS Index
      if (asset.linkedLOSId) {
        if (!this.assetsByLOS.has(asset.linkedLOSId)) {
          this.assetsByLOS.set(asset.linkedLOSId, []);
        }
        this.assetsByLOS.get(asset.linkedLOSId)!.push(asset);
      }
    });
  }

  public getAll(): Asset[] {
    return this.assets;
  }

  public getById(id: string): Asset | undefined {
    return this.assetsById.get(id);
  }

  public getBySubjectId(subjectId: string): Asset[] {
    return this.assetsBySubject.get(subjectId) || [];
  }

  public getByReadingId(readingId: string): Asset[] {
    return this.assetsByReading.get(readingId) || [];
  }

  public getByLOSId(losId: string): Asset[] {
    return this.assetsByLOS.get(losId) || [];
  }

  /**
   * Compiles live health telemetry across all knowledge assets.
   */
  public async getHealth(): Promise<AssetHealth> {
    const storageUsed = await indexedDBService.getStorageUsedBytes();
    const totalAssets = this.assets.length;

    let totalChunks = 0;
    let brokenChunks = 0;
    let missingMetadata = 0;
    let ocrSuccess = 0;
    let docsWithFormulas = 0;
    let docsWithLOS = 0;
    let docsWithReading = 0;
    let processingErrors = 0;

    // Detect duplicates by fingerprint
    const fingerprints = new Set<string>();
    let duplicates = 0;

    this.assets.forEach(asset => {
      if (asset.status === 'Failed') {
        processingErrors++;
      }

      if (asset.manifest) {
        totalChunks += asset.manifest.chunkCount || 0;
        if (asset.manifest.ocrEngineUsed) ocrSuccess++;
        if (asset.manifest.formulaCount > 0) docsWithFormulas++;
        if (asset.manifest.losCount > 0) docsWithLOS++;
        if (asset.manifest.readingCount > 0) docsWithReading++;

        if (fingerprints.has(asset.manifest.fingerprint)) {
          duplicates++;
        } else {
          fingerprints.add(asset.manifest.fingerprint);
        }
      }

      // Broken checks
      if (asset.chunks) {
        asset.chunks.forEach(chunk => {
          if (!chunk.content || chunk.content.trim() === '') {
            brokenChunks++;
          }
        });
      }

      if (!asset.metadata || asset.metadata.topics.length === 0) {
        missingMetadata++;
      }
    });

    return {
      storageUsedBytes: storageUsed,
      totalChunksCount: totalChunks,
      brokenChunksCount: brokenChunks,
      missingMetadataCount: missingMetadata,
      ocrSuccessCount: ocrSuccess,
      formulaDetectionRate: totalAssets > 0 ? Math.round((docsWithFormulas / totalAssets) * 100) : 0,
      losDetectionRate: totalAssets > 0 ? Math.round((docsWithLOS / totalAssets) * 100) : 0,
      readingDetectionRate: totalAssets > 0 ? Math.round((docsWithReading / totalAssets) * 100) : 0,
      processingErrorsCount: processingErrors,
      duplicateDocsCount: duplicates
    };
  }
}
