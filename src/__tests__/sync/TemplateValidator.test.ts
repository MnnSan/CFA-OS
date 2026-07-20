import { describe, it, expect } from 'vitest';
import { TemplateValidator } from '../../services/sync/TemplateValidator';

describe('TemplateValidator', () => {
  const validTemplate = {
    id: 'tmpl-1',
    name: 'Test Plan',
    version: 1,
    updatedAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    status: 'ACTIVE',
    blocks: []
  };

  describe('validateTemplate', () => {
    it('passes a valid template', () => {
      const result = TemplateValidator.validateTemplate(validTemplate);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects null', () => {
      const result = TemplateValidator.validateTemplate(null);
      expect(result.valid).toBe(false);
    });

    it('rejects undefined', () => {
      const result = TemplateValidator.validateTemplate(undefined);
      expect(result.valid).toBe(false);
    });

    it('rejects template missing id', () => {
      const result = TemplateValidator.validateTemplate({ ...validTemplate, id: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('id'))).toBe(true);
    });

    it('rejects template with empty name', () => {
      const result = TemplateValidator.validateTemplate({ ...validTemplate, name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('name'))).toBe(true);
    });

    it('rejects template missing version', () => {
      const result = TemplateValidator.validateTemplate({ ...validTemplate, version: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('version'))).toBe(true);
    });

    it('rejects template with non-numeric version', () => {
      const result = TemplateValidator.validateTemplate({ ...validTemplate, version: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('version'))).toBe(true);
    });

    it('rejects template missing updatedAt', () => {
      const result = TemplateValidator.validateTemplate({ ...validTemplate, updatedAt: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('updatedat'))).toBe(true);
    });

    it('rejects template missing createdAt', () => {
      const result = TemplateValidator.validateTemplate({ ...validTemplate, createdAt: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('createdat'))).toBe(true);
    });
  });

  describe('repairTemplate', () => {
    it('repairs missing id', () => {
      const errors: string[] = [];
      const repaired = TemplateValidator.repairTemplate({ ...validTemplate, id: undefined }, errors);
      expect(repaired.id).toBeTruthy();
      expect(typeof repaired.id).toBe('string');
      expect(errors.some(e => e.startsWith('Repaired'))).toBe(true);
    });

    it('repairs empty name', () => {
      const errors: string[] = [];
      const repaired = TemplateValidator.repairTemplate({ ...validTemplate, name: '' }, errors);
      expect(repaired.name).toBe('Unnamed Template');
    });

    it('repairs missing version', () => {
      const errors: string[] = [];
      const repaired = TemplateValidator.repairTemplate({ ...validTemplate, version: undefined }, errors);
      expect(repaired.version).toBe(1);
    });

    it('repairs missing updatedAt', () => {
      const errors: string[] = [];
      const repaired = TemplateValidator.repairTemplate({ ...validTemplate, updatedAt: undefined }, errors);
      expect(repaired.updatedAt).toBeTruthy();
    });

    it('initializes blocks as empty array if missing', () => {
      const errors: string[] = [];
      const repaired = TemplateValidator.repairTemplate({ ...validTemplate, blocks: undefined }, errors);
      expect(Array.isArray(repaired.blocks)).toBe(true);
      expect(repaired.blocks).toHaveLength(0);
    });

    it('creates semanticVersion if missing', () => {
      const errors: string[] = [];
      const repaired = TemplateValidator.repairTemplate({ ...validTemplate, semanticVersion: undefined }, errors);
      expect(repaired.semanticVersion).toBeTruthy();
      expect(repaired.semanticVersion.coachPlanVersion).toBe(1);
    });
  });

  describe('validateStrategy', () => {
    it('passes a valid strategy', () => {
      const result = TemplateValidator.validateStrategy({ id: 'strat-1', name: 'Default' });
      expect(result.valid).toBe(true);
    });

    it('rejects null strategy', () => {
      const result = TemplateValidator.validateStrategy(null);
      expect(result.valid).toBe(false);
    });

    it('repairs missing name', () => {
      const result = TemplateValidator.validateStrategy({ id: 'strat-1' });
      expect(result.valid).toBe(false);
      expect(result.strategyRepaired?.name).toBe('Default Strategy');
    });
  });

  describe('assertValidTemplate', () => {
    it('does not throw for valid template', () => {
      expect(() => TemplateValidator.assertValidTemplate(validTemplate)).not.toThrow();
    });

    it('throws for invalid template', () => {
      expect(() => TemplateValidator.assertValidTemplate({})).toThrow();
    });
  });
});
