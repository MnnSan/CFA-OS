import { StudySettings } from '../types';
import { LearningResource, StudyStackResult } from '../resources';
import { learningResourceRepository } from '../resources/repository/LearningResourceRepository';

export interface VersionedContext {
  contextName: string;
  version: string;
  timestamp: string;
  payload: any;
}

export class ContextBuilderService {
  // Zero-tolerance date sanitizer: ensures start ≤ end at the payload boundary
  private static sanitizeDateRange(startDate: string, endDate: string): { startDate: string; endDate: string } {
    if (!startDate || !endDate) return { startDate, endDate };
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (start > end) {
      return { startDate: endDate, endDate: startDate };
    }
    return { startDate, endDate };
  }

  // SSPRINT M13.4 — SSCI Lecture context injection helper
  private static getSsciLectureContextPayload(readingId?: string) {
    try {
      const allSsci = learningResourceRepository.getByProvider('SSCI');
      const completed = allSsci.filter(r => r.progress?.completed);
      const remaining = allSsci.filter(r => !r.progress?.completed);
      const remainingMinutes = remaining.reduce((sum, r) => sum + r.duration, 0);

      let currentLecture = null;
      let nextLecture = null;

      if (readingId) {
        const readingSsci = allSsci.filter(r => r.readingId === readingId).sort((a, b) => (a.order || 0) - (b.order || 0));
        currentLecture = readingSsci.find(r => !r.progress?.completed) || null;
        if (currentLecture) {
          const currentIndex = readingSsci.indexOf(currentLecture);
          nextLecture = readingSsci[currentIndex + 1] || null;
        }
      } else {
        currentLecture = remaining.sort((a, b) => (a.order || 0) - (b.order || 0))[0] || null;
        if (currentLecture) {
          const sameReading = allSsci.filter(r => r.readingId === currentLecture.readingId).sort((a, b) => (a.order || 0) - (b.order || 0));
          const currentIndex = sameReading.findIndex(r => r.id === currentLecture.id);
          nextLecture = sameReading[currentIndex + 1] || null;
        }
      }

      return {
        ssciLectureStatus: {
          totalSsciLecturesCount: allSsci.length,
          completedSsciCount: completed.length,
          remainingSsciCount: remaining.length,
          remainingSsciMinutes: remainingMinutes,
          currentSsciLecture: currentLecture ? { id: currentLecture.id, title: currentLecture.title, duration: currentLecture.duration, lectureCode: currentLecture.lectureCode } : null,
          nextSsciLecture: nextLecture ? { id: nextLecture.id, title: nextLecture.title, duration: nextLecture.duration, lectureCode: nextLecture.lectureCode } : null,
          allSsciLectures: allSsci.map(r => ({ id: r.id, title: r.title, readingId: r.readingId, completed: !!r.progress?.completed }))
        }
      };
    } catch (e) {
      return {};
    }
  }

  private static wrap(context: VersionedContext, readingId?: string): VersionedContext {
    const status = ContextBuilderService.getSsciLectureContextPayload(readingId);
    return {
      ...context,
      payload: {
        ...context.payload,
        ...status
      }
    };
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
    return ContextBuilderService.wrap({
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
        curriculumMetrics: metrics
      }
    });
  }

  public static buildLosContext(
    losCode: string,
    losStatement: string,
    difficulty?: 'Easy' | 'Medium' | 'Hard'
  ): VersionedContext {
    return ContextBuilderService.wrap({
      contextName: 'LosContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        losCode,
        losStatement,
        difficulty: difficulty || 'Medium'
      }
    });
  }

  public static buildAnalyticsContext(
    studyHistory: any[],
    subjectProgress: Record<string, { totalHours: number; averageConfidence: number; progressPercent: number }>
  ): VersionedContext {
    return ContextBuilderService.wrap({
      contextName: 'AnalyticsContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        studyHistory,
        subjectProgress
      }
    });
  }

  public static buildCoachRecommendationContext(
    settings: any,
    historySummary: { yesterdayHours: number; streakDays: number; averageConfidence: number; recentSessionsCount?: number },
    todayTarget: { losCode: string; readingTitle: string; estimatedDurationHours: number; readingId?: string }
  ): VersionedContext {
    return ContextBuilderService.wrap({
      contextName: 'CoachRecommendationContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        historySummary,
        todayTarget
      }
    }, todayTarget.readingId);
  }

  public static buildMissionExplainContext(
    dailyMission: { losCode: string; readingTitle: string; reason: string; remainingReadingHours: number; confidenceLevel: number | null; readingId?: string }
  ): VersionedContext {
    return ContextBuilderService.wrap({
      contextName: 'MissionExplainContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        dailyMission
      }
    }, dailyMission.readingId);
  }

  public static buildPrepareBriefContext(
    losCode: string,
    losStatement: string,
    formulas: any[],
    notesCount: number,
    notesTitles: string[],
    prerequisites: string[],
    readingId?: string
  ): VersionedContext {
    return ContextBuilderService.wrap({
      contextName: 'PrepareBriefContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        losCode,
        losStatement,
        formulas,
        notesCount,
        notesTitles,
        prerequisites
      }
    }, readingId);
  }

  public static buildMetricExplainContext(
    metricName: string,
    value: number | string,
    historicalValues: any[],
    recommendations: string[]
  ): VersionedContext {
    return ContextBuilderService.wrap({
      contextName: 'MetricExplainContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        metricName,
        value,
        historicalValues,
        recommendations
      }
    });
  }

  public static buildLearningPatternContext(
    patterns: Array<{ category: string; description: string; score: number }>,
    weakAreas: string[],
    studyAdvice: string
  ): VersionedContext {
    return ContextBuilderService.wrap({
      contextName: 'LearningPatternContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        patterns,
        weakAreas,
        studyAdvice
      }
    });
  }

  public static buildMissionStatusContext(
    currentMission: { title: string; remainingReadingHours: number; estimatedDurationHours: number; readingId?: string },
    checklist: Array<{ task: string; completed: boolean }>
  ): VersionedContext {
    return ContextBuilderService.wrap({
      contextName: 'MissionStatusContext',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      payload: {
        currentMission,
        checklist
      }
    }, currentMission.readingId);
  }

  public static buildMissionBriefContext(
    currentReading: { number: number | string; title: string; subjectCode?: string; id?: string },
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
    return ContextBuilderService.wrap({
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
    }, currentReading.id);
  }

  public static buildResourceContext(
    resources: LearningResource[],
    studyStack: StudyStackResult | null
  ): VersionedContext {
    const readingId = studyStack?.readingId;
    return ContextBuilderService.wrap({
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
    }, readingId);
  }

  public static buildStudyStackExplainContext(
    studyStack: StudyStackResult
  ): VersionedContext {
    return ContextBuilderService.wrap({
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
    }, studyStack.readingId);
  }

  public static buildWeeklyReviewContext(
    history: any[]
  ): VersionedContext {
    return ContextBuilderService.wrap({
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
    });
  }

  public static buildCoachInsightContext(
    phase: { phaseNumber: number; phaseLabel: string; stepType: string; title: string; estimatedMinutes: number; dependsOn: string[]; readingId?: string },
    stack: { readingTitle: string; losCode: string; totalPhases: number; cognitiveLoadReason: string; readingId?: string }
  ): VersionedContext {
    return ContextBuilderService.wrap({
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
    }, phase.readingId || stack.readingId);
  }
}
