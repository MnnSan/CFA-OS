# DOMAIN MODELS: CFA Level III Operating System

This document explains the code-level domain interfaces declared in `src/types.ts` that represent the core pillars of the CFA Level III OS.

---

## 1. Domain Overview

The system model is divided into three logical domains:
1. **Curriculum Mapping**: Static structures defined by the CFA Institute syllabus (`Subject`, `Reading`, `LearningOutcomeStatement`).
2. **Candidate Workspaces**: Authoring structures for notes, bookmarks, external assets, and formulas (`StudyNote`, `Resource`, `Formula`, `Bookmark`).
3. **Execution Analytics & Engines**: Metrics and history logs generated during active learning (`UserProfile`, `StudySettings`, `StudySession`, `Revision`, `MockResult`, `Question`).

---

## 2. Core Model Breakdowns

### Curriculum & Progress Tracking

#### `LearningOutcomeStatement` (LOS)
The **LearningOutcomeStatement** is the atomic tracking unit of the CFA L3 OS. Every note, revision, and study duration is ultimately resolved at the LOS level.

```typescript
export interface LearningOutcomeStatement {
  id: string;                      // Unique identifier (UUID or code-hashed)
  readingId: string;               // Reference to the parent Reading
  code: string;                    // e.g., "7.a" (LOS designator)
  statement: string;               // The syllabus testable requirement
  status: 'Not Started' | 'In Progress' | 'Completed';
  confidence: 1 | 2 | 3 | 4 | 5 | null; // Qualitative recall rating (1 = low, 5 = master)
  actualHours?: number;            // Spent study hours (calculated from sessions)
  timeSpent?: number;              // Spent study minutes
  revisionCount?: number;          // Total recall review sessions performed
  lastReviewed?: string;           // ISO datetime string of the last review session
  nextReview?: string;             // ISO date (YYYY-MM-DD) scheduled by the Revision Engine
  
  // Knowledge links
  relatedFormulas?: string[];      // Associated Formula IDs
  relatedNotes?: string[];         // Associated Note IDs
  relatedResources?: string[];     // Associated Resource IDs
  bookmarked: boolean;             // Short-term priority toggle
  
  // Future AI fields
  aiSummary?: string;              // AI-generated summary of the LOS
  aiExplanation?: string;          // AI-generated detailed description
  aiWeaknessScore?: number;        // AI-assessed weakness score (0-100)
}
```

---

### The Active Session Logger

#### `StudySession`
Represents a block of study tracked by the cockpit's timer. Captures pre/post confidence offsets to audit subjective growth, and records distractions via Focus Ratings.

```typescript
export interface StudySession {
  id: string;
  startTime: string;               // ISO datetime string of session start
  endTime?: string;                // ISO datetime string of session completion
  durationMinutes: number;         // Total active session duration
  linkedSubjectId?: string;        // Scoped Subject
  linkedReadingId?: string;        // Scoped Reading
  linkedLOSId?: string;            // Scoped LOS
  notesAddedIds?: string[];        // Notes created/edited during this session
  resourcesUsedIds?: string[];    // Resources read during this session
  mentalFocusScore?: number;       // Concentration rate (1 to 10 scale)
  confidenceBefore?: number | null;// Confidence rating before study block (1-5)
  confidenceAfter?: number | null; // Confidence rating after study block (1-5)
  status?: 'Completed' | 'Paused' | 'Cancelled';
}
```

---

### Spaced Repetition Records

#### `Revision`
Generated every time a student tests their recall of an LOS (flashcard or review queue). This serves as the historical ledger for the SM-2 algorithm.

```typescript
export interface Revision {
  id: string;
  losId: string;                   // Reference to the reviewed LOS
  timestamp: string;               // ISO datetime of review
  leitnerBox: number;              // Leitner schedule tier (1 to 5)
  nextReviewDate: string;          // Calculated date for next review (YYYY-MM-DD)
  elapsedTimeSeconds: number;      // Time spent performing recall check
  confidenceShift: {
    from: number;                  // Confidence before revision
    to: number;                    // Confidence rating after revision
  };
}
```

---

### Math Formula Catalog

#### `Formula`
Used by the Formula Engine. Expresses equations in LaTeX for rendering engine compatibility.

```typescript
export interface Formula {
  id: string;
  name: string;                    // Name of the formula (e.g., "Grinold-Kroner Model")
  latexExpression: string;         // Math expression (e.g., "$R_e \approx \frac{D_1}{P_0} + i + g - \Delta S + \Delta PE$")
  description: string;             // Structural explanations
  linkedSubjectId?: string;        // Subject link
  linkedReadingId?: string;        // Reading link
  linkedLOSId?: string;            // LOS link
  variables: Array<{
    symbol: string;                // variable shorthand (e.g., "g")
    meaning: string;               // variable explanation (e.g., "expected real growth rate")
  }>;
  isMemorized: boolean;            // Memorization toggle
}
```

---

## 3. Structural Placeholders for Future Extensions

In `src/types.ts`, specific schema objects are pre-declared to handle incoming system expansions without requiring database schema rewrites:

### `FutureAiContext`
Contains metadata for semantic queries and recommendations:
* `losWeaknessRatings`: Heatmap matching subject weakness from 0 to 100.
* `autoGeneratedTutorPrompts`: Pre-compiled question prompts tailored to the student's weaknesses.
* `spacedRepetitionScores`: Algorithmic review weight.
* `recommendedStudySequences`: Array of sequential LOS IDs optimized dynamically by a local tutor model.

### `FutureNotebookContext`
Maintains indices of external assets:
* `uploadedSourceIds`: File paths parsed by the AI engine.
* `semanticChunksCount`: Chunk tracking for Vector RAG.
* `autoGeneratedSummaries`: Cached read summaries.

### `FutureAnalytics`
Tracks study schedules:
* `dailyStudyMinutesSeries`: Array of dates mapped to study durations (used to render heatmap grids).
* `subjectConfidenceDistribution`: Weighted distribution of confidence rates across syllabus topics.

---

## 4. Domain Event Schema

#### `DomainEvent`
Represents a structured transaction dispatched by the application Event Bus on state alterations. It wraps event-specific payloads in a predictable interface for cross-engine subscribers:

```typescript
export interface DomainEvent<T = any> {
  type: string;          // Event name (e.g. 'StudySessionStarted', 'ConfidenceChanged')
  timestamp: string;     // ISO datetime string when the event was dispatched
  source: string;        // Trigger source component (e.g. 'StudySessionEngine', 'NoteManager')
  entityId: string;      // Primary identifier of the affected entity (e.g. sessionId, noteId)
  payload: T;            // Event-specific data payload (e.g. { confidence: 5 })
  metadata?: {           // Extensible diagnostic or contextual tags
    userId?: string;
    deviceClockOffset?: number;
    [key: string]: any;
  };
}
```

