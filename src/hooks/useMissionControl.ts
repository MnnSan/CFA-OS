import { useMemo } from 'react';
import { MissionControlService } from '../services/MissionControlService';
import { MissionExecutionService } from '../services/MissionExecutionService';
import { CoachInsightRepository } from '../services/CoachInsightRepository';
import { LearningResourceAdapter } from '../resources/adapters/LearningResourceAdapter';

export function useMissionControl() {
  const missionControl = useMemo(() => new MissionControlService(), []);
  const execution = useMemo(() => new MissionExecutionService(), []);
  const coachRepository = useMemo(() => new CoachInsightRepository(), []);
  const adapter = useMemo(() => new LearningResourceAdapter(), []);

  return { missionControl, execution, coachRepository, adapter };
}
