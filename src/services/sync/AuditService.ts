/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { coachPlanRepository } from '../../repositories/CoachPlanRepository';
import { studyStrategyRepository } from '../../repositories/StudyStrategyRepository';
import { INITIAL_2027_SUBJECTS, INITIAL_2027_READINGS } from '../../applications/cfa/curriculum/data/initialCurriculum';

export interface AuditResult {
  templates: 'PASS' | 'FAIL';
  strategy: 'PASS' | 'FAIL';
  readings: 'PASS' | 'FAIL';
  resources: 'PASS' | 'FAIL';
  details: string[];
}

export class AuditService {
  /**
   * Performs a complete integrity audit across all repositories.
   */
  public static audit(): AuditResult {
    const details: string[] = [];
    let templatesResult: 'PASS' | 'FAIL' = 'PASS';
    let strategyResult: 'PASS' | 'FAIL' = 'PASS';
    let readingsResult: 'PASS' | 'FAIL' = 'PASS';
    let resourcesResult: 'PASS' | 'FAIL' = 'PASS';

    // 1. Audit Templates (CoachPlanRepository)
    try {
      const templates = coachPlanRepository.getAll();
      const activeId = coachPlanRepository.getActiveTemplateId();
      
      if (activeId && !templates.some(t => t.id === activeId)) {
        templatesResult = 'FAIL';
        details.push(`Templates: Active template ID "${activeId}" not found in templates database.`);
      }

      templates.forEach(t => {
        if (!t.id || !t.name) {
          templatesResult = 'FAIL';
          details.push(`Templates: Found template missing required id/name.`);
        }
        if (t.version === undefined || t.version === null || typeof t.version !== 'number') {
          templatesResult = 'FAIL';
          details.push(`Templates: [${t.id || 'unknown'}] Missing required version.`);
        }
        if (!t.updatedAt || typeof t.updatedAt !== 'string') {
          templatesResult = 'FAIL';
          details.push(`Templates: [${t.id || 'unknown'}] Missing required updatedAt.`);
        }
        if (t.blocks) {
          t.blocks.forEach(b => {
            if (new Date(b.startDate).getTime() > new Date(b.endDate).getTime()) {
              templatesResult = 'FAIL';
              details.push(`Templates: [${t.name}] Block "${b.id}" has invalid date range: ${b.startDate} > ${b.endDate}`);
            }
          });
        }
      });
      if (templatesResult === 'PASS') details.push("Templates Repository: Integrity verified (PASS).");
    } catch (e: any) {
      templatesResult = 'FAIL';
      details.push(`Templates: Audit crashed with error: ${e.message}`);
    }

    // 2. Audit Study Strategy
    try {
      const strategy = studyStrategyRepository.get();
      if (strategy) {
        if (!strategy.firstSubjectId) {
          strategyResult = 'FAIL';
          details.push("Strategy: Strategy missing firstSubjectId.");
        }
        if (strategy.firstSubjectId && !INITIAL_2027_SUBJECTS.some(s => s.id === strategy.firstSubjectId)) {
          strategyResult = 'FAIL';
          details.push(`Strategy: Invalid firstSubjectId "${strategy.firstSubjectId}" (Subject not found).`);
        }
      }
      if (strategyResult === 'PASS') details.push("Strategy Repository: Integrity verified (PASS).");
    } catch (e: any) {
      strategyResult = 'FAIL';
      details.push(`Strategy: Audit crashed with error: ${e.message}`);
    }

    // 3. Audit Readings
    try {
      INITIAL_2027_READINGS.forEach(r => {
        if (!INITIAL_2027_SUBJECTS.some(s => s.id === r.subjectId)) {
          readingsResult = 'FAIL';
          details.push(`Readings: Reading "${r.title}" is linked to non-existent subject ID: ${r.subjectId}`);
        }
      });
      if (readingsResult === 'PASS') details.push("Readings Repository: Integrity verified (PASS).");
    } catch (e: any) {
      readingsResult = 'FAIL';
      details.push(`Readings: Audit crashed with error: ${e.message}`);
    }

    // 4. Audit Resources
    try {
      if (INITIAL_2027_READINGS.length === 0) {
        resourcesResult = 'FAIL';
        details.push("Resources: Reading list is empty.");
      }
      if (resourcesResult === 'PASS') details.push("Resources Repository: Integrity verified (PASS).");
    } catch (e: any) {
      resourcesResult = 'FAIL';
      details.push(`Resources: Audit crashed with error: ${e.message}`);
    }

    return {
      templates: templatesResult,
      strategy: strategyResult,
      readings: readingsResult,
      resources: resourcesResult,
      details
    };
  }
}
