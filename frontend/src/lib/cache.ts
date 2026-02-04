interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
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

  // Get cache size for debugging
  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const memoryCache = new MemoryCache();

// Gift model cache with longer TTL since they don't change often
const GIFT_MODELS_TTL = 30 * 60 * 1000; // 30 minutes
const GIFTS_TTL = 60 * 60 * 1000; // 1 hour
const BACKDROPS_TTL = 60 * 60 * 1000; // 1 hour

export const cacheUtils = {
  // Gifts cache
  getGifts: async (): Promise<string[]> => {
    const cacheKey = 'gifts';
    const cached = memoryCache.get<string[]>(cacheKey);
    if (cached) {
      console.log('🎁 Using cached gifts');
      return cached;
    }

    console.log('🎁 Loading gifts from API...');
    try {
      const response = await fetch('/api/collection/gifts');
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        memoryCache.set(cacheKey, data.gifts, GIFTS_TTL);
        return data.gifts;
      }
      
      throw new Error('API returned unsuccessful response');
    } catch (error) {
      console.error('Failed to load gifts from API:', error);
      throw new Error('Failed to load gifts');
    }
  },

  // Backdrops cache
  getBackdrops: async (): Promise<any[]> => {
    const cacheKey = 'backdrops';
    const cached = memoryCache.get<any[]>(cacheKey);
    if (cached) {
      console.log('🎨 Using cached backdrops');
      return cached;
    }

    console.log('🎨 Loading backdrops from API...');
    try {
      const response = await fetch('/api/collection/backdrops');
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        memoryCache.set(cacheKey, data.backdrops, BACKDROPS_TTL);
        return data.backdrops;
      }
      
      throw new Error('API returned unsuccessful response');
    } catch (error) {
      console.error('Failed to load backdrops from API:', error);
      throw new Error('Failed to load backdrops');
    }
  },

  // Gift models cache
  getGiftModels: async (giftName: string): Promise<any[]> => {
    const cacheKey = `gift_models_${giftName}`;
    const cached = memoryCache.get<any[]>(cacheKey);
    if (cached) {
      console.log(`🎁 Using cached models for ${giftName}`);
      return cached;
    }

    console.log(`🎁 Loading models for ${giftName} from API...`);
    try {
      const response = await fetch(`/api/collection/gifts/${encodeURIComponent(giftName)}/models`);
      
      if (!response.ok) {
        console.error(`❌ Failed to load models for ${giftName}: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.models)) {
        memoryCache.set(cacheKey, data.models, GIFT_MODELS_TTL);
        return data.models;
      }
      
      // If no models found, return empty array instead of throwing
      console.log(`⚠️ No models found for ${giftName}`);
      return [];
    } catch (error) {
      console.error(`❌ Error loading models for ${giftName}:`, error);
      return [];
    }
  },

  // Gift patterns cache
  getGiftPatterns: async (giftName: string): Promise<any[]> => {
    const cacheKey = `gift_patterns_${giftName}`;
    const cached = memoryCache.get<any[]>(cacheKey);
    if (cached) {
      console.log(`🎨 Using cached patterns for ${giftName}`);
      return cached;
    }

    console.log(`🎨 Loading patterns for ${giftName} from API...`);
    const response = await fetch(`/api/collection/gifts/${encodeURIComponent(giftName)}/patterns`, {
      cache: 'no-store' // Disable browser caching for large responses
    });
    
    if (!response.ok) {
      console.log(`❌ No patterns found for ${giftName}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.patterns) {
      // Use shorter TTL for patterns due to size
      memoryCache.set(cacheKey, data.patterns, 5 * 60 * 1000); // 5 minutes
      return data.patterns;
    }
    
    return [];
  },

  // Image preload cache
  preloadImage: (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
  },

  // Batch preload images
  preloadImages: async (urls: string[]): Promise<void> => {
    const promises = urls.map(url => cacheUtils.preloadImage(url));
    await Promise.allSettled(promises);
  },

  // Clear specific cache
  clearGiftModels: (giftName?: string): void => {
    if (giftName) {
      memoryCache.delete(`gift_models_${giftName}`);
    } else {
      // Clear all gift models cache
      const keys = Array.from(memoryCache['cache'].keys());
      keys.forEach(key => {
        if (key.startsWith('gift_models_')) {
          memoryCache.delete(key);
        }
      });
    }
  },

  // Clear all cache
  clearAll: (): void => {
    memoryCache.clear();
  },

  // Get cache stats
  getStats: () => ({
    size: memoryCache.size(),
    keys: Array.from(memoryCache['cache'].keys())
  })
};
