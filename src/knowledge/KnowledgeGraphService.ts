/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  SubjectRepository, 
  ReadingRepository, 
  LOSRepository, 
  FormulaRepository, 
  ResourceRepository, 
  NoteRepository, 
  StudySessionRepository 
} from '../repositories';
import { EventBus } from '../services/EventBus';
import { ReadonlyGraph } from './KnowledgeGraph';
import { 
  GraphSnapshot, 
  KnowledgeCluster 
} from './GraphSnapshot';
import { 
  RepositorySnapshot, 
  GraphMetadata, 
  GraphStatistics, 
  GraphHealth,
  KnowledgeRelationship
} from './KnowledgeTypes';
import { KnowledgeGraphBuilder } from './KnowledgeGraphBuilder';
import { GraphQueries } from './GraphQueries';
import { ValidationReport } from './GraphValidator';

/**
 * Service managing the active Knowledge Graph snapshot and coordinating EventBus triggers.
 */
export class KnowledgeGraphService {
  private currentGraph: ReadonlyGraph | null = null;
  private currentSnapshot: GraphSnapshot | null = null;
  private repoVersion = 1;
  private lastBuildHash = '';
  private historyRingBuffer: GraphSnapshot[] = [];
  private readonly MAX_HISTORY_LIMIT = 20;
  
  // Callbacks to notify listeners (e.g., AppContext) of snapshot updates
  private listeners: ((snapshot: GraphSnapshot) => void)[] = [];

  constructor(
    private subjectRepo: SubjectRepository,
    private readingRepo: ReadingRepository,
    private losRepo: LOSRepository,
    private formulaRepo: FormulaRepository,
    private resourceRepo: ResourceRepository,
    private noteRepo: NoteRepository,
    private sessionRepo: StudySessionRepository,
    private eventBus: EventBus
  ) {
    // 1. Compile the initial graph
    this.rebuildGraph('Initial Load', null);

    // 2. Bind Event Bus wildcard listener
    this.eventBus.subscribe('*', (event) => {
      const syncEvents = new Set([
        'StudySessionCompleted',
        'NoteCreated',
        'NoteUpdated',
        'ResourceLinked',
        'LOSCompleted',
        'ConfidenceChanged',
        'FormulaMastered',
        'FormulaFavorited',
        'FormulaReviewed',
        'FormulaLinkedToNote'
      ]);

      if (syncEvents.has(event.type)) {
        this.rebuildGraph(event.type, event.type);
      }
    });
  }

