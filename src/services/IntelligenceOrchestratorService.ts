import {
  LearningOutcomeStatement,
  Reading,
  Subject,
  Formula,
  StudyNote,
  Asset,
  StudySession,
  RevisionItem,
  GraphAnalyzerHealth,
  IntelligenceStore,
  ReadingIntelligence,
  DailySnapshot,
  MockResult,
  DomainEvent,
  EventWithSnapshot,
  StoredEvent,
  PlannerReadingProgress
} from '../types';
import { IntelligenceAggregator, AggregatorInput, AggregatorOutput } from './IntelligenceAggregatorService';
import { EventBus } from './EventBus';

export interface OrchestratorInput extends AggregatorInput {}

export type IntelligenceUpdateCallback = (store: IntelligenceStore) => void;
export type EventSnapshotCallback = (snapshot: EventWithSnapshot) => void;

export class IntelligenceOrchestratorService {
  private lastGoodSnapshot: AggregatorOutput | null = null;
  private currentInput: OrchestratorInput | null = null;
  private currentStore: IntelligenceStore | null = null;
  private onUpdateCallbacks: IntelligenceUpdateCallback[] = [];
  private onEventSnapshotCallbacks: EventSnapshotCallback[] = [];
  private eventBusUnsubscribe: (() => void) | null = null;
  private eventBuffer: StoredEvent[] = [];

  constructor(private eventBus?: EventBus) {
    if (this.eventBus) {
      this.eventBusUnsubscribe = this.eventBus.subscribe('*', this.handleRawEvent);
    }
  }

  private handleRawEvent = (event: DomainEvent) => {
    const storedEvent: StoredEvent = {
      index: this.eventBuffer.length,
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      entityId: event.entityId,
      payload: event.payload,
      receivedAt: new Date().toISOString()
    };
    this.eventBuffer.push(storedEvent);
  };

  /** Register a callback for when the intelligence store is updated */
  public onUpdate(callback: IntelligenceUpdateCallback): () => void {
    this.onUpdateCallbacks.push(callback);
    return () => {
      this.onUpdateCallbacks = this.onUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  /** Register a callback for when an event snapshot is recorded */
  public onEventSnapshot(callback: EventSnapshotCallback): () => void {
    this.onEventSnapshotCallbacks.push(callback);
    return () => {
      this.onEventSnapshotCallbacks = this.onEventSnapshotCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Run the full orchestration pipeline with error handling and fallback.
   * Coordination layer: calls the pure Aggregator, manages fallback on failure,
   * records event snapshots with stateBefore/stateAfter.
   */
  public orchestrate(input: OrchestratorInput): IntelligenceStore {
    this.currentInput = input;
    const stateBefore = this.currentStore;
    let isDegraded = false;

    let output: AggregatorOutput;
    try {
      output = IntelligenceAggregator.compute(input);
      output = IntelligenceAggregator.resolveConflicts(output);
    } catch (err) {
      console.error('[Orchestrator] Aggregation failed:', err);
      isDegraded = true;
      if (this.lastGoodSnapshot) {
        output = this.lastGoodSnapshot;
      } else {
        output = this.getEmptyOutput();
      }
    }

    const store: IntelligenceStore = {
      readingSessionActiveReport: input.readingSessionActiveReport,
      revisionQueue: output.revisionQueue,
      dailySnapshotsList: input.dailySnapshotsList,
      graphAnalyzerHealthReport: output.graphAnalyzerHealthReport,
      examReadinessReport: output.examReadinessReport,
      burnoutDetected: output.burnoutDetected,
      dailyMission: output.dailyMission,
      activeReadingAssetId: input.activeReadingAssetId,
      isDegraded,
      plannerProgress: input.plannerProgress
    };

    if (!isDegraded) {
      this.lastGoodSnapshot = output;
    }
    this.currentStore = store;

    this.notifyUpdateCallbacks(store);
    return store;
  }

  /**
   * Recalculate with event snapshot recording.
   * Captures stateBefore, runs orchestration, captures stateAfter + derivedMetrics,
   * emits EventWithSnapshot to registered listeners.
   */
  public recalculateWithSnapshot(input: OrchestratorInput, triggerEvent?: string): IntelligenceStore {
    const stateBefore = this.currentStore ? this.deepCloneStore(this.currentStore) : null;

    const store = this.orchestrate(input);

    const stateAfter = this.deepCloneStore(store);
    const derivedMetrics = IntelligenceAggregator.computeDerivedMetrics(
      input,
      this.lastGoodSnapshot ?? this.getEmptyOutput()
    );

    if (triggerEvent) {
      const recentEvent = this.eventBuffer.filter(e => e.type === triggerEvent).pop();
      if (recentEvent) {
        const eventSnapshot: EventWithSnapshot = {
          event: recentEvent,
          stateBefore: stateBefore,
          stateAfter: stateAfter,
          derivedMetrics: derivedMetrics,
          recordedAt: new Date().toISOString()
        };
        this.notifyEventSnapshotCallbacks(eventSnapshot);
      }
    }

    return store;
  }

  /** Get the last event for a given type from the buffer */
  public getLastEventByType(type: string): StoredEvent | undefined {
    return this.eventBuffer.filter(e => e.type === type).pop();
  }

  /** Get the current intelligence store */
  public getStore(): IntelligenceStore | null {
    return this.currentStore;
  }

  /** Get the last good aggregator output for fallback */
  public getLastGoodSnapshot(): AggregatorOutput | null {
    return this.lastGoodSnapshot;
  }

  /** Drain the event buffer (called after processing) */
  public drainEventBuffer(): StoredEvent[] {
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    return events;
  }

  /** Cleanup subscriptions */
  public destroy(): void {
    if (this.eventBusUnsubscribe) {
      this.eventBusUnsubscribe();
      this.eventBusUnsubscribe = null;
    }
    this.onUpdateCallbacks = [];
    this.onEventSnapshotCallbacks = [];
  }

  private notifyUpdateCallbacks(store: IntelligenceStore): void {
    for (const cb of this.onUpdateCallbacks) {
      try {
        cb(store);
      } catch (err) {
        console.error('[Orchestrator] Update callback error:', err);
      }
    }
  }

  private notifyEventSnapshotCallbacks(snapshot: EventWithSnapshot): void {
    for (const cb of this.onEventSnapshotCallbacks) {
      try {
        cb(snapshot);
      } catch (err) {
        console.error('[Orchestrator] Event snapshot callback error:', err);
      }
    }
  }

  private getEmptyOutput(): AggregatorOutput {
    return {
      graphAnalyzerHealthReport: null,
      burnoutDetected: false,
      revisionQueue: [],
      examReadinessReport: null,
      dailyMission: null
    };
  }

  private deepCloneStore(store: IntelligenceStore): Partial<IntelligenceStore> {
    try {
      return JSON.parse(JSON.stringify(store));
    } catch {
      return { isDegraded: store.isDegraded };
    }
  }
}

export const intelligenceOrchestratorService = new IntelligenceOrchestratorService();
