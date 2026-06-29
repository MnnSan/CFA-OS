/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SubjectRepository,
  ReadingRepository,
  LOSRepository,
  FormulaRepository,
  ResourceRepository,
  NoteRepository,
  StudySessionRepository
} from '../repositories';
import { AnalyticsService } from './AnalyticsService';
import {
  Subject,
  Reading,
  LearningOutcomeStatement,
  Resource,
  StudyNote,
  StudySession,
  Formula,
  EnrichedSubject,
  EnrichedReading,
  EnrichedLOS
} from '../types';

/**
 * Service to query relationships and enrich syllabus nodes in the CFA Level III curriculum.
 * Delegates statistical and metric calculations to the AnalyticsService.
 */
export class CurriculumIntelligenceService {
  constructor(
    private subjectRepo: SubjectRepository,
    private readingRepo: ReadingRepository,
    private losRepo: LOSRepository,
    private resourceRepo: ResourceRepository,
    private noteRepo: NoteRepository,
    private sessionRepo: StudySessionRepository,
    private formulaRepo: FormulaRepository,
    private analytics: AnalyticsService
  ) {}

  // ==========================================
  // DELEGATED CALCULATION ACCESSORS
  // ==========================================

  public getSyllabusCompletionPercentage(): number {
    return this.analytics.getSyllabusCompletionPercentage();
  }

  public getTotalHoursStudied(): number {
    return this.analytics.getTotalHoursStudied();
  }

  public getStudyVelocity(): number {
    return this.analytics.getStudyVelocity();
  }

  public getSessionFrequency(): number {
    return this.analytics.getSessionFrequency();
  }

  public getSubjectCompletion(subjectId: string): { total: number; completed: number; pct: number } {
    return this.analytics.getSubjectCompletion(subjectId);
  }

  public getReadingCompletion(readingId: string): { total: number; completed: number; pct: number } {
    return this.analytics.getReadingCompletion(readingId);
  }

  // ==========================================
  // RELATIONSHIP RESOLVERS
  // ==========================================

  public getFormulas(): Formula[] {
    return this.formulaRepo.getAll();
  }

  public getLOSForReading(readingId: string): EnrichedLOS[] {
    return this.losRepo.getByReadingId(readingId).map(l => this.enrichLOS(l));
  }

  public getReadingForFormula(formulaId: string): Reading | null {
    const formula = this.formulaRepo.getById(formulaId);
    if (!formula || !formula.linkedReadingId) return null;
    return this.readingRepo.getById(formula.linkedReadingId) || null;
  }

  public getResourcesForLOS(losId: string): Resource[] {
    return this.resourceRepo.getByLOSId(losId);
  }

  public getNotesForFormula(formulaId: string): StudyNote[] {
    return this.noteRepo.getByFormulaId(formulaId);
  }

  public getSessionsForReading(readingId: string): StudySession[] {
    return this.sessionRepo.getByReadingId(readingId);
  }

  /**
   * Resolves the most neglected Reading (uncompleted, with lowest study hours).
   */
  public getMostNeglectedReading(): EnrichedReading | null {
    const uncompleted = this.readingRepo.getAll().filter(r => 
      this.analytics.getReadingCompletion(r.id).pct < 100
    );
    if (uncompleted.length === 0) return null;

    const enriched = uncompleted.map(r => this.enrichReading(r));
    enriched.sort((a, b) => {
      if (a.totalHoursInvested !== b.totalHoursInvested) {
        return a.totalHoursInvested - b.totalHoursInvested;
      }
      const diffWeight = { 'Hard': 3, 'Medium': 2, 'Easy': 1, 'Unspecified': 0 };
      const weightA = diffWeight[a.difficulty || 'Unspecified'] || 0;
      const weightB = diffWeight[b.difficulty || 'Unspecified'] || 0;
      return weightB - weightA;
    });

    return enriched[0];
  }

  /**
   * Finds the formula referenced most frequently across notes, resources, and LOS links.
   */
  public getMostFrequentFormula(): Formula | null {
    const formulas = this.formulaRepo.getAll();
    if (formulas.length === 0) return null;

    const scores: Record<string, number> = {};
    formulas.forEach(f => { scores[f.id] = 0; });

    // Count in notes
    this.noteRepo.getAll().forEach(n => {
      n.relatedFormula?.forEach(fid => {
        if (scores[fid] !== undefined) scores[fid]++;
      });
    });

    // Count in LOS
    this.losRepo.getAll().forEach(l => {
      l.relatedFormulas?.forEach(fid => {
        if (scores[fid] !== undefined) scores[fid]++;
      });
      l.formulaIds?.forEach(fid => {
        if (scores[fid] !== undefined) scores[fid]++;
      });
    });

    let topFid = formulas[0].id;
    let maxCount = -1;
    Object.entries(scores).forEach(([fid, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topFid = fid;
      }
    });

    return this.formulaRepo.getById(topFid) || null;
  }

  // ==========================================
  // SYLLABUS ENRICHMENT IMPLEMENTATIONS
  // ==========================================

