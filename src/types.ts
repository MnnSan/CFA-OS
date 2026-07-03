/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CFA Levels supported by the curriculum architecture.
 */
export type CFALevel = 'Level I' | 'Level II' | 'Level III';

export interface CurriculumWorkspaceState {
  selectedSubjectId?: string;
  selectedChapterId?: string;
  selectedReadingId?: string;
  mode: 'subject' | 'reading';
  activeTab: 'overview' | 'los' | 'notes' | 'formulas' | 'resources' | 'analytics';
}

/**
 * Core User profile model.
 * Designed to support future multi-user, synchronization, and advanced progress metrics.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedDate: string;
  streakDays: number;
}

/**
 * Comprehensive settings model.
 * Fully extensible to support future configurations like customizable AI assistant temperaments,
 * notification channels, and personalized spaced-repetition schedules.
 */
export type AiAvailabilityLevel =
  | 'OFFLINE'
  | 'CONNECTED'
  | 'RATE_LIMITED'
  | 'INVALID_KEY'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR';

export interface StudySettings {
  theme: 'light' | 'dark';
  examDate: string;
  targetStartDate: string;
  targetDailyHours: number;
  preferredSessionLength: number; // in minutes
  notificationsEnabled: boolean;
  reviewBuffer: number; // buffer in days before the exam date
  notificationPreferences: {
    email: boolean;
    push: boolean;
    streakReminders: boolean;
  };
  // Future AI Capabilities Placeholder Config
  aiModel?: 'gemini-3.5-flash' | 'gemini-3.1-pro';
  aiPersona?: 'rigorous-academic' | 'pragmatic-coach' | 'socratic-guide';
  aiStreamingEnabled: boolean;
  aiProvider?: 'google-gemini' | 'anthropic-claude' | 'local-ollama';
  geminiApiKey?: string;
  claudeApiKey?: string;
  ollamaEndpoint?: string;
  aiAvailability?: AiAvailabilityLevel;
  telemetryTokens?: {
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  };
}

/**
 * Topic Area / Subject in the CFA curriculum.
 */
export interface Subject {
  id: string;
  level: CFALevel;
  name: string;
  description: string;
  code: string; // e.g. "PM" for Portfolio Management
  cfaWeight?: string; // CFA Weight
  totalHoursEstimate?: number; // Estimated Study Hours at Subject level
  order?: number;
  enabled?: boolean;
  metadata?: any;
}

/**
 * Chapter within a Subject.
 */
export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  order?: number;
  estimatedHours?: number;
  enabled?: boolean;
  metadata?: any;
}

/**
 * Reading within a Chapter.
 */
export interface Reading {
  id: string;
  subjectId: string; // Keep for backward compatibility
  chapterId?: string; // Link to parent Chapter
  name?: string; // Dynamic Reading Name
  title: string; // Keep for backward compatibility (points to name)
  readingNumber?: number; // Mapped to number
  number: number; // Keep for backward compatibility (points to readingNumber)
  description: string;
  topicArea?: string; // e.g. "Portfolio Management"
  estimatedHours?: number; // Estimated study hours
  cfaWeight?: string; // Reading specific weighting
  difficulty?: 'Easy' | 'Medium' | 'Intermediate' | 'Hard' | null;
  targets?: ReadingStudyTargets;
  enabled?: boolean;
  order?: number;
}

/**
 * Learning Outcome Statement (LOS) - The atomic learning unit of the CFA curriculum.
 * Fully extended to support:
 * - Basic Information
 * - Progress Tracking
 * - Knowledge Links
 * - Future AI Fields
 */
export interface LearningOutcomeStatement {
  // --- Basic Information ---
  id: string; // LOS ID
  readingId: string; // Reading ID
  code: string; // e.g., "7.a" (LOS Number)
  statement: string; // LOS Description (points to title/description)
  title?: string; // Dynamic LOS Title
  description?: string; // Dynamic LOS Description
  readingName?: string; // Reading Name
  subject?: string; // Subject Name or ID
  topicArea?: string; // Topic Area / Subject
  estimatedHours?: number; // Estimated Study Hours
  difficulty: 'Easy' | 'Medium' | 'Intermediate' | 'Hard' | null; // Difficulty
  cfaWeight?: string; // CFA Weight
  order?: number;
  enabled?: boolean;

