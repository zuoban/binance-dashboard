/**
 * 币安交易对信息 API Route
 *
 * 获取交易对信息、24小时行情等公开数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'
import { isBinanceErrorResponse, getBinanceErrorMessage } from '@/lib/utils/error-handler'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import {
  exchangeQuerySchema,
  validateQueryParams,
  validationErrorResponse,
} from '@/lib/validations/api'

/**
 * GET /api/binance/exchange/info
 * 获取交易对信息
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimit(request)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!
    }

    const validation = validateQueryParams(request.nextUrl.searchParams, exchangeQuerySchema)
    if (!validation.success) {
      const errorResponse = validationErrorResponse(validation)
      if (errorResponse) return errorResponse
    }

    const { type, symbol, interval, limit } = validation.data!

    // 获取服务端配置
    const config = getServerConfig()

    // 创建 REST 客户端（不需要签名）
    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: '', // 公开接口不需要 Secret
      baseUrl: config.binance.restApi,
    })

    let data

    switch (type) {
      case 'info':
        // 获取交易对信息
        data = await client.getExchangeInfo()
        break

      case 'ticker':
        // 获取 24 小时价格变动
        data = await client.get24hrTicker(symbol || undefined)
        break

      case 'klines':
        // 获取 K 线数据
        if (!symbol) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: -1,
                message: 'Missing required parameter: symbol',
              },
            },
            { status: 400 }
          )
        }
        data = await client.getKlines(symbol, interval, {
          limit,
        })
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: -1,
              message: 'Invalid type parameter',
            },
          },
          { status: 400 }
        )
    }

    // 返回结果
    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: unknown) {
    const errorCode = isBinanceErrorResponse(error) ? error.code : -1
    const errorMessage = getBinanceErrorMessage(error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage || 'Failed to fetch exchange data',
        },
      },
      { status: 500 }
    )
  }
}
