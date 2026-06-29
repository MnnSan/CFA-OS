/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subject } from '../types';

export class SubjectRepository {
  private subjectById = new Map<string, Subject>();

  constructor(private subjects: Subject[]) {
    subjects.forEach(s => {
      this.subjectById.set(s.id, s);
    });
  }

  public getById(id: string): Subject | undefined {
    return this.subjectById.get(id);
  }

  public getAll(): Subject[] {
    return this.subjects;
  }
}
