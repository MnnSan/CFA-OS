# NOTEBOOKLM ENGINE: CFA Level III Operating System

This document outlines the design, file parsing systems, and outline synthesis mechanisms of the **NotebookLM Engine**.

---

## 1. Engine Overview

The **NotebookLM Engine** facilitates source-based studying. Instead of relying on a generalized AI knowledge base, it imports candidate-uploaded study materials (curriculum PDFs, Schweser summaries, and mock exams) and builds a localized interactive reference workspace around them.

Key Pillars:
1. **Source Grounding**: AI interactions are locked to the contents of the uploaded files.
2. **Semantic Hierarchy Mapping**: Automatically maps parsed text chunks to the relevant Reading and LOS nodes.
3. **Multi-Modal Outlines**: Generates text summaries, study guides, and audio overviews.

---

## 2. Ingestion & Semantic Chunking Pipeline

When a candidate uploads a document in the Resource Library and tags it with `futureNotebookLMSource: true`:

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Upload PDF /   │ ──> │ Semantic Parser  │ ──> │ Local Vector Store   │
│  Resource Link  │     │ (Chunking)       │     │ (IndexedDB / Cache)  │
└─────────────────┘     └─────────┬────────┘     └──────────┬───────────┘
                                  │                         │
                                  ▼                         ▼
                        ┌──────────────────────────────────────┐
                        │ Map to Syllabus (Reading / LOS Node) │
                        └──────────────────────────────────────┘
```

### 1. Document Chunking Rules:
* Documents are segmented into overlapping semantic passages (typically 500-1000 tokens per chunk).
* Overlap margin is kept at 10-20% to prevent losing context across chunk boundaries.

### 2. Syllabus Mapping:
* For each chunk, the engine parses index terms and section numbers (e.g., "Reading 14, Section 2.1").
* Compares metadata terms with the syllabus database (`cfa_readings`, `cfa_los`).
* Stores the association index in the `FutureNotebookContext` database schema.

---

## 3. Automated Outlines & Audio Synthesis

Using the parsed source index, the engine offers two output generators:

### 1. Synthetic Study Outlines
* **Note Outlines**: Synthesizes notes from multiple sources for a reading, formatting definitions, formulas, and mock questions.
* **Conceptual Mind-Maps**: Generates Mermaid diagram configurations showing conceptual trees (e.g. Asset Allocation techniques).

### 2. Audio Overviews (Hands-Free Study)
* Compiles core text chunks into a script representing a dialogue between two AI study partners.
* Uses browser text-to-speech (TTS) interfaces or Firebase Cloud Function endpoints (integrating Google Cloud TTS APIs) to generate audio podcasts.
* Allows candidates to study hands-free (e.g., during commutes or exercise) while reviewing exact curriculum outlines.

---

## 4. Split-Screen User Workspace

The NotebookLM user experience is integrated into the Curriculum tab via a split panel:

* **Left Panel (Source Explorer)**:
  * Lists uploaded documents and resources tagged to the active Reading.
  * Shows semantic chunks matching user queries.
  * Integrates the audio overview player controls.
* **Right Panel (Candidate Workspace)**:
  * Real-time markdown notepad for active recall.
  * Formula list overlay with variable hiding.
  * Stopwatch clock dashboard control.
