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

function cacheKey(phaseId: string, readingId: string): string {
  return `${readingId}::${phaseId}`;
}

export class CoachInsightRepository {
  private cache: Record<string, CoachInsight>;

  constructor() {
    this.cache = loadCache();
  }

  get(phaseId: string, readingId: string): CoachInsight | null {
    return this.cache[cacheKey(phaseId, readingId)] || null;
  }

  save(phaseId: string, readingId: string, insight: Omit<CoachInsight, 'phaseId' | 'readingId'>): CoachInsight {
    const entry: CoachInsight = {
      ...insight,
      phaseId,
      readingId,
    };
    this.cache[cacheKey(phaseId, readingId)] = entry;
    saveCache(this.cache);
    return entry;
  }

  has(phaseId: string, readingId: string): boolean {
    return cacheKey(phaseId, readingId) in this.cache;
  }

  clear(phaseId?: string, readingId?: string): void {
    if (phaseId && readingId) {
      delete this.cache[cacheKey(phaseId, readingId)];
    } else {
      this.cache = {};
    }
    saveCache(this.cache);
  }
}
