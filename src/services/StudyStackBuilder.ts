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
    let phaseNumber = 1;

    for (const phaseDef of template.phases) {
      const resourcesForPhase = this.getResourcesForStepType(phaseDef.stepType, input, dailyMission);
      const hasResources = resourcesForPhase.length > 0;
      const isAlwaysPresent = phaseDef.stepType === 'Reflection';

      if (!hasResources && !isAlwaysPresent) {
        continue;
      }

      const allReadingLosIds = input.losList.filter(l => l.readingId === dailyMission.readingId).map(l => l.id);

      if (phaseDef.stepType === 'Lecture') {
        const phaseId = `phase-${dailyMission.readingId}-lecture`;
        const isLocked = previousPhaseId !== null && !this.isPreviousPhasesCompleted(phases, previousPhaseId);

        const allCompleted = resourcesForPhase.length > 0 && resourcesForPhase.every(lec => lec.progress?.completed ?? false);
        const anyActive = resourcesForPhase.some(lec => (lec.progress?.completed ?? false) || ((lec.progress?.minutesCompleted ?? 0) > 0));
        let status: PhaseStatus = 'READY';
        if (allCompleted) status = 'COMPLETED';
        else if (isLocked) status = 'BLOCKED';
        else if (anyActive) status = 'ACTIVE';

        const totalMinutes = resourcesForPhase.reduce((sum, lec) => sum + (lec.duration || 30), 0);
        const meta = this.getCognitiveMetadata('Lecture', dailyMission);

        const phase: StudyPhase = {
          id: phaseId,
          phaseNumber: phaseNumber++,
          phaseLabel: 'Lectures',
          title: `Video & SSCI Lectures (${resourcesForPhase.length} Lectures)`,
          description: `Watch SSCI video lectures covering all core concepts for ${dailyMission.readingTitle}`,
          estimatedMinutes: totalMinutes || 60,
          status,
          locked: isLocked,
          lockedReason: isLocked ? 'Complete previous phase first' : undefined,
          stepType: 'Lecture',
          resources: this.toResourceReferences(resourcesForPhase),
          dependsOn: previousPhaseId ? [previousPhaseId] : [],
          completed: allCompleted,
          completionEvidence: {
            lectureCompleted: allCompleted,
          },
          readingId: dailyMission.readingId,
          linkedLosIds: allReadingLosIds.length > 0 ? allReadingLosIds : [dailyMission.losId || dailyMission.losCode].filter(Boolean),
          resourceName: resourcesForPhase[0]?.title || "Video Lectures",
          ...meta
        };
        phases.push(phase);
        previousPhaseId = phase.id;
      } else {
        const phaseResources = isAlwaysPresent && !hasResources
          ? this.createDefaultReflectionResource(dailyMission)
          : resourcesForPhase;

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
        const anyActive = phaseResources.some(r => 
          (r.progress?.completed ?? false) || 
          ((r.progress?.minutesCompleted ?? 0) > 0 && !r.progress?.completed)
        ) && !allCompleted;

        const isLocked = previousPhaseId !== null && !this.isPreviousPhasesCompleted(phases, previousPhaseId);
        let totalMinutes = phaseResources.reduce((sum, r) => sum + (r.duration || 0), 0);
        if (totalMinutes === 0) {
          totalMinutes = this.adapter.getDefaultDuration(phaseDef.stepType);
        }

        let status: PhaseStatus = 'READY';
        if (allCompleted) status = 'COMPLETED';
        else if (isLocked) status = 'BLOCKED';
        else if (anyActive) status = 'ACTIVE';

        const meta = this.getCognitiveMetadata(phaseDef.stepType, dailyMission);
        const phase: StudyPhase = {
          id: `phase-${dailyMission.readingId}-${phaseDef.stepType.toLowerCase()}`,
          phaseNumber: phaseNumber++,
          phaseLabel: phaseDef.phaseLabel,
          title: this.buildPhaseTitle(phaseDef.stepType, phaseResources, dailyMission),
          description: phaseDef.description,
          estimatedMinutes: totalMinutes,
          status,
          locked: isLocked && !allCompleted,
          lockedReason: (isLocked && !allCompleted) ? 'Complete previous phase first' : undefined,
          stepType: phaseDef.stepType,
          resources: this.toResourceReferences(phaseResources),
          dependsOn: previousPhaseId ? [previousPhaseId] : [],
          completed: allCompleted,
          completionEvidence: this.buildCompletionEvidence(phaseDef.stepType, phaseResources, input),
          readingId: dailyMission.readingId,
          linkedLosIds: allReadingLosIds.length > 0 ? allReadingLosIds : [dailyMission.losId || dailyMission.losCode].filter(Boolean),
          resourceName: phaseResources[0]?.title || "",
          ...meta
        };

        phases.push(phase);
        previousPhaseId = phase.id;
      }
    }

    const pacedPhases = phases;

    const completedPhases = pacedPhases.filter(p => p.status === 'COMPLETED').length;
    const totalPhases = pacedPhases.length;
    const totalMinutes = pacedPhases.reduce((sum, p) => sum + p.estimatedMinutes, 0);
    const remainingMinutes = pacedPhases
      .filter(p => p.status !== 'COMPLETED' && p.status !== 'SKIPPED')
      .reduce((sum, p) => sum + p.estimatedMinutes, 0);
    const activePhase = pacedPhases.find(p => p.status === 'ACTIVE') || null;
    const nextPhase = pacedPhases.find(p => p.status === 'READY') || null;

    const cognitiveInfo = this.calculateCognitiveLoad(pacedPhases, input);
    const profile = this.calculateMissionProfile(pacedPhases);
    const forecast = this.calculateForecast(totalMinutes, input.dailyTargetHours);

    return {
      readingId: dailyMission.readingId,
      readingTitle: dailyMission.readingTitle,
      readingNumber: dailyMission.readingNumber,
      subjectCode: dailyMission.subjectCode,
      templateId: 'standard',
      phases: pacedPhases,
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

  private getCognitiveMetadata(
    stepType: StudyStepType,
    mission: DailyMission
  ): {
    whyThisNow: string;
    expectedOutcome: string;
    estimatedCognitiveEffort: 'Low' | 'Medium' | 'High';
    prerequisites: string[];
    links: string[];
    learningObjective: string;
    estimatedSuccessPercent: number;
    memoryStage: 'Encoding' | 'Consolidation' | 'Retrieval';
    bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze';
    confidenceRequirement: 'Low' | 'Medium' | 'High';
  } {
    const defaultMeta = {
      whyThisNow: "Introductory content delivery maps core concepts and visualizes analytical frameworks.",
      expectedOutcome: "Familiarity with syllabus models.",
      estimatedCognitiveEffort: "Medium" as const,
      prerequisites: [] as string[],
      links: [] as string[],
      learningObjective: `Introduce topic sector for ${mission.subjectCode}`,
      estimatedSuccessPercent: 85,
      memoryStage: "Encoding" as const,
      bloomLevel: "Understand" as const,
      confidenceRequirement: "Low" as const,
    };

    switch (stepType) {
      case 'Lecture':
        return {
          whyThisNow: "Introductory content delivery maps core concepts and visualizes analytical frameworks before reading.",
          expectedOutcome: "Conceptual familiarity with the syllabus structure and major definitions.",
          estimatedCognitiveEffort: "Medium",
          prerequisites: ["Prior standard overview of chapter summary"],
          links: ["SSCI Online Dashboard", "Class Excel Workbook"],
          learningObjective: `Introduce and decode concepts related to ${mission.losCode}`,
          estimatedSuccessPercent: 85,
          memoryStage: "Encoding",
          bloomLevel: "Remember",
          confidenceRequirement: "Low",
        };
      case 'Reading':
        return {
          whyThisNow: "Deep-dive textbook engagement structures academic definitions and details specific requirements.",
          expectedOutcome: "Internalization of detailed textual facts and vocabulary.",
          estimatedCognitiveEffort: "High",
          prerequisites: ["Complete Lecture watching phase"],
          links: ["Official CFA Curriculum PDF"],
          learningObjective: `Read and parse standard details for LOS ${mission.losCode}`,
          estimatedSuccessPercent: 75,
          memoryStage: "Encoding",
          bloomLevel: "Understand",
          confidenceRequirement: "Medium",
        };
      case 'Formula':
        return {
          whyThisNow: "Formula rehearsal moves algebraic equations and quantitative relations into working memory before problem solving.",
          expectedOutcome: "Fast derivation and correct identification of formula variables under pressure.",
          estimatedCognitiveEffort: "Medium",
          prerequisites: ["Review parent concept notes"],
          links: ["Formula Cheat Sheet", "Formula Rehearsal Modal"],
          learningObjective: `Memorize and recall mathematical expressions for ${mission.subjectCode}`,
          estimatedSuccessPercent: 90,
          memoryStage: "Consolidation",
          bloomLevel: "Remember",
          confidenceRequirement: "Medium",
        };
      case 'Notebook':
        return {
          whyThisNow: "AI commentary synthesis links disparate concepts and highlights common examiner pitfalls.",
          expectedOutcome: "Clarity on complex nuances and cross-linkages across readings.",
          estimatedCognitiveEffort: "Medium",
          prerequisites: ["Completed syllabus reading"],
          links: ["NotebookLM Workspace"],
          learningObjective: `Reconcile concepts and analyze syllabus links`,
          estimatedSuccessPercent: 80,
          memoryStage: "Consolidation",
          bloomLevel: "Analyze",
          confidenceRequirement: "High",
        };
      case 'Questions':
        return {
          whyThisNow: "Active recall test-drills train memory retrieval paths and teach practical exam timing.",
          expectedOutcome: "Ability to successfully solve similar exam-style item sets.",
          estimatedCognitiveEffort: "High",
          prerequisites: ["Formula rehearsal and reading completed"],
          links: ["Practice Questions Bank"],
          learningObjective: `Apply formulas and logic to clear standard questions`,
          estimatedSuccessPercent: 70,
          memoryStage: "Retrieval",
          bloomLevel: "Apply",
          confidenceRequirement: "High",
        };
      case 'Reflection':
        return {
          whyThisNow: "Self-explanation consolidates long-term memory structures and diagnoses lingering weaknesses.",
          expectedOutcome: "Identified review tasks and target focus areas for next study cycle.",
          estimatedCognitiveEffort: "Low",
          prerequisites: ["Practice drills completed"],
          links: ["Mental focus reflection log"],
          learningObjective: `Evaluate personal progress and capture review priorities`,
          estimatedSuccessPercent: 95,
          memoryStage: "Retrieval",
          bloomLevel: "Analyze",
          confidenceRequirement: "Medium",
        };
      default:
        return defaultMeta;
    }
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
      const totalDuration = resources.reduce((s, r) => s + r.duration, 0);
      const totalCompleted = resources.reduce((s, r) => s + (r.progress?.completed ? r.duration : r.progress?.minutesCompleted || 0), 0);
      evidence.readingProgress = totalDuration > 0 ? Math.min(100, Math.round((totalCompleted / totalDuration) * 100)) : 0;
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