  // --- Progress Tracking ---
  status: 'Not Started' | 'In Progress' | 'Completed'; // Completion Status
  confidence: number | null; // Confidence Rating (1-5)
  actualHours?: number; // Time Spent in hours
  timeSpent?: number; // Time Spent in minutes
  revisionCount?: number; // Revision Count
  lastReviewed?: string; // Last Reviewed date ISO string
  nextReview?: string; // Next Review date ISO string
  questionsAttempted?: number; // Practice Questions Attempted (legacy support)
  questionsCorrect?: number; // Practice Questions Correct (legacy support)
  practiceQuestionsAttempted?: number; // Practice Questions Attempted
  practiceAccuracy?: number; // Practice Accuracy (%)
  mockExamReferences?: string[]; // Mock Exam References e.g., ["2026 Mock AM Q4"]

  // --- Knowledge Links ---
  relatedFormulas?: string[]; // Related Formulas (IDs)
  relatedNotes?: string[]; // Related Notes (IDs)
  relatedResources?: string[]; // Related Resources (IDs)
  relatedVideos?: string[]; // Related Videos (URLs or IDs)
  relatedMindMaps?: string[]; // Related Mind Maps (IDs)
  relatedFlashcards?: string[]; // Related Flashcards (IDs)
  relatedMistakes?: string[]; // Related Mistakes / Past Errors
  relatedConcepts?: string[]; // Related Concepts / Terms
  relatedLOS?: string[]; // Related LOS (IDs)
  relatedBlueBoxExamples?: string[]; // Related Blue Box Examples

  // --- Future AI Fields ---
  aiSummary?: string; // AI Summary
  aiExplanationCache?: string; // AI Explanation cache (legacy)
  aiExplanation?: string; // AI Explanation (expanded detail)
  aiQuiz?: any; // AI Quiz (questions/answers JSON schema)
  aiWeaknessScore?: number; // AI Weakness Score (0-100)
  aiTutorContext?: string; // AI Tutor Context (custom notes/guidance)

  bookmarked: boolean; // Keep for interface support
  formulaIds?: string[]; // Keep for legacy support
}

/**
 * File categorization for the resource library.
 */
export type ResourceCategory =
  | 'Curriculum PDFs'
  | 'Schweser'
  | 'Personal Notes'
  | 'Formula Sheets'
  | 'Mind Maps'
  | 'Videos'
  | 'Question Banks'
  | 'Mocks'
  | 'Flashcards'
  | 'Bookmarks';

export type AssetStatus =
  | 'Queued'
  | 'Uploading'
  | 'Stored'
  | 'ExtractingText'
  | 'RunningOCR'
  | 'Cleaning'
  | 'Chunking'
  | 'FormulaDetection'
  | 'LOSDetection'
  | 'RelationshipLinking'
  | 'Indexing'
  | 'Ready'
  | 'Failed';

export interface AssetChunk {
  id: string;
  assetId: string;
  chunkIndex: number;
  heading: string;
  content: string;
  pageNumber: number;
  formulas: string[];
  losReferences: string[];
  readingReferences: string[];
}

export interface AssetHighlight {
  id: string;
  text: string;
  color: string;
  pageNumber: number;
  createdAt: string;
}

export interface AssetAnnotation {
  id: string;
  type: 'StickyNote' | 'Comment';
  text: string;
  pageNumber: number;
  createdAt: string;
}

export interface AssetTimelineEvent {
  type: 'uploaded' | 'opened' | 'edited' | 'reviewed' | 'linked' | 'annotated';
  timestamp: string;
  description: string;
}

