/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  auth, 
  db, 
  googleProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  firebaseUpdateProfile,
  onAuthStateChanged
} from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
  PlannerReadingProgress,
  Chapter,
  CurriculumWorkspaceState,
  TimelineTemplate,
  TimelineBlock,
  ReadingStudyTargets
} from '../types';
import { generateCoachTemplate, CoachEngineParams } from '../services/CoachEngine';
import { StudySessionService } from '../services/StudySessionService';
import { CurriculumIntelligenceService } from '../services/CurriculumIntelligenceService';
import {
  SubjectRepository,
  ReadingRepository,
  LOSRepository,
  FormulaRepository,
  AssetRepository,
  NoteRepository,
  StudySessionRepository,
  INITIAL_FORMULAS
} from '../repositories';
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
import { AnalyticsService } from '../services/AnalyticsService';
import { EventStoreService } from '../services/EventStoreService';
import { CommandRouterService } from '../services/CommandRouterService';
import { intelligenceOrchestratorService } from '../services/IntelligenceOrchestratorService';
import { IntelligenceAggregator } from '../services/IntelligenceAggregatorService';
import { snapshotEngineService } from '../services/SnapshotEngineService';
import { intelligenceQueryService, IntelligenceQueryService } from '../services/IntelligenceQueryService';
import { intelligenceStream } from '../services/IntelligenceStream';
import { knowledgeIndexService } from '../services/KnowledgeIndexService';

const LEGACY_ID_TO_NUMBER: Record<string, number> = {
  'pln-cme-1': 1, 'pln-cme-2': 2, 'pln-aa-1': 3, 'pln-aa-2': 4, 'pln-aa-3': 5, 'pln-aa-4': 6,
  'pln-eq-1': 10, 'pln-eq-2': 11, 'pln-fi-1': 12, 'pln-fi-2': 13, 'pln-ldi-1': 14, 'pln-yc-1': 15,
  'pln-fi-deriv': 16, 'pln-pwm-1': 19, 'pln-pwm-2': 20, 'pln-pwm-3': 21, 'pln-inst-1': 22,
  'pln-inst-2': 23, 'pln-perf-1': 24, 'pln-perf-2': 25, 'pln-eth-1': 26, 'pln-eth-2': 27,
  'pln-alt-1': 28, 'pln-alt-2': 29, 'pln-risk-1': 30, 'pln-risk-2': 31, 'pln-case-1': 32,
  'pln-case-2': 33
};
import { CurriculumService } from '../applications/cfa/curriculum/services/CurriculumService';
import { CurriculumTreeService } from '../applications/cfa/curriculum/services/CurriculumTreeService';
import { LearningResourceRepository, learningResourceRepository } from '../resources';

/**
 * AppState holds the central, single-source-of-truth state for the operating system.
 */
interface AppContextType {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedChapterId: string | null;
  setSelectedChapterId: (id: string | null) => void;
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
  pauseReason: string | null;
  sessionElapsedTime: number;
  startStudySession: (params: { linkedSubjectId?: string; linkedReadingId?: string; linkedLOSId?: string }) => void;
  pauseStudySession: (reason?: string) => void;
  resumeStudySession: () => void;
  finishStudySession: (mentalFocusScore?: number, confidenceAfter?: number | null) => void;
  cancelStudySession: () => void;

  // Authentication State
  user: UserProfile | null;
  authLoading: boolean;
  login: (email: string, name: string) => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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

  // Sprint 10 — Curriculum Tree (pre-existing page feature, not yet wired)
  chapters: Chapter[];
  curriculumService: CurriculumService;
  curriculumTreeService: CurriculumTreeService;
  workspaceState: CurriculumWorkspaceState;
  updateWorkspaceState: (state: Partial<CurriculumWorkspaceState>) => void;

  // Sprint 10 — Timeline Templates (pre-existing page feature, not yet wired)
  templates: TimelineTemplate[];
  activeTemplateId: string | null;
  setActiveTemplate: (id: string | null) => void;
  generateCoachPlan: () => void;
  copyCoachToSandbox: () => void;
  updateTemplateBlocks: (templateId: string, blocks: TimelineBlock[]) => void;
  activeTemplate: TimelineTemplate | null;

