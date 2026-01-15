/**
 * 币安交易规则 API Route
 *
 * 获取交易对的精度、交易规则等信息
 */

import { NextResponse } from 'next/server'
import { getServerConfig } from '@/lib/config'
import { isBinanceErrorResponse, getBinanceErrorMessage } from '@/lib/utils/error-handler'

/**
 * 交易规则缓存
 */
let exchangeInfoCache: Record<string, unknown> | null = null
let cacheTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

/**
 * GET /api/binance/exchange-info
 * 获取交易规则和精度信息
 */
export async function GET() {
  try {
    // 检查缓存
    const now = Date.now()
    if (exchangeInfoCache && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: exchangeInfoCache,
      })
    }

    // 获取服务端配置
    const config = getServerConfig()

    // 验证 API 配置
    if (!config.binance.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: -1,
            message: 'Binance API credentials not configured',
          },
        },
        { status: 500 }
      )
    }

    // 调用币安 API 获取交易规则
    const response = await fetch(`${config.binance.restApi}/fapi/v1/exchangeInfo`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': config.binance.apiKey,
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.msg || 'Failed to fetch exchange info')
    }

    // 缓存结果
    exchangeInfoCache = result
    cacheTime = now

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    console.error('[Exchange Info API] Error:', error)

    const errorCode = isBinanceErrorResponse(error) ? error.code : -1
    const errorMessage = getBinanceErrorMessage(error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage || 'Failed to fetch exchange info',
        },
      },
      { status: 500 }
    )
  }
}
