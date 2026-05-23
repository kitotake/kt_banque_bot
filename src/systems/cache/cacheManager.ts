// ============================================================
// KT Banque - Cache mémoire LRU avec TTL
// ============================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTTL = 60_000;
  private readonly maxSize = 500;

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    entry.hits++;
    return entry.value;
  }

  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttl, hits: 0 });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) { this.cache.delete(key); removed++; }
    }
    return removed;
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let minHits = Infinity;
    let minExpiry = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits || (entry.hits === minHits && entry.expiresAt < minExpiry)) {
        lruKey = key;
        minHits = entry.hits;
        minExpiry = entry.expiresAt;
      }
    }
    if (lruKey) this.cache.delete(lruKey);
  }
}

export const cache = new CacheManager();

setInterval(() => {
  const removed = cache.cleanup();
  if (removed > 0) console.log(`[Cache] ${removed} entrées expirées supprimées`);
}, 5 * 60_000);
