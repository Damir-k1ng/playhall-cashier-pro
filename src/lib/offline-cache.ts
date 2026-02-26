const CACHE_PREFIX = 'offline_cache:';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour max staleness

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

export function setCacheEntry(path: string, data: unknown): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(entry));
  } catch {
    // localStorage full — clear old entries
    clearOldCache();
  }
}

export function getCacheEntry<T = unknown>(path: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Check staleness
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + path);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function clearOldCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  // Remove oldest half
  const entries = keys.map(k => {
    try {
      const e: CacheEntry = JSON.parse(localStorage.getItem(k) || '{}');
      return { key: k, ts: e.timestamp || 0 };
    } catch {
      return { key: k, ts: 0 };
    }
  }).sort((a, b) => a.ts - b.ts);

  const removeCount = Math.max(1, Math.floor(entries.length / 2));
  entries.slice(0, removeCount).forEach(e => localStorage.removeItem(e.key));
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message.includes('fetch')) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (!navigator.onLine) return true;
  return false;
}
