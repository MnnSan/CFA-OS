# Relationship Types Taxonomy

This document outlines the directional relationship type tags (edges) used to link entity nodes in the CFA Operating System knowledge graph.

---

## 1. Edge Taxonomy

Edges represent directional semantic links between nodes, storing:
1. **Source Node ID** (UUID/string)
2. **Target Node ID** (UUID/string)
3. **Relationship Type** (Enum value)
4. **Weight** (Numerical multiplier, defaults to `1.0`)
5. **Relationship Strength** (Correlation scale from `0.0` to `1.0`)
6. **Created By** (`SYSTEM` | `USER` | `AI` | `NotebookLM` | `OCR` | `Firebase` | `Manual Import`)

---

## 2. Supported Relationship Types

```
   [Source Node] ─────────────── (RelationshipType) ───────────────► [Target Node]
```

### A. Composition & Hierarchy
* **`CONTAINS`**: Establishes structural composition.
  - *Example*: `Subject ─── CONTAINS ───► Reading`
  - *Example*: `Reading ─── CONTAINS ───► LOS`
  - *Created By*: `SYSTEM` | *Strength*: `1.0`

### B. Dependency & Prerequisites
* **`DEPENDS_ON`**: Marks structural prerequisite constraints.
  - *Example*: `Reading B ─── DEPENDS_ON ───► Reading A`
  - *Example*: `Formula A ─── DEPENDS_ON ───► Reading A`
  - *Created By*: `SYSTEM` | *Strength*: `0.9` to `1.0`
* **`USES`**: Signifies functional requirement.
  - *Example*: `Formula ─── USES ───► Variable Node`
  - *Example*: `Formula ─── USES ───► LOS` (indicates that calculating the formula tests the outcome)
  - *Created By*: `SYSTEM` | *Strength*: `0.95`

### C. Reference Links
* **`REFERENCES`**: Structural annotations or telemetry associations.
  - *Example*: `Study Note ─── REFERENCES ───► LOS`
  - *Example*: `Resource (PDF) ─── REFERENCES ───► Reading`
  - *Example*: `Study Session ─── REFERENCES ───► LOS`
  - *Created By*: `USER` (for Notes) or `SYSTEM` (for Sessions/Resources) | *Strength*: `0.65` to `0.95`
* **`RELATED_TO`**: Represents general semantic association.
  - *Example*: `Study Note ─── RELATED_TO ───► Subject`
  - *Created By*: `USER` | *Strength*: `0.4`

### D. Reverse Indices
* **`HAS_FORMULA`**: Direct accessor from a syllabus outcome to its mathematical equations.
  - *Example*: `LOS ─── HAS_FORMULA ───► Formula`
  - *Created By*: `SYSTEM` | *Strength*: `0.95`
* **`HAS_NOTE`**: Direct accessor from a syllabus outcome to its candidate-authored outlines.
  - *Example*: `LOS ─── HAS_NOTE ───► Study Note`
  - *Created By*: `SYSTEM` | *Strength*: `0.85`
* **`HAS_RESOURCE`**: Direct accessor from an outcome to library files.
  - *Example*: `LOS ─── HAS_RESOURCE ───► Resource`
  - *Created By*: `SYSTEM` | *Strength*: `0.85`
* **`HAS_SESSION`**: Direct accessor from an outcome to study sessions logged for it.
  - *Example*: `LOS ─── HAS_SESSION ───► Study Session`
  - *Created By*: `SYSTEM` | *Strength*: `0.95`

### E. Future AI & Study Deck Connectors (Sprint 6/7/8)
* **`HAS_FLASHCARD`**: Points from an outcome to its flashcard review items.
* **`HAS_REVISION`**: Points from an outcome to Leitner spaced repetition schedule cards.
* **`EXPLAINS`**: Points from an AI Explanation node to a target LOS.
* **`SUMMARIZES`**: Points from an AI Explanation node to a target Study Note or Reading.
* **`GENERATED_FROM`**: Traces tutor explanations back to vectors or note citations.
