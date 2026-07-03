/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LearningOutcomeStatement, Reading, Subject, Formula, StudyNote, Asset, TimelineBlock } from '../types';

export interface DailyMission {
  subjectId: string;
  subjectCode: string;
  readingId: string;
  readingNumber: number;
  readingTitle: string;
  losId: string;
  losCode: string;
  statement: string;
  reason: string;
  estimatedDurationHours: number;
  remainingReadingHours: number;
  suggestedNotes: StudyNote[];
  suggestedFormulae: Formula[];
  requiredResources: Asset[];
  confidenceLevel: number | null;
  nextStep: string;
  isRecoveryMission: boolean;
}

export class MissionEngineService {
  /**
   * Evaluates syllabus states and flags to yield today's active studying priority checklist.
   */
  public calculateMission(
    activeSessionLOSId: string | undefined,
    selectedLOSId: string | null,
    activeBlock: TimelineBlock | null,
    losList: LearningOutcomeStatement[],
    readings: Reading[],
    subjects: Subject[],
    formulas: Formula[],
    notes: StudyNote[],
    resources: Asset[],
    burnoutFlag: boolean
  ): DailyMission | null {
    if (losList.length === 0) return null;

    // Handle Burnout Recovery Mission
    if (burnoutFlag) {
      const ethicsSubject = subjects.find(s => s.code.toLowerCase() === 'ethics') || subjects[0];
      const ethicsReading = readings.find(r => r.subjectId === ethicsSubject.id) || readings[0];
      const ethicsLOS = losList.find(l => l.readingId === ethicsReading.id) || losList[0];

      return {
        subjectId: ethicsSubject.id,
        subjectCode: ethicsSubject.code,
        readingId: ethicsReading.id,
        readingNumber: ethicsReading.number,
        readingTitle: 'Active Recovery & Focus Rest',
        losId: ethicsLOS.id,
        losCode: ethicsLOS.code,
        statement: 'Log off intensive math sessions. Perform a light, non-stressful review of standard Ethics Codes.',
        reason: 'SYSTEM WARNING: High study duration or late-night patterns detected. Active recovery is prioritized to prevent cognitive fatigue and burnout.',
        estimatedDurationHours: 0.5,
        remainingReadingHours: 0.5,
        suggestedNotes: notes.filter(n => n.linkedSubjectId === ethicsSubject.id).slice(0, 1),
        suggestedFormulae: [],
        requiredResources: [],
        confidenceLevel: ethicsLOS.confidence || null,
        nextStep: 'Take a 30-minute off-screen rest period, then complete a light ethics note review.',
        isRecoveryMission: true
      };
    }

    // Determine target focus LOS
    let targetLOS: LearningOutcomeStatement | undefined;

    // Priority 1: Active session LOS (already in progress)
    if (activeSessionLOSId) {
      targetLOS = losList.find(l => l.id === activeSessionLOSId);
    }

    // Priority 2: User-selected LOS
    if (!targetLOS && selectedLOSId) {
      targetLOS = losList.find(l => l.id === selectedLOSId);
    }

    // Priority 3: Coach planner active block — subdivide into the exact reading for today
    if (!targetLOS && activeBlock) {
      const subjectReadings = readings
        .filter(r => r.subjectId === activeBlock.subjectId)
        .sort((a, b) => a.number - b.number);

      if (subjectReadings.length > 0) {
        let activeReading: Reading;

        if (subjectReadings.length === 1) {
          activeReading = subjectReadings[0];
        } else {
          // Subdivide block date range proportionally across readings
          const blockStartMs = new Date(activeBlock.startDate).getTime();
          const blockEndMs = new Date(activeBlock.endDate).getTime();
          const todayMs = Date.now();
          const msPerReading = (blockEndMs - blockStartMs) / subjectReadings.length;

          const matchedReading = subjectReadings.find((_, idx) => {
            const rStart = blockStartMs + idx * msPerReading;
            const rEnd = idx === subjectReadings.length - 1
              ? blockEndMs
              : blockStartMs + (idx + 1) * msPerReading - 1;
            return todayMs >= rStart && todayMs <= rEnd;
          });

          activeReading = matchedReading || subjectReadings[0];
        }

        targetLOS = losList.find(
          l => l.readingId === activeReading.id && l.status !== 'Completed'
        );
      }
      // If all LOS in the block's subject are completed, fall through
    }

    // Priority 4: First incomplete or low-confidence LOS across all subjects
    if (!targetLOS) {
      targetLOS = losList.find(l => l.status !== 'Completed') || losList[0];
    }

    if (!targetLOS) return null;

    const reading = readings.find(r => r.id === targetLOS!.readingId) || readings[0];
    const subject = subjects.find(s => s.id === reading.subjectId) || subjects[0];

    // Find suggested resources
    const suggestedNotes = notes.filter(n => n.linkedLOSId === targetLOS!.id || n.linkedReadingId === reading.id);
    const suggestedFormulae = formulas.filter(f => f.linkedLOSId === targetLOS!.id || f.linkedReadingId === reading.id);
    const requiredResources = resources.filter(r => r.linkedLOSId === targetLOS!.id || r.linkedReadingId === reading.id);

    // Estimate remaining reading hours (each incomplete LOS defaults to 1.2 hours)
    const incompleteReadingLOS = losList.filter(l => l.readingId === reading.id && l.status !== 'Completed');
    const remainingReadingHours = Number((incompleteReadingLOS.length * 1.2).toFixed(1));

    let reason = 'This is the primary incomplete task on your syllabus study path.';

    // Coach planner attribution
    if (activeBlock && !activeSessionLOSId && !selectedLOSId) {
      reason = `Coach Planner Schedule: You are in a "${subject.name}" block (${activeBlock.startDate} to ${activeBlock.endDate}). Today's reading is "${reading.title}" — this is the first incomplete LOS within it.`;
    } else if (targetLOS.confidence && targetLOS.confidence < 3) {
      reason = `Critical recall vulnerability: Rated at ${targetLOS.confidence}/5 confidence. Reviewing this node will shore up core syllabus weaknesses.`;
    } else if (subject.code === 'AA' || subject.code === 'PWM') {
      reason = `High-Weight Core Topic: Portfolio Management & Asset Allocation carry major weights in the CFA Level III exam.`;
    }

    return {
      subjectId: subject.id,
      subjectCode: subject.code,
      readingId: reading.id,
      readingNumber: reading.number,
      readingTitle: reading.title,
      losId: targetLOS.id,
      losCode: targetLOS.code,
      statement: targetLOS.statement,
      reason,
      estimatedDurationHours: targetLOS.estimatedHours || 1.5,
      remainingReadingHours,
      suggestedNotes,
      suggestedFormulae,
      requiredResources,
      confidenceLevel: targetLOS.confidence || null,
      nextStep: `Draft a core study note matching the LOS requirement, and review the ${suggestedFormulae.length} linked math formulas.`,
      isRecoveryMission: false
    };
  }
}

export const missionEngineService = new MissionEngineService();
