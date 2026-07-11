import { StudyStack, StudyPhase, CompletionEvidence, PhaseStatus, CognitiveLoad, MissionProfile, MissionTemplateId, MissionResourceReference, StudyStepType } from '../types';
import { LearningResourceAdapter } from '../resources/adapters/LearningResourceAdapter';
import { LearningResource } from '../resources/types';
import { DailyMission } from './MissionEngineService';
import { Formula, StudyNote, LearningOutcomeStatement, PlannerReadingProgress } from '../types';
import { getTemplate } from './MissionTemplate';

export interface StackBuilderInput {
  learningResources: LearningResource[];
  formulas: Formula[];
  notes: StudyNote[];
  losList: LearningOutcomeStatement[];
  plannerProgress: PlannerReadingProgress[];
  targetEOCQ: number;
  questionCount: number;
  dailyTargetHours: number;
}

let phaseCounter = 0;
function generatePhaseId(): string {
  return `phase-${Date.now()}-${++phaseCounter}`;
}

export class StudyStackBuilder {
  private adapter = new LearningResourceAdapter();

  build(dailyMission: DailyMission, input: StackBuilderInput): StudyStack {
    const template = getTemplate('standard');
    const phases: StudyPhase[] = [];
    const completedResources = input.learningResources.filter(r => r.progress.completed);
    const activeResources = input.learningResources.filter(r => !r.progress.completed && r.progress.minutesCompleted > 0);

    let previousPhaseId: string | null = null;

    for (const phaseDef of template.phases) {
      const resourcesForPhase = this.getResourcesForStepType(phaseDef.stepType, input, dailyMission);
      const hasResources = resourcesForPhase.length > 0;
      const isAlwaysPresent = phaseDef.stepType === 'Reflection';

      if (!hasResources && !isAlwaysPresent) {
        previousPhaseId = null;
        continue;
      }

      const phaseResources = isAlwaysPresent && !hasResources
        ? this.createDefaultReflectionResource(dailyMission)
        : resourcesForPhase;

      // Dynamically calculate progress of resources based on database state
      phaseResources.forEach(r => {
        if (phaseDef.stepType === 'Reading') {
          const readingLOS = input.losList.filter(l => l.readingId === dailyMission.readingId);
          const completedLOS = readingLOS.filter(l => l.status === 'Completed').length;
          const totalLOS = readingLOS.length;
          const pct = totalLOS > 0 ? completedLOS / totalLOS : 0;
          r.progress = {
            completed: pct >= 1.0,
            minutesCompleted: Math.round(pct * r.duration),
            lastOpenedAt: r.progress?.lastOpenedAt || null,
            resumeState: r.progress?.resumeState || null,
          };
        } else if (phaseDef.stepType === 'Formula') {
          const f = input.formulas.find(form => form.id === r.id);
          r.progress = {
            completed: f ? f.isMemorized : false,
            minutesCompleted: f && f.isMemorized ? r.duration : 0,
            lastOpenedAt: r.progress?.lastOpenedAt || null,
            resumeState: r.progress?.resumeState || null,
          };
        } else if (phaseDef.stepType === 'Questions') {
          const prog = input.plannerProgress.find(p => p.readingId === dailyMission.readingId);
          const completedEOCQ = prog?.completedEOCQ || 0;
          const targetEOCQ = input.targetEOCQ || 20;
          const pct = Math.min(1.0, completedEOCQ / targetEOCQ);
          r.progress = {
            completed: completedEOCQ >= targetEOCQ,
            minutesCompleted: Math.round(pct * r.duration),
            lastOpenedAt: r.progress?.lastOpenedAt || null,
            resumeState: r.progress?.resumeState || null,
          };
        } else if (phaseDef.stepType === 'Notebook') {
          const notesCount = input.notes.filter(n => n.linkedReadingId === dailyMission.readingId).length;
          r.progress = {
            completed: notesCount > 0,
            minutesCompleted: notesCount > 0 ? r.duration : 0,
            lastOpenedAt: r.progress?.lastOpenedAt || null,
            resumeState: r.progress?.resumeState || null,
          };
        }
      });

      const allCompleted = phaseResources.every(r => r.progress?.completed ?? false);
      const anyActive = phaseResources.some(r => !r.progress?.completed && (r.progress?.minutesCompleted ?? 0) > 0);
      const anyStarted = phaseResources.some(r => (r.progress?.minutesCompleted ?? 0) > 0);

      const isLocked = previousPhaseId !== null && !this.isPreviousPhasesCompleted(phases, previousPhaseId);
      let totalMinutes = phaseResources.reduce((sum, r) => sum + (r.duration || 0), 0);
      if (totalMinutes === 0) {
        totalMinutes = this.adapter.getDefaultDuration(phaseDef.stepType);
      }

      let status: PhaseStatus = 'READY';
      if (allCompleted) status = 'COMPLETED';
      else if (isLocked) status = 'BLOCKED';
      else if (anyActive) status = 'ACTIVE';

      const phase: StudyPhase = {
        id: generatePhaseId(),
        phaseNumber: phaseDef.phaseNumber,
        phaseLabel: phaseDef.phaseLabel,
        title: this.buildPhaseTitle(phaseDef.stepType, phaseResources, dailyMission),
        description: phaseDef.description,
        estimatedMinutes: totalMinutes,
        status,
        locked: isLocked,
        lockedReason: isLocked ? 'Complete previous phase first' : undefined,
        stepType: phaseDef.stepType,
        resources: this.toResourceReferences(phaseResources),
        dependsOn: previousPhaseId ? [previousPhaseId] : [],
        completed: allCompleted,
        completionEvidence: this.buildCompletionEvidence(phaseDef.stepType, phaseResources, input),
      };

      phases.push(phase);
      previousPhaseId = phase.id;
    }

    const completedPhases = phases.filter(p => p.status === 'COMPLETED').length;
    const totalPhases = phases.length;
    const totalMinutes = phases.reduce((sum, p) => sum + p.estimatedMinutes, 0);
    const remainingMinutes = phases
      .filter(p => p.status !== 'COMPLETED' && p.status !== 'SKIPPED')
      .reduce((sum, p) => sum + p.estimatedMinutes, 0);
    const activePhase = phases.find(p => p.status === 'ACTIVE') || null;
    const nextPhase = phases.find(p => p.status === 'READY') || null;

    const cognitiveInfo = this.calculateCognitiveLoad(phases, input);
    const profile = this.calculateMissionProfile(phases);
    const forecast = this.calculateForecast(totalMinutes, input.dailyTargetHours);

    return {
      readingId: dailyMission.readingId,
      readingTitle: dailyMission.readingTitle,
      readingNumber: dailyMission.readingNumber,
      subjectCode: dailyMission.subjectCode,
      templateId: 'standard',
      phases,
      activePhase,
      nextPhase,
      totalEstimatedMinutes: totalMinutes,
      remainingMinutes,
      completedPhases,
      totalPhases,
      progressPercent: totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0,
      cognitiveLoad: cognitiveInfo.level,
      cognitiveLoadReason: cognitiveInfo.reason,
      missionProfile: profile,
      completionForecast: forecast,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  private getResourcesForStepType(stepType: StudyStepType, input: StackBuilderInput, mission: DailyMission): LearningResource[] {
    if (stepType === 'Lecture') {
      return input.learningResources.filter(r => r.resourceType === 'Lecture' && r.readingId === mission.readingId);
    }
    
    if (stepType === 'Reading') {
      return [{
        id: `reading-pdf-${mission.readingId}`,
        readingId: mission.readingId,
        provider: 'CFA Institute',
        resourceType: 'PDF',
        title: `${mission.readingTitle} Curriculum Chapter`,
        description: `Read the official CFA curriculum chapter for ${mission.readingTitle}`,
        duration: 45,
        progress: {
          minutesCompleted: 0,
          completed: false,
          lastOpenedAt: null,
          resumeState: null,
        },
        lectureCode: '',
        subject: mission.subjectCode,
        reading: mission.readingId,
        subReadingTag: '',
        runtimeMinutes: 45,
        resourceLinks: []
      }] as any[];
    }

    if (stepType === 'Formula') {
      const matchingFormulas = input.formulas.filter(f => f.linkedReadingId === mission.readingId);
      return matchingFormulas.map(f => ({
        id: f.id,
        readingId: mission.readingId,
        provider: 'SSCI',
        resourceType: 'Formula',
        title: `${f.name} Equation`,
        description: f.description || '',
        duration: 10,
        progress: {
          minutesCompleted: f.isMemorized ? 10 : 0,
          completed: f.isMemorized,
          lastOpenedAt: null,
          resumeState: null,
        },
        lectureCode: '',
        subject: mission.subjectCode,
        reading: mission.readingId,
        subReadingTag: '',
        runtimeMinutes: 10,
        resourceLinks: []
      })) as any[];
    }

    if (stepType === 'Notebook') {
      return [{
        id: `notebook-${mission.readingId}`,
        readingId: mission.readingId,
        provider: 'NotebookLM',
        resourceType: 'Notebook',
        title: `${mission.readingTitle} AI Study Guide`,
        description: 'NotebookLM generated synthesis',
        duration: 15,
        progress: {
          minutesCompleted: 0,
          completed: false,
          lastOpenedAt: null,
          resumeState: null,
        },
        lectureCode: '',
        subject: mission.subjectCode,
        reading: mission.readingId,
        subReadingTag: '',
        runtimeMinutes: 15,
        resourceLinks: []
      }] as any[];
    }

    if (stepType === 'Questions') {
      return [{
        id: `qbank-${mission.readingId}`,
        readingId: mission.readingId,
        provider: 'Question Bank',
        resourceType: 'Questions',
        title: `${mission.readingTitle} Q-Bank Drill`,
        description: 'Practice questions for active recall',
        duration: 30,
        progress: {
          minutesCompleted: 0,
          completed: false,
          lastOpenedAt: null,
          resumeState: null,
        },
        lectureCode: '',
        subject: mission.subjectCode,
        reading: mission.readingId,
        subReadingTag: '',
        runtimeMinutes: 30,
        resourceLinks: []
      }] as any[];
    }

    return [];
  }

  private createDefaultReflectionResource(mission: DailyMission): LearningResource[] {
    return [{
      id: `reflection-${mission.readingId}`,
      readingId: mission.readingId,
      provider: 'Personal',
      resourceType: 'Reflection',
      title: 'Daily Study Reflection',
      description: 'Reflect on key takeaways and confusion areas',
      duration: 10,
      progress: {
        minutesCompleted: 0,
        completed: false,
        lastOpenedAt: null,
        resumeState: null,
      },
      lectureCode: '',
      subject: mission.subjectCode,
      reading: mission.readingId,
      subReadingTag: '',
      runtimeMinutes: 10,
      resourceLinks: []
    }] as any[];
  }

  private isPreviousPhasesCompleted(phases: StudyPhase[], previousPhaseId: string): boolean {
    const prev = phases.find(p => p.id === previousPhaseId);
    if (!prev) return true;
    if (prev.status === 'SKIPPED') return true;
    return prev.status === 'COMPLETED';
  }

  private buildPhaseTitle(stepType: StudyStepType, resources: LearningResource[], mission: DailyMission): string {
    const labelMap: Record<StudyStepType, string> = {
      Lecture: 'Watch Lecture',
      Reading: `Read LOS ${mission.losCode}`,
      Formula: 'Formula Review',
      Notebook: 'NotebookLM Review',
      Questions: 'Practice Questions',
      Reflection: 'Learning Reflection',
    };
    const base = labelMap[stepType] || stepType;
    if (resources.length > 0 && resources[0].title) {
      return `${base}: ${resources[0].title}`;
    }
    if (stepType === 'Reading' && mission.readingTitle) {
      return `Read: ${mission.readingTitle}`;
    }
    if (stepType === 'Questions') {
      const qCount = resources.length > 0 ? resources.length : 25;
      return `Practice Questions (${qCount})`;
    }
    return base;
  }

  private toResourceReferences(resources: LearningResource[]): MissionResourceReference[] {
    return resources.map(r => ({
      provider: r.provider,
      resourceType: r.resourceType,
      resourceId: r.id,
      title: r.title,
      launchAction: r.launchUrl || '',
      resumeAction: r.progress?.resumeState ? r.launchUrl : undefined,
      metadata: { duration: r.duration, progress: r.progress },
    }));
  }

  private buildCompletionEvidence(stepType: StudyStepType, resources: LearningResource[], input: StackBuilderInput): CompletionEvidence {
    const evidence: CompletionEvidence = {};
    if (stepType === 'Lecture') {
      evidence.lectureCompleted = resources.every(r => r.progress?.completed);
    }
    if (stepType === 'Reading') {
      const totalDuration = resources.reduce((s, r) => s + r.duration, 0);
      const totalCompleted = resources.reduce((s, r) => s + r.progress.minutesCompleted, 0);
      evidence.readingProgress = totalDuration > 0 ? Math.round((totalCompleted / totalDuration) * 100) : 0;
    }
    if (stepType === 'Questions') {
      evidence.questionsSolved = resources.filter(r => r.progress?.completed).length;
      evidence.questionsTotal = resources.length;
    }
    if (stepType === 'Reflection') {
      evidence.reflectionSubmitted = false;
    }
    return evidence;
  }

  private calculateCognitiveLoad(phases: StudyPhase[], input: StackBuilderInput): { level: CognitiveLoad; reason: string } {
    let factors: string[] = [];
    let score = 0;

    const formulaCount = input.formulas.length;
    const questionCount = input.questionCount;
    const lectureMinutes = phases
      .filter(p => p.stepType === 'Lecture')
      .reduce((s, p) => s + p.estimatedMinutes, 0);
    const totalMinutes = phases.reduce((s, p) => s + p.estimatedMinutes, 0);

    if (formulaCount > 5) { score += 3; factors.push(`${formulaCount} formulas`); }
    else if (formulaCount > 2) { score += 2; factors.push(`${formulaCount} formulas`); }
    else if (formulaCount > 0) { score += 1; }

    if (questionCount > 30) { score += 3; factors.push(`${questionCount} questions`); }
    else if (questionCount > 15) { score += 2; factors.push(`${questionCount} questions`); }
    else if (questionCount > 0) { score += 1; }

    if (lectureMinutes > 60) { score += 2; factors.push(`${lectureMinutes} min lecture`); }
    else if (lectureMinutes > 30) { score += 1; }

    if (totalMinutes > 180) { score += 1; factors.push(`${totalMinutes} min total`); }

    let level: CognitiveLoad = 'LOW';
    if (score >= 5) level = 'HIGH';
    else if (score >= 2) level = 'MEDIUM';

    return {
      level,
      reason: factors.length > 0
        ? `Mostly because ${factors.join(' • ')}`
        : 'Standard study load',
    };
  }

  private calculateMissionProfile(phases: StudyPhase[]): MissionProfile {
    const totalMinutes = phases.reduce((s, p) => s + p.estimatedMinutes, 0);
    if (totalMinutes === 0) return 'Balanced';

    const formulaMinutes = phases.filter(p => p.stepType === 'Formula').reduce((s, p) => s + p.estimatedMinutes, 0);
    const readingMinutes = phases.filter(p => p.stepType === 'Reading').reduce((s, p) => s + p.estimatedMinutes, 0);
    const lectureMinutes = phases.filter(p => p.stepType === 'Lecture').reduce((s, p) => s + p.estimatedMinutes, 0);
    const questionMinutes = phases.filter(p => p.stepType === 'Questions').reduce((s, p) => s + p.estimatedMinutes, 0);

    if (phases.length <= 2) return 'Recovery Day';
    if (formulaMinutes / totalMinutes > 0.4) return 'Calculation Intensive';
    if ((readingMinutes + lectureMinutes) / totalMinutes > 0.5) return 'Reading Intensive';
    if (questionMinutes / totalMinutes > 0.4) return 'Revision Day';
    return 'Balanced';
  }

  private calculateForecast(totalMinutes: number, dailyTargetHours: number): string {
    const targetMinutes = dailyTargetHours * 60;
    const diff = totalMinutes - targetMinutes;
    if (Math.abs(diff) <= 10) return 'Fits your daily target';
    if (diff > 0) return `${diff} min above your normal pace`;
    return `${Math.abs(diff)} min under your daily target`;
  }
}
