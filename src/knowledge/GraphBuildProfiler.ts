/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProfileMetrics {
  nodeBuildTimeMs: number;
  relationshipBuildTimeMs: number;
  validationTimeMs: number;
  indexCreationTimeMs: number;
  snapshotGenerationTimeMs: number;
  totalCompileTimeMs: number;
}

/**
 * Diagnostic utility measuring the microsecond compile duration of graph compilation phases.
 */
export class GraphBuildProfiler {
  private startTime: number = 0;
  private checkpoints: Record<string, number> = {};

  /**
   * Starts the profiling timer.
   */
  public start(): void {
    this.startTime = performance.now();
    this.checkpoints = { start: this.startTime };
  }

  /**
   * Marks a checkpoint transition.
   */
  public mark(checkpoint: string): void {
    this.checkpoints[checkpoint] = performance.now();
  }

  /**
   * Evaluates the checkpoints and compiles a ProfileMetrics record.
   */
  public getMetrics(): ProfileMetrics {
    const start = this.checkpoints['start'] || 0;
    const nodesDone = this.checkpoints['nodesDone'] || start;
    const edgesDone = this.checkpoints['edgesDone'] || nodesDone;
    const validationDone = this.checkpoints['validationDone'] || edgesDone;
    const indexesDone = this.checkpoints['indexesDone'] || validationDone;
    const end = this.checkpoints['end'] || indexesDone;

    return {
      nodeBuildTimeMs: Number((nodesDone - start).toFixed(3)),
      relationshipBuildTimeMs: Number((edgesDone - nodesDone).toFixed(3)),
      validationTimeMs: Number((validationDone - edgesDone).toFixed(3)),
      indexCreationTimeMs: Number((indexesDone - validationDone).toFixed(3)),
      snapshotGenerationTimeMs: Number((end - indexesDone).toFixed(3)),
      totalCompileTimeMs: Number((end - start).toFixed(3))
    };
  }
}
