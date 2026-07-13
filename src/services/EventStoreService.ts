/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { eventBus } from './EventBus';
import { syncQueue } from './sync/SyncQueue';

export interface SourcedEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  payload: any;
}

export class EventStoreService {
  private static instance: EventStoreService;
  private eventStream: SourcedEvent[] = [];

  private constructor() {
    this.loadFromCache();
    
    // Subscribe to all EventBus events to record them
    eventBus.subscribe('*', (event) => {
      this.recordEvent(event);
    });
  }

  public static getInstance(): EventStoreService {
    if (!EventStoreService.instance) {
      EventStoreService.instance = new EventStoreService();
    }
    return EventStoreService.instance;
  }

  private loadFromCache() {
    try {
      const saved = localStorage.getItem('cfa_event_stream');
      if (saved) {
        this.eventStream = JSON.parse(saved);
      }
    } catch (_) {}
  }

  private saveToCache() {
    try {
      localStorage.setItem('cfa_event_stream', JSON.stringify(this.eventStream));
    } catch (_) {}
  }

  public recordEvent(event: any) {
    const sourcedEvent: SourcedEvent = {
      id: event.id || `evt-${Math.random().toString(36).substring(7)}-${Date.now()}`,
      type: event.type,
      timestamp: event.timestamp || new Date().toISOString(),
      source: event.source || 'Unknown',
      payload: event.payload || {}
    };

    // Avoid duplicating logs
    if (this.eventStream.some(e => e.id === sourcedEvent.id)) return;

    this.eventStream.push(sourcedEvent);
    this.saveToCache();

    // Enqueue event document to Firestore
    const uid = localStorage.getItem('cfa_sync_uid');
    if (uid) {
      syncQueue.enqueue('event' as any, sourcedEvent.id, sourcedEvent);
    }
  }

  public getEventStream(): SourcedEvent[] {
    return [...this.eventStream];
  }

  public getBufferSize(): number {
    return this.eventStream.length;
  }

  public getTotalCount(): number {
    return this.eventStream.length;
  }

  public clearStream() {
    this.eventStream = [];
    this.saveToCache();
  }
}

export const eventStoreService = EventStoreService.getInstance();
export const eventStore = eventStoreService;
