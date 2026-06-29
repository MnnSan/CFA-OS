/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subject, Reading, LearningOutcomeStatement, Formula, Resource, StudyNote, StudySession } from '../types';
import { ReadonlyGraph } from './KnowledgeGraph';
import { 
  KnowledgeNode, 
  KnowledgeRelationship, 
  RepositorySnapshot, 
  GraphChangeSet, 
  GraphMetadata,
  GraphStatistics
} from './KnowledgeTypes';
import { RelationshipType } from './RelationshipTypes';
import { 
  mapSubjectToNode, 
  mapReadingToNode, 
  mapLOSToNode, 
  mapFormulaToNode, 
  mapResourceToNode, 
  mapNoteToNode, 
  mapSessionToNode 
} from './KnowledgeNode';
import { createRelationship } from './KnowledgeRelationship';
import { GraphValidator, ValidationReport } from './GraphValidator';
import { GraphBuildProfiler, ProfileMetrics } from './GraphBuildProfiler';

export interface BuildResult {
  graph: ReadonlyGraph;
  changeSet: GraphChangeSet;
  validationReport: ValidationReport;
  profile: ProfileMetrics;
}

/**
 * Pure compiler that transforms a RepositorySnapshot into an immutable ReadonlyGraph.
 */
export class KnowledgeGraphBuilder {
  /**
   * Compiles the graph and returns the frozen graph along with diff-change records and validation reports.
   */
  public static build(
    snapshot: RepositorySnapshot,
    previousGraph: ReadonlyGraph | null,
    metadataConfig: Omit<GraphMetadata, 'buildFinished' | 'nodeCount' | 'edgeCount'>
  ): BuildResult {
    const buildStart = new Date().toISOString();
    const profiler = new GraphBuildProfiler();
    profiler.start();
    
    const nodesMap = new Map<string, KnowledgeNode>();
    const edgesList: KnowledgeRelationship[] = [];

    // Helper map to quickly find readings by subject
    const readingsBySubject = new Map<string, string[]>();
    snapshot.readings.forEach(rd => {
      const list = readingsBySubject.get(rd.subjectId) || [];
      list.push(rd.id);
      readingsBySubject.set(rd.subjectId, list);
    });

    // Helper map to quickly find los by reading
    const losByReading = new Map<string, string[]>();
    snapshot.losList.forEach(los => {
      const list = losByReading.get(los.readingId) || [];
      list.push(los.id);
      losByReading.set(los.readingId, list);
    });

    // 1. Build Node Lists
    snapshot.subjects.forEach(sub => {
      const childIds = readingsBySubject.get(sub.id) || [];
      nodesMap.set(sub.id, mapSubjectToNode(sub, childIds));
    });

    snapshot.readings.forEach(rd => {
      const childIds = losByReading.get(rd.id) || [];
      nodesMap.set(rd.id, mapReadingToNode(rd, childIds));
    });

    snapshot.losList.forEach(los => {
      nodesMap.set(los.id, mapLOSToNode(los));
    });

    snapshot.formulas.forEach(form => {
      nodesMap.set(form.id, mapFormulaToNode(form));
    });

    snapshot.resources.forEach(res => {
      nodesMap.set(res.id, mapResourceToNode(res));
    });

    snapshot.notes.forEach(note => {
      nodesMap.set(note.id, mapNoteToNode(note));
    });

    snapshot.sessionHistory.forEach(session => {
      nodesMap.set(session.id, mapSessionToNode(session));
    });

    profiler.mark('nodesDone');

    // 2. Build Relationship Edges (Directional, strongly typed)
    
    // Subject -> Reading (Contains)
    snapshot.subjects.forEach(sub => {
      const childIds = readingsBySubject.get(sub.id) || [];
      childIds.forEach(rdId => {
        edgesList.push(createRelationship({
          source: sub.id,
          target: rdId,
          type: RelationshipType.CONTAINS,
          strength: 1.0,
          createdBy: 'SYSTEM'
        }));
      });
    });

    // Reading -> LOS (Contains)
    snapshot.readings.forEach(rd => {
      const childIds = losByReading.get(rd.id) || [];
      childIds.forEach(losId => {
        edgesList.push(createRelationship({
          source: rd.id,
          target: losId,
          type: RelationshipType.CONTAINS,
          strength: 1.0,
          createdBy: 'SYSTEM'
        }));
      });
    });

    // Formula relationships
    snapshot.formulas.forEach(form => {
      if (form.linkedReadingId) {
        // Formula belongs to Reading
        edgesList.push(createRelationship({
          source: form.id,
          target: form.linkedReadingId,
          type: RelationshipType.DEPENDS_ON,
          strength: 0.9,
          createdBy: 'SYSTEM'
        }));
        edgesList.push(createRelationship({
          source: form.linkedReadingId,
          target: form.id,
          type: RelationshipType.HAS_FORMULA,
          strength: 0.9,
          createdBy: 'SYSTEM'
        }));
      }
      if (form.linkedLOSId) {
        // Formula references/uses LOS
        edgesList.push(createRelationship({
          source: form.id,
          target: form.linkedLOSId,
          type: RelationshipType.USES,
          strength: 0.95,
          createdBy: 'SYSTEM'
        }));
        edgesList.push(createRelationship({
          source: form.linkedLOSId,
          target: form.id,
          type: RelationshipType.HAS_FORMULA,
          strength: 0.95,
          createdBy: 'SYSTEM'
        }));
      }
      if (form.linkedSubjectId) {
        // Formula references Subject
        edgesList.push(createRelationship({
          source: form.id,
          target: form.linkedSubjectId,
          type: RelationshipType.REFERENCES,
          strength: 0.5,
          createdBy: 'SYSTEM'
        }));
        edgesList.push(createRelationship({
          source: form.linkedSubjectId,
          target: form.id,
          type: RelationshipType.HAS_FORMULA,
          strength: 0.5,
          createdBy: 'SYSTEM'
        }));
      }
    });

    // Resource relationships (Enhanced for Sprint 7 Ingestion system)
    snapshot.resources.forEach(res => {
      // 1. Reading Linkages
      if (res.linkedReadingId) {
        edgesList.push(createRelationship({
          source: res.id,
          target: res.linkedReadingId,
          type: RelationshipType.LINKED_TO_READING,
          strength: 0.8,
          createdBy: 'SYSTEM'
        }));
        edgesList.push(createRelationship({
          source: res.linkedReadingId,
          target: res.id,
          type: RelationshipType.HAS_RESOURCE,
          strength: 0.8,
          createdBy: 'SYSTEM'
        }));
      }

      // 2. LOS Linkages
      if (res.linkedLOSId) {
        edgesList.push(createRelationship({
          source: res.id,
          target: res.linkedLOSId,
          type: RelationshipType.LINKED_TO_LOS,
          strength: 0.9,
          createdBy: 'SYSTEM'
        }));
        edgesList.push(createRelationship({
          source: res.linkedLOSId,
          target: res.id,
          type: RelationshipType.HAS_RESOURCE,
          strength: 0.9,
          createdBy: 'SYSTEM'
        }));
      }

      // 3. File type structural edges
      if (res.fileType === 'png' || res.fileType === 'jpg' || res.fileType === 'jpeg') {
        edgesList.push(createRelationship({
          source: res.id,
          target: res.id,
          type: RelationshipType.CONTAINS_IMAGE,
          strength: 1.0,
          createdBy: 'SYSTEM'
        }));
      } else if (res.fileType === 'pdf' || res.fileType === 'txt' || res.fileType === 'md') {
        edgesList.push(createRelationship({
          source: res.id,
          target: res.id,
          type: RelationshipType.CONTAINS_TEXT,
          strength: 1.0,
          createdBy: 'SYSTEM'
        }));
      }

      // 4. Annotation Edges
      const hasAnnotations = (res.annotations && res.annotations.length > 0) || (res.highlightsList && res.highlightsList.length > 0);
      if (hasAnnotations) {
        edgesList.push(createRelationship({
          source: res.id,
          target: res.id,
          type: RelationshipType.ANNOTATED_BY,
          strength: 0.5,
          createdBy: 'USER'
        }));
      }

      // 5. Formula Linkages
      const detectedFormulas = new Set<string>();
      if (res.chunks) {
        res.chunks.forEach(chunk => {
          if (chunk.formulas) {
            chunk.formulas.forEach(fId => detectedFormulas.add(fId));
          }
        });
      }
      
      if (res.futureFormulaExtraction) {
        res.futureFormulaExtraction.forEach(fId => detectedFormulas.add(fId));
      }

      detectedFormulas.forEach(fId => {
        edgesList.push(createRelationship({
          source: res.id,
          target: fId,
          type: RelationshipType.EXTRACTED_FORMULA,
          strength: 0.95,
          createdBy: 'SYSTEM'
        }));
        edgesList.push(createRelationship({
          source: fId,
          target: res.id,
          type: RelationshipType.HAS_RESOURCE,
          strength: 0.95,
          createdBy: 'SYSTEM'
        }));
      });

      // 6. Note Linkages
      snapshot.notes.forEach(note => {
        if (note.linkedResourceId === res.id) {
          edgesList.push(createRelationship({
            source: note.id,
            target: res.id,
            type: RelationshipType.REFERENCED_BY_NOTE,
            strength: 0.8,
            createdBy: 'USER'
          }));
          edgesList.push(createRelationship({
            source: res.id,
            target: note.id,
            type: RelationshipType.HAS_NOTE,
            strength: 0.8,
            createdBy: 'USER'
          }));
        }
      });

      // 7. Study Session Linkages
      snapshot.sessionHistory.forEach(session => {
        if (session.resourcesUsedIds && session.resourcesUsedIds.includes(res.id)) {
          edgesList.push(createRelationship({
            source: session.id,
            target: res.id,
            type: RelationshipType.VIEWED_IN_SESSION,
            strength: 0.85,
            createdBy: 'SYSTEM'
          }));
          edgesList.push(createRelationship({
            source: res.id,
            target: session.id,
            type: RelationshipType.HAS_SESSION,
            strength: 0.85,
            createdBy: 'SYSTEM'
          }));
        }
      });
    });

    // Note relationships
    snapshot.notes.forEach(note => {
      if (note.linkedLOSId) {
        edgesList.push(createRelationship({
          source: note.id,
          target: note.linkedLOSId,
          type: RelationshipType.REFERENCES,
          strength: 0.85,
          createdBy: 'USER'
        }));
        edgesList.push(createRelationship({
          source: note.linkedLOSId,
          target: note.id,
          type: RelationshipType.HAS_NOTE,
          strength: 0.85,
          createdBy: 'USER'
        }));
      }
      if (note.linkedReadingId) {
        edgesList.push(createRelationship({
          source: note.id,
          target: note.linkedReadingId,
          type: RelationshipType.REFERENCES,
          strength: 0.65,
          createdBy: 'USER'
        }));
        edgesList.push(createRelationship({
          source: note.linkedReadingId,
          target: note.id,
          type: RelationshipType.HAS_NOTE,
          strength: 0.65,
          createdBy: 'USER'
        }));
      }
      if (note.linkedSubjectId) {
        edgesList.push(createRelationship({
          source: note.id,
          target: note.linkedSubjectId,
          type: RelationshipType.RELATED_TO,
          strength: 0.4,
          createdBy: 'USER'
        }));
      }
      if (note.relatedFormula && note.relatedFormula.length > 0) {
        note.relatedFormula.forEach(formId => {
          edgesList.push(createRelationship({
            source: note.id,
            target: formId,
            type: RelationshipType.REFERENCES,
            strength: 0.8,
            createdBy: 'USER'
          }));
          edgesList.push(createRelationship({
            source: formId,
            target: note.id,
            type: RelationshipType.HAS_NOTE,
            strength: 0.8,
            createdBy: 'USER'
          }));
        });
      }
    });

    // Study Session relationships
    snapshot.sessionHistory.forEach(sess => {
      if (sess.linkedLOSId) {
        edgesList.push(createRelationship({
          source: sess.id,
          target: sess.linkedLOSId,
          type: RelationshipType.REFERENCES,
          strength: 0.95,
          createdBy: 'SYSTEM'
        }));
        edgesList.push(createRelationship({
          source: sess.linkedLOSId,
          target: sess.id,
          type: RelationshipType.HAS_SESSION,
          strength: 0.95,
          createdBy: 'SYSTEM'
        }));
      }
      if (sess.linkedReadingId) {
        edgesList.push(createRelationship({
          source: sess.id,
          target: sess.linkedReadingId,
          type: RelationshipType.REFERENCES,
          strength: 0.8,
          createdBy: 'SYSTEM'
        }));
        edgesList.push(createRelationship({
          source: sess.linkedReadingId,
          target: sess.id,
          type: RelationshipType.HAS_SESSION,
          strength: 0.8,
          createdBy: 'SYSTEM'
        }));
      }
      if (sess.linkedSubjectId) {
        edgesList.push(createRelationship({
          source: sess.id,
          target: sess.linkedSubjectId,
          type: RelationshipType.REFERENCES,
          strength: 0.5,
          createdBy: 'SYSTEM'
        }));
        edgesList.push(createRelationship({
          source: sess.linkedSubjectId,
          target: sess.id,
          type: RelationshipType.HAS_SESSION,
          strength: 0.5,
          createdBy: 'SYSTEM'
        }));
      }
      
      snapshot.formulas.forEach(form => {
        const isSessionLinked = (sess.linkedLOSId && sess.linkedLOSId === form.linkedLOSId) ||
          (sess.linkedReadingId && sess.linkedReadingId === form.linkedReadingId);
          
        if (isSessionLinked) {
          edgesList.push(createRelationship({
            source: sess.id,
            target: form.id,
            type: RelationshipType.REFERENCES,
            strength: 0.85,
            createdBy: 'SYSTEM'
          }));
          edgesList.push(createRelationship({
            source: form.id,
            target: sess.id,
            type: RelationshipType.HAS_SESSION,
            strength: 0.85,
            createdBy: 'SYSTEM'
          }));
        }
      });
    });

    // 3. Compute relationship counts & degrees
    const relationshipCount = new Map<string, number>();
    const referenceCount = new Map<string, number>();

    nodesMap.forEach((_, id) => {
      relationshipCount.set(id, 0);
      referenceCount.set(id, 0);
    });

    edgesList.forEach(edge => {
      relationshipCount.set(edge.source, (relationshipCount.get(edge.source) || 0) + 1);
      relationshipCount.set(edge.target, (relationshipCount.get(edge.target) || 0) + 1);
      referenceCount.set(edge.target, (referenceCount.get(edge.target) || 0) + 1);
    });

    nodesMap.forEach((node, id) => {
      node.relationshipCount = relationshipCount.get(id) || 0;
      node.referenceCount = referenceCount.get(id) || 0;
    });

    profiler.mark('edgesDone');

    // 4. Run Graph Validation
    const validationReport = GraphValidator.validate(nodesMap, edgesList);

    profiler.mark('validationDone');

    // 5. Compile Indexes
    const sourceEdgesMap = new Map<string, KnowledgeRelationship[]>();
    const targetEdgesMap = new Map<string, KnowledgeRelationship[]>();
    const nodesByTypeMap = new Map<string, string[]>();
    const nodesByTagMap = new Map<string, string[]>();

    // Initial empty lists for types
    const nodeTypes: KnowledgeNode['type'][] = [
      'Subject', 'Reading', 'LOS', 'Formula', 'Study Note', 'Resource', 'Study Session'
    ];
    nodeTypes.forEach(t => nodesByTypeMap.set(t, []));

    nodesMap.forEach(node => {
      // Type index
      const typeList = nodesByTypeMap.get(node.type) || [];
      typeList.push(node.id);
      nodesByTypeMap.set(node.type, typeList);

      // Tag index
      node.tags.forEach(tag => {
        const tagList = nodesByTagMap.get(tag) || [];
        tagList.push(node.id);
        nodesByTagMap.set(tag, tagList);
      });
    });

    edgesList.forEach(edge => {
      // Source index
      const srcList = sourceEdgesMap.get(edge.source) || [];
      srcList.push(edge);
      sourceEdgesMap.set(edge.source, srcList);

      // Target index
      const tgtList = targetEdgesMap.get(edge.target) || [];
      tgtList.push(edge);
      targetEdgesMap.set(edge.target, tgtList);
    });

    profiler.mark('indexesDone');

    const buildFinished = new Date().toISOString();
    const buildDurationMs = new Date(buildFinished).getTime() - new Date(buildStart).getTime();

    // Compile read-only indices
    const readonlyNodes = nodesMap;
    const readonlyEdges = sourceEdgesMap;
    const readonlyTargetEdges = targetEdgesMap;
    const readonlyByType = nodesByTypeMap;
    const readonlyByTag = nodesByTagMap;

    // Lineage versions
    const graphId = `graph_${Date.now()}`;
    const nextVersion = previousGraph ? previousGraph.version + 1 : 1;
    const prevVersionId = previousGraph ? previousGraph.graphId : null;

    const graph: ReadonlyGraph = {
      nodes: readonlyNodes,
      edges: readonlyEdges,
      targetEdges: readonlyTargetEdges,
      nodesByType: readonlyByType,
      nodesByTag: readonlyByTag,
      graphId,
      version: nextVersion,
      previousVersion: prevVersionId,
      lastRebuilt: buildFinished,
      buildDurationMs,
      nodeCount: nodesMap.size,
      edgeCount: edgesList.length
    };

    // 6. Calculate ChangeSet
    const changeSet = this.calculateChangeSet(previousGraph, graph);

    // Freeze top-level containers
    Object.freeze(graph);

    profiler.mark('end');
    const profile = profiler.getMetrics();

    return {
      graph,
      changeSet,
      validationReport,
      profile
    };
  }

