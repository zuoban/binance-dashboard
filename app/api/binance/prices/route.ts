/**
 * 币安资产价格 API Route
 *
 * 获取各资产对 USD 的实时价格
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { getErrorMessage } from '@/lib/utils/error-handler'
import { binanceConfig } from '@/lib/config'

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
    const assetList = Array.from(
      new Set(
        symbols
          .split(',')
          .map(asset => asset.trim().toUpperCase())
          .filter(Boolean)
      )
    )

    if (
      assetList.length === 0 ||
      assetList.length > 20 ||
      assetList.some(asset => !/^[A-Z0-9]{1,20}$/.test(asset))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: -1,
            message: 'Invalid symbols parameter',
          },
        },
        { status: 400 }
      )
    }

    // 构建价格映射
    const prices: Record<string, number> = {}

    // USDT 和 USDC 对 USD 的价格固定为 1
    assetList.forEach(asset => {
      if (asset === 'USDT' || asset === 'USDC') {
        prices[asset] = 1
      }
    })

    // 构建交易对列表（转换为对 USD 或 USDT）
    const tickers = assetList
      .map(asset => {
        if (asset === 'USDT' || asset === 'USDC') {
          return null // USDT 和 USDC 对 USD 的价格是 1
        }
        return `${asset}USDT`
      })
      .filter((ticker): ticker is string => ticker !== null)

    if (tickers.length === 0) {
      return NextResponse.json({ success: true, data: prices })
    }

    // Binance 的批量行情接口只接受一个 JSON 数组参数，而非重复的 symbols 参数。
    const query = new URLSearchParams({ symbols: JSON.stringify(tickers) })
    const response = await fetch(`${binanceConfig.restApi}/fapi/v1/ticker/24hr?${query}`, {
      next: { revalidate: 5 },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch prices from Binance')
    }

    const tickerData = await response.json()

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
