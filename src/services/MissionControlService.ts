import { StudyStack, StudyPhase, StudyStepType, CognitiveLoad, MissionProfile } from '../types';
import { DailyMission } from './MissionEngineService';
import { StackBuilderInput, StudyStackBuilder } from './StudyStackBuilder';

export class MissionControlService {
  private builder: StudyStackBuilder;

  constructor() {
    this.builder = new StudyStackBuilder();
  }

  buildMission(dailyMission: DailyMission, input: StackBuilderInput): StudyStack {
    return this.builder.build(dailyMission, input);
  }

  getActivePhase(stack: StudyStack): StudyPhase | null {
    return stack.activePhase;
  }

  getNextPhase(stack: StudyStack): StudyPhase | null {
    return stack.nextPhase;
  }

  calculateProgress(stack: StudyStack): { completed: number; total: number; percent: number } {
    return {
      completed: stack.completedPhases,
      total: stack.totalPhases,
      percent: stack.progressPercent,
    };
  }

  calculateForecast(stack: StudyStack, dailyTargetHours: number): string {
    const targetMinutes = dailyTargetHours * 60;
    const diff = stack.totalEstimatedMinutes - targetMinutes;
    if (Math.abs(diff) <= 10) return 'Fits your daily target';
    if (diff > 0) return `${diff} min above your normal pace`;
    return `${Math.abs(diff)} min under your daily target`;
  }

  calculateCognitiveLoad(stack: StudyStack): { level: CognitiveLoad; reason: string } {
    return {
      level: stack.cognitiveLoad,
      reason: stack.cognitiveLoadReason,
    };
  }

  calculateMissionProfile(stack: StudyStack): MissionProfile {
    return stack.missionProfile;
  }

  getPhaseById(stack: StudyStack, phaseId: string): StudyPhase | undefined {
    return stack.phases.find(p => p.id === phaseId);
  }

  getPhasesByType(stack: StudyStack, stepType: StudyStepType): StudyPhase[] {
    return stack.phases.filter(p => p.stepType === stepType);
  }
}
