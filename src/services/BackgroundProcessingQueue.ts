/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { eventBus } from './EventBus';

export interface QueueJob {
  assetId: string;
  file: Blob;
  filename: string;
}

/**
 * Background task queue to execute heavy document parsing, chunking,
 * and linking operations asynchronously to prevent UI freeze.
 */
export class BackgroundProcessingQueue {
  private queue: QueueJob[] = [];
  private activeJob: QueueJob | null = null;
  private onJobProgress: ((assetId: string, status: string, error?: string) => void) | null = null;
  private processFn: ((job: QueueJob, onProgress: (status: string) => void) => Promise<void>) | null = null;

  public registerWorker(
    processFn: (job: QueueJob, onProgress: (status: string) => void) => Promise<void>,
    onJobProgress: (assetId: string, status: string, error?: string) => void
  ) {
    this.processFn = processFn;
    this.onJobProgress = onJobProgress;
  }

  /**
   * Enqueues an asset for processing.
   */
  public enqueue(assetId: string, file: Blob, filename: string): void {
    const job: QueueJob = { assetId, file, filename };
    this.queue.push(job);
    
    eventBus.publish({
      type: 'AssetUploaded',
      timestamp: new Date().toISOString(),
      source: 'BackgroundQueue',
      entityId: assetId,
      payload: { filename, size: file.size }
    });

    if (this.onJobProgress) {
      this.onJobProgress(assetId, 'Queued');
    }

    // Start processing cycle asynchronously
    setTimeout(() => this.processNext(), 50);
  }

  /**
   * Executes the next job in the queue.
   */
  private async processNext(): Promise<void> {
    if (this.activeJob || this.queue.length === 0 || !this.processFn) return;

    this.activeJob = this.queue.shift()!;
    const { assetId, filename } = this.activeJob;

    eventBus.publish({
      type: 'AssetProcessingStarted',
      timestamp: new Date().toISOString(),
      source: 'BackgroundQueue',
      entityId: assetId,
      payload: { filename }
    });

    try {
      await this.processFn(this.activeJob, (status) => {
        if (this.onJobProgress) {
          this.onJobProgress(assetId, status);
        }
      });

      this.activeJob = null;
      // Continue next job in queue
      setTimeout(() => this.processNext(), 50);
    } catch (err: any) {
      console.error(`Error processing job for asset ${assetId}:`, err);
      if (this.onJobProgress) {
        this.onJobProgress(assetId, 'Failed', err.message || String(err));
      }
      this.activeJob = null;
      setTimeout(() => this.processNext(), 50);
    }
  }

  /**
   * Clears all queued items.
   */
  public clear(): void {
    this.queue = [];
    this.activeJob = null;
  }

  /**
   * Returns current queue jobs.
   */
  public getJobs(): QueueJob[] {
    return this.queue;
  }
}

export const backgroundProcessingQueue = new BackgroundProcessingQueue();
