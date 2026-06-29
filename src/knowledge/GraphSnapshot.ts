/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReadonlyGraph } from './KnowledgeGraph';
import { GraphStatistics, GraphHealth, GraphChangeSet, GraphMetadata } from './KnowledgeTypes';

/**
 * High-value cluster wrapping progress statistics for a syllabus topic node.
 */
export interface KnowledgeCluster {
  readonly id: string; // e.g., subjectId
  readonly name: string;
  readonly nodeCount: number;
  readonly completionPercentage: number;
  readonly averageConfidence: number;
  readonly studyHours: number;
  readonly relationshipDensity: number;
  readonly revisionPriority: number;
}

/**
 * Standard compiled Snapshot containing immutable graph states, health telemetry, and cluster statistics.
 */
export interface GraphSnapshot {
  readonly graphId: string;
  readonly graph: ReadonlyGraph;
  readonly statistics: GraphStatistics;
  readonly health: GraphHealth;
  readonly metadata: GraphMetadata;
  readonly changeSet: GraphChangeSet;
  readonly clusters: readonly KnowledgeCluster[];
}
