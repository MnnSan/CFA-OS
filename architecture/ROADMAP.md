# ROADMAP: CFA Level III Operating System

This document outlines the chronological development plan, milestones, completed work, and future feature sprints.

---

## 1. Development Timeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Sprint 1 (Done): Base Platform & Syllabus Indexing         │
│  Sprint 2 (Done): Active Study Session Stopwatch & Metrics  │
│  Sprint 3 (Done): LaTeX Formula Deck & Recall Flashcards    │
│  Sprint 4 (Done): Curriculum Intelligence & Relations Engine│
│  Sprint 4.5 (Done): Architecture Hardening & Refactor       │
│  Sprint 5 (Done): Knowledge Engine & Semantic Graph Foundation│
│  Sprint 5.5 (Done): Product Validation & UX Audit           │
│  Sprint 6 (Next): Formula Intelligence Engine & Recall Deck │
│  Sprint 7: Spaced Repetition (SM-2 Algorithm) Engine        │
│  Sprint 8: Local AI Assistant & NotebookLM Integration      │
│  Sprint 9: Firebase Cloud Synchronization (Offline-first)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Sprint Details

### Sprint 1: Base Platform & Curriculum Indexing (Completed)
* **Milestone**: Functional responsive desktop layout with navigation routing.
* **Scope**:
  * Set up routing for Dashboard, Curriculum, Notes, Resources, Calendar, and Settings.
  * Populated standard CFA Level III syllabus tree data (Subject -> Readings -> LOS).
  * Built global search component overlay (`SearchOverlay.tsx`) for keyboard navigation.
  * Implemented localStorage-based persistent Audit Activity Logging.

### Sprint 2: The Study Session Engine (Completed)
* **Milestone**: Real-time study sessions that sync duration statistics back to the syllabus tree.
* **Scope**:
  * Persistent State Machine for the stopwatch (survives tab closing and page refreshes).
  * 1-10 Focus Rate logging and 1-5 pre/post qualitative confidence rate audits.
  * Hooked up stopwatch duration totals to dynamically recalculate studied hours and change status (`Not Started` -> `In Progress` -> `Completed`) on corresponding Reading and LOS nodes.

### Sprint 3: Formula Deck & LaTeX Active Recall Cards (Completed)
* **Milestone**: Active recall math and concept flashcard component.
* **Scope**:
  * Support LaTeX expressions using KaTeX/MathJax.
  * Interface for quick hide/reveal triggers on variables.
  * Flashcard authoring tool directly linked to active Reading/LOS nodes.
  * Memorization state persistence (`isMemorized: boolean`).

### Sprint 4: Curriculum Intelligence & Relations Engine (Completed)
* **Milestone**: Dynamic knowledge relation mapping and contextual navigation across Subject/Reading/LOS trees.
* **Scope**:
  * Built relationship resolver linking Notes, Formulas, and Resources directly to Learning Outcome Statements.
  * Designed "Today's Mission" priority cockpit widget.
  * Created dynamic progress calculations and neglect vector trackers.

### Sprint 4.5: Architecture Hardening & Refactor (Completed)
* **Milestone**: High-performance memoized repository query layer and unified event-driven communication system.
* **Scope**:
  * Decoupled business logic into Repository structures with O(1) multi-index lookups.
  * Built lightweight Pub/Sub Event Bus with wildcard listener support.
  * Extracted core metrics calculations into a dedicated Analytics Service.
  * Extracted cockpit algorithms into a standalone Mission Engine.
  * Unified user entity reference tokens using secure UUID generators.

### Sprint 5: Knowledge Engine & Semantic Graph Foundation (Completed)
* **Milestone**: React-independent semantic graph mapping subjects, readings, outcomes, notes, and study sessions into an immutable compiled structure.
* **Scope**:
  * Pure compile-on-event graph builder executing validation scans.
  * Microsecond Timing Profiler tracking compile metrics.
  * Lineage changeset diffs tracking node/edge delta modifications.
  * Graph Snapshot buffer keeping the last 20 snapshot states.

### Sprint 5.5: Product Validation & UX Audit (Completed)
* **Milestone**: Structured review of candidate study day workflows, UX friction analysis, and performance audit.
* **Scope**:
  * Documented screen-by-screen purpose and visual consistency.
  * Tracked performance impact of stopwatch timer ticks.
  * Compiled usability roadmaps.

### Sprint 6: Formula Intelligence Engine & Recall Deck (Next Sprint)
* **Milestone**: Advanced formula solver, parameter linkages, and recall drill deck.
* **Scope**:
  * Formula repository migration.
  * LaTeX parser integrations for parameter mappings.
  * Quick recall deck dashboard widgets.

### Sprint 7: Spaced Repetition (SM-2 Algorithm) Engine
* **Milestone**: Automated daily revision queue based on active recall performance.
* **Scope**:
  * SuperMemo-2 (SM-2) algorithm integration using session confidence values to schedule card reviews.
  * Dashboard revision warning banner listing overdue cards.

### Sprint 8: Local AI Assistant & NotebookLM Integration
* **Milestone**: Local vector search and context-grounded AI tutor.
* **Scope**:
  * Chrome Gemini Nano or API gateway proxy integration.
  * Semantic vector search index of notes and study outlines.
  * Deep-reading synthesis (NotebookLM style): Automated conceptual mind-maps, note outlines, and text-to-speech audio podcasts from study docs.

### Sprint 9: Firebase Cloud Synchronization (Offline-first)
* **Milestone**: Cloud sync capability, multi-device backup, and secure authenticated profiles.
* **Scope**:
  * Firebase Authentication (custom logins, anonymous sessions).
  * Firestore database synchronization replacing `localStorage` services (with offline caching).
  * Firebase Cloud Storage for notes, attachments, and PDF assets.
