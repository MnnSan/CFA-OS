# CFA Level III Operating System Development Workflow & Guidelines

This document outlines the authoritative repository guidelines, coding conventions, release checklists, and branch deployment workflows for the CFA Level III OS platform.

---

## 1. Core Architecture Rules

### Single Source of Truth (SSOT)
- **Curriculum Database**: Every dashboard widget, planner, review queue, and workspace derives from the master curriculum data models.
- **Learning Resource Repository**: Mapped Schweser lectures, NotebookLMs, PDFs, and website references are stored only inside `LearningResourceRepository`. No duplicate mock databases or arrays are allowed.

### AI Integration Boundaries
- AI operates strictly as an **advisory layer**. It generates briefs, summaries, and walking coach explanations.
- AI must **never mutatively modify** study progression, completion logs, or repository states. The candidate remains the sole controller of the study environment.

---

## 2. Coding Conventions

- **State Updates**: Components should subscribe directly to relevant events on the `eventBus` rather than relying on global React context prop-drills for minor mutations. Avoid wildcard (`*`) subscriptions in widgets; register listeners for specific event types.
- **Repository Pattern**: Never call `localStorage.setItem` for resource data directly in components; route all CRUD and updates through `learningResourceRepository`.
- **Strategy Pattern**: Launching resources must route via `ResourceLauncherService` strategies (`SSCILauncher`, `PDFLauncher`, etc.) rather than inline `window.open` code to ensure scalability.

---

## 3. Git Branch & Commit Strategy

### Branches
- `main`: Production-ready code. Commits here automatically trigger the deployment pipeline.
- `feature/*`: Active workspace developments, upgrades, or fixes.

### Commit Messages
Follow semantic commit formatting:
- `feat: ...` for new features (e.g., adding user guide page).
- `fix: ...` for bug fixes (e.g., event listener leak).
- `refactor: ...` for architectural improvements (e.g., removing wildcard listeners).

---

## 4. Release & Deployment Checklist

Before merging into `main` and deploying:
1. Validate types cleanly:
   ```bash
   npx tsc --noEmit
   ```
2. Build the production package successfully:
   ```bash
   npm run build
   ```
3. Verify bootstrapping: Check that `CurriculumBootstrapService` matches the SHA-256 hash of the static Excel coding sheet correctly.
4. Execute manual visual verification of the Dashboard widgets, Mission Control, and Reading Workspace.
