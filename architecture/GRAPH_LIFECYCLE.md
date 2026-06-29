# Knowledge Graph Lifecycle

This document describes the compilation and update lifecycle of the **Knowledge Graph** in the CFA Level III Operating System.

The Knowledge Graph is designed as a **pure compile-on-event** pipeline, acting similarly to how source compilers translate raw inputs into ASTs and binaries. 

---

## 1. Lifecycle Data Flow

The lifecycle moves unidirectionally from raw React state records to a highly optimized, fully indexed read-only graph snapshot:

```mermaid
flowchart TD
    subgraph Input ["1. RAW STORAGE LAYER (React Context)"]
        appState["subjects, readings, losList, notes, resources, sessionHistory, formulas"]
    end

    subgraph Compiler ["2. SEMANTIC COMPILER PIPELINE (Pure Functions)"]
        snapshot["RepositorySnapshot (Pure Data Pack)"]
        builder["KnowledgeGraphBuilder (Static compiler)"]
        validator["GraphValidator (Self-loops, dangling links, type validation)"]
        graph["ReadonlyGraph (Immutable nodes, edges, & indexes)"]
        diff["GraphChangeSet ( lineage diff: added/updated/removed )"]
    end

    subgraph Service ["3. PUBLIC API GATEWAY (State Manager)"]
        serviceInst["KnowledgeGraphService"]
        pubSnapshot["GraphSnapshot (Graph + Health + Stats + ChangeSet + Clusters)"]
    end

    subgraph Output ["4. CONSUMPTION LAYER (Subscribers)"]
        context["AppContext Provider State"]
        views["React Views (Dashboard, Analytics, AI Grounding)"]
    end

    %% Flow transitions
    appState --> |"Extract lists"| snapshot
    snapshot --> |"Input argument"| builder
    builder --> |"Run integrity rules"| validator
    validator --> |"Report warnings/errors"| builder
    builder --> |"Construct ReadonlyMap containers"| graph
    builder --> |"Compare previous version"| diff
    graph & diff --> |"Encapsulate"| pubSnapshot
    serviceInst --> |"Holds snapshot instance"| pubSnapshot
    pubSnapshot --> |"setKnowledgeSnapshot()"| context
    context --> |"Re-render trigger"| views

    %% Event Bus cycle
    views --> |"User actions"| appState
    appState --> |"Publish event"| eventBus["EventBus"]
    eventBus --> |"subscribe('*') trigger"| serviceInst
    serviceInst --> |"Full Rebuild"| snapshot
```

---

## 2. Rebuild-from-Scratch Lifecycle Stages

1. **State Mutation**: The candidate performs an action (logs a study session, creates a study note, updates confidence).
2. **Event Dispatch**: The state handler publishes a typed `DomainEvent` (e.g. `StudySessionCompleted`, `NoteCreated`) to the `EventBus`.
3. **wildcard Subscription**: The `KnowledgeGraphService` receives the event via its wildcard listener (`*`).
4. **Compile Trigger**: Instead of mutably updating individual nodes or arrays (which introduces race conditions and indexing sync bugs), the service initiates a clean compilation:
   - Queries raw repository arrays to construct a **`RepositorySnapshot`**.
   - Invokes the static **`KnowledgeGraphBuilder.build`** method, passing in the raw snapshot, the previous graph version, and compilation metadata details.
5. **Node & Edge Ingestion**: The builder iterates over the snapshot, compiling raw database lines into unified `KnowledgeNode` structures and creating directional `KnowledgeRelationship` edges.
6. **Telemetry & Indexing**: The builder indexes nodes by type, tag, source-id, and target-id, calculating degree counts for reference densities.
7. **Integrity Validation**: The **`GraphValidator`** scans the compiled data. If it finds duplicate keys, self-loops, or broken links, it appends them to a warning/error diagnostic report.
8. **Top-Level Freeze**: The builder freezes the resulting `ReadonlyGraph` structure to enforce immutability at runtime.
9. **Snapshot Compilation**: The service aggregates the graph, validation logs, subject-specific `KnowledgeClusters`, statistics (density, degree), and `GraphHealth` ratings (overall health score, orphans, weak clusters) into a frozen **`GraphSnapshot`**.
10. **State Propagation**: The service notifies all registered listeners. The React context state receives the new snapshot, triggering a react re-render of downstream dashboard panels.

---

## 3. Web Worker Thread Compatibility

The `KnowledgeGraphBuilder.build()` compiler function is designed as a **100% pure, context-free pipeline** that depends solely on its input arguments (`RepositorySnapshot` and `previousGraph`). It does not reference global browser window variables, DOM structures, repository instances, or React context scopes.

Because of this decoupled compiler design, the build pipeline can be moved into a background **Web Worker** with almost zero code modifications:

1. **Worker Hook**: The main thread service posts a message containing the raw serialized `RepositorySnapshot` data pack to a worker thread:
   ```typescript
   worker.postMessage({ snapshot: repoSnapshot, prevGraphId: currentGraph?.graphId });
   ```
2. **Background Compile**: The worker compiles the nodes, directional edges, and indexes in parallel, running the validation scans completely separate from the UI thread.
3. **Response Transfer**: The worker passes the completed, structured graph data back to the main thread:
   ```typescript
   self.postMessage({ graph, changeSet, validationReport, profile });
   ```

This architecture ensures that even if a student compiles tens of thousands of notes or logged session cards, UI thread interaction and timer watch ticks will remain entirely stutter-free.
