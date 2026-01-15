/**
 * Dashboard SSE API Route
 *
 * 提供实时看板数据的 SSE 连接
 * 每 5 秒推送一次最新数据
 */

import { NextRequest } from 'next/server'
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'
import { mapBinancePosition } from '@/lib/utils/binance-mapper'
import { mapBinanceAccount } from '@/lib/utils/account-mapper'

/** 数据刷新间隔（5 秒） */
const DATA_REFRESH_INTERVAL = 5000

/** 缓存时间（5 秒，与刷新间隔一致） */
const CACHE_TTL = 5000

/** 内存缓存 */
const dashboardCache = new Map<string, { data: any; timestamp: number }>()

/** 每日快照存储（用于计算已实现盈亏） */
let dailySnapshot: { date: string; balance: number; unrealizedProfit: number } | null = null

/**
 * 简化的订单类型（只保留页面需要的字段）
 */
interface SimpleOrder {
  orderId: number
  symbol: string
  price: string
  origQty: string
  executedQty: string
  side: 'BUY' | 'SELL'
  status: string
  time: number
  updateTime: number
}

/**
 * 将 getUserTrades API 返回的数据映射为简化订单类型
 */
function mapTradeToOrder(trade: any): SimpleOrder {
  return {
    orderId: trade.orderId,
    symbol: trade.symbol,
    price: trade.price,
    origQty: trade.qty,
    executedQty: trade.qty,
    side: trade.side,
    status: 'FILLED',
    time: trade.time,
    updateTime: trade.time,
  }
}

/**
 * 将 getOpenOrders API 返回的数据映射为简化订单类型
 */
function mapOpenOrderToOrder(order: any): SimpleOrder {
  return {
    orderId: order.orderId,
    symbol: order.symbol,
    price: order.price,
    origQty: order.origQty,
    executedQty: order.executedQty,
    side: order.side,
    status: order.status,
    time: order.time,
    updateTime: order.updateTime,
  }
}

/**
 * 获取看板数据
 */
