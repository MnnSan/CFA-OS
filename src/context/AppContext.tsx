/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  StudySettings,
  Subject,
  Reading,
  LearningOutcomeStatement,
  Resource,
  CalendarEvent,
  StudyNote,
  ActivityItem,
  CFALevel,
  StudySession,
  Formula,
  Asset,
  AssetHighlight,
  AssetAnnotation,
  ReadingIntelligence,
  DailySnapshot,
  GraphAnalyzerHealth,
  RevisionItem,
  PlannerReadingProgress
} from '../types';
import { StudySessionService } from '../services/StudySessionService';
import { CurriculumIntelligenceService } from '../services/CurriculumIntelligenceService';
import {
  SubjectRepository,
  ReadingRepository,
  LOSRepository,
  FormulaRepository,
  ResourceRepository,
  NoteRepository,
  StudySessionRepository,
  INITIAL_FORMULAS,
  AssetRepository
} from '../repositories';
import { AnalyticsService } from '../services/AnalyticsService';
import { MissionEngine } from '../services/MissionEngine';
import { EventBus, eventBus } from '../services/EventBus';
import { GraphSnapshot, KnowledgeGraphService } from '../knowledge';
import { backgroundProcessingQueue } from '../services/BackgroundProcessingQueue';
import { documentPipelineService } from '../services/DocumentPipelineService';
import { knowledgeLinkingService } from '../services/KnowledgeLinkingService';
import { assetSearchService } from '../services/AssetSearchService';
import { learningGraphAnalyzerService } from '../services/LearningGraphAnalyzerService';
import { examReadinessService } from '../services/ExamReadinessService';
import { revisionEngineService } from '../services/RevisionEngineService';
import { missionEngineService } from '../services/MissionEngineService';
import { readingIntelligenceService } from '../services/ReadingIntelligenceService';
import { learningIntelligenceService } from '../services/LearningIntelligenceService';
import { dailySnapshotService } from '../services/DailySnapshotService';
import { EventStoreService } from '../services/EventStoreService';
import { CommandRouterService } from '../services/CommandRouterService';
import { intelligenceOrchestratorService } from '../services/IntelligenceOrchestratorService';
import { IntelligenceAggregator } from '../services/IntelligenceAggregatorService';
import { snapshotEngineService } from '../services/SnapshotEngineService';
import { intelligenceQueryService, IntelligenceQueryService } from '../services/IntelligenceQueryService';
import { intelligenceStream } from '../services/IntelligenceStream';
import { PLANNER_READINGS, PLANNER_SUBJECTS, DEFAULT_PLANNER_PROGRESS } from '../data/plannerReadings';
import { knowledgeIndexService } from '../services/KnowledgeIndexService';

/**
 * AppState holds the central, single-source-of-truth state for the operating system.
 */
