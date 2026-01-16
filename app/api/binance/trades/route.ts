/**
 * 币安用户成交记录 API Route
 *
 * 代理前端请求到币安 API，隐藏 API Secret
 */

import { NextRequest, NextResponse } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import {
  validateQueryParams,
  validationErrorResponse,
  userTradesQuerySchema,
} from '@/lib/validations/api'
import { isBinanceErrorResponse, getBinanceErrorMessage } from '@/lib/utils/error-handler'

/**
 * GET /api/binance/trades?symbol=BTCUSDT&limit=50
 * 获取用户成交记录
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimit(request)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!
    }

    const validation = validateQueryParams(request.nextUrl.searchParams, userTradesQuerySchema)

    if (!validation.success) {
      const errorResponse = validationErrorResponse(validation)
      if (errorResponse) return errorResponse
    }

    const params = validation.data!

    const config = getServerConfig()

    if (!config.binance.apiKey || !config.binance.apiSecret) {
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

    if (!params.symbol) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: config.binance.apiSecret,
      baseUrl: config.binance.restApi,
    })

    const trades = await client.getUserTrades(params.symbol, {
      limit: params.limit,
      startTime: params.startTime,
      endTime: params.endTime,
    })

    return NextResponse.json({
      success: true,
      data: trades,
    })
  } catch (error: unknown) {
    const errorCode = isBinanceErrorResponse(error) ? error.code : -1
    const errorMessage = getBinanceErrorMessage(error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage || 'Failed to fetch trades',
        },
      },
      { status: errorCode === -1021 ? 401 : 500 }
    )
  }
}
