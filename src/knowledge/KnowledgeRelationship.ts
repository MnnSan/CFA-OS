/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RelationshipType } from './RelationshipTypes';
import { KnowledgeRelationship } from './KnowledgeTypes';

/**
 * Interface parameter pack for creating a relationship edge.
 */
interface RelationshipArgs {
  source: string;
  target: string;
  type: RelationshipType;
  weight?: number;
  strength?: number;
  createdBy?: KnowledgeRelationship['createdBy'];
  metadata?: Record<string, any>;
  confidence?: number | null;
}

/**
 * Core relationship factory that instantiates a directional KnowledgeRelationship edge.
 */
export function createRelationship({
  source,
  target,
  type,
  weight = 1.0,
  strength = 1.0,
  createdBy = 'SYSTEM',
  metadata = {},
  confidence = null
}: RelationshipArgs): KnowledgeRelationship {
  return {
    source,
    target,
    type,
    weight,
    relationshipStrength: strength,
    createdBy,
    creationDate: new Date().toISOString(),
    metadata,
    confidence
  };
}
