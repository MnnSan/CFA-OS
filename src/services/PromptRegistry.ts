export interface PromptTemplate {
  key: string;
  version: string;
  systemInstruction: string;
  userPromptTemplate: (contextPayload: any) => string;
}

export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  PLANNING_RATIONALE_V1: {
    key: 'PLANNING_RATIONALE_V1',
    version: '1.0.0',
    systemInstruction: 'You are the CFA Level III Strategic Coach Planner. You explain study schedule sequences based on textbook topics, daily constraints, and historical stats. Always provide highly logical, structured reasoning without raw instructions or developer details.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      const settings = payload.plannerSettings || {};
      const metrics = payload.curriculumMetrics || {};
      return `Analyze the following planning snapshot and generate a concise justification for the timeline.

Planner Settings:
- Daily Study Target: ${settings.targetDailyHours || 'N/A'} hours
- Start Date: ${settings.targetStartDate || 'N/A'}
- Exam Date: ${settings.examDate || 'N/A'}
- Review Buffer: ${settings.reviewBuffer || 'N/A'} days

Curriculum Coverage & Statistics:
- Total Subjects: ${metrics.totalSubjects || 0}
- Total Hours Estimate: ${metrics.totalHoursEstimate || 0} hours
- Days Left: ${metrics.daysRemaining || 0} days

Explain the ordering strategy (e.g. Asset Allocation and CME first, then Portfolio Construction, Derivatives, and Performance Measurement/GIPS) and how the daily hours allocation maps onto their targets. Provide the rationale directly.`;
    }
  },
  LOS_ABSTRACT_V1: {
    key: 'LOS_ABSTRACT_V1',
    version: '1.0.0',
    systemInstruction: 'You are a CFA Curriculum Expert. Explain the selected Learning Outcome Statement (LOS) in simple, intuitive terms, mapping it to practical wealth management or institutional applications.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      return `Provide a clear, brief conceptual summary of the following Learning Outcome Statement (LOS).
LOS Code: ${payload.losCode || 'N/A'}
Statement: ${payload.losStatement || 'N/A'}
Difficulty Level: ${payload.difficulty || 'Medium'}

Explain:
1. What this concept means in practice.
2. Why it matters for Level III candidates.`;
    }
  },
  ANALYTICS_EXPLANATION_V1: {
    key: 'ANALYTICS_EXPLANATION_V1',
    version: '1.0.0',
    systemInstruction: 'You are a CFA Performance Audit Engine. Evaluate a candidate\'s study sessions history, coverage rates, and mock scores to identify weak spots.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      return `Evaluate the following study history to identify trends and actions:
Study History: ${JSON.stringify(payload.studyHistory || {})}
Subject Progress: ${JSON.stringify(payload.subjectProgress || {})}`;
    }
  },
  COACH_RECOMMENDATION_V1: {
    key: 'COACH_RECOMMENDATION_V1',
    version: '1.0.0',
    systemInstruction: 'You are the CFA Executive Coach. Provide a highly actionable, concise daily execution tip (max 120 words) detailing how the student should approach today\'s workload, considering yesterday\'s effort and confidence trends. Output only the coaching tip directly.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      const history = payload.historySummary || {};
      const target = payload.todayTarget || {};
      return `Yesterday hours: ${history.yesterdayHours || 0}h. Current streak: ${history.streakDays || 0} days. Decay confidence: ${history.averageConfidence || 'N/A'}/5.0.
Today's Target: ${target.losCode || 'N/A'} â€” ${target.readingTitle || 'N/A'} (Est: ${target.estimatedDurationHours || 0}h).

Write a single-paragraph daily coaching recommendation (max 120 words) detailing conceptual vs calculation balance, cognitive energy management, and spaced reviews.`;
    }
  },
  MISSION_EXPLAIN_V1: {
    key: 'MISSION_EXPLAIN_V1',
    version: '1.0.0',
    systemInstruction: 'You are a CFA Spaced Repetition Spacing Specialist. Write a concise, bulleted explanation explaining why today\'s mission is scheduled, highlighting prerequisites, review spacing rules, and position in the roadmap.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      const mission = payload.dailyMission || {};
      return `Active Target: LOS ${mission.losCode || 'N/A'} â€” ${mission.readingTitle || 'N/A'}
Priority reason: ${mission.reason || 'N/A'}
Remaining reading hours: ${mission.remainingReadingHours || 0}h
Confidence: ${mission.confidenceLevel || 'Unrated'}/5

Provide:
- A brief explanation of why this LOS is selected today
- Its position in the study roadmap
- How its confidence rating or revision intervals influenced the schedule`;
    }
  },
  PREPARE_BRIEF_V1: {
    key: 'PREPARE_BRIEF_V1',
    version: '1.0.0',
    systemInstruction: 'You are a CFA Mentor. Generate a highly structured pre-study outline containing mental modes, prerequisite concepts, key formulas, candidate mistakes, and success standards. Keep it highly concise.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      return `LOS Target: ${payload.losCode || 'N/A'} â€” ${payload.losStatement || 'N/A'}
Formulas linked: ${JSON.stringify(payload.formulas || [])}
Notes links count: ${payload.notesCount || 0}

Please output a structured JSON response matching this EXACT keys structure:
{
  "estimatedTime": "e.g. 45 mins",
  "difficulty": "e.g. Medium",
  "mentalMode": "e.g. Calculation / Conceptual / Mixed",
  "prerequisites": ["List 2 key prerequisite concepts or background topics"],
  "keyFormulas": ["List up to 3 essential latex formulas or calculations if applicable"],
  "mistakes": ["List 2 common mistakes candidates make on this specific outcome"],
  "successLooksLike": "When you finish this LOS, you should be able to..."
}
Output only raw JSON, no markdown formatting tags.`;
    }
  },
  METRIC_EXPLAIN_V1: {
    key: 'METRIC_EXPLAIN_V1',
    version: '1.0.0',
    systemInstruction: 'You are a CFA Pedagogical Auditor. Explain in 2-3 sentences how a specific study metric was computed by the planning system, using the student\'s numbers.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      return `Metric: ${payload.metricKey} (Current Value: ${JSON.stringify(payload.metricValue)})
Planner settings: ${JSON.stringify(payload.plannerSettings || {})}
Explain in 2-3 clear sentences how the system evaluates this metric based on confidence logs, study velocity, or curriculum formulas.`;
    }
  },
  LEARNING_PATTERN_V1: {
    key: 'LEARNING_PATTERN_V1',
    version: '1.0.0',
    systemInstruction: 'You are a Cognitive Learning Analyst. Read the user\'s past session logs, focusing on reported difficulties, optional notes, and "Biggest Area of Confusion" inputs. Flag repeating patterns and output a 1-2 sentence recommendation if confusion repeats.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      return `Past Study Sessions: ${JSON.stringify(payload.sessions || [])}
Scan the "confusion" and "notes" fields for semantic similarities or repeated topics. If there are repeated weaknesses (e.g. currency overlays or fixed income immunization), call out:
- The repeating pattern (e.g. "You have reported fixed income math as confusing three times")
- An actionable tip (e.g. "Recommendation: Schedule a 30-minute review before moving forward")
If no pattern is found, output: "Learning pattern stable. Pacing target is aligned."`;
    }
  },
  MISSION_STATUS_V1: {
    key: 'MISSION_STATUS_V1',
    version: '1.0.0',
    systemInstruction: 'You are a CFA Curriculum Strategist. Evaluate the LOS and determine its core archetype: FOUNDATIONAL (unlocks later topics), MOMENTUM (short/light to build pacing), or MEMORIZATION (dense formulas/rules needing active recall). Output a single JSON with keys "archetype" and "reason" (max 15 words).',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      return `LOS Statement: ${payload.losCode || 'N/A'} â€” ${payload.losStatement || 'N/A'}
Evaluate and output:
{
  "archetype": "FOUNDATIONAL" or "MOMENTUM" or "MEMORIZATION",
  "reason": "1-sentence reason (max 15 words)"
}
Output only raw JSON.`;
    }
  },
  WEEKLY_REVIEW_V1: {
    key: 'WEEKLY_REVIEW_V1',
    version: '1.0.0',
    systemInstruction: 'You are a CFA Performance Audit Engine. Evaluate a candidate\'s weekly study sessions, confidence shifts, and difficulties to generate a weekly audit report.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      return `Evaluate the following study history to generate a weekly coaching report:
Sessions: ${JSON.stringify(payload.sessions || [])}`;
    }
  },
  MISSION_BRIEF_V1: {
    key: 'MISSION_BRIEF_V1',
    version: '1.0.0',
    systemInstruction: 'You are a CFA executive briefing officer. Generate a terse pre-study briefing. Maximum 90 words. Maximum 4 bullets. No paragraphs longer than one sentence. No motivational speeches. No generic advice. Never explain syllabus order. Never repeat KPI information. Do not summarize the reading. Do not teach the curriculum. Output only valid JSON with no markdown formatting.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      return `Reading ${payload.readingNumber}: ${payload.readingTitle}
LOS ${payload.losCode}: ${payload.losStatement}
Difficulty: ${payload.difficulty || 'Medium'} | Formula Count: ${payload.formulaCount || 0} | Est. Focus: ${payload.estimatedHours || 0}h
Prerequisites: ${(payload.prerequisites || []).join(', ')}
Confidence: ${payload.confidence || 'unrated'}/5 | Priority: ${payload.priorityReason || 'standard'}
Reflection notes available: ${(payload.previousReflections || []).length > 0 ? 'Yes' : 'No'}

Output raw JSON only:
{
  "priorKnowledge": ["exactly 3 prerequisite concepts from the list above, no descriptions"],
  "difficulty": "one word: Low/Medium/High",
  "formulaLoad": "one word: Light/Moderate/Heavy",
  "mentalMode": "one word: Conceptual/Calculation/Mixed",
  "estimatedFocus": "exact string from input above",
  "coachingTip": "max 45 words, one sentence, actionable cognitive preparation tip",
  "expectedSuccess": "one sentence starting with 'When finished, you should be able to'"
}`;
    }
  },
  COACH_INSIGHT_V1: {
    key: 'COACH_INSIGHT_V1',
    version: '1.0.0',
    systemInstruction: 'You are a CFA Study Sequence Analyst. Explain why a specific study phase is placed in its position within today\'s mission stack. Provide a concise, structured explanation covering prerequisite knowledge, expected difficulty, why this step is scheduled now, and common mistakes. Maximum 60 words. Never change the mission order.',
    userPromptTemplate: (context: any) => {
      const payload = context.payload || {};
      const deps = (payload.dependsOn || []).join(', ') || 'None';
      return `Explain why Phase ${payload.phaseNumber} (${payload.phaseLabel}) is placed here in today's study stack.

Reading: ${payload.readingTitle || 'N/A'}
LOS: ${payload.losCode || 'N/A'}
Phase: ${payload.phaseLabel} (${payload.stepType})
Position: ${payload.phaseNumber} of ${payload.totalPhases}
Dependencies: ${deps}
Estimated Duration: ${payload.estimatedMinutes || 0} min
Difficulty Hints: ${payload.cognitiveLoadReason || 'Standard'}

Provide:
- Why this step is positioned here (reference dependency chain)
- Expected difficulty level
- One common mistake to watch for
Keep it under 60 words. Do not change the order.
`;
    }
  }
};
