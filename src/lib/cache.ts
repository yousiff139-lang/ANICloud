// Advanced caching system for ANICloud

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl: number = 3600000): void {
    // TTL in milliseconds (default 1 hour)
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    this.cache.forEach((entry) => {
      totalSize++;
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    });

    return {
      totalEntries: totalSize,
      expiredEntries: expiredCount,
      activeEntries: totalSize - expiredCount,
      maxSize: this.maxSize,
      utilizationPercent: (totalSize / this.maxSize) * 100
    };
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    return cleaned;
  }
}

// Global cache instance
export const cache = new CacheManager(1000);

// Cache helper functions
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600000
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}

// Cache keys generator
export const CacheKeys = {
  anime: (id: number) => `anime:${id}`,
  episodes: (id: number) => `episodes:${id}`,
  stream: (id: number, episode: number) => `stream:${id}:${episode}`,
  trending: () => 'trending',
  seasonal: (year: number, season: string) => `seasonal:${year}:${season}`,
  search: (query: string) => `search:${query}`,
  recommendations: (userId: string) => `recommendations:${userId}`,
  profile: (userId: string) => `profile:${userId}`,
  reviews: (animeId: number) => `reviews:${animeId}`,
  subtitles: (animeId: number, episode: number) => `subtitles:${animeId}:${episode}`
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,    // 30 minutes
  LONG: 60 * 60 * 1000,      // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000  // 24 hours
};

// Periodic cleanup (run every 10 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const cleaned = cache.cleanup();
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }
  }, 10 * 60 * 1000);
}
