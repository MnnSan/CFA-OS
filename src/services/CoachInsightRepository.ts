import { CoachInsight } from '../types';

const STORAGE_KEY = 'cfa_coach_insights_cache';

function loadCache(): Record<string, CoachInsight> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveCache(cache: Record<string, CoachInsight>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

function cacheKey(
  phaseId: string,
  readingId: string,
  provider: string,
  promptVersion: string,
  curriculumVersion: string
): string {
  return `${readingId}::${phaseId}::${provider}::${promptVersion}::${curriculumVersion}`;
}

export class CoachInsightRepository {
  private cache: Record<string, CoachInsight>;

  constructor() {
    this.cache = loadCache();
  }

  get(
    phaseId: string,
    readingId: string,
    provider: string,
    promptVersion: string,
    curriculumVersion: string
  ): CoachInsight | null {
    const key = cacheKey(phaseId, readingId, provider, promptVersion, curriculumVersion);
    return this.cache[key] || null;
  }

  save(
    phaseId: string,
    readingId: string,
    provider: string,
    promptVersion: string,
    curriculumVersion: string,
    insight: Omit<CoachInsight, 'phaseId' | 'readingId' | 'provider' | 'promptVersion' | 'curriculumVersion'>
  ): CoachInsight {
    const entry: CoachInsight = {
      ...insight,
      phaseId,
      readingId,
      provider,
      promptVersion,
      curriculumVersion,
    };
    const key = cacheKey(phaseId, readingId, provider, promptVersion, curriculumVersion);
    this.cache[key] = entry;
    saveCache(this.cache);
    return entry;
  }

  has(
    phaseId: string,
    readingId: string,
    provider: string,
    promptVersion: string,
    curriculumVersion: string
  ): boolean {
    const key = cacheKey(phaseId, readingId, provider, promptVersion, curriculumVersion);
    return key in this.cache;
  }

  clear(
    phaseId?: string,
    readingId?: string,
    provider?: string,
    promptVersion?: string,
    curriculumVersion?: string
  ): void {
    if (phaseId && readingId && provider && promptVersion && curriculumVersion) {
      const key = cacheKey(phaseId, readingId, provider, promptVersion, curriculumVersion);
      delete this.cache[key];
    } else {
      this.cache = {};
    }
    saveCache(this.cache);
  }
}