  /**
   * Computes a changeset diff comparing node/edge arrays.
   */
  private static calculateChangeSet(
    prev: ReadonlyGraph | null,
    next: ReadonlyGraph
  ): GraphChangeSet {
    const addedNodes: string[] = [];
    const removedNodes: string[] = [];
    const updatedNodes: string[] = [];
    const addedEdges: string[] = [];
    const removedEdges: string[] = [];

    if (!prev) {
      next.nodes.forEach((_, id) => addedNodes.push(id));
      next.edges.forEach(edgeList => {
        edgeList.forEach(e => addedEdges.push(`${e.source}:${e.type}:${e.target}`));
      });
      return { addedNodes, removedNodes, updatedNodes, addedEdges, removedEdges };
    }

    // Nodes diff
    next.nodes.forEach((node, id) => {
      if (!prev.nodes.has(id)) {
        addedNodes.push(id);
      } else {
        const prevNode = prev.nodes.get(id)!;
        if (node.modifiedDate !== prevNode.modifiedDate) {
          updatedNodes.push(id);
        }
      }
    });

    prev.nodes.forEach((_, id) => {
      if (!next.nodes.has(id)) {
        removedNodes.push(id);
      }
    });

    // Edges diff
    const prevEdgeKeys = new Set<string>();
    prev.edges.forEach(edgeList => {
      edgeList.forEach(e => prevEdgeKeys.add(`${e.source}:${e.type}:${e.target}`));
    });

    const nextEdgeKeys = new Set<string>();
    next.edges.forEach(edgeList => {
      edgeList.forEach(e => {
        const key = `${e.source}:${e.type}:${e.target}`;
        nextEdgeKeys.add(key);
        if (!prevEdgeKeys.has(key)) {
          addedEdges.push(key);
        }
      });
    });

    prevEdgeKeys.forEach(key => {
      if (!nextEdgeKeys.has(key)) {
        removedEdges.push(key);
      }
    });

    return {
      addedNodes,
      removedNodes,
      updatedNodes,
      addedEdges,
      removedEdges
    };
  }
}
