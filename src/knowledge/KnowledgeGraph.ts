/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KnowledgeNode, KnowledgeRelationship } from './KnowledgeTypes';

/**
 * Immutable in-memory graph index database storing nodes, edges, and search categories.
 */
export interface ReadonlyGraph {
  readonly nodes: ReadonlyMap<string, KnowledgeNode>;
  readonly edges: ReadonlyMap<string, readonly KnowledgeRelationship[]>; // source-indexed
  readonly targetEdges: ReadonlyMap<string, readonly KnowledgeRelationship[]>; // target-indexed
  
  // Secondary indices
  readonly nodesByType: ReadonlyMap<string, readonly string[]>; // Node ID lists grouped by category
  readonly nodesByTag: ReadonlyMap<string, readonly string[]>; // Node ID lists grouped by tag string
  
  // Lineage & telemetry markers
  readonly graphId: string;
  readonly version: number;
  readonly previousVersion: string | null;
  readonly lastRebuilt: string;
  readonly buildDurationMs: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
}
