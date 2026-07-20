import { TimelineTemplate, StudyStrategy, SemanticVersion } from '../../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  repaired?: TimelineTemplate;
  strategyRepaired?: StudyStrategy;
}

export class TemplateValidator {
  private static REQUIRED_TEMPLATE_FIELDS = ['id', 'name', 'version', 'updatedAt'] as const;

  static validateTemplate(template: any): ValidationResult {
    const errors: string[] = [];

    if (!template || typeof template !== 'object') {
      return { valid: false, errors: ['Template is null or not an object'] };
    }

    if (!template.id || typeof template.id !== 'string') {
      errors.push('Missing required id');
    }

    if (!template.name || typeof template.name !== 'string' || template.name.trim().length === 0) {
      errors.push('Missing required name');
    }

    if (template.version === undefined || template.version === null || typeof template.version !== 'number') {
      errors.push('Missing required version (number)');
    }

    if (!template.updatedAt || typeof template.updatedAt !== 'string') {
      errors.push('Missing required updatedAt (ISO string)');
    }

    if (!template.createdAt || typeof template.createdAt !== 'string') {
      errors.push('Missing required createdAt (ISO string)');
    }

    if (errors.length === 0) {
      return { valid: true, errors: [] };
    }

    const repaired = this.repairTemplate(template, errors);
    return { valid: errors.length === 0, errors: errors.filter(e => !e.startsWith('Repaired:')), repaired };
  }

  static repairTemplate(template: any, errors: string[]): TimelineTemplate {
    const repaired = { ...template };
    const repairLog: string[] = [];

    if (!repaired.id || typeof repaired.id !== 'string') {
      repaired.id = `tmpl-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
      repairLog.push('Repaired: Generated new id');
    }

    if (!repaired.name || typeof repaired.name !== 'string' || repaired.name.trim().length === 0) {
      repaired.name = 'Unnamed Template';
      repairLog.push('Repaired: Set default name');
    }

    if (repaired.version === undefined || repaired.version === null || typeof repaired.version !== 'number') {
      repaired.version = 1;
      repairLog.push('Repaired: Set default version');
    }

    if (!repaired.updatedAt || typeof repaired.updatedAt !== 'string') {
      repaired.updatedAt = new Date().toISOString();
      repairLog.push('Repaired: Set current updatedAt');
    }

    if (!repaired.createdAt || typeof repaired.createdAt !== 'string') {
      repaired.createdAt = new Date().toISOString();
      repairLog.push('Repaired: Set current createdAt');
    }

    if (!repaired.status) {
      repaired.status = repaired.archived ? 'ARCHIVED' : 'ACTIVE';
    }

    if (!repaired.semanticVersion) {
      repaired.semanticVersion = {
        coachPlanVersion: repaired.version || 1,
        studyStrategyVersion: 1,
        schemaVersion: 1,
        resourceVersion: 1
      };
    }

    if (!repaired.isEditable) {
      repaired.isEditable = true;
    }

    if (!Array.isArray(repaired.blocks)) {
      repaired.blocks = [];
    }

    errors.push(...repairLog.map(l => `Repaired: ${l}`));
    return repaired as TimelineTemplate;
  }

  static validateStrategy(strategy: any): ValidationResult {
    const errors: string[] = [];

    if (!strategy || typeof strategy !== 'object') {
      return { valid: false, errors: ['Strategy is null or not an object'] };
    }

    if (!strategy.id || typeof strategy.id !== 'string') {
      errors.push('Missing required strategy id');
    }

    if (!strategy.name || typeof strategy.name !== 'string') {
      errors.push('Missing required strategy name');
    }

    if (errors.length > 0) {
      const repaired = { ...strategy };
      if (!repaired.id) repaired.id = `strat-${Date.now()}`;
      if (!repaired.name) repaired.name = 'Default Strategy';
      return { valid: false, errors, strategyRepaired: repaired };
    }

    return { valid: true, errors: [] };
  }

  static assertValidTemplate(template: any): asserts template is TimelineTemplate {
    const result = TemplateValidator.validateTemplate(template);
    if (!result.valid) {
      throw new Error(`Template validation failed: ${result.errors.join('; ')}`);
    }
  }
}
