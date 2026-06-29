/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudySession } from '../types';

export class StudySessionRepository {
  private sessionById = new Map<string, StudySession>();
  private sessionsByReading = new Map<string, StudySession[]>();
  private sessionsByLOS = new Map<string, StudySession[]>();

  constructor(private sessions: StudySession[]) {
    sessions.forEach(s => {
      this.sessionById.set(s.id, s);

      // Group by Reading
      if (s.linkedReadingId) {
        if (!this.sessionsByReading.has(s.linkedReadingId)) {
          this.sessionsByReading.set(s.linkedReadingId, []);
        }
        this.sessionsByReading.get(s.linkedReadingId)!.push(s);
      }

      // Group by LOS
      if (s.linkedLOSId) {
        if (!this.sessionsByLOS.has(s.linkedLOSId)) {
          this.sessionsByLOS.set(s.linkedLOSId, []);
        }
        this.sessionsByLOS.get(s.linkedLOSId)!.push(s);
      }
    });
  }

  public getById(id: string): StudySession | undefined {
    return this.sessionById.get(id);
  }

  public getAll(): StudySession[] {
    return this.sessions;
  }

  public getByReadingId(readingId: string): StudySession[] {
    return this.sessionsByReading.get(readingId) || [];
  }

  public getByLOSId(losId: string): StudySession[] {
    return this.sessionsByLOS.get(losId) || [];
  }

  public getRecent(limit: number): StudySession[] {
    return this.sessions
      .filter(s => s.status === 'Completed')
      .slice(0, limit);
  }
}
