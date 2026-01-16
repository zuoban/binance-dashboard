/**
 * 币安账户信息 API Route
 *
 * 代理前端请求到币安 API，隐藏 API Secret
 */

import { NextRequest, NextResponse } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { isBinanceErrorResponse, getBinanceErrorMessage } from '@/lib/utils/error-handler'

/**
 * GET /api/binance/account
 * 获取账户资产信息
 */
export async function GET(request: NextRequest) {
  try {
    // 检查速率限制
    const rateLimitResult = await checkRateLimit(request)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!
    }

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
    const accountInfo = await client.getAccountInfo()

    // 返回结果
    return NextResponse.json({
      success: true,
      data: accountInfo,
    })
  } catch (error: unknown) {
    const errorCode = isBinanceErrorResponse(error) ? error.code : -1
    const errorMessage = getBinanceErrorMessage(error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
      },
      { status: errorCode === -1021 ? 401 : 500 }
    )
  }
}
