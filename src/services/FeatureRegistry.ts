export interface AiCapability {
  id: string;
  category: 'planning' | 'reasoning' | 'analytics' | 'content';
  isEnabled: boolean;
  requiresConnection: boolean;
  cacheable: boolean;
  contextBuilderRef: string;
}

export const FEATURE_REGISTRY: Record<string, AiCapability> = {
  COACH_PLANNING: {
    id: 'feat-coach-planning',
    category: 'planning',
    isEnabled: true,
    requiresConnection: true,
    cacheable: true,
    contextBuilderRef: 'buildPlanningContext'
  },
  LOS_SUMMARY: {
    id: 'feat-los-summary',
    category: 'content',
    isEnabled: true,
    requiresConnection: true,
    cacheable: true,
    contextBuilderRef: 'buildLosContext'
  },
  ANALYTICS_EXPLANATION: {
    id: 'feat-analytics-explain',
    category: 'analytics',
    isEnabled: true,
    requiresConnection: true,
    cacheable: true,
    contextBuilderRef: 'buildAnalyticsContext'
  }
};
