/**
 * Listen Key 管理 API Route
 *
 * 用于获取、刷新和关闭币安用户数据流的 Listen Key
 */

import { NextRequest, NextResponse } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'
import { isBinanceErrorResponse, getBinanceErrorMessage } from '@/lib/utils/error-handler'
import { strictRateLimit, checkRateLimit } from '@/lib/middleware/rate-limit'
import { listenKeyRequestSchema } from '@/lib/validations/api'

type ListenKeyAction = 'start' | 'refresh' | 'close'

async function manageListenKey(request: NextRequest, forcedAction?: ListenKeyAction) {
  const rateLimitResult = await checkRateLimit(request, strictRateLimit)
  if (!rateLimitResult.allowed) {
    return rateLimitResult.error!
  }

  let payload: unknown = {}
  try {
    const body = await request.text()
    payload = body ? JSON.parse(body) : {}
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: -1,
          message: 'Invalid JSON request body',
        },
      },
      { status: 400 }
    )
  }
  const validation = listenKeyRequestSchema.safeParse(payload)

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: -1,
          message: validation.error.issues[0]?.message || 'Invalid request body',
        },
      },
      { status: 400 }
    )
  }

  const action = forcedAction || validation.data.action || 'start'
  const { listenKey } = validation.data

  if (action !== 'start' && !listenKey) {
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

  try {
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

    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: config.binance.apiSecret,
      baseUrl: config.binance.restApi,
    })

    switch (action) {
      case 'refresh':
        await client.keepAliveListenKey(listenKey!)
        return NextResponse.json({ success: true, data: { message: 'Listen key refreshed' } })
      case 'close':
        await client.closeListenKey(listenKey!)
        return NextResponse.json({ success: true, data: { message: 'Listen key closed' } })
      default:
        return NextResponse.json({
          success: true,
          data: await client.getListenKey(),
        })
    }
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
 * POST /api/binance/listen-key
 * 获取或刷新 Listen Key
 */
export async function POST(request: NextRequest) {
  return manageListenKey(request)
}

/**
 * PUT /api/binance/listen-key
 * 刷新 Listen Key
 */
export async function PUT(request: NextRequest) {
  return manageListenKey(request, 'refresh')
}

/**
 * DELETE /api/binance/listen-key
 * 关闭 Listen Key
 */
export async function DELETE(request: NextRequest) {
  return manageListenKey(request, 'close')
}
