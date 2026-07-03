import { MissionTemplate, MissionTemplateId } from '../types';

export const MISSION_TEMPLATES: Record<MissionTemplateId, MissionTemplate> = {
  standard: {
    id: 'standard',
    phases: [
      { phaseNumber: 1, phaseLabel: 'Learn', stepType: 'Lecture', icon: '🎥', description: 'Watch lecture to build foundational understanding' },
      { phaseNumber: 2, phaseLabel: 'Understand', stepType: 'Reading', icon: '📖', description: 'Read LOS content to deepen comprehension' },
      { phaseNumber: 3, phaseLabel: 'Internalize', stepType: 'Formula', icon: '📐', description: 'Review formulas for active recall' },
      { phaseNumber: 4, phaseLabel: 'Consolidate', stepType: 'Notebook', icon: '🧠', description: 'Review NotebookLM notes for reinforcement' },
      { phaseNumber: 5, phaseLabel: 'Validate', stepType: 'Questions', icon: '✅', description: 'Test understanding with practice questions' },
      { phaseNumber: 6, phaseLabel: 'Reflect', stepType: 'Reflection', icon: '💭', description: 'Reflect on key takeaways and confusion areas' },
    ],
  },
  review: {
    id: 'review',
    phases: [
      { phaseNumber: 1, phaseLabel: 'Review', stepType: 'Reading', icon: '📖', description: 'Review previously covered material' },
      { phaseNumber: 2, phaseLabel: 'Questions', stepType: 'Questions', icon: '✅', description: 'Test recall with targeted questions' },
      { phaseNumber: 3, phaseLabel: 'Mistakes', stepType: 'Reflection', icon: '💭', description: 'Analyze mistakes and reinforce weak areas' },
      { phaseNumber: 4, phaseLabel: 'Reflect', stepType: 'Reflection', icon: '💭', description: 'Reflect on progress and plan next steps' },
    ],
  },
  formula: {
    id: 'formula',
    phases: [
      { phaseNumber: 1, phaseLabel: 'Lecture', stepType: 'Lecture', icon: '🎥', description: 'Watch formula derivation lecture' },
      { phaseNumber: 2, phaseLabel: 'Formula', stepType: 'Formula', icon: '📐', description: 'Active recall formula practice' },
      { phaseNumber: 3, phaseLabel: 'Calculator', stepType: 'Questions', icon: '🔢', description: 'Calculator drill exercises' },
      { phaseNumber: 4, phaseLabel: 'Questions', stepType: 'Questions', icon: '✅', description: 'Apply formulas to practice questions' },
      { phaseNumber: 5, phaseLabel: 'Reflect', stepType: 'Reflection', icon: '💭', description: 'Reflect on formula mastery' },
    ],
  },
  mock: {
    id: 'mock',
    phases: [
      { phaseNumber: 1, phaseLabel: 'Mock', stepType: 'Questions', icon: '📝', description: 'Timed mock exam session' },
      { phaseNumber: 2, phaseLabel: 'Review', stepType: 'Reading', icon: '📖', description: 'Review incorrect answers' },
      { phaseNumber: 3, phaseLabel: 'Weakness', stepType: 'Reflection', icon: '💭', description: 'Target weak areas from mock results' },
      { phaseNumber: 4, phaseLabel: 'Reflect', stepType: 'Reflection', icon: '💭', description: 'Reflect on exam readiness' },
    ],
  },
  recovery: {
    id: 'recovery',
    phases: [
      { phaseNumber: 1, phaseLabel: 'Light Review', stepType: 'Reading', icon: '📖', description: 'Light review of familiar material' },
      { phaseNumber: 2, phaseLabel: 'Reflect', stepType: 'Reflection', icon: '💭', description: 'Rest and reset for next session' },
    ],
  },
};

export function getTemplate(templateId: MissionTemplateId): MissionTemplate {
  return MISSION_TEMPLATES[templateId] || MISSION_TEMPLATES.standard;
}
