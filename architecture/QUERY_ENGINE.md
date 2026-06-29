# Query Engine Algorithms

The **Graph Query Engine** houses standard graph algorithms in `GraphQueries.ts`, running on immutable `ReadonlyGraph` and `GraphSnapshot` structures.

---

## 1. Graph Algorithms

### A. BFS Shortest Path (`findShortestPath`)
Breadth-First Search traversal to find the shortest list of node IDs connecting two nodes.
* **Complexity**: $O(V + E)$ where $V$ is node count and $E$ is edge count.
* **Traversal Flow**:
  1. Initialize a queue containing paths (initially `[[startId]]`) and a `visited` Set to track visited nodes.
  2. While the queue has paths, shift the first path.
  3. Extract the last node ID from the path. If it matches `endId`, return the path list.
  4. Iterate over outgoing edges from this node. For each target that has not been visited:
     - Mark as visited.
     - Push the extended path `[...path, targetId]` to the queue.
  5. If the queue is exhausted without matching `endId`, return `null` (no path exists).

### B. Node Degree Density (`findKnowledgeDensity`)
Calculates the total relationship density (incoming + outgoing connections) for a target node ID:
$$\text{Density} = \text{node.relationshipCount}$$
* **Complexity**: $O(1)$ due to pre-compiled degree indices in the builder.

### C. Sibling Resolvers (`findSiblingReadings`)
Finds readings that share the same parent Subject node ID:
1. Fetch the reading node. Extract `subjectId` from `parentIds[0]`.
2. Look up the Subject node.
3. Filter the subject's `childIds` to return all sibling reading node IDs.
* **Complexity**: $O(C)$ where $C$ is child count.

---

## 2. Telemetry Queries

### A. Sibling & Neighborhood Queries (`findConnectedNodes`)
Returns all nodes directly adjacent to the target node.
* Incoming connections (e.g. what resources/notes point to this LOS?).
* Outgoing connections (e.g. what outcomes are contained in this Reading?).
* Both (total neighbors).
* **Complexity**: $O(1)$ read from pre-indexed `edges` and `targetEdges` Maps.

### B. Disconnected Nodes Search (`findDisconnectedNodes`)
Iterates over all nodes in the graph to identify orphan nodes (nodes with relationship count equal to 0). Used to flag orphan notes or unused PDF resources in the cockpit's health dashboard.
* **Complexity**: $O(V)$.

### C. Connected Components Grouping (`findDisconnectedSubgraphs`)
Applies BFS traversal to group all nodes into independent component subgraphs. Any island nodes or independent subgraphs are identified. Used to calculate isolated components for graph health calculations.
* **Complexity**: $O(V + E)$.
