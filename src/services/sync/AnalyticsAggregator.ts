/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { coachPlanRepository } from '../../repositories/CoachPlanRepository';
import { syncQueue } from './SyncQueue';
import { StudySession, LearningOutcomeStatement } from '../../types';

export interface AnalyticsSummary {
  totalHours: number;
  totalPlans: number;
  completionRate: number;
  averageStudyTime: number;
  weeklyTrend: Record<string, number>; // YYYY-MM-DD -> hours
  lastUpdated: string;
}

export class AnalyticsAggregator {
  private static instance: AnalyticsAggregator;
  private summary: AnalyticsSummary;

  private constructor() {
    this.summary = this.loadFromCache();
  }

  public static getInstance(): AnalyticsAggregator {
    if (!AnalyticsAggregator.instance) {
      AnalyticsAggregator.instance = new AnalyticsAggregator();
    }
    return AnalyticsAggregator.instance;
  }

  private loadFromCache(): AnalyticsSummary {
    try {
      const saved = localStorage.getItem('cfa_analytics_summary');
      if (saved) return JSON.parse(saved);
    } catch (_) {}

    return {
      totalHours: 0,
      totalPlans: 0,
      completionRate: 0,
      averageStudyTime: 0,
      weeklyTrend: {},
      lastUpdated: new Date().toISOString()
    };
  }

  public getSummary(): AnalyticsSummary {
    return { ...this.summary };
  }

  /**
   * Recalculates stats from raw state lists, caches them, and schedules a Firestore sync.
   */
  public recalculate(sessions: StudySession[], losList: LearningOutcomeStatement[]) {
    try {
      // 1. Calculate active plans count
      const plans = coachPlanRepository.getAllActive();
      const totalPlans = plans.length;

      // 2. Calculate syllabus completion rate
      const completedLos = losList.filter(l => l.status === 'Completed');
      const completionRate = losList.length > 0 
        ? Math.round((completedLos.length / losList.length) * 100)
        : 0;

      // 3. Calculate study session stats
      const completedSessions = sessions.filter(s => s.status === 'Completed');
      const totalMinutes = completedSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      const totalHours = Number((totalMinutes / 60).toFixed(1));
      const averageStudyTime = completedSessions.length > 0
        ? Math.round(totalMinutes / completedSessions.length)
        : 0;

      // 4. Calculate weekly trend (past 7 days)
      const weeklyTrend: Record<string, number> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        weeklyTrend[dateStr] = 0;
      }

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      completedSessions.forEach(s => {
        const sessionTime = new Date(s.startTime).getTime();
        if (sessionTime >= sevenDaysAgo) {
          const dateKey = s.startTime.split('T')[0];
          if (weeklyTrend[dateKey] !== undefined) {
            weeklyTrend[dateKey] = Number((weeklyTrend[dateKey] + s.durationMinutes / 60).toFixed(1));
          }
        }
      });

      // 5. Save and Sync
      this.summary = {
        totalHours,
        totalPlans,
        completionRate,
        averageStudyTime,
        weeklyTrend,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem('cfa_analytics_summary', JSON.stringify(this.summary));

      const uid = localStorage.getItem('cfa_sync_uid');
      if (uid) {
        syncQueue.enqueue('analyticsSummary' as any, 'summary', this.summary);
      }
    } catch (e) {
      console.error("AnalyticsAggregator: Recalculate failed", e);
    }
  }

  public setSummary(summary: AnalyticsSummary) {
    this.summary = summary;
    localStorage.setItem('cfa_analytics_summary', JSON.stringify(summary));
  }
}

export const analyticsAggregator = AnalyticsAggregator.getInstance();
