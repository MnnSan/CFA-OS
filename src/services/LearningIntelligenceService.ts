/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LearningOutcomeStatement, StudySession, Reading, Subject } from '../types';

export interface WeakTopicReport {
  id: string;
  type: 'subject' | 'reading';
  name: string;
  score: number; // calculated weakness rating (higher = weaker)
  reason: string;
}

export class LearningIntelligenceService {
  /**
   * Applies the exponential forgetting curve to decay confidence ratings based on time elapsed since review.
   * Decay Formula: C_decayed = C_original * e^(-days / H)
   */
  public decayConfidence(
    losList: LearningOutcomeStatement[],
    sessions: StudySession[]
  ): LearningOutcomeStatement[] {
    const today = new Date('2026-06-28'); // consistent reference date

    return losList.map(los => {
      if (los.confidence === undefined || los.confidence === null) {
        return los;
      }

      // Find the last completed study session for this LOS
      const losSessions = sessions
        .filter(s => s.linkedLOSId === los.id && s.status === 'Completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      let daysSinceLastReview = 5; // Default fallback if no study session registered
      if (losSessions.length > 0) {
        const lastSessionDate = new Date(losSessions[0].startTime);
        const diffTime = today.getTime() - lastSessionDate.getTime();
        daysSinceLastReview = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }

      // Calculate Half-life H based on rated confidence (acting as proxy for Leitner box strength)
      // High confidence = longer memory half-life
      let halfLifeDays = 3.5;
      const baseConfidence = los.confidence;

      if (baseConfidence === 5) halfLifeDays = 15;
      else if (baseConfidence === 4) halfLifeDays = 8;
      else if (baseConfidence === 3) halfLifeDays = 5;
      else halfLifeDays = 3.0;

      // Calculate decayed confidence (Map score 1-5)
      // C_decayed = C_original * e^(-days / H)
      const decayFactor = Math.exp(-daysSinceLastReview / halfLifeDays);
      let decayedVal = Number((baseConfidence * decayFactor).toFixed(2));
      
      // Clamp decayed value to at least 1.0
      decayedVal = Math.max(1.0, decayedVal);

      return {
        ...los,
        confidence: decayedVal
      };
    });
  }

  /**
   * Scans study logs to identify areas of cognitive friction.
   */
  public detectWeakTopics(
    losList: LearningOutcomeStatement[],
    readings: Reading[],
    subjects: Subject[],
    sessions: StudySession[]
  ): WeakTopicReport[] {
    const reports: WeakTopicReport[] = [];

    // Analyze by Reading
    readings.forEach(rd => {
      const rdLOS = losList.filter(l => l.readingId === rd.id);
      if (rdLOS.length === 0) return;

      const ratedLOS = rdLOS.filter(l => l.confidence !== undefined && l.confidence !== null);
      const avgConfidence = ratedLOS.length > 0 
        ? ratedLOS.reduce((acc, l) => acc + (l.confidence || 0), 0) / ratedLOS.length 
        : 2.5;

      // Calculate total study time invested in this reading
      const rdSessions = sessions.filter(s => s.linkedReadingId === rd.id && s.status === 'Completed');
      const totalMinutes = rdSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const totalHours = totalMinutes / 60;

      // A reading is weak if confidence is low, OR if study hours are high but confidence is still low
      let weaknessScore = 0;
      let reason = '';

      if (avgConfidence < 3.0) {
        weaknessScore = (5.0 - avgConfidence) * 20;
        reason = `Decayed confidence is low (${avgConfidence.toFixed(1)}/5.0).`;
      }
      
      if (totalHours > 4 && avgConfidence < 3.5) {
        weaknessScore += 15;
        reason += ` High study effort (${totalHours.toFixed(1)} hours logged) but recall remains average.`;
      }

      if (weaknessScore > 30) {
        reports.push({
          id: rd.id,
          type: 'reading',
          name: `Reading ${rd.number}: ${rd.title}`,
          score: Math.round(weaknessScore),
          reason
        });
      }
    });

    // Sort descending by weakness score
    return reports.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  /**
   * Monitors consecutive daily study hours and sleep patterns to identify burnout.
   */
  public detectBurnout(sessions: StudySession[]): boolean {
    const today = new Date('2026-06-28');
    
    // 1. Check average study time over the last 3 days
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    const recentSessions = sessions.filter(s => {
      const sDate = new Date(s.startTime);
      return sDate >= threeDaysAgo && sDate <= today && s.status === 'Completed';
    });

    const totalMinutes = recentSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const avgDailyHours = (totalMinutes / 3) / 60;
    if (avgDailyHours > 5) {
      return true; // Burnout warning triggered
    }

    // 2. Check sleep disruption: sessions logged between 11:00 PM and 4:00 AM in the last 7 days
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const lateSessions = sessions.filter(s => {
      const sDate = new Date(s.startTime);
      if (sDate < oneWeekAgo || sDate > today || s.status !== 'Completed') return false;
      const hours = sDate.getHours();
      return hours >= 23 || hours < 4;
    });

    if (lateSessions.length >= 3) {
      return true; // Late night studying warning
    }

    return false;
  }
}

export const learningIntelligenceService = new LearningIntelligenceService();