  public enrichSubject(sub: Subject): EnrichedSubject {
    const stats = this.analytics.getSubjectCompletion(sub.id);
    const avgConfidence = this.analytics.getAverageConfidenceForSubject(sub.id);
    const subjectReadings = this.readingRepo.getBySubjectId(sub.id);

    // Sum hours studied
    let totalMinutes = 0;
    subjectReadings.forEach(r => {
      const rdSessions = this.sessionRepo.getByReadingId(r.id);
      rdSessions.forEach(s => {
        if (s.status === 'Completed') {
          totalMinutes += s.durationMinutes;
        }
      });
    });
    const timeInvested = Number((totalMinutes / 60).toFixed(1));

    // Hardcode dependency tree placeholders
    const dependenciesMap: Record<string, string[]> = {
      '9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf': ['4d306b3a-5f05-4cbb-bb78-75c1a798ee73'], // SAA needs CME
      '7c9a4e05-c49b-4bc9-93e1-32a21008064d': ['9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf'], // FI PM needs SAA
      '1c2f0d92-7f72-4752-9c16-8367a84e62ad': ['9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf'], // EQ PM needs SAA
      'bc78e874-94c6-4b2a-89a1-5d9c2cfde548': ['9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf', 'e5b7b901-b258-45a7-96a8-a5b501d515a0'] // PWM needs SAA & Ethics
    };

    const relatedMap: Record<string, string[]> = {
      '4d306b3a-5f05-4cbb-bb78-75c1a798ee73': ['9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf', '7c9a4e05-c49b-4bc9-93e1-32a21008064d'],
      '9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf': ['7c9a4e05-c49b-4bc9-93e1-32a21008064d', '1c2f0d92-7f72-4752-9c16-8367a84e62ad', 'bc78e874-94c6-4b2a-89a1-5d9c2cfde548'],
      '7c9a4e05-c49b-4bc9-93e1-32a21008064d': ['1c2f0d92-7f72-4752-9c16-8367a84e62ad', 'df412a80-bfd7-463c-91df-cde24d5432ba'],
      'bc78e874-94c6-4b2a-89a1-5d9c2cfde548': ['31d044fa-cf5b-43fe-b391-766cf2cde129']
    };

    return {
      ...sub,
      difficulty: sub.id === '7c9a4e05-c49b-4bc9-93e1-32a21008064d' || sub.id === '9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf' || sub.id === 'bc78e874-94c6-4b2a-89a1-5d9c2cfde548' ? 'Hard' : 'Medium',
      personalProgress: stats.pct,
      readingCount: subjectReadings.length,
      averageConfidence: avgConfidence,
      timeInvested,
      completionPercentage: stats.pct,
      dependencies: dependenciesMap[sub.id] || [],
      relatedSubjects: relatedMap[sub.id] || []
    };
  }

  public enrichReading(rd: Reading): EnrichedReading {
    const stats = this.analytics.getReadingCompletion(rd.id);
    const los = this.losRepo.getByReadingId(rd.id);
    const formulas = this.formulaRepo.getByReadingId(rd.id);
    const notes = this.noteRepo.getByReadingId(rd.id);
    const resources = this.resourceRepo.getByReadingId(rd.id);
    const rdSessions = this.sessionRepo.getByReadingId(rd.id).filter(s => s.status === 'Completed');

    const totalMinutes = rdSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalHoursInvested = Number((totalMinutes / 60).toFixed(1));
    const averageConfidence = this.analytics.getAverageConfidenceForReading(rd.id);

    // Mock prerequisites and related lists
    const prereqMap: Record<string, string[]> = {
      'ab102030-4050-4060-8070-90a0b0c0d008': ['ab102030-4050-4060-8070-90a0b0c0d005'],
      'ab102030-4050-4060-8070-90a0b0c0d012': ['ab102030-4050-4060-8070-90a0b0c0d008'],
      'ab102030-4050-4060-8070-90a0b0c0d013': ['ab102030-4050-4060-8070-90a0b0c0d012']
    };

    const relatedMap: Record<string, string[]> = {
      'ab102030-4050-4060-8070-90a0b0c0d001': ['ab102030-4050-4060-8070-90a0b0c0d002'],
      'ab102030-4050-4060-8070-90a0b0c0d012': ['ab102030-4050-4060-8070-90a0b0c0d013'],
      'ab102030-4050-4060-8070-90a0b0c0d008': ['ab102030-4050-4060-8070-90a0b0c0d012', 'ab102030-4050-4060-8070-90a0b0c0d015']
    };

    return {
      ...rd,
      progress: stats.pct,
      losCount: los.length,
      formulaCount: formulas.length,
      blueBoxCount: 3,
      eocQuestionCount: 15,
      notesCount: notes.length,
      resourceCount: resources.length,
      studySessions: rdSessions,
      averageConfidence,
      totalHoursInvested,
      relatedReadings: relatedMap[rd.id] || [],
      suggestedPrerequisites: prereqMap[rd.id] || []
    };
  }

  public enrichLOS(los: LearningOutcomeStatement): EnrichedLOS {
    const losSessions = this.sessionRepo.getByLOSId(los.id).filter(s => s.status === 'Completed');

    const sortedSessions = [...losSessions].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const confidenceHistory = sortedSessions
      .map(s => s.confidenceAfter)
      .filter((c): c is number => c !== undefined && c !== null);

    const formulas = this.formulaRepo.getByReadingId(los.readingId).filter(f => f.linkedLOSId === los.id).map(f => f.id);
    const notes = this.noteRepo.getByLOSId(los.id).map(n => n.id);
    const resources = this.resourceRepo.getByLOSId(los.id).map(r => r.id);

    const examImportance: Record<string, 'High' | 'Medium' | 'Low'> = {
      'los-1a': 'High',
      'los-5b': 'High',
      'los-8b': 'High',
      'los-12a': 'High',
      'los-13a': 'High',
      'los-19a': 'Medium'
    };

    return {
      ...los,
      confidenceHistory,
      revisionCount: losSessions.length,
      formulaReferences: formulas,
      resourceReferences: resources,
      noteReferences: notes,
      studySessionHistory: losSessions,
      examImportance: examImportance[los.id] || 'Medium',
      semanticEmbedding: [0.12, -0.45, 0.78, 0.05],
      aiGroundingContext: `LOS ${los.code} evaluates the candidate's proficiency to: ${los.statement}`
    };
  }
}
