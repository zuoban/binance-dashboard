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
 * 将 getOpenOrders API 返回的数据映射为 Order 类型
 */
function mapOpenOrderToOrder(order: any): Order {
  return {
    orderId: order.orderId,
    symbol: order.symbol,
    clientOrderId: order.clientOrderId,
    price: order.price,
    origQty: order.origQty,
    executedQty: order.executedQty,
    cumQuote: order.cumQuote,
    status: order.status,
    timeInForce: order.timeInForce,
    type: order.type,
    side: order.side,
    stopPrice: order.stopPrice || '0',
    icebergQty: order.icebergQty || '0',
    time: order.time,
    updateTime: order.updateTime,
    reduceOnly: order.reduceOnly || false,
    closePosition: order.closePosition || false,
    positionSide: order.positionSide || 'BOTH',
    workingType: order.workingType || 'CONTRACT_PRICE',
    origType: order.origType || order.type,
    priceMatch: order.priceMatch || 'NONE',
    selfTradePreventionMode: order.selfTradePreventionMode || 'EXPIRE_NONE',
    priceProtect: order.priceProtect || false,
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
 * 每日快照存储（用于计算已实现盈亏）
 * 存储格式: { date: 'YYYY-MM-DD', balance: number, unrealizedProfit: number }
 */
let dailySnapshot: { date: string; balance: number; unrealizedProfit: number } | null = null

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
    const currentTime = Date.now()
    if (cached && currentTime - cached.timestamp < CACHE_TTL) {
      console.log('[Dashboard API] Returning cached data')
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      })
    }

    // 清理过期缓存
    for (const [key, value] of dashboardCache.entries()) {
      if (currentTime - value.timestamp >= CACHE_TTL) {
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
    const [accountInfo, positionsInfo, openOrdersInfo] = await Promise.all([
      // 获取账户信息
      client.getAccountInfo(),
      // 获取持仓信息
      client.getPositions(),
      // 获取当前委托订单
      client.getOpenOrders(),
    ])

    // 计算今日已实现盈亏（使用余额变化法）
    const now = new Date()
    const todayDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const todayDateString = new Date(todayDate).toISOString().split('T')[0]

    let todayRealizedPnl = 0

    // 先计算当前的余额和未实现盈亏（需要等 account 映射完成后）
    // 我们会在后面处理这个逻辑

    // 映射账户数据
    const account = mapBinanceAccount(accountInfo)

    // 计算总余额的 USD 价值（从所有资产汇总）
    const calculateTotalUsdBalance = (assets: any[]) => {
      return assets.reduce((total, asset) => {
        const balance = parseFloat(asset.walletBalance || '0')
        // 对于稳定币，直接使用余额
        if (asset.asset === 'USDT' || asset.asset === 'USDC' || asset.asset === 'FDUSD' || asset.asset === 'BUSD') {
          return total + balance
        }
        // 对于其他资产，需要获取价格（这里先返回 0，价格会在后面获取）
        return total
      }, 0)
    }

    // 获取非稳定币的价格
    const nonStableCoins = accountInfo.assets?.filter((a: any) =>
      !['USDT', 'USDC', 'FDUSD', 'BUSD'].includes(a.asset)
    ) || []

    let pricesMap: Record<string, number> = {}

    if (nonStableCoins.length > 0) {
      try {
        // 获取价格 - 使用 24hr ticker API
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

        priceResults.forEach((result) => {
          if (result && result.symbol && result.price) {
            const asset = result.symbol.replace('USDT', '')
            pricesMap[asset] = parseFloat(result.price)
          }
        })

        // 重新计算总余额
        const totalUsdBalance = accountInfo.assets?.reduce((total: number, asset: any) => {
          const balance = parseFloat(asset.walletBalance || '0')
          if (asset.asset === 'USDT' || asset.asset === 'USDC' || asset.asset === 'FDUSD' || asset.asset === 'BUSD') {
            return total + balance
          }
          return total + (balance * (pricesMap[asset.asset] || 0))
        }, 0) || 0

        // 更新 account 对象中的余额字段
        account.totalWalletBalance = totalUsdBalance.toString()
        account.availableBalance = totalUsdBalance.toString()

        console.log('[Dashboard API] Calculated total USD balance:', totalUsdBalance)
      } catch (error) {
        console.error('[Dashboard API] Failed to fetch prices:', error)
      }
    } else {
      // 只有稳定币，直接计算
      const totalUsdBalance = calculateTotalUsdBalance(accountInfo.assets || [])
      account.totalWalletBalance = totalUsdBalance.toString()
      account.availableBalance = totalUsdBalance.toString()
    }

    // 计算实际未实现盈亏（从持仓数据汇总）
    const totalUnrealizedProfit = positionsInfo.reduce((total: number, pos: any) => {
      // 币安 API 返回的字段名是 unRealizedProfit（注意大写 R）
      const unrealizedProfit = parseFloat(pos.unRealizedProfit || '0')
      return total + unrealizedProfit
    }, 0)

    // 更新未实现盈亏字段
    account.unrealizedProfit = totalUnrealizedProfit.toString()

    console.log('[Dashboard API] Total unrealized profit from positions:', totalUnrealizedProfit)

    // 计算今日已实现盈亏（余额变化法）
    // 公式: 今日已实现盈亏 = (当前余额 - 当前未实现盈亏) - (今日0点余额 - 今日0点未实现盈亏)
    const currentBalance = parseFloat(account.totalWalletBalance || '0')
    const currentUnrealizedProfit = totalUnrealizedProfit
    const currentEquity = currentBalance - currentUnrealizedProfit

    if (!dailySnapshot || dailySnapshot.date !== todayDateString) {
      // 新的一天：创建今日0点快照
      dailySnapshot = {
        date: todayDateString,
        balance: currentBalance,
        unrealizedProfit: currentUnrealizedProfit,
      }
      console.log('[Dashboard API] Created new daily snapshot:', dailySnapshot)
      todayRealizedPnl = 0 // 新的一天刚开始，还没有已实现盈亏
    } else {
      // 已经有今日快照：计算从0点到现在已实现盈亏
      const snapshotEquity = dailySnapshot.balance - dailySnapshot.unrealizedProfit
      todayRealizedPnl = currentEquity - snapshotEquity
      console.log('[Dashboard API] Today realized PNL (from snapshot):', {
        snapshot: dailySnapshot,
        currentEquity,
        snapshotEquity,
        todayRealizedPnl,
      })
    }

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

    // 只查询当前持仓的交易对，减少不必要的API调用
    // 如果没有持仓，则不查询任何交易对
    const symbolsToCheck = symbols.length > 0 ? symbols : []

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

            // 如果返回的记录少于限制值，说明没有更多数据了，停止查询
            if (trades.length < 1000) {
              hasMore = false
            } else {
              // 移动窗口
              currentEndTime = currentStartTime - 1
            }

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

    // 统计当前委托订单
    const openOrdersStats = {
      total: openOrdersInfo.length,
      buy: openOrdersInfo.filter((t: any) => t.side === 'BUY').length,
      sell: openOrdersInfo.filter((t: any) => t.side === 'SELL').length,
    }

    // 映射当前委托订单为 Order 类型
    const openOrders = openOrdersInfo.map(mapOpenOrderToOrder)

    // 返回结果
    const responseData = {
      account,
      positions,
      orders, // 使用映射后的 orders
      orderStats,
      openOrdersStats,
      openOrders, // 完整的当前委托订单数据
      todayRealizedPnl, // 今日已实现盈亏
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
