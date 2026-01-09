/**
 * 简单的内存缓存工具
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 10000 // 10秒默认缓存时间

  /**
   * 获取缓存数据
   */
  get<T>(key: string, ttl: number = this.defaultTTL): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * 清除缓存
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(ttl: number = this.defaultTTL): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// 导出单例实例
export const cache = new SimpleCache()

// 定期清理过期缓存（每分钟）
if (typeof window === 'undefined') {
  // 服务端：每分钟清理一次
  setInterval(() => {
    cache.cleanup()
  }, 60000)
}
