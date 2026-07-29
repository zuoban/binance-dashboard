/**
 * 币安看板统一数据 API Route
 *
 * 兼容轮询客户端，同时复用 SSE 的 DataManager 聚合逻辑，避免两条数据路径产生口径差异。
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { getDataManager } from '@/lib/services/data-manager'
import type { DashboardData } from '@/lib/services/types'
import { getBinanceErrorMessage, isBinanceErrorResponse } from '@/lib/utils/error-handler'

/** REST 兼容接口缓存时间 */
const CACHE_TTL = 10000

/** 内存缓存 */
const dashboardCache = new Map<string, { data: DashboardData; timestamp: number }>()

/**
 * 清除所有缓存
 */
export function clearCache(): void {
  dashboardCache.clear()
}

/**
 * 保留旧调用签名。DataManager 已使用统一订单口径，因此按时间范围清理等同于清理看板缓存。
 */
export function clearCacheByTimeRange(_orderTimeRange: number): void {
  void _orderTimeRange
  clearCache()
}

/**
 * GET /api/binance/dashboard
 * 获取看板所需的所有数据。
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimit(request)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!
    }

    const cacheKey = 'dashboard'
    const now = Date.now()
    const cached = dashboardCache.get(cacheKey)

    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      })
    }

    const data = await getDataManager().getDashboardSnapshot()
    dashboardCache.set(cacheKey, {
      data,
      timestamp: now,
    })

    return NextResponse.json({
      success: true,
      data,
      cached: false,
    })
  } catch (error: unknown) {
    const errorCode = isBinanceErrorResponse(error) ? error.code : -1
    const errorMessage = getBinanceErrorMessage(error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage || 'Failed to fetch dashboard data',
        },
      },
      { status: errorCode === -1021 ? 401 : 500 }
    )
  }
}
