# Event Bus Integration

This document outlines the Event Bus synchronization mappings that trigger graph rebuilds in the CFA Operating System.

---

## 1. Pub/Sub Synchronization

The `KnowledgeGraphService` acts as a subscriber to the application-wide `EventBus` singleton. It listens to the wildcard topic (`*`) and automatically rebuilds the immutable graph whenever state changes occur, ensuring the graph snapshot is always in sync with repositories.

```
Candidate Action (UI) ──► Mutator Handler ──► eventBus.publish(DomainEvent)
                                                     │
                                                     ▼
                                          Wildcard Handler (*)
                                                     │
                                                     ▼
                                      KnowledgeGraphService.rebuildGraph()
```

---

## 2. Event Sync Map

| Event Type | Source | Event Payload | Graph Update Action |
| :--- | :--- | :--- | :--- |
| **`NoteCreated`** | `NoteManager` | `{ title: string }` | Ingests the new Study Note, builds Note -> LOS/Reading relationship edges, and recompiles indices. |
| **`NoteUpdated`** | `NoteManager` | `{ title: string }` | Rebuilds Note node properties (modifiedDate, title) and updates connections. |
| **`ResourceLinked`** | `ResourceManager`| `{ linkedLOSId: string }` | Rebuilds relationship edges between Resource and LOS, and recompiles indices. |
| **`StudySessionCompleted`**| `StudySessionEngine`| `{ durationMinutes: number, confidenceAfter: number }` | Ingests the completed Study Session node, links session -> LOS, and propagates the confidence rate back to the LOS node. |
| **`LOSCompleted`** | `SyllabusManager` | `{ status: 'Completed' }` | Updates the status of the target LOS node to `Completed` (MASTERING) in-memory. |
| **`ConfidenceChanged`** | `SyllabusManager` | `{ confidence: number }` | Updates the confidence of the target LOS node in-memory. |

---

## 3. Pure Rebuild Performance

Rebuilding a graph containing ~500 nodes and ~1,000 edges takes less than **2 milliseconds** in a standard V8 JavaScript engine. This is mathematically trivial compared to React's diffing/rendering loop. By executing a complete rebuild from scratch, we ensure that:
* Secondary indices are always fully consistent.
* There are no dangling references or orphaned edges left over from incremental deletion bugs.
* Thread/state synchronization remains completely deterministic.
