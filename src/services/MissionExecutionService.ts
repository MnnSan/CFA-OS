import { StudyStack, StudyPhase, CompletionEvidence } from '../types';

const STORAGE_KEY = 'cfa_mission_execution_state';

interface PersistedState {
  phaseStates: Record<string, {
    status: string;
    completed: boolean;
    completionEvidence: CompletionEvidence;
    lastResumedAt: string | null;
  }>;
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

  resumePhase(stack: StudyStack, phaseId: string): { phase: StudyPhase; resourceIndex: number } | null {
    const phase = stack.phases.find(p => p.id === phaseId);
    if (!phase) return null;
    if (phase.locked) return null;

    this.state.phaseStates[phaseId] = {
      ...(this.state.phaseStates[phaseId] || {
        status: phase.status,
        completed: false,
        completionEvidence: {},
        lastResumedAt: null,
      }),
      status: 'ACTIVE',
      lastResumedAt: new Date().toISOString(),
    };
    saveState(this.state);

    return { phase, resourceIndex: 0 };
  }

  completePhase(phase: StudyPhase, evidence?: Partial<CompletionEvidence>): void {
    this.state.phaseStates[phase.id] = {
      ...(this.state.phaseStates[phase.id] || {
        status: 'READY',
        completed: false,
        completionEvidence: {},
        lastResumedAt: null,
      }),
      status: 'COMPLETED',
      completed: true,
      completionEvidence: {
        ...phase.completionEvidence,
        ...evidence,
      },
    };
    saveState(this.state);
  }

  skipPhase(phaseId: string): void {
    this.state.phaseStates[phaseId] = {
      ...(this.state.phaseStates[phaseId] || {
        status: 'SKIPPED',
        completed: false,
        completionEvidence: {},
        lastResumedAt: null,
      }),
      status: 'SKIPPED',
    };
    saveState(this.state);
  }

  recordProgress(phaseId: string, evidence: Partial<CompletionEvidence>): void {
    const existing = this.state.phaseStates[phaseId] || {
      status: 'ACTIVE',
      completed: false,
      completionEvidence: {},
      lastResumedAt: null,
    };
    this.state.phaseStates[phaseId] = {
      ...existing,
      completionEvidence: { ...existing.completionEvidence, ...evidence },
    };
    saveState(this.state);
  }

  getPhaseState(phaseId: string): { status: string; completed: boolean; completionEvidence: CompletionEvidence } | null {
    return this.state.phaseStates[phaseId] || null;
  }

  getAllStates(): PersistedState {
    return this.state;
  }

  clear(): void {
    this.state = { phaseStates: {} };
    localStorage.removeItem(STORAGE_KEY);
  }

  applyPersistedStates(stack: StudyStack): StudyStack {
    const updatedPhases = stack.phases.map(phase => {
      const saved = this.state.phaseStates[phase.id];
      if (!saved) return phase;
      return {
        ...phase,
        status: saved.status as any,
        completed: saved.completed,
        completionEvidence: { ...phase.completionEvidence, ...saved.completionEvidence },
      };
    });

    const completedPhases = updatedPhases.filter(p => p.status === 'COMPLETED').length;
    const totalPhases = updatedPhases.length;
    const remainingMinutes = updatedPhases
      .filter(p => p.status !== 'COMPLETED' && p.status !== 'SKIPPED')
      .reduce((sum, p) => sum + p.estimatedMinutes, 0);

    const activePhase = updatedPhases.find(p => p.status === 'ACTIVE') || null;
    const nextPhase = updatedPhases.find(p => p.status === 'READY') || null;

    return {
      ...stack,
      phases: updatedPhases,
      activePhase,
      nextPhase,
      completedPhases,
      remainingMinutes,
      progressPercent: totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0,
    };
  }
}
