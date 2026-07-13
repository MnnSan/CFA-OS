/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { eventBus } from './EventBus';
import { syncQueue } from './sync/SyncQueue';

export interface MistakeEntry {
  losId: string;
  mistakeDescription: string;
  timestamp: string;
}

export interface ConfidenceTrendEntry {
  timestamp: string;
  averageConfidence: number;
}

export interface QuizScoreEntry {
  quizId: string;
  score: number;
  total: number;
  timestamp: string;
}

export interface AIStudyMemory {
  currentSubjectId: string | null;
  currentReadingId: string | null;
  currentLosId: string | null;
  recentMistakes: MistakeEntry[];
  weakTopics: string[];
  lastAiRecommendation: string | null;
  studyStreak: number;
  confidenceTrend: ConfidenceTrendEntry[];
  recentQuizScores: QuizScoreEntry[];
  updatedAt: string;
}

export class AIStudyMemoryService {
  private static instance: AIStudyMemoryService;
  private memory: AIStudyMemory;

  private constructor() {
    this.memory = this.loadFromCache();
    
    // Listen to study completions and other triggers via EventBus
    eventBus.subscribe('StudyCompleted', (event) => {
      if (event.payload?.session) {
        this.addStudySessionRecord(event.payload.session);
      }
    });

    eventBus.subscribe('FormulaMastered', (event) => {
      this.updateStreak();
    });
  }

  public static getInstance(): AIStudyMemoryService {
    if (!AIStudyMemoryService.instance) {
      AIStudyMemoryService.instance = new AIStudyMemoryService();
    }
    return AIStudyMemoryService.instance;
  }

  private loadFromCache(): AIStudyMemory {
    try {
      const saved = localStorage.getItem('cfa_ai_study_memory');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}

    return {
      currentSubjectId: null,
      currentReadingId: null,
      currentLosId: null,
      recentMistakes: [],
      weakTopics: [],
      lastAiRecommendation: null,
      studyStreak: 0,
      confidenceTrend: [],
      recentQuizScores: [],
      updatedAt: new Date().toISOString()
    };
  }

  private saveToCache() {
    try {
      this.memory.updatedAt = new Date().toISOString();
      localStorage.setItem('cfa_ai_study_memory', JSON.stringify(this.memory));
      
      // Enqueue sync operation to Firestore
      const uid = localStorage.getItem('cfa_sync_uid');
      if (uid) {
        syncQueue.enqueue('aiStudyMemory' as any, 'main', this.memory);
      }
    } catch (e) {
      console.error("AIStudyMemoryService: Failed to save memory", e);
    }
  }

  public getMemory(): AIStudyMemory {
    return { ...this.memory };
  }

  // --- Memory Mutations ---

  public updateCurrentFocus(subjectId: string | null, readingId: string | null, losId: string | null) {
    this.memory.currentSubjectId = subjectId;
    this.memory.currentReadingId = readingId;
    this.memory.currentLosId = losId;
    this.saveToCache();
  }

  public logMistake(losId: string, description: string) {
    const newEntry: MistakeEntry = {
      losId,
      mistakeDescription: description,
      timestamp: new Date().toISOString()
    };
    this.memory.recentMistakes = [newEntry, ...this.memory.recentMistakes].slice(0, 20); // keep last 20 mistakes
    this.saveToCache();
  }

  public updateWeakTopics(topics: string[]) {
    this.memory.weakTopics = topics;
    this.saveToCache();
  }

  public logAiRecommendation(recommendation: string) {
    this.memory.lastAiRecommendation = recommendation;
    this.saveToCache();
  }

  public logQuizScore(quizId: string, score: number, total: number) {
    const entry: QuizScoreEntry = {
      quizId,
      score,
      total,
      timestamp: new Date().toISOString()
    };
    this.memory.recentQuizScores = [entry, ...this.memory.recentQuizScores].slice(0, 10); // keep last 10 quiz scores
    this.saveToCache();
  }

  public logConfidence(averageConfidence: number) {
    const entry: ConfidenceTrendEntry = {
      timestamp: new Date().toISOString(),
      averageConfidence
    };
    this.memory.confidenceTrend = [...this.memory.confidenceTrend, entry].slice(-30); // keep last 30 readings
    this.saveToCache();
  }

  public updateStreak() {
    this.memory.studyStreak += 1;
    this.saveToCache();
  }

  private addStudySessionRecord(session: any) {
    // Increment study streak if last session was recent
    this.updateStreak();
    
    if (session.readingId) {
      this.updateCurrentFocus(null, session.readingId, null);
    }
  }

  public setMemory(memory: AIStudyMemory) {
    this.memory = memory;
    localStorage.setItem('cfa_ai_study_memory', JSON.stringify(memory));
  }
}

export const aiStudyMemoryService = AIStudyMemoryService.getInstance();
