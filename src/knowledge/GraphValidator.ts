/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KnowledgeNode, KnowledgeRelationship } from './KnowledgeTypes';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validator class executing structural integrity diagnostics.
 */
export class GraphValidator {
  /**
   * Scans nodes and relationships, compiling an evaluation report.
   */
  public static validate(
    nodes: Map<string, KnowledgeNode>,
    edges: KnowledgeRelationship[]
  ): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    const registeredIds = new Set<string>();
    const edgeKeys = new Set<string>();

    // Regex to validate alphanumeric with dashes/underscores (UUIDs and our custom node IDs)
    const validIdRegex = /^[a-zA-Z0-9\-_]+$/;
    const rfc4122Regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    // 1. Validate Nodes
    nodes.forEach((node, id) => {
      // Duplicate ID check
      if (registeredIds.has(id)) {
        errors.push(`Duplicate ID detected: Node '${node.title}' has an ID '${id}' that is already registered.`);
      }
      registeredIds.add(id);

      // ID pattern check
      if (!validIdRegex.test(id)) {
        errors.push(`Invalid ID format: Node ID '${id}' contains invalid characters.`);
      }

      // Check standard RFC4122 compliance for curriculum nodes
      if ((node.type === 'Subject' || node.type === 'Reading' || node.type === 'LOS') && !rfc4122Regex.test(id)) {
        warnings.push(`Curriculum Node '${node.title}' (ID: '${id}') is not a standard RFC4122 UUID.`);
      }

      // Invalid node types
      const validTypes = new Set([
        'Subject',
        'Reading',
        'LOS',
        'Formula',
        'Study Note',
        'Resource',
        'Study Session',
        'Bookmark',
        'AI Explanation',
        'NotebookLM Chunk',
        'Flashcard',
        'Revision Card'
      ]);
      if (!validTypes.has(node.type)) {
        errors.push(`Invalid Node Type: Node '${node.title}' (ID: '${id}') uses type '${node.type}'.`);
      }

      // Check parent IDs exists
      node.parentIds.forEach(parentId => {
        if (!nodes.has(parentId)) {
          errors.push(`Dangling Parent: Node '${node.title}' points to parent ID '${parentId}' which does not exist.`);
        }
      });

      // Check child IDs exists
      node.childIds.forEach(childId => {
        if (!nodes.has(childId)) {
          errors.push(`Dangling Child: Node '${node.title}' points to child ID '${childId}' which does not exist.`);
        }
      });

      // Missing metadata checks
      if (!node.metadata || !node.metadata.status) {
        errors.push(`Missing Status: Node '${node.title}' (ID: '${id}') lacks status metadata.`);
      }
      if (!node.metadata.search || !node.metadata.search.normalizedTitle) {
        warnings.push(`Missing Search Data: Node '${node.title}' (ID: '${id}') is missing search normalization tokens.`);
      }
    });

    // 2. Validate Relationships
    edges.forEach((edge, index) => {
      const edgeKey = `${edge.source}:${edge.type}:${edge.target}`;

      // Dangling link checks
      if (!nodes.has(edge.source)) {
        errors.push(`Broken Link Source: Edge at index ${index} points to non-existent source node ID '${edge.source}'.`);
      }
      if (!nodes.has(edge.target)) {
        errors.push(`Broken Link Target: Edge at index ${index} points to non-existent target node ID '${edge.target}'.`);
      }

      // Self-loops
      if (edge.source === edge.target) {
        errors.push(`Self-Loop: Edge at index ${index} represents a self-loop on node ID '${edge.source}'.`);
      }

      // Duplicate edges
      if (edgeKeys.has(edgeKey)) {
        warnings.push(`Duplicate Edge: Relationship '${edge.type}' between '${edge.source}' and '${edge.target}' is defined multiple times.`);
      }
      edgeKeys.add(edgeKey);

      // Strength boundaries
      if (edge.relationshipStrength < 0.0 || edge.relationshipStrength > 1.0) {
        errors.push(`Invalid Edge Strength: Edge ${edgeKey} has strength value ${edge.relationshipStrength} (must be 0.0 to 1.0).`);
      }
    });

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings
    };
  }
}
