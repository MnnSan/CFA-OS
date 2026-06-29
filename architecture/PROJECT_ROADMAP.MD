
# PROJECT ROADMAP: CFA Level III Operating System

This document serves as the master planning blueprint, technical reference, and living roadmap for the **CFA Level III Operating System (CFA L3 OS)**. It outlines our architectural philosophy, data structures, current implementation progress, and future developmental vectors.

---

## 1. VISION & DESIGN PHILOSOPHY

The **CFA Level III Operating System** transforms candidate preparation from a passive, disconnected reading experience into an active, high-utility execution cockpit.

### Core Premises:

- **Respect for Cognitive Load**: Eliminate administrative friction. Candidates should never spend time choosing *what* or *how* to study; the system should dynamically direct focus.
- **Architectural Honesty**: Clean, minimalist Swiss design, avoiding "artificial intelligence slop," telemetry junk, or simulated terminal metrics. High-contrast typography, structural visual rhythm, and deep functional utility.
- **Micro-Integration**: Every study session, user note, external link, formula, and calendar event links directly to a formal **Learning Outcome Statement (LOS)** issued by the CFA Institute.
- **Frictionless Feedback Loop**: Measure immediate progress via active study stopwatch triggers, focus tracking, and direct qualitative pre/post confidence audits.

---

## 2. CORE ENGINES (ARCHITECTURE)

The system is designed around seven cohesive engines that interface via a centralized React Context layer:

```
┌────────────────────────────────────────────────────────────────────────┐
│                               APP CONTEXT                              │
└───────┬──────────────┬───────────────┬──────────────┬───────────┬──────┘
        │              │               │              │           │
┌───────▼──────┐┌──────▼───────┐┌──────▼──────┐┌──────▼──────┐┌───▼────────┐
│  Curriculum  ││    Study     ││   Revision  ││  Knowledge  ││ Advanced / │
│    Engine    ││    Engine    ││    Engine   ││    Engine   ││   Future   │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘└────────────┘
```

### 1. Curriculum Engine (Active)

Indexes and manages the canonical CFA Level III curriculum hierarchy (Level → Subjects → Readings → Learning Outcome Statements (LOS)).

- Calculates progress dynamically based on elapsed active study hours against pre-allocated targets.
- Transitions LOS states from `Not Started` to `In Progress` or `Completed` based on real active study outcomes.

### 2. Study Session Engine (Active)

The high-precision learning workspace of the operating system.

- Controls the active study stopwatch with millisecond precision (paused, resumed, or finished).
- Captures critical data: linked curriculum hierarchy nodes, study duration, qualitative mental focus rating (1-10), and pre/post confidence transition metrics (1-5 scale).
- Triggers automatic updates across curriculum progress trackers when sessions complete.

### 3. Revision Engine (Future)

An algorithmic scheduler implementing spaced repetition and active recall loops.

- Will automatically calculate optimal next-review dates for each study node using a modified SuperMemo-2 scheduling algorithm driven by the post-session qualitative confidence rating.
- Will generate a daily "Due for Revision" queue to prevent rote cramming.

### 4. Knowledge Engine (Active)

Manages candidate-authored artifacts (rich text study notes, web-based resource indexes, formula cards).

- All notes and resources maintain direct relational references to readings and LOS nodes.
- Loaded dynamically during active study sessions to provide a unified reference workspace.

### 5. AI Engine (Future / Out of Scope for Now)

*Note: Keep server-side keys hidden. Strict respect for local-first utility.*

- Planned integration for semantic vector search across personal notes, automated synthesis of long readings, and conversational Q&A grounded securely in official curriculum documents.

### 6. Analytics Engine (Future)

- Planned charts tracking historical velocity (subject coverage vs. target date), focus trends, and consistency streaks.

### 7. Integrations Engine (Future)

- Future bi-directional Google Calendar syncing, local OCR for handwritten formula cards, and secure user-controlled backups.

---

## 3. HISTORICAL CHANGELOG & CURRENT SPRINT

### Sprint 1: Base Platform & Curriculum Indexing

