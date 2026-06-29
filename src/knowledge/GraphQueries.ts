/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReadonlyGraph } from './KnowledgeGraph';
import { KnowledgeNode, KnowledgeNodeType, KnowledgeRelationship } from './KnowledgeTypes';
import { GraphSnapshot, KnowledgeCluster } from './GraphSnapshot';
import { RelationshipType } from './RelationshipTypes';

/**
 * Static engine housing reusable graph search and pathfinding algorithms.
 */
export class GraphQueries {
  /**
   * Performs an O(1) primary key node lookup.
   */
  public static findNodeById(graph: ReadonlyGraph, id: string): KnowledgeNode | null {
    return graph.nodes.get(id) || null;
  }

  /**
   * Retrieves all nodes belonging to a specific type using the category index.
   */
  public static findNodesByType(graph: ReadonlyGraph, type: KnowledgeNodeType): KnowledgeNode[] {
    const ids = graph.nodesByType.get(type) || [];
    const result: KnowledgeNode[] = [];
    ids.forEach(id => {
      const node = graph.nodes.get(id);
      if (node) result.push(node);
    });
    return result;
  }

  /**
   * Retrieves nodes directly connected to the target node.
   */
  public static findConnectedNodes(
    graph: ReadonlyGraph,
    id: string,
    direction: 'incoming' | 'outgoing' | 'both' = 'both'
  ): KnowledgeNode[] {
    const connectedIds = new Set<string>();

    if (direction === 'outgoing' || direction === 'both') {
      const outgoingEdges = graph.edges.get(id) || [];
      outgoingEdges.forEach(e => connectedIds.add(e.target));
    }

    if (direction === 'incoming' || direction === 'both') {
      const incomingEdges = graph.targetEdges.get(id) || [];
      incomingEdges.forEach(e => connectedIds.add(e.source));
    }

    const result: KnowledgeNode[] = [];
    connectedIds.forEach(connId => {
      const node = graph.nodes.get(connId);
      if (node) result.push(node);
    });
    return result;
  }

