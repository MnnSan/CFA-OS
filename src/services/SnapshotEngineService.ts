import {
  IntelligenceStore,
  SnapshotRecord,
  IntelligenceDerivedMetrics
} from '../types';
import { EventBus } from './EventBus';
import { EventStoreService } from './EventStoreService';

const STORAGE_KEY = 'cfa_intelligence_snapshots';
const MAX_SNAPSHOTS = 100;

export class SnapshotEngineService {
  private snapshots: SnapshotRecord[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private unsubscribeEvent: (() => void) | null = null;
  private getStore: () => IntelligenceStore | null;
  private getMetrics: () => IntelligenceDerivedMetrics | null;

  constructor(
    private eventBus?: EventBus,
    private eventStore?: EventStoreService
  ) {
    this.loadFromStorage();
  }

  /** Set the getter functions for current store and metrics */
  public setDataSources(
    getStore: () => IntelligenceStore | null,
    getMetrics: () => IntelligenceDerivedMetrics | null
  ): void {
    this.getStore = getStore;
    this.getMetrics = getMetrics;
  }

  /** Start periodic snapshots at the given interval (default 5 minutes) */
  public startPeriodicSnapshots(intervalMs: number = 300000): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      this.takeSnapshot('periodic');
    }, intervalMs);
  }

  /** Start event-triggered snapshots for a set of event types */
  public startEventTriggeredSnapshots(eventTypes: string[]): void {
    if (!this.eventBus) return;

    const eventSet = new Set(eventTypes);
    this.unsubscribeEvent = this.eventBus.subscribe('*', (event) => {
      if (eventSet.has(event.type)) {
        this.takeSnapshot('event-triggered', event.type);
      }
    });
  }

  /** Manually take a snapshot of the current intelligence store */
  public takeSnapshot(
    reason: SnapshotRecord['reason'] = 'manual',
    triggerEvent?: string
  ): SnapshotRecord | null {
    const store = this.getStore?.();
    const metrics = this.getMetrics?.();

    if (!store || !metrics) return null;

    const record: SnapshotRecord = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      store: this.deepClone(store),
      reason,
      triggerEvent,
      metrics: { ...metrics }
    };

    this.snapshots.push(record);

    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
    }

    this.persistToStorage();
    return record;
  }

  /** Get snapshot history, newest first */
  public getHistory(limit?: number): SnapshotRecord[] {
    const sorted = [...this.snapshots].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /** Get snapshots for a date range */
  public getHistoryInRange(fromIso: string, toIso: string): SnapshotRecord[] {
    const from = new Date(fromIso).getTime();
    const to = new Date(toIso).getTime();
    return this.snapshots.filter(s => {
      const t = new Date(s.timestamp).getTime();
      return t >= from && t <= to;
    });
  }

  /** Rollback to a specific snapshot by ID. Returns the snapshot or null if not found. */
  public rollbackTo(snapshotId: string): SnapshotRecord | null {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return null;
    return this.deepClone(snapshot);
  }

  /** Get chart-ready data for a specific metric over time */
  public getMetricTrend(metricKey: keyof IntelligenceDerivedMetrics): Array<{ date: string; value: number }> {
    return this.snapshots
      .filter(s => s.metrics[metricKey] !== undefined)
      .map(s => ({
        date: s.timestamp.split('T')[0],
        value: s.metrics[metricKey] as number
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Get the latest snapshot */
  public getLatestSnapshot(): SnapshotRecord | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots[this.snapshots.length - 1];
  }

  /** Clear all snapshots */
  public clearHistory(): void {
    this.snapshots = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Stop periodic snapshots */
  public stopPeriodicSnapshots(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Stop event-triggered snapshots */
  public stopEventTriggeredSnapshots(): void {
    if (this.unsubscribeEvent) {
      this.unsubscribeEvent();
      this.unsubscribeEvent = null;
    }
  }

  /** Get total snapshot count */
  public getSnapshotCount(): number {
    return this.snapshots.length;
  }

  /** Cleanup */
  public destroy(): void {
    this.stopPeriodicSnapshots();
    this.stopEventTriggeredSnapshots();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.snapshots = JSON.parse(saved);
      }
    } catch (err) {
      console.error('[SnapshotEngine] Failed to load snapshots from storage:', err);
      this.snapshots = [];
    }
  }

  private persistToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshots));
    } catch (err) {
      console.error('[SnapshotEngine] Failed to persist snapshots to storage:', err);
    }
  }

  private deepClone<T>(obj: T): T {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  }
}

export const snapshotEngineService = new SnapshotEngineService();
