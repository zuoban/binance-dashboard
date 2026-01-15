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
    console.log('[Listen Key API] 📨 Received POST request')

    const body = await request.json()
    const { listenKey, action } = body

    console.log('[Listen Key API] Request body:', { action, hasListenKey: !!listenKey })

    // 获取服务端配置
    const config = getServerConfig()

    console.log('[Listen Key API] Config:', {
      hasApiKey: !!config.binance.apiKey,
      hasApiSecret: !!config.binance.apiSecret,
      isDevelopment: config.app.isDevelopment,
    })

    // 验证 API 配置
    if (!config.binance.apiKey || !config.binance.apiSecret) {
      console.error('[Listen Key API] ❌ API credentials not configured')
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
    console.log('[Listen Key API] Creating REST client...')
    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: config.binance.apiSecret,
      baseUrl: config.binance.restApi,
      enableLog: config.app.isDevelopment,
    })

    let result

    if (action === 'refresh' || listenKey) {
      // 刷新 Listen Key
      console.log('[Listen Key API] 🔁 Refreshing Listen Key...')
      result = await client.keepAliveListenKey(listenKey)
      console.log('[Listen Key API] ✅ Listen Key refreshed')
    } else if (action === 'close' || listenKey) {
      // 关闭 Listen Key
      console.log('[Listen Key API] 🔒 Closing Listen Key...')
      result = await client.closeListenKey(listenKey)
      console.log('[Listen Key API] ✅ Listen Key closed')
    } else {
      // 获取新的 Listen Key
      console.log('[Listen Key API] 🔑 Creating new Listen Key...')
      result = await client.getListenKey()
      console.log(
        '[Listen Key API] ✅ Listen Key created:',
        result?.listenKey?.substring(0, 20) + '...'
      )
    }

    // 返回结果
    console.log('[Listen Key API] ✅ Sending successful response')
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    console.error('[Listen Key API] ❌ Error:', error)

    const errorCode = isBinanceErrorResponse(error) ? error.code : -1
    const errorMessage = getBinanceErrorMessage(error)

    console.error('[Listen Key API] Error details:', {
      code: errorCode,
      message: errorMessage,
    })

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
      enableLog: config.app.isDevelopment,
    })

    // 关闭 Listen Key
    await client.closeListenKey(listenKey)

    // 返回结果
    return NextResponse.json({
      success: true,
      data: { message: 'Listen key closed successfully' },
    })
  } catch (error: unknown) {
    console.error('[Listen Key API] Error:', error)

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
