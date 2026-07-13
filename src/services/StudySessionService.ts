/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudySession } from '../types';

/**
 * Service to manage Study Sessions.
 * Persists data to localStorage to maintain state across pages and reloads.
 * This can be used by Dashboard, Calendar, Notes, or any future AI/analytics modules.
 */
export class StudySessionService {
  private static STORAGE_KEY_ACTIVE = 'cfa_active_session';
  private static STORAGE_KEY_HISTORY = 'cfa_session_history';
  private static STORAGE_KEY_ELAPSED = 'cfa_session_elapsed_seconds';
  private static STORAGE_KEY_PAUSED_AT = 'cfa_session_paused_at';

  /**
   * Starts a new study session. If a session is already active, returns it.
   */
  public static startSession(params: {
    linkedSubjectId?: string;
    linkedReadingId?: string;
    linkedLOSId?: string;
    confidenceBefore?: number | null;
  }): StudySession {
    const existing = this.getActiveSession();
    if (existing) {
      return existing;
    }

    const newSession: StudySession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      startTime: new Date().toISOString(),
      durationMinutes: 0,
      linkedSubjectId: params.linkedSubjectId,
      linkedReadingId: params.linkedReadingId,
      linkedLOSId: params.linkedLOSId,
      notesAddedIds: [],
      resourcesUsedIds: [],
      questionsAttemptedPlaceholder: 0,
      confidenceBefore: params.confidenceBefore || null,
      confidenceAfter: null
    };

    localStorage.setItem(this.STORAGE_KEY_ACTIVE, JSON.stringify(newSession));
    localStorage.setItem(this.STORAGE_KEY_ELAPSED, '0');
    localStorage.removeItem(this.STORAGE_KEY_PAUSED_AT);

    return newSession;
  }

  /**
   * Retrieves the currently active study session.
   */
  public static getActiveSession(): StudySession | null {
    const data = localStorage.getItem(this.STORAGE_KEY_ACTIVE);
    if (!data) return null;
    try {
      return JSON.parse(data) as StudySession;
    } catch {
      return null;
    }
  }

  /**
   * Pauses the current active session.
   */
  public static pauseSession(reason?: string): void {
    const active = this.getActiveSession();
    if (!active) return;

    const alreadyPaused = localStorage.getItem(this.STORAGE_KEY_PAUSED_AT);
    if (alreadyPaused) return; // Already paused

    localStorage.setItem(this.STORAGE_KEY_PAUSED_AT, new Date().toISOString());
    if (reason) {
      localStorage.setItem('cfa_session_pause_reason', reason);
    }
  }

  /**
   * Pauses the current active session retroactively at a specific timestamp.
   */
  public static pauseSessionRetroactively(pausedAtIso: string, reason: string): void {
    const active = this.getActiveSession();
    if (!active) return;

    localStorage.setItem(this.STORAGE_KEY_PAUSED_AT, pausedAtIso);
    localStorage.setItem('cfa_session_pause_reason', reason);
  }

  /**
   * Resumes the current paused session.
   */
  public static resumeSession(): void {
    const active = this.getActiveSession();
    if (!active) return;

    const pausedAtStr = localStorage.getItem(this.STORAGE_KEY_PAUSED_AT);
    if (!pausedAtStr) return; // Not paused

    const pausedAt = new Date(pausedAtStr);
    const now = new Date();
    const pausedDurationMs = now.getTime() - pausedAt.getTime();

    // Adjust the session startTime to compensate for the paused period
    const start = new Date(active.startTime);
    active.startTime = new Date(start.getTime() + pausedDurationMs).toISOString();

    localStorage.setItem(this.STORAGE_KEY_ACTIVE, JSON.stringify(active));
    localStorage.removeItem(this.STORAGE_KEY_PAUSED_AT);
    localStorage.removeItem('cfa_session_pause_reason');
  }

  /**
   * Checks if the active session is paused.
   */
  public static isSessionPaused(): boolean {
    return localStorage.getItem(this.STORAGE_KEY_PAUSED_AT) !== null;
  }

  /**
   * Calculates the current elapsed study time in seconds for the active session.
   */
  public static getElapsedTimeSeconds(): number {
    const active = this.getActiveSession();
    if (!active) return 0;

    const pausedAtStr = localStorage.getItem(this.STORAGE_KEY_PAUSED_AT);
    const now = new Date();
    const start = new Date(active.startTime);

    if (pausedAtStr) {
      const pausedAt = new Date(pausedAtStr);
      return Math.max(0, Math.floor((pausedAt.getTime() - start.getTime()) / 1000));
    }

    return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  }

  /**
   * Concludes the current active session and saves it to history.
   */
  public static finishSession(params?: {
    mentalFocusScore?: number;
    notesAddedIds?: string[];
    resourcesUsedIds?: string[];
    confidenceAfter?: number | null;
    reflectionDifficulty?: 'Easy' | 'Medium' | 'Hard';
    reflectionNotes?: string;
    reflectionConfusion?: string;
  }): StudySession | null {
    const active = this.getActiveSession();
    if (!active) return null;

    const elapsedSeconds = this.getElapsedTimeSeconds();
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    const finishedSession: StudySession = {
      ...active,
      endTime: new Date().toISOString(),
      durationMinutes,
      mentalFocusScore: params?.mentalFocusScore || 5,
      notesAddedIds: params?.notesAddedIds || [],
      resourcesUsedIds: params?.resourcesUsedIds || [],
      confidenceAfter: params?.confidenceAfter !== undefined ? params.confidenceAfter : null,
      reflectionDifficulty: params?.reflectionDifficulty,
      reflectionNotes: params?.reflectionNotes,
      reflectionConfusion: params?.reflectionConfusion,
      status: 'Completed'
    };

    // Save to history
    const history = this.getSessionHistory();
    history.unshift(finishedSession);
    localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(history));

    // Clear active session storage
    localStorage.removeItem(this.STORAGE_KEY_ACTIVE);
    localStorage.removeItem(this.STORAGE_KEY_ELAPSED);
    localStorage.removeItem(this.STORAGE_KEY_PAUSED_AT);
    localStorage.removeItem('cfa_session_pause_reason');

    return finishedSession;
  }

  /**
   * Cancels the active session without saving to history.
   */
  public static cancelSession(): void {
    localStorage.removeItem(this.STORAGE_KEY_ACTIVE);
    localStorage.removeItem(this.STORAGE_KEY_ELAPSED);
    localStorage.removeItem(this.STORAGE_KEY_PAUSED_AT);
    localStorage.removeItem('cfa_session_pause_reason');
  }

  /**
   * Retrieves all completed study sessions.
   */
  public static getSessionHistory(): StudySession[] {
    const data = localStorage.getItem(this.STORAGE_KEY_HISTORY);
    if (!data) return [];
    try {
      return JSON.parse(data) as StudySession[];
    } catch {
      return [];
    }
  }

  /**
   * Associates notes or resources with the active session.
   */
  public static updateActiveSessionAssociations(params: {
    notesAddedIds?: string[];
    resourcesUsedIds?: string[];
  }): void {
    const active = this.getActiveSession();
    if (!active) return;

    if (params.notesAddedIds) {
      active.notesAddedIds = Array.from(new Set([...(active.notesAddedIds || []), ...params.notesAddedIds]));
    }
    if (params.resourcesUsedIds) {
      active.resourcesUsedIds = Array.from(new Set([...(active.resourcesUsedIds || []), ...params.resourcesUsedIds]));
    }

    localStorage.setItem(this.STORAGE_KEY_ACTIVE, JSON.stringify(active));
  }
}
