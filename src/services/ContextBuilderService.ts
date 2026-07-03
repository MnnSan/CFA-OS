import { StudySettings } from '../types';
import { LearningResource, StudyStackResult } from '../resources';

export interface VersionedContext {
  contextName: string;
  version: string;
  timestamp: string;
  payload: any;
}

export class ContextBuilderService {
  // Zero-tolerance date sanitizer: ensures start â‰¤ end at the payload boundary
  private static sanitizeDateRange(startDate: string, endDate: string): { startDate: string; endDate: string } {
    if (!startDate || !endDate) return { startDate, endDate };
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (start > end) {
      return { startDate: endDate, endDate: startDate };
    }
    return { startDate, endDate };
  }

  public static buildPlanningContext(
    settings: StudySettings,
    metrics: {
      totalSubjects: number;
      totalHoursEstimate: number;
      daysRemaining: number;
    }
  ): VersionedContext {
    const safe = ContextBuilderService.sanitizeDateRange(settings.targetStartDate, settings.examDate);
    const safeDaysRemaining = Math.max(0, Math.ceil(
      (new Date(safe.endDate).getTime() - new Date(safe.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ));
    return {
      contextName: 'PlanningContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        plannerSettings: {
          targetDailyHours: settings.targetDailyHours,
          targetStartDate: safe.startDate,
          examDate: safe.endDate,
          reviewBuffer: settings.reviewBuffer
        },
        curriculumMetrics: {
          totalSubjects: metrics.totalSubjects,
          totalHoursEstimate: metrics.totalHoursEstimate,
          daysRemaining: safeDaysRemaining
        }
      }
    };
  }

