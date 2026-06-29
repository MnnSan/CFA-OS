/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Asset, AssetChunk, AssetIngestionManifest, AssetMetadata } from '../types';
import { indexedDBService } from './IndexedDBService';
import { ocrService } from './OCRService';
import { chunkService } from './ChunkService';
import { metadataExtractionService } from './MetadataExtractionService';
import { formulaExtractionService } from './FormulaExtractionService';
import { knowledgeLinkingService } from './KnowledgeLinkingService';
import { eventBus } from './EventBus';

export interface ProcessedAssetResult {
  metadata: AssetMetadata;
  chunks: AssetChunk[];
  manifest: AssetIngestionManifest;
  linkedReadingIds: string[];
  linkedLOSIds: string[];
}

/**
 * Orchestrator service running documents through the multi-stage ingestion pipeline.
 */
export class DocumentPipelineService {
  /**
   * Processes a document blob through all pipeline stages.
   */
  public async processAsset(
    assetId: string,
    file: Blob,
    filename: string,
    onStageChange: (stage: string) => void
  ): Promise<ProcessedAssetResult> {
    const startTime = Date.now();
    const isImage = file.type.startsWith('image/') || /\.(png|jpg|jpeg|gif)$/i.test(filename);
    const sizeBytes = file.size;

    // Stage 1: Uploading
    onStageChange('Uploading');
    await new Promise(resolve => setTimeout(resolve, 200));

    // Stage 2: Stored
    onStageChange('Stored');
    await indexedDBService.storeBinary(assetId, file, filename);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Stage 3: ExtractingText
    onStageChange('ExtractingText');
    let extractedText = '';
    if (isImage) {
      // Stage 4: RunningOCR
      onStageChange('RunningOCR');
      extractedText = await ocrService.extractText(file, filename);
      eventBus.publish({
        type: 'AssetOCRCompleted',
        timestamp: new Date().toISOString(),
        source: 'IngestionPipeline',
        entityId: assetId,
        payload: { engine: 'TesseractJS-Core Mock 2.1' }
      });
    } else {
      // Simple text reader for non-images
      extractedText = await this.readBlobAsText(file);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Stage 5: Cleaning
    onStageChange('Cleaning');
    extractedText = this.cleanText(extractedText);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Stage 6: Chunking (Heading Detection built-in)
    onStageChange('Chunking');
    const chunks = chunkService.chunkText(assetId, extractedText);
    eventBus.publish({
      type: 'AssetChunkCreated',
      timestamp: new Date().toISOString(),
      source: 'IngestionPipeline',
      entityId: assetId,
      payload: { count: chunks.length }
    });
    await new Promise(resolve => setTimeout(resolve, 150));

    // Stage 7: FormulaDetection
    onStageChange('FormulaDetection');
    let formulaCount = 0;
    chunks.forEach(chunk => {
      const formulas = formulaExtractionService.detectFormulas(chunk.content);
      chunk.formulas = formulas;
      formulaCount += formulas.length;
    });
    await new Promise(resolve => setTimeout(resolve, 150));

    // Stage 8: LOSDetection
    onStageChange('LOSDetection');
    const { linkedReadingIds, linkedLOSIds } = knowledgeLinkingService.linkCurriculum(chunks);
    await new Promise(resolve => setTimeout(resolve, 150));

    // Stage 9: RelationshipLinking
    onStageChange('RelationshipLinking');
    eventBus.publish({
      type: 'AssetLinked',
      timestamp: new Date().toISOString(),
      source: 'IngestionPipeline',
      entityId: assetId,
      payload: { readings: linkedReadingIds.length, los: linkedLOSIds.length }
    });
    await new Promise(resolve => setTimeout(resolve, 150));

    // Stage 10: Indexing
    onStageChange('Indexing');
    // Store chunk contents separately in IndexedDB to keep AppContext state light
    await indexedDBService.storeChunks(assetId, chunks);
    
    // Extract metadata & compile manifest
    const metadata = metadataExtractionService.extractMetadata(extractedText, filename);
    const duration = Date.now() - startTime;
    const manifest = metadataExtractionService.compileManifest(
      extractedText,
      metadata,
      chunks.length,
      formulaCount,
      linkedLOSIds.length,
      linkedReadingIds.length,
      sizeBytes
    );
    manifest.processingDurationMs = duration;

    eventBus.publish({
      type: 'AssetIndexed',
      timestamp: new Date().toISOString(),
      source: 'IngestionPipeline',
      entityId: assetId,
      payload: { chunksCount: chunks.length, score: manifest.knowledgeScore }
    });
    await new Promise(resolve => setTimeout(resolve, 150));

    return {
      metadata,
      chunks,
      manifest,
      linkedReadingIds,
      linkedLOSIds
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[^\x20-\x7E\n]/g, '') // remove weird unicode non-printable characters
      .replace(/\n{3,}/g, '\n\n'); // normalize spacing
  }

  private readBlobAsText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
  }
}

export const documentPipelineService = new DocumentPipelineService();
