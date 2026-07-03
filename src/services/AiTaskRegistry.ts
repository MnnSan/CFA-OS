export interface AiTaskConfiguration {
  taskId: string;
  contextBuilderMethod: string;
  promptTemplateKey: string;
  cacheTtlRule: '24h' | 'until_curriculum_mutation' | 'until_settings_mutation' | 'post_session';
  timeoutDurationMs: number;
  defaultProviderId: string;
}

export const AI_TASK_REGISTRY: Record<string, AiTaskConfiguration> = {
  'task-plan-explain': {
    taskId: 'task-plan-explain',
    contextBuilderMethod: 'buildPlanningContext',
    promptTemplateKey: 'PLANNING_RATIONALE_V1',
    cacheTtlRule: 'until_settings_mutation',
    timeoutDurationMs: 8000,
    defaultProviderId: 'google-gemini'
  },
  'task-los-summary': {
    taskId: 'task-los-summary',
    contextBuilderMethod: 'buildLosContext',
    promptTemplateKey: 'LOS_ABSTRACT_V1',
    cacheTtlRule: 'until_curriculum_mutation',
    timeoutDurationMs: 5000,
    defaultProviderId: 'google-gemini'
  },
  'task-analytics-explain': {
    taskId: 'task-analytics-explain',
    contextBuilderMethod: 'buildAnalyticsContext',
    promptTemplateKey: 'ANALYTICS_EXPLANATION_V1',
    cacheTtlRule: 'post_session',
    timeoutDurationMs: 6000,
    defaultProviderId: 'google-gemini'
  },
  'task-coach-recommendation': {
    taskId: 'task-coach-recommendation',
    contextBuilderMethod: 'buildCoachRecommendationContext',
    promptTemplateKey: 'COACH_RECOMMENDATION_V1',
    cacheTtlRule: 'post_session',
    timeoutDurationMs: 8000,
    defaultProviderId: 'google-gemini'
  },
  'task-mission-explain': {
    taskId: 'task-mission-explain',
    contextBuilderMethod: 'buildMissionExplainContext',
    promptTemplateKey: 'MISSION_EXPLAIN_V1',
    cacheTtlRule: 'until_settings_mutation',
    timeoutDurationMs: 6000,
    defaultProviderId: 'google-gemini'
  },
  'task-prepare-brief': {
    taskId: 'task-prepare-brief',
    contextBuilderMethod: 'buildPrepareBriefContext',
    promptTemplateKey: 'PREPARE_BRIEF_V1',
    cacheTtlRule: 'until_curriculum_mutation',
    timeoutDurationMs: 6000,
    defaultProviderId: 'google-gemini'
  },
  'task-metric-explain': {
    taskId: 'task-metric-explain',
    contextBuilderMethod: 'buildMetricExplainContext',
    promptTemplateKey: 'METRIC_EXPLAIN_V1',
    cacheTtlRule: 'until_settings_mutation',
    timeoutDurationMs: 5000,
    defaultProviderId: 'google-gemini'
  },
  'task-learning-pattern': {
    taskId: 'task-learning-pattern',
    contextBuilderMethod: 'buildLearningPatternContext',
    promptTemplateKey: 'LEARNING_PATTERN_V1',
    cacheTtlRule: 'post_session',
    timeoutDurationMs: 6000,
    defaultProviderId: 'google-gemini'
  },
  'task-mission-status': {
    taskId: 'task-mission-status',
    contextBuilderMethod: 'buildMissionStatusContext',
    promptTemplateKey: 'MISSION_STATUS_V1',
    cacheTtlRule: 'until_curriculum_mutation',
    timeoutDurationMs: 5000,
    defaultProviderId: 'google-gemini'
  },
  'task-weekly-review': {
    taskId: 'task-weekly-review',
    contextBuilderMethod: 'buildWeeklyReviewContext',
    promptTemplateKey: 'WEEKLY_REVIEW_V1',
    cacheTtlRule: '24h',
    timeoutDurationMs: 10000,
    defaultProviderId: 'google-gemini'
  },
  'task-mission-brief': {
    taskId: 'task-mission-brief',
    contextBuilderMethod: 'buildMissionBriefContext',
    promptTemplateKey: 'MISSION_BRIEF_V1',
    cacheTtlRule: 'until_curriculum_mutation',
    timeoutDurationMs: 8000,
    defaultProviderId: 'google-gemini'
  },
  'task-coach-insight': {
    taskId: 'task-coach-insight',
    contextBuilderMethod: 'buildCoachInsightContext',
    promptTemplateKey: 'COACH_INSIGHT_V1',
    cacheTtlRule: '24h',
    timeoutDurationMs: 6000,
    defaultProviderId: 'google-gemini'
  }
};