export interface AssetIngestionManifest {
  fingerprint: string;
  pages: number;
  size: number;
  language: string;
  ocrEngineUsed: string;
  extractionVersion: string;
  chunkCount: number;
  formulaCount: number;
  losCount: number;
  readingCount: number;
  knowledgeScore: number;
  pipelineVersion: string;
  builderVersion: string;
  processingDurationMs?: number;
}

export interface AssetHealth {
  storageUsedBytes: number;
  totalChunksCount: number;
  brokenChunksCount: number;
  missingMetadataCount: number;
  ocrSuccessCount: number;
  formulaDetectionRate: number;
  losDetectionRate: number;
  readingDetectionRate: number;
  processingErrorsCount: number;
  duplicateDocsCount: number;
}

export interface AssetMetadata {
  topics: string[];
  keywords: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  estimatedStudyTime?: number;
  pagesCount?: number;
  language?: string;
  confidenceRating?: number;
  version: number;
}

/**
 * Document & Video Resource model.
 * Enhanced for Part 5 Resource Linking and Sprint 7 Ingestion System.
 */
export interface Resource {
  id: string;
  name: string; // Document Name
  category: ResourceCategory;
  url: string;
  fileType: string; // Document Type (e.g., "pdf", "mp4", "xlsx", "link")
  fileSize?: string; // e.g., "4.2 MB"
  dateAdded: string;
  
  // Metadata Linkages
  linkedSubjectId?: string; // Subject
  linkedReadingId?: string; // Reading
  linkedLOSId?: string; // LOS
  subject?: string;
  reading?: string;
  los?: string;
  
  // Advanced Metadata
  pages?: number; // Pages
  tags?: string[]; // Tags
  version?: string; // Version
  author?: string; // Author
  bookmarks?: string[]; // Bookmarks
  highlights?: string[]; // Highlights
  personalRating?: number; // Personal Rating (1-5)
  isFavorite: boolean;
  description?: string;

  // Future OCR / AI capabilities
  futureOcrSupport?: boolean;
  futureSemanticSearch?: boolean;
  futureNotebookLMSource?: boolean;
  futureAiEmbeddings?: number[];
  futureFormulaExtraction?: string[];

  // Sprint 7 Ingestion Additions
  readingProgress?: number; // 0 to 100 percentage (optional to support seeded resource structures)
  lastReadPage?: number;
  lastReadAt?: string | null;
  status?: AssetStatus;
  chunks?: AssetChunk[];
  highlightsList?: AssetHighlight[];
  annotations?: AssetAnnotation[];
  timeline?: AssetTimelineEvent[];
  manifest?: AssetIngestionManifest;
  metadata?: AssetMetadata;

  // Future AI Placeholders
  aiSummary?: string;
  aiExplanation?: string;
  aiQuiz?: any;
  aiFlashcards?: any;
  notebookLmLink?: string;
  embeddingId?: string;
  vectorId?: string;
  chunkId?: string;
}

export type Asset = Resource;

/**
 * Event categories for the study calendar.
 */
export type CalendarEventType = 'Study Session' | 'Revision' | 'Mock Exam' | 'Personal Reminder' | 'Deadline';

/**
 * Calendar Event model.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  type: CalendarEventType;
  description?: string;
  isCompleted: boolean;
  
  // Linkages
  linkedSubjectId?: string;
  linkedReadingId?: string;
  linkedLOSId?: string; // Direct link to LOS (Part 3 requirement)
}

/**
 * Structured Markdown Note model.
 * Enhanced for Part 6 Notes Architecture.
 */
export interface StudyNote {
  id: string;
  title: string;
  content: string; // Markdown Content
  createdTime: string; // Created
  updatedTime: string; // Updated
  
  // Syllabus & Resource Linkages
  linkedSubjectId?: string; // Subject
  linkedReadingId?: string; // Reading
  linkedLOSId?: string; // LOS
  subject?: string;
  reading?: string;
  los?: string;
  
