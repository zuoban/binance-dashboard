/**
 * 币安交易对信息 API Route
 *
 * 获取交易对信息、24小时行情等公开数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'

/**
 * GET /api/binance/exchange/info
 * 获取交易对信息
 */
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'info'
    const symbol = searchParams.get('symbol')

    // 获取服务端配置
    const config = getServerConfig()

    // 创建 REST 客户端（不需要签名）
    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: '', // 公开接口不需要 Secret
      baseUrl: config.binance.restApi,
      enableLog: config.app.isDevelopment,
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
        const interval = searchParams.get('interval') || '1h'
        const limit = searchParams.get('limit')
        data = await client.getKlines(symbol, interval, {
          limit: limit ? parseInt(limit) : undefined,
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
  } catch (error: any) {
    console.error('[Exchange API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || -1,
          message: error.message || 'Failed to fetch exchange data',
        },
      },
      { status: 500 }
    )
  }
}
