/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subject, Reading, LearningOutcomeStatement, Formula, Resource, StudyNote, StudySession } from '../types';
import { RelationshipType } from './RelationshipTypes';
import { ProfileMetrics } from './GraphBuildProfiler';

/**
 * Status tiers representing the student's mastery level over a specific concept node.
 */
export enum KnowledgeStatus {
  UNKNOWN = 'UNKNOWN',
  DISCOVERED = 'DISCOVERED',
  READING = 'READING',
  STUDYING = 'STUDYING',
  MASTERING = 'MASTERING',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Valid node categories representing primary educational structures and assets.
 */
export type KnowledgeNodeType =
  | 'Subject'
  | 'Reading'
  | 'LOS'
  | 'Formula'
  | 'Study Note'
  | 'Resource'
  | 'Study Session'
  | 'Bookmark'
  | 'AI Explanation'
  | 'NotebookLM Chunk'
  | 'Flashcard'
  | 'Revision Card';

/**
 * Encapsulated metadata schema grouping future extension payloads together.
 */
export interface NodeMetadata {
  status: KnowledgeStatus;
  ai?: {
    aiSummary?: string;
    aiExplanation?: string;
    aiQuiz?: any;
    aiEssayPrompt?: string;
    aiMisconceptions?: string[];
    aiConfidenceEstimate?: number | null;
    aiTutorNotes?: string;
  };
  notebookLM?: {
    notebookLMChunkIds?: string[];
    embeddingIds?: string[];
    sourcePdfIds?: string[];
    chunkReferences?: string[];
    vectorIds?: string[];
    groundingSources?: string[];
  };
  search?: {
    normalizedTitle: string;
    keywords: string[];
    aliases: string[];
    searchTokens: string[];
    embeddingHash?: string;
    semanticScore?: number;
  };
  custom?: Record<string, any>;
}

/**
 * Standard semantic Knowledge Node representing a single structural entity.
 */
export interface KnowledgeNode {
  id: string; // Persistent UUID
  type: KnowledgeNodeType;
  title: string;
  description: string;
  createdDate: string; // ISO String
  modifiedDate: string; // ISO String
  tags: string[];
  difficulty: 'Easy' | 'Medium' | 'Intermediate' | 'Hard' | 'Unspecified';
  confidence: number | null; // Qualitative recall rating (1-5)
  parentIds: string[];
  childIds: string[];
  relatedIds: string[];
  metadata: NodeMetadata;
  referenceCount: number; // Incoming references count
  relationshipCount: number; // Total degrees (incoming + outgoing)
  searchWeight: number; // Search index rank boost
}

/**
 * Strongly typed directional relationship edge.
 */
export interface KnowledgeRelationship {
  source: string; // Source Node UUID
  target: string; // Target Node UUID
  type: RelationshipType;
  weight: number; // Defaults to 1.0
  relationshipStrength: number; // Correlation scale from 0.0 to 1.0
  createdBy: 'SYSTEM' | 'USER' | 'AI' | 'NotebookLM' | 'OCR' | 'Firebase' | 'Manual Import';
  creationDate: string; // ISO String
  metadata: Record<string, any>;
  confidence: number | null; // 1-5 validation score
}

/**
 * Versioned graph build diagnostics.
 */
export interface GraphStatistics {
  version: number;
  createdAt: string;
  lastBuilt: string;
  buildDurationMs: number;
  nodeCount: number;
  edgeCount: number;
  clusterCount: number;
  averageDegree: number;
  density: number;
  connectedComponents: number;
  validationErrors: number;
  validationWarnings: number;
}

/**
 * Aggregated graph health telemetry.
 */
export interface GraphHealth {
  orphanNodes: string[];
  isolatedClusters: string[][];
  duplicateEdges: string[];
  brokenLinks: string[];
  weakKnowledge: string[];
  coverageScore: number; // Percentage of completed syllabus nodes
  overallHealthScore: number; // Health rating from 0 to 100
}

/**
 * Struct representing node/edge delta changes between two versions.
 */
export interface GraphChangeSet {
  addedNodes: string[];
  removedNodes: string[];
  updatedNodes: string[];
  addedEdges: string[]; // Edge keys: "source:type:target"
  removedEdges: string[]; // Edge keys
}

/**
 * Compilation meta details.
 */
export interface GraphMetadata {
  buildReason: string;
  eventTrigger: string | null;
  builderVersion: string;
  repositoryVersion: number;
  buildStarted: string;
  buildFinished: string;
  buildHash?: string;
  profileMetrics?: ProfileMetrics;
}

/**
 * Pure compilable data snapshot representing state repositories.
 */
export interface RepositorySnapshot {
  subjects: Subject[];
  readings: Reading[];
  losList: LearningOutcomeStatement[];
  notes: StudyNote[];
  resources: Resource[];
  sessionHistory: StudySession[];
  formulas: Formula[];
}