  linkedResourceId?: string;
  
  // Knowledge Links
  relatedFormula?: string[]; // Related Formula
  relatedResources?: string[]; // Related Resources
  bookmarks?: string[]; // Bookmarks
  versionHistory?: Array<{ timestamp: string; content: string; title: string }>; // Version History
  pinned?: boolean; // Pinned
  favorite?: boolean; // Favorite (legacy support alias)
  isFavorite?: boolean; // Favorite (legacy support alias)

  // Future AI fields
  futureAiSummary?: string;
  futureAiFlashcards?: any[];
  futureAiQuiz?: any;
}

/**
 * Recent Activity Feed Item model for audit logs and productivity analytics.
 */
export interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'study' | 'note' | 'resource' | 'setting' | 'calendar';
  description: string;
  meta?: string;
}

/**
 * Global Search Result Wrapper
 */
export interface SearchResult {
  id: string;
  type: 'subject' | 'reading' | 'los' | 'note' | 'resource' | 'event' | 'formula';
  title: string;
  subtitle: string;
  route: string; // View navigation context
}

// ==========================================
// CENTRAL DOMAIN MODELS (Part 8 Requirements)
// ==========================================

export interface Exam {
  id: string;
  level: CFALevel;
  title: string;
  weightingMap?: Record<string, string>; // e.g., {"Ethics": "10-15%"}
  totalEstimatedHours: number;
}

export interface StudySession {
  id: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  linkedSubjectId?: string;
  linkedReadingId?: string;
  linkedLOSId?: string;
  notesAddedIds?: string[];
  resourcesUsedIds?: string[];
  mentalFocusScore?: number; // 1-10 rating
  questionsAttemptedPlaceholder?: number;
  confidenceBefore?: number | null;
  confidenceAfter?: number | null;
  status?: 'Completed' | 'Paused' | 'Cancelled';
  sessionType?: 'instructional' | 'application' | 'general';
  reflectionDifficulty?: 'Easy' | 'Medium' | 'Hard';
  reflectionNotes?: string;
  reflectionConfusion?: string;
}

export interface Formula {
  id: string;
  name: string;
  latexExpression: string;
  description: string;
  linkedSubjectId?: string;
  linkedReadingId?: string;
  linkedLOSId?: string;
  variables: Array<{ symbol: string; meaning: string }>;
  isMemorized: boolean;
  strategicNuances?: string[];
  examPitfalls?: string[];
  masterySteps?: {
    equation: boolean;
    variables: boolean;
    assumptions: boolean;
    limitations: boolean;
    apply: boolean;
  };
  confidenceRating?: number | null;
}

export interface Bookmark {
  id: string;
  type: 'los' | 'note' | 'resource' | 'formula' | 'event';
  itemId: string;
  timestamp: string;
  tag?: string;
}

export interface Revision {
  id: string;
  losId: string;
  timestamp: string;
  leitnerBox: number; // 1 to 5
  nextReviewDate: string;
  elapsedTimeSeconds: number;
  confidenceShift: { from: number; to: number };
}

