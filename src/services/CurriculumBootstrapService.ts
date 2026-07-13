import { learningResourceRepository } from '../resources/repository/LearningResourceRepository';
import { SSCIImporter, findReadingId } from '../resources/importer/SSCIImporter';
import { eventBus } from './EventBus';
import { INITIAL_2027_READINGS } from '../applications/cfa/curriculum/data/initialCurriculum';

export interface BootstrapMetadata {
  schemaVersion: number;
  curriculumVersion: string;
  excelChecksum: string;
  importedAt: string;
  importedCount: number;
  resourceVersion: string;
}

export class CurriculumBootstrapService {
  private static instance: CurriculumBootstrapService;
  private METADATA_KEY = 'cfa_bootstrap_metadata';
  private SCHEMA_VERSION = 2;
  private CURRICULUM_VERSION = '2027_v1';
  private RESOURCE_VERSION = '1.2.0';

  private constructor() {}

  public static getInstance(): CurriculumBootstrapService {
    if (!CurriculumBootstrapService.instance) {
      CurriculumBootstrapService.instance = new CurriculumBootstrapService();
    }
    return CurriculumBootstrapService.instance;
  }

  /**
   * Computes the SHA-256 hash of an ArrayBuffer in hex format.
   */
  private async calculateSHA256(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getStoredMetadata(): BootstrapMetadata | null {
    try {
      const raw = localStorage.getItem(this.METADATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private saveMetadata(metadata: BootstrapMetadata): void {
    localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
  }

  /**
   * Performs the bootstrap logic.
   */
  public async bootstrap(force = false): Promise<{ bootstrapped: boolean; reason: string }> {
    console.log('[CurriculumBootstrapService] Starting conditional bootstrap verification...');
    const filePath = '/data/datasets/CFA Level 3 Coding Sheet_2026.xlsx';

    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} when fetching Excel sheet`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const currentChecksum = await this.calculateSHA256(arrayBuffer);
      const storedMeta = this.getStoredMetadata();
      const repoCount = learningResourceRepository.count();
      
      // M13.4 Startup Self-Healing Verification
      const ssciRepoCount = learningResourceRepository.getByProvider('SSCI').length;
      const visibleSsciCount = learningResourceRepository.getAll().filter(r => r.provider === 'SSCI' && !r.archived).length;
      const EXPECTED_EXCEL_SSCI_COUNT = 225;
      const countMismatch = ssciRepoCount !== EXPECTED_EXCEL_SSCI_COUNT || visibleSsciCount !== EXPECTED_EXCEL_SSCI_COUNT;

      if (countMismatch && repoCount > 0) {
        console.warn(`[CurriculumBootstrapService] Auto-healing: Mismatch detected! (Expected: ${EXPECTED_EXCEL_SSCI_COUNT}, Repository: ${ssciRepoCount}, Visible: ${visibleSsciCount}). Forcing re-import and repair...`);
      }

      // Check if we need to reload/bootstrap
      const needsReload = 
        force ||
        !storedMeta ||
        storedMeta.excelChecksum !== currentChecksum ||
        storedMeta.schemaVersion !== this.SCHEMA_VERSION ||
        storedMeta.curriculumVersion !== this.CURRICULUM_VERSION ||
        storedMeta.resourceVersion !== this.RESOURCE_VERSION ||
        repoCount === 0 ||
        countMismatch;

      if (needsReload) {
        console.log('[CurriculumBootstrapService] Bootstrapping conditions met. Executing atomic Excel import...');
        
        // Start Repository Transaction to guarantee all-or-nothing
        learningResourceRepository.beginTransaction();

        try {
          const importer = new SSCIImporter();
          const result = await importer.import();

          if (result.errors && result.errors.length > 0) {
            console.warn(`[CurriculumBootstrapService] Import completed with ${result.errors.length} warnings/errors:`, result.errors);
          }

          // Validate and normalize resources immediately after import (Steps 2, 3, 4)
          const validReadingIds = new Set(INITIAL_2027_READINGS.map(r => r.id));
          const validatedImported: any[] = [];
          const validationDiagnostics: any[] = result.diagnostics || [];

          for (const lecture of (result.imported || [])) {
            // STEP 4 — Verify Provider Mapping
            let provider = String(lecture.provider || 'SSCI').trim();
            // Normalize values like "SSCI Prep", "Schweser", etc.
            if (
              provider.toLowerCase().startsWith('ssci') ||
              provider.toLowerCase().startsWith('schweser') ||
              provider.toLowerCase().startsWith('video') ||
              provider.toLowerCase().startsWith('lecture')
            ) {
              provider = 'SSCI';
            }
            lecture.provider = provider as any;

            // STEP 3 — Verify Reading Mapping
            let readingId = lecture.readingId;
            if (!validReadingIds.has(readingId)) {
              // Repair automatically using the importer matching logic
              const repairedReadingId = findReadingId(lecture.importMetadata?.originalReadingStr || '', lecture.lectureCode || '', lecture.title || '');
              if (repairedReadingId && validReadingIds.has(repairedReadingId)) {
                readingId = repairedReadingId;
                lecture.readingId = repairedReadingId;
                lecture.reading = repairedReadingId;
              } else {
                // If it cannot be repaired, skip/discard (no orphans allowed)
                validationDiagnostics.push({
                  type: 'UNKNOWN_READING',
                  excelReading: lecture.importMetadata?.originalReadingStr || 'Unknown',
                  lectureName: lecture.title,
                  lectureCode: lecture.lectureCode,
                  details: `Orphan lecture discarded: readingId "${readingId}" does not exist in curriculum.`
                });
                continue;
              }
            }

            validatedImported.push(lecture);
          }

          // STEP 2 — Abort silently accepting bad imports
          if (validatedImported.length === 0 || validatedImported.filter(r => r.provider === 'SSCI').length === 0) {
            console.warn('[CurriculumBootstrapService] Aborting: 0 valid SSCI lectures imported.');
            learningResourceRepository.rollbackTransaction();
            return { bootstrapped: false, reason: 'Aborted: 0 valid lectures imported.' };
          }

          // Save diagnostics
          localStorage.setItem('cfa_import_diagnostics', JSON.stringify(validationDiagnostics));

          // Clean old resources
          learningResourceRepository.clear();

          // 1. Process Excel imported resources
          const mappedExcel = validatedImported.map(r => ({
            ...r,
            importMetadata: {
              ...r.importMetadata,
              importedAt: new Date().toISOString(),
              source: 'CFA Level 3 Coding Sheet 2026.xlsx'
            }
          }));

          // 2. Generate standard resource sets for every reading to prevent empty Resources panels
          const additionalResources: any[] = [];
          
          for (const reading of INITIAL_2027_READINGS) {
            const readingId = reading.id;
            const subjectId = reading.subjectId;
            const readingNum = reading.readingNumber || reading.number;
            const readingTitle = reading.title || reading.name || '';

            // Seed YouTube Video Lecture
            additionalResources.push({
              id: `lrs-yt-${readingId}`,
              provider: 'Personal',
              resourceType: 'Video',
              title: `YouTube Study Tutorial: ${readingTitle}`,
              description: `Video lecture covering core topics of Reading ${readingNum} on YouTube.`,
              readingId,
              losIds: [],
              duration: 35,
              launchUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              importMetadata: {
                importedAt: new Date().toISOString(),
                source: 'seeded-youtube'
              },
              progress: { minutesCompleted: 0, completed: false, lastOpenedAt: null, resumeState: null },
              subject: subjectId,
              reading: readingId
            });

            // Seed NotebookLM link
            additionalResources.push({
              id: `lrs-nb-${readingId}`,
              provider: 'NotebookLM',
              resourceType: 'Interactive',
              title: `NotebookLM Interactive Briefing - Reading ${readingNum}`,
              description: `AI-generated study companion and audio overview for ${readingTitle}.`,
              readingId,
              losIds: [],
              duration: 45,
              launchUrl: 'https://notebooklm.google.com/',
              importMetadata: {
                importedAt: new Date().toISOString(),
                source: 'seeded-notebooklm'
              },
              progress: { minutesCompleted: 0, completed: false, lastOpenedAt: null, resumeState: null },
              subject: subjectId,
              reading: readingId
            });

            // Seed Google Drive practice sheet
            additionalResources.push({
              id: `lrs-gd-${readingId}`,
              provider: 'Personal',
              resourceType: 'Spreadsheet',
              title: `Google Drive Core Practice Sheet - Reading ${readingNum}`,
              description: `Shared student spreadsheet containing worked examples and computational templates for ${readingTitle}.`,
              readingId,
              losIds: [],
              duration: 20,
              launchUrl: 'https://drive.google.com/',
              importMetadata: {
                importedAt: new Date().toISOString(),
                source: 'seeded-drive'
              },
              progress: { minutesCompleted: 0, completed: false, lastOpenedAt: null, resumeState: null },
              subject: subjectId,
              reading: readingId
            });

            // Seed CFAI Official Curriculum PDF
            additionalResources.push({
              id: `lrs-cfai-pdf-${readingId}`,
              provider: 'CFA Institute',
              resourceType: 'PDF',
              title: `CFAI Official Curriculum Text (PDF) - Reading ${readingNum}`,
              description: `Direct reference reading sections for ${readingTitle}.`,
              readingId,
              losIds: [],
              duration: 60,
              launchUrl: 'https://www.cfainstitute.org/',
              importMetadata: {
                importedAt: new Date().toISOString(),
                source: 'seeded-cfai-pdf'
              },
              progress: { minutesCompleted: 0, completed: false, lastOpenedAt: null, resumeState: null },
              subject: subjectId,
              reading: readingId
            });

            // Seed Question Bank
            additionalResources.push({
              id: `lrs-qbank-${readingId}`,
              provider: 'Question Bank',
              resourceType: 'Question Bank',
              title: `Q-Bank Conceptual Drills - Reading ${readingNum}`,
              description: `Interactive multiple-choice practice sets mapping to Reading ${readingNum} LOS items.`,
              readingId,
              losIds: [],
              duration: 30,
              launchUrl: 'https://www.schweser.com/',
              importMetadata: {
                importedAt: new Date().toISOString(),
                source: 'seeded-qbank'
              },
              progress: { minutesCompleted: 0, completed: false, lastOpenedAt: null, resumeState: null },
              subject: subjectId,
              reading: readingId
            });
          }

          const combined = [...mappedExcel, ...additionalResources];

          // This will run validate() inside repository.addMany()
          // If validation fails, it throws, triggering transaction rollback!
          learningResourceRepository.addMany(combined as any);

          // Commit Transaction
          learningResourceRepository.commitTransaction();

          // Save Bootstrap Metadata
          const meta: BootstrapMetadata = {
            schemaVersion: this.SCHEMA_VERSION,
            curriculumVersion: this.CURRICULUM_VERSION,
            excelChecksum: currentChecksum,
            importedAt: new Date().toISOString(),
            importedCount: combined.length,
            resourceVersion: this.RESOURCE_VERSION
          };
          this.saveMetadata(meta);

          console.log(`[CurriculumBootstrapService] Successfully bootstrapped ${combined.length} total resources.`);
          
          eventBus.publish({
            type: 'CurriculumBootstrapped',
            timestamp: new Date().toISOString(),
            source: 'CurriculumBootstrapService',
            entityId: 'curriculum-db',
            payload: { count: combined.length, checksum: currentChecksum }
          });

          return { bootstrapped: true, reason: 'Bootstrapped and validated Excel coding sheet with dynamic resource additions' };
        } catch (innerErr) {
          // Rollback on any failure
          console.error('[CurriculumBootstrapService] Validation or import failure. Rolling back transaction...', innerErr);
          learningResourceRepository.rollbackTransaction();
          throw innerErr;
        }
      } else {
        console.log('[CurriculumBootstrapService] Checksum & versions match stored metadata. Skipping bootstrap.');
        
        eventBus.publish({
          type: 'CurriculumBootstrapSkipped',
          timestamp: new Date().toISOString(),
          source: 'CurriculumBootstrapService',
          entityId: 'curriculum-db',
          payload: { count: repoCount, checksum: currentChecksum }
        });

        return { bootstrapped: false, reason: 'Excel matches current checksum and schema version' };
      }
    } catch (err: any) {
      console.error('[CurriculumBootstrapService] Bootstrap failed, falling back to JSON seeds:', err);
      
      // Fallback if Excel load/import fails completely but repo is empty
      if (learningResourceRepository.count() === 0) {
        try {
          learningResourceRepository.beginTransaction();
          const learningResourcesJson = await import('../resources/data/learningResources.json');
          if (learningResourcesJson && Array.isArray(learningResourcesJson.default)) {
            learningResourceRepository.clear();
            learningResourceRepository.addMany(learningResourcesJson.default as any);
            learningResourceRepository.commitTransaction();

            const meta: BootstrapMetadata = {
              schemaVersion: this.SCHEMA_VERSION,
              curriculumVersion: this.CURRICULUM_VERSION,
              excelChecksum: 'fallback-seed-json',
              importedAt: new Date().toISOString(),
              importedCount: learningResourceRepository.count(),
              resourceVersion: this.RESOURCE_VERSION
            };
            this.saveMetadata(meta);

            console.log('[CurriculumBootstrapService] Populated repository from validated JSON fallback seed.');
            
            eventBus.publish({
              type: 'CurriculumBootstrapped',
              timestamp: new Date().toISOString(),
              source: 'CurriculumBootstrapService',
              entityId: 'curriculum-db',
              payload: { count: learningResourceRepository.count() }
            });
            
            return { bootstrapped: true, reason: 'Loaded fallback seed data' };
          }
        } catch (jsonErr) {
          console.error('[CurriculumBootstrapService] JSON fallback failed. Rolling back...', jsonErr);
          learningResourceRepository.rollbackTransaction();
        }
      }
      
      return { bootstrapped: false, reason: `Error: ${err.message}` };
    }
  }
}

export const curriculumBootstrapService = CurriculumBootstrapService.getInstance();
