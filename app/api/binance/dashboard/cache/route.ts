/**
 * 清除 Dashboard 缓存 API Route
 *
 * 用于在用户修改配置时清除旧缓存
 */

import { NextRequest, NextResponse } from 'next/server'
import { clearCache, clearCacheByTimeRange } from '../route'
import { getErrorMessage } from '@/lib/utils/error-handler'

/**
 * DELETE /api/binance/dashboard/cache
 * 清除缓存
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderTimeRange = searchParams.get('orderTimeRange')

    if (orderTimeRange) {
      // 清除指定时间范围的缓存
      const range = parseInt(orderTimeRange, 10)
      clearCacheByTimeRange(range)
      console.log(`[Dashboard Cache] Cleared cache for orderTimeRange: ${range}`)
    } else {
      // 清除所有缓存
      clearCache()
      console.log('[Dashboard Cache] Cleared all cache')
    }

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
    })
  } catch (error: unknown) {
    console.error('[Dashboard Cache] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          message: getErrorMessage(error) || 'Failed to clear cache',
        },
      },
      { status: 500 }
    )
  }
}
