import {
  IntelligenceStore,
  BurnoutRiskReport,
  RevisionQueueSummary,
  WeakTopicsSummary
} from '../types';
import { ExamReadinessReport } from './ExamReadinessService';
import { DailyMission } from './MissionEngineService';
import { IntelligenceOrchestratorService } from './IntelligenceOrchestratorService';
import { IntelligenceQueryService } from './IntelligenceQueryService';

// ──────────────────────────────────────────────
// Channel
// ──────────────────────────────────────────────

export interface StreamChannel<T> {
  subscribe(cb: (value: T) => void): () => void;
  getCurrent(): T | undefined;
}

// ──────────────────────────────────────────────
// Selector: extracts a slice with equality check
// ──────────────────────────────────────────────

type Selector<TSlice> = {
  extract: (store: IntelligenceStore) => TSlice;
  equals: (a: TSlice, b: TSlice) => boolean;
};

function deepEqual<T>(a: T, b: T): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function selector<TSlice>(
  extract: (store: IntelligenceStore) => TSlice,
  equals: (a: TSlice, b: TSlice) => boolean = deepEqual
): Selector<TSlice> {
  return { extract, equals };
}

// ──────────────────────────────────────────────
// Reactive Intelligence Stream
// ──────────────────────────────────────────────

export class IntelligenceStream {
  private unsubscribeOrchestrator: (() => void) | null = null;
  private channels = new Map<string, Set<(value: any) => void>>();
  private lastValues = new Map<string, any>();
  private selectors = new Map<string, Selector<any>>();

  /** Named, pre-wired channels */
  readonly readiness: StreamChannel<ExamReadinessReport | null>;
  readonly mission: StreamChannel<DailyMission | null>;
  readonly burnout: StreamChannel<BurnoutRiskReport>;
  readonly revisionQueue: StreamChannel<RevisionQueueSummary>;
  readonly weakTopics: StreamChannel<WeakTopicsSummary>;
  readonly raw: StreamChannel<IntelligenceStore>;

  constructor() {
    // Define channels without wiring to orchestrator yet
    this.readiness = this.createChannel<ExamReadinessReport | null>('readiness');
    this.mission = this.createChannel<DailyMission | null>('mission');
    this.burnout = this.createChannel<BurnoutRiskReport>('burnout');
    this.revisionQueue = this.createChannel<RevisionQueueSummary>('revisionQueue');
    this.weakTopics = this.createChannel<WeakTopicsSummary>('weakTopics');
    this.raw = this.createChannel<IntelligenceStore>('raw');
  }

  /**
   * Wire the stream to an orchestrator and query service.
   * Call this once during app initialization (e.g., in AppContext).
   */
  public wire(
    orchestrator: IntelligenceOrchestratorService,
    query: IntelligenceQueryService
  ): void {
    // Clean up previous wiring if any
    this.unsubscribeOrchestrator?.();

    // Register selectors that use the query service for reshaping
    this.selectors.set('readiness', selector(s => s.examReadinessReport));
    this.selectors.set('mission', selector(s => s.dailyMission));
    this.selectors.set('burnout', selector(s => query.getBurnoutRisk()));
    this.selectors.set('revisionQueue', selector(s => query.getRevisionQueue()));
    this.selectors.set('weakTopics', selector(s => query.getWeakTopics()));
    this.selectors.set('raw', selector(s => ({ ...s })));

    // Subscribe to the orchestrator's push channel
    this.unsubscribeOrchestrator = orchestrator.onUpdate((store) => {
      this.dispatch(store);
    });
  }

  /** Is the stream wired to live data? */
  get isWired(): boolean {
    return this.unsubscribeOrchestrator !== null;
  }

  // ── Internal ──

  private createChannel<T>(key: string): StreamChannel<T> {
    this.channels.set(key, new Set());

    return {
      subscribe: (cb: (value: T) => void): () => void => {
        this.channels.get(key)!.add(cb);

        // Immediately deliver current value if available
        const current = this.lastValues.get(key);
        if (current !== undefined) {
          try { cb(current as T); } catch {}
        }

        return () => {
          this.channels.get(key)?.delete(cb);
        };
      },
      getCurrent: (): T | undefined => this.lastValues.get(key) as T | undefined,
    };
  }

  private dispatch(store: IntelligenceStore): void {
    for (const [key, sel] of this.selectors) {
      const next = sel.extract(store);
      const prev = this.lastValues.get(key);

      if (!sel.equals(prev, next)) {
        this.lastValues.set(key, next);
        const subs = this.channels.get(key);
        if (subs) {
          for (const cb of subs) {
            try { cb(next); } catch (err) {
              console.error(`[IntelligenceStream] Subscriber error "${key}":`, err);
            }
          }
        }
      }
    }
  }

  /** Teardown */
  destroy(): void {
    this.unsubscribeOrchestrator?.();
    this.unsubscribeOrchestrator = null;
    this.channels.clear();
    this.lastValues.clear();
    this.selectors.clear();
  }
}

/** Singleton stream — wire() it during bootstrap */
export const intelligenceStream = new IntelligenceStream();
