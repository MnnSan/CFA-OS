/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimelineTemplate, TimelineBlock, TemplateStatus, SemanticVersion } from '../types';
import { eventBus } from '../services/EventBus';

export class CoachPlanRepository {
  private static instance: CoachPlanRepository;
  private templates: TimelineTemplate[] = [];
  private activeTemplateId: string | null = null;
  
  // Transaction State
  private inTransaction = false;
  private backupTemplates: string = '[]';
  private backupActiveId: string | null = null;

  private constructor() {
    this.loadFromCache();
  }

  public static getInstance(): CoachPlanRepository {
    if (!CoachPlanRepository.instance) {
      CoachPlanRepository.instance = new CoachPlanRepository();
    }
    return CoachPlanRepository.instance;
  }

  private loadFromCache() {
    try {
      const saved = localStorage.getItem('cfa_timeline_templates');
      if (saved) {
        this.templates = JSON.parse(saved);
      }
      this.activeTemplateId = localStorage.getItem('cfa_active_template_id');
      
      // Ensure templates have status, version, and semanticVersion initialized
      let updated = false;
      this.templates = this.templates.map(t => {
        let changed = false;
        if (!t.status) {
          t.status = t.archived ? 'ARCHIVED' : 'ACTIVE';
          changed = true;
        }
        if (!t.semanticVersion) {
          t.semanticVersion = {
            coachPlanVersion: t.version || 1,
            studyStrategyVersion: 1,
            schemaVersion: 1,
            resourceVersion: 1
          };
          changed = true;
        }
        if (changed) updated = true;
        return t;
      });
      if (updated) {
        localStorage.setItem('cfa_timeline_templates', JSON.stringify(this.templates));
      }
    } catch (e) {
      console.error("CoachPlanRepository: Failed to load templates from cache", e);
    }
  }

  // --- Transactions ---

  public beginTransaction() {
    if (this.inTransaction) {
      throw new Error("CoachPlanRepository: Transaction already in progress");
    }
    this.inTransaction = true;
    this.backupTemplates = JSON.stringify(this.templates);
    this.backupActiveId = this.activeTemplateId;
  }

  public commit() {
    if (!this.inTransaction) {
      throw new Error("CoachPlanRepository: No transaction to commit");
    }
    this.inTransaction = false;
    
    // Save to Cache
    localStorage.setItem('cfa_timeline_templates', JSON.stringify(this.templates));
    if (this.activeTemplateId) {
      localStorage.setItem('cfa_active_template_id', this.activeTemplateId);
    } else {
      localStorage.removeItem('cfa_active_template_id');
    }

    // Publish to EventBus
    eventBus.publish({
      type: 'TimelineTemplateUpdated',
      timestamp: new Date().toISOString(),
      source: 'CoachPlanRepository',
      entityId: 'all',
      payload: { templates: this.getAllActive(), activeTemplateId: this.activeTemplateId }
    });
  }

  public rollback() {
    if (!this.inTransaction) {
      throw new Error("CoachPlanRepository: No transaction to rollback");
    }
    this.inTransaction = false;
    this.templates = JSON.parse(this.backupTemplates);
    this.activeTemplateId = this.backupActiveId;
  }

  // --- Queries & Mutations ---

  public getAll(): TimelineTemplate[] {
    return [...this.templates];
  }

  public getAllActive(): TimelineTemplate[] {
    return this.templates.filter(t => t.status !== 'DELETED');
  }

  public getById(id: string): TimelineTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }

  public getActiveTemplateId(): string | null {
    return this.activeTemplateId;
  }

  public setActiveTemplateId(id: string | null) {
    this.activeTemplateId = id;
  }

  public save(template: TimelineTemplate) {
    const idx = this.templates.findIndex(t => t.id === template.id);
    const updatedTemplate = { ...template };
    
    // Initialize/Increment Semantic Version
    if (!updatedTemplate.status) {
      updatedTemplate.status = 'ACTIVE';
    }
    
    const currentSemVer = template.semanticVersion || {
      coachPlanVersion: 0,
      studyStrategyVersion: 1,
      schemaVersion: 1,
      resourceVersion: 1
    };

    updatedTemplate.semanticVersion = {
      ...currentSemVer,
      coachPlanVersion: currentSemVer.coachPlanVersion + 1
    };
    updatedTemplate.updatedAt = new Date().toISOString();

    if (idx >= 0) {
      this.templates[idx] = updatedTemplate;
    } else {
      this.templates.push(updatedTemplate);
    }
  }

  public updateBlocks(id: string, blocks: TimelineBlock[]) {
    const template = this.getById(id);
    if (!template) return;
    this.save({
      ...template,
      blocks
    });
  }

  public rename(id: string, name: string) {
    const template = this.getById(id);
    if (!template) return;
    this.save({
      ...template,
      name
    });
  }

  public softDelete(id: string) {
    const template = this.getById(id);
    if (!template) return;
    this.save({
      ...template,
      status: 'DELETED'
    });
    if (this.activeTemplateId === id) {
      this.activeTemplateId = null;
    }
  }

  public archive(id: string) {
    const template = this.getById(id);
    if (!template) return;
    this.save({
      ...template,
      status: 'ARCHIVED',
      archived: true
    });
  }

  public duplicate(id: string): TimelineTemplate | null {
    const source = this.getById(id);
    if (!source) return null;
    const now = new Date().toISOString();
    const duplicated: TimelineTemplate = {
      id: `${source.id}-dup-${Date.now()}`,
      name: `${source.name} (Copy)`,
      description: source.description,
      isEditable: true,
      blocks: JSON.parse(JSON.stringify(source.blocks)),
      createdAt: now,
      updatedAt: now,
      status: 'ACTIVE',
      version: 1,
      semanticVersion: {
        coachPlanVersion: 1,
        studyStrategyVersion: 1,
        schemaVersion: 1,
        resourceVersion: 1
      }
    };
    this.save(duplicated);
    this.activeTemplateId = duplicated.id;
    return duplicated;
  }
  
  // Set all templates (e.g. from Cloud sync or repair)
  public setTemplates(templates: TimelineTemplate[]) {
    this.templates = templates;
  }
}

export const coachPlanRepository = CoachPlanRepository.getInstance();