interface AppContextType {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedReadingId: string | null;
  setSelectedReadingId: (id: string | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Central Study Context
  selectedLOSId: string | null;
  setSelectedLOSId: (id: string | null) => void;
  selectedResourceId: string | null;
  setSelectedResourceId: (id: string | null) => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  selectLOS: (losId: string | null) => void;

  // Study Session Engine
  activeSession: StudySession | null;
  sessionHistory: StudySession[];
  isSessionPaused: boolean;
  sessionElapsedTime: number;
  startStudySession: (params: { linkedSubjectId?: string; linkedReadingId?: string; linkedLOSId?: string }) => void;
  pauseStudySession: () => void;
  resumeStudySession: () => void;
  finishStudySession: (mentalFocusScore?: number, confidenceAfter?: number | null) => void;
  cancelStudySession: () => void;

  // Authentication State
  user: UserProfile | null;
  login: (email: string, name: string) => void;
  logout: () => void;
  updateProfile: (name: string, email: string) => void;

  // central Configuration & User Settings
  settings: StudySettings;
  updateSettings: (updates: Partial<StudySettings>) => void;

  // Curriculum database
  activeLevel: CFALevel;
  setActiveLevel: (level: CFALevel) => void;
  subjects: Subject[];
  readings: Reading[];
  losList: LearningOutcomeStatement[];
  updateLOS: (id: string, updates: Partial<LearningOutcomeStatement>) => void;
  toggleLOSBookmark: (id: string) => void;

  // Resources (Library / Knowledge Vault)
  resources: Resource[];
  addResource: (resource: Omit<Resource, 'id' | 'dateAdded'>) => void;
  toggleResourceFavorite: (id: string) => void;
  deleteResource: (id: string) => void;
  uploadAsset: (file: File, linkedIds?: { subjectId?: string; readingId?: string; losId?: string }) => Promise<string>;
  updateAssetProgress: (id: string, progress: number, lastPage?: number) => void;
  addAssetHighlight: (id: string, highlight: Omit<AssetHighlight, 'id' | 'createdAt'>) => void;
  addAssetAnnotation: (id: string, annotation: Omit<AssetAnnotation, 'id' | 'createdAt'>) => void;
  clearIngestionQueue: () => void;

  // Calendar
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Notes
  notes: StudyNote[];
  addNote: (note: Omit<StudyNote, 'id' | 'createdTime' | 'updatedTime'>) => string;
  updateNote: (id: string, title: string, content: string, links?: Partial<Pick<StudyNote, 'linkedSubjectId' | 'linkedReadingId' | 'linkedLOSId' | 'linkedResourceId'>>) => void;
  deleteNote: (id: string) => void;

  // Formulas (Sprint 6)
  formulas: Formula[];
  updateFormula: (id: string, updates: Partial<Formula>) => void;

  // Logs
  activityFeed: ActivityItem[];
  logActivity: (type: ActivityItem['type'], description: string, meta?: string) => void;
  clearActivityLog: () => void;

  // Services & Repositories
  curriculumEngine: CurriculumIntelligenceService;
  analyticsService: AnalyticsService;
  missionEngine: MissionEngine;
  eventBus: EventBus;
  knowledgeSnapshot: GraphSnapshot;
  knowledgeGraphService: KnowledgeGraphService;
  
  // Sprint 8 Intelligence Engine Properties
  readingSessionActiveReport: ReadingIntelligence | null;
  revisionQueue: RevisionItem[];
  dailySnapshotsList: DailySnapshot[];
  graphAnalyzerHealthReport: { health: GraphAnalyzerHealth; isolatedNotes: StudyNote[]; orphanFormulas: Formula[]; disconnectedLOS: LearningOutcomeStatement[]; missingResourcesReadings: Reading[] } | null;
  examReadinessReport: any;
  burnoutDetected: boolean;
  dailyMission: any;
  activeReadingAssetId: string | null;
  isDegraded: boolean;
  
  // Sprint 8 Infrastructure Services
  eventStoreService: EventStoreService;
  commandRouter: CommandRouterService;
  
  // Intelligence Upgrade – Query Layer & Snapshot Engine
  intelligenceQueryService: IntelligenceQueryService;
  snapshotEngineService: typeof snapshotEngineService;
  
  // Sprint 8 Reading Telemetry Methods
  startReadingSession: (assetId: string, page?: number) => void;
  logReadingPageFlip: (page: number) => void;
  endReadingSession: () => void;

  // Sprint 6.5 – MM Planner
  plannerReadings: Reading[];
  plannerSubjects: Subject[];
  plannerProgress: PlannerReadingProgress[];
  logVideoMinutes: (readingId: string, minutes: number) => void;
  recordEOCQCompleted: (readingId: string, count: number) => void;
  getReadingProgress: (readingId: string) => number; // 60/40 weighted %
  // Sprint 9 — CRUD for planner readings
  addPlannerReading: (reading: Omit<Reading, 'id'>) => string;
  updatePlannerReading: (id: string, updates: Partial<Reading>) => void;
  deletePlannerReading: (id: string) => void;
  addPlannerSubject: (subject: Omit<Subject, 'id'>) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Static Curriculum database for Level III (UUID-based relations)
export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'e5b7b901-b258-45a7-96a8-a5b501d515a0', level: 'Level III', name: 'Ethical and Professional Standards', description: 'Application of Code and Standards, Asset Manager Code of Professional Conduct, and GIPS standards.', code: 'ETH' },
  { id: '4d306b3a-5f05-4cbb-bb78-75c1a798ee73', level: 'Level III', name: 'Capital Market Expectations', description: 'Forecasting capital market returns, identifying economic indicators, and assessing risks.', code: 'CME' },
  { id: '9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf', level: 'Level III', name: 'Asset Allocation', description: 'Strategic and tactical asset allocation, optimization techniques, and implementation hurdles.', code: 'AA' },
  { id: '7c9a4e05-c49b-4bc9-93e1-32a21008064d', level: 'Level III', name: 'Fixed Income Portfolio Management', description: 'Liability-driven investing, active yield curve strategies, and credit portfolio management.', code: 'FI' },
  { id: '1c2f0d92-7f72-4752-9c16-8367a84e62ad', level: 'Level III', name: 'Equity Portfolio Management', description: 'Passive investing, active strategy execution, portfolio construction, and trading cost analytics.', code: 'EQ' },
  { id: 'ea05b47a-6df2-47c5-a6e5-3ab45aef34fe', level: 'Level III', name: 'Alternative Investments', description: 'Hedge fund strategies, private equity, real estate, and asset allocation integrations.', code: 'ALT' },
  { id: 'bc78e874-94c6-4b2a-89a1-5d9c2cfde548', level: 'Level III', name: 'Private Wealth Management', description: 'Tax management, estate planning, concentrated wealth positioning, and retirement analytics.', code: 'PWM' },
  { id: '31d044fa-cf5b-43fe-b391-766cf2cde129', level: 'Level III', name: 'Institutional Asset Management', description: 'Pension plans, endowments, sovereign wealth funds, and investment policy statement constraints.', code: 'IAM' },
  { id: 'df412a80-bfd7-463c-91df-cde24d5432ba', level: 'Level III', name: 'Portfolio Performance Evaluation', description: 'Benchmarking, attribution analysis, and assessing the skill vs. luck of active managers.', code: 'PE' },
  { id: '9d8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b', level: 'Level III', name: 'Derivatives & Currency Management', description: 'Options, swaps, currency overlay, and cross-hedging strategies for institutional portfolios.', code: 'DC' },
  { id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', level: 'Level III', name: 'Trading, Execution & Rebalancing', description: 'Trade cost analytics, implementation shortfall, portfolio rebalancing, and tax-aware trading.', code: 'TE' }
];

export const INITIAL_READINGS: Reading[] = [
  { id: 'ab102030-4050-4060-8070-90a0b0c0d001', subjectId: 'e5b7b901-b258-45a7-96a8-a5b501d515a0', number: 1, title: 'Code of Ethics & Standards of Professional Conduct', description: 'Ethical framework and professional requirements for investment professionals.' },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d002', subjectId: 'e5b7b901-b258-45a7-96a8-a5b501d515a0', number: 2, title: 'Guidance for Standards I–VII', description: 'Deep dive into standard operations, compliance advice, and violation scenarios.' },
  
  { id: 'ab102030-4050-4060-8070-90a0b0c0d005', subjectId: '4d306b3a-5f05-4cbb-bb78-75c1a798ee73', number: 5, title: 'Capital Market Expectations: Forecasting Tools', description: 'Overview of quantitative and qualitative forecasting methods and sources of measurement error.' },
  
  { id: 'ab102030-4050-4060-8070-90a0b0c0d008', subjectId: '9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf', number: 8, title: 'Principles of Asset Allocation', description: 'Mean-variance optimization, Black-Litterman model, and Monte Carlo simulation in asset mixing.' },
  
  { id: 'ab102030-4050-4060-8070-90a0b0c0d012', subjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d', number: 12, title: 'Liability-Driven & Index-Based Fixed Income Strategies', description: 'Immunization techniques, cash flow matching, and tracking fixed-income indexes.' },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d013', subjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d', number: 13, title: 'Yield Curve Strategies', description: 'Formulating active strategies based on yield curve shifts, twists, and key rate durations.' },
  
  { id: 'ab102030-4050-4060-8070-90a0b0c0d015', subjectId: '1c2f0d92-7f72-4752-9c16-8367a84e62ad', number: 15, title: 'Active Equity Investing: Strategies', description: 'Fundamental vs. quantitative active equity approaches, factor modeling, and structural styles.' },
  
  { id: 'ab102030-4050-4060-8070-90a0b0c0d019', subjectId: 'bc78e874-94c6-4b2a-89a1-5d9c2cfde548', number: 19, title: 'Taxes & Private Wealth Management', description: 'Impact of tax environments, asset location, tax-loss harvesting, and wealth transfer vehicles.' },

  // === Portfolio Management Pathway Seeding (Sprint 9) ===
  // Ethics (Pathway)
  { id: 'ab102030-4050-4060-8070-90a0b0c0d003', subjectId: 'e5b7b901-b258-45a7-96a8-a5b501d515a0', number: 3, title: 'Asset Manager Code of Professional Conduct', description: 'Professional obligations for asset management firms and compliance procedures.' },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d004', subjectId: 'e5b7b901-b258-45a7-96a8-a5b501d515a0', number: 4, title: 'Global Investment Performance Standards (GIPS)', description: 'GIPS standards for performance presentation, verification, and composite construction.' },

  // Capital Market Expectations (Pathway)
  { id: 'ab102030-4050-4060-8070-90a0b0c0d006', subjectId: '4d306b3a-5f05-4cbb-bb78-75c1a798ee73', number: 6, title: 'Capital Market Expectations: Economic Growth & Investment Decision', description: 'Economic growth theory, productivity trends, and demographic impact on investment decisions.' },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d007', subjectId: '4d306b3a-5f05-4cbb-bb78-75c1a798ee73', number: 7, title: 'Capital Market Expectations: Forecasting Application', description: 'Applying forecasting tools to build asset class return expectations across equity, fixed income, and alternatives.' },

  // Asset Allocation (Pathway)
  { id: 'ab102030-4050-4060-8070-90a0b0c0d009', subjectId: '9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf', number: 9, title: 'Asset Allocation: Beyond Mean-Variance', description: 'Goals-based allocation, risk parity, factor-based allocation, and Monte Carlo simulation applications.' },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d010', subjectId: '9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf', number: 10, title: 'Asset Allocation: Implementation & Rebalancing', description: 'Rebalancing strategies, implementation constraints, illiquid assets, and rebalancing governance.' },

  // Fixed Income (Pathway)
  { id: 'ab102030-4050-4060-8070-90a0b0c0d011', subjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d', number: 11, title: 'Credit Strategies in Fixed Income', description: 'Credit analysis, relative value, credit curve strategies, and distressed debt investing.' },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d014', subjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d', number: 14, title: 'Fixed-Income Derivatives & Structured Products', description: 'Futures, swaps, options, swaptions, CDS, and structured credit portfolio strategies.' },

  // Equity (Pathway)
  { id: 'ab102030-4050-4060-8070-90a0b0c0d016', subjectId: '1c2f0d92-7f72-4752-9c16-8367a84e62ad', number: 16, title: 'Passive & Semi-Active Equity Investing', description: 'Index-based, enhanced indexing, smart beta, and factor-based equity portfolio strategies.' },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d017', subjectId: '1c2f0d92-7f72-4752-9c16-8367a84e62ad', number: 17, title: 'Equity Portfolio Construction & Implementation', description: 'Portfolio construction process, risk budgeting, trading costs, and implementation decisions.' },

  // Alternatives (Pathway)
  { id: 'ab102030-4050-4060-8070-90a0b0c0d018', subjectId: 'ea05b47a-6df2-47c5-a6e5-3ab45aef34fe', number: 18, title: 'Hedge Fund Strategies & Portfolio Integration', description: 'Hedge fund strategies, fees, due diligence, and portfolio construction with alternative assets.' },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d020', subjectId: 'ea05b47a-6df2-47c5-a6e5-3ab45aef34fe', number: 20, title: 'Private Equity & Real Estate Investing', description: 'Private equity fund structures, valuation, real estate investment trusts, and direct property investing.' },

  // Derivatives & Currency Management (Pathway)
  { id: 'ab102030-4050-4060-8070-90a0b0c0d021', subjectId: '9d8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b', number: 21, title: 'Currency Management: An Introduction', description: 'Foreign exchange risk, currency return decomposition, and strategic currency allocation.', estimatedHours: 4 },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d022', subjectId: '9d8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b', number: 22, title: 'Currency Hedging & Overlay Strategies', description: 'Forward hedging, options-based hedging, cross-hedging, and currency overlay mandates.', estimatedHours: 5 },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d023', subjectId: '9d8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b', number: 23, title: 'Options & Swaps Strategies', description: 'Option strategies for portfolio management, interest rate swaps, total return swaps, and volatility trading.', estimatedHours: 6 },

  // Trading, Execution & Rebalancing (Pathway)
  { id: 'ab102030-4050-4060-8070-90a0b0c0d024', subjectId: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', number: 24, title: 'Trading Costs & Execution Analytics', description: 'Implementation shortfall, VWAP, arrival price algorithms, and best execution frameworks.', estimatedHours: 3 },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d025', subjectId: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', number: 25, title: 'Portfolio Rebalancing & Tax Management', description: 'Rebalancing triggers, tax-aware rebalancing, asset location, and tax-loss harvesting strategies.', estimatedHours: 4 },

  // Performance Evaluation (Pathway)
  { id: 'ab102030-4050-4060-8070-90a0b0c0d026', subjectId: 'df412a80-bfd7-463c-91df-cde24d5432ba', number: 26, title: 'Portfolio Performance Evaluation', description: 'Benchmark selection, performance measurement, return decomposition, and skill vs luck assessment.', estimatedHours: 4 },
  { id: 'ab102030-4050-4060-8070-90a0b0c0d027', subjectId: 'df412a80-bfd7-463c-91df-cde24d5432ba', number: 27, title: 'Performance Attribution & Risk-Adjusted Returns', description: 'Factor-based attribution, Brinson attribution, currency attribution, and risk-adjusted return metrics.', estimatedHours: 5 }
];

export const INITIAL_LOS: LearningOutcomeStatement[] = [
  // Ethics Reading 1
  { id: 'cf102030-4050-4060-8070-90a0b0c0d10a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d001', code: '1.a', statement: 'Demonstrate the application of the Code of Ethics and Standards of Professional Conduct to situations involving issues of professional integrity.', status: 'In Progress', confidence: 3, difficulty: 'Medium', bookmarked: true, estimatedHours: 2, actualHours: 1.5, questionsAttempted: 10, questionsCorrect: 7 },
  { id: 'cf102030-4050-4060-8070-90a0b0c0d10b', readingId: 'ab102030-4050-4060-8070-90a0b0c0d001', code: '1.b', statement: 'Distinguish between conduct that conforms to the Code and Standards and conduct that violates them.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },
  
  // CME Reading 5
  { id: 'cf102030-4050-4060-8070-90a0b0c0d50a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d005', code: '5.a', statement: 'Discuss the role of capital market expectations in the asset allocation process.', status: 'Completed', confidence: 5, difficulty: 'Easy', bookmarked: false, estimatedHours: 1, actualHours: 1, questionsAttempted: 5, questionsCorrect: 5 },
  { id: 'cf102030-4050-4060-8070-90a0b0c0d50b', readingId: 'ab102030-4050-4060-8070-90a0b0c0d005', code: '5.b', statement: 'Compare formal forecasting tools, including statistical models, discounted cash flow models, risk premium approaches, and financial market surveys.', status: 'In Progress', confidence: 2, difficulty: 'Hard', bookmarked: true, estimatedHours: 4, actualHours: 3, questionsAttempted: 15, questionsCorrect: 8, relatedFormulas: ['f02f0d92-7f72-4752-9c16-8367a84e6202'], formulaIds: ['f02f0d92-7f72-4752-9c16-8367a84e6202'] },
  
  // Asset Allocation Reading 8
  { id: 'cf102030-4050-4060-8070-90a0b0c0d80a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d008', code: '8.a', statement: 'Explain the principles of strategic asset allocation and the role of the investment policy statement (IPS).', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false, relatedFormulas: ['f02f0d92-7f72-4752-9c16-8367a84e6204'], formulaIds: ['f02f0d92-7f72-4752-9c16-8367a84e6204'] },
  { id: 'cf102030-4050-4060-8070-90a0b0c0d80b', readingId: 'ab102030-4050-4060-8070-90a0b0c0d008', code: '8.b', statement: 'Critique mean–variance optimization and discuss its limitations, including input sensitivity and concentrated allocations.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false, relatedFormulas: ['f02f0d92-7f72-4752-9c16-8367a84e6205'], formulaIds: ['f02f0d92-7f72-4752-9c16-8367a84e6205'] },
  
  // Fixed Income Reading 12
  { id: 'cf102030-4050-4060-8070-90a0b0c0d12a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d012', code: '12.a', statement: 'Discuss the roles of assets and liabilities and the relative importance of immunizing vs. cash-flow matching.', status: 'Completed', confidence: 4, difficulty: 'Medium', bookmarked: false, estimatedHours: 3, actualHours: 2.5, questionsAttempted: 12, questionsCorrect: 10, relatedNotes: ['11111111-2222-3333-4444-555555555551'] },
  { id: 'cf102030-4050-4060-8070-90a0b0c0d12b', readingId: 'ab102030-4050-4060-8070-90a0b0c0d012', code: '12.b', statement: 'Formulate a liability-driven investment strategy (e.g., duration matching, contingent immunization).', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false },
  
  // Fixed Income Reading 13
  { id: 'cf102030-4050-4060-8070-90a0b0c0d13a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d013', code: '13.a', statement: 'Formulate a portfolio strategy based on capital market expectations for the yield curve (including bullet, barbell, ladder, and yield curve shifts).', status: 'In Progress', confidence: 3, difficulty: 'Hard', bookmarked: true, estimatedHours: 5, actualHours: 4, questionsAttempted: 22, questionsCorrect: 15, relatedFormulas: ['f02f0d92-7f72-4752-9c16-8367a84e6203'], formulaIds: ['f02f0d92-7f72-4752-9c16-8367a84e6203'] },
  { id: 'cf102030-4050-4060-8070-90a0b0c0d13b', readingId: 'ab102030-4050-4060-8070-90a0b0c0d013', code: '13.b', statement: 'Explain yield curve strategies using derivatives (futures, options, swaps) and how they impact duration and convexity.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false },

  // Equity Reading 15
  { id: 'cf102030-4050-4060-8070-90a0b0c0d15a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d015', code: '15.a', statement: 'Compare fundamental and quantitative active investment approaches to equity portfolio management.', status: 'Not Started', confidence: null, difficulty: 'Easy', bookmarked: false, relatedFormulas: ['f02f0d92-7f72-4752-9c16-8367a84e6201'], formulaIds: ['f02f0d92-7f72-4752-9c16-8367a84e6201'] },
  
  // PWM Reading 19
  { id: 'cf102030-4050-4060-8070-90a0b0c0d19a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d019', code: '19.a', statement: 'Discuss the effects of different tax systems (income tax, wealth tax, capital gains tax) on post-tax asset accumulation.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false, relatedFormulas: ['f02f0d92-7f72-4752-9c16-8367a84e6206'], formulaIds: ['f02f0d92-7f72-4752-9c16-8367a84e6206'] },

  // === Portfolio Management Pathway LOS (Sprint 9) ===
  // Ethics — Asset Manager Code (Reading 3)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d03a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d003', code: '3.a', statement: 'Explain the provisions of the Asset Manager Code of Professional Conduct.', status: 'Not Started', confidence: null, difficulty: 'Easy', bookmarked: false },
  { id: 'cf102030-4050-4060-8070-90a0b0c0d03b', readingId: 'ab102030-4050-4060-8070-90a0b0c0d003', code: '3.b', statement: 'Discuss the ethical responsibilities of asset managers to clients and beneficiaries.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },

  // Ethics — GIPS (Reading 4)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d04a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d004', code: '4.a', statement: 'Explain the key provisions of the Global Investment Performance Standards.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },
  { id: 'cf102030-4050-4060-8070-90a0b0c0d04b', readingId: 'ab102030-4050-4060-8070-90a0b0c0d004', code: '4.b', statement: 'Evaluate compliance with GIPS standards in composite construction and performance presentation.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false },

  // CME — Economic Growth (Reading 6)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d06a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d006', code: '6.a', statement: 'Analyze the relationship between economic growth, productivity, and investment returns.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },
  { id: 'cf102030-4050-4060-8070-90a0b0c0d06b', readingId: 'ab102030-4050-4060-8070-90a0b0c0d006', code: '6.b', statement: 'Evaluate demographic trends and their impact on capital market expectations.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false },

  // CME — Forecasting Application (Reading 7)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d07a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d007', code: '7.a', statement: 'Apply forecasting tools to develop capital market expectations for major asset classes.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },

  // AA — Beyond Mean-Variance (Reading 9)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d09a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d009', code: '9.a', statement: 'Compare goals-based, risk parity, and factor-based approaches to asset allocation.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },

  // AA — Implementation & Rebalancing (Reading 10)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d10a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d010', code: '10.a', statement: 'Formulate rebalancing strategies considering transaction costs, taxes, and liquidity constraints.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false },

  // FI — Credit Strategies (Reading 11)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d11a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d011', code: '11.a', statement: 'Analyze credit portfolio strategies including relative value and credit curve positioning.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false },

  // FI — Derivatives & Structured (Reading 14)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d14a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d014', code: '14.a', statement: 'Evaluate the use of fixed-income derivatives for portfolio risk management and yield enhancement.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false, estimatedHours: 4 },

  // EQ — Passive & Semi-Active (Reading 16)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d16a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d016', code: '16.a', statement: 'Compare passive, enhanced indexing, and smart beta equity portfolio strategies.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },

  // EQ — Portfolio Construction (Reading 17)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d17a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d017', code: '17.a', statement: 'Evaluate equity portfolio construction decisions including risk budgeting and implementation constraints.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false, estimatedHours: 3 },

  // ALT — Hedge Funds (Reading 18)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d18a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d018', code: '18.a', statement: 'Analyze hedge fund strategies and evaluate their role in multi-asset portfolios.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },

  // ALT — Private Equity & Real Estate (Reading 20)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d20a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d020', code: '20.a', statement: 'Evaluate private equity and real estate as portfolio asset classes including valuation and risk.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false },

  // DC — Currency Introduction (Reading 21)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d21a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d021', code: '21.a', statement: 'Analyze foreign exchange risk and currency return decomposition in global portfolios.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },

  // DC — Currency Hedging (Reading 22)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d22a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d022', code: '22.a', statement: 'Formulate currency hedging strategies using forwards, options, and overlay mandates.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false, estimatedHours: 4 },

  // DC — Options & Swaps (Reading 23)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d23a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d023', code: '23.a', statement: 'Evaluate option and swap strategies for institutional portfolio management.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false, estimatedHours: 4 },

  // TE — Trading Costs (Reading 24)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d24a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d024', code: '24.a', statement: 'Evaluate trade execution quality using implementation shortfall and benchmark algorithms.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },

  // TE — Rebalancing & Tax (Reading 25)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d25a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d025', code: '25.a', statement: 'Design tax-aware portfolio rebalancing strategies including asset location and tax-loss harvesting.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false, estimatedHours: 3 },

  // PE — Performance Evaluation (Reading 26)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d26a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d026', code: '26.a', statement: 'Evaluate portfolio performance using appropriate benchmarks and return decomposition.', status: 'Not Started', confidence: null, difficulty: 'Medium', bookmarked: false },

  // PE — Attribution (Reading 27)
  { id: 'cf102030-4050-4060-8070-90a0b0c0d27a', readingId: 'ab102030-4050-4060-8070-90a0b0c0d027', code: '27.a', statement: 'Apply Brinson and factor-based attribution to decompose portfolio returns and assess manager skill.', status: 'Not Started', confidence: null, difficulty: 'Hard', bookmarked: false, estimatedHours: 4 }
];

// ── Pathway Configuration ──
export const CHOSEN_PATHWAY = 'PortfolioManagement';

// Subject IDs excluded from the chosen pathway (Private Wealth Management, Private Markets)
const PWM_SUBJECT_IDS = ['bc78e874-94c6-4b2a-89a1-5d9c2cfde548'];
const PWM_PLANNER_SUBJECT_IDS = ['sub-private-wealth'];

export const FILTERED_SUBJECTS: Subject[] = INITIAL_SUBJECTS.filter(s => !PWM_SUBJECT_IDS.includes(s.id));
export const FILTERED_READINGS: Reading[] = INITIAL_READINGS.filter(r => !PWM_SUBJECT_IDS.includes(r.subjectId));
export const FILTERED_LOS: LearningOutcomeStatement[] = INITIAL_LOS.filter(l => {
  const reading = INITIAL_READINGS.find(r => r.id === l.readingId);
  return !reading || !PWM_SUBJECT_IDS.includes(reading.subjectId);
});

const FILTERED_PLANNER_READINGS = PLANNER_READINGS.filter(r => !PWM_PLANNER_SUBJECT_IDS.includes(r.subjectId));
const FILTERED_PLANNER_SUBJECTS = PLANNER_SUBJECTS.filter(s => !PWM_PLANNER_SUBJECT_IDS.includes(s.id));
const FILTERED_PLANNER_DEFAULT_PROGRESS = FILTERED_PLANNER_READINGS.map(r => ({
  readingId: r.id, loggedVideoMinutes: 0, completedEOCQ: 0
}));

export const INITIAL_RESOURCES: Resource[] = [
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', name: 'CFA Institute Level III Volume 4 Fixed Income.pdf', category: 'Curriculum PDFs', url: '#', fileType: 'pdf', fileSize: '18.4 MB', dateAdded: '2026-06-15', isFavorite: true, description: 'Official CFA curriculum reading coverage for Fixed Income Portfolio Management.', linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d012', linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d12a' },
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', name: 'Schweser Secret Sauce Level III - Formulas & Tips.pdf', category: 'Schweser', url: '#', fileType: 'pdf', fileSize: '2.1 MB', dateAdded: '2026-06-20', isFavorite: true, description: 'Quick revision and key formula guidelines for final weeks.' },
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', name: 'Active Yield Curve Trades & Twists Cheat Sheet', category: 'Formula Sheets', url: '#', fileType: 'link', dateAdded: '2026-06-22', isFavorite: false, description: 'A custom quick reference matrix linking yield curve actions to changes in flat, steep, or curved rates.', linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d013', linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d13a' },
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4', name: 'Private Wealth Estate Planning Framework', category: 'Mind Maps', url: '#', fileType: 'link', dateAdded: '2026-06-25', isFavorite: false, description: 'Visual map connecting wealth transfer vehicles, tax wrappers, and trustee controls.', linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d019', linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d19a' }
];

export const INITIAL_NOTES: StudyNote[] = [
  {
    id: '11111111-2222-3333-4444-555555555551',
    title: 'Liability Matching: Immunization vs. Cash Flow Matching',
    content: `# Immunization vs. Cash Flow Matching\n\nThis note captures key trade-offs for liability-driven investing (LDI) under **Reading 12**.\n\n## 1. Classical Immunization\n- **Concept:** Lock in a rate of return over a specified horizon regardless of interest rate shifts.\n- **Rules:**\n  1. \`D_A = D_L\`\n  2. \`PV_A \\ge PV_L\`\n  3. Asset convexity exceeds liability convexity.\n`,
    createdTime: '2026-06-26T14:30:00Z',
    updatedTime: '2026-06-27T10:15:00Z',
    linkedSubjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d',
    linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d012',
    linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d12a',
    relatedFormula: ['f02f0d92-7f72-4752-9c16-8367a84e6203']
  },
  {
    id: '11111111-2222-3333-4444-555555555552',
    title: 'Code of Ethics: Core Responsibilities Summarized',
    content: `# CFA Code of Ethics Summary\n\n- **Integrity First:** Client interest above all.\n- **Reasonable Care:** Objective independence.\n`,
    createdTime: '2026-06-24T09:00:00Z',
    updatedTime: '2026-06-24T09:30:00Z',
    linkedSubjectId: 'e5b7b901-b258-45a7-96a8-a5b501d515a0',
    linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d001'
  }
];

export const INITIAL_EVENTS: CalendarEvent[] = [
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', title: 'Deep Study: Yield Curve Derivatives', date: '2026-06-29', startTime: '09:00', endTime: '11:30', type: 'Study Session', description: 'Master Reading 13 derivative modifications (futures, options, swaps).', isCompleted: false, linkedSubjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d', linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d013' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccd', title: 'Standard Ethics Revision Check', date: '2026-06-30', startTime: '14:00', endTime: '15:30', type: 'Revision', description: 'Review Standards of Professional Conduct scenarios in Ethics.', isCompleted: false, linkedSubjectId: 'e5b7b901-b258-45a7-96a8-a5b501d515a0', linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d001' },
  { id: 'cccccccc-cccc-cccc-cccc-ccccccccccce', title: 'Fixed Income Practice Exam', date: '2026-07-04', startTime: '08:00', endTime: '11:00', type: 'Mock Exam', description: 'Simulated morning section covering asset liability and active fixed income.', isCompleted: false, linkedSubjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d' }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation State
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedReadingId, setSelectedReadingId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sprint 8 Intelligence States & Telemetry Cache
  const [activeReadingAssetId, setActiveReadingAssetId] = useState<string | null>(null);
  const [readingSessionActiveReport, setReadingSessionActiveReport] = useState<ReadingIntelligence | null>(null);
  const [dailySnapshotsList, setDailySnapshotsList] = useState<DailySnapshot[]>(() => {
    return dailySnapshotService.getHistoricalSnapshots();
  });

  // Central Study Context State (Part 2)
  const [selectedLOSId, setSelectedLOSId] = useState<string | null>(() => {
    return localStorage.getItem('cfa_selected_los');
  });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(() => {
    return localStorage.getItem('cfa_selected_resource') || 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1';
  });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => {
    return localStorage.getItem('cfa_selected_note') || '11111111-2222-3333-4444-555555555551';
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return localStorage.getItem('cfa_current_session');
  });

  // Study Session Engine State (Part 8 & StudySessionService)
  const [activeSession, setActiveSession] = useState<StudySession | null>(() => {
    return StudySessionService.getActiveSession();
  });
  const [sessionHistory, setSessionHistory] = useState<StudySession[]>(() => {
    return StudySessionService.getSessionHistory();
  });
  const [isSessionPaused, setIsSessionPausedState] = useState<boolean>(() => {
    return StudySessionService.isSessionPaused();
  });
  const [sessionElapsedTime, setSessionElapsedTime] = useState<number>(() => {
    return StudySessionService.getElapsedTimeSeconds();
  });

  // Dynamic ticking interval for study sessions
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeSession && !isSessionPaused) {
      interval = setInterval(() => {
        setSessionElapsedTime(StudySessionService.getElapsedTimeSeconds());
      }, 1000);
    } else {
      setSessionElapsedTime(StudySessionService.getElapsedTimeSeconds());
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession, isSessionPaused]);

  // Active Curriculum Level
  const [activeLevel, setActiveLevel] = useState<CFALevel>('Level III');

  // Auth / User Profile (Persisted)
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('cfa_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    // Default placeholder user to ensure instant usability
    return {
      id: 'usr-default',
      name: 'Candidate Candidate',
      email: 'mananintodia04321@gmail.com',
      avatarUrl: undefined,
      joinedDate: '2026-06-01',
      streakDays: 14
    };
  });

  // central Settings (Persisted)
  const [settings, setSettings] = useState<StudySettings>(() => {
    const saved = localStorage.getItem('cfa_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      theme: 'light',
      examDate: '2026-08-25',
      targetDailyHours: 3.5,
      preferredSessionLength: 45,
      notificationsEnabled: true,
      notificationPreferences: {
        email: true,
        push: false,
        streakReminders: true
      },
      aiStreamingEnabled: true
    };
  });

  // State collections persisted to LocalStorage for realistic, durable student interaction
  const [losList, setLosList] = useState<LearningOutcomeStatement[]>(() => {
    const saved = localStorage.getItem('cfa_los_state');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return FILTERED_LOS;
  });

  const [resources, setResources] = useState<Resource[]>(() => {
    const saved = localStorage.getItem('cfa_resources');
    let loaded: Resource[] = [];
    if (saved) {
      try { loaded = JSON.parse(saved); } catch (e) { }
    }
    if (!loaded || loaded.length === 0) {
      loaded = INITIAL_RESOURCES.filter(r => !r.linkedReadingId || !PWM_SUBJECT_IDS.includes(INITIAL_READINGS.find(rd => rd.id === r.linkedReadingId)?.subjectId || ''));
    }
    return loaded.map(r => ({
      ...r,
      readingProgress: r.readingProgress ?? 0,
      lastReadAt: r.lastReadAt ?? null,
      status: r.status ?? 'Ready',
      chunks: r.chunks ?? [],
      highlightsList: r.highlightsList ?? [],
      annotations: r.annotations ?? [],
      timeline: r.timeline ?? []
    }));
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('cfa_events');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return INITIAL_EVENTS;
  });

  const [notes, setNotes] = useState<StudyNote[]>(() => {
    const saved = localStorage.getItem('cfa_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return INITIAL_NOTES;
  });

  const [formulas, setFormulas] = useState<Formula[]>(() => {
    const saved = localStorage.getItem('cfa_formulas_state');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return INITIAL_FORMULAS;
  });

  // Sprint 6.5 – MM Planner tracking state
  const [plannerProgress, setPlannerProgress] = useState<PlannerReadingProgress[]>(() => {
    const saved = localStorage.getItem('cfa_planner_progress');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return FILTERED_PLANNER_DEFAULT_PROGRESS;
  });

  // Sprint 9 — plannerReadings as mutable state (was const)
  const [plannerReadings, setPlannerReadings] = useState<Reading[]>(() => {
    const saved = localStorage.getItem('cfa_planner_readings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return FILTERED_PLANNER_READINGS;
  });

  const [plannerSubjects, setPlannerSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('cfa_planner_subjects');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return FILTERED_PLANNER_SUBJECTS;
  });

  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>(() => {
    const saved = localStorage.getItem('cfa_activity_log');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ActivityItem[];
        const seen = new Set<string>();
        return parsed.map((item, index) => {
          let uniqueId = item.id;
          if (!uniqueId || seen.has(uniqueId)) {
            uniqueId = `${uniqueId || 'act'}-${index}-${Math.random().toString(36).substring(2, 9)}`;
          }
          seen.add(uniqueId);
          return { ...item, id: uniqueId };
        });
      } catch (e) { }
    }
    return [
      { id: 'act-1', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), type: 'study', description: 'Updated study state on LOS 12.a to Completed' },
      { id: 'act-2', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), type: 'note', description: 'Edited note "Liability Matching: Immunization vs. Cash Flow Matching"' },
      { id: 'act-3', timestamp: new Date(Date.now() - 3600000 * 18).toISOString(), type: 'resource', description: 'Uploaded reference resource: "Schweser Secret Sauce Level III"' }
    ];
  });

  // ==========================================
  // STABLE REPOSITORY LIFECYCLES (Memoized)
  // ==========================================

  const subjectRepository = React.useMemo(() => {
    return new SubjectRepository(FILTERED_SUBJECTS);
  }, []);
  const readingRepository = React.useMemo(() => {
    return new ReadingRepository(FILTERED_READINGS, losList);
  }, [losList]);

  const losRepository = React.useMemo(() => {
    return new LOSRepository(losList);
  }, [losList]);

  const formulaRepository = React.useMemo(() => {
    return new FormulaRepository(formulas);
  }, [formulas]);

  const resourceRepository = React.useMemo(() => {
    return new ResourceRepository(resources);
  }, [resources]);

  const assetRepository = React.useMemo(() => {
    return new AssetRepository(resources);
  }, [resources]);

  const noteRepository = React.useMemo(() => {
    return new NoteRepository(notes);
  }, [notes]);

  const sessionRepository = React.useMemo(() => {
    return new StudySessionRepository(sessionHistory);
  }, [sessionHistory]);

  // ==========================================
  // SPRINT 7 KNOWLEDGE INGESTION PIPELINE
  // ==========================================

  const processWorker = React.useCallback(
    async (
      job: { assetId: string; file: Blob; filename: string },
      onProgress: (status: any) => void
    ) => {
      try {
        const result = await documentPipelineService.processAsset(
          job.assetId,
          job.file,
          job.filename,
          onProgress
        );

        setResources(prev =>
          prev.map(asset => {
            if (asset.id === job.assetId) {
              const updatedAsset: Asset = {
                ...asset,
                status: 'Ready',
                chunks: result.chunks,
                manifest: result.manifest,
                linkedReadingId: result.linkedReadingIds[0] || asset.linkedReadingId,
                linkedLOSId: result.linkedLOSIds[0] || asset.linkedLOSId,
                subject: asset.subject || (asset.linkedSubjectId ? FILTERED_SUBJECTS.find(s => s.id === asset.linkedSubjectId)?.name : undefined),
                reading: asset.reading || (result.linkedReadingIds[0] ? FILTERED_READINGS.find(r => r.id === result.linkedReadingIds[0])?.title : undefined),
                los: asset.los || (result.linkedLOSIds[0] ? losList.find(l => l.id === result.linkedLOSIds[0])?.code.toUpperCase() : undefined),
                pages: result.metadata.pagesCount,
                tags: Array.from(new Set([...(asset.tags || []), ...result.metadata.keywords]))
              };

              // Trigger wildcard Knowledge Graph compilation event once status changes to Ready
              setTimeout(() => {
                eventBus.publish({
                  type: 'ResourceLinked',
                  timestamp: new Date().toISOString(),
                  source: 'IngestionPipeline',
                  entityId: job.assetId,
                  payload: { resourceId: job.assetId }
                });
              }, 100);

              return updatedAsset;
            }
            return asset;
          })
        );
      } catch (err: any) {
        console.error('Pipeline worker failed:', err);
        throw err;
      }
    },
    [losList]
  );

  const handleJobProgress = React.useCallback((assetId: string, status: any, error?: string) => {
    setResources(prev =>
      prev.map(asset => {
        if (asset.id === assetId) {
          const updatedTimeline = [...(asset.timeline || [])];
          if (status === 'Queued') {
            updatedTimeline.push({
              type: 'uploaded',
              timestamp: new Date().toISOString(),
              description: `Enqueued file in Background Processing Queue`
            });
          } else {
            updatedTimeline.push({
              type: 'edited',
              timestamp: new Date().toISOString(),
              description: `Status changed to ${status}${error ? ': ' + error : ''}`
            });
          }

          return {
            ...asset,
            status,
            timeline: updatedTimeline,
            description: error ? `Failed processing: ${error}` : asset.description
          };
        }
        return asset;
      })
    );
  }, []);

  useEffect(() => {
    knowledgeLinkingService.setRepositories(readingRepository, losRepository);
    backgroundProcessingQueue.registerWorker(processWorker, handleJobProgress);
  }, [readingRepository, losRepository, processWorker, handleJobProgress]);

  useEffect(() => {
    assetSearchService.rebuildIndex(
      FILTERED_SUBJECTS,
      FILTERED_READINGS,
      losList,
      notes,
      formulas,
      resources
    );
  }, [losList, notes, formulas, resources]);

  const clearIngestionQueue = () => {
    backgroundProcessingQueue.clear();
  };

  // ==========================================
  // SPRINT 8 BACKING INFRASTRUCTURE
  // ==========================================

  // EventStoreService – subscribes to EventBus on construction, records all events
  const eventStoreServiceRef = React.useMemo(() => {
    return new EventStoreService(eventBus);
  }, []);

  // CommandRouterService – parses command palette strings into intents via EventBus
  const commandRouter = React.useMemo(() => {
    return new CommandRouterService(eventBus);
  }, []);

  // ==========================================
  // SPRINT 8 INTELLIGENCE ENGINE INTEGRATIONS
  // ==========================================

  // Spaced Memory Confidence Decay Mount routine
  useEffect(() => {
    const decayedLOSList = learningIntelligenceService.decayConfidence(losList, sessionHistory);
    let changed = false;
    const newLOS = losList.map((los, idx) => {
      const dec = decayedLOSList[idx];
      if (dec && dec.confidence !== los.confidence) {
        changed = true;
        return dec;
      }
      return los;
    });
    if (changed) {
      setLosList(newLOS);
      localStorage.setItem('cfa_los_state', JSON.stringify(newLOS));
    }
  }, []);

  // Unified Intelligence Orchestration – single authority merging all sub-service signals
  // Uses the Orchestrator (state+coordination) which internally calls the Aggregator (pure computation)
  const intelligenceStore = React.useMemo(() => {
    return intelligenceOrchestratorService.orchestrate({
      subjects: FILTERED_SUBJECTS,
      readings: FILTERED_READINGS,
      losList,
      formulas,
      notes,
      resources,
      sessions: sessionHistory,
      mockResults: [],
      settings: {
        examDate: settings.examDate,
        targetDailyHours: settings.targetDailyHours
      },
      activeSessionLOSId: activeSession?.linkedLOSId,
      selectedLOSId,
      activeReadingAssetId,
      readingSessionActiveReport,
      dailySnapshotsList,
      plannerProgress
    });
  }, [
    losList, formulas, notes, resources, sessionHistory,
    settings.examDate, settings.targetDailyHours,
    activeSession, selectedLOSId,
    activeReadingAssetId, readingSessionActiveReport, dailySnapshotsList,
    plannerProgress
  ]);

  // Destructure orchestrated values for backward compatibility
  const {
    graphAnalyzerHealthReport,
    burnoutDetected,
    revisionQueue,
    examReadinessReport,
    dailyMission,
    isDegraded
  } = intelligenceStore;

  // 6. Daily Snapshot logging trigger
  useEffect(() => {
    const todayStr = '2026-06-28';
    const healthVal = graphAnalyzerHealthReport.health.overallGraphHealth;
    const avgConfidence = losList.length > 0 
      ? losList.reduce((acc, l) => acc + (l.confidence || 2.5), 0) / losList.length
      : 2.5;
    const coverageVal = graphAnalyzerHealthReport.health.knowledgeDensity * 50;
    const readiness = examReadinessReport.readinessScore;
    const velocity = examReadinessReport.velocityHoursPerDay;

    const todaySessions = sessionHistory.filter(s => {
      const sDate = s.startTime.split('T')[0];
      return sDate === todayStr && s.status === 'Completed';
    });
    const todayMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const todayHours = todayMinutes / 60;

    dailySnapshotService.takeSnapshot(
      todayStr,
      healthVal,
      avgConfidence,
      Math.round(Math.min(99, coverageVal)),
      velocity,
      todayHours,
      burnoutDetected,
      readiness,
      []
    );
    setDailySnapshotsList(dailySnapshotService.getHistoricalSnapshots());
  }, [graphAnalyzerHealthReport, examReadinessReport, losList, sessionHistory, burnoutDetected]);

  // ==========================================
  // INTELLIGENCE UPGRADE – Query Layer & Snapshot Engine
  // ==========================================

  // Refs to keep query service getters fresh across renders
  const intelligenceStoreRef = React.useRef(intelligenceStore);
  intelligenceStoreRef.current = intelligenceStore;
  const losListRef = React.useRef(losList);
  losListRef.current = losList;
  const notesRef = React.useRef(notes);
  notesRef.current = notes;
  const formulasRef = React.useRef(formulas);
  formulasRef.current = formulas;

  // Initialize query service with live data sources via refs
  const queryServiceInstance = React.useMemo(() => {
    const qs = new IntelligenceQueryService(
      () => intelligenceStoreRef.current,
      () => ({
        losList: losListRef.current,
        notes: notesRef.current,
        formulas: formulasRef.current,
        readings: FILTERED_READINGS,
        subjects: FILTERED_SUBJECTS
      })
    );
    return qs;
  }, []);

  // Wire snapshot engine to the intelligence store
  React.useEffect(() => {
    snapshotEngineService.setDataSources(
      () => intelligenceStoreRef.current,
      () => {
        const store = intelligenceStoreRef.current;
        if (!store) return null;
        const derivedMetrics = IntelligenceAggregator.computeDerivedMetrics(
          {
            subjects: FILTERED_SUBJECTS,
            readings: FILTERED_READINGS,
            losList,
            formulas,
            notes,
            resources,
            sessions: sessionHistory,
            mockResults: [],
            settings: { examDate: settings.examDate, targetDailyHours: settings.targetDailyHours },
            activeSessionLOSId: activeSession?.linkedLOSId,
            selectedLOSId,
            activeReadingAssetId,
            readingSessionActiveReport,
            dailySnapshotsList,
            plannerProgress
          },
          {
            graphAnalyzerHealthReport: store.graphAnalyzerHealthReport as any,
            burnoutDetected: store.burnoutDetected,
            revisionQueue: store.revisionQueue,
            examReadinessReport: store.examReadinessReport as any,
            dailyMission: store.dailyMission as any
          }
        );
        return derivedMetrics;
      }
    );
    // Start periodic snapshots every 5 minutes and event-triggered on key events
    snapshotEngineService.startPeriodicSnapshots(300000);
    snapshotEngineService.startEventTriggeredSnapshots([
      'StudySessionCompleted',
      'LOSCompleted',
      'ConfidenceChanged',
      'FormulaMastered',
      'NoteCreated'
    ]);
    return () => {
      snapshotEngineService.destroy();
    };
  }, []);

  // Wire the reactive IntelligenceStream to push selective updates to UI
  React.useEffect(() => {
    intelligenceStream.wire(intelligenceOrchestratorService, queryServiceInstance);
    return () => {
      intelligenceStream.destroy();
    };
  }, [queryServiceInstance]);

  // Record event snapshots via orchestrator when intelligence store changes
  React.useEffect(() => {
    const input = {
      subjects: FILTERED_SUBJECTS,
      readings: FILTERED_READINGS,
      losList,
      formulas,
      notes,
      resources,
      sessions: sessionHistory,
      mockResults: [],
      settings: { examDate: settings.examDate, targetDailyHours: settings.targetDailyHours },
      activeSessionLOSId: activeSession?.linkedLOSId,
      selectedLOSId,
      activeReadingAssetId,
      readingSessionActiveReport,
      dailySnapshotsList,
      plannerProgress
    };
    // Record with the last event from the buffer if available
    const lastEvent = intelligenceOrchestratorService.getLastEventByType('*');
    if (lastEvent) {
      intelligenceOrchestratorService.recalculateWithSnapshot(input, lastEvent.type);
    }
  }, [intelligenceStore]);

  // Kindle-style reading tracker methods
  const startReadingSession = (assetId: string, page: number = 1) => {
    readingIntelligenceService.startSession(assetId, page);
    setActiveReadingAssetId(assetId);
    setReadingSessionActiveReport(null);
    logActivity('resource', `Initiated Kindle study session on page ${page}`);
  };

  const logReadingPageFlip = (page: number) => {
    readingIntelligenceService.logPageFlip(page);
    updateAssetProgress(readingIntelligenceService.getActiveAssetId() || '', 0, page);
  };

  const endReadingSession = () => {
    const report = readingIntelligenceService.endSession();
    if (report) {
      setReadingSessionActiveReport(report);
      logActivity('resource', `Completed Kindle session. Speed: ${report.averageWpm} WPM. Comprehension: ${report.comprehensionEstimated}%.`);
      const assetId = report.assetId;
      const asset = resources.find(r => r.id === assetId);
      if (asset && asset.pages && asset.pages > 0) {
        const progress = Math.min(100, Math.round(((asset.lastReadPage || 1) / asset.pages) * 100));
        updateAssetProgress(assetId, progress, asset.lastReadPage);
      }
    }
    setActiveReadingAssetId(null);
  };

  // ==========================================
  // SPRINT 6.5 — MM PLANNER ACTIONS
  // ==========================================

  /** Log video watch minutes for a reading. Emits InstructionalSessionLogged. */
  const logVideoMinutes = (readingId: string, minutes: number) => {
    setPlannerProgress(prev => {
      const existing = prev.find(p => p.readingId === readingId);
      if (existing) {
        return prev.map(p => p.readingId === readingId ? { ...p, loggedVideoMinutes: p.loggedVideoMinutes + minutes } : p);
      }
      return [...prev, { readingId, loggedVideoMinutes: minutes, completedEOCQ: 0 }];
    });

    eventBus.publish({
      type: 'InstructionalSessionLogged',
      timestamp: new Date().toISOString(),
      source: 'MMPlanner',
      entityId: readingId,
      payload: { minutesLogged: minutes }
    });
  };

  /** Record completed EOC questions for a reading. Emits ApplicationProgressUpdated. */
  const recordEOCQCompleted = (readingId: string, count: number) => {
    setPlannerProgress(prev => {
      const existing = prev.find(p => p.readingId === readingId);
      if (existing) {
        return prev.map(p => p.readingId === readingId ? { ...p, completedEOCQ: count } : p);
      }
      return [...prev, { readingId, loggedVideoMinutes: 0, completedEOCQ: count }];
    });

    eventBus.publish({
      type: 'ApplicationProgressUpdated',
      timestamp: new Date().toISOString(),
      source: 'MMPlanner',
      entityId: readingId,
      payload: { completedEOCQ: count }
    });
  };

  /** Compute 60/40 weighted reading progress: (videoMin/targetVideoMin * 60) + (eocqDone/targetEOCQ * 40) */
  const getReadingProgress = (readingId: string): number => {
    const reading = plannerReadings.find(r => r.id === readingId);
    if (!reading?.targets) return 0;
    const prog = plannerProgress.find(p => p.readingId === readingId);
    const videoPct = reading.targets.videoDurationMinutes > 0 ? (prog?.loggedVideoMinutes ?? 0) / reading.targets.videoDurationMinutes : 0;
    const eocqPct = reading.targets.eocqCount > 0 ? (prog?.completedEOCQ ?? 0) / reading.targets.eocqCount : 0;
    return Math.min(100, Math.round((videoPct * 60) + (eocqPct * 40)));
  };

  // ==========================================
  // SPRINT 9 — Planner CRUD Operations
  // ==========================================

  const addPlannerReading = (reading: Omit<Reading, 'id'>): string => {
    const id = `pln-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newReading: Reading = { ...reading, id };
    setPlannerReadings(prev => [...prev, newReading]);
    // Also create a default progress entry
    setPlannerProgress(prev => [...prev, { readingId: id, loggedVideoMinutes: 0, completedEOCQ: 0 }]);
    logActivity('resource', `Added custom reading node: ${reading.title}`);
    return id;
  };

  const updatePlannerReading = (id: string, updates: Partial<Reading>) => {
    setPlannerReadings(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    logActivity('resource', `Updated reading node: ${id}`);
  };

  const deletePlannerReading = (id: string) => {
    setPlannerReadings(prev => {
      const target = prev.find(r => r.id === id);
      if (target) logActivity('resource', `Deleted reading node: ${target.title}`);
      return prev.filter(r => r.id !== id);
    });
    // Also clean up progress entry
    setPlannerProgress(prev => prev.filter(p => p.readingId !== id));
  };

  const addPlannerSubject = (subject: Omit<Subject, 'id'>): string => {
    const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setPlannerSubjects(prev => [...prev, { ...subject, id }]);
    return id;
  };

  // ==========================================
  // SPRINT 9 — Event Mapping: StudySessionCompleted → planner progress
  // ==========================================

  React.useEffect(() => {
    const unsub = eventBus.subscribe('StudySessionCompleted', (event) => {
      const payload = event.payload as any;
      if (!payload?.linkedLOSId && !payload?.linkedReadingId) return;
      const readingId = payload.linkedReadingId || (() => {
        const los = losList.find(l => l.id === payload.linkedLOSId);
        return los?.readingId;
      })();
      if (!readingId) return;
      const durationMinutes = payload.durationMinutes || 0;
      const sessionType = payload.sessionType || 'instructional';

      if (sessionType === 'instructional') {
        setPlannerProgress(prev => {
          const existing = prev.find(p => p.readingId === readingId);
          if (existing) {
            return prev.map(p => p.readingId === readingId
              ? { ...p, loggedVideoMinutes: p.loggedVideoMinutes + durationMinutes }
              : p);
          }
          return [...prev, { readingId, loggedVideoMinutes: durationMinutes, completedEOCQ: 0 }];
        });
      } else if (sessionType === 'application') {
        setPlannerProgress(prev => {
          const reading = plannerReadings.find(r => r.id === readingId);
          const maxEOCQ = reading?.targets?.eocqCount || 999;
          const existing = prev.find(p => p.readingId === readingId);
          if (existing) {
            return prev.map(p => p.readingId === readingId
              ? { ...p, completedEOCQ: Math.min(maxEOCQ, p.completedEOCQ + Math.round(durationMinutes / 5)) }
              : p);
          }
          return [...prev, { readingId, loggedVideoMinutes: 0, completedEOCQ: Math.round(durationMinutes / 5) }];
        });
      }
    });
    return unsub;
  }, [losList, plannerReadings]);

  // ==========================================
  // STABLE BUSINESS SERVICES (Memoized)
  // ==========================================

  const analyticsService = React.useMemo(() => {
    return new AnalyticsService(
      subjectRepository,
      readingRepository,
      losRepository,
      resourceRepository,
      noteRepository,
      sessionRepository,
      formulaRepository
    );
  }, [subjectRepository, readingRepository, losRepository, resourceRepository, noteRepository, sessionRepository, formulaRepository]);

  const missionEngine = React.useMemo(() => {
    return new MissionEngine(
      subjectRepository,
      readingRepository,
      losRepository,
      resourceRepository,
      noteRepository,
      sessionRepository,
      formulaRepository,
      analyticsService
    );
  }, [subjectRepository, readingRepository, losRepository, resourceRepository, noteRepository, sessionRepository, formulaRepository, analyticsService]);

  const curriculumEngine = React.useMemo(() => {
    return new CurriculumIntelligenceService(
      subjectRepository,
      readingRepository,
      losRepository,
      resourceRepository,
      noteRepository,
      sessionRepository,
      formulaRepository,
      analyticsService
    );
  }, [subjectRepository, readingRepository, losRepository, resourceRepository, noteRepository, sessionRepository, formulaRepository, analyticsService]);

  const knowledgeGraphService = React.useMemo(() => {
    return new KnowledgeGraphService(
      subjectRepository,
      readingRepository,
      losRepository,
      formulaRepository,
      resourceRepository,
      noteRepository,
      sessionRepository,
      eventBus
    );
  }, [
    subjectRepository,
    readingRepository,
    losRepository,
    formulaRepository,
    resourceRepository,
    noteRepository,
    sessionRepository
  ]);

  const [knowledgeSnapshot, setKnowledgeSnapshot] = useState<GraphSnapshot>(() => {
    return knowledgeGraphService.getSnapshot();
  });

  useEffect(() => {
    const unsubscribe = knowledgeGraphService.subscribeToSnapshot((newSnapshot) => {
      setKnowledgeSnapshot(newSnapshot);
    });
    return unsubscribe;
  }, [knowledgeGraphService]);

  // Sync state mutations to LocalStorage
  useEffect(() => {
    localStorage.setItem('cfa_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('cfa_settings', JSON.stringify(settings));
    // Apply visual dark theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('cfa_los_state', JSON.stringify(losList));
  }, [losList]);

  useEffect(() => {
    localStorage.setItem('cfa_resources', JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem('cfa_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('cfa_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('cfa_formulas_state', JSON.stringify(formulas));
  }, [formulas]);

  useEffect(() => {
    localStorage.setItem('cfa_planner_progress', JSON.stringify(plannerProgress));
  }, [plannerProgress]);

  useEffect(() => {
    localStorage.setItem('cfa_planner_readings', JSON.stringify(plannerReadings));
  }, [plannerReadings]);

  useEffect(() => {
    localStorage.setItem('cfa_planner_subjects', JSON.stringify(plannerSubjects));
  }, [plannerSubjects]);

  useEffect(() => {
    if (selectedLOSId) localStorage.setItem('cfa_selected_los', selectedLOSId);
    else localStorage.removeItem('cfa_selected_los');
  }, [selectedLOSId]);

  useEffect(() => {
    if (selectedResourceId) localStorage.setItem('cfa_selected_resource', selectedResourceId);
    else localStorage.removeItem('cfa_selected_resource');
  }, [selectedResourceId]);

  useEffect(() => {
    if (selectedNoteId) localStorage.setItem('cfa_selected_note', selectedNoteId);
    else localStorage.removeItem('cfa_selected_note');
  }, [selectedNoteId]);

  useEffect(() => {
    if (currentSessionId) localStorage.setItem('cfa_current_session', currentSessionId);
    else localStorage.removeItem('cfa_current_session');
  }, [currentSessionId]);

  useEffect(() => {
    localStorage.setItem('cfa_activity_log', JSON.stringify(activityFeed));
  }, [activityFeed]);

  // Unified logging hook
  const logActivity = (type: ActivityItem['type'], description: string, meta?: string) => {
    const newLog: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      description,
      meta
    };
    setActivityFeed(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50
  };

  const clearActivityLog = () => {
    setActivityFeed([]);
  };

  // State mutators with audit logs built-in
  const login = (email: string, name: string) => {
    const mockUser: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name || 'CFA Candidate',
      email,
      joinedDate: new Date().toISOString().split('T')[0],
      streakDays: 1
    };
    setUser(mockUser);
    logActivity('setting', `Logged in as ${mockUser.name}`);
  };

  const logout = () => {
    setUser(null);
    logActivity('setting', 'Logged out of session');
  };

  const updateProfile = (name: string, email: string) => {
    if (user) {
      setUser({ ...user, name, email });
      logActivity('setting', `Updated user profile to ${name}`);
    }
  };

  const updateSettings = (updates: Partial<StudySettings>) => {
    setSettings(prev => {
      const merged = { ...prev, ...updates };
      // Nested updates
      if (updates.notificationPreferences) {
        merged.notificationPreferences = {
          ...prev.notificationPreferences,
          ...updates.notificationPreferences
        };
      }
      return merged;
    });
    logActivity('setting', 'Saved application preferences');
  };

  const updateLOS = (id: string, updates: Partial<LearningOutcomeStatement>) => {
    setLosList(prev =>
      prev.map(los => {
        if (los.id === id) {
          const updated = { ...los, ...updates };
          logActivity('study', `Updated study progress for LOS ${los.code} to ${updates.status || 'custom metrics'}`);
          
          // Publish Event Bus Notifications
          if (updates.confidence !== undefined && updates.confidence !== null) {
            eventBus.publish({
              type: 'ConfidenceChanged',
              timestamp: new Date().toISOString(),
              source: 'SyllabusManager',
              entityId: id,
              payload: { confidence: updates.confidence }
            });
          }
          if (updates.status === 'Completed') {
            eventBus.publish({
              type: 'LOSCompleted',
              timestamp: new Date().toISOString(),
              source: 'SyllabusManager',
              entityId: id,
              payload: { status: 'Completed' }
            });
          }
          
          return updated;
        }
        return los;
      })
    );
  };

  const toggleLOSBookmark = (id: string) => {
    setLosList(prev =>
      prev.map(los => {
        if (los.id === id) {
          const updated = { ...los, bookmarked: !los.bookmarked };
          logActivity('study', `${updated.bookmarked ? 'Bookmarked' : 'Removed bookmark on'} LOS ${los.code}`);
          return updated;
        }
        return los;
      })
    );
  };

  const addResource = (res: Omit<Resource, 'id' | 'dateAdded'>) => {
    const newRes: Resource = {
      ...res,
      id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      dateAdded: new Date().toISOString().split('T')[0]
    };
    setResources(prev => [newRes, ...prev]);
    logActivity('resource', `Added resource file: ${res.name}`);

    if (newRes.linkedLOSId) {
      eventBus.publish({
        type: 'ResourceLinked',
        timestamp: new Date().toISOString(),
        source: 'ResourceManager',
        entityId: newRes.id,
        payload: { linkedLOSId: newRes.linkedLOSId }
      });
    }
  };

  const toggleResourceFavorite = (id: string) => {
    setResources(prev =>
      prev.map(r => {
        if (r.id === id) {
          const favorite = !r.isFavorite;
          logActivity('resource', `${favorite ? 'Favorited' : 'Unfavorited'} document ${r.name}`);
          return { ...r, isFavorite: favorite };
        }
        return r;
      })
    );
  };

  const deleteResource = (id: string) => {
    setResources(prev => {
      const target = prev.find(r => r.id === id);
      if (target) logActivity('resource', `Deleted resource file: ${target.name}`);
      return prev.filter(r => r.id !== id);
    });
  };

  const uploadAsset = async (file: File, linkedIds?: { subjectId?: string; readingId?: string; losId?: string }): Promise<string> => {
    const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();
    const newAsset: Asset = {
      id,
      name: file.name,
      category: file.type.startsWith('video/') ? 'Videos' : 'Curriculum PDFs',
      url: URL.createObjectURL(file),
      fileType: file.name.split('.').pop() || 'pdf',
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      dateAdded: timestamp,
      readingProgress: 0,
      lastReadAt: null,
      status: 'Queued',
      isFavorite: false,
      chunks: [],
      highlightsList: [],
      annotations: [],
      timeline: [
        { type: 'uploaded', timestamp, description: 'Asset file intake initiated' }
      ],
      linkedSubjectId: linkedIds?.subjectId,
      linkedReadingId: linkedIds?.readingId,
      linkedLOSId: linkedIds?.losId
    };

    setResources(prev => [newAsset, ...prev]);
    logActivity('resource', `Uploaded document asset: ${file.name}`);

    // Enqueue in Background Queue
    backgroundProcessingQueue.enqueue(id, file, file.name);
    return id;
  };

  const updateAssetProgress = (id: string, progress: number, lastPage?: number) => {
    const timestamp = new Date().toISOString();
    setResources(prev =>
      prev.map(r => {
        if (r.id === id) {
          const updatedTimeline = [...(r.timeline || [])];
          
          if (r.readingProgress === 0 && progress > 0) {
            updatedTimeline.push({ type: 'opened', timestamp, description: `Started reading document` });
          }
          if (progress === 100 && r.readingProgress < 100) {
            updatedTimeline.push({ type: 'reviewed', timestamp, description: `Completed reading document` });
          }

          eventBus.publish({
            type: 'ReadingProgressUpdated',
            timestamp,
            source: 'DocumentViewer',
            entityId: id,
            payload: { progress, lastPage }
          });

          return {
            ...r,
            readingProgress: progress,
            lastReadPage: lastPage ?? r.lastReadPage,
            lastReadAt: timestamp,
            timeline: updatedTimeline
          };
        }
        return r;
      })
    );
  };

  const addAssetHighlight = (id: string, highlight: Omit<AssetHighlight, 'id' | 'createdAt'>) => {
    const timestamp = new Date().toISOString();
    const highlightId = `hl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newHl: AssetHighlight = {
      ...highlight,
      id: highlightId,
      createdAt: timestamp
    };

    if (readingIntelligenceService.getActiveAssetId() === id) {
      readingIntelligenceService.incrementHighlights();
    }

    setResources(prev =>
      prev.map(r => {
        if (r.id === id) {
          const updatedTimeline = [...(r.timeline || [])];
          updatedTimeline.push({ type: 'annotated', timestamp, description: `Added text highlight on page ${highlight.pageNumber}` });

          eventBus.publish({
            type: 'HighlightCreated',
            timestamp,
            source: 'DocumentViewer',
            entityId: id,
            payload: { highlightId, pageNumber: highlight.pageNumber }
          });

          return {
            ...r,
            highlightsList: [...(r.highlightsList || []), newHl],
            timeline: updatedTimeline
          };
        }
        return r;
      })
    );
  };

  const addAssetAnnotation = (id: string, annotation: Omit<AssetAnnotation, 'id' | 'createdAt'>) => {
    const timestamp = new Date().toISOString();
    const annId = `ann-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newAnn: AssetAnnotation = {
      ...annotation,
      id: annId,
      createdAt: timestamp
    };

    if (readingIntelligenceService.getActiveAssetId() === id) {
      readingIntelligenceService.incrementAnnotations();
    }

    setResources(prev =>
      prev.map(r => {
        if (r.id === id) {
          const updatedTimeline = [...(r.timeline || [])];
          updatedTimeline.push({ type: 'annotated', timestamp, description: `Added ${annotation.type} annotation on page ${annotation.pageNumber}` });

          eventBus.publish({
            type: 'AnnotationCreated',
            timestamp,
            source: 'DocumentViewer',
            entityId: id,
            payload: { annotationId: annId, type: annotation.type }
          });

          return {
            ...r,
            annotations: [...(r.annotations || []), newAnn],
            timeline: updatedTimeline
          };
        }
        return r;
      })
    );
  };

  const addEvent = (evt: Omit<CalendarEvent, 'id'>) => {
    const newEvt: CalendarEvent = {
      ...evt,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
    setEvents(prev => [...prev, newEvt]);
    logActivity('calendar', `Scheduled calendar event: ${evt.title}`);
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev =>
      prev.map(e => {
        if (e.id === id) {
          const updated = { ...e, ...updates };
          logActivity('calendar', `Updated event calendar entry: ${e.title}`);
          return updated;
        }
        return e;
      })
    );
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => {
      const target = prev.find(e => e.id === id);
      if (target) logActivity('calendar', `Cancelled calendar event: ${target.title}`);
      return prev.filter(e => e.id !== id);
    });
  };

  const addNote = (note: Omit<StudyNote, 'id' | 'createdTime' | 'updatedTime'>): string => {
    const id = `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();
    const newNote: StudyNote = {
      ...note,
      id,
      createdTime: timestamp,
      updatedTime: timestamp
    };
    setNotes(prev => [newNote, ...prev]);
    logActivity('note', `Created new note: ${note.title}`);

    eventBus.publish({
      type: 'NoteCreated',
      timestamp,
      source: 'NoteManager',
      entityId: id,
      payload: { title: note.title }
    });

    return id;
  };

  const updateNote = (
    id: string,
    title: string,
    content: string,
    links?: Partial<Pick<StudyNote, 'linkedSubjectId' | 'linkedReadingId' | 'linkedLOSId' | 'linkedResourceId'>>
  ) => {
    const timestamp = new Date().toISOString();
    setNotes(prev =>
      prev.map(n => {
        if (n.id === id) {
          const updated: StudyNote = {
            ...n,
            title,
            content,
            updatedTime: timestamp,
            ...links
          };
          logActivity('note', `Modified study note: ${title}`);

          eventBus.publish({
            type: 'NoteUpdated',
            timestamp,
            source: 'NoteManager',
            entityId: id,
            payload: { title }
          });

          return updated;
        }
        return n;
      })
    );
  };

  const deleteNote = (id: string) => {
    setNotes(prev => {
      const target = prev.find(n => n.id === id);
      if (target) logActivity('note', `Removed study note: ${target.title}`);
      return prev.filter(n => n.id !== id);
    });
  };

  const updateFormula = (id: string, updates: Partial<Formula>) => {
    setFormulas(prev =>
      prev.map(f => {
        if (f.id === id) {
          const updated = { ...f, ...updates };

          if (updates.masterySteps !== undefined) {
            const isAllMastered = Object.values(updates.masterySteps).every(v => v === true);
            if (isAllMastered) {
              eventBus.publish({
                type: 'FormulaMastered',
                timestamp: new Date().toISOString(),
                source: 'FormulaManager',
                entityId: id,
                payload: { name: f.name, masterySteps: updates.masterySteps }
              });
              logActivity('study', `Mastered all learning checklist steps for formula: ${f.name}`);
            }
          }

          if (updates.isMemorized !== undefined) {
            eventBus.publish({
              type: 'FormulaFavorited',
              timestamp: new Date().toISOString(),
              source: 'FormulaManager',
              entityId: id,
              payload: { name: f.name, isMemorized: updates.isMemorized }
            });
            logActivity('study', `${updates.isMemorized ? 'Marked as memorized' : 'Removed from memorized list'} formula: ${f.name}`);
          }

          if (updates.confidenceRating !== undefined) {
            eventBus.publish({
              type: 'FormulaReviewed',
              timestamp: new Date().toISOString(),
              source: 'FormulaManager',
              entityId: id,
              payload: { name: f.name, confidenceRating: updates.confidenceRating }
            });
            logActivity('study', `Reviewed recall and rated confidence ${updates.confidenceRating}/5 for formula: ${f.name}`);
          }

          return updated;
        }
        return f;
      })
    );
  };

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    // Reset selection dependencies when leaving curriculum to prevent weird residual highlights
    if (tab !== 'curriculum') {
      // Keep selection cached, but don't force views
    }
  };

  const startStudySession = (params: { linkedSubjectId?: string; linkedReadingId?: string; linkedLOSId?: string }) => {
    const targetLOS = params.linkedLOSId ? losList.find(l => l.id === params.linkedLOSId) : null;
    const confidenceBefore = targetLOS ? targetLOS.confidence : null;

    const session = StudySessionService.startSession({ ...params, confidenceBefore });
    setActiveSession(session);
    setIsSessionPausedState(false);
    setSessionElapsedTime(0);
    
    let activityDesc = 'Started active study session';
    if (params.linkedLOSId) {
      if (targetLOS) {
        activityDesc = `Started active study session for LOS ${targetLOS.code}`;
      }
    } else if (params.linkedReadingId) {
      const targetReading = FILTERED_READINGS.find(r => r.id === params.linkedReadingId);
      if (targetReading) {
        activityDesc = `Started active study session for Reading: ${targetReading.title}`;
      }
    }
    logActivity('study', activityDesc);

    if (session) {
      eventBus.publish({
        type: 'StudySessionStarted',
        timestamp: new Date().toISOString(),
        source: 'StudySessionEngine',
        entityId: session.id,
        payload: { linkedLOSId: session.linkedLOSId }
      });
    }
  };

  const pauseStudySession = () => {
    StudySessionService.pauseSession();
    setIsSessionPausedState(true);
    setSessionElapsedTime(StudySessionService.getElapsedTimeSeconds());
    logActivity('study', `Paused active study session`);

    const session = StudySessionService.getActiveSession();
    if (session) {
      eventBus.publish({
        type: 'StudySessionPaused',
        timestamp: new Date().toISOString(),
        source: 'StudySessionEngine',
        entityId: session.id,
        payload: {}
      });
    }
  };

  const resumeStudySession = () => {
    StudySessionService.resumeSession();
    setIsSessionPausedState(false);
    const session = StudySessionService.getActiveSession();
    setActiveSession(session);
    setSessionElapsedTime(StudySessionService.getElapsedTimeSeconds());
    logActivity('study', `Resumed active study session`);

    if (session) {
      eventBus.publish({
        type: 'StudySessionStarted',
        timestamp: new Date().toISOString(),
        source: 'StudySessionEngine',
        entityId: session.id,
        payload: { linkedLOSId: session.linkedLOSId, action: 'resume' }
      });
    }
  };

  const finishStudySession = (mentalFocusScore?: number, confidenceAfter?: number | null) => {
    const notesAddedIds = selectedNoteId ? [selectedNoteId] : [];
    const resourcesUsedIds = selectedResourceId ? [selectedResourceId] : [];

    const finished = StudySessionService.finishSession({ 
      mentalFocusScore, 
      notesAddedIds, 
      resourcesUsedIds,
      confidenceAfter 
    });
    if (finished) {
      if (finished.linkedLOSId) {
        // Convert minutes to hours for actualHours tracking
        const hoursToAdd = finished.durationMinutes / 60;
        const currentLOS = losList.find(l => l.id === finished.linkedLOSId);
        updateLOS(finished.linkedLOSId, {
          actualHours: parseFloat(((currentLOS?.actualHours || 0) + hoursToAdd).toFixed(2)),
          status: 'Completed',
          confidence: confidenceAfter ? (confidenceAfter as any) : (currentLOS?.confidence || 4),
          lastReviewed: new Date().toISOString().split('T')[0]
        });
      }
      setSessionHistory(StudySessionService.getSessionHistory());
      setActiveSession(null);
      setIsSessionPausedState(false);
      setSessionElapsedTime(0);
      logActivity('study', `Completed study session of ${finished.durationMinutes} mins with focus rating ${mentalFocusScore}/10`);

      eventBus.publish({
        type: 'StudySessionCompleted',
        timestamp: new Date().toISOString(),
        source: 'StudySessionEngine',
        entityId: finished.id,
        payload: {
          durationMinutes: finished.durationMinutes,
          linkedLOSId: finished.linkedLOSId,
          mentalFocusScore,
          confidenceAfter
        }
      });
    }
  };

  const cancelStudySession = () => {
    StudySessionService.cancelSession();
    setActiveSession(null);
    setIsSessionPausedState(false);
    setSessionElapsedTime(0);
    logActivity('study', `Cancelled active study session`);
  };

  const selectLOS = (losId: string | null) => {
    setSelectedLOSId(losId);
    if (losId) {
      const targetLOS = losList.find(l => l.id === losId);
      if (targetLOS) {
        setSelectedReadingId(targetLOS.readingId);
        const targetReading = FILTERED_READINGS.find(r => r.id === targetLOS.readingId);
        if (targetReading) {
          setSelectedSubjectId(targetReading.subjectId);
        }
        const linkedNote = notes.find(n => n.linkedLOSId === losId);
        if (linkedNote) {
          setSelectedNoteId(linkedNote.id);
        }
        const linkedRes = resources.find(r => r.linkedReadingId === targetLOS.readingId);
        if (linkedRes) {
          setSelectedResourceId(linkedRes.id);
        }
        logActivity('study', `Selected LOS ${targetLOS.code} as active study focus`);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedSubjectId,
        setSelectedSubjectId,
        selectedReadingId,
        setSelectedReadingId,
        sidebarCollapsed,
        setSidebarCollapsed,
        selectedLOSId,
        setSelectedLOSId,
        selectedResourceId,
        setSelectedResourceId,
        selectedNoteId,
        setSelectedNoteId,
        currentSessionId,
        setCurrentSessionId,
        selectLOS,
        activeSession,
        sessionHistory,
        isSessionPaused,
        sessionElapsedTime,
        startStudySession,
        pauseStudySession,
        resumeStudySession,
        finishStudySession,
        cancelStudySession,
        user,
        login,
        logout,
        updateProfile,
        settings,
        updateSettings,
        activeLevel,
        setActiveLevel,
        subjects: FILTERED_SUBJECTS,
        readings: FILTERED_READINGS,
        losList,
        updateLOS,
        toggleLOSBookmark,
        resources,
        addResource,
        toggleResourceFavorite,
        deleteResource,
        uploadAsset,
        updateAssetProgress,
        addAssetHighlight,
        addAssetAnnotation,
        clearIngestionQueue,
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        notes,
        addNote,
        updateNote,
        deleteNote,
        formulas,
        updateFormula,
        activityFeed,
        logActivity,
        clearActivityLog,
        curriculumEngine,
        analyticsService,
        missionEngine,
        eventBus,
        knowledgeSnapshot,
        knowledgeGraphService,
        readingSessionActiveReport,
        revisionQueue,
        dailySnapshotsList,
        graphAnalyzerHealthReport,
        examReadinessReport,
        burnoutDetected,
        dailyMission,
        activeReadingAssetId,
        isDegraded,
        eventStoreService: eventStoreServiceRef,
        commandRouter,
        intelligenceQueryService: queryServiceInstance,
        snapshotEngineService,
        startReadingSession,
        logReadingPageFlip,
        endReadingSession,
        plannerReadings,
        plannerSubjects,
        plannerProgress,
        logVideoMinutes,
        recordEOCQCompleted,
        getReadingProgress,
        addPlannerReading,
        updatePlannerReading,
        deletePlannerReading,
        addPlannerSubject
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
