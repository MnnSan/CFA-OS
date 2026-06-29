# AI ENGINE: CFA Level III Operating System

This document outlines the design, API gateways, retrieval architectures, and interactive persona engines of the **AI Engine**.

---

## 1. Architectural Philosophy

The AI Engine serves as a secure, local-first intellectual partner. It rejects generic "AI slop" chatbots in favor of high-precision, syllabus-grounded tutoring.

### Core Safeguards:
1. **Context Grounding**: The AI is restricted from answering general questions. It must align prompts directly with the CFA curriculum (grounded on LOS definitions, candidate notes, and active formulas).
2. **Zero Telemetry Leakage**: Personal study notes, confidence levels, and calendar schedules are kept strictly local. No user study history is used for model training.
3. **No Client-Side Secrets**: Server-side API credentials must never be bundled into the client build.

---

## 2. API & Model Architecture

The engine uses a hybrid model execution framework depending on task complexity:

```
                      ┌─────────────────────────────────┐
                      │          AI CONTROLLER          │
                      └───────┬─────────────────┬───────┘
                              │                 │
              Local / Low Latency?             Advanced Reasoning?
                              │                 │
                              ▼                 ▼
             ┌──────────────────┐             ┌──────────────────┐
             │ Chrome window.ai │             │ Firebase Cloud   │
             │ (Gemini Nano)    │             │ Functions        │
             └──────────────────┘             └─────────┬────────┘
                                                        │
                                                        ▼
                                              ┌──────────────────┐
                                              │ Google Gemini    │
                                              │ API (Pro / Flash)│
                                              └──────────────────┘
```

### 1. Local Browser-Based AI (Gemini Nano)
* **API Access**: Standardized through Google Chrome's experimental API (`window.ai`).
* **Use Cases**: Real-time markdown note summarization, simple formula explanations, and spelling/grammar corrections.
* **Benefits**: Instant execution, offline capability, and zero server hosting overhead.

### 2. Serverless API Gateway (Gemini Pro / Flash)
* **API Access**: Secure HTTP calls routed to private Firebase Cloud Functions.
* **Use Cases**: Synthetic question bank generation, deep reading Q&A, and weakness correlation reports.
* **Security**: Firebase Cloud Functions authenticate the candidate session token, attach hidden API keys, and forward the request to the Google Gemini API.

---

## 3. Retrieval-Augmented Generation (RAG) System

To ensure responses are grounded in official material, the client-side controller compiles contextual prompts dynamically using local indices.

### Context Assembly Pipeline:
When a candidate prompts the AI while reviewing an LOS:
1. **Syllabus Target**: The system fetches the active `LearningOutcomeStatement` (code, statement body, parent reading title).
2. **Candidate Footprint**: Gathers the candidate's personal markdown notes linked to that LOS, plus any linked formulas.
3. **Weakness Log**: Gathers historical session data (recent focus scores, pre/post confidence offsets, revision counts).
4. **Prompt Assembly**: Constructs a structured XML prompt injected into the LLM context:
   ```xml
   <system_instructions>
   You are a CFA Level III tutor. Ground your answers ONLY in the provided curriculum context.
   Do not assume external formulas unless derived.
   </system_instructions>
   <curriculum_context>
     <los code="15.a">Discuss the application of the Singer-Terhaar model...</los>
   </curriculum_context>
   <candidate_notes>
     [Candidate notes injected here]
   </candidate_notes>
   <prompt>
     [Candidate question text]
   </prompt>
   ```

---

## 4. Tutor Persona Settings

The candidate can select three distinct tutor personalities via `StudySettings.aiPersona`:

* **`Rigorous Academic`**:
  * Focuses on formal derivation of mathematical proofs and exact financial theory definitions.
  * *Tone*: Formal, detailed, mathematically precise.
* **`Pragmatic Coach`**:
  * Focuses on practical exam techniques, speed execution, common CFA pitfalls, and grading traps.
  * *Tone*: Direct, concise, strategy-focused.
* **`Socratic Guide`**:
  * Avoids giving direct answers. Instead, it breaks down the candidate's query and responds with guided, sequential questions to lead them to self-derived answers.
  * *Tone*: Inquisitive, encouraging, academic.
