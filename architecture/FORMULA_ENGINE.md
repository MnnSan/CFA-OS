# FORMULA INTELLIGENCE ENGINE: ARCHITECTURE & SCHEMAS

This document outlines the design, event-driven synchronizations, lifecycle progression, and visual rendering pipeline of the **Formula Intelligence Engine** implemented in Sprint 6.

---

## 1. Engine Overview & Architecture

The Formula Engine is built as a highly visible user-facing cockpit tool constructed on top of the Repository and Knowledge Graph infrastructures. 

```
                       USER INTERACTIONS
         (Mastery Toggles, Confidence Ratings, Favorites)
                                │
                                ▼
                       REACT AppContext State
                                │
                                ├───────────────────────────────┐
                                ▼                               ▼
                        Event Bus PubSub                 FormulaRepository
                 (FormulaMastered, FormulaReviewed...)      (Map Indexes)
                                │                               │
                                ▼                               ▼
                         Knowledge Graph               Analytics & Mission
                        (Rebuild Trigger)               (Dashboard Updates)
```

---

## 2. Decoupled Data Flow & Lifecycle

The Formula lifecycle tracks candidate progress from initial exposure to full retrieval mastery:

1. **Discovered**: Initial state. Seeding data is loaded into `localStorage`. The semantic node has `KnowledgeStatus.DISCOVERED`.
2. **Studying**: The candidate starts interacting with the Formula Card (checking off mastery boxes, rating confidence). The node transitions to `KnowledgeStatus.STUDYING`.
3. **Mastering**: When all 5 checklist items are checked (memorized, variables, assumptions, limitations, application), the formula is flagged as mastered, triggering a `FormulaMastered` event and updating the node to `KnowledgeStatus.MASTERING`.

### Mastery Steps Schema:
```typescript
masterySteps: {
  equation: boolean;     // Memorized Equation Structure
  variables: boolean;    // Understand Every Variable Input
  assumptions: boolean;  // Know Strategic Assumptions
  limitations: boolean;  // Know Model Limitations
  apply: boolean;        // Can Apply to Mock Questions
}
```

---

## 3. Unified Domain Event Contracts

All analytical actions dispatch typed structures to the `EventBus`:

* **`FormulaOpened`**: Dispatched when expanding details on a card.
* **`FormulaClosed`**: Dispatched when collapsing details.
* **`FormulaRevealed`**: Dispatched when expanding variables or strategic nuances (active recall action).
* **`FormulaHidden`**: Dispatched when toggling the active recall symbol mask.
* **`FormulaMastered`**: Dispatched when the candidate completes all 5 checklist items.
* **`FormulaReviewed`**: Dispatched when rating recall confidence or unmasking symbols.
* **`FormulaFavorited`**: Dispatched when toggling the memorized status.

---

## 4. Semantic Graph Linkage Schema

Formulas are compiled as first-class vertices in the Knowledge Graph. During rebuilding, the compiler draws O(1) relationships:

* **Formula ↔ Subject**: Bi-directional links (`REFERENCES` / `HAS_FORMULA`) connecting equations to their parent CFA subjects.
* **Formula ↔ Reading**: Bi-directional links (`DEPENDS_ON` / `HAS_FORMULA`) connecting equations to their readings.
* **Formula ↔ LOS**: Bi-directional links (`USES` / `HAS_FORMULA`) connecting equations to outcomes.
* **Formula ↔ Notes**: Linked when notes list the formula ID in `relatedFormula` or share common Reading/LOS codes.
* **Formula ↔ Resources**: Connected if sharing Reading/LOS or listed in resource metadata.
* **Formula ↔ Study Sessions**: Linked dynamically to historical study session logs to map recall confidence timelines.

---

## 5. UI Rendering & Mathematical Stack

* **Typesetting Engine**: Compiles standard LaTeX notation natively inside the browser layout using KaTeX.
* **Masking Pipeline**: Searches and replaces variable tokens in the formula string with standard box math overlays (`\boxed{?}`) to prompt candidate active recall.
* **Coaching Widgets**: Evaluates priorities dynamically to highlight recommended equations today, list weak portfolios, and compile Overall Knowledge Health index scores.