- **Milestone**: Created core UI routing and page layouts (Dashboard, Curriculum, Notes, Resources, Calendar).
- **Implementation**:
  - Established canonical mock data model for CFA Level III portfolio management and wealth planning.
  - Implemented global curriculum browser.
  - Set up local audit activity logging to track app usage.

### Sprint 2: The Study Session Engine (Current Sprint)

- **Milestone**: Completed transition from static curriculum browser to an active learning environment.
- **Implementation**:
  - Built a persistent state-machine in `StudySessionService` to track and persist the active study block in `localStorage`.
  - Created a central **Today's Active Study Session Workspace** on the Dashboard with controls for Start, Pause, Resume, Stop, and Cancel.
  - Integrated pre/post study confidence auditing (1-5 scale) and mental concentration score logging (1-10 scale).
  - Wired completed sessions to dynamically increment studied hours and update progress metrics for corresponding Readings and LOS.
  - Added a **Today's Completed Sessions** history panel on the Dashboard to provide immediate feedback on daily accomplishments.

---

## 4. FUTURE SPRINTS ROADMAP

```
┌──────────────────────────────────────────────────────────────┐
│  Sprint 3: Formula Deck & Active Recall Flashcards (High)    │
├──────────────────────────────────────────────────────────────┤
│  Sprint 4: Spaced Repetition Scheduler (Medium-High)         │
├──────────────────────────────────────────────────────────────┤
│  Sprint 5: Analytics & Velocity Charts (Medium)              │
├──────────────────────────────────────────────────────────────┤
│  Sprint 6: Google Workspace & Cal Sync (Low-Medium)          │
└──────────────────────────────────────────────────────────────┘
```

### Sprint 3: Formula Deck & Active Recall Flashcards (Priority: High)

- **Features**:
  - Render formula card slides with quick hide/reveal buttons inside active study frames.
  - Support manual flashcard creation pinned directly to an active Reading or LOS.
- **UI Element**: Add a sliding panel or tab on study views for active active-recall testing.

### Sprint 4: Spaced Repetition Revision Engine (Priority: Medium-High)

- **Features**:
  - Connect the qualitative `confidenceAfter` metric (1-5) logged during study sessions to create scheduled intervals.
  - Generate a "Revision Required" widget on the Dashboard showing overdue study topics.
  - Keep a calendar view highlighting scheduled revision slots.

### Sprint 5: Analytics & Velocity Charts (Priority: Medium)

- **Features**:
  - Use D3.js or Recharts to map cumulative study hours vs. ideal target burn-down lines.
  - Correlation heatmaps between "Focus Score" and "Confidence Growth."

### Sprint 6: Google Workspace & Cloud Sync (Priority: Low-Medium)

- **Features**:
  - OAuth login synchronization to export notes to Google Docs or backup storage databases.
  - Push study session alerts to Google Calendar.

---

## 5. DATA MODELS

Below are the key interfaces declared in `src/types.ts` that drive the data flow across the CFA L3 Operating System:

### Subject, Reading, and LOS

```typescript
export interface Subject {
  id: string;
  name: string;
  code: string; // e.g., "PM" (Portfolio Management)
  weightMin: number;
  weightMax: number;
  targetHours: number;
}

export interface Reading {
  id: string;
  subjectId: string;
  number: number; // Reading number
  title: string;
  targetHours: number;
  actualHours: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface LearningOutcomeStatement {
  id: string;
  readingId: string;
  code: string; // e.g., "3.a"
  statement: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  confidence: 1 | 2 | 3 | 4 | 5; // User rating
  actualHours: number;
  lastReviewed?: string; // ISO date string
}
```

### Study Session

```typescript
export interface StudySession {
  id: string;
  startTime: string; // ISO date string
  endTime?: string;  // ISO date string
  durationMinutes: number;
  linkedSubjectId?: string;
  linkedReadingId?: string;
  linkedLOSId?: string;
  notesAddedIds: string[];
  resourcesUsedIds: string[];
  mentalFocusScore?: number; // 1-10 rating
  questionsAttemptedPlaceholder?: number; // reserved for practice integration
  confidenceBefore?: number | null; // scale 1-5
  confidenceAfter?: number | null;  // scale 1-5
  status?: 'Completed' | 'Paused' | 'Cancelled';
}
```

