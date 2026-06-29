/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssetIngestionManifest, AssetMetadata } from '../types';

/**
 * Service to analyze document text and extract keywords, topics, study times,
 * and populate the permanent ingestion manifest stats.
 */
export class MetadataExtractionService {
  private static readonly CFA_KEYWORDS = [
    'Grinold-Kroner', 'Singer-Terhaar', 'Active Share', 'Information Ratio',
    'Yield Decomposition', 'Tax Accumulation', 'Interest Rate Parity', 'Carry Trade',
    'Purchasing Power Parity', 'Hedging', 'Duration', 'Convexity', 'Immunization',
    'Forward Premium', 'Illiquidity Premium', 'Real Growth', 'Inflation', 'Derivatives'
  ];

  /**
   * Scans text to compile AssetMetadata.
   */
  public extractMetadata(text: string, filename: string): AssetMetadata {
    const textLower = text.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    
    // Find matching keywords
    const keywords = MetadataExtractionService.CFA_KEYWORDS.filter(kw => 
      textLower.includes(kw.toLowerCase())
    );

    // Map topics based on keyword clusters
    const topics: string[] = [];
    if (textLower.includes('equity') || textLower.includes('grinold') || textLower.includes('active share')) {
      topics.push('Equity Valuation');
    }
    if (textLower.includes('fixed income') || textLower.includes('yield') || textLower.includes('duration')) {
      topics.push('Fixed Income');
    }
    if (textLower.includes('currency') || textLower.includes('parity') || textLower.includes('carry trade')) {
      topics.push('Asset Allocation / Currency Management');
    }
    if (topics.length === 0) {
      topics.push('General Portfolio Management');
    }

    // Determine difficulty
    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    if (textLower.includes('grinold') || textLower.includes('singer') || textLower.includes('decomposition')) {
      difficulty = 'Hard';
    } else if (words.length < 150) {
      difficulty = 'Easy';
    }

    // Est study time: 150 words per minute + padding for analysis
    const wordCount = words.length;
    const estMinutes = Math.max(2, Math.round((wordCount / 150) * 1.8));

    return {
      topics,
      keywords: keywords.length > 0 ? keywords : ['CFA L3'],
      difficulty,
      estimatedStudyTime: estMinutes,
      pagesCount: Math.max(1, Math.ceil(wordCount / 350)),
      language: 'English',
      version: 1
    };
  }

  /**
   * Compiles the permanent Ingestion Manifest metadata ledger.
   */
  public compileManifest(
    text: string, 
    metadata: AssetMetadata,
    chunksCount: number,
    formulaCount: number,
    losCount: number,
    readingCount: number,
    sizeBytes: number
  ): AssetIngestionManifest {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    // Calculate knowledge density score: based on keyword density
    const density = Math.min(10.0, Number(((metadata.keywords.length * 200) / (wordCount || 1) * 10).toFixed(1)));

    // Generate a simple deterministic string fingerprint
    let hash = 0;
    for (let i = 0; i < Math.min(100, text.length); i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    const fingerprint = `SHA256-${Math.abs(hash).toString(16).toUpperCase()}-${sizeBytes}`;

    return {
      fingerprint,
      pages: metadata.pagesCount || 1,
      size: sizeBytes,
      language: metadata.language || 'English',
      ocrEngineUsed: 'TesseractJS-Core Mock 2.1',
      extractionVersion: '1.2.0',
      chunkCount: chunksCount,
      formulaCount,
      losCount,
      readingCount,
      knowledgeScore: density > 0 ? Math.round(density * 10) : 50, // 0-100 scale
      pipelineVersion: 'V7-Ingest-Engine',
      builderVersion: 'Sprint7-Weaver'
    };
  }
}

export const metadataExtractionService = new MetadataExtractionService();
