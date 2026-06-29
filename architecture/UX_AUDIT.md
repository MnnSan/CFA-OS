# UX Audit & UI Consistency Review: CFA Level III Operating System

This document outlines the visual, layout, and behavioral audit of the CFA Level III Operating System from the perspective of an actual CFA candidate.

---

## 1. Screen-by-Screen UX Audit

### A. Dashboard (The Candidate Cockpit)
* **Purpose**: Serves as the primary operational cockpit. Focuses on daily execution, progress tracking, and chronological study logs.
* **Information Hierarchy**:
  1. Active Stopwatch panel (Only displayed during a study session).
  2. "Today's Mission" priority queue cards.
  3. Quantitative progress metrics (Study hours, focus score, average confidence rate).
  4. Calendar overview & Chronological Activity feed logs.
* **Confusing Elements**:
  * The active study session panel completely pushes other elements down when active.
  * When no study session is active, the dashboard displays a callout card prompting the candidate to start a session. However, the connection between "Today's Mission" and starting a session is slightly hidden.
* **Unnecessary Clicks**:
  * Finalizing a study session requires rating focus and confidence in a modal popup. This is a necessary data collection gate, but should be kept to a single click.
* **Call to Action**: Immediately tells the candidate what to study next (via "Today's Mission").
* **Cockpit Cohesion**: High. Feels focused on the "current phase of flight."

### B. Curriculum Index
* **Purpose**: Deep syllabus drill-down (Subject -> Reading -> LOS).
* **Information Hierarchy**:
  1. Subject cards with progress indicators.
  2. Readings expander lists.
  3. Learning Outcome Statements (LOS) list showing bookmarks, status tag, and confidence rating (1-5 stars).
* **Confusing Elements**:
  * Icons representing linked resources and notes are displayed next to each LOS. However, clicking these icons does not open the resource/note directly—instead, it navigates away or does nothing.
* **Unnecessary Clicks**:
  * Expanding a Subject, then expanding a Reading, then checking an LOS requires three layers of accordion clicks.
* **Call to Action**: High. Displays clear color-coded statuses (Completed, In Progress, Not Started).

### C. Notes Page
* **Purpose**: Custom study summaries and active outline composition.
* **Information Hierarchy**:
  1. List of saved notes with search keywords and filter.
  2. Markdown rich-text editor panel.
  3. Meta-link panel (linking note to Subjects, Readings, or specific LOS).
* **Confusing Elements**:
  * Link drop-downs can get very long and require scrolling through all 100+ outcomes in a tiny browser select menu.
* **Unnecessary Clicks**:
  * Creating a note automatically opens the editor, but linking it requires manually expanding the right-side details panel.

### D. Resources Page (Library)
* **Purpose**: Official syllabus PDFs, quick sheets, and custom web links registry.
* **Information Hierarchy**:
  1. Search filter bar.
  2. Document cards grouped by category.
* **Confusing Elements**:
  * The link between a resource card and the curriculum tree is displayed as text but isn't clickable to navigate back to that LOS page.

### E. Calendar Page
* **Purpose**: Visual study planner and exam date tracking.
* **Information Hierarchy**:
  1. Monthly calendar grid.
  2. Target hours per week indicator.
  3. Action sidebar to add scheduled revision blocks.

### F. Settings Page
* **Purpose**: Core preferences configuration.
* **Information Hierarchy**:
  1. Profile configurations (Name, email, CFA Level select).
  2. Visual theme selection (Dark Mode / Light Mode).
  3. Target study hours settings.

---

## 2. UI Consistency & Visual Design Review

| Design Area | Evaluation & Findings |
| :--- | :--- |
| **Typography** | Uses clean modern sans-serif fonts (Vite defaults). Code displays utilize Monospace fonts. Visual hierarchy is clean and distinct between headings (`h1` to `h3`) and content body text. |
| **Colors** | Sleek professional color coding (e.g. slate dark cards, emerald green completions, amber for warnings/in-progress, sapphire blue for notes). Avoids default basic primary red/green shades. |
| **Dark / Light Mode** | Fully responsive dark/light mode toggle. Applying the `.dark` class changes background palettes and text colors consistently. |
| **Empty States** | Note searches that return no matches correctly show an icon-driven empty state. Active session panels display placeholder text when no outcomes are selected. |
| **Hover States** | Dashboard cards and curriculum outcome rows transition smoothly on hover (subtle background shift, highlight borders). |
| **Terminology** | Consistent terminology: `Subject`, `Reading`, `LOS`, `Study Session`, and `Confidence Rating` are used uniformly across all services. |

---

## 3. Prioritized UX Improvements Roadmap

### Category A: Critical (Implement in Sprints 6/7)
1. **Curriculum Link-out Shortcut**: Enable clicking on linked notes/resources icons next to an LOS to immediately open the editor page for that specific note or display the resource.
2. **Stopwatch Modal Streamlining**: Keep the session finalization rate popup to a single clean modal action with default pre-selected values to minimize keystrokes.

### Category B: Important (Implement in Sprints 7/8)
1. **Cockpit Widgets Resizing**: Allow shrinking the active session widget when details are not needed to prevent pushing secondary analytics charts off-screen.
2. **Hierarchical Select Search**: Replace the note link select lists with typing-filter search components (e.g., search outcomes by keywords rather than browsing a long drop-down of 150 items).

### Category C: Nice to Have (Implement in Sprints 8/9)
1. **Interactive Calendar Drag-and-Drop**: Drag calendar study blocks to reschedule study dates.
2. **Visual Progress Ring Animations**: Subtle CSS progress animations when a study outcome changes state to Completed.
