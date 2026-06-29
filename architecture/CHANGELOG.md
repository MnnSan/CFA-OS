# CHANGELOG: CFA Level III Operating System

This document logs historical sprint releases, feature integrations, and bug fixes for the platform.

---

## Sprint 4.5: Architecture Hardening & Refactor (Completed)
**Milestone**: High-performance memoized repository query layer, unified event-driven system, and UUID transition.

### Added:
* **Repository Layer**: Added multi-index `SubjectRepository`, `ReadingRepository`, `LOSRepository`, `FormulaRepository`, `ResourceRepository`, `NoteRepository`, and `StudySessionRepository` in `src/repositories/` to optimize relational query speed.
* **Analytics Service**: Created `AnalyticsService.ts` to manage all progress calculations, velocity metrics, and subject completion summaries in a decoupled, testable layer.
* **Mission Engine**: Created `MissionEngine.ts` to handle priority-based Focus targets for Today's Mission cockpit panel.
* **Event Bus**: Introduced `EventBus.ts` singleton supporting decoupled wildcard event publishing and subscriptions.
* **Domain Events**: Declared `DomainEvent` contract and wired state handlers (`updateLOS`, `addResource`, `addNote`, `updateNote`, `startStudySession`, `pauseStudySession`, `resumeStudySession`, `finishStudySession`) to publish events.

### Modified:
* **UUID Database Migration**: Upgraded human-readable strings to secure, persistent UUIDs across all mocked subjects, readings, learning outcomes, resources, notes, and formulas.
* **AppContext Refactoring**: Exposed services through context provider and memoized all instances to prevent indices from rebuilding during active stopwatch ticks.

---

## Sprint 4: Curriculum Intelligence & Relations Engine (Completed)
**Milestone**: Contextual relationship mapping and neglect vectors.

### Added:
* **Relationship Resolver**: Dynamic links between notes, resources, and formulas directly matching learning outcomes.
* **neglected Areas priority**: Cockpit widget resolving priority study targets based on subject-level neglect metrics.

---

## Sprint 3: Formula Deck & LaTeX Active Recall Cards (Completed)
**Milestone**: Formulas deck and LaTeX math renderers.

### Added:
* **LaTeX Formula Renderer**: Integrated formula tables rendering equation parameters via LaTeX markup.
* **Memorization Tracker**: State controls allowing candidates to flag math formulas as memorized.

---

## Sprint 2: The Study Session Engine (Completed)
**Milestone**: Live study clock and active metric auditing.

### Added:
* **Timer Services**: Implemented `StudySessionService.ts` to manage timer calculations, timezone offsets, and string formatting.
* **Stopwatch Component**: Built Today's Active Study Workspace panel on the Dashboard, supporting play, pause, resume, cancel, and complete events.
* **Auditing Modals**: Interactive modal to prompt for pre-session and post-session qualitative confidence ratings (1-5 scale) and focus rating (1-10 scale).
* **Metric Propagators**: Linked session completions to automatically update the cumulative `actualHours` of matching Subject, Reading, and LOS records.
* **Completed Feed**: Added Today's Completed Sessions history panel to the Dashboard.

### Modified:
* **Global AppContext**: Extended context state to handle active study timers, session history lists, and syllabus update operations.
* **Master Interfaces**: Updated `src/types.ts` to include focus rating, confidence rating boundaries, and timestamp logging.

---

## Sprint 1: Base Platform & Curriculum Indexing (Completed)
**Milestone**: Routing foundation, design styling setup, and curriculum browsing.

### Added:
* **Workspace Framework**: Integrated Tailwind CSS styling rules, supporting smooth transitions and custom theme states.
* **Dashboard Tab**: Standard layout displaying active study priorities, daily calendar logs, and recent activity logs.
* **Curriculum Browser**: Interactive explorer listing the full CFA Level III syllabus tree (Portfolio Management & Wealth Planning).
* **Resources Tab**: Categorized document registry to save, filter, and access study sheets, mock exams, and PDFs.
* **Notes Workspace**: Rich text markdown note editor linked to subjects and readings.
* **Search Overlay**: Keyboard-triggered search drawer allowing global queries across subjects, readings, notes, resources, and calendar items.
* **Settings Tab**: Configuration panels for target daily hours, exam date schedules, and notification preferences.