  public static buildLosContext(
    losCode: string,
    losStatement: string,
    difficulty: string
  ): VersionedContext {
    return {
      contextName: 'LosContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        losCode,
        losStatement,
        difficulty
      }
    };
  }

  public static buildAnalyticsContext(
    studyHistory: any[],
    subjectProgress: Record<string, number>
  ): VersionedContext {
    return {
      contextName: 'AnalyticsContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        studyHistory,
        subjectProgress
      }
    };
  }

  public static buildCoachRecommendationContext(
    settings: StudySettings,
    historySummary: {
      yesterdayHours: number;
      streakDays: number;
      averageConfidence: number;
      recentSessionsCount: number;
    },
    todayTarget?: {
      readingTitle: string;
      losCode: string;
      estimatedDurationHours: number;
    }
  ): VersionedContext {
    return {
      contextName: 'CoachRecommendationContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        plannerSettings: {
          targetDailyHours: settings.targetDailyHours,
          examDate: settings.examDate,
          reviewBuffer: settings.reviewBuffer
        },
        historySummary,
        todayTarget
      }
    };
  }

  public static buildMissionExplainContext(
    dailyMission: any,
    curriculumSequence?: string[]
  ): VersionedContext {
    return {
      contextName: 'MissionExplainContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        dailyMission: dailyMission ? {
          subjectCode: dailyMission.subjectCode,
          readingNumber: dailyMission.readingNumber,
          readingTitle: dailyMission.readingTitle,
          losCode: dailyMission.losCode,
          statement: dailyMission.statement,
          reason: dailyMission.reason,
          estimatedDurationHours: dailyMission.estimatedDurationHours,
          remainingReadingHours: dailyMission.remainingReadingHours,
          confidenceLevel: dailyMission.confidenceLevel,
          isRecoveryMission: dailyMission.isRecoveryMission
        } : null,
        curriculumSequence
      }
    };
  }

  public static buildPrepareBriefContext(
    losCode: string,
    losStatement: string,
    formulas: any[],
    notes: any[],
    resources: any[]
  ): VersionedContext {
    return {
      contextName: 'PrepareBriefContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        losCode,
        losStatement,
        formulas: formulas.map(f => ({ name: f.name, expression: f.latexExpression, description: f.description })),
        notesCount: notes.length,
        notesTitles: notes.map(n => n.title).slice(0, 5),
        resourcesCount: resources.length
      }
    };
  }

  public static buildMetricExplainContext(
    metricKey: string,
    metricValue: any,
    settings: StudySettings,
    historySummary?: any
  ): VersionedContext {
    return {
      contextName: 'MetricExplainContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        metricKey,
        metricValue,
        plannerSettings: {
          targetDailyHours: settings.targetDailyHours,
          examDate: settings.examDate,
          reviewBuffer: settings.reviewBuffer
        },
        historySummary
      }
    };
  }

  public static buildLearningPatternContext(
    history: any[]
  ): VersionedContext {
    return {
      contextName: 'LearningPatternContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        sessions: history.map(s => ({
          startTime: s.startTime,
          durationMinutes: s.durationMinutes,
          linkedLOSId: s.linkedLOSId,
          difficulty: s.reflectionDifficulty || s.mentalFocusScore,
          confidenceAfter: s.confidenceAfter,
          notes: s.reflectionNotes,
          confusion: s.reflectionConfusion
        })).slice(0, 15) // Evaluate up to last 15 sessions
      }
    };
  }

  public static buildMissionStatusContext(
    losCode: string,
    losStatement: string,
    dependencies?: string[]
  ): VersionedContext {
    return {
      contextName: 'MissionStatusContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        losCode,
        losStatement,
        dependencies
      }
    };
  }

  public static buildMissionBriefContext(
    currentReading: { number: number | string; title: string; subjectCode?: string },
    currentLOS: { code: string; statement: string; difficulty?: string; estimatedHours?: number; confidence?: number | null },
    prerequisites: string[],
    formulas: any[],
    notes: any[],
    resources: any[],
    previousReflections: { notes?: string; confusion?: string }[],
    studyStreak: number,
    reviewQueuePosition: number,
    examDate: string,
    priorityReason?: string
  ): VersionedContext {
    return {
      contextName: 'MissionBriefContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        readingNumber: currentReading.number,
        readingTitle: currentReading.title,
        subjectCode: currentReading.subjectCode,
        losCode: currentLOS.code,
        losStatement: currentLOS.statement,
        difficulty: currentLOS.difficulty || 'Medium',
        estimatedHours: currentLOS.estimatedHours || 0,
        confidence: currentLOS.confidence ?? null,
        priorityReason: priorityReason || null,
        formulaCount: formulas.length,
        formulaNames: formulas.map(f => f.name).slice(0, 5),
        notesCount: notes.length,
        notesTitles: notes.map(n => n.title).slice(0, 5),
        resourcesCount: resources.length,
        prerequisites,
        previousReflections: previousReflections.slice(0, 5).map(r => ({
          notes: r.notes || null,
          confusion: r.confusion || null
        })),
        studyStreak,
        reviewQueuePosition,
        examDate
      }
    };
  }

  public static buildResourceContext(
    resources: LearningResource[],
    studyStack: StudyStackResult | null
  ): VersionedContext {
    return {
      contextName: 'LearningResourceContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        resourceCount: resources.length,
        resources: resources.map(r => ({
          title: r.title,
          provider: r.provider,
          type: r.resourceType,
          duration: r.duration,
          completed: r.progress.completed,
          progressPercent: r.duration > 0 ? Math.round((r.progress.minutesCompleted / r.duration) * 100) : 0,
        })),
        studyStack: studyStack ? {
          totalItems: studyStack.items.length,
          totalEstimatedMinutes: studyStack.totalEstimatedMinutes,
          totalProgressPercent: studyStack.totalProgressPercent,
          items: studyStack.items.map(i => ({
            title: i.resourceTitle,
            provider: i.provider,
            type: i.resourceType,
            estimatedMinutes: i.estimatedMinutes,
            isCompleted: i.isCompleted,
          })),
        } : null,
      },
    };
  }

  public static buildStudyStackExplainContext(
    studyStack: StudyStackResult
  ): VersionedContext {
    return {
      contextName: 'StudyStackExplainContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        readingTitle: studyStack.readingTitle,
        totalEstimatedMinutes: studyStack.totalEstimatedMinutes,
        itemSequence: studyStack.items.map((item, idx) => ({
          step: idx + 1,
          title: item.resourceTitle,
          provider: item.provider,
          type: item.resourceType,
          estimatedMinutes: item.estimatedMinutes,
          status: item.isCompleted ? 'completed' : item.progressPercent > 0 ? 'in_progress' : 'pending',
        })),
      },
    };
  }

  public static buildWeeklyReviewContext(
    history: any[]
  ): VersionedContext {
    return {
      contextName: 'WeeklyReviewContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        sessions: history.map(s => ({
          startTime: s.startTime,
          durationMinutes: s.durationMinutes,
          difficulty: s.reflectionDifficulty,
          confidenceAfter: s.confidenceAfter,
          confusion: s.reflectionConfusion
        })).slice(0, 30)
      }
    };
  }

  public static buildCoachInsightContext(
    phase: { phaseNumber: number; phaseLabel: string; stepType: string; title: string; estimatedMinutes: number; dependsOn: string[] },
    stack: { readingTitle: string; losCode: string; totalPhases: number; cognitiveLoadReason: string }
  ): VersionedContext {
    return {
      contextName: 'CoachInsightContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        phaseNumber: phase.phaseNumber,
        phaseLabel: phase.phaseLabel,
        stepType: phase.stepType,
        title: phase.title,
        estimatedMinutes: phase.estimatedMinutes,
        dependsOn: phase.dependsOn,
        readingTitle: stack.readingTitle,
        losCode: stack.losCode,
        totalPhases: stack.totalPhases,
        cognitiveLoadReason: stack.cognitiveLoadReason,
      },
    };
  }
}
