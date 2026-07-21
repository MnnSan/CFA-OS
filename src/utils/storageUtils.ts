/**
 * Quota-Safe LocalStorage Utility
 * Prevents QuotaExceededError crashes by auto-pruning non-critical cached data.
 */

export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.number === -2147024882) {
      console.warn(`[LocalStorage] Quota exceeded for key "${key}". Auto-cleaning stale cache...`);
      const nonCriticalKeys = [
        'cfa_analytics_events',
        'cfa_analytics_summary',
        'cfa_sync_completed_ops',
        'cfa_sync_pending_errors',
        'cfa_knowledge_ingestion_cache',
        'cfa_search_index_cache',
        'cfa_last_nightly_backup'
      ];
      for (const k of nonCriticalKeys) {
        try { localStorage.removeItem(k); } catch {}
      }
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.error(`[LocalStorage] Unable to save "${key}" even after pruning:`, retryErr);
        return false;
      }
    }
    return false;
  }
}

export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[LocalStorage] Failed to parse key "${key}":`, err);
    return fallback;
  }
}
