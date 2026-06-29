/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailySnapshot } from '../types';

export class DailySnapshotService {
  private snapshots: DailySnapshot[] = [];

  constructor() {
    // Seed 7 days of mock historical snapshot data on startup so charts render immediately
    const today = new Date('2026-06-28');
    for (let i = 7; i > 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      this.snapshots.push({
        id: `snap-${dateStr}`,
        date: dateStr,
        knowledgeHealth: 78 + (7 - i) * 2,
        confidenceDecayed: 2.8 + (7 - i) * 0.15,
        coverage: 52 + (7 - i) * 3,
        velocityHours: 1.0 + (7 - i) * 0.1,
        studyHours: 1.0 + Math.random() * 2,
        burnoutFlag: false,
        readinessScore: 50 + (7 - i) * 2.5,
        weakTopicIds: []
      });
    }
  }

  /**
   * Captures and persists the daily metrics slice.
   */
  public takeSnapshot(
    dateStr: string,
    knowledgeHealth: number,
    confidenceDecayed: number,
    coverage: number,
    velocityHours: number,
    studyHours: number,
    burnoutFlag: boolean,
    readinessScore: number,
    weakTopicIds: string[]
  ): DailySnapshot {
    const existingIndex = this.snapshots.findIndex(s => s.date === dateStr);
    
    const snapshot: DailySnapshot = {
      id: `snap-${dateStr}`,
      date: dateStr,
      knowledgeHealth,
      confidenceDecayed,
      coverage,
      velocityHours,
      studyHours,
      burnoutFlag,
      readinessScore,
      weakTopicIds
    };

    if (existingIndex >= 0) {
      this.snapshots[existingIndex] = snapshot;
    } else {
      this.snapshots.push(snapshot);
    }

    return snapshot;
  }

  public getHistoricalSnapshots(): DailySnapshot[] {
    return this.snapshots.sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const dailySnapshotService = new DailySnapshotService();