  /**
   * Registers a snapshot listener callback.
   */
  public subscribeToSnapshot(cb: (snapshot: GraphSnapshot) => void): () => void {
    this.listeners.push(cb);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  /**
   * Exposes the active compiled Snapshot.
   */
  public getSnapshot(): GraphSnapshot {
    if (!this.currentSnapshot) {
      throw new Error("Knowledge Graph Snapshot has not been compiled yet.");
    }
    return this.currentSnapshot;
  }

  /**
   * Retrieves the last 20 snapshot states from the ring buffer.
   */
  public getHistory(): readonly GraphSnapshot[] {
    return this.historyRingBuffer;
  }

  /**
   * Generates a stable hash representation of the raw repository snapshot.
   */
  private calculateSnapshotHash(snapshot: RepositorySnapshot): string {
    const noteState = snapshot.notes.map(n => `${n.id}:${n.updatedTime}`).sort().join('|');
    const sessionState = snapshot.sessionHistory.map(s => `${s.id}:${s.endTime}`).sort().join('|');
    const resourceState = snapshot.resources.map(r => `${r.id}:${r.isFavorite}`).sort().join('|');
    const losState = snapshot.losList.map(l => `${l.id}:${l.status}:${l.confidence}`).sort().join('|');
    const formulaState = snapshot.formulas.map(f => `${f.id}:${f.isMemorized}:${f.confidenceRating || 0}:${JSON.stringify(f.masterySteps || {})}`).sort().join('|');
    
    const rawString = [
      `subjects:${snapshot.subjects.length}`,
      `readings:${snapshot.readings.length}`,
      `los:${losState}`,
      `notes:${noteState}`,
      `resources:${resourceState}`,
      `sessions:${sessionState}`,
      `formulas:${formulaState}`
    ].join('\n');
    
    let hash = 5381;
    for (let i = 0; i < rawString.length; i++) {
      hash = (hash * 33) ^ rawString.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  /**
   * Triggers a full compilation from scratch using current repository collections.
   */
  public rebuildGraph(reason: string, triggerEvent: string | null): void {
    const buildStarted = new Date().toISOString();

    // 1. Assemble raw snapshot from repository layers
    const repoSnapshot: RepositorySnapshot = {
      subjects: this.subjectRepo.getAll(),
      readings: this.readingRepo.getAll(),
      losList: this.losRepo.getAll(),
      notes: this.noteRepo.getAll(),
      resources: this.resourceRepo.getAll(),
      sessionHistory: this.sessionRepo.getAll(),
      formulas: this.formulaRepo.getAll()
    };

    // Prevent redundant builds if raw collections remain unchanged
    const buildHash = this.calculateSnapshotHash(repoSnapshot);
    if (buildHash === this.lastBuildHash && this.currentSnapshot) {
      return;
    }
    this.lastBuildHash = buildHash;

    // 2. Increment repository configuration version
    this.repoVersion++;

    // 3. Compile Graph & ChangeSet via Builder
    const buildResult = KnowledgeGraphBuilder.build(repoSnapshot, this.currentGraph, {
      buildReason: reason,
      eventTrigger: triggerEvent,
      builderVersion: '1.0.0',
      repositoryVersion: this.repoVersion,
      buildStarted: new Date().toISOString()
    });

    this.currentGraph = buildResult.graph;

    // 4. Calculate Clusters
    const clusters = this.calculateClusters(buildResult.graph);

    // 5. Calculate Health Metrics
    const health = this.calculateHealth(buildResult.graph, clusters);

    // 6. Assemble Statistics
    const statistics = this.calculateStatistics(buildResult.graph, health, buildResult.validationReport);

    // 7. Assemble Metadata
    const metadata: GraphMetadata = {
      buildReason: reason,
      eventTrigger: triggerEvent,
      builderVersion: '1.0.0',
      repositoryVersion: this.repoVersion,
      buildStarted,
      buildFinished: buildResult.graph.lastRebuilt,
      buildHash,
      profileMetrics: buildResult.profile
    };

    // 8. Assemble Snapshot
    const snapshot: GraphSnapshot = {
      graphId: buildResult.graph.graphId,
      graph: buildResult.graph,
      statistics,
      health,
      metadata,
      changeSet: buildResult.changeSet,
      clusters
    };

    // Freeze snapshot top container
    Object.freeze(snapshot);

    this.currentSnapshot = snapshot;

    // Maintain a ring buffer of the last 20 snapshot states
    this.historyRingBuffer.push(snapshot);
    if (this.historyRingBuffer.length > this.MAX_HISTORY_LIMIT) {
      this.historyRingBuffer.shift();
    }

    // 9. Notify listeners
    this.listeners.forEach(cb => cb(snapshot));
  }

  /**
   * Compiles knowledge statistics for the snapshot.
   */
  private calculateStatistics(
    graph: ReadonlyGraph,
    health: GraphHealth,
    validationReport: ValidationReport
  ): GraphStatistics {
    const nodeCount = graph.nodeCount;
    const edgeCount = graph.edgeCount;

    // Density: E / (V * (V - 1))
    const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0;

    // Average Degree: 2E / V
    const averageDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

    return {
      version: graph.version,
      createdAt: graph.lastRebuilt,
      lastBuilt: graph.lastRebuilt,
      buildDurationMs: graph.buildDurationMs,
      nodeCount,
      edgeCount,
      clusterCount: this.subjectRepo.getAll().length,
      averageDegree: Number(averageDegree.toFixed(2)),
      density: Number(density.toFixed(4)),
      connectedComponents: health.isolatedClusters.length,
      validationErrors: validationReport.errors.length,
      validationWarnings: validationReport.warnings.length
    };
  }

  /**
   * In-memory cluster aggregators.
   */
  private calculateClusters(graph: ReadonlyGraph): KnowledgeCluster[] {
    const clusters: KnowledgeCluster[] = [];
    const subjectsList = this.subjectRepo.getAll();

    // Map of outgoing edges to help traverse
    const edgesList: KnowledgeRelationship[] = [];
    graph.edges.forEach(edgeList => edgesList.push(...edgeList));

    subjectsList.forEach(sub => {
      // Readings child nodes
      const rds = this.readingRepo.getBySubjectId(sub.id);
      const rdIds = new Set(rds.map(r => r.id));

      // LOS child nodes
      const losList: import('../types').LearningOutcomeStatement[] = [];
      rds.forEach(r => {
        const rLOS = this.losRepo.getByReadingId(r.id);
        losList.push(...rLOS);
      });
      const losIds = new Set(losList.map(l => l.id));

      // Assemble all node IDs belonging to this subject's subgraph
      const clusterNodeIds = new Set<string>([sub.id, ...Array.from(rdIds), ...Array.from(losIds)]);

      // Pull linked formulas, notes, resources, and study sessions
      edgesList.forEach(edge => {
        if (clusterNodeIds.has(edge.source)) {
          clusterNodeIds.add(edge.target);
        }
        if (clusterNodeIds.has(edge.target)) {
          clusterNodeIds.add(edge.source);
        }
      });

      const nodeCount = clusterNodeIds.size;

      // Completion %
      const totalLOS = losList.length;
      const completedLOS = losList.filter(l => l.status === 'Completed').length;
      const completionPercentage = totalLOS > 0 ? (completedLOS / totalLOS) * 100 : 0;

      // Average Confidence
      const ratedLOS = losList.filter(l => l.confidence !== null && l.confidence !== undefined);
      const averageConfidence = ratedLOS.length > 0 
        ? ratedLOS.reduce((sum, l) => sum + (l.confidence || 0), 0) / ratedLOS.length 
        : 0;

      // Study Hours
      const subSessions = this.sessionRepo.getAll().filter(s => 
        s.status === 'Completed' && 
        (s.linkedSubjectId === sub.id || 
         (s.linkedReadingId && rdIds.has(s.linkedReadingId)) || 
         (s.linkedLOSId && losIds.has(s.linkedLOSId)))
      );
      const studyHours = subSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;

      // Relationship Density
      let clusterEdgesCount = 0;
      edgesList.forEach(edge => {
        if (clusterNodeIds.has(edge.source) && clusterNodeIds.has(edge.target)) {
          clusterEdgesCount++;
        }
      });
      const relationshipDensity = nodeCount > 1 ? clusterEdgesCount / nodeCount : 0;

      // Revision priority (lower progress + lower confidence = higher priority)
      const priority = (100 - completionPercentage) * (5 - averageConfidence);

      clusters.push({
        id: sub.id,
        name: sub.name,
        nodeCount,
        completionPercentage: Number(completionPercentage.toFixed(1)),
        averageConfidence: Number(averageConfidence.toFixed(2)),
        studyHours: Number(studyHours.toFixed(2)),
        relationshipDensity: Number(relationshipDensity.toFixed(2)),
        revisionPriority: Number(priority.toFixed(1))
      });
    });

    return clusters;
  }

  /**
   * Computes health analytics metrics.
   */
  private calculateHealth(graph: ReadonlyGraph, clusters: KnowledgeCluster[]): GraphHealth {
    const orphanNodes = GraphQueries.findDisconnectedNodes(graph);
    const isolatedClusters = GraphQueries.findDisconnectedSubgraphs(graph);
    const duplicateEdges = GraphQueries.findDuplicateRelationships(graph);

    // Broken links (Dangling targets)
    const brokenLinks: string[] = [];
    graph.edges.forEach(edgeList => {
      edgeList.forEach(edge => {
        if (!graph.nodes.has(edge.target)) {
          brokenLinks.push(`${edge.source}:${edge.type}:${edge.target}`);
        }
      });
    });

    // Weak clusters (< 3.0 confidence)
    const weakKnowledge = clusters.filter(c => c.averageConfidence < 3.0).map(c => c.id);

    // Overall Coverage Score (% of completed LOS nodes)
    const losNodes = GraphQueries.findNodesByType(graph, 'LOS');
    const totalLOS = losNodes.length;
    const completedLOS = losNodes.filter(l => l.metadata.status === 'MASTERING').length;
    const coverageScore = totalLOS > 0 ? Math.round((completedLOS / totalLOS) * 100) : 0;

    // Deduct score for health failures
    let overallHealthScore = 100;
    overallHealthScore -= brokenLinks.length * 5;
    overallHealthScore -= duplicateEdges.length * 2;
    overallHealthScore -= orphanNodes.length * 2;
    overallHealthScore -= weakKnowledge.length * 10;

    if (overallHealthScore < 0) overallHealthScore = 0;
    if (overallHealthScore > 100) overallHealthScore = 100;

    return {
      orphanNodes,
      isolatedClusters,
      duplicateEdges,
      brokenLinks,
      weakKnowledge,
      coverageScore,
      overallHealthScore
    };
  }
}
