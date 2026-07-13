/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SemanticVersion } from '../../types';

export class MigrationService {
  public static CURRENT_SCHEMA_VERSION = 3;

  /**
   * Automatically migrates a document to the current schema version.
   */
  public static migrate(doc: any, docType: 'coachPlan' | 'studyStrategy'): any {
    if (!doc) return doc;

    let schemaVersion = doc.semanticVersion?.schemaVersion || doc.schemaVersion || 1;
    let migratedDoc = { ...doc };

    // Pipeline v1 -> v2 -> v3
    while (schemaVersion < MigrationService.CURRENT_SCHEMA_VERSION) {
      if (schemaVersion === 1) {
        migratedDoc = MigrationService.migrateV1ToV2(migratedDoc, docType);
        schemaVersion = 2;
      } else if (schemaVersion === 2) {
        migratedDoc = MigrationService.migrateV2ToV3(migratedDoc, docType);
        schemaVersion = 3;
      }
    }

    return migratedDoc;
  }

  // --- v1 to v2 Migration ---
  private static migrateV1ToV2(doc: any, docType: 'coachPlan' | 'studyStrategy'): any {
    console.log(`MigrationService: Migrating ${docType} v1 -> v2...`);
    const migrated = { ...doc };

    // Standardize Semantic Version Object
    if (!migrated.semanticVersion) {
      migrated.semanticVersion = {
        coachPlanVersion: docType === 'coachPlan' ? (doc.version || 1) : 1,
        studyStrategyVersion: docType === 'studyStrategy' ? (doc.version || 1) : 1,
        schemaVersion: 2,
        resourceVersion: 1
      };
    } else {
      migrated.semanticVersion.schemaVersion = 2;
    }

    // CoachPlan specific fields
    if (docType === 'coachPlan') {
      if (!migrated.status) {
        migrated.status = migrated.archived ? 'ARCHIVED' : 'ACTIVE';
      }
    }

    return migrated;
  }

  // --- v2 to v3 Migration ---
  private static migrateV2ToV3(doc: any, docType: 'coachPlan' | 'studyStrategy'): any {
    console.log(`MigrationService: Migrating ${docType} v2 -> v3...`);
    const migrated = { ...doc };

    // Set schema version to 3
    if (migrated.semanticVersion) {
      migrated.semanticVersion.schemaVersion = 3;
    } else {
      migrated.semanticVersion = {
        coachPlanVersion: docType === 'coachPlan' ? (doc.version || 1) : 1,
        studyStrategyVersion: docType === 'studyStrategy' ? (doc.version || 1) : 1,
        schemaVersion: 3,
        resourceVersion: 1
      };
    }

    // CoachPlan v3 fields: ensure completionStatistics map has full properties
    if (docType === 'coachPlan') {
      if (!migrated.completionStatistics) {
        migrated.completionStatistics = {
          totalBlocks: migrated.studyBlocks?.length || migrated.blocks?.length || 0,
          completedBlocks: 0,
          percentage: 0
        };
      }
    }

    return migrated;
  }
}
