import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { coachPlanRepository } from '../../repositories/CoachPlanRepository';
import { studyStrategyRepository } from '../../repositories/StudyStrategyRepository';
import { checksumService } from './ChecksumService';
import { MigrationService } from './MigrationService';
import { TimelineTemplate } from '../../types';

export interface DocDiff {
  templateId: string;
  repositoryExists: boolean;
  cacheExists: boolean;
  cloudExists: boolean;
  repositoryData: any | null;
  cacheData: any | null;
  cloudData: any | null;
  repositoryChecksum: string;
  cacheChecksum: string;
  cloudChecksum: string;
  mismatches: string[];
}

export interface StrategyDiff {
  repositoryExists: boolean;
  cloudExists: boolean;
  repositoryChecksum: string;
  cloudChecksum: string;
  match: boolean;
  details: string[];
}

export interface ActiveIdDiff {
  repositoryActiveId: string | null;
  localStorageActiveId: string | null;
  cloudActiveId: string | null;
  match: boolean;
  details: string[];
}

export interface ForceVerifyReport {
  timestamp: string;
  uid: string | null;
  repositoryCount: number;
  cacheCount: number;
  cloudCount: number;
  templates: DocDiff[];
  strategy: StrategyDiff | null;
  activeTemplateId: ActiveIdDiff | null;
  summary: {
    totalMismatches: number;
    templatesMissingInCloud: number;
    templatesMissingInRepo: number;
    templatesMissingInCache: number;
    strategyMismatch: boolean;
    activeIdMismatch: boolean;
  };
}

export class ForceVerifyService {
  private static instance: ForceVerifyService;

  private constructor() {}

  public static getInstance(): ForceVerifyService {
    if (!ForceVerifyService.instance) {
      ForceVerifyService.instance = new ForceVerifyService();
    }
    return ForceVerifyService.instance;
  }

