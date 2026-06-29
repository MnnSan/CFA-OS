/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SubjectRepository,
  ReadingRepository,
  LOSRepository,
  NoteRepository,
  ResourceRepository,
  FormulaRepository,
  StudySessionRepository
} from '../repositories';
import { AnalyticsService } from './AnalyticsService';
import { Subject, Reading, LearningOutcomeStatement, Formula, Resource, StudyNote } from '../types';

export interface Mission {
  losId: string;
  losCode: string;
  readingId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  readingNumber: number;
  readingTitle: string;
  statement: string;
  reason: string;
  priority: 'High' | 'Medium' | 'Low';
  estimatedDurationHours: number;
  remainingReadingHours: number;
  requiredResources: Resource[];
  suggestedFormulae: Formula[];
  suggestedNotes: StudyNote[];
  confidenceLevel: number | null;
  nextStep: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

/**
 * Engine dedicated to determining the candidate's active daily focus (Today's Mission).
 * Pulls inputs from repositories and analytics and computes the recommended focus.
 */
export class MissionEngine {
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

  /**
   * Evaluates candidate context to resolve Today's Mission focus and metadata.
   */
  public calculateMission(
    activeSessionLOSId: string | null | undefined,
    selectedLOSId: string | null | undefined
  ): Mission | null {
    const losList = this.losRepo.getAll();
    if (losList.length === 0) return null;

    // 1. Resolve Focus LOS using Priority Chain
    let targetLOS: LearningOutcomeStatement | undefined;
    let triggerReason = 'Syllabus Sequence: Default sequential progression path.';
    let priority: 'High' | 'Medium' | 'Low' = 'Medium';

    if (activeSessionLOSId) {
      targetLOS = this.losRepo.getById(activeSessionLOSId);
      if (targetLOS) {
        triggerReason = 'Active Focus: This is the subject of your current active real-time study session.';
        priority = 'High';
      }
    }

    if (!targetLOS && selectedLOSId) {
      targetLOS = this.losRepo.getById(selectedLOSId);
      if (targetLOS) {
        triggerReason = 'Selected Focus: You manually highlighted this syllabus outcome in the Curriculum explorer.';
        priority = 'High';
      }
    }

    if (!targetLOS) {
      // Find the most neglected reading (uncompleted, sorted by progress, difficulty, weight)
      const uncompletedReadings = this.readingRepo.getAll().filter(r => {
        const progress = this.analytics.getReadingCompletion(r.id).pct;
        return progress < 100;
      });

      if (uncompletedReadings.length > 0) {
        uncompletedReadings.sort((a, b) => {
          const pctA = this.analytics.getReadingCompletion(a.id).pct;
          const pctB = this.analytics.getReadingCompletion(b.id).pct;
          if (pctA !== pctB) return pctA - pctB;

          const diffWeight = { 'Hard': 3, 'Medium': 2, 'Easy': 1, 'Unspecified': 0 };
          const weightA = diffWeight[a.difficulty || 'Unspecified'] || 0;
          const weightB = diffWeight[b.difficulty || 'Unspecified'] || 0;
          return weightB - weightA;
        });

        const neglectedReading = uncompletedReadings[0];
        const rdLOS = this.losRepo.getByReadingId(neglectedReading.id);
        const firstUncompleted = rdLOS.find(l => l.status !== 'Completed');

        if (firstUncompleted) {
          targetLOS = firstUncompleted;
          triggerReason = `Neglected Area: Reading ${neglectedReading.number} has only ${this.analytics.getReadingCompletion(neglectedReading.id).pct}% progress. Elevating coverage here is today's priority.`;
          priority = 'High';
        }
      }
    }

    // Default Fallback: First In Progress or Not Started
    if (!targetLOS) {
      targetLOS = losList.find(l => l.status === 'In Progress') 
               || losList.find(l => l.status === 'Not Started') 
               || losList[0];
      triggerReason = `Syllabus Sequence: This is your next logical checkpoint in the curriculum roadmap.`;
      priority = 'Medium';
    }

    const reading = this.readingRepo.getById(targetLOS.readingId);
    if (!reading) return null;
    const subject = this.subjectRepo.getById(reading.subjectId);
    if (!subject) return null;

    // 2. Fetch Assets and Formulas from Repositories
    const requiredResources = this.resourceRepo.getByLOSId(targetLOS.id);
    const suggestedNotes = this.noteRepo.getByLOSId(targetLOS.id);
    const allFormulas = this.formulaRepo.getAll();
    const suggestedFormulae = allFormulas.filter(f => 
      f.linkedLOSId === targetLOS!.id || f.linkedReadingId === reading.id
    );

    // 3. Resolve Next Step (downstream target)
    let nextStep = 'Subject review and spaced recall tests.';
    const readingLOS = this.losRepo.getByReadingId(reading.id);
    const currentIndex = readingLOS.findIndex(l => l.id === targetLOS!.id);
    
    if (currentIndex >= 0 && currentIndex < readingLOS.length - 1) {
      const nextLOS = readingLOS[currentIndex + 1];
      nextStep = `Next syllabus checkpoint: LOS ${nextLOS.code} (${nextLOS.statement.substring(0, 45)}...)`;
    } else {
      const subjectReadings = this.readingRepo.getBySubjectId(subject.id);
      const nextReading = subjectReadings.find(r => r.number === reading.number + 1);
      if (nextReading) {
        nextStep = `Next syllabus checkpoint: Reading ${nextReading.number}: ${nextReading.title}`;
      } else {
        nextStep = `Syllabus Subject Master Review and Practice Mock Exams for ${subject.name}.`;
      }
    }

    return {
      losId: targetLOS.id,
      losCode: targetLOS.code,
      readingId: reading.id,
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      readingNumber: reading.number,
      readingTitle: reading.title,
      statement: targetLOS.statement,
      reason: triggerReason,
      priority,
      estimatedDurationHours: targetLOS.estimatedHours || 2,
      remainingReadingHours: this.analytics.getEstimatedRemainingHoursForReading(reading.id),
      requiredResources,
      suggestedFormulae,
      suggestedNotes,
      confidenceLevel: targetLOS.confidence || null,
      nextStep,
      status: targetLOS.status
    };
  }
}
