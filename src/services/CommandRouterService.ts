/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CommandRouterService – Decouples the Command Palette from direct service invocation.
 *
 * Flow:   raw string → parse() → CommandIntent → execute() → EventBus action
 *
 * Why:
 *   Commands like "> study 12" were previously calling setActiveTab / setSelectedReadingId
 *   directly inside the React component. That created a shadow backend inside the frontend.
 *   This service ensures every command becomes an EventBus event so services react uniformly.
 */

import { CommandIntent } from '../types';
import { EventBus } from './EventBus';

export class CommandRouterService {
  constructor(private eventBus: EventBus) {}

  /**
   * Parse a raw command string (without the leading '>') into a typed intent.
   * Examples:
   *   "study 12"         → { action: 'study', argument: '12' }
   *   "note \"IPS\""     → { action: 'note',  argument: 'IPS' }
   *   "resume"           → { action: 'resume' }
   *   "graph"            → { action: 'graph' }
   */
  public parse(raw: string): CommandIntent {
    const trimmed = raw.trim();
    const parts = trimmed.split(/\s+/);
    const verb = (parts[0] || '').toLowerCase();
    const rest = parts.slice(1).join(' ').replace(/^["']|["']$/g, '');

    switch (verb) {
      case 'study':
        return { action: 'study', argument: rest || undefined };
      case 'note':
        return { action: 'note', argument: rest || undefined };
      case 'resume':
        return { action: 'resume' };
      case 'graph':
        return { action: 'graph' };
      default:
        return { action: 'unknown', argument: trimmed };
    }
  }

  /**
   * Execute a command intent by publishing a domain event.
   * Returns true if the intent was recognized and dispatched, false otherwise.
   */
  public execute(intent: CommandIntent): boolean {
    const timestamp = new Date().toISOString();

    switch (intent.action) {
      case 'study':
        this.eventBus.publish({
          type: 'CommandExecuted',
          timestamp,
          source: 'CommandRouter',
          entityId: `cmd-${timestamp}`,
          payload: { command: 'study', argument: intent.argument }
        });
        return true;

      case 'note':
        this.eventBus.publish({
          type: 'CommandExecuted',
          timestamp,
          source: 'CommandRouter',
          entityId: `cmd-${timestamp}`,
          payload: { command: 'note', argument: intent.argument }
        });
        return true;

      case 'resume':
        this.eventBus.publish({
          type: 'CommandExecuted',
          timestamp,
          source: 'CommandRouter',
          entityId: `cmd-${timestamp}`,
          payload: { command: 'resume' }
        });
        return true;

      case 'graph':
        this.eventBus.publish({
          type: 'CommandExecuted',
          timestamp,
          source: 'CommandRouter',
          entityId: `cmd-${timestamp}`,
          payload: { command: 'graph' }
        });
        return true;

      default:
        return false;
    }
  }

  /**
   * Convenience: parse + execute in one call.
   * Returns the parsed intent and whether dispatch succeeded.
   */
  public executeCommand(raw: string): { intent: CommandIntent; dispatched: boolean } {
    const intent = this.parse(raw);
    const dispatched = this.execute(intent);
    return { intent, dispatched };
  }
}
