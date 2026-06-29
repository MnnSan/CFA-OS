# Knowledge Engine Architecture

The **Knowledge Engine** represents the semantic core of the CFA Level III Operating System. It transitions the application from a simple relational study tracker into a structured knowledge base, setting up the semantic infrastructure that local AI models, RAG vector searches, and spaced repetition engines will consume.

---

## 1. Core Philosophy

* **Everything is a Node**: Theoretical topics, math formulas, candidate annotations, PDF resource files, and logged telemetry (study sessions) are unified under a single `KnowledgeNode` contract.
* **First-Class Relationships**: Connections are directional, strongly typed, and carry weight and source metadata, allowing downstream AI/Scheduling models to understand context links.
* **React Independence**: The entire graph building, querying, clustering, and health tracking runs in pure TypeScript. It is decoupled from the React lifecycle, ensuring testability and referential stability during stopwatch timer ticks.

---

## 2. Module Responsibilities

| File | Primary Responsibility |
| :--- | :--- |
| [RelationshipTypes.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/RelationshipTypes.ts) | Defines the enum list of valid relationship edge type tags (e.g. `CONTAINS`, `REFERENCES`, `USES`). |
| [KnowledgeTypes.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/KnowledgeTypes.ts) | Houses type interfaces for nodes, relationships, nested metadata, cluster statistics, and repository snapshot inputs. |
| [KnowledgeNode.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/KnowledgeNode.ts) | Decoupled factory mappings converting domain objects to normalized `KnowledgeNode` models. |
| [KnowledgeRelationship.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/KnowledgeRelationship.ts) | Edge factory establishing directional relations, created-by sources, and correlation strengths. |
| [KnowledgeGraph.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/KnowledgeGraph.ts) | Defines the read-only index database contract. |
| [GraphValidator.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/GraphValidator.ts) | Scan engine auditing nodes and edges to verify referential integrity (e.g. no dangling edges or self-loops). |
| [KnowledgeGraphBuilder.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/KnowledgeGraphBuilder.ts) | Pure compiler building the frozen read-only graph index maps from input snapshots and tracking change sets. |
| [GraphSnapshot.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/GraphSnapshot.ts) | Defines the immutable snapshot structure combining graph, metrics, health, and subject clusters. |
| [GraphQueries.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/GraphQueries.ts) | Houses search traversals (BFS paths, sibling lookups, density filters). |
| [KnowledgeGraphService.ts](file:///c:/Manan%20Personal/PERSONAL/Myself/Antigravity/cfa-level-iii-preparation-platform/src/knowledge/KnowledgeGraphService.ts) | Active service managing subscriptions, building snapshots from repositories, and binding to EventBus events. |

---

## 3. In-Memory Compilation Flow

```
Raw Repositories (subjects, readings, losList, notes, resources, sessions)
   │
   ▼ (Ingestion into pure pack)
RepositorySnapshot
   │
   ▼ (Compile nodes, directional edges, degrees, and secondary indices)
KnowledgeGraphBuilder.build() ───► Runs GraphValidator.validate()
   │
   ▼ (Top-level Object.freeze)
ReadonlyGraph + GraphChangeSet
   │
   ▼ (Calculate subject clusters, health ratios, and densities)
KnowledgeGraphService
   │
   ▼ (Expose to React context state)
GraphSnapshot
```
