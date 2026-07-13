
# CFA Operating OS

## Engineering Rules & Persistent Development Contract

This document defines mandatory engineering behavior for every future implementation.

These rules override implementation convenience.

---

# 1. Production Synchronization

Every completed feature is considered complete ONLY when all three environments are synchronized.

Required sequence:

Development
↓

Localhost verification
↓

TypeScript verification

npx tsc --noEmit

↓

Production build

npm run build

↓

Git commit

↓

GitHub push

↓

Firebase deployment

↓

Post-deployment verification

No implementation is considered complete unless every stage succeeds.

---

# 2. Never Leave Environments Out Of Sync

Whenever any source file changes, the developer MUST also:

• verify localhost

• update Git repository

• push GitHub

• deploy Firebase hosting (when UI changes)

• verify deployed production behaves identically

---

# 3. Dashboard Philosophy

Dashboard is presentation only.

Business logic belongs inside services.

No calculations inside React components.

Mission Control remains deterministic.

AI only explains.

Never decides.

---

# 4. Curriculum Database

The Curriculum Database is the single source of truth.

Every module derives from it.

Including:

Mission Control

MM Planner

60/40 Matrix

Operational Runway

Performance Analytics

Reading Workspace

Resource Library

Formula System

Spaced Repetition

AI Context Builder

No duplicated curriculum structures are permitted.

---

# 5. AI Architecture

AI may:

Explain

Summarize

Coach

Predict

Recommend

Generate insights

AI may NEVER:

Change progress

Choose readings

Complete phases

Alter curriculum

Mutate study plans

Everything remains deterministic.

---

# 6. Resource System

Learning resources originate ONLY from the SSCI Coding Sheet importer.

Resources are linked to

Subject

Chapter

Reading

LOS

Mission Phase

No orphan resources may exist.

---

# 7. Every Pull Request Must Verify

✓ Localhost

✓ Build

✓ TypeScript

✓ Dashboard

✓ Mission Control

✓ Reading Workspace

✓ Curriculum Database

✓ Resource Library

✓ Planner

✓ AI

✓ Firebase Deployment

---

# 8. Regression Policy

Existing functionality may never regress.

Before completing any sprint verify:

Executive Coach

Mission Control

Planner

Dashboard

Timer

Curriculum

Reading Workspace

Formula Workspace

AI

Resources

Operational Runway

60/40 Matrix

All must continue working.

---

# 9. Code Philosophy

Prefer extension over replacement.

Prefer composition over duplication.

Never create second sources of truth.

Never bypass repositories.

Never bypass services.

Never hardcode curriculum.

Never hardcode AI outputs.

Everything must remain reactive.

---

# 10. Completion Definition

A sprint is complete only when

TypeScript passes

Production build passes

Localhost verified

Firebase deployed

GitHub synchronized

Regression checks complete

Production verified.
