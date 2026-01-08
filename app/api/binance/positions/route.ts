/**
 * 币安持仓信息 API Route
 *
 * 代理前端请求到币安 API，隐藏 API Secret
 */

import { NextRequest, NextResponse } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'

/**
 * GET /api/binance/positions?symbol=BTCUSDT
 * 获取持仓信息
 */
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || undefined

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

    // 调用币安 API
    const positions = await client.getPositions(symbol)

    // 过滤掉持仓为 0 的数据
    const filteredPositions = positions.filter((p: any) => parseFloat(p.positionAmt) !== 0)

    // 返回结果
    return NextResponse.json({
      success: true,
      data: filteredPositions,
    })
  } catch (error: any) {
    console.error('[Positions API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || -1,
          message: error.message || 'Failed to fetch positions',
        },
      },
      { status: error.code === -1021 ? 401 : 500 }
    )
  }
}
