/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReadingIntelligence } from '../types';

interface PageLogEntry {
  pageNumber: number;
  entryTime: number;
  durationMs: number;
}

export class ReadingIntelligenceService {
  private activeAssetId: string | null = null;
  private startTime: number = 0;
  private pagesVisited = new Map<number, number>(); // pageNumber -> visitCount
  private pageLogs: PageLogEntry[] = [];
  private currentPage: number = 1;
  private lastPageTime: number = 0;
  private highlightsCount: number = 0;
  private annotationsCount: number = 0;
  private pauseCount: number = 0;

  /**
   * Initiates a Kindle-style reading tracker for the given asset.
   */
  public startSession(assetId: string, startPage: number = 1): void {
    this.activeAssetId = assetId;
    this.startTime = Date.now();
    this.currentPage = startPage;
    this.lastPageTime = Date.now();
    this.pagesVisited.clear();
    this.pageLogs = [];
    this.pagesVisited.set(startPage, 1);
    this.highlightsCount = 0;
    this.annotationsCount = 0;
    this.pauseCount = 0;
  }

  /**
   * Tracks page transition flips.
   */
  public logPageFlip(newPage: number): void {
    if (!this.activeAssetId) return;

    const now = Date.now();
    const durationMs = now - this.lastPageTime;

    // Log the page we just left
    this.pageLogs.push({
      pageNumber: this.currentPage,
      entryTime: this.lastPageTime,
      durationMs
    });

    // Record visit to the new page
    const visits = this.pagesVisited.get(newPage) || 0;
    this.pagesVisited.set(newPage, visits + 1);

    this.currentPage = newPage;
    this.lastPageTime = now;
  }

  public incrementHighlights(): void {
    this.highlightsCount++;
  }

  public incrementAnnotations(): void {
    this.annotationsCount++;
  }

  public incrementPauses(): void {
    this.pauseCount++;
  }

  /**
   * Ends session and compiles detailed cognitive reading report metrics.
   */
  public endSession(): ReadingIntelligence | null {
    if (!this.activeAssetId) return null;

    const now = Date.now();
    const finalDurationMs = now - this.lastPageTime;

    // Log final page
    this.pageLogs.push({
      pageNumber: this.currentPage,
      entryTime: this.lastPageTime,
      durationMs: finalDurationMs
    });

    const elapsedSeconds = Math.round((now - this.startTime) / 1000);
    const pagesRead = this.pagesVisited.size;

    if (elapsedSeconds <= 0 || pagesRead === 0) return null;

    // Calculate rereads
    let rereadsCount = 0;
    this.pagesVisited.forEach((visits) => {
      if (visits > 1) {
        rereadsCount += (visits - 1);
      }
    });

    // Assume average 300 words per curriculum page
    const totalWords = pagesRead * 300;
    const averageWpm = Math.round(totalWords / (elapsedSeconds / 60));
    
    // Baseline is 250 WPM
    const readingEfficiency = Number((averageWpm / 250).toFixed(2));

    // Focus Score calculation (start 100, deduct for variance and pauses)
    let focusScore = 100;
    focusScore -= this.pauseCount * 8; // penalty for pauses
    
    // Wild variance in page times denotes distractions
    if (this.pageLogs.length > 2) {
      const pageDurations = this.pageLogs.map(l => l.durationMs);
      const avgDuration = pageDurations.reduce((a, b) => a + b, 0) / pageDurations.length;
      const squaredDiffs = pageDurations.map(d => Math.pow(d - avgDuration, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
      const stdDev = Math.sqrt(variance);
      
      // If standard deviation exceeds average duration, deduct focus points
      if (stdDev > avgDuration) {
        focusScore -= 15;
      }
    }
    focusScore = Math.max(30, Math.min(100, focusScore));

    // Skimming vs Deep Reading categorization (150 WPM threshold per page)
    let skimmingSeconds = 0;
    let deepReadingSeconds = 0;

    this.pageLogs.forEach(log => {
      const pageSeconds = log.durationMs / 1000;
      if (pageSeconds <= 0) return;
      const pageWpm = 300 / (pageSeconds / 60);
      
      if (pageWpm > 350) {
        skimmingSeconds += pageSeconds;
      } else if (pageWpm < 150) {
        deepReadingSeconds += pageSeconds;
      }
    });

    // Estimate comprehension score
    const skimRatio = skimmingSeconds / elapsedSeconds;
    const deepRatio = deepReadingSeconds / elapsedSeconds;
    let comprehensionEstimated = Math.round(75 - (skimRatio * 35) + (deepRatio * 20) - (rereadsCount * 4));
    comprehensionEstimated = Math.max(20, Math.min(98, comprehensionEstimated));

    const report: ReadingIntelligence = {
      assetId: this.activeAssetId,
      pagesRead,
      elapsedSeconds,
      averageWpm,
      readingEfficiency,
      focusScore,
      skimmingSeconds: Math.round(skimmingSeconds),
      deepReadingSeconds: Math.round(deepReadingSeconds),
      rereadsCount,
      comprehensionEstimated,
      highlightDensity: Number((this.highlightsCount / pagesRead).toFixed(2)),
      annotationDensity: Number((this.annotationsCount / pagesRead).toFixed(2))
    };

    // Reset state
    this.activeAssetId = null;
    return report;
  }

  public getActiveAssetId(): string | null {
    return this.activeAssetId;
  }
}

export const readingIntelligenceService = new ReadingIntelligenceService();
