import { EventBus } from './EventBus';
import { StoredEvent, EventWithSnapshot, IntelligenceStore, IntelligenceDerivedMetrics } from '../types';

export interface StateSnapshotPair {
  event: StoredEvent;
  stateBefore: Partial<IntelligenceStore> | null;
  stateAfter: Partial<IntelligenceStore> | null;
  derivedMetrics: IntelligenceDerivedMetrics | null;
  recordedAt: string;
}

export class EventStoreService {
  private events: StoredEvent[] = [];
  private stateSnapshots: StateSnapshotPair[] = [];
  private counter = 0;
  private readonly maxSize = 2000;
  private readonly maxSnapshots = 500;
  private unsubscribe: (() => void) | null = null;

  constructor(private eventBus: EventBus) {
    this.unsubscribe = this.eventBus.subscribe('*', (event) => {
      this.append(event);
    });
  }

  private append(event: { type: string; timestamp: string; source: string; entityId?: string; payload?: any }) {
    const stored: StoredEvent = {
      index: this.counter++,
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      entityId: event.entityId,
      payload: event.payload,
      receivedAt: new Date().toISOString()
    };

    this.events.push(stored);

    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-this.maxSize);
    }
  }

  /**
   * Record an event with full state snapshot pairing.
   * This enables: learning timeline replay, debugging "why was I rated X%?",
   * and future AI explanation layer.
   */
  public recordWithSnapshot(
    event: StoredEvent,
    stateBefore: Partial<IntelligenceStore> | null,
    stateAfter: Partial<IntelligenceStore> | null,
    derivedMetrics: IntelligenceDerivedMetrics | null
  ): StateSnapshotPair {
    const pair: StateSnapshotPair = {
      event,
      stateBefore,
      stateAfter,
      derivedMetrics,
      recordedAt: new Date().toISOString()
    };

    this.stateSnapshots.push(pair);

    if (this.stateSnapshots.length > this.maxSnapshots) {
      this.stateSnapshots = this.stateSnapshots.slice(-this.maxSnapshots);
    }

    return pair;
  }

  /**
   * Reconstruct the intelligence timeline for a given period.
   * Returns ordered state snapshots that can be animated/visualized.
   */
  public getTimeline(fromIso: string, toIso: string): StateSnapshotPair[] {
    const from = new Date(fromIso).getTime();
    const to = new Date(toIso).getTime();
    return this.stateSnapshots.filter(s => {
      const t = new Date(s.recordedAt).getTime();
      return t >= from && t <= to;
    });
  }

  /**
   * Find the state snapshot closest to a given timestamp.
   * Useful for: "what did the intelligence look like at time X?"
   */
  public getSnapshotAt(isoTimestamp: string): StateSnapshotPair | null {
    const target = new Date(isoTimestamp).getTime();
    let closest: StateSnapshotPair | null = null;
    let closestDiff = Infinity;

    for (const snap of this.stateSnapshots) {
      const diff = Math.abs(new Date(snap.recordedAt).getTime() - target);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = snap;
      }
    }

    return closest;
  }

  /**
   * Get all state snapshots, ordered by recordedAt ascending.
   */
  public getAllSnapshots(): StateSnapshotPair[] {
    return [...this.stateSnapshots];
  }

  /**
   * Filter state snapshots triggered by a specific event type.
   */
  public getSnapshotsByEventType(type: string): StateSnapshotPair[] {
    return this.stateSnapshots.filter(s => s.event.type === type);
  }

  /**
   * Derive metrics trend from snapshots.
   * Returns arrays suitable for chart rendering.
   */
  public getMetricsTrend(metricKey: keyof IntelligenceDerivedMetrics): Array<{ date: string; value: number }> {
    return this.stateSnapshots
      .filter(s => s.derivedMetrics && s.derivedMetrics[metricKey] !== undefined)
      .map(s => ({
        date: s.recordedAt.split('T')[0],
        value: (s.derivedMetrics as any)[metricKey] as number
      }));
  }

  /** Return all stored events, oldest first. */
  public getAll(): StoredEvent[] {
    return [...this.events];
  }

  /** Return the N most recent events. */
  public getRecent(count: number): StoredEvent[] {
    return this.events.slice(-count);
  }

  /** Filter events by type. */
  public getByType(type: string): StoredEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /** Filter events occurring after a given ISO timestamp. */
  public getAfter(isoTimestamp: string): StoredEvent[] {
    const cutoff = new Date(isoTimestamp).getTime();
    return this.events.filter(e => new Date(e.timestamp).getTime() >= cutoff);
  }

  /** Replay: return events in chronological order between two timestamps (inclusive). */
  public replay(fromIso: string, toIso: string): StoredEvent[] {
    const from = new Date(fromIso).getTime();
    const to = new Date(toIso).getTime();
    return this.events.filter(e => {
      const t = new Date(e.timestamp).getTime();
      return t >= from && t <= to;
    });
  }

  /** Total number of events ever recorded (including evicted). */
  public getTotalCount(): number {
    return this.counter;
  }

  /** Number of events currently held in the buffer. */
  public getBufferSize(): number {
    return this.events.length;
  }

  /** Number of state snapshots held. */
  public getSnapshotCount(): number {
    return this.stateSnapshots.length;
  }

  /** Cleanup subscriptions. */
  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