  // Reading workspace resource helpers
  getResourcesByReading: (readingId: string) => any[];
  markResourceOpened: (id: string) => void;
  markResourceCompleted: (id: string) => void;
  updateResourceProgress: (id: string, progress: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

import {
  INITIAL_2027_SUBJECTS,
  INITIAL_2027_CHAPTERS,
  INITIAL_2027_READINGS,
  INITIAL_2027_LOS
} from '../applications/cfa/curriculum/data/initialCurriculum';

export const INITIAL_SUBJECTS: Subject[] = INITIAL_2027_SUBJECTS;
export const INITIAL_READINGS: Reading[] = INITIAL_2027_READINGS;
export const INITIAL_LOS: LearningOutcomeStatement[] = INITIAL_2027_LOS;

// ── Pathway Configuration ──
export const CHOSEN_PATHWAY = 'PortfolioManagement';

const PWM_SUBJECT_IDS: string[] = [];

export const FILTERED_SUBJECTS: Subject[] = INITIAL_SUBJECTS;
export const FILTERED_READINGS: Reading[] = INITIAL_READINGS;
export const FILTERED_LOS: LearningOutcomeStatement[] = INITIAL_LOS;

// PWM Planner Configuration
const PWM_PLANNER_SUBJECT_IDS: string[] = [];

// UUID to 2027 Curriculum ID Mapping Dictionary
export const UUID_TO_2027_MAP: Record<string, string> = {
  // Subjects
  'e5b7b901-b258-45a7-96a8-a5b501d515a0': 'sub-ethical-professional',
  '4d306b3a-5f05-4cbb-bb78-75c1a798ee73': 'sub-asset-allocation',
  '9c4bf2f5-d06a-49f3-a3d8-11f87a8b4bcf': 'sub-asset-allocation',
  '7c9a4e05-c49b-4bc9-93e1-32a21008064d': 'sub-portfolio-construction',
  '1c2f0d92-7f72-4752-9c16-8367a84e62ad': 'sub-portfolio-construction',
  'ea05b47a-6df2-47c5-a6e5-3ab45aef34fe': 'sub-portfolio-construction',
  'bc78e874-94c6-4b2a-89a1-5d9c2cfde548': 'sub-portfolio-construction',
  '31d044fa-cf5b-43fe-b391-766cf2cde129': 'sub-portfolio-construction',
  'df412a80-bfd7-463c-91df-cde24d5432ba': 'sub-performance-measurement',
  '9d8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b': 'sub-derivatives-risk-mgmt',
  '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d': 'sub-portfolio-construction',

  // Readings
  'ab102030-4050-4060-8070-90a0b0c0d001': 'read-eth-code',
  'ab102030-4050-4060-8070-90a0b0c0d002': 'read-eth-std-1',
  'ab102030-4050-4060-8070-90a0b0c0d003': 'read-eth-asset-code',
  'ab102030-4050-4060-8070-90a0b0c0d004': 'read-perf-gips',
  'ab102030-4050-4060-8070-90a0b0c0d005': 'read-cme-2',
  'ab102030-4050-4060-8070-90a0b0c0d006': 'read-cme-1',
  'ab102030-4050-4060-8070-90a0b0c0d007': 'read-cme-2',
  'ab102030-4050-4060-8070-90a0b0c0d008': 'read-aa-principles',
  'ab102030-4050-4060-8070-90a0b0c0d009': 'read-aa-principles',
  'ab102030-4050-4060-8070-90a0b0c0d010': 'read-aa-constraints',
  'ab102030-4050-4060-8070-90a0b0c0d011': 'read-path-fi-credit',
  'ab102030-4050-4060-8070-90a0b0c0d012': 'read-path-ldi',
  'ab102030-4050-4060-8070-90a0b0c0d013': 'read-path-yc',
  'ab102030-4050-4060-8070-90a0b0c0d014': 'read-path-yc',
  'ab102030-4050-4060-8070-90a0b0c0d015': 'read-path-active-eq',
  'ab102030-4050-4060-8070-90a0b0c0d016': 'read-path-index-eq',
  'ab102030-4050-4060-8070-90a0b0c0d017': 'read-path-active-eq-const',
  'ab102030-4050-4060-8070-90a0b0c0d018': 'read-pc-alternatives',
  'ab102030-4050-4060-8070-90a0b0c0d019': 'read-pc-pwm',
  'ab102030-4050-4060-8070-90a0b0c0d020': 'read-pc-alternatives',
  'ab102030-4050-4060-8070-90a0b0c0d021': 'read-deriv-currency',
  'ab102030-4050-4060-8070-90a0b0c0d022': 'read-deriv-currency',
  'ab102030-4050-4060-8070-90a0b0c0d023': 'read-deriv-options',
  'ab102030-4050-4060-8070-90a0b0c0d024': 'read-path-trade-exec',
  'ab102030-4050-4060-8070-90a0b0c0d025': 'read-path-trade-exec',
  'ab102030-4050-4060-8070-90a0b0c0d026': 'read-perf-evaluation',
  'ab102030-4050-4060-8070-90a0b0c0d027': 'read-perf-evaluation',

  // LOS
  'cf102030-4050-4060-8070-90a0b0c0d10a': 'los-19a',
  'cf102030-4050-4060-8070-90a0b0c0d10b': 'los-19b',
  'cf102030-4050-4060-8070-90a0b0c0d50a': 'los-2a',
  'cf102030-4050-4060-8070-90a0b0c0d50b': 'los-2c',
  'cf102030-4050-4060-8070-90a0b0c0d80a': 'los-3a',
  'cf102030-4050-4060-8070-90a0b0c0d80b': 'los-4a',
  'cf102030-4050-4060-8070-90a0b0c0d12a': 'los-p4a',
  'cf102030-4050-4060-8070-90a0b0c0d12b': 'los-p4c',
  'cf102030-4050-4060-8070-90a0b0c0d13a': 'los-p5b',
  'cf102030-4050-4060-8070-90a0b0c0d13b': 'los-p5d',
  'cf102030-4050-4060-8070-90a0b0c0d15a': 'los-p2a',
  'cf102030-4050-4060-8070-90a0b0c0d19a': 'los-9d',
  'cf102030-4050-4060-8070-90a0b0c0d03a': 'los-22a',
  'cf102030-4050-4060-8070-90a0b0c0d03b': 'los-22b',
  'cf102030-4050-4060-8070-90a0b0c0d04a': 'los-15a',
  'cf102030-4050-4060-8070-90a0b0c0d04b': 'los-15b',
  'cf102030-4050-4060-8070-90a0b0c0d06a': 'los-1c',
  'cf102030-4050-4060-8070-90a0b0c0d06b': 'los-1d',
  'cf102030-4050-4060-8070-90a0b0c0d07a': 'los-2h',
  'cf102030-4050-4060-8070-90a0b0c0d09a': 'los-4i',
  'cf102030-4050-4060-8070-90a0b0c0d11a': 'los-p6c',
  'cf102030-4050-4060-8070-90a0b0c0d14a': 'los-p6g',
  'cf102030-4050-4060-8070-90a0b0c0d16a': 'los-p1a',
  'cf102030-4050-4060-8070-90a0b0c0d17a': 'los-p3b',
  'cf102030-4050-4060-8070-90a0b0c0d18a': 'los-8f',
  'cf102030-4050-4060-8070-90a0b0c0d20a': 'los-8f',
  'cf102030-4050-4060-8070-90a0b0c0d21a': 'los-18a',
  'cf102030-4050-4060-8070-90a0b0c0d22a': 'los-18c',
  'cf102030-4050-4060-8070-90a0b0c0d23a': 'los-17a',
  'cf102030-4050-4060-8070-90a0b0c0d24a': 'los-11c',
  'cf102030-4050-4060-8070-90a0b0c0d25a': 'los-5b',
  'cf102030-4050-4060-8070-90a0b0c0d26a': 'los-13e',
  'cf102030-4050-4060-8070-90a0b0c0d27a': 'los-13f'
};

export function migrateAndMergeLOS(savedLosRaw: string | null): LearningOutcomeStatement[] {
  let savedLos: LearningOutcomeStatement[] = [];
  if (savedLosRaw) {
    try {
      const parsed = JSON.parse(savedLosRaw);
      if (Array.isArray(parsed)) {
        savedLos = parsed;
      }
    } catch (e) { }
  }

  const savedStateMap = new Map<string, Partial<LearningOutcomeStatement>>();
  for (const item of savedLos) {
    if (!item || !item.id) continue;
    const migratedId = UUID_TO_2027_MAP[item.id] || item.id;
    savedStateMap.set(migratedId, {
      status: item.status,
      confidence: item.confidence,
      bookmarked: item.bookmarked,
      actualHours: item.actualHours,
      questionsAttempted: item.questionsAttempted,
      questionsCorrect: item.questionsCorrect,
      relatedNotes: item.relatedNotes?.map(noteId => UUID_TO_2027_MAP[noteId] || noteId),
      relatedFormulas: item.relatedFormulas?.map(fId => UUID_TO_2027_MAP[fId] || fId),
      formulaIds: item.formulaIds?.map(fId => UUID_TO_2027_MAP[fId] || fId)
    });
  }

  return INITIAL_2027_LOS.map(los => {
    const saved = savedStateMap.get(los.id);
    if (saved) {
      return {
        ...los,
        status: saved.status ?? los.status,
        confidence: saved.confidence !== undefined ? saved.confidence : los.confidence,
        bookmarked: saved.bookmarked ?? los.bookmarked,
        actualHours: saved.actualHours ?? los.actualHours,
        questionsAttempted: saved.questionsAttempted ?? los.questionsAttempted,
        questionsCorrect: saved.questionsCorrect ?? los.questionsCorrect,
        relatedNotes: saved.relatedNotes ?? los.relatedNotes,
        relatedFormulas: saved.relatedFormulas ?? los.relatedFormulas,
        formulaIds: saved.formulaIds ?? los.formulaIds
      };
    }
    return los;
  });
}

export function migrateNotes(savedNotesRaw: string | null): StudyNote[] {
  let notes: StudyNote[] = [];
  if (savedNotesRaw) {
    try {
      const parsed = JSON.parse(savedNotesRaw);
      if (Array.isArray(parsed)) {
        notes = parsed;
      }
    } catch (e) { }
  } else {
    notes = INITIAL_NOTES;
  }

  return notes.map(n => ({
    ...n,
    linkedSubjectId: n.linkedSubjectId ? (UUID_TO_2027_MAP[n.linkedSubjectId] || n.linkedSubjectId) : undefined,
    linkedReadingId: n.linkedReadingId ? (UUID_TO_2027_MAP[n.linkedReadingId] || n.linkedReadingId) : undefined,
    linkedLOSId: n.linkedLOSId ? (UUID_TO_2027_MAP[n.linkedLOSId] || n.linkedLOSId) : undefined
  }));
}

export function migrateResources(savedResourcesRaw: string | null): Resource[] {
  let resources: Resource[] = [];
  if (savedResourcesRaw) {
    try {
      const parsed = JSON.parse(savedResourcesRaw);
      if (Array.isArray(parsed)) {
        resources = parsed;
      }
    } catch (e) { }
  }
  if (!resources || resources.length === 0) {
    resources = INITIAL_RESOURCES;
  }

  return resources.map(r => ({
    ...r,
    linkedSubjectId: r.linkedSubjectId ? (UUID_TO_2027_MAP[r.linkedSubjectId] || r.linkedSubjectId) : undefined,
    linkedReadingId: r.linkedReadingId ? (UUID_TO_2027_MAP[r.linkedReadingId] || r.linkedReadingId) : undefined,
    linkedLOSId: r.linkedLOSId ? (UUID_TO_2027_MAP[r.linkedLOSId] || r.linkedLOSId) : undefined
  }));
}

export function adaptLearningResources(lrs: any[]): Resource[] {
  return lrs.map(lr => ({
    id: lr.id,
    name: lr.title,
    category: 'Videos' as const,
    url: lr.launchUrl || '#',
    fileType: lr.resourceType === 'Lecture' || lr.resourceType === 'Video' ? 'mp4' : 'pdf',
    dateAdded: lr.importMetadata?.importedAt ? lr.importMetadata.importedAt.split('T')[0] : new Date().toISOString().split('T')[0],
    isFavorite: false,
    description: lr.description,
    linkedReadingId: lr.readingId,
    linkedLOSId: lr.losIds?.[0],
    readingProgress: lr.progress?.completed ? 100 : Math.round(((lr.progress?.minutesCompleted || 0) / (lr.duration || 1)) * 100) || 0,
    lastReadPage: lr.progress?.resumeState ? parseInt(lr.progress.resumeState) || undefined : undefined,
    lastReadAt: lr.progress?.lastOpenedAt || undefined
  }));
}

export function getReadingWithTargets(
  r: Reading,
  losList: LearningOutcomeStatement[],
  resources: Resource[]
): Reading & { targets: ReadingStudyTargets } {
  const readingVideos = resources.filter(res => res.linkedReadingId === r.id && res.fileType === 'mp4');
  const videoDurationMinutes = readingVideos.reduce((sum, res) => {
    const repo = learningResourceRepository;
    const lr = repo.getById(res.id);
    return sum + (lr?.duration || 0);
  }, 0);

  const pageCount = r.targets?.pageCount || 40;
  const eocqCount = r.targets?.eocqCount || 15;
  const weightingFactor = r.targets?.weightingFactor || 1.0;
  const totalLOSCount = losList.filter(l => l.readingId === r.id).length || r.targets?.totalLOSCount || 0;

  const finalVideoDuration = videoDurationMinutes || r.targets?.videoDurationMinutes || 60;
  const h = Math.floor(finalVideoDuration / 60);
  const m = Math.round(finalVideoDuration % 60);
  const videoDurationString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;

  return {
    ...r,
    targets: {
      pageCount,
      totalLOSCount,
      eocqCount,
      videoDurationMinutes: finalVideoDuration,
      videoDurationString,
      weightingFactor
    }
  };
}

export function migrateEvents(savedEventsRaw: string | null): CalendarEvent[] {
  let events: CalendarEvent[] = [];
  if (savedEventsRaw) {
    try {
      const parsed = JSON.parse(savedEventsRaw);
      if (Array.isArray(parsed)) {
        events = parsed;
      }
    } catch (e) { }
  } else {
    events = INITIAL_EVENTS;
  }

  return events.map(e => ({
    ...e,
    linkedSubjectId: e.linkedSubjectId ? (UUID_TO_2027_MAP[e.linkedSubjectId] || e.linkedSubjectId) : undefined,
    linkedReadingId: e.linkedReadingId ? (UUID_TO_2027_MAP[e.linkedReadingId] || e.linkedReadingId) : undefined
  }));
}

export const INITIAL_RESOURCES: Resource[] = [
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', name: 'CFA Institute Level III Volume 4 Fixed Income.pdf', category: 'Curriculum PDFs', url: '#', fileType: 'pdf', fileSize: '18.4 MB', dateAdded: '2026-06-15', isFavorite: true, description: 'Official CFA curriculum reading coverage for Fixed Income Portfolio Management.', linkedReadingId: 'read-path-ldi', linkedLOSId: 'los-p4a' },
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', name: 'Schweser Secret Sauce Level III - Formulas & Tips.pdf', category: 'Schweser', url: '#', fileType: 'pdf', fileSize: '2.1 MB', dateAdded: '2026-06-20', isFavorite: true, description: 'Quick revision and key formula guidelines for final weeks.' },
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', name: 'Active Yield Curve Trades & Twists Cheat Sheet', category: 'Formula Sheets', url: '#', fileType: 'link', dateAdded: '2026-06-22', isFavorite: false, description: 'A custom quick reference matrix linking yield curve actions to changes in flat, steep, or curved rates.', linkedReadingId: 'read-path-yc', linkedLOSId: 'los-p5b' },
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4', name: 'Private Wealth Estate Planning Framework', category: 'Mind Maps', url: '#', fileType: 'link', dateAdded: '2026-06-25', isFavorite: false, description: 'Visual map connecting wealth transfer vehicles, tax wrappers, and trustee controls.', linkedReadingId: 'read-pc-pwm', linkedLOSId: 'los-9d' }
];

export const INITIAL_NOTES: StudyNote[] = [
  {
    id: '11111111-2222-3333-4444-555555555551',
    title: 'Liability Matching: Immunization vs. Cash Flow Matching',
    content: `# Immunization vs. Cash Flow Matching\n\nThis note captures key trade-offs for liability-driven investing (LDI) under **Reading 12**.\n\n## 1. Classical Immunization\n- **Concept:** Lock in a rate of return over a specified horizon regardless of interest rate shifts.\n- **Rules:**\n  1. \`D_A = D_L\`\n  2. \`PV_A \\ge PV_L\`\n  3. Asset convexity exceeds liability convexity.\n`,
    createdTime: '2026-06-26T14:30:00Z',
    updatedTime: '2026-06-27T10:15:00Z',
    linkedSubjectId: 'sub-portfolio-construction',
    linkedReadingId: 'read-path-ldi',
    linkedLOSId: 'los-p4a',
    relatedFormula: ['f02f0d92-7f72-4752-9c16-8367a84e6203']
  },
  {
    id: '11111111-2222-3333-4444-555555555552',
    title: 'Code of Ethics: Core Responsibilities Summarized',
    content: `# CFA Code of Ethics Summary\n\n- **Integrity First:** Client interest above all.\n- **Reasonable Care:** Objective independence.\n`,
    createdTime: '2026-06-24T09:00:00Z',
    updatedTime: '2026-06-24T09:30:00Z',
    linkedSubjectId: 'sub-ethical-professional',
    linkedReadingId: 'read-eth-code'
  }
];

export const INITIAL_EVENTS: CalendarEvent[] = [
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', title: 'Deep Study: Yield Curve Derivatives', date: '2026-06-29', startTime: '09:00', endTime: '11:30', type: 'Study Session', description: 'Master Reading 13 derivative modifications (futures, options, swaps).', isCompleted: false, linkedSubjectId: 'sub-portfolio-construction', linkedReadingId: 'read-path-yc' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccd', title: 'Standard Ethics Revision Check', date: '2026-06-30', startTime: '14:00', endTime: '15:30', type: 'Revision', description: 'Review Standards of Professional Conduct scenarios in Ethics.', isCompleted: false, linkedSubjectId: 'sub-ethical-professional', linkedReadingId: 'read-eth-code' },
  { id: 'cccccccc-cccc-cccc-cccc-ccccccccccce', title: 'Fixed Income Practice Exam', date: '2026-07-04', startTime: '08:00', endTime: '11:00', type: 'Mock Exam', description: 'Simulated morning section covering asset liability and active fixed income.', isCompleted: false, linkedSubjectId: 'sub-portfolio-construction' }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    console.log('[DevLog] AppContext initialized');
  }, []);

  // Navigation State
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [selectedSubjectId, setSelectedSubjectIdState] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedReadingId, setSelectedReadingIdState] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const setSelectedSubjectId = (id: string | null) => {
    setSelectedSubjectIdState(id);
    setWorkspaceState(prev => {
      if (prev.selectedSubjectId === id) return prev;
      return { ...prev, selectedSubjectId: id || undefined };
    });
  };

  const setSelectedReadingId = (id: string | null) => {
    setSelectedReadingIdState(id);
    if (id) {
      const reading = readings.find(r => r.id === id);
      if (reading) {
        setWorkspaceState(prev => {
          if (prev.selectedReadingId === id) return prev;
          return {
            ...prev,
            selectedSubjectId: reading.subjectId,
            selectedChapterId: reading.chapterId,
            selectedReadingId: id,
            mode: 'reading' as const
          };
        });
        setSelectedSubjectIdState(reading.subjectId);
        if (reading.chapterId) setSelectedChapterId(reading.chapterId);
      }
    } else {
      setWorkspaceState(prev => {
        if (prev.selectedReadingId === undefined) return prev;
        return { ...prev, selectedReadingId: undefined };
      });
    }
  };

  // Safe localStorage wrapper to prevent QuotaExceededError crashes
  const safeSetItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn(`[Storage] Quota exceeded for key "${key}". Data not persisted.`);
      } else {
        console.warn(`[Storage] Failed to write key "${key}":`, e);
      }
    }
  };

  // Clean up any oversized localStorage entries that could cause quota issues
  const STORAGE_KEYS = ['cfa_planner_readings', 'cfa_planner_subjects', 'cfa_planner_progress', 'cfa_activity_log', 'cfa_events', 'cfa_notes'];
  for (const key of STORAGE_KEYS) {
    try {
      const val = localStorage.getItem(key);
      if (val && val.length > 500000) {
        console.warn(`[Storage] Key "${key}" is ${val.length} bytes, clearing to free quota.`);
        localStorage.removeItem(key);
      }
    } catch (_) {}
  }

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
  const [pauseReason, setPauseReason] = useState<string | null>(() => {
    return localStorage.getItem('cfa_session_pause_reason');
  });
  const [sessionElapsedTime, setSessionElapsedTime] = useState<number>(() => {
    return StudySessionService.getElapsedTimeSeconds();
  });

  // Dynamic ticking interval for study sessions with Sleep/Drift Protection
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeSession && !isSessionPaused) {
      // Store current timestamp as initial last tick
      localStorage.setItem('cfa_session_last_tick', Date.now().toString());

      interval = setInterval(() => {
        const lastTickStr = localStorage.getItem('cfa_session_last_tick');
        const now = Date.now();
        const lastTick = lastTickStr ? parseInt(lastTickStr, 10) : now;

        // Sleep detection: check if tick gap is > 5 seconds
        if (now - lastTick > 5000) {
          console.warn(`[TimerDrift] Sleep detected. Gap of ${Math.round((now - lastTick) / 1000)}s.`);
          
          // Retroactively pause the session at lastTick to exclude sleep duration
          StudySessionService.pauseSessionRetroactively(new Date(lastTick).toISOString(), 'sleep_detected');
          setIsSessionPausedState(true);
          setPauseReason('sleep_detected');
          setSessionElapsedTime(StudySessionService.getElapsedTimeSeconds());
          logActivity('study', `Auto-paused study session: Computer sleep detected`);

          // Publish Event Bus Notification
          eventBus.publish({
            type: 'StudySessionPaused',
            timestamp: new Date().toISOString(),
            source: 'StudySessionEngine',
            entityId: activeSession.id,
            payload: { reason: 'sleep_detected' }
          });
        } else {
          // Regular tick
          localStorage.setItem('cfa_session_last_tick', now.toString());
          setSessionElapsedTime(StudySessionService.getElapsedTimeSeconds());
        }
      }, 1000);
    } else {
      setSessionElapsedTime(StudySessionService.getElapsedTimeSeconds());
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession, isSessionPaused]);

  // Auto Pause Study Session on window blur and tab hide
  useEffect(() => {
    if (!activeSession || isSessionPaused) return;

    const handleAutoPause = (reason: 'window_blur' | 'tab_hidden') => {
      StudySessionService.pauseSession(reason);
      setIsSessionPausedState(true);
      setPauseReason(reason);
      setSessionElapsedTime(StudySessionService.getElapsedTimeSeconds());
      logActivity('study', `Auto-paused active study session (Reason: ${reason === 'window_blur' ? 'window lost focus' : 'tab hidden'})`);

      eventBus.publish({
        type: 'StudySessionPaused',
        timestamp: new Date().toISOString(),
        source: 'StudySessionEngine',
        entityId: activeSession.id,
        payload: { reason }
      });
    };

    const onBlur = () => {
      handleAutoPause('window_blur');
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleAutoPause('tab_hidden');
      }
    };

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [activeSession, isSessionPaused]);

  // Active Curriculum Level
  const [activeLevel, setActiveLevel] = useState<CFALevel>('Level III');

  // Auth / User Profile (Persisted)
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // central Settings (Persisted)
  const [settings, setSettings] = useState<StudySettings>(() => {
    const saved = localStorage.getItem('cfa_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      theme: 'light',
      examDate: '2026-08-25',
      targetStartDate: '2026-06-01',
      targetDailyHours: 3.5,
      preferredSessionLength: 45,
      notificationsEnabled: true,
      reviewBuffer: 30,
      notificationPreferences: {
        email: true,
        push: false,
        streakReminders: true
      },
      aiStreamingEnabled: true
    };
  });

  // ── Synchronous Curriculum Data Migration on Boot ──
  const runSyncMigration = React.useMemo(() => {
    const savedLos = localStorage.getItem('cfa_los_state');
    const hasOldUUIDs = savedLos && (savedLos.includes('cf102030-') || savedLos.includes('ab102030-'));
    if (hasOldUUIDs || !savedLos) {
      const migratedLos = migrateAndMergeLOS(savedLos);
      localStorage.setItem('cfa_los_state', JSON.stringify(migratedLos));
    }

    const savedNotes = localStorage.getItem('cfa_notes');
    if (savedNotes && savedNotes.includes('ab102030-')) {
      const migratedNotes = migrateNotes(savedNotes);
      localStorage.setItem('cfa_notes', JSON.stringify(migratedNotes));
    }

    const savedResources = localStorage.getItem('cfa_resources');
    if (savedResources && savedResources.includes('ab102030-')) {
      const migratedResources = migrateResources(savedResources);
      localStorage.setItem('cfa_resources', JSON.stringify(migratedResources));
    }

    const savedEvents = localStorage.getItem('cfa_events');
    if (savedEvents && savedEvents.includes('ab102030-')) {
      const migratedEvents = migrateEvents(savedEvents);
      localStorage.setItem('cfa_events', JSON.stringify(migratedEvents));
    }
    return true;
  }, []);

  // Central curriculum states
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('cfa_subjects');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return FILTERED_SUBJECTS;
  });

  const [chapters, setChapters] = useState<Chapter[]>(() => {
    const saved = localStorage.getItem('cfa_chapters');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return INITIAL_2027_CHAPTERS;
  });

  const [readings, setReadings] = useState<Reading[]>(() => {
    const saved = localStorage.getItem('cfa_readings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return FILTERED_READINGS;
  });

  const [losList, setLosList] = useState<LearningOutcomeStatement[]>(() => {
    const saved = localStorage.getItem('cfa_los_state');
    return migrateAndMergeLOS(saved);
  });

  const [resources, setResources] = useState<Resource[]>(() => {
    const repo = learningResourceRepository;
    const lrs = repo.getAll();
    if (lrs.length > 0) {
      return adaptLearningResources(lrs);
    }
    const saved = localStorage.getItem('cfa_resources');
    return migrateResources(saved);
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('cfa_events');
    return migrateEvents(saved);
  });

  const [notes, setNotes] = useState<StudyNote[]>(() => {
    const saved = localStorage.getItem('cfa_notes');
    return migrateNotes(saved);
  });

  const [formulas, setFormulas] = useState<Formula[]>(() => {
    const saved = localStorage.getItem('cfa_formulas_state');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return INITIAL_FORMULAS;
  });

  // Sprint 10 — Timeline Templates
  const [templates, setTemplates] = useState<TimelineTemplate[]>(() => {
    const saved = localStorage.getItem('cfa_timeline_templates');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  });
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const activeTemplate = useMemo(() => {
    if (!activeTemplateId) return null;
    return templates.find(t => t.id === activeTemplateId) || null;
  }, [templates, activeTemplateId]);

  // Persist templates to localStorage
  useEffect(() => {
    localStorage.setItem('cfa_timeline_templates', JSON.stringify(templates));
  }, [templates]);

  // Auto-generate Coach AI Blueprint on first load
  const coachPlanGeneratedRef = useRef(false);
  useEffect(() => {
    if (subjects.length === 0 || readings.length === 0 || losList.length === 0) return;
    if (coachPlanGeneratedRef.current) return;
    const hasCoach = templates.some(t => t.id === 'coach-blueprint');
    if (!hasCoach && settings.targetStartDate && settings.examDate) {
      coachPlanGeneratedRef.current = true;
      generateCoachPlan();
    }
  }, [subjects, readings, losList, settings.targetStartDate, settings.examDate]);

  // Services instantiation
  const curriculumService = React.useMemo(() => {
    return new CurriculumService();
  }, []);

  const curriculumTreeService = React.useMemo(() => {
    return new CurriculumTreeService(curriculumService);
  }, [curriculumService]);

  // Sync state with CurriculumService updates
  useEffect(() => {
    const sync = () => {
      setSubjects([...curriculumService.getSubjects()]);
      setChapters([...curriculumService.getChapters()]);
      setReadings([...curriculumService.getReadings()]);
      setLosList([...curriculumService.getLOSList()]);
    };
    // Sync initial state from service (loads from localStorage or seeds)
    sync();
    return curriculumService.subscribe(sync);
  }, [curriculumService]);



  // Sprint 6.5 — MM Planner tracking state
  const [plannerProgress, setPlannerProgress] = useState<PlannerReadingProgress[]>(() => {
    const saved = localStorage.getItem('cfa_planner_progress');
    let parsed: any[] = [];
    if (saved) {
      try { parsed = JSON.parse(saved); } catch (e) { }
    }

    const initialProgressMap = new Map<string, PlannerReadingProgress>();

    // Seed default progress entries for all initial readings
    INITIAL_2027_READINGS.forEach(r => {
      initialProgressMap.set(r.id, {
        readingId: r.id,
        loggedVideoMinutes: 0,
        completedEOCQ: 0
      });
    });

    if (parsed && Array.isArray(parsed)) {
      parsed.forEach(p => {
        if (!p || !p.readingId) return;

        let targetReadingId = p.readingId;

        // If it's a legacy pln- ID, map it to the corresponding read- ID
        if (p.readingId.startsWith('pln-')) {
          const num = LEGACY_ID_TO_NUMBER[p.readingId];
          if (num !== undefined) {
            const match = INITIAL_2027_READINGS.find(r => r.number === num);
            if (match) {
              targetReadingId = match.id;
            }
          }
        }

        const existing = initialProgressMap.get(targetReadingId);
        if (existing) {
          initialProgressMap.set(targetReadingId, {
            ...existing,
            loggedVideoMinutes: Math.max(existing.loggedVideoMinutes, p.loggedVideoMinutes || 0),
            completedEOCQ: Math.max(existing.completedEOCQ, p.completedEOCQ || 0),
          });
        } else {
          initialProgressMap.set(targetReadingId, {
            readingId: targetReadingId,
            loggedVideoMinutes: p.loggedVideoMinutes || 0,
            completedEOCQ: p.completedEOCQ || 0
          });
        }
      });
    }

    return Array.from(initialProgressMap.values());
  });

  // Derived planner states (Sprint M10.5A)
  const plannerReadings = useMemo(() => {
    return readings.map(r => getReadingWithTargets(r, losList, resources));
  }, [readings, losList, resources]);

  const plannerSubjects = subjects;

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
      safeSetItem('cfa_los_state', JSON.stringify(newLOS));
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
        targetStartDate: settings.targetStartDate,
        targetDailyHours: settings.targetDailyHours
      },
      activeSessionLOSId: activeSession?.linkedLOSId,
      selectedLOSId,
      selectedReadingId,
      selectedChapterId,
      selectedSubjectId,
      activeReadingAssetId,
      readingSessionActiveReport,
      dailySnapshotsList,
      plannerProgress,
      activeBlock: null
    });
  }, [
    losList, formulas, notes, resources, sessionHistory,
    settings.examDate, settings.targetDailyHours,
    activeSession, selectedLOSId, selectedReadingId, selectedChapterId, selectedSubjectId,
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
            settings: { examDate: settings.examDate, targetStartDate: settings.targetStartDate, targetDailyHours: settings.targetDailyHours },
            activeSessionLOSId: activeSession?.linkedLOSId,
            selectedLOSId,
            selectedReadingId,
            selectedChapterId,
            activeReadingAssetId,
            readingSessionActiveReport,
            dailySnapshotsList,
            plannerProgress,
            activeBlock: null
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
      settings: { examDate: settings.examDate, targetStartDate: settings.targetStartDate, targetDailyHours: settings.targetDailyHours },
      activeSessionLOSId: activeSession?.linkedLOSId,
      selectedLOSId,
      selectedReadingId,
      selectedChapterId,
      activeReadingAssetId,
      readingSessionActiveReport,
      dailySnapshotsList,
      plannerProgress,
      activeBlock: null
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
    let chapterId = (reading as any).chapterId;
    if (!chapterId) {
      const subjectChaps = chapters.filter(c => c.subjectId === reading.subjectId);
      if (subjectChaps.length > 0) {
        chapterId = subjectChaps[0].id;
      } else {
        chapterId = curriculumService.addChapter(reading.subjectId, 'General Study', 'General study materials');
      }
    }
    const id = curriculumService.addReading(chapterId, reading.title, reading.description || '');
    curriculumService.updateReading(id, { number: reading.number });
    setPlannerProgress(prev => [...prev, { readingId: id, loggedVideoMinutes: 0, completedEOCQ: 0 }]);
    logActivity('resource', `Added custom reading node: ${reading.title}`);
    return id;
  };

  const updatePlannerReading = (id: string, updates: Partial<Reading>) => {
    curriculumService.updateReading(id, updates);
    logActivity('resource', `Updated reading node: ${id}`);
  };

  const deletePlannerReading = (id: string) => {
    curriculumService.deleteReading(id);
    logActivity('resource', `Deleted reading node: ${id}`);
    setPlannerProgress(prev => prev.filter(p => p.readingId !== id));
  };

  const addPlannerSubject = (subject: Omit<Subject, 'id'>): string => {
    const id = curriculumService.addSubject(subject.name, subject.description || '', subject.code);
    logActivity('resource', `Added custom subject: ${subject.name}`);
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

  // Sync learning resource progress (minutesCompleted) with plannerProgress (loggedVideoMinutes) and react state
  React.useEffect(() => {
    const handleRepoChange = () => {
      const lrs = learningResourceRepository.getAll();
      setResources(adaptLearningResources(lrs));
    };

    const unsubProgress = eventBus.subscribe('ResourceProgressUpdated', (event) => {
      handleRepoChange();
      const resourceId = event.entityId;
      const resource = learningResourceRepository.getById(resourceId);
      if (resource && resource.resourceType === 'Lecture') {
        const readingId = resource.readingId;
        const lectures = learningResourceRepository.getByReadingId(readingId).filter(r => r.resourceType === 'Lecture');
        const totalLogged = lectures.reduce((sum, l) => sum + (l.progress.minutesCompleted || 0), 0);
        setPlannerProgress(prev => {
          const existing = prev.find(p => p.readingId === readingId);
          if (existing) {
            return prev.map(p => p.readingId === readingId ? { ...p, loggedVideoMinutes: totalLogged } : p);
          }
          return [...prev, { readingId, loggedVideoMinutes: totalLogged, completedEOCQ: 0 }];
        });
      }
    });

    const unsubReset = eventBus.subscribe('ResourceProgressReset', (event) => {
      handleRepoChange();
      const resourceId = event.entityId;
      const resource = learningResourceRepository.getById(resourceId);
      if (resource && resource.resourceType === 'Lecture') {
        const readingId = resource.readingId;
        const lectures = learningResourceRepository.getByReadingId(readingId).filter(r => r.resourceType === 'Lecture');
        const totalLogged = lectures.reduce((sum, l) => sum + (l.progress.minutesCompleted || 0), 0);
        setPlannerProgress(prev => {
          const existing = prev.find(p => p.readingId === readingId);
          if (existing) {
            return prev.map(p => p.readingId === readingId ? { ...p, loggedVideoMinutes: totalLogged } : p);
          }
          return [...prev, { readingId, loggedVideoMinutes: totalLogged, completedEOCQ: 0 }];
        });
      }
    });

    const unsubCreated = eventBus.subscribe('ResourceCreated', handleRepoChange);
    const unsubUpdated = eventBus.subscribe('ResourceUpdated', handleRepoChange);
    const unsubDeleted = eventBus.subscribe('ResourceDeleted', handleRepoChange);
    const unsubBulkCreated = eventBus.subscribe('BulkResourcesCreated', handleRepoChange);
    const unsubBootstrapped = eventBus.subscribe('CurriculumBootstrapped', handleRepoChange);

    const unsubLaunch = eventBus.subscribe('ResourceLaunched', (event) => {
      const resourceId = event.entityId;
      const resource = learningResourceRepository.getById(resourceId);
      if (resource) {
        setSelectedResourceId(resourceId);
        // Start study session timer automatically for this reading/LOS
        startStudySession({
          linkedSubjectId: resource.subject,
          linkedReadingId: resource.readingId,
          linkedLOSId: resource.losIds?.[0]
        });
      }
    });

    const unsubResume = eventBus.subscribe('ResourceResumed', (event) => {
      const resourceId = event.entityId;
      const resource = learningResourceRepository.getById(resourceId);
      if (resource) {
        setSelectedResourceId(resourceId);
        // Start study session timer automatically for this reading/LOS
        startStudySession({
          linkedSubjectId: resource.subject,
          linkedReadingId: resource.readingId,
          linkedLOSId: resource.losIds?.[0]
        });
      }
    });

    return () => {
      unsubProgress();
      unsubReset();
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubBulkCreated();
      unsubBootstrapped();
      unsubLaunch();
      unsubResume();
    };
  }, [losList]);

  // ==========================================
  // STABLE BUSINESS SERVICES (Memoized)
  // ==========================================

  const analyticsService = React.useMemo(() => {
    return new AnalyticsService(
      subjectRepository,
      readingRepository,
      losRepository,
      noteRepository,
      sessionRepository,
      formulaRepository
    );
  }, [subjectRepository, readingRepository, losRepository, noteRepository, sessionRepository, formulaRepository]);

  const curriculumEngine = React.useMemo(() => {
    return new CurriculumIntelligenceService(
      subjectRepository,
      readingRepository,
      losRepository,
      noteRepository,
      sessionRepository,
      formulaRepository,
      analyticsService
    );
  }, [subjectRepository, readingRepository, losRepository, noteRepository, sessionRepository, formulaRepository, analyticsService]);

  const knowledgeGraphService = React.useMemo(() => {
    return new KnowledgeGraphService(
      subjectRepository,
      readingRepository,
      losRepository,
      formulaRepository,
      noteRepository,
      sessionRepository,
      eventBus
    );
  }, [
    subjectRepository,
    readingRepository,
    losRepository,
    formulaRepository,
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

  // Subscribe to Firebase Auth changes and load profile/settings from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUser(data.profile || null);
            if (data.settings) {
              setSettings(data.settings);
            }
            logActivity('setting', `Session restored for ${data.profile?.name || firebaseUser.email || 'Candidate'}`);
          } else {
            // New user, initialize defaults
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'CFA Candidate',
              email: firebaseUser.email || firebaseUser.phoneNumber || '',
              avatarUrl: firebaseUser.photoURL || undefined,
              joinedDate: new Date().toISOString().split('T')[0],
              streakDays: 1
            };
            const defaultSettings: StudySettings = {
              theme: 'light',
              examDate: '2026-08-25',
              targetStartDate: '2026-06-01',
              targetDailyHours: 3.5,
              preferredSessionLength: 45,
              notificationsEnabled: true,
              reviewBuffer: 30,
              notificationPreferences: {
                email: true,
                push: false,
                streakReminders: true
              },
              aiStreamingEnabled: true
            };
            await setDoc(userDocRef, {
              profile: newProfile,
              settings: defaultSettings
            });
            setUser(newProfile);
            setSettings(defaultSettings);
            logActivity('setting', `Created profile for new user: ${newProfile.name}`);
          }
        } catch (error: any) {
          console.error("Error syncing with Firestore on auth change:", error);
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'CFA Candidate',
            email: firebaseUser.email || firebaseUser.phoneNumber || '',
            joinedDate: new Date().toISOString().split('T')[0],
            streakDays: 1
          });
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sync state mutations to LocalStorage
  useEffect(() => {
    if (user) {
      safeSetItem('cfa_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cfa_user');
    }
  }, [user]);

  useEffect(() => {
    safeSetItem('cfa_settings', JSON.stringify(settings));
    // Apply visual dark theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    safeSetItem('cfa_los_state', JSON.stringify(losList));
  }, [losList]);

  useEffect(() => {
    safeSetItem('cfa_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    safeSetItem('cfa_chapters', JSON.stringify(chapters));
  }, [chapters]);

  useEffect(() => {
    safeSetItem('cfa_readings', JSON.stringify(readings));
  }, [readings]);

  useEffect(() => {
    safeSetItem('cfa_resources', JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    safeSetItem('cfa_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    safeSetItem('cfa_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    safeSetItem('cfa_formulas_state', JSON.stringify(formulas));
  }, [formulas]);

  useEffect(() => {
    safeSetItem('cfa_planner_progress', JSON.stringify(plannerProgress));
  }, [plannerProgress]);

  useEffect(() => {
    if (selectedLOSId) safeSetItem('cfa_selected_los', selectedLOSId);
    else localStorage.removeItem('cfa_selected_los');
  }, [selectedLOSId]);

  useEffect(() => {
    if (selectedResourceId) safeSetItem('cfa_selected_resource', selectedResourceId);
    else localStorage.removeItem('cfa_selected_resource');
  }, [selectedResourceId]);

  useEffect(() => {
    if (selectedNoteId) safeSetItem('cfa_selected_note', selectedNoteId);
    else localStorage.removeItem('cfa_selected_note');
  }, [selectedNoteId]);

  useEffect(() => {
    if (currentSessionId) safeSetItem('cfa_current_session', currentSessionId);
    else localStorage.removeItem('cfa_current_session');
  }, [currentSessionId]);

  useEffect(() => {
    safeSetItem('cfa_activity_log', JSON.stringify(activityFeed));
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
  const login = async (email: string, name: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, 'tempPassword123');
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        const result = await createUserWithEmailAndPassword(auth, email, 'tempPassword123');
        if (result.user) {
          await firebaseUpdateProfile(result.user, { displayName: name });
        }
      } else {
        throw e;
      }
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await firebaseUpdateProfile(result.user, { displayName: name });
    }
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
    logActivity('setting', 'Logged out of session');
  };

  const updateProfile = async (name: string, email: string) => {
    if (user) {
      const updatedProfile = { ...user, name, email };
      setUser(updatedProfile);
      logActivity('setting', `Updated user profile to ${name}`);

      if (auth.currentUser) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userDocRef, { profile: updatedProfile });
        } catch (error) {
          console.error("Error updating profile in Firestore:", error);
        }
      }
    }
  };

  const updateSettings = async (updates: Partial<StudySettings>) => {
    let mergedSettings: StudySettings | null = null;
    setSettings(prev => {
      const merged = { ...prev, ...updates };
      if (updates.notificationPreferences) {
        merged.notificationPreferences = {
          ...prev.notificationPreferences,
          ...updates.notificationPreferences
        };
      }
      mergedSettings = merged;
      return merged;
    });

    logActivity('setting', 'Saved application preferences');

    if (auth.currentUser && mergedSettings) {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, { settings: mergedSettings });
      } catch (error) {
        console.error("Error updating settings in Firestore:", error);
      }
    }
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

  // Sprint 10 — Timeline Templates
  const setActiveTemplate = useCallback((id: string | null) => {
    setActiveTemplateId(id);
  }, []);

  const generateCoachPlan = useCallback(() => {
    const blocks = generateCoachTemplate({
      startDate: settings.targetStartDate || settings.examDate,
      examDate: settings.examDate,
      bufferDays: settings.reviewBuffer || 30,
      subjects,
      readings,
      losList,
    });
    const now = new Date().toISOString();
    const newTemplate: TimelineTemplate = {
      id: 'coach-blueprint',
      name: 'Coach AI Blueprint',
      description: 'AI-generated study schedule based on LOS distribution and exam timeline.',
      isEditable: false,
      blocks,
      createdAt: now,
      updatedAt: now,
    };
    setTemplates(prev => {
      const filtered = prev.filter(t => t.id !== 'coach-blueprint');
      return [...filtered, newTemplate];
    });
    setActiveTemplateId('coach-blueprint');
    logActivity('planner', 'Generated Coach AI Blueprint schedule');
  }, [settings, subjects, readings, losList, logActivity]);

  const copyCoachToSandbox = useCallback(() => {
    const coach = templates.find(t => t.id === 'coach-blueprint');
    if (!coach) return;
    const now = new Date().toISOString();
    const sandbox: TimelineTemplate = {
      id: 'sandbox-default',
      name: 'My Personal Sandbox',
      description: 'Your editable schedule. Modify blocks, dates, and order freely.',
      isEditable: true,
      blocks: JSON.parse(JSON.stringify(coach.blocks)),
      createdAt: now,
      updatedAt: now,
    };
    setTemplates(prev => {
      const filtered = prev.filter(t => t.id !== 'sandbox-default');
      return [...filtered, sandbox];
    });
    setActiveTemplateId('sandbox-default');
    logActivity('planner', 'Copied Coach AI Blueprint to Personal Sandbox');
  }, [templates, logActivity]);

  const updateTemplateBlocks = useCallback((templateId: string, blocks: TimelineBlock[]) => {
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, blocks, updatedAt: new Date().toISOString() } : t
    ));
  }, []);

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

  const pauseStudySession = (reason: string = 'manual') => {
    StudySessionService.pauseSession(reason);
    setIsSessionPausedState(true);
    setPauseReason(reason);
    setSessionElapsedTime(StudySessionService.getElapsedTimeSeconds());
    logActivity('study', `Paused active study session (Reason: ${reason})`);

    const session = StudySessionService.getActiveSession();
    if (session) {
      eventBus.publish({
        type: 'StudySessionPaused',
        timestamp: new Date().toISOString(),
        source: 'StudySessionEngine',
        entityId: session.id,
        payload: { reason }
      });
    }
  };

  const resumeStudySession = () => {
    StudySessionService.resumeSession();
    setIsSessionPausedState(false);
    setPauseReason(null);
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
      // Log completed minutes to the used resources in the database
      if (finished.resourcesUsedIds && finished.resourcesUsedIds.length > 0) {
        for (const resId of finished.resourcesUsedIds) {
          learningResourceRepository.logMinutes(resId, finished.durationMinutes);
        }
      }

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
      setPauseReason(null);
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
    setPauseReason(null);
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

  const [workspaceState, setWorkspaceState] = useState<CurriculumWorkspaceState>({
    mode: 'subject',
    activeTab: 'overview'
  });

  const updateWorkspaceState = (state: Partial<CurriculumWorkspaceState>) => {
    setWorkspaceState(prev => {
      const next = { ...prev, ...state };
      if (state.selectedSubjectId !== undefined) {
        setSelectedSubjectIdState(state.selectedSubjectId);
      }
      if (state.selectedChapterId !== undefined) {
        setSelectedChapterId(state.selectedChapterId);
      }
      if (state.selectedReadingId !== undefined) {
        setSelectedReadingIdState(state.selectedReadingId || null);
      }
      return next;
    });
  };

  const getResourcesByReading = (readingId: string): any[] => {
    const repo = learningResourceRepository;
    return repo.getByReadingId(readingId);
  };

  const markResourceOpened = (id: string) => {
    const repo = learningResourceRepository;
    repo.markOpened(id);
    setResources(prev => prev.map((r): Resource => r.id === id ? { ...r, lastReadAt: new Date().toISOString() } : r));
  };

  const markResourceCompleted = (id: string) => {
    const repo = learningResourceRepository;
    repo.markCompleted(id);
    setResources(prev => prev.map((r): Resource => r.id === id ? { ...r, readingProgress: 100 } : r));
  };

  const updateResourceProgress = (id: string, progress: number) => {
    const repo = learningResourceRepository;
    const lr = repo.getById(id);
    if (lr) {
      const minutesCompleted = Math.round((progress / 100) * lr.duration);
      repo.updateProgress(id, { minutesCompleted, completed: progress >= 100 });
    }
    setResources(prev => prev.map((r): Resource => r.id === id ? { ...r, readingProgress: progress } : r));
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedSubjectId,
        setSelectedSubjectId,
        selectedChapterId,
        setSelectedChapterId,
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
        pauseReason,
        sessionElapsedTime,
        startStudySession,
        pauseStudySession,
        resumeStudySession,
        finishStudySession,
        cancelStudySession,
        user,
        authLoading,
        login,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        logout,
        updateProfile,
        settings,
        updateSettings,
        activeLevel,
        setActiveLevel,
        subjects,
        readings,
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
        addPlannerSubject,
        chapters,
        curriculumService,
        curriculumTreeService,
        workspaceState,
        updateWorkspaceState,
        templates,
        activeTemplateId,
        setActiveTemplate,
        generateCoachPlan,
        copyCoachToSandbox,
        updateTemplateBlocks,
        activeTemplate,
        getResourcesByReading,
        markResourceOpened,
        markResourceCompleted,
        updateResourceProgress
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