export interface Question {
  id: string;
  losId: string;
  questionText: string;
  answerChoices: Array<{ id: string; text: string; letter: 'A' | 'B' | 'C' }>;
  correctAnswerLetter: 'A' | 'B' | 'C';
  explanationText: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface MockResult {
  id: string;
  examDate: string;
  scorePercentage: number;
  timeSpentSeconds: number;
  answers: Array<{ questionId: string; isCorrect: boolean; selectedLetter: 'A' | 'B' | 'C' }>;
  subjectBreakdown: Record<string, { attempted: number; correct: number }>;
}

// =========================================================
// FUTURE EXTENSIONS STRUCTURAL PREPARATIONS (Part 9 & 11)
// =========================================================

export interface FutureAiContext {
  losWeaknessRatings: Record<string, number>; // 0 to 100 rating
  autoGeneratedTutorPrompts: Record<string, string>;
  spacedRepetitionScores: Record<string, number>;
  recommendedStudySequences: string[]; // LOS IDs in order
}

export interface FutureNotebookContext {
  uploadedSourceIds: string[];
  semanticChunksCount: number;
  autoGeneratedSummaries: Record<string, string>;
  conceptualMindMaps: Record<string, any>;
}

export interface FutureAnalytics {
  dailyStudyMinutesSeries: Array<{ date: string; minutes: number }>;
  subjectConfidenceDistribution: Record<string, number>;
  accuracyOverTime: Array<{ date: string; score: number }>;
  timeSpentPerReading: Record<string, number>;
}

// =========================================================
// RUNTIME ENRICHED METADATA & RELATIONSHIP OBJECTS
// =========================================================

export interface EnrichedSubject extends Subject {
  difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
  personalProgress: number; // Completion % (0-100)
  readingCount: number;
  averageConfidence: number;
  timeInvested: number; // Total hours studied
  completionPercentage: number; // 0-100
  dependencies: string[]; // Subject IDs
  relatedSubjects: string[]; // Subject IDs
}

export interface EnrichedReading extends Reading {
  progress: number; // Completion % (0-100)
  losCount: number;
  formulaCount: number;
  blueBoxCount: number; // placeholder
  eocQuestionCount: number; // placeholder
  notesCount: number;
  resourceCount: number;
  studySessions: StudySession[];
  averageConfidence: number;
  totalHoursInvested: number; // Total hours studied
  relatedReadings: string[]; // Reading IDs
  suggestedPrerequisites: string[]; // Reading IDs
}

export interface EnrichedLOS extends LearningOutcomeStatement {
  confidenceHistory: number[]; // From completed sessions
  revisionCount: number;
  formulaReferences: string[]; // Formula IDs
  resourceReferences: string[]; // Resource IDs
  noteReferences: string[]; // Note IDs
  studySessionHistory: StudySession[];
  examImportance?: 'High' | 'Medium' | 'Low';
  semanticEmbedding?: number[]; // placeholder
  aiGroundingContext?: string; // placeholder
}

// =========================================================
// DOMAIN EVENTS & DISPATCH STRUCTS
// =========================================================

// =========================================================
// SPRINT 6.5 — MARK MELDRUM STUDY PLANNER
// =========================================================

export interface ReadingStudyTargets {
  pageCount: number;
  totalLOSCount: number;
  eocqCount: number;
  videoDurationString: string;
  videoDurationMinutes: number;
  weightingFactor: number;
}

export interface PlannerReadingProgress {
  readingId: string;
  loggedVideoMinutes: number;
  completedEOCQ: number;
}

export interface MMPlannerState {
  readings: PlannerReadingProgress[];
}

export const MM_START_DATE = '2026-06-28';
export const MM_END_DATE = '2027-02-20';
export const MM_TARGET_BUDGET_HOURS = 220;
export const MM_DAYS_OF_REVIEW = 30;
export const MM_PLANNED_HOURS_PER_WEEK = 12;

export type IngestionEventType =
  | 'AssetUploaded'
  | 'AssetProcessingStarted'
  | 'AssetChunkCreated'
  | 'AssetOCRCompleted'
  | 'AssetIndexed'
  | 'AssetLinked'
  | 'HighlightCreated'
  | 'AnnotationCreated'
  | 'DocumentOpened'
  | 'DocumentClosed'
  | 'ReadingProgressUpdated';

export type CFAEventType =
  | 'StudySessionCompleted'
  | 'NoteCreated'
  | 'NoteUpdated'
  | 'ResourceLinked'
  | 'LOSCompleted'
  | 'ConfidenceChanged'
  | 'FormulaMastered'
  | 'FormulaFavorited'
  | 'FormulaReviewed'
  | 'FormulaLinkedToNote'
  | 'InstructionalSessionLogged'
  | 'ApplicationProgressUpdated'
  | IngestionEventType;

export interface DomainEvent<T = any> {
  type: CFAEventType | string; // Event name
  timestamp: string;     // ISO datetime string
  source: string;        // Trigger source component/service
  entityId: string;      // Primary identifier of the affected entity
  payload: T;            // Event-specific data payload
  metadata?: {           // Extensible diagnostic or contextual tags
    userId?: string;
    deviceClockOffset?: number;
    [key: string]: any;
  };
}

// =========================================================
// SPRINT 8 INTELLIGENCE-TIER DOMAIN INTERFACES
// =========================================================

export interface ReadingIntelligence {
  assetId: string;
  pagesRead: number;
  elapsedSeconds: number;
  averageWpm: number;
  readingEfficiency: number; // actual WPM vs baseline WPM
  focusScore: number; // 0-100 derived from reading pace consistency
  skimmingSeconds: number; // seconds spent on pages read faster than 150 WPM
  deepReadingSeconds: number; // seconds spent on pages read slower than 150 WPM
  rereadsCount: number;
  comprehensionEstimated: number; // 0-100 derived from time-per-page vs complexity
  highlightDensity: number; // highlights per page
  annotationDensity: number; // annotations per page
}

export interface DailySnapshot {
  id: string;
  date: string; // YYYY-MM-DD
  knowledgeHealth: number; // Graph health %
  confidenceDecayed: number; // Average decayed confidence score
  coverage: number; // Knowledge coverage %
  velocityHours: number; // Average hours/day studied
  studyHours: number; // Actual hours studied this day
  burnoutFlag: boolean;
  readinessScore: number; // Exam readiness %
  missionId?: string;
  weakTopicIds: string[];
}

export interface GraphAnalyzerHealth {
  overallGraphHealth: number; // 0-100 %
  isolatedNotesCount: number;
  orphanFormulasCount: number;
  missingResourceLinksCount: number; // Readings with no resources
  disconnectedLOSCount: number; // LOS with no note/formula/asset
  duplicateAssetsCount: number;
  knowledgeDensity: number; // ratio of edges to nodes
}

export interface RevisionItem {
  id: string;
  type: 'formula' | 'note' | 'los';
  title: string;
  dueTimestamp: string;
  priorityScore: number;
  leitnerBox?: number;
  confidenceRating?: number;
}

export interface IntelligenceStore {
  readingSessionActiveReport: ReadingIntelligence | null;
  revisionQueue: RevisionItem[];
  dailySnapshotsList: DailySnapshot[];
  graphAnalyzerHealthReport: { health: GraphAnalyzerHealth; isolatedNotes: StudyNote[]; orphanFormulas: Formula[]; disconnectedLOS: LearningOutcomeStatement[]; missingResourcesReadings: Reading[] } | null;
  examReadinessReport: any;
  burnoutDetected: boolean;
  dailyMission: any;
  activeReadingAssetId: string | null;
  isDegraded: boolean;
  plannerProgress: PlannerReadingProgress[];
}

export interface CommandIntent {
  action: 'study' | 'note' | 'resume' | 'graph' | 'unknown';
  argument?: string;
}

// =========================================================
// SNAPSHOT ENGINE & EVENT-STATE PAIRING (Intelligence Upgrade)
// =========================================================

export interface StoredEvent {
  index: number;
  type: string;
  timestamp: string;
  source: string;
  entityId?: string;
  payload?: any;
  receivedAt: string;
}

export interface IntelligenceDerivedMetrics {
  syllabusCompletionPct: number;
  avgConfidence: number;
  formulaRecallPct: number;
  studyVelocityHours: number;
  projectedFinishDays: number;
  weakTopicCount: number;
  revisionQueueLength: number;
  daysUntilExam: number;
}

export interface EventWithSnapshot {
  event: StoredEvent;
  stateBefore: Partial<IntelligenceStore> | null;
  stateAfter: Partial<IntelligenceStore> | null;
  derivedMetrics: IntelligenceDerivedMetrics | null;
  recordedAt: string;
}

export interface SnapshotRecord {
  id: string;
  timestamp: string;
  store: IntelligenceStore;
  reason: 'periodic' | 'event-triggered' | 'manual' | 'degraded-fallback';
  triggerEvent?: string;
  metrics: IntelligenceDerivedMetrics;
}

export interface WeakTopicsSummary {
  subjectWeakness: Array<{ subjectId: string; name: string; code: string; weaknessScore: number; reason: string }>;
  readingWeakness: Array<{ readingId: string; name: string; weaknessScore: number; reason: string }>;
  topWeakestSubject: string;
  topWeakestReading: string;
}

export interface BurnoutRiskReport {
  detected: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  recentSessionCount: number;
  avgSessionDurationMin: number;
  recommendation: string;
}

export interface RevisionQueueSummary {
  items: RevisionItem[];
  totalCount: number;
  highPriorityCount: number;
  dueToday: number;
  estimatedReviewMinutes: number;
  oldestDueItem: string | null;
}

// ── Multi-Template Timeline Engine (Sprint 10) ──

export interface TimelineBlock {
  id: string;
  subjectId: string;
  readingId?: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}

export interface TimelineTemplate {
  id: string;
  name: string;
  description?: string;
  isEditable: boolean;
  blocks: TimelineBlock[];
  createdAt: string;
  updatedAt: string;
}

// -- Sprint M10 � Mission Control & Study Stack --

export type StudyStepType = 'Lecture' | 'Reading' | 'Formula' | 'Notebook' | 'Questions' | 'Reflection';

export type PhaseStatus = 'READY' | 'ACTIVE' | 'BLOCKED' | 'COMPLETED' | 'SKIPPED';

export type CognitiveLoad = 'LOW' | 'MEDIUM' | 'HIGH';

export type MissionProfile = 'Balanced' | 'Calculation Intensive' | 'Reading Intensive' | 'Revision Day' | 'Recovery Day' | 'Momentum Builder';

export type MissionTemplateId = 'standard' | 'review' | 'formula' | 'mock' | 'recovery';

export interface PhaseTemplate {
  phaseNumber: number;
  phaseLabel: string;
  stepType: StudyStepType;
  icon: string;
  description: string;
}

export interface MissionTemplate {
  id: MissionTemplateId;
  phases: PhaseTemplate[];
}

export interface MissionResourceReference {
  provider: string;
  resourceType: string;
  resourceId: string;
  title: string;
  launchAction: string;
  resumeAction?: string;
  metadata: Record<string, any>;
}

export interface CompletionEvidence {
  lectureCompleted?: boolean;
  readingProgress?: number;
  notesTaken?: boolean;
  questionsSolved?: number;
  questionsTotal?: number;
  reflectionSubmitted?: boolean;
  videoPosition?: string;
  custom?: Record<string, any>;
}

export interface StudyPhase {
  id: string;
  phaseNumber: number;
  phaseLabel: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: PhaseStatus;
  locked: boolean;
  lockedReason?: string;
  stepType: StudyStepType;
  resources: MissionResourceReference[];
  dependsOn: string[];
  completed: boolean;
  completionEvidence: CompletionEvidence;
  coachInsightId?: string;
}

export interface StudyStack {
  readingId: string;
  readingTitle: string;
  readingNumber: number;
  subjectCode: string;
  templateId: MissionTemplateId;
  phases: StudyPhase[];
  activePhase: StudyPhase | null;
  nextPhase: StudyPhase | null;
  totalEstimatedMinutes: number;
  remainingMinutes: number;
  completedPhases: number;
  totalPhases: number;
  progressPercent: number;
  cognitiveLoad: CognitiveLoad;
  cognitiveLoadReason: string;
  missionProfile: MissionProfile;
  completionForecast: string;
  generatedAt: string;
  version: string;
}

export interface CoachInsight {
  phaseId: string;
  readingId: string;
  promptVersion: string;
  provider: string;
  response: string;
  generatedAt: string;
}
