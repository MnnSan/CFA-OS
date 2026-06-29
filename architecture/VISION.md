# VISION: CFA Level III Operating System

This document outlines the core vision, user experience guidelines, and design principles governing the **CFA Level III Operating System (CFA L3 OS)**.

---

## 1. The Pilot Cockpit Analogy

A study dashboard shouldn't feel like a toy or a generic landing page. It should feel like a **pilot's cockpit**—specifically, an executive flight deck designed for high-altitude execution under intense cognitive load.

### Core Philosophy:
* **No Telemetry Slop**: We reject unnecessary widgets, flashing animations, simulated terminal screens, or vanity counters. Every pixel must serve a purpose.
* **Context-Driven Complexity**: An aircraft cockpit doesn't display every sensor gauge at all times; it highlights only the critical instruments needed for the current phase of flight (Takeoff, Cruise, Descent, Landing). Similarly, the CFA L3 OS adapts to the candidate's active state (Sequential Study, Practice Questions, Spaced Revision, or Mock Review).
* **Swiss Minimalism**: Sleek, dark-mode interfaces, structured visual hierarchy, generous spacing, high-contrast text, and monospace elements for values, codes, and timers.

---

## 2. The Five Daily Dashboard Questions

When a candidate logs into the platform, the dashboard must immediately answer five questions at a glance:

```
┌────────────────────────────────────────────────────────┐
│               COCKPIT EXECUTIVE DASHBOARD              │
├────────────────────────────────────────────────────────┤
│  1. STUDY TARGET: Reading 15, LOS 15.a (Ethics)         │
│  2. WHY: Overdue for revision (SM-2 Interval: 4 days)  │
│  3. DURATION: 25-minute Active Block                   │
│  4. PREPARED COURIERS: [Notes (3)] [Formulas] [PDF]    │
│  5. NEXT SECTOR: Log metrics → Update Leitner box      │
└────────────────────────────────────────────────────────┘
```

### 1. What should I study right now?
* **Definition**: The specific, atomic learning unit (an individual Learning Outcome Statement - LOS, or Reading) targeted for the current session.
* **Selection Logic**: Sourced from the intersection of the Curriculum Engine (next uncompleted syllabus node) and the Revision Engine (urgent spaced repetition items).

### 2. Why is this today's priority?
* **Definition**: The system's logical reasoning for this recommendation, eliminating choice fatigue.
* **Triggers**:
  * **`Due for Revision`**: Spaced repetition SM-2 intervals indicate that memory decay is imminent.
  * **`Lagging Velocity`**: Actual hours spent on this Subject are behind schedule compared to target timelines.
  * **`Sequential Sequence`**: The next logical node in the official CFA syllabus path.

### 3. How long will it take?
* **Definition**: A concrete time commitment prediction.
* **Representation**: Estimated target hours remaining for the reading or a standardized Pomodoro review interval (e.g., 25-minute revision block). Allows the candidate to immediately fit the session into their daily calendar.

### 4. What resources are already prepared?
* **Definition**: A packaged bundle of study assets linked directly to the target syllabus node.
* **Included Courier**:
  * Candidate-authored markdown study notes.
  * Target math formulas with LaTeX expressions.
  * References to official Curriculum PDF page numbers.
  * Pre-collected bookmarked questions or external videos.

### 5. What happens after I finish?
* **Definition**: The next flight sector. The candidate should know the downstream impact of completing the session.
* **Upstream Sync**:
  * Stopwatch logs to the audit log database.
  * Post-session confidence updates the spaced repetition interval.
  * Reading progress increases.
  * Next priority task is queued.

---

## 3. UI/UX Style & Aesthetic Guidelines

* **Typography**: Clean, geometric sans-serif (e.g., *Outfit*, *Inter*) for system labels, paired with a dense, high-contrast monospace font (e.g., *JetBrains Mono*, *Fira Code*) for study stopwatch readouts, LOS codes (e.g., `LOS 9.b`), and timers.
* **Color System**: High-contrast, dark-mode neutral slate (`#0f172a`, `#1e293b`) with neon functional colors (e.g., Emerald for completion, Amber for active focus, Slate Blue for revisions).
* **Frictionless Control**: Keyboard-driven triggers where possible (e.g., `Space` to pause/resume study session stopwatches, `Esc` to exit global search overlays).
