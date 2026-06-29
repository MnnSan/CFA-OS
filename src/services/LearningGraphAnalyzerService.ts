/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GraphAnalyzerHealth, Subject, Reading, LearningOutcomeStatement, StudyNote, Formula, Asset } from '../types';

export class LearningGraphAnalyzerService {
  /**
   * Scans nodes and edges to evaluate overall syllabus coverage and semantic connection quality.
   */
  public calculateGraphHealth(
    subjects: Subject[],
    readings: Reading[],
    losList: LearningOutcomeStatement[],
    notes: StudyNote[],
    formulas: Formula[],
    assets: Asset[]
  ): { health: GraphAnalyzerHealth; isolatedNotes: StudyNote[]; orphanFormulas: Formula[]; disconnectedLOS: LearningOutcomeStatement[]; missingResourcesReadings: Reading[] } {
    
    // Find isolated notes (no links to syllabus structures)
    const isolatedNotes = notes.filter(note => 
      !note.linkedSubjectId && !note.linkedReadingId && !note.linkedLOSId
    );

    // Find orphan formulas (no links to syllabus structures)
    const orphanFormulas = formulas.filter(form =>
      !form.linkedSubjectId && !form.linkedReadingId && !form.linkedLOSId
    );

    // Find missing resource links (readings with 0 linked documents or assets)
    const missingResourcesReadings = readings.filter(rd => {
      const hasAsset = assets.some(a => a.linkedReadingId === rd.id);
      return !hasAsset;
    });

    // Find disconnected LOS (no notes, formulas, or assets linked)
    const disconnectedLOS = losList.filter(los => {
      const hasNote = notes.some(n => n.linkedLOSId === los.id);
      const hasFormula = formulas.some(f => f.linkedLOSId === los.id);
      const hasAsset = assets.some(a => a.linkedLOSId === los.id);
      return !hasNote && !hasFormula && !hasAsset;
    });

    // Find duplicate assets (same file name or same manifest fingerprint)
    const seenNames = new Set<string>();
    const duplicateAssets: Asset[] = [];
    assets.forEach(a => {
      if (seenNames.has(a.name.toLowerCase())) {
        duplicateAssets.push(a);
      }
      seenNames.add(a.name.toLowerCase());
    });

    // Compute Knowledge Density (edges/connections to node ratio)
    // We count: note connections, formula connections, asset connections
    let connectionsCount = 0;
    notes.forEach(n => {
      if (n.linkedSubjectId) connectionsCount++;
      if (n.linkedReadingId) connectionsCount++;
      if (n.linkedLOSId) connectionsCount++;
    });
    formulas.forEach(f => {
      if (f.linkedSubjectId) connectionsCount++;
      if (f.linkedReadingId) connectionsCount++;
      if (f.linkedLOSId) connectionsCount++;
    });
    assets.forEach(a => {
      if (a.linkedSubjectId) connectionsCount++;
      if (a.linkedReadingId) connectionsCount++;
      if (a.linkedLOSId) connectionsCount++;
    });

    const totalNodes = subjects.length + readings.length + losList.length + notes.length + formulas.length + assets.length;
    const knowledgeDensity = totalNodes > 0 ? Number((connectionsCount / totalNodes).toFixed(2)) : 0;

    // Deduce overall health (starts at 100)
    let score = 100;
    score -= isolatedNotes.length * 5;
    score -= orphanFormulas.length * 5;
    score -= missingResourcesReadings.length * 4;
    score -= disconnectedLOS.length * 2;
    score -= duplicateAssets.length * 10;
    
    const overallGraphHealth = Math.max(0, Math.min(100, score));

    const health: GraphAnalyzerHealth = {
      overallGraphHealth,
      isolatedNotesCount: isolatedNotes.length,
      orphanFormulasCount: orphanFormulas.length,
      missingResourceLinksCount: missingResourcesReadings.length,
      disconnectedLOSCount: disconnectedLOS.length,
      duplicateAssetsCount: duplicateAssets.length,
      knowledgeDensity
    };

    return {
      health,
      isolatedNotes,
      orphanFormulas,
      disconnectedLOS,
      missingResourcesReadings
    };
  }
}

export const learningGraphAnalyzerService = new LearningGraphAnalyzerService();
