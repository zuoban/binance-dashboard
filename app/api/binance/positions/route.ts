/**
 * 币安持仓信息 API Route
 *
 * 代理前端请求到币安 API，隐藏 API Secret
 */

import { NextRequest, NextResponse } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'
import { isBinanceErrorResponse, getBinanceErrorMessage } from '@/lib/utils/error-handler'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import {
  positionsQuerySchema,
  validateQueryParams,
  validationErrorResponse,
} from '@/lib/validations/api'
import type { BinancePosition } from '@/types/binance-api'

/**
 * GET /api/binance/positions?symbol=BTCUSDT
 * 获取持仓信息
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimit(request)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!
    }

    const validation = validateQueryParams(request.nextUrl.searchParams, positionsQuerySchema)
    if (!validation.success) {
      const errorResponse = validationErrorResponse(validation)
      if (errorResponse) return errorResponse
    }

    const { symbol } = validation.data!

    // 获取服务端配置
    const config = getServerConfig()

    // 验证 API 配置
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

    // 创建 REST 客户端
    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: config.binance.apiSecret,
      baseUrl: config.binance.restApi,
    })

    // 调用币安 API
    const positions = await client.getPositions(symbol)

    // 过滤掉持仓为 0 的数据
    const filteredPositions = positions.filter(
      (p: BinancePosition) => parseFloat(p.positionAmount) !== 0
    )

    // 返回结果
    return NextResponse.json({
      success: true,
      data: filteredPositions,
    })
  } catch (error: unknown) {
    const errorCode = isBinanceErrorResponse(error) ? error.code : -1
    const errorMessage = getBinanceErrorMessage(error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage || 'Failed to fetch positions',
        },
      },
      { status: errorCode === -1021 ? 401 : 500 }
    )
  }
}
