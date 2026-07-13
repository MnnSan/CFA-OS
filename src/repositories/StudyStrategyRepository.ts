/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudyStrategy, SemanticVersion } from '../types';
import { eventBus } from '../services/EventBus';

export class StudyStrategyRepository {
  private static instance: StudyStrategyRepository;
  private strategy: StudyStrategy | null = null;

  // Transaction State
  private inTransaction = false;
  private backupStrategy: string | null = null;

  private constructor() {
    this.loadFromCache();
  }

  public static getInstance(): StudyStrategyRepository {
    if (!StudyStrategyRepository.instance) {
      StudyStrategyRepository.instance = new StudyStrategyRepository();
    }
    return StudyStrategyRepository.instance;
  }

  private loadFromCache() {
    try {
      const saved = localStorage.getItem('cfa_study_strategy');
      if (saved) {
        this.strategy = JSON.parse(saved);
        
        // Ensure semanticVersion initialized
        if (this.strategy && !this.strategy.semanticVersion) {
          this.strategy.semanticVersion = {
            coachPlanVersion: 1,
            studyStrategyVersion: this.strategy.version || 1,
            schemaVersion: 1,
            resourceVersion: 1
          };
          localStorage.setItem('cfa_study_strategy', JSON.stringify(this.strategy));
        }
      }
    } catch (e) {
      console.error("StudyStrategyRepository: Failed to load strategy from cache", e);
    }
  }

  // --- Transactions ---

  public beginTransaction() {
    if (this.inTransaction) {
      throw new Error("StudyStrategyRepository: Transaction already in progress");
    }
    this.inTransaction = true;
    this.backupStrategy = this.strategy ? JSON.stringify(this.strategy) : null;
  }

  public commit() {
    if (!this.inTransaction) {
      throw new Error("StudyStrategyRepository: No transaction to commit");
    }
    this.inTransaction = false;

    // Save to Cache
    if (this.strategy) {
      localStorage.setItem('cfa_study_strategy', JSON.stringify(this.strategy));
    } else {
      localStorage.removeItem('cfa_study_strategy');
    }

    // Publish to EventBus
    eventBus.publish({
      type: 'StudyStrategyUpdated',
      timestamp: new Date().toISOString(),
      source: 'StudyStrategyRepository',
      entityId: 'main',
      payload: { strategy: this.strategy }
    });
  }

  public rollback() {
    if (!this.inTransaction) {
      throw new Error("StudyStrategyRepository: No transaction to rollback");
    }
    this.inTransaction = false;
    this.strategy = this.backupStrategy ? JSON.parse(this.backupStrategy) : null;
  }

  // --- Queries & Mutations ---

  public get(): StudyStrategy | null {
    return this.strategy;
  }

  public set(strategy: StudyStrategy | null) {
    if (strategy) {
      const updated = { ...strategy };
      const currentSemVer = strategy.semanticVersion || {
        coachPlanVersion: 1,
        studyStrategyVersion: 0,
        schemaVersion: 1,
        resourceVersion: 1
      };
      
      updated.semanticVersion = {
        ...currentSemVer,
        studyStrategyVersion: currentSemVer.studyStrategyVersion + 1
      };
      updated.updatedAt = new Date().toISOString();
      this.strategy = updated;
    } else {
      this.strategy = null;
    }
  }

  public update(updates: Partial<StudyStrategy>) {
    if (!this.strategy) return;
    this.set({
      ...this.strategy,
      ...updates
    });
  }
}

export const studyStrategyRepository = StudyStrategyRepository.getInstance();
