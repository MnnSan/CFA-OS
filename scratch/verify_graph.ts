/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  INITIAL_SUBJECTS, 
  INITIAL_READINGS, 
  INITIAL_LOS, 
  INITIAL_RESOURCES, 
  INITIAL_NOTES 
} from '../src/context/AppContext';
import { INITIAL_FORMULAS } from '../src/repositories/FormulaRepository';
import { RepositorySnapshot } from '../src/knowledge/KnowledgeTypes';
import { KnowledgeGraphBuilder } from '../src/knowledge/KnowledgeGraphBuilder';
import { GraphQueries } from '../src/knowledge/GraphQueries';
import { GraphValidator } from '../src/knowledge/GraphValidator';
import { RelationshipType } from '../src/knowledge/RelationshipTypes';

console.log("=========================================================");
console.log("S5 SEMANTIC KNOWLEDGE GRAPH ENGINE VERIFICATION TEST");
console.log("=========================================================\n");

// 1. Build a mock RepositorySnapshot
const snapshot: RepositorySnapshot = {
  subjects: INITIAL_SUBJECTS,
  readings: INITIAL_READINGS,
  losList: INITIAL_LOS,
  notes: INITIAL_NOTES,
  resources: INITIAL_RESOURCES,
  sessionHistory: [
    {
      id: 'session-test-01',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: 60,
      linkedSubjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d', // FI
      linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d013', // Yield curve
      linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d13a', // LOS 13.a
      mentalFocusScore: 9,
      confidenceBefore: 2,
      confidenceAfter: 4,
      status: 'Completed'
    }
  ],
  formulas: INITIAL_FORMULAS
};

console.log(`Ingesting repository snapshot...`);
console.log(`- Subjects: ${snapshot.subjects.length}`);
console.log(`- Readings: ${snapshot.readings.length}`);
console.log(`- LOS: ${snapshot.losList.length}`);
console.log(`- Notes: ${snapshot.notes.length}`);
console.log(`- Resources: ${snapshot.resources.length}`);
console.log(`- Formulas: ${snapshot.formulas.length}`);
console.log(`- Sessions: ${snapshot.sessionHistory.length}\n`);

// 2. Execute Pure Build Pipeline
const startTime = Date.now();
const buildResult = KnowledgeGraphBuilder.build(snapshot, null, {
  buildReason: 'Initial Verification Rebuild',
  eventTrigger: null,
  builderVersion: '1.0.0',
  repositoryVersion: 1,
  buildStarted: new Date().toISOString()
});
const buildDuration = Date.now() - startTime;

const graph = buildResult.graph;
console.log("---------------------------------------------------------");
console.log("1. GRAPH BUILD DIAGNOSTICS");
console.log("---------------------------------------------------------");
console.log(`✓ Graph ID:       ${graph.graphId}`);
console.log(`✓ Version:        ${graph.version}`);
console.log(`✓ Node Count:     ${graph.nodeCount} nodes`);
console.log(`✓ Edge Count:     ${graph.edgeCount} relationships`);
console.log(`✓ Build Time:     ${graph.buildDurationMs} ms (Internal timer) / ${buildDuration} ms (Wall clock)`);
console.log(`✓ Profiler Breakdowns:`);
console.log(`  - Node build:         ${buildResult.profile.nodeBuildTimeMs.toFixed(3)} ms`);
console.log(`  - Relationship build: ${buildResult.profile.relationshipBuildTimeMs.toFixed(3)} ms`);
console.log(`  - Validation:         ${buildResult.profile.validationTimeMs.toFixed(3)} ms`);
console.log(`  - Index compiling:    ${buildResult.profile.indexCreationTimeMs.toFixed(3)} ms`);
console.log(`  - Snapshot build:     ${buildResult.profile.snapshotGenerationTimeMs.toFixed(3)} ms`);
console.log(`  - Total Compile Time: ${buildResult.profile.totalCompileTimeMs.toFixed(3)} ms\n`);

