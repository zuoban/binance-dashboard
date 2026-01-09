/**
 * 币安看板统一数据 API Route
 *
 * 一次性返回账户、持仓、订单的所有数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { mapBinancePosition } from '@/lib/utils/binance-mapper'
import { mapBinanceAccount } from '@/lib/utils/account-mapper'
import { Order } from '@/types/binance'

/**
 * 将 getUserTrades API 返回的数据映射为 Order 类型
 */
function mapTradeToOrder(trade: any): Order {
  return {
    id: trade.id,
    orderId: trade.orderId,
    symbol: trade.symbol,
    clientOrderId: trade.orderId.toString(), // 使用 orderId 作为 clientOrderId
    price: trade.price,
    origQty: trade.qty, // 使用成交数量作为原始数量
    executedQty: trade.qty,
    cumQuote: trade.quoteQty,
    status: 'FILLED', // 成交记录都是已完成的
    timeInForce: 'GTC',
    type: trade.orderId ? 'LIMIT' : 'MARKET', // 假设有 orderId 的是限价单
    side: trade.side, // 'BUY' or 'SELL'
    stopPrice: '0',
    icebergQty: '0',
    time: trade.time,
    updateTime: trade.time,
    reduceOnly: false,
    closePosition: false,
    positionSide: 'BOTH',
    workingType: 'CONTRACT_PRICE',
    origType: 'LIMIT',
    priceMatch: 'NONE',
    selfTradePreventionMode: 'EXPIRE_NONE',
    priceProtect: false,
  }
}

/**
 * 默认订单时间范围（1小时）
 */
const DEFAULT_ORDER_TIME_RANGE = 60 * 60 * 1000

/**
 * 缓存时间（10秒）
 */
const CACHE_TTL = 10000

/**
 * 内存缓存
 */
const dashboardCache = new Map<string, { data: any; timestamp: number }>()

/**
 * 清除所有缓存
 */
export function clearCache() {
  dashboardCache.clear()
}

/**
 * 清除指定时间范围的缓存
 */
export function clearCacheByTimeRange(orderTimeRange: number) {
  const cacheKey = `dashboard_${orderTimeRange}`
  dashboardCache.delete(cacheKey)
}

/**
 * GET /api/binance/dashboard
 * 获取看板所需的所有数据
 */
export async function GET(request: NextRequest) {
  try {
    // 检查速率限制
    const rateLimitResult = await checkRateLimit(request)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!
    }

    // 获取订单时间范围参数（毫秒）
    const searchParams = request.nextUrl.searchParams
    const orderTimeRange = searchParams.get('orderTimeRange')
      ? parseInt(searchParams.get('orderTimeRange')!, 10)
      : DEFAULT_ORDER_TIME_RANGE

    // 生成缓存key
    const cacheKey = `dashboard_${orderTimeRange}`

    // 检查缓存
    const cached = dashboardCache.get(cacheKey)
    const now = Date.now()
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log('[Dashboard API] Returning cached data')
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      })
    }

    // 清理过期缓存
    for (const [key, value] of dashboardCache.entries()) {
      if (now - value.timestamp >= CACHE_TTL) {
        dashboardCache.delete(key)
      }
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

    // 并发获取所有数据
    const [accountInfo, positionsInfo] = await Promise.all([
      // 获取账户信息
      client.getAccountInfo(),
      // 获取持仓信息
      client.getPositions(),
    ])

    // 映射账户数据
    const account = mapBinanceAccount(accountInfo)

    // 映射持仓数据，过滤掉空仓位
    const positions = positionsInfo
      .map((p: any) => mapBinancePosition(p))
      .filter((p: any) => parseFloat(p.positionAmount) !== 0)

    // 获取持仓中所有唯一的 symbol
    const symbols = Array.from(new Set(positions.map((p: any) => p.symbol)))

    // 计算订单查询的起始时间
    const orderStartTime = Date.now() - orderTimeRange
    const orderEndTime = Date.now()

    // 使用getUserTrades获取成交记录，而不是getAllOrders
    const allTrades: any[] = []

    // 定义要查询的交易对（持仓交易对 + 主流币种）
    const commonSymbols = [
      'BTCUSDT',
      'ETHUSDT',
      'BNBUSDT',
      'SOLUSDT',
      'XRPUSDT',
      'DOGEUSDT',
      'ADAUSDT',
      'AVAXUSDT',
      'DOTUSDT',
      'MATICUSDT',
    ]
    const symbolsToCheck = Array.from(new Set([...symbols, ...commonSymbols]))

    // 使用滑动窗口策略获取成交记录
    const windowSize = 6 * 60 * 60 * 1000 // 6小时窗口
    await Promise.all(
      symbolsToCheck.map(async (symbol: string) => {
        let currentEndTime = orderEndTime
        let hasMore = true

        while (hasMore) {
          const currentStartTime = Math.max(orderStartTime, currentEndTime - windowSize)

          try {
            const trades = await client.getUserTrades(symbol, {
              startTime: currentStartTime,
              endTime: currentEndTime,
              limit: 1000,
            })

            if (trades.length > 0) {
              allTrades.push(...trades.map((t: any) => ({ ...t, symbol })))
            }

            // 移动窗口
            currentEndTime = currentStartTime - 1

            if (currentEndTime <= orderStartTime) {
              hasMore = false
            }
          } catch (error) {
            // 忽略没有交易的错误
            hasMore = false
          }
        }
      })
    )

    // 去重：使用 id + symbol 作为唯一标识
    const uniqueTradesMap = new Map<string, any>()
    for (const trade of allTrades) {
      const key = `${trade.id}_${trade.symbol}`
      if (!uniqueTradesMap.has(key)) {
        uniqueTradesMap.set(key, trade)
      }
    }
    const uniqueTrades = Array.from(uniqueTradesMap.values())

    // 按时间排序（最新的在前）
    uniqueTrades.sort((a, b) => b.time - a.time)

    // 映射为 Order 类型
    const orders = uniqueTrades.map(mapTradeToOrder)

    // 统计订单
    const orderStats = {
      total: orders.length,
      buy: orders.filter((t: Order) => t.side === 'BUY').length,
      sell: orders.filter((t: Order) => t.side === 'SELL').length,
      filled: orders.length,
      totalVolume: orders.reduce((sum: number, t: Order) => {
        return sum + parseFloat(t.executedQty) * parseFloat(t.price)
      }, 0),
    }

    // 返回结果
    const responseData = {
      account,
      positions,
      orders, // 使用映射后的 orders
      orderStats,
      timestamp: Date.now(),
    }

    // 存入缓存
    dashboardCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    })

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    })
  } catch (error: any) {
    console.error('[Dashboard API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || -1,
          message: error.message || 'Failed to fetch dashboard data',
        },
      },
      { status: error.code === -1021 ? 401 : 500 }
    )
  }
}
