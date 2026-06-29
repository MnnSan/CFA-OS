# CURRICULUM ENGINE: CFA Level III Operating System

This document outlines the design, calculation engine, and state management of the **Curriculum Engine**.

---

## 1. Engine Overview

The **Curriculum Engine** is the structural foundation of the CFA Level III OS. It parses the hierarchy of the CFA curriculum:

$$\text{Subject (Topic Area)} \longrightarrow \text{Reading} \longrightarrow \text{Learning Outcome Statement (LOS)}$$

It tracks study metrics (Target Hours vs. Actual Hours) and coordinates progress states across all UI views.

---

## 2. Progress & Study Metrics Calculations

All completion ratios and hour calculations propagate upward from the atomic **LOS** to the parent **Reading**, and finally to the **Subject** level.

```
┌────────────────────────────────────────────────────────┐
│                        SUBJECT                         │
│  Progress: Avg of Reading Completion Ratios            │
│  Actual Hours: Sum of Reading Actual Hours             │
└──────────────────────────▲─────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────┐
│                        READING                         │
│  Progress: Ratio of Completed LOS / Total LOS          │
│  Actual Hours: Sum of LOS Actual Hours                 │
└──────────────────────────▲─────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────┐
│               LEARNING OUTCOME STATEMENT               │
│  Status: User-declared or Stopwatch-logged             │
│  Actual Hours: Aggregated Stopwatch Sessions           │
└────────────────────────────────────────────────────────┘
```

### Formulas

1. **Reading Progress Percentage ($P_R$)**:
   $$P_R = \left( \frac{\text{Count of Completed LOS in Reading}}{\text{Total Count of LOS in Reading}} \right) \times 100$$

2. **Reading Actual Hours ($H_{R,\text{actual}}$)**:
   $$H_{R,\text{actual}} = \sum (H_{\text{session}} \text{ linked to this Reading or its child LOS})$$

3. **Subject Progress Percentage ($P_S$)**:
   $$P_S = \frac{\sum P_R}{\text{Total Readings in Subject}}$$

4. **Subject Actual Hours ($H_{S,\text{actual}}$)**:
   $$H_{S,\text{actual}} = \sum H_{R,\text{actual}} \text{ linked to this Subject}$$

---

## 3. Syllabus State Transition Rules

The status of an LOS (and consequently, its Reading) moves through three states: `Not Started` $\rightarrow$ `In Progress` $\rightarrow$ `Completed`.

```
                    ┌───────────────┐
                    │  Not Started  │
                    └───────┬───────┘
                            │
              User starts a Study Session / stopwatch
                            │
                            ▼
                    ┌───────────────┐
                    │  In Progress  │
                    └───────┬───────┘
                            │
        User completes Session AND sets confidence >= 3
               (Or manually toggles as Complete)
                            │
                            ▼
                    ┌───────────────┐
                    │   Completed   │
                    └───────────────┘
```

### Transition Specifications:

1. **`Not Started` to `In Progress`**:
   * **Trigger**: Triggered automatically when the stopwatch is started for a specific LOS, or when a note/resource link is first registered to the LOS.
   * **System Action**: State update propagates to `localStorage` and triggers context re-render. Parent Reading state updates to `In Progress` if it was `Not Started`.

2. **`In Progress` to `Completed`**:
   * **Trigger**: Triggered when the candidate completes an active study block and inputs a post-session confidence score $\ge 3$ out of $5$, or when the candidate manually toggles the checkbox in the Curriculum panel.
   * **System Action**: Status transitions to `Completed`. If all companion LOS items in the Reading are `Completed`, the Reading status transitions to `Completed`.

3. **`Completed` to `In Progress` / `Not Started`**:
   * **Trigger**: Triggered if the candidate resets their progress, or if the Revision Engine registers a confidence score of $1$ or $2$ during a review checking session, indicating memory lapse.

---

## 4. State Management in `AppContext.tsx`

The Curriculum state is managed inside the global React Context (`src/context/AppContext.tsx`). 

### Core State Fields:
* `subjects`: List of subjects with target weight profiles.
* `readings`: List of readings linked to subjects.
* `losList`: List of LOS items with progress and links.

### Context Operations:
* `updateLOSStatus(losId, status)`: Sets state for an individual outcome.
* `addStudyHours(losId, durationMinutes)`: Increments both the `actualHours` of the targeted LOS and its parent Reading.
* `toggleBookmark(type, itemId)`: Manages quick access links.
