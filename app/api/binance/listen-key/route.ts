/**
 * Listen Key 管理 API Route
 *
 * 用于获取、刷新和关闭币安用户数据流的 Listen Key
 */

import { NextRequest, NextResponse } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'
import { isBinanceErrorResponse, getBinanceErrorMessage } from '@/lib/utils/error-handler'

/**
 * POST /api/binance/listen-key
 * 获取或刷新 Listen Key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { listenKey, action } = body

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

    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: config.binance.apiSecret,
      baseUrl: config.binance.restApi,
    })

    let result

    if (action === 'refresh' || listenKey) {
      result = await client.keepAliveListenKey(listenKey)
    } else if (action === 'close' || listenKey) {
      result = await client.closeListenKey(listenKey)
    } else {
      result = await client.getListenKey()
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    const errorCode = isBinanceErrorResponse(error) ? error.code : -1
    const errorMessage = getBinanceErrorMessage(error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage || 'Failed to manage listen key',
        },
      },
      { status: errorCode === -1021 ? 401 : 500 }
    )
  }
}

/**
 * PUT /api/binance/listen-key
 * 刷新 Listen Key
 */
export async function PUT(request: NextRequest) {
  return POST(request)
}

/**
 * DELETE /api/binance/listen-key
 * 关闭 Listen Key
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { listenKey } = body

    if (!listenKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: -1,
            message: 'Missing listen key',
          },
        },
        { status: 400 }
      )
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

    // 关闭 Listen Key
    await client.closeListenKey(listenKey)

    // 返回结果
    return NextResponse.json({
      success: true,
      data: { message: 'Listen key closed successfully' },
    })
  } catch (error: unknown) {
    const errorCode = isBinanceErrorResponse(error) ? error.code : -1
    const errorMessage = getBinanceErrorMessage(error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage || 'Failed to close listen key',
        },
      },
      { status: errorCode === -1021 ? 401 : 500 }
    )
  }
}
