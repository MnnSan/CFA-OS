import { StudyStack, StudyPhase, CompletionEvidence, PhaseStatus } from '../types';
import { eventBus } from './EventBus';

const STORAGE_KEY = 'cfa_mission_execution_state';

export interface PersistedPhaseState {
  status: PhaseStatus;
  completed: boolean;
  startedAt: string | null;
  completedAt: string | null;
  elapsedMinutes: number;
  manualOverride?: 'COMPLETED' | 'INCOMPLETE' | null;
  progress?: number;
  completionReason?: string | null;
  lastResumedAt: string | null;
}

export interface PersistedState {
  phaseStates: Record<string, PersistedPhaseState>;
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { phaseStates: {} };
}

function saveState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export class MissionExecutionService {
  private state: PersistedState;

  constructor() {
    this.state = loadState();
  }

  private getOrCreateState(phaseId: string): PersistedPhaseState {
    if (!this.state.phaseStates[phaseId]) {
      this.state.phaseStates[phaseId] = {
        status: 'PENDING',
        completed: false,
        startedAt: null,
        completedAt: null,
        elapsedMinutes: 0,
        manualOverride: null,
        progress: 0,
        completionReason: null,
        lastResumedAt: null,
      };
    }
    return this.state.phaseStates[phaseId];
  }

  startPhase(phaseId: string): void {
    // Reload state to ensure synced across instances
    this.state = loadState();

    // 1. Automatically pause any currently running phase
    this.pauseAnyRunningPhaseInternal();

    // 2. Mark this phase as RUNNING
    const now = new Date().toISOString();
    const existing = this.getOrCreateState(phaseId);
    existing.status = 'RUNNING';
    existing.lastResumedAt = now;
    if (!existing.startedAt) {
      existing.startedAt = now;
    }
    saveState(this.state);

    // 3. Publish PhaseStarted Event
    eventBus.publish({
      type: 'PhaseStarted',
      timestamp: now,
      source: 'MissionExecutionService',
      entityId: phaseId,
      payload: { phaseId }
    });
  }

  pausePhase(phaseId: string): void {
    this.state = loadState();
    const existing = this.state.phaseStates[phaseId];
    if (!existing || existing.status !== 'RUNNING') return;

    const now = new Date().toISOString();
    if (existing.lastResumedAt) {
      const diffMs = new Date(now).getTime() - new Date(existing.lastResumedAt).getTime();
      existing.elapsedMinutes += diffMs / (1000 * 60);
      existing.lastResumedAt = null;
    }
    existing.status = 'PAUSED';
    saveState(this.state);

    eventBus.publish({
      type: 'PhasePaused',
      timestamp: now,
      source: 'MissionExecutionService',
      entityId: phaseId,
      payload: { phaseId }
    });
  }

  completePhase(phase: StudyPhase, evidence?: Partial<CompletionEvidence>, reason?: string): void {
    this.state = loadState();
    const now = new Date().toISOString();
    const existing = this.getOrCreateState(phase.id);

    // Pause timer if running
    if (existing.status === 'RUNNING' && existing.lastResumedAt) {
      const diffMs = new Date(now).getTime() - new Date(existing.lastResumedAt).getTime();
      existing.elapsedMinutes += diffMs / (1000 * 60);
      existing.lastResumedAt = null;
    }

    existing.status = 'COMPLETED';
    existing.completed = true;
    existing.completedAt = now;
    existing.manualOverride = 'COMPLETED';
    if (reason) {
      existing.completionReason = reason;
    }
    saveState(this.state);

    eventBus.publish({
      type: 'PhaseCompleted',
      timestamp: now,
      source: 'MissionExecutionService',
      entityId: phase.id,
      payload: { phaseId: phase.id, evidence, reason }
    });
  }

  uncompletePhase(phaseId: string): void {
    this.state = loadState();
    const now = new Date().toISOString();
    const existing = this.getOrCreateState(phaseId);

    // Pause timer if running
    if (existing.status === 'RUNNING' && existing.lastResumedAt) {
      const diffMs = new Date(now).getTime() - new Date(existing.lastResumedAt).getTime();
      existing.elapsedMinutes += diffMs / (1000 * 60);
      existing.lastResumedAt = null;
    }

    existing.status = 'REOPENED';
    existing.completed = false;
    existing.completedAt = null;
    existing.manualOverride = 'INCOMPLETE';
    saveState(this.state);

    eventBus.publish({
      type: 'PhaseUncompleted',
      timestamp: now,
      source: 'MissionExecutionService',
      entityId: phaseId,
      payload: { phaseId }
    });
  }

  resetPhaseOverride(phaseId: string): void {
    this.state = loadState();
    const existing = this.state.phaseStates[phaseId];
    if (existing) {
      existing.manualOverride = null;
      saveState(this.state);
    }
  }

  skipPhase(phaseId: string): void {
    this.state = loadState();
    const existing = this.getOrCreateState(phaseId);
    existing.status = 'SKIPPED';
    saveState(this.state);
  }

  recordProgress(phaseId: string, progressPercent: number): void {
    this.state = loadState();
    const existing = this.getOrCreateState(phaseId);
    
    // progress is a fraction from 0.0 to 1.0 internally
    const progressFraction = progressPercent / 100;
    existing.progress = progressFraction;
    
    const now = new Date().toISOString();
    
    if (progressPercent === 100) {
      existing.status = 'COMPLETED';
      existing.completed = true;
      existing.completedAt = now;
      existing.manualOverride = 'COMPLETED';
      
      saveState(this.state);
      
      eventBus.publish({
        type: 'PhaseCompleted',
        timestamp: now,
        source: 'MissionExecutionService',
        entityId: phaseId,
        payload: { phaseId, progressPercent }
      });
    } else {
      const previouslyCompleted = existing.completed;
      existing.completed = false;
      existing.completedAt = null;
      
      if (progressPercent === 0) {
        existing.status = 'READY';
        existing.manualOverride = 'INCOMPLETE';
      } else {
        existing.status = 'RUNNING';
        existing.manualOverride = null;
      }
      
      saveState(this.state);
      
      if (previouslyCompleted) {
        eventBus.publish({
          type: 'PhaseUncompleted',
          timestamp: now,
          source: 'MissionExecutionService',
          entityId: phaseId,
          payload: { phaseId, progressPercent }
        });
      }
      
      eventBus.publish({
        type: 'ResourceProgressUpdated',
        timestamp: now,
        source: 'MissionExecutionService',
        entityId: phaseId,
        payload: { phaseId, progressPercent }
      });
    }
  }

  getPhaseState(phaseId: string) {
    this.state = loadState();
    return this.state.phaseStates[phaseId] || null;
  }

  getAllStates(): PersistedState {
    this.state = loadState();
    return this.state;
  }

  clear(): void {
    this.state = { phaseStates: {} };
    localStorage.removeItem(STORAGE_KEY);
  }

  private pauseAnyRunningPhaseInternal(): void {
    for (const phaseId of Object.keys(this.state.phaseStates)) {
      const state = this.state.phaseStates[phaseId];
      if (state.status === 'RUNNING') {
        const now = new Date().toISOString();
        if (state.lastResumedAt) {
          const diffMs = new Date(now).getTime() - new Date(state.lastResumedAt).getTime();
          state.elapsedMinutes += diffMs / (1000 * 60);
          state.lastResumedAt = null;
        }
        state.status = 'PAUSED';
      }
    }
  }

  applyPersistedStates(stack: StudyStack): StudyStack {
    this.state = loadState();

    const updatedPhases: StudyPhase[] = stack.phases.map(phase => {
      const saved = this.state.phaseStates[phase.id];
      if (!saved) {
        return {
          ...phase,
          status: 'PENDING' as const,
          completed: false,
          elapsedMinutes: 0,
        };
      }

      // Determine completed state
      let completed = phase.completed;
      if (phase.stepType !== 'Lecture') {
        if (saved.manualOverride === 'COMPLETED') {
          completed = true;
        } else if (saved.manualOverride === 'INCOMPLETE') {
          completed = false;
        } else if (saved.completed !== undefined) {
          completed = saved.completed;
        }
      } else {
        completed = saved.completed;
      }

      // Calculate elapsedMinutes dynamically to update live running timers
      let elapsedMinutes = saved.elapsedMinutes || 0;
      if (saved.status === 'RUNNING' && saved.lastResumedAt) {
        const diffMs = new Date().getTime() - new Date(saved.lastResumedAt).getTime();
        elapsedMinutes += diffMs / (1000 * 60);
      }

      let status = saved.status;
      if (completed) {
        status = 'COMPLETED';
      }

      return {
        ...phase,
        status,
        completed,
        startedAt: saved.startedAt,
        completedAt: saved.completedAt,
        elapsedMinutes,
        manualOverride: saved.manualOverride,
        progress: saved.progress || (completed ? 1.0 : 0.0),
        completionReason: saved.completionReason || undefined,
      };
    });

    // Re-evaluate lock states based on prerequisite stepTypes
    for (let i = 0; i < updatedPhases.length; i++) {
      const phase = updatedPhases[i];
      let locked = false;
      const reasons: string[] = [];

      // Check dependsOn dependency
      if (phase.dependsOn && phase.dependsOn.length > 0) {
        const parentId = phase.dependsOn[0];
        const parent = updatedPhases.find(p => p.id === parentId);
        const parentCompleted = parent ? parent.completed : true;
        if (!parentCompleted) {
          locked = true;
          reasons.push('Previous phase incomplete');
        }
      }

      // Step-type specific locking evidence checks
      if (phase.stepType === 'Reading') {
        const lecturePhases = updatedPhases.filter(p => p.stepType === 'Lecture');
        const anyLectureIncomplete = lecturePhases.some(p => !p.completed);
        if (anyLectureIncomplete) {
          locked = true;
          reasons.push('Requires Lecture Completion');
        }
      } else if (phase.stepType === 'Formula' || phase.stepType === 'Notebook' || phase.stepType === 'Questions') {
        const readingPhase = updatedPhases.find(p => p.stepType === 'Reading');
        if (readingPhase && !readingPhase.completed) {
          locked = true;
          reasons.push('Requires Reading Completion');
        }
      } else if (phase.stepType === 'Reflection') {
        const lecturePhases = updatedPhases.filter(p => p.stepType === 'Lecture');
        const readingPhase = updatedPhases.find(p => p.stepType === 'Reading');
        const formulaPhases = updatedPhases.filter(p => p.stepType === 'Formula');
        const questionsPhase = updatedPhases.find(p => p.stepType === 'Questions');

        if (lecturePhases.some(p => !p.completed)) {
          locked = true;
          reasons.push('Requires Lecture Completion');
        }
        if (readingPhase && !readingPhase.completed) {
          locked = true;
          reasons.push('Requires Reading Completion');
        }
        if (formulaPhases.some(p => !p.completed)) {
          locked = true;
          reasons.push('Requires Formula Memorized');
        }
        if (questionsPhase && !questionsPhase.completed) {
          locked = true;
          reasons.push('Requires Question Target');
        }
      }

      const isCompleted = phase.completed;
      let finalStatus = phase.status;
      if (isCompleted) {
        finalStatus = 'COMPLETED';
      } else if (locked) {
        finalStatus = 'BLOCKED';
      } else if (finalStatus === 'PENDING' || finalStatus === 'BLOCKED') {
        finalStatus = 'READY';
      }

      updatedPhases[i] = {
        ...phase,
        locked: isCompleted ? false : locked,
        status: finalStatus,
        lockedReason: reasons.join(', ') || undefined,
      };
    }

    // Calculate evidence-based weighted progress
    const STEP_WEIGHTS: Record<string, number> = {
      Lecture: 0.25,
      Reading: 0.25,
      Formula: 0.10,
      Notebook: 0.10,
      Questions: 0.20,
      Reflection: 0.10,
    };

    let totalWeight = 0;
    let completedWeightedFraction = 0;

    updatedPhases.forEach(p => {
      const weight = STEP_WEIGHTS[p.stepType] || 0.10;
      totalWeight += weight;

      let completionFraction = 0;
      if (p.completed) {
        completionFraction = 1.0;
      } else {
        // If not completed, calculate partial progress
        if (p.stepType === 'Lecture') {
          if (p.resources.length > 0) {
            const meta = p.resources[0].metadata;
            const progress = meta?.progress;
            if (progress) {
              const dur = p.estimatedMinutes || 30;
              completionFraction = dur > 0 ? (progress.minutesCompleted || 0) / dur : 0;
            }
          }
        } else if (p.stepType === 'Reading') {
          const pct = p.completionEvidence?.readingProgress || 0;
          completionFraction = pct / 100;
        } else if (p.stepType === 'Questions') {
          const solved = p.completionEvidence?.questionsSolved || 0;
          const target = p.completionEvidence?.questionsTotal || 20;
          completionFraction = target > 0 ? Math.min(1.0, solved / target) : 0;
        }
      }

      completedWeightedFraction += completionFraction * weight;
    });

    const progressPercent = totalWeight > 0 ? Math.round((completedWeightedFraction / totalWeight) * 100) : 0;
    const completedPhases = updatedPhases.filter(p => p.status === 'COMPLETED' || p.status === 'SKIPPED').length;
    const totalPhases = updatedPhases.length;
    const remainingMinutes = updatedPhases
      .filter(p => p.status !== 'COMPLETED' && p.status !== 'SKIPPED')
      .reduce((sum, p) => sum + p.estimatedMinutes, 0);

    const activePhase = updatedPhases.find(p => p.status === 'RUNNING' || p.status === 'ACTIVE') || null;
    const nextPhase = updatedPhases.find(p => p.status === 'READY') || null;

    return {
      ...stack,
      phases: updatedPhases,
      activePhase,
      nextPhase,
      completedPhases,
      remainingMinutes,
      progressPercent,
    };
  }
}