async function fetchDashboardData(): Promise<any> {
  const cacheKey = 'dashboard'
  const currentTime = Date.now()

  // 检查缓存
  const cached = dashboardCache.get(cacheKey)
  if (cached && currentTime - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // 清理过期缓存
  for (const [key, value] of dashboardCache.entries()) {
    if (currentTime - value.timestamp >= CACHE_TTL) {
      dashboardCache.delete(key)
    }
  }

  // 获取服务端配置
  const config = getServerConfig()

  // 创建 REST 客户端
  const client = new BinanceRestClient({
    apiKey: config.binance.apiKey,
    apiSecret: config.binance.apiSecret,
    baseUrl: config.binance.restApi,
    enableLog: config.app.isDevelopment,
  })

  // 并发获取所有数据
  const [accountInfo, positionsInfo, openOrdersInfo] = await Promise.all([
    client.getAccountInfo(),
    client.getPositions(),
    client.getOpenOrders(),
  ])

  // 映射账户数据
  const account = mapBinanceAccount(accountInfo)

  // 获取非稳定币并计算价格
  const nonStableCoins = accountInfo.assets?.filter((a: any) =>
    !['USDT', 'USDC', 'FDUSD', 'BUSD'].includes(a.asset)
  ) || []

  if (nonStableCoins.length > 0) {
    try {
      const symbols = nonStableCoins.map((a: any) => `${a.asset}USDT`)
      const pricePromises = symbols.map(async (symbol: string) => {
        try {
          const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`)
          if (!res.ok) return null
          return await res.json()
        } catch {
          return null
        }
      })
      const priceResults = await Promise.all(pricePromises)

      const pricesMap: Record<string, number> = {}
      priceResults.forEach((result) => {
        if (result?.symbol && result.price) {
          pricesMap[result.symbol.replace('USDT', '')] = parseFloat(result.price)
        }
      })

      // 重新计算总余额
      const totalUsdBalance = accountInfo.assets?.reduce((total: number, asset: any) => {
        const balance = parseFloat(asset.walletBalance || '0')
        if (['USDT', 'USDC', 'FDUSD', 'BUSD'].includes(asset.asset)) {
          return total + balance
        }
        return total + (balance * (pricesMap[asset.asset] || 0))
      }, 0) || 0

      account.totalWalletBalance = totalUsdBalance.toString()
      account.availableBalance = totalUsdBalance.toString()
    } catch (error) {
      console.error('[Dashboard WS] Failed to fetch prices:', error)
    }
  } else {
    // 只有稳定币
    const totalUsdBalance = accountInfo.assets?.reduce((total: number, asset: any) => {
      const balance = parseFloat(asset.walletBalance || '0')
      if (['USDT', 'USDC', 'FDUSD', 'BUSD'].includes(asset.asset)) {
        return total + balance
      }
      return total
    }, 0) || 0
    account.totalWalletBalance = totalUsdBalance.toString()
    account.availableBalance = totalUsdBalance.toString()
  }

  // 计算总未实现盈亏
  const totalUnrealizedProfit = positionsInfo.reduce(
    (total: number, pos: any) => total + parseFloat(pos.unRealizedProfit || '0'),
    0
  )
  account.unrealizedProfit = totalUnrealizedProfit.toString()

  // 计算今日已实现盈亏
  const now = new Date()
  const todayDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const todayDateString = new Date(todayDate).toISOString().split('T')[0]

  const currentBalance = parseFloat(account.totalWalletBalance || '0')
  const currentEquity = currentBalance - totalUnrealizedProfit
  let todayRealizedPnl = 0

  if (!dailySnapshot || dailySnapshot.date !== todayDateString) {
    dailySnapshot = {
      date: todayDateString,
      balance: currentBalance,
      unrealizedProfit: totalUnrealizedProfit,
    }
  } else {
    const snapshotEquity = dailySnapshot.balance - dailySnapshot.unrealizedProfit
    todayRealizedPnl = currentEquity - snapshotEquity
  }

  // 映射并过滤持仓数据
  const positions = positionsInfo
    .map((p: any) => mapBinancePosition(p))
    .filter((p: any) => parseFloat(p.positionAmount) !== 0)

  // 获取持仓中所有唯一的 symbol
  const symbols = Array.from(new Set(positions.map((p: any) => p.symbol)))

  // 获取历史订单（只查询有持仓的交易对，最近 5 条）
  const allTrades: any[] = []

  // 串行查询，一旦获取到足够的订单就停止
  for (const symbol of symbols) {
    let currentEndTime = Date.now()
    let hasMore = true

    while (hasMore) {
      // 不限制时间范围，获取最近的订单
      const currentStartTime = currentEndTime - (24 * 60 * 60 * 1000) // 24小时窗口

      try {
        const trades = await client.getUserTrades(symbol, {
          startTime: currentStartTime,
          endTime: currentEndTime,
          limit: 1000,
        })

        if (trades.length > 0) {
          allTrades.push(...trades.map((t: any) => ({ ...t, symbol })))
        }

        // 如果已经收集到足够的订单，提前退出
        if (allTrades.length >= 100) {
          // 设置一个合理的上限，避免查询过多
          break
        }

        if (trades.length < 1000) {
          hasMore = false
        } else {
          currentEndTime = currentStartTime - 1
        }
      } catch {
        hasMore = false
      }
    }

    // 如果已经有足够的数据（超过每个交易对平均 20 条），就不再查询其他交易对
    if (allTrades.length >= symbols.length * 20) {
      break
    }
  }

  // 去重并排序
  const uniqueTradesMap = new Map<string, any>()
  for (const trade of allTrades) {
    const key = `${trade.id}_${trade.symbol}`
    if (!uniqueTradesMap.has(key)) {
      uniqueTradesMap.set(key, trade)
    }
  }
  const uniqueTrades = Array.from(uniqueTradesMap.values()).sort((a, b) => b.time - a.time)

  // 只返回最近 5 条订单
  const orders = uniqueTrades.slice(0, 5).map(mapTradeToOrder)

  // 统计当前委托订单
  const openOrdersStats = {
    total: openOrdersInfo.length,
    buy: openOrdersInfo.filter((t: any) => t.side === 'BUY').length,
    sell: openOrdersInfo.filter((t: any) => t.side === 'SELL').length,
  }

  const openOrders = openOrdersInfo.map(mapOpenOrderToOrder)

  const responseData = {
    account,
    positions,
    orders,
    openOrdersStats,
    openOrders,
    todayRealizedPnl,
    timestamp: Date.now(),
  }

  // 存入缓存
  dashboardCache.set(cacheKey, {
    data: responseData,
    timestamp: Date.now(),
  })

  return responseData
}

/**
 * GET /api/dashboard/ws
 * SSE (Server-Sent Events) 流
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any, event = 'data') => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      try {
        // 发送初始数据
        const initialData = await fetchDashboardData()
        sendEvent({
          type: 'data',
          data: initialData,
          timestamp: Date.now(),
        })

        // 设置定时推送
        const intervalId = setInterval(async () => {
          try {
            const data = await fetchDashboardData()
            sendEvent({
              type: 'data',
              data,
              timestamp: Date.now(),
            })
          } catch (error) {
            sendEvent({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: Date.now(),
            }, 'error')
          }
        }, DATA_REFRESH_INTERVAL)

        // 清理函数
        request.signal.addEventListener('abort', () => {
          clearInterval(intervalId)
          controller.close()
          console.log('[Dashboard WS] Client disconnected')
        })
      } catch (error) {
        sendEvent({
          type: 'error',
          error: error instanceof Error ? error.message : 'Failed to fetch initial data',
          timestamp: Date.now(),
        }, 'error')
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
