// ============================================================
// KT Banque - Gestionnaire de cache mémoire
// Cache LRU simple avec TTL pour optimiser les lectures JSON
// ============================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTTL: number = 60_000; // 60 secondes par défaut
  private readonly maxSize: number = 500;

  /**
   * Récupère une valeur du cache
   * @returns La valeur ou undefined si absente/expirée
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    // Vérification expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    entry.hits++;
    return entry.value;
  }

  /**
   * Définit une valeur dans le cache
   * @param ttl Durée de vie en millisecondes (défaut: 60s)
   */
  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    // Eviction si le cache est plein
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      hits: 0,
    });
  }

  /**
   * Invalide une entrée du cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalide toutes les entrées commençant par un préfixe
   */
  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Vide entièrement le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Supprime les entrées expirées (nettoyage périodique)
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Statistiques du cache
   */
  stats(): { size: number; maxSize: number; hitRate: string } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${totalHits} hits total`,
    };
  }

  /**
   * Eviction de l'entrée la moins utilisée (LRU approx.)
   */
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

// Singleton global
export const cache = new CacheManager();

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  const removed = cache.cleanup();
  if (removed > 0) {
    console.log(`[Cache] Nettoyage: ${removed} entrées expirées supprimées`);
  }
}, 5 * 60_000);
