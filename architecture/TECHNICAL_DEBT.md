# Technical Debt, Refactorings & Optimizations: CFA OS

This document tracks technical debt, design constraints, browser restrictions, and planned code refactoring tasks.

---

## 1. Completed & Resolved Infrastructure (Sprint 4.5 & 5)

* **Referential Stability (RESOLVED)**: In Sprint 4.5, business engines and repositories were memoized in `AppContext.tsx`. Unrelated updates (like stopwatch timer ticks) do *not* trigger repository reconstructions.
* **Redundant Compilation (RESOLVED)**: In Sprint 5.5, stable build hash checks were integrated into `KnowledgeGraphService.ts`. Unchanged snapshots bypass the graph builder, saving CPU cycles.
* **Compile Profiling (RESOLVED)**: In Sprint 5.5, microsecond timing checks were added via `GraphBuildProfiler.ts`.

---

## 2. Context Render Bottlenecks (Active Tech Debt)

### Problem:
The active study stopwatch updates every 1 second to show elapsed time. Currently, this timer is managed as an active state variable inside `AppContext.tsx`.
* **Impact**: Every second, the state change triggers a re-render of the parent provider context. Consequently, every component listening to `useApp()` is forced to re-render.

### Mitigations:
1. **Timer Decoupling**: Extract active timer tick state into a localized React hook or an isolated sub-provider context (`TimerContext`). Only stopwatch panels will subscribe to ticks, keeping the rest of the application immune.

---

## 3. Storage Quota Limits (Browser Limits)

### Problem:
The platform currently stores notes and resource catalogs in browser `localStorage`.
* **Limit**: Modern web browsers restrict `localStorage` to **5MB** per domain.
* **Risk**: Long outlines with rich-text content will eventually trigger `QuotaExceededError`.

### Mitigations:
1. **Migration to IndexedDB**: Implement **Dexie.js** as the storage driver in Sprint 7. IndexedDB allows storage pools up to 50%+ of the user's free disk space.
2. **Resource URL Offloading**: Only store metadata reference records instead of raw files.

---

## 4. Postponed Cycle Detection (Structural Checks)

### Problem:
Currently, the `GraphValidator` checks for duplicate nodes, self-loops, and dangling target references. However, it does not trace circular loops (cycles) between prerequisite readings or dependent outcomes.
* **Reason for Postponement**: Circular reference verification (DFS cycles scan) is postponed to Sprint 8 since the current curriculum tree is strictly hierarchical.

### Mitigations:
1. **DFS Cycles Audit**: Implement a DFS cycle checker in `GraphValidator` in Sprint 8 when candidate-authored outcome dependencies are enabled.

---

## 5. UI Link-out Shortcuts (Usability Gaps)

### Problem:
Outcome rows in `Curriculum.tsx` display notes and resources count indicators. Clicking these indicators does not navigate the candidate to the notes editor or open the resource card.

### Mitigations:
1. **Context Navigation Actions**: Bind click handlers on indicator icons that switch tabs (`setActiveTab`) and select the target node ID (`setSelectedNoteId` / `setSelectedResourceId`) automatically.