---

## 6. FOLDER STRUCTURE

The system maintains a highly modular layout to guarantee fast load times and clean component segregation:

```
/
├── .env.example                # Example environment variables (secrets hidden server-side)
├── package.json                # Project script declarations & third-party libraries
├── vite.config.ts              # Bundler config (Tailwind & React plugins)
├── PROJECT_ROADMAP.md          # THIS FILE: Current Living Architectural Roadmap
├── index.html                  # Core HTML file mounting the app root
└── src/
    ├── main.tsx                # Client app bootstrap entry point
    ├── index.css               # Global CSS importing and extending Tailwind CSS
    ├── App.tsx                 # Main application structure with views and tabs
    ├── types.ts                # Master TypeScript contracts, types, and interfaces
    ├── components/             # Reusable UI controls
    │   ├── Header.tsx          # Dynamic top bar with search integration
    │   ├── Sidebar.tsx         # Central navigation router
    │   └── SearchOverlay.tsx   # Global workspace item search
    ├── context/                # Context API providers (Global State Management)
    │   ├── AppContext.tsx      # Main state machine (Subjects, Sessions, Progress)
    │   └── ThemeContext.tsx    # Workspace theme preferences (Light vs Dark)
    ├── pages/                  # Full-screen route modules (Tabs)
    │   ├── Dashboard.tsx       # Live study clock, history feeds, and directives
    │   ├── Curriculum.tsx      # Subject & LOS exploration panel
    │   ├── NotesPage.tsx       # Knowledge Engine notes creator
    │   ├── Resources.tsx       # Dynamic bookmark list
    │   ├── CalendarPage.tsx    # Target milestone timelines
    │   ├── SettingsPage.tsx    # App preference configurations
    │   └── Login.tsx           # Authentication screen
    └── services/               # State sync, storage, and duration mathematics
        └── StudySessionService.ts # Singleton handles session storage limits and math
```

---

## 7. CODING STANDARDS & BEST PRACTICES

### 1. State Management Pattern

- **Centralized AppContext**: Holds core lists (subjects, readings, losList, notes) to keep data synchronized.
- **Service Isolation**: Complex algorithms, storage reads/writes, and date differences must live as static pure functions inside dedicated Service files (`/src/services/`). Components should only call clean wrappers.

### 2. TypeScript & Type Safety

- **Named Imports Only**: Always use named imports rather than default object destructuring.
- **Standard Enums**: Prefer explicit standard types/enums rather than const-enums to allow transpiler compatibility.
- **Pragmatic Defensiveness**: Guard lists and context calls with optional chaining (`activeLOS?.statement`) to handle unlinked configurations gracefully.

### 3. Styling & Presentation (Tailwind CSS)

- **High-Contrast Typography**: Pair clean sans-serif for interface controls with high-density monospace (`font-mono`) for stopwatch metrics, codes, and durations.
- **Micro-Animations**: All interactive buttons should declare quick, responsive ease-out transitions (`transition-all duration-150`).
- **Clean Focus States**: Input controls must feature visible, accessible focus indicators matching the primary slate aesthetic.

---

## 8. TECHNICAL DEBT & OPTIMIZATIONS

- **Context Re-renders**: If AppContext grows excessively slow due to state updates (e.g., active session ticking every second), split the active session timer from AppContext into a localized hook or use a separate fast-provider pattern.
- **LocalStorage Quota Handling**: Currently assumes user data will fit within the standard 5MB browser allocation limit. In future iterations, add standard try-catch blocks to handle `QuotaExceededError` gracefully.
- **Time Elapsed Edge Cases**: The system uses real dates (`Date.now()`) subtracting start times to calculate elapsed durations. If the candidate suspends their browser or tab, the elapsed time correctly measures actual elapsed time, not just active tick cycles. This is clean but means any system clock offset may distort records slightly. Keep an eye on system clock syncing issues.