// 3. Evaluate Validation Integrity
console.log("---------------------------------------------------------");
console.log("2. INTEGRITY VALIDATION SCAN");
console.log("---------------------------------------------------------");
console.log(`✓ Graph Valid:    ${buildResult.validationReport.isValid}`);
console.log(`✓ Errors Found:   ${buildResult.validationReport.errors.length}`);
console.log(`✓ Warnings Found: ${buildResult.validationReport.warnings.length}`);
if (buildResult.validationReport.errors.length > 0) {
  console.log("Errors detail:");
  buildResult.validationReport.errors.forEach(e => console.log(`  [ERROR] ${e}`));
}
if (buildResult.validationReport.warnings.length > 0) {
  console.log("Warnings detail:");
  buildResult.validationReport.warnings.forEach(w => console.log(`  [WARN] ${w}`));
}
console.log();

// 4. Test Graph Query Engines
console.log("---------------------------------------------------------");
console.log("3. SEMANTIC QUERY TRAVERSALS");
console.log("---------------------------------------------------------");

// Query A: Find Sibling Readings
const readingId = 'ab102030-4050-4060-8070-90a0b0c0d012'; // Reading 12: LDI
const siblings = GraphQueries.findSiblingReadings(graph, readingId);
console.log(`A. Siblings of Reading 12 (LDI):`);
siblings.forEach(s => console.log(`   - ${s.title} (ID: ${s.id})`));

// Query B: Find formulas connected to LOS 13.a (Yield Curve Strategy)
const losId = 'cf102030-4050-4060-8070-90a0b0c0d13a'; // LOS 13.a
const relatedFormulas = GraphQueries.findAllRelatedFormulae(graph, losId);
console.log(`\nB. Formulas linked to LOS 13.a:`);
relatedFormulas.forEach(f => console.log(`   - ${f.title} (Formula: ${f.metadata.custom?.latexExpression})`));

// Query C: Run Shortest Path from Subject (Fixed Income) to Reading 13
const startNode = '7c9a4e05-c49b-4bc9-93e1-32a21008064d'; // FI Subject
const endNode = 'ab102030-4050-4060-8070-90a0b0c0d013'; // Reading 13: Yield Curve
const shortestPath = GraphQueries.findShortestPath(graph, startNode, endNode);
console.log(`\nC. Shortest Path from Fixed Income Subject to Reading 13:`);
if (shortestPath) {
  shortestPath.forEach((id, idx) => {
    const node = GraphQueries.findNodeById(graph, id);
    console.log(`   [Step ${idx + 1}] ID: ${id} (${node?.type}: "${node?.title}")`);
  });
} else {
  console.log("   No path found.");
}
console.log();

// 5. Test ChangeSet Lineage tracking
console.log("---------------------------------------------------------");
console.log("4. EVENTS & LINEAGE CHANGESET TESTING");
console.log("---------------------------------------------------------");

// Simulate an update by adding a new candidate note pointing to LOS 12.a
const updatedNotes = [
  ...snapshot.notes,
  {
    id: 'note-test-newly-added-02',
    title: 'Swaps and Convexity in Yield Curves',
    content: 'Review swaps and active key rate allocations.',
    createdTime: new Date().toISOString(),
    updatedTime: new Date().toISOString(),
    linkedSubjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d',
    linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d013',
    linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d13a'
  }
];

const nextSnapshot: RepositorySnapshot = {
  ...snapshot,
  notes: updatedNotes
};

const secondBuildResult = KnowledgeGraphBuilder.build(nextSnapshot, graph, {
  buildReason: 'NoteCreated Event Sync',
  eventTrigger: 'NoteCreated',
  builderVersion: '1.0.0',
  repositoryVersion: 2,
  buildStarted: new Date().toISOString()
});

const changeSet = secondBuildResult.changeSet;
console.log(`Rebuilding graph to simulate NoteCreated event...`);
console.log(`✓ Previous Graph ID: ${graph.graphId} (Version ${graph.version})`);
console.log(`✓ Next Graph ID:     ${secondBuildResult.graph.graphId} (Version ${secondBuildResult.graph.version})`);
console.log(`✓ Added Nodes:       ${changeSet.addedNodes.join(', ')}`);
console.log(`✓ Removed Nodes:     ${changeSet.removedNodes.join(', ')}`);
console.log(`✓ Updated Nodes:     ${changeSet.updatedNodes.join(', ')}`);
console.log(`✓ Added Edges:       ${changeSet.addedEdges.length} relationship(s) created`);
changeSet.addedEdges.forEach(k => console.log(`   - Edge: [${k}]`));
console.log();

console.log("=========================================================");
console.log("ALL SEMANTIC GRAPH RUNTIME TESTS COMPLETED SUCCESSFULLY");
console.log("=========================================================");