  /**
   * Runs a Breadth-First Search (BFS) pathfinder to find the shortest list of node IDs connecting two nodes.
   */
  public static findShortestPath(
    graph: ReadonlyGraph,
    startId: string,
    endId: string
  ): string[] | null {
    if (!graph.nodes.has(startId) || !graph.nodes.has(endId)) return null;
    if (startId === endId) return [startId];

    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const nodeId = path[path.length - 1];

      if (nodeId === endId) return path;

      const outgoing = graph.edges.get(nodeId) || [];
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push([...path, edge.target]);
        }
      }
    }

    return null;
  }

  /**
   * Resolves related formulas for a specific Learning Outcome Statement.
   */
  public static findAllRelatedFormulae(graph: ReadonlyGraph, losId: string): KnowledgeNode[] {
    const outgoing = graph.edges.get(losId) || [];
    const result: KnowledgeNode[] = [];

    outgoing.forEach(edge => {
      if (edge.type === RelationshipType.HAS_FORMULA) {
        const node = graph.nodes.get(edge.target);
        if (node && node.type === 'Formula') result.push(node);
      }
    });

    // Fallback: search incoming formulas pointing to this LOS
    const incoming = graph.targetEdges.get(losId) || [];
    incoming.forEach(edge => {
      if (edge.type === RelationshipType.USES) {
        const node = graph.nodes.get(edge.source);
        if (node && node.type === 'Formula') result.push(node);
      }
    });

    return result;
  }

  /**
   * Resolves study notes connected to an LOS.
   */
  public static findAllRelatedNotes(graph: ReadonlyGraph, losId: string): KnowledgeNode[] {
    const outgoing = graph.edges.get(losId) || [];
    const result: KnowledgeNode[] = [];

    outgoing.forEach(edge => {
      if (edge.type === RelationshipType.HAS_NOTE) {
        const node = graph.nodes.get(edge.target);
        if (node && node.type === 'Study Note') result.push(node);
      }
    });

    const incoming = graph.targetEdges.get(losId) || [];
    incoming.forEach(edge => {
      if (edge.type === RelationshipType.REFERENCES) {
        const node = graph.nodes.get(edge.source);
        if (node && node.type === 'Study Note') result.push(node);
      }
    });

    return result;
  }

  /**
   * Resolves resource assets supporting an LOS.
   */
  public static findAllRelatedResources(graph: ReadonlyGraph, losId: string): KnowledgeNode[] {
    const outgoing = graph.edges.get(losId) || [];
    const result: KnowledgeNode[] = [];

    outgoing.forEach(edge => {
      if (edge.type === RelationshipType.HAS_RESOURCE) {
        const node = graph.nodes.get(edge.target);
        if (node && node.type === 'Resource') result.push(node);
      }
    });

    const incoming = graph.targetEdges.get(losId) || [];
    incoming.forEach(edge => {
      if (edge.type === RelationshipType.REFERENCES) {
        const node = graph.nodes.get(edge.source);
        if (node && node.type === 'Resource') result.push(node);
      }
    });

    return result;
  }

  /**
   * Identifies dependent outcomes by analyzing Reading prerequisites.
   */
  public static findDependentLOS(graph: ReadonlyGraph, losId: string): KnowledgeNode[] {
    const node = graph.nodes.get(losId);
    if (!node || node.type !== 'LOS' || node.parentIds.length === 0) return [];
    
    const readingId = node.parentIds[0];
    const readingNode = graph.nodes.get(readingId);
    if (!readingNode) return [];

    // Find readings that depend on this parent reading
    const dependentReadings: string[] = [];
    graph.nodesByType.get('Reading')?.forEach(rdId => {
      const rdNode = graph.nodes.get(rdId);
      if (rdNode) {
        // If the reading has suggestedPrerequisites pointing to parent reading
        const custom = rdNode.metadata.custom;
        const prereqs: string[] = (rdNode as any).suggestedPrerequisites || (custom && (custom as any).suggestedPrerequisites) || [];
        if (prereqs.includes(readingId)) {
          dependentReadings.push(rdId);
        }
      }
    });

    // Aggregate all LOS children of those readings
    const result: KnowledgeNode[] = [];
    dependentReadings.forEach(rdId => {
      const rdNode = graph.nodes.get(rdId);
      if (rdNode) {
        rdNode.childIds.forEach(childId => {
          const childNode = graph.nodes.get(childId);
          if (childNode && childNode.type === 'LOS') result.push(childNode);
        });
      }
    });

    return result;
  }

  /**
   * Retrieves sibling Reading nodes categorized under the same Subject.
   */
  public static findSiblingReadings(graph: ReadonlyGraph, readingId: string): KnowledgeNode[] {
    const node = graph.nodes.get(readingId);
    if (!node || node.type !== 'Reading' || node.parentIds.length === 0) return [];

    const subjectId = node.parentIds[0];
    const subjectNode = graph.nodes.get(subjectId);
    if (!subjectNode) return [];

    const result: KnowledgeNode[] = [];
    subjectNode.childIds.forEach(siblingId => {
      if (siblingId !== readingId) {
        const sibling = graph.nodes.get(siblingId);
        if (sibling && sibling.type === 'Reading') result.push(sibling);
      }
    });

    return result;
  }

  /**
   * Filters subject clusters presenting low confidence averages.
   */
  public static findWeakKnowledgeClusters(snapshot: GraphSnapshot): KnowledgeCluster[] {
    return snapshot.clusters.filter(c => c.averageConfidence < 3.0);
  }

  /**
   * Computes relationship density (degree count) for a single node.
   */
  public static findKnowledgeDensity(graph: ReadonlyGraph, nodeId: string): number {
    const node = graph.nodes.get(nodeId);
    return node ? node.relationshipCount : 0;
  }

  /**
   * Telemetry check returning orphan node IDs (nodes with no connections).
   */
  public static findDisconnectedNodes(graph: ReadonlyGraph): string[] {
    const result: string[] = [];
    graph.nodes.forEach((node, id) => {
      if (node.relationshipCount === 0) {
        result.push(id);
      }
    });
    return result;
  }

  /**
   * Traverses isolated node components.
   */
  public static findDisconnectedSubgraphs(graph: ReadonlyGraph): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    graph.nodes.forEach((_, id) => {
      if (!visited.has(id)) {
        const component: string[] = [];
        const queue: string[] = [id];
        visited.add(id);

        while (queue.length > 0) {
          const current = queue.shift()!;
          component.push(current);

          const connected = this.findConnectedNodes(graph, current, 'both');
          connected.forEach(neighbor => {
            if (!visited.has(neighbor.id)) {
              visited.add(neighbor.id);
              queue.push(neighbor.id);
            }
          });
        }

        components.push(component);
      }
    });

    return components;
  }

  /**
   * Lists duplicate edge signatures.
   */
  public static findDuplicateRelationships(graph: ReadonlyGraph): string[] {
    const edgeSignatures = new Set<string>();
    const duplicates: string[] = [];

    graph.edges.forEach(edgeList => {
      edgeList.forEach(edge => {
        const signature = `${edge.source}:${edge.type}:${edge.target}`;
        if (edgeSignatures.has(signature)) {
          duplicates.push(signature);
        }
        edgeSignatures.add(signature);
      });
    });

    return duplicates;
  }
}
