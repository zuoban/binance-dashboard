/**
 * API 速率限制中间件
 *
 * 使用内存存储实现简单的速率限制
 * 生产环境建议使用 Redis 等持久化存储
 */

interface RateLimitStore {
  /** 请求数量 */
  count: number
  /** 重置时间戳 */
  resetTime: number
}

/**
 * 速率限制配置
 */
interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number
  /** 最大请求数 */
  maxRequests: number
}

/**
 * 内存存储（开发环境）
 * 注意：重启服务器会重置计数
 */
const rateLimitStore = new Map<string, RateLimitStore>()

/**
 * 清理过期的速率限制记录
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// 每分钟清理一次过期记录
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredEntries, 60 * 1000)
}

/**
 * 速率限制器类
 */
export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  /**
   * 检查是否允许请求
   */
  check(identifier: string): {
    allowed: boolean
    remaining: number
    resetTime: number
  } {
    const now = Date.now()
    const record = rateLimitStore.get(identifier)

    // 如果没有记录或记录已过期，创建新记录
    if (!record || now > record.resetTime) {
      const resetTime = now + this.config.windowMs
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime,
      })

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
      }
    }

    // 如果未超过限制，增加计数
    if (record.count < this.config.maxRequests) {
      record.count += 1
      rateLimitStore.set(identifier, record)

      return {
        allowed: true,
        remaining: this.config.maxRequests - record.count,
        resetTime: record.resetTime,
      }
    }

    // 超过限制，拒绝请求
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }

  /**
   * 重置指定标识符的速率限制
   */
  reset(identifier: string): void {
    rateLimitStore.delete(identifier)
  }

  /**
   * 清空所有速率限制记录
   */
  clear(): void {
    rateLimitStore.clear()
  }
}

/**
 * 预定义的速率限制器
 */

// 通用 API 速率限制：每分钟 60 次
export const generalRateLimit = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
})

// 严格速率限制：每分钟 10 次
export const strictRateLimit = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
})

// 宽松速率限制：每分钟 120 次
export const looseRateLimit = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
})

/**
 * 从请求中提取客户端标识符
 */
export function getClientIdentifier(request: Request): string {
  // 优先使用 X-Forwarded-For 头（代理情况）
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // 其次使用 X-Real-IP 头
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // 最后使用 IP 地址（如果可用）
  // 注意：在 Vercel/Serverless 环境中可能无法获取真实 IP
  return 'anonymous'
}

/**
 * Next.js API Route 速率限制辅助函数
 */
export async function checkRateLimit(
  request: Request,
  limiter: RateLimiter = generalRateLimit
): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
  error?: Response
}> {
  const identifier = getClientIdentifier(request)
  const result = limiter.check(identifier)

  if (!result.allowed) {
    const errorResponse = new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: '速率限制 exceeded，请稍后重试',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    )

    return {
      ...result,
      error: errorResponse,
    }
  }

  return result
}
