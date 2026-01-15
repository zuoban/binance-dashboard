/**
 * 币安资产价格 API Route
 *
 * 获取各资产对 USD 的实时价格
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { getErrorMessage } from '@/lib/utils/error-handler'

interface BinanceTicker {
  symbol: string
  lastPrice: string
}

/**
 * GET /api/binance/prices
 * 获取资产价格信息
 */
export async function GET(request: NextRequest) {
  try {
    // 检查速率限制
    const rateLimitResult = await checkRateLimit(request)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const symbols = searchParams.get('symbols')

    if (!symbols) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: -1,
            message: 'Missing symbols parameter',
          },
        },
        { status: 400 }
      )
    }

    // 解析资产列表
    const assetList = symbols.split(',')

    // 构建交易对列表（转换为对 USD 或 USDT）
    const tickers = assetList
      .map(asset => {
        if (asset === 'USDT' || asset === 'USDC') {
          return null // USDT 和 USDC 对 USD 的价格是 1
        }
        return `${asset}USDT`
      })
      .filter(Boolean)

    // 调用币安 API 获取 24 小时价格变动
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/ticker/24hr?${tickers.map(t => `symbols=${encodeURIComponent(JSON.stringify([t]))}`).join('&')}`,
      {
        next: { revalidate: 5 }, // 缓存 5 秒
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch prices from Binance')
    }

    const tickerData = await response.json()

    // 构建价格映射
    const prices: Record<string, number> = {}

    // USDT 和 USDC 的价格是 1
    assetList.forEach(asset => {
      if (asset === 'USDT' || asset === 'USDC') {
        prices[asset] = 1
      }
    })

    // 解析 ticker 数据
    if (Array.isArray(tickerData)) {
      tickerData.forEach((ticker: BinanceTicker) => {
        const symbol = ticker.symbol
        const asset = symbol.replace('USDT', '')
        prices[asset] = parseFloat(ticker.lastPrice)
      })
    }

    return NextResponse.json({
      success: true,
      data: prices,
    })
  } catch (error: unknown) {
    console.error('[Prices API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: -1,
          message: getErrorMessage(error) || 'Failed to fetch prices',
        },
      },
      { status: 500 }
    )
  }
}
