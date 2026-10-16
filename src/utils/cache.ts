/**
 * High-performance dual-tier cache (In-Memory + SessionStorage)
 * Provides instant 0ms retrieval on reload & page navigation.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private memCache = new Map<string, CacheEntry<any>>();
  private prefix = "cinema_cache_v9_";

  constructor() {
    this.pruneExpiredSession();
  }

  private getSessionKey(key: string): string {
    return this.prefix + key;
  }

  private pruneExpiredSession(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("cinema_cache_")) {
          // If it belongs to an older version, remove immediately
          if (!key.startsWith(this.prefix)) {
            keysToRemove.push(key);
            continue;
          }
          const raw = sessionStorage.getItem(key);
          if (raw) {
            try {
              const entry: CacheEntry<any> = JSON.parse(raw);
              if (now - entry.timestamp > entry.ttl) {
                keysToRemove.push(key);
              }
            } catch {
              keysToRemove.push(key);
            }
          }
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // Ignore sessionStorage errors
    }
  }

  public get<T>(key: string): T | null {
    const now = Date.now();

    // 1. Check Fast In-Memory Cache
    const inMem = this.memCache.get(key);
    if (inMem) {
      if (now - inMem.timestamp <= inMem.ttl) {
        return inMem.data as T;
      }
      this.memCache.delete(key);
    }

    // 2. Check SessionStorage (Survives Reloads) - skip for streams to prevent stale link locks
    if (!key.startsWith("mirrors:") && !key.startsWith("api:streams:")) {
      try {
        const raw = sessionStorage.getItem(this.getSessionKey(key));
        if (raw) {
          const entry: CacheEntry<T> = JSON.parse(raw);
          if (now - entry.timestamp <= entry.ttl) {
            this.memCache.set(key, entry);
            return entry.data;
          } else {
            sessionStorage.removeItem(this.getSessionKey(key));
          }
        }
      } catch {
        // Ignore parse or storage errors
      }
    }

    return null;
  }

  public set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    // NEVER cache null, undefined, or empty arrays!
    if (data === null || data === undefined) return;
    if (Array.isArray(data) && data.length === 0) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    // Store in memory
    this.memCache.set(key, entry);

    // Streams and mirrors stay memory-only so stale/broken streams are never permanently locked in session
    if (key.startsWith("mirrors:") || key.startsWith("api:streams:")) {
      return;
    }

    // Store in SessionStorage
    try {
      const serialized = JSON.stringify(entry);
      sessionStorage.setItem(this.getSessionKey(key), serialized);
    } catch (e: any) {
      if (e?.name === "QuotaExceededError") {
        this.clearOldestSessionItems();
        try {
          sessionStorage.setItem(this.getSessionKey(key), JSON.stringify(entry));
        } catch {
          // Fallback to memory-only
        }
      }
    }
  }

  private clearOldestSessionItems(): void {
    try {
      const items: { key: string; timestamp: number }[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          const raw = sessionStorage.getItem(k);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              items.push({ key: k, timestamp: parsed.timestamp || 0 });
            } catch {
              items.push({ key: k, timestamp: 0 });
            }
          }
        }
      }
      items.sort((a, b) => a.timestamp - b.timestamp);
      // Remove oldest 50%
      const removeCount = Math.ceil(items.length / 2);
      for (let i = 0; i < removeCount; i++) {
        sessionStorage.removeItem(items[i].key);
      }
    } catch {
      // Ignore
    }
  }

  public delete(key: string): void {
    this.memCache.delete(key);
    try {
      sessionStorage.removeItem(this.getSessionKey(key));
    } catch {
      // Ignore
    }
  }

  public clear(): void {
    this.memCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}

export const appCache = new CacheManager();
