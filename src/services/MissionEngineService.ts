/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LearningOutcomeStatement, Reading, Subject, Formula, StudyNote, Asset, TimelineBlock } from '../types';

export interface MissionExplanation {
  selectedReading: Reading;
  selectedLOS: LearningOutcomeStatement;
  whySelected: string;
  whyNow: string;
  priorityScore: number;
  estimatedDuration: number; // in minutes
  expectedOutcome: string;
  blockingFactors: string[];
  selectionMethod: 'Manual LOS' | 'Manual Reading' | 'Manual Chapter' | 'Manual Subject' | 'Resume Previous Session' | 'Weak Topic' | 'AI Recommendation' | 'Spaced Repetition' | 'Deadline Optimization';
}

export interface NextMissionCandidate {
  reading: Reading;
  losCount: number;
  reason: string;
  estimatedDurationMinutes: number;
  priority: 'Low' | 'Medium' | 'High';
  selectionMethod: string;
}

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
  explanation?: MissionExplanation;
}

export class MissionEngineService {
  /**
   * Evaluates syllabus states and flags to yield today's active studying priority checklist.
   */
  public calculateMission(
    activeSessionLOSId: string | undefined,
    selectedLOSId: string | null,
    selectedReadingId: string | null,
    selectedChapterId: string | null,
    selectedSubjectId: string | null,
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

      const recoveryMission: DailyMission = {
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

      recoveryMission.explanation = {
        selectedReading: ethicsReading,
        selectedLOS: ethicsLOS,
        whySelected: 'System triggered burnout protection due to high duration or late study.',
        whyNow: 'Ethics acts as a lower cognitive load pathway to rest math centres.',
        priorityScore: 90,
        estimatedDuration: 30,
        expectedOutcome: 'Reduced cognitive fatigue while preserving passive ethics coverage.',
        blockingFactors: [],
        selectionMethod: 'AI Recommendation'
      };

      return recoveryMission;
    }

    // Determine target focus LOS
    let targetLOS: LearningOutcomeStatement | undefined;
    let method: MissionExplanation['selectionMethod'] = 'AI Recommendation';

    // Priority 1: Active session LOS (already in progress)
    if (activeSessionLOSId) {
      targetLOS = losList.find(l => l.id === activeSessionLOSId);
      method = 'Resume Previous Session';
    }

    // Priority 2: User-selected LOS
    if (!targetLOS && selectedLOSId) {
      targetLOS = losList.find(l => l.id === selectedLOSId);
      method = 'Manual LOS';
    }

    // Priority 3: User-selected Reading (find first incomplete LOS, or first LOS if all completed)
    if (!targetLOS && selectedReadingId) {
      targetLOS = losList.find(l => l.readingId === selectedReadingId && l.status !== 'Completed')
               || losList.find(l => l.readingId === selectedReadingId);
      method = 'Manual Reading';
    }

    // Priority 4: User-selected Chapter (find first incomplete LOS, or first LOS if all completed)
    if (!targetLOS && selectedChapterId) {
      const chapterReadings = readings.filter(r => r.chapterId === selectedChapterId).map(r => r.id);
      targetLOS = losList.find(l => chapterReadings.includes(l.readingId) && l.status !== 'Completed')
               || losList.find(l => chapterReadings.includes(l.readingId));
      method = 'Manual Chapter';
    }

    // Priority 5: User-selected Subject (find first incomplete LOS, or first LOS if all completed)
    if (!targetLOS && selectedSubjectId) {
      const subjectReadings = readings.filter(r => r.subjectId === selectedSubjectId).map(r => r.id);
      targetLOS = losList.find(l => subjectReadings.includes(l.readingId) && l.status !== 'Completed')
               || losList.find(l => subjectReadings.includes(l.readingId));
      method = 'Manual Subject';
    }

    // Priority 6: Coach planner active block — subdivide into the exact reading for today
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
        method = 'Deadline Optimization';
      }
    }

    // Priority 7: First incomplete or low-confidence LOS across all subjects
    if (!targetLOS) {
      targetLOS = losList.find(l => l.status !== 'Completed' && l.confidence !== null && l.confidence < 3);
      if (targetLOS) {
        method = 'Weak Topic';
      } else {
        targetLOS = losList.find(l => l.status !== 'Completed') || losList[0];
        method = 'AI Recommendation';
      }
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
    if (activeBlock && method === 'Deadline Optimization') {
      reason = `Coach Planner Schedule: You are in a "${subject.name}" block (${activeBlock.startDate} to ${activeBlock.endDate}). Today's reading is "${reading.title}" — this is the first incomplete LOS within it.`;
    } else if (targetLOS.confidence && targetLOS.confidence < 3) {
      reason = `Critical recall vulnerability: Rated at ${targetLOS.confidence}/5 confidence. Reviewing this node will shore up core syllabus weaknesses.`;
    } else if (subject.code === 'AA' || subject.code === 'PWM') {
      reason = `High-Weight Core Topic: Portfolio Management & Asset Allocation carry major weights in the CFA Level III exam.`;
    }

    const priorityScore = Math.round((5 - (targetLOS.confidence || 3.5)) * 20);

    const mission: DailyMission = {
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

    let whySelectedText = `Reading ${reading.number} ("${reading.title}") holds a high exam weight of ${subject.code === 'PWM' ? '35%' : '15%'} and is the next logical step in your scheduler sequence.`;
    let whyNowText = `Active recall gap identified: LOS ${targetLOS.code} remains incomplete with confidence level: ${targetLOS.confidence || 'Unrated'}. Prioritizing to build cognitive retention.`;
    let expectedOutcomeText = `Successfully answer EOCQ item sets on "${targetLOS.statement.substring(0, 40)}..." with confidence >= 4/5.`;

    if (subject.id === 'sub-derivatives-risk-mgmt') {
      whySelectedText = `MEMORANDUM: Rebalancing tactical overlay via derivatives. Initiating Option Strategies (LOS 16) to establish asymmetric payoff profiles, delta/gamma hedging boundaries, and volatility trading structures.`;
      whyNowText = `TACTICAL OVERLAY UNLOCKED: Option volatility overlays and tail-risk hedging toolkit. Accessing active recall node for delta boundaries, managing gamma risk, and minimizing premium decay.`;
      expectedOutcomeText = `Demonstrate proficiency in structuring asymmetric collars and delta-neutral options strategies, maintaining tracking error within 15 bps of target overlay boundaries.`;
    } else if (subject.id === 'sub-asset-allocation') {
      whySelectedText = `MEMORANDUM: Capital Market Expectations (CME) and Mean-Variance Optimization (MVO). Formulating institutional forecasting parameters to drive strategic asset allocation (SAA) weights.`;
      whyNowText = `TACTICAL OVERLAY UNLOCKED: Black-Litterman risk-budgeting model and MVO constraints. Accessing active recall node to refine Grinold-Kroner economic projections.`;
      expectedOutcomeText = `Establish optimized portfolio asset weights incorporating covariance matrices, ensuring tracking error and tax constraints are within mandated Investment Policy Statement (IPS) limits.`;
    } else if (subject.id === 'sub-portfolio-construction') {
      whySelectedText = `MEMORANDUM: Institutional Asset Management & Core Equity/Fixed Income Benchmarks. Transitioning strategic asset weights into active and passive replication models.`;
      whyNowText = `TACTICAL OVERLAY UNLOCKED: Passive replication optimization and benchmark selection frameworks. Accessing active recall node to evaluate tracking error budgets.`;
      expectedOutcomeText = `Delineate passive replication approaches (stratified sampling vs. optimization) while keeping tracking error constrained to standard institutional limits.`;
    } else if (subject.id === 'sub-portfolio-mgmt-pathway') {
      whySelectedText = `MEMORANDUM: Advanced Portfolio Management Pathway. Formulating active equity risk budgets, yield curve strategies, and structured credit derivatives (CDS) overlays.`;
      whyNowText = `TACTICAL OVERLAY UNLOCKED: Active Share, barbell/bullet yield curve shifts, and CDS credit risk pricing. Accessing active recall node to optimize active risk boundaries.`;
      expectedOutcomeText = `Construct immunized fixed-income portfolios (LDI/cash flow matching) and active equity structures, maintaining active risk within specified risk-budgeting limits.`;
    } else if (subject.id === 'sub-performance-measurement') {
      whySelectedText = `MEMORANDUM: Performance Attribution & Manager Selection. Appraising active manager returns, Brinson-Fachler attribution models, and GIPS compliance frameworks.`;
      whyNowText = `TACTICAL OVERLAY UNLOCKED: Brinson-Fachler performance attribution and Type I/II manager selection errors. Accessing active recall node to verify GIPS compliance standards.`;
      expectedOutcomeText = `Accurately attribute excess return (allocation vs. selection effects) and conduct institutional due diligence on active asset managers.`;
    } else if (subject.id === 'sub-ethical-professional') {
      whySelectedText = `MEMORANDUM: Code of Ethics and Professional Standards (Standards I-VII) & Asset Manager Code of Conduct. Aligning fiduciary responsibilities with institutional best practices.`;
      whyNowText = `TACTICAL OVERLAY UNLOCKED: Granular CFA Level III ethical standards and fiduciary duty frameworks. Accessing active recall node to lock down GIPS compliance compliance overlays.`;
      expectedOutcomeText = `Demonstrate compliance with the CFA Code of Ethics and Standards of Professional Conduct across institutional asset management scenarios.`;
    }

    mission.explanation = {
      selectedReading: reading,
      selectedLOS: targetLOS,
      whySelected: whySelectedText,
      whyNow: whyNowText,
      priorityScore,
      estimatedDuration: Math.round((targetLOS.estimatedHours || 1.5) * 60),
      expectedOutcome: expectedOutcomeText,
      blockingFactors: [], // Decoupled Ethical Standards prerequisite connection for all prior subjects
      selectionMethod: method
    };

    return mission;
  }

  public getNextMission(
    currentReadingId: string,
    readings: Reading[],
    losList: LearningOutcomeStatement[]
  ): NextMissionCandidate | null {
    if (readings.length === 0) return null;

    const currentIdx = readings.findIndex(r => r.id === currentReadingId);
    let nextIdx = currentIdx + 1;
    if (nextIdx >= readings.length) {
      nextIdx = 0; // wrap around
    }

    const nextReading = readings[nextIdx];
    const readingLOS = losList.filter(l => l.readingId === nextReading.id);
    const incompleteCount = readingLOS.filter(l => l.status !== 'Completed').length;

    let reason = `Syllabus Sequence: Progressing to the next logical reading segment in your study path.`;
    let priority: 'Low' | 'Medium' | 'High' = 'Medium';
    
    const lowConfCount = readingLOS.filter(l => l.confidence && l.confidence < 3).length;
    if (lowConfCount > 0) {
      reason = `Shoring Up Recall Vulnerability: Reading "${nextReading.title}" contains ${lowConfCount} low-confidence nodes.`;
      priority = 'High';
    } else if (incompleteCount > 0) {
      reason = `Incomplete Syllabus Material: Prioritizing unfinished learning outcome statements in Reading ${nextReading.number}.`;
      priority = 'Medium';
    }

    return {
      reading: nextReading,
      losCount: readingLOS.length,
      reason,
      estimatedDurationMinutes: nextReading.estimatedHours ? Math.round(nextReading.estimatedHours * 60) : 90,
      priority,
      selectionMethod: 'Deadline Optimization'
    };
  }
}

export const missionEngineService = new MissionEngineService();
