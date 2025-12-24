/**
 * Advanced caching strategies for Free API Hub
 */

class CacheStrategies {
  constructor(redis, logger) {
    this.redis = redis;
    this.logger = logger;
  }

  /**
   * Standard cache-aside (lazy loading)
   */
  async cacheAside(key, fetchFn, ttl = 300) {
    try {
      // Try cache first
      const cached = await this.redis.get(key);
      if (cached) {
        this.logger.info(`Cache HIT: ${key}`);
        return { data: JSON.parse(cached), cached: true };
      }

      // Cache miss - fetch data
      this.logger.info(`Cache MISS: ${key}`);
      const data = await fetchFn();
      
      // Store in cache
      await this.redis.setEx(key, ttl, JSON.stringify(data));
      return { data, cached: false };
    } catch (error) {
      this.logger.error('Cache-aside error:', error);
      // Return fresh data on cache failure
      return { data: await fetchFn(), cached: false };
    }
  }

  /**
   * Write-through cache (update cache on write)
   */
  async writeThrough(key, data, writeFn, ttl = 300) {
    try {
      // Write to database first
      await writeFn(data);
      
      // Then update cache
      await this.redis.setEx(key, ttl, JSON.stringify(data));
      this.logger.info(`Write-through cache updated: ${key}`);
      return true;
    } catch (error) {
      this.logger.error('Write-through error:', error);
      throw error;
    }
  }

  /**
   * Write-behind cache (async write to database)
   */
  async writeBehind(key, data, writeFn, ttl = 300) {
    try {
      // Update cache immediately
      await this.redis.setEx(key, ttl, JSON.stringify(data));
      this.logger.info(`Write-behind cache updated: ${key}`);
      
      // Write to database asynchronously
      setImmediate(async () => {
        try {
          await writeFn(data);
        } catch (error) {
          this.logger.error('Write-behind database write failed:', error);
        }
      });
      
      return true;
    } catch (error) {
      this.logger.error('Write-behind error:', error);
      throw error;
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(entries) {
    const results = [];
    for (const { key, fetchFn, ttl } of entries) {
      try {
        const data = await fetchFn();
        await this.redis.setEx(key, ttl, JSON.stringify(data));
        results.push({ key, status: 'warmed' });
        this.logger.info(`Cache warmed: ${key}`);
      } catch (error) {
        results.push({ key, status: 'failed', error: error.message });
        this.logger.error(`Cache warming failed for ${key}:`, error);
      }
    }
    return results;
  }

  /**
   * Multi-level cache (L1: memory, L2: Redis)
   */
  createMultiLevel() {
    const memoryCache = new Map();
    const maxMemoryEntries = 100;

    return {
      async get(key) {
        // L1: Check memory
        if (memoryCache.has(key)) {
          const entry = memoryCache.get(key);
          if (entry.expires > Date.now()) {
            return { data: entry.data, level: 'L1', cached: true };
          }
          memoryCache.delete(key);
        }

        // L2: Check Redis
        try {
          const cached = await this.redis.get(key);
          if (cached) {
            const data = JSON.parse(cached);
            // Promote to L1
            if (memoryCache.size >= maxMemoryEntries) {
              const firstKey = memoryCache.keys().next().value;
              memoryCache.delete(firstKey);
            }
            memoryCache.set(key, {
              data,
              expires: Date.now() + 60000 // 1 minute in memory
            });
            return { data, level: 'L2', cached: true };
          }
        } catch (error) {
          this.logger.error('L2 cache error:', error);
        }

        return null;
      },

      async set(key, data, ttl = 300) {
        // Store in both levels
        memoryCache.set(key, {
          data,
          expires: Date.now() + 60000
        });
        
        try {
          await this.redis.setEx(key, ttl, JSON.stringify(data));
        } catch (error) {
          this.logger.error('L2 cache set error:', error);
        }
      },

      clear() {
        memoryCache.clear();
      },

      stats() {
        return {
          l1Size: memoryCache.size,
          l1MaxSize: maxMemoryEntries
        };
      }
    };
  }

  /**
   * Refresh-ahead cache (proactive refresh before expiry)
   */
  async refreshAhead(key, fetchFn, ttl = 300, refreshThreshold = 0.8) {
    try {
      const timeToLive = await this.redis.ttl(key);
      const cached = await this.redis.get(key);

      if (cached) {
        // Check if refresh is needed (80% of TTL passed)
        if (timeToLive > 0 && timeToLive < ttl * (1 - refreshThreshold)) {
          this.logger.info(`Refresh-ahead triggered for: ${key}`);
          // Refresh in background
          setImmediate(async () => {
            try {
              const freshData = await fetchFn();
              await this.redis.setEx(key, ttl, JSON.stringify(freshData));
            } catch (error) {
              this.logger.error('Refresh-ahead failed:', error);
            }
          });
        }
        return { data: JSON.parse(cached), cached: true };
      }

      // No cache - fetch and store
      const data = await fetchFn();
      await this.redis.setEx(key, ttl, JSON.stringify(data));
      return { data, cached: false };
    } catch (error) {
      this.logger.error('Refresh-ahead error:', error);
      return { data: await fetchFn(), cached: false };
    }
  }

  /**
   * Pattern-based cache invalidation
   */
  async invalidatePattern(pattern) {
    try {
      let cursor = 0;
      let deleted = 0;

      do {
        const result = await this.redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100
        });
        
        cursor = result.cursor;
        
        if (result.keys.length > 0) {
          await this.redis.del(result.keys);
          deleted += result.keys.length;
        }
      } while (cursor !== 0);

      this.logger.info(`Invalidated ${deleted} keys matching pattern: ${pattern}`);
      return deleted;
    } catch (error) {
      this.logger.error('Pattern invalidation error:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');
      
      return {
        keyspace: await this.redis.dbSize(),
        hits: this.extractStat(info, 'keyspace_hits'),
        misses: this.extractStat(info, 'keyspace_misses'),
        hitRate: this.calculateHitRate(info),
        memory: this.extractStat(memory, 'used_memory_human'),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  extractStat(info, key) {
    const match = info.match(new RegExp(`${key}:(\\S+)`));
    return match ? match[1] : '0';
  }

  calculateHitRate(info) {
    const hits = parseInt(this.extractStat(info, 'keyspace_hits'));
    const misses = parseInt(this.extractStat(info, 'keyspace_misses'));
    const total = hits + misses;
    return total > 0 ? ((hits / total) * 100).toFixed(2) : '0';
  }
}

module.exports = CacheStrategies;
