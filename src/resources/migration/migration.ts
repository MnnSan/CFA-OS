import { LearningResource } from '../types';
import { LearningResourceRepository } from '../repository/LearningResourceRepository';
import { SSCIImporter } from '../importer/SSCIImporter';
import learningResourcesJson from '../data/learningResources.json';

const MIGRATION_KEY = 'cfa_lrms_migration_completed';

export function isMigrationCompleted(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === 'true';
}

export function markMigrationCompleted(): void {
  localStorage.setItem(MIGRATION_KEY, 'true');
}

export async function runMigration(repository: LearningResourceRepository): Promise<{
  ssciCount: number;
  totalCount: number;
}> {
  const lrs = repository.getAll();
  const needsRepair = lrs.length > 0 && lrs.some(r => !r.readingId || r.readingId === "");

  if (needsRepair) {
    console.warn('[Migration] Corrupt resources detected (missing readingId). Triggering self-healing repair...');
    repository.clear();
    localStorage.removeItem('cfa_ssci_import_completed');
    localStorage.removeItem(MIGRATION_KEY);
  } else if (isMigrationCompleted()) {
    const existing = repository.count();
    return { ssciCount: existing, totalCount: existing };
  }

  let ssciCount = 0;

  try {
    const importer = new SSCIImporter();
    const result = await importer.import();
    if (result.imported.length > 0) {
      const linked = linkResourcesToReadings(result.imported);
      repository.addMany(linked);
      ssciCount = result.imported.length;
      SSCIImporter.markImported();
    }
  } catch (err) {
    console.error('[Migration] Dynamic Excel import failed:', err);
  }

  if (ssciCount === 0) {
    const resources = learningResourcesJson as LearningResource[];
    repository.addMany(resources);
    ssciCount = resources.length;
  }

  markMigrationCompleted();

  return { ssciCount, totalCount: repository.count() };
}

function linkResourcesToReadings(resources: LearningResource[]): Array<Omit<LearningResource, 'id' | 'importMetadata'> & { importMetadata?: Partial<LearningResource['importMetadata']> }> {
  return resources.map(r => ({
    ...r,
    importMetadata: {
      importedAt: new Date().toISOString(),
      source: 'CFA Level 3 Coding Sheet 2026.xlsx',
    },
  }));
}
