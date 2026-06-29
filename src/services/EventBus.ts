/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DomainEvent } from '../types';

export type EventCallback = (event: DomainEvent) => void;

/**
 * Singleton Application Event Bus.
 * Enables loose coupling across different operating system modules and engines
 * by publishing and subscribing to DomainEvents.
 */
export class EventBus {
  private static instance: EventBus;
  private listeners: Record<string, EventCallback[]> = {};

  private constructor() {}

  /**
   * Retrieves the global static instance of the Event Bus.
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribes to events of a specific type, or wildcard '*' for all events.
   * Returns a cleanup unsubscribe callback function.
   */
  public subscribe(eventType: string | '*', callback: EventCallback): () => void {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);

    // Return unsubscribe callback
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    };
  }

  /**
   * Dispatches an event to all matching subscribers.
   */
  public publish(event: DomainEvent): void {
    // Publish to specific listeners
    if (this.listeners[event.type]) {
      this.listeners[event.type].forEach(cb => {
        try {
          cb(event);
        } catch (e) {
          console.error(`Error executing subscriber for event type ${event.type}:`, e);
        }
      });
    }

    // Publish to wildcard listeners
    if (this.listeners['*']) {
      this.listeners['*'].forEach(cb => {
        try {
          cb(event);
        } catch (e) {
          console.error(`Error executing wildcard subscriber for event type ${event.type}:`, e);
        }
      });
    }
  }
}
export const eventBus = EventBus.getInstance();
