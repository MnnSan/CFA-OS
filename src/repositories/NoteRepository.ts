/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudyNote } from '../types';

export class NoteRepository {
  private noteById = new Map<string, StudyNote>();
  private notesByLOS = new Map<string, StudyNote[]>();
  private notesByReading = new Map<string, StudyNote[]>();
  private notesByFormula = new Map<string, StudyNote[]>();

  constructor(private notes: StudyNote[]) {
    notes.forEach(n => {
      this.noteById.set(n.id, n);

      // Group by LOS
      if (n.linkedLOSId) {
        if (!this.notesByLOS.has(n.linkedLOSId)) {
          this.notesByLOS.set(n.linkedLOSId, []);
        }
        this.notesByLOS.get(n.linkedLOSId)!.push(n);
      }

      // Group by Reading
      if (n.linkedReadingId) {
        if (!this.notesByReading.has(n.linkedReadingId)) {
          this.notesByReading.set(n.linkedReadingId, []);
        }
        this.notesByReading.get(n.linkedReadingId)!.push(n);
      }

      // Group by Formulas
      if (n.relatedFormula) {
        n.relatedFormula.forEach(fid => {
          if (!this.notesByFormula.has(fid)) {
            this.notesByFormula.set(fid, []);
          }
          this.notesByFormula.get(fid)!.push(n);
        });
      }
    });
  }

  public getById(id: string): StudyNote | undefined {
    return this.noteById.get(id);
  }

  public getAll(): StudyNote[] {
    return this.notes;
  }

  public getByLOSId(losId: string): StudyNote[] {
    return this.notesByLOS.get(losId) || [];
  }

  public getByReadingId(readingId: string): StudyNote[] {
    return this.notesByReading.get(readingId) || [];
  }

  public getByFormulaId(formulaId: string): StudyNote[] {
    return this.notesByFormula.get(formulaId) || [];
  }
}
