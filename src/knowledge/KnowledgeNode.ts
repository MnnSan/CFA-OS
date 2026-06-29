/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subject, Reading, LearningOutcomeStatement, Formula, Resource, StudyNote, StudySession } from '../types';
import { KnowledgeNode, KnowledgeStatus, NodeMetadata } from './KnowledgeTypes';

/**
 * Creates standardized search tokens from title text.
 */
function compileSearchMetadata(title: string, tags: string[]): NonNullable<NodeMetadata['search']> {
  const normalizedTitle = title.toLowerCase().trim();
  const keywords = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
  const searchTokens = [...keywords, ...tags.map(t => t.toLowerCase())];

  return {
    normalizedTitle,
    keywords,
    aliases: [],
    searchTokens
  };
}

/**
 * Maps a Subject object to a KnowledgeNode.
 */
export function mapSubjectToNode(sub: Subject, childReadingIds: string[]): KnowledgeNode {
  const tags = ['subject', sub.code.toLowerCase()];
  return {
    id: sub.id,
    type: 'Subject',
    title: sub.name,
    description: sub.description || '',
    createdDate: new Date('2026-01-01').toISOString(),
    modifiedDate: new Date('2026-06-28').toISOString(),
    tags,
    difficulty: 'Unspecified',
    confidence: null,
    parentIds: [],
    childIds: childReadingIds,
    relatedIds: [],
    referenceCount: 0,
    relationshipCount: 0,
    searchWeight: 1.5,
    metadata: {
      status: KnowledgeStatus.DISCOVERED,
      search: compileSearchMetadata(sub.name, tags)
    }
  };
}

/**
 * Maps a Reading object to a KnowledgeNode.
 */
export function mapReadingToNode(rd: Reading, childLOSIds: string[]): KnowledgeNode {
  const tags = ['reading', `reading-${rd.number}`];
  return {
    id: rd.id,
    type: 'Reading',
    title: `Reading ${rd.number}: ${rd.title}`,
    description: rd.description || '',
    createdDate: new Date('2026-01-01').toISOString(),
    modifiedDate: new Date('2026-06-28').toISOString(),
    tags,
    difficulty: rd.difficulty || 'Unspecified',
    confidence: null,
    parentIds: [rd.subjectId],
    childIds: childLOSIds,
    relatedIds: [],
    referenceCount: 0,
    relationshipCount: 0,
    searchWeight: 1.2,
    metadata: {
      status: KnowledgeStatus.DISCOVERED,
      search: compileSearchMetadata(rd.title, tags)
    }
  };
}

/**
 * Maps an LOS object to a KnowledgeNode.
 */
export function mapLOSToNode(los: LearningOutcomeStatement): KnowledgeNode {
  const tags = ['los', los.code.toLowerCase()];
  let status = KnowledgeStatus.DISCOVERED;
  if (los.status === 'Completed') {
    status = KnowledgeStatus.MASTERING;
  } else if (los.status === 'In Progress') {
    status = KnowledgeStatus.STUDYING;
  }

  return {
    id: los.id,
    type: 'LOS',
    title: `LOS ${los.code}`,
    description: los.statement,
    createdDate: new Date('2026-01-01').toISOString(),
    modifiedDate: los.lastReviewed ? new Date(los.lastReviewed).toISOString() : new Date('2026-06-28').toISOString(),
    tags,
    difficulty: los.difficulty || 'Unspecified',
    confidence: los.confidence,
    parentIds: [los.readingId],
    childIds: [],
    relatedIds: los.relatedLOS || [],
    referenceCount: 0,
    relationshipCount: 0,
    searchWeight: 1.0,
    metadata: {
      status,
      search: compileSearchMetadata(los.statement, tags)
    }
  };
}

/**
 * Maps a Formula object to a KnowledgeNode.
 */
export function mapFormulaToNode(formula: Formula): KnowledgeNode {
  const tags = ['formula', 'equation'];
  const parentIds: string[] = [];
  if (formula.linkedReadingId) parentIds.push(formula.linkedReadingId);
  if (formula.linkedLOSId) parentIds.push(formula.linkedLOSId);

  const currentMastery = formula.masterySteps || {
    equation: false,
    variables: false,
    assumptions: false,
    limitations: false,
    apply: false
  };

  const completedStepsCount = Object.values(currentMastery).filter(Boolean).length;
  const isMastered = completedStepsCount === 5;
  const isStudying = completedStepsCount > 0;
  const status = isMastered 
    ? KnowledgeStatus.MASTERING 
    : isStudying 
      ? KnowledgeStatus.STUDYING 
      : KnowledgeStatus.DISCOVERED;

  const confidence = formula.confidenceRating || (formula.isMemorized ? 5 : null);

  return {
    id: formula.id,
    type: 'Formula',
    title: formula.name,
    description: formula.description,
    createdDate: new Date('2026-06-01').toISOString(),
    modifiedDate: new Date('2026-06-28').toISOString(),
    tags,
    difficulty: 'Unspecified',
    confidence,
    parentIds,
    childIds: [],
    relatedIds: [],
    referenceCount: 0,
    relationshipCount: 0,
    searchWeight: 1.1,
    metadata: {
      status,
      search: compileSearchMetadata(formula.name, tags),
      custom: {
        latexExpression: formula.latexExpression,
        variables: formula.variables,
        strategicNuances: formula.strategicNuances || [],
        examPitfalls: formula.examPitfalls || [],
        masterySteps: currentMastery,
        confidenceRating: formula.confidenceRating || null
      }
    }
  };
}