  public async verify(uid: string): Promise<ForceVerifyReport> {
    const report: ForceVerifyReport = {
      timestamp: new Date().toISOString(),
      uid,
      repositoryCount: 0,
      cacheCount: 0,
      cloudCount: 0,
      templates: [],
      strategy: null,
      activeTemplateId: null,
      summary: {
        totalMismatches: 0,
        templatesMissingInCloud: 0,
        templatesMissingInRepo: 0,
        templatesMissingInCache: 0,
        strategyMismatch: false,
        activeIdMismatch: false,
      }
    };

    // 1. Gather all sources
    const repoTemplates = coachPlanRepository.getAll();
    const cachedStr = localStorage.getItem('cfa_timeline_templates') || '[]';
    let cachedTemplates: TimelineTemplate[] = [];
    try { cachedTemplates = JSON.parse(cachedStr); } catch (_) {}

    let cloudPlans: Record<string, any> = {};
    try {
      const colRef = collection(db, 'users', uid, 'coachPlans');
      const snap = await getDocs(colRef);
      snap.forEach(docSnap => {
        cloudPlans[docSnap.id] = docSnap.data();
      });
    } catch (e: any) {
      console.error('[ForceVerify] Failed to fetch cloud plans:', e);
    }

    report.repositoryCount = repoTemplates.length;
    report.cacheCount = cachedTemplates.length;
    report.cloudCount = Object.keys(cloudPlans).length;

    // 2. Compare every template across all three layers
    const allIds = new Set([
      ...repoTemplates.map(t => t.id),
      ...cachedTemplates.map(t => t.id),
      ...Object.keys(cloudPlans)
    ]);

    for (const id of allIds) {
      const repoData = repoTemplates.find(t => t.id === id) || null;
      const cacheData = cachedTemplates.find(t => t.id === id) || null;
      const cloudDataRaw = cloudPlans[id] || null;

      // Migrate cloud data for comparison
      let cloudData: any = cloudDataRaw;
      if (cloudDataRaw) {
        cloudData = MigrationService.migrate(cloudDataRaw, 'coachPlan');
      }

      const diff: DocDiff = {
        templateId: id,
        repositoryExists: repoData !== null,
        cacheExists: cacheData !== null,
        cloudExists: cloudData !== null,
        repositoryData: repoData,
        cacheData: cacheData,
        cloudData: cloudData,
        repositoryChecksum: repoData ? checksumService.compute(repoData) : 'N/A',
        cacheChecksum: cacheData ? checksumService.compute(cacheData) : 'N/A',
        cloudChecksum: cloudData ? checksumService.compute(cloudData) : 'N/A',
        mismatches: []
      };

      // Compare repo vs cloud
      if (repoData && cloudData) {
        const repoHash = checksumService.compute(repoData);
        const cloudHash = checksumService.compute(cloudData);
        if (repoHash !== cloudHash) {
          diff.mismatches.push(`Repository content differs from Cloud`);
        }
      }
      if (repoData && cacheData) {
        const repoHash = checksumService.compute(repoData);
        const cacheHash = checksumService.compute(cacheData);
        if (repoHash !== cacheHash) {
          diff.mismatches.push(`Repository content differs from Cache`);
        }
      }
      if (cacheData && cloudData) {
        const cacheHash = checksumService.compute(cacheData);
        const cloudHash = checksumService.compute(cloudData);
        if (cacheHash !== cloudHash) {
          diff.mismatches.push(`Cache content differs from Cloud`);
        }
      }

      if (!cloudData) report.summary.templatesMissingInCloud++;
      if (!repoData) report.summary.templatesMissingInRepo++;
      if (!cacheData) report.summary.templatesMissingInCache++;
      if (diff.mismatches.length > 0) report.summary.totalMismatches++;

      report.templates.push(diff);
    }

    // 3. Verify strategy
    try {
      const strategyRef = doc(db, 'users', uid, 'studyStrategy', 'main');
      const stratSnap = await getDoc(strategyRef);
      const stratCloud = stratSnap.exists() ? stratSnap.data() : null;
      const stratRepo = studyStrategyRepository.get();

      const strategyDiff: StrategyDiff = {
        repositoryExists: stratRepo !== null,
        cloudExists: stratCloud !== null,
        repositoryChecksum: stratRepo ? checksumService.compute(stratRepo) : 'N/A',
        cloudChecksum: stratCloud ? checksumService.compute(stratCloud) : 'N/A',
        match: false,
        details: []
      };

      if (stratRepo && stratCloud) {
        const repoHash = checksumService.compute(stratRepo);
        const cloudHash = checksumService.compute(stratCloud);
        strategyDiff.match = repoHash === cloudHash;
        if (!strategyDiff.match) {
          strategyDiff.details.push('Strategy content differs between Repository and Cloud');
          report.summary.strategyMismatch = true;
          report.summary.totalMismatches++;
        }
      } else if (stratRepo !== null || stratCloud !== null) {
        strategyDiff.details.push(
          stratRepo ? 'Strategy exists in Repo but not in Cloud' : 'Strategy exists in Cloud but not in Repo'
        );
        report.summary.strategyMismatch = true;
        report.summary.totalMismatches++;
      } else {
        strategyDiff.match = true;
      }

      report.strategy = strategyDiff;
    } catch (e: any) {
      report.strategy = {
        repositoryExists: studyStrategyRepository.get() !== null,
        cloudExists: false,
        repositoryChecksum: 'ERROR',
        cloudChecksum: 'ERROR',
        match: false,
        details: [`Failed to fetch cloud strategy: ${e.message}`]
      };
    }

    // 4. Verify activeTemplateId
    try {
      const metaRef = doc(db, 'users', uid, 'metadata', 'main');
      const metaSnap = await getDoc(metaRef);
      const metaCloud = metaSnap.exists() ? metaSnap.data() : null;

      const repoActiveId = coachPlanRepository.getActiveTemplateId();
      const localActiveId = localStorage.getItem('cfa_active_template_id');
      const cloudActiveId = metaCloud?.activeTemplateId || null;

      const activeIdDiff: ActiveIdDiff = {
        repositoryActiveId: repoActiveId,
        localStorageActiveId: localActiveId,
        cloudActiveId: cloudActiveId,
        match: repoActiveId === localActiveId && localActiveId === cloudActiveId,
        details: []
      };

      if (repoActiveId !== localActiveId) {
        activeIdDiff.details.push(`Repo (${repoActiveId}) !== localStorage (${localActiveId})`);
        report.summary.activeIdMismatch = true;
        report.summary.totalMismatches++;
      }
      if (localActiveId !== cloudActiveId) {
        activeIdDiff.details.push(`localStorage (${localActiveId}) !== Cloud (${cloudActiveId})`);
        report.summary.activeIdMismatch = true;
        report.summary.totalMismatches++;
      }

      report.activeTemplateId = activeIdDiff;
    } catch (e: any) {
      report.activeTemplateId = {
        repositoryActiveId: coachPlanRepository.getActiveTemplateId(),
        localStorageActiveId: localStorage.getItem('cfa_active_template_id'),
        cloudActiveId: null,
        match: false,
        details: [`Failed to fetch cloud metadata: ${e.message}`]
      };
    }

    console.warn(`[ForceVerify] Complete: ${report.summary.totalMismatches} mismatches found`, report);
    return report;
  }
}

export const forceVerifyService = ForceVerifyService.getInstance();