/**
 * Maps a Resource/Asset object to a KnowledgeNode.
 */
export function mapResourceToNode(res: Resource): KnowledgeNode {
  const tags = [
    'resource', 
    res.category.toLowerCase(), 
    res.fileType.toLowerCase(),
    ...(res.tags || []).map(t => t.toLowerCase())
  ];
  const parentIds: string[] = [];
  if (res.linkedReadingId) parentIds.push(res.linkedReadingId);
  if (res.linkedLOSId) parentIds.push(res.linkedLOSId);

  // Map progress to status
  let status = KnowledgeStatus.DISCOVERED;
  if (res.status !== 'Ready') {
    status = KnowledgeStatus.DISCOVERED;
  } else if (res.readingProgress > 0 && res.readingProgress < 100) {
    status = KnowledgeStatus.STUDYING;
  } else if (res.readingProgress === 100) {
    status = KnowledgeStatus.MASTERING;
  }

  return {
    id: res.id,
    type: 'Resource',
    title: res.name,
    description: res.description || '',
    createdDate: new Date(res.dateAdded).toISOString(),
    modifiedDate: res.lastReadAt ? new Date(res.lastReadAt).toISOString() : new Date(res.dateAdded).toISOString(),
    tags,
    difficulty: res.metadata?.difficulty || 'Unspecified',
    confidence: res.personalRating || null,
    parentIds,
    childIds: [],
    relatedIds: [],
    referenceCount: 0,
    relationshipCount: 0,
    searchWeight: 0.9,
    metadata: {
      status,
      search: compileSearchMetadata(res.name, tags),
      custom: {
        category: res.category,
        url: res.url,
        fileType: res.fileType,
        fileSize: res.fileSize,
        isFavorite: res.isFavorite,
        personalRating: res.personalRating,
        status: res.status,
        readingProgress: res.readingProgress,
        lastReadPage: res.lastReadPage,
        lastReadAt: res.lastReadAt,
        manifest: res.manifest,
        chunksCount: res.chunks?.length || 0,
        annotationsCount: res.annotations?.length || 0,
        highlightsCount: res.highlightsList?.length || 0
      }
    }
  };
}

/**
 * Maps a StudyNote object to a KnowledgeNode.
 */
export function mapNoteToNode(note: StudyNote): KnowledgeNode {
  const tags = ['note', 'candidate-content'];
  const parentIds: string[] = [];
  if (note.linkedReadingId) parentIds.push(note.linkedReadingId);
  if (note.linkedLOSId) parentIds.push(note.linkedLOSId);

  return {
    id: note.id,
    type: 'Study Note',
    title: note.title,
    description: note.content.substring(0, 300) + '...',
    createdDate: new Date(note.createdTime).toISOString(),
    modifiedDate: new Date(note.updatedTime).toISOString(),
    tags,
    difficulty: 'Unspecified',
    confidence: note.isFavorite ? 5 : null,
    parentIds,
    childIds: [],
    relatedIds: [],
    referenceCount: 0,
    relationshipCount: 0,
    searchWeight: 1.3,
    metadata: {
      status: KnowledgeStatus.READING,
      search: compileSearchMetadata(note.title, tags),
      custom: {
        isFavorite: note.isFavorite,
        pinned: note.pinned
      }
    }
  };
}

/**
 * Maps a StudySession object to a KnowledgeNode.
 */
export function mapSessionToNode(session: StudySession): KnowledgeNode {
  const tags = ['session', 'telemetry'];
  const parentIds: string[] = [];
  if (session.linkedReadingId) parentIds.push(session.linkedReadingId);
  if (session.linkedLOSId) parentIds.push(session.linkedLOSId);

  return {
    id: session.id,
    type: 'Study Session',
    title: `Study Session (${session.durationMinutes}m)`,
    description: `Focus Score: ${session.mentalFocusScore || 'Unrecorded'}/10`,
    createdDate: new Date(session.startTime).toISOString(),
    modifiedDate: session.endTime ? new Date(session.endTime).toISOString() : new Date(session.startTime).toISOString(),
    tags,
    difficulty: 'Unspecified',
    confidence: session.confidenceAfter,
    parentIds,
    childIds: [],
    relatedIds: [],
    referenceCount: 0,
    relationshipCount: 0,
    searchWeight: 0.8,
    metadata: {
      status: KnowledgeStatus.ARCHIVED,
      search: compileSearchMetadata(`Study Session ${session.startTime}`, tags),
      custom: {
        durationMinutes: session.durationMinutes,
        mentalFocusScore: session.mentalFocusScore,
        confidenceBefore: session.confidenceBefore,
        confidenceAfter: session.confidenceAfter,
        status: session.status
      }
    }
  };
}
