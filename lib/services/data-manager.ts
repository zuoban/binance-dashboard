/**
 * 数据管理器
 *
 * 全局单例，负责：
 * - 统一的数据刷新循环
 * - 币安 API 调用和数据聚合
 * - 订阅模式的数据广播
 * - 生命周期管理（基于引用计数）
 */

import { BinanceRestClient } from '../binance/rest-client'
import { getServerConfig } from '../config'
import { mapBinancePosition } from '../utils/binance-mapper'
import { mapBinanceAccount } from '../utils/account-mapper'
import { mapBinanceKlines } from '../utils/kline-mapper'
import type {
  DashboardData,
  DataCallback,
  DataManagerMetrics,
  DataManagerConfig,
  SimpleOrder,
  KlinesCacheItem,
} from './types'
import type { Position, KlineData } from '@/types/binance'
import type {
  BinancePosition,
  BinanceUserTrade,
  BinanceOrder,
  BinanceAsset,
} from '@/types/binance-api'

/**
 * 数据管理器类（单例模式）
 */
export class DataManager {
  /** 单例实例 */
  private static instance: DataManager | null = null

  /** 当前数据 */
  private data: DashboardData | null = null

  /** 刷新定时器 */
  private refreshIntervalId: NodeJS.Timeout | null = null

  /** 心跳定时器 */
  private heartbeatIntervalId: NodeJS.Timeout | null = null

  /** 订阅者集合 */
  private subscribers: Set<DataCallback> = new Set()

  /** 引用计数 */
  private refCount = 0

  /** 配置 */
  private config: DataManagerConfig

  /** 指标 */
  private metrics: DataManagerMetrics

  /** 每日快照（用于计算已实现盈亏） */
  private dailySnapshot: { date: string; balance: number; unrealizedProfit: number } | null = null

  /** 重试次数 */
  private retryCount = 0

  /** K线数据缓存（禁用，直接获取最新数据） */
  private klinesCache: Map<string, KlinesCacheItem> = new Map()

  /** K线数据缓存过期时间（0表示禁用缓存） */
  private readonly klinesCacheTTL = 0

  /** 默认K线数量 */
  private readonly defaultKlinesLimit = 50

  /** 默认K线间隔 */
  private readonly defaultKlinesInterval = '15m'

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    this.config = {
      refreshInterval: 5000, // 5 秒刷新间隔
      heartbeatInterval: 30000, // 30 秒心跳间隔
      maxRetries: 3, // 最大重试 3 次
      enableLog: process.env.NODE_ENV === 'development',
    }

    this.metrics = {
      totalFetches: 0,
      failedFetches: 0,
      avgFetchTime: 0,
      lastFetchTime: 0,
      broadcastsSent: 0,
    }

    this.log('[DataManager] Initialized')
  }

  /**
   * 获取单例实例
   */
  static getInstance(): DataManager {
    if (!this.instance) {
      this.instance = new DataManager()
    }
    return this.instance
  }

  /**
   * 增加引用计数
   */
  incrementRef(): void {
    this.refCount++
    this.log(`[DataManager] Ref count increased to ${this.refCount}`)

    // 第一个引用，启动刷新循环
    if (this.refCount === 1) {
      this.start()
    }
  }

  /**
   * 减少引用计数
   */
  decrementRef(): void {
    this.refCount--
    this.log(`[DataManager] Ref count decreased to ${this.refCount}`)

    // 最后一个引用，停止刷新循环
    if (this.refCount <= 0) {
      this.stop()
      this.refCount = 0
    }
  }

  /**
   * 启动数据刷新循环
   */
  private start(): void {
    this.log('[DataManager] Starting data refresh loop')

    // 立即获取一次数据
    this.fetchAndBroadcast()

    // 启动定时刷新
    this.refreshIntervalId = setInterval(() => {
      this.fetchAndBroadcast()
    }, this.config.refreshInterval)

    // 启动心跳
    this.heartbeatIntervalId = setInterval(() => {
      this.sendHeartbeat()
    }, this.config.heartbeatInterval)

    // 启动指标日志（每分钟）
    if (this.config.enableLog) {
      setInterval(() => {
        this.logMetrics()
      }, 60000)
    }
  }

  /**
   * 停止数据刷新循环
   */
  private stop(): void {
    this.log('[DataManager] Stopping data refresh loop')

    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId)
      this.refreshIntervalId = null
    }

    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId)
      this.heartbeatIntervalId = null
    }

    // 清空订阅者
    this.subscribers.clear()
  }

  /**
   * 订阅数据更新
   *
   * @param callback 数据更新回调函数
   * @returns 取消订阅函数
   */
  subscribe(callback: DataCallback): () => void {
    this.subscribers.add(callback)
    this.log(`[DataManager] New subscriber added. Total: ${this.subscribers.size}`)

    // 新订阅者立即获得当前数据
    if (this.data) {
      callback(this.data)
    }

    // 返回取消订阅函数
    return () => {
      this.subscribers.delete(callback)
      this.log(`[DataManager] Subscriber removed. Total: ${this.subscribers.size}`)
    }
  }

  /**
   * 获取当前数据（同步）
   */
  getCurrentData(): DashboardData | null {
    return this.data
  }

  /**
   * 获取并广播数据
   */
  private async fetchAndBroadcast(): Promise<void> {
    const startTime = Date.now()

    try {
      // 获取数据（带重试）
      const data = await this.fetchWithRetry()
      this.data = data
      this.retryCount = 0

      // 更新指标
      const elapsed = Date.now() - startTime
      this.metrics.totalFetches++
      this.metrics.avgFetchTime =
        (this.metrics.avgFetchTime * (this.metrics.totalFetches - 1) + elapsed) /
        this.metrics.totalFetches
      this.metrics.lastFetchTime = Date.now()

      // 广播给所有订阅者
      this.broadcast(data)

      this.log(
        `[DataManager] Data fetched and broadcasted (${elapsed}ms, ` +
          `subscribers: ${this.subscribers.size})`
      )
    } catch (error) {
      this.metrics.failedFetches++
      this.log(`[DataManager] Fetch failed: ${error}`)

      // 广播错误给订阅者
      this.broadcastError()
    }
  }

  /**
   * 带重试的数据获取
   */
  private async fetchWithRetry(): Promise<DashboardData> {
    try {
      return await this.fetchDashboardData()
    } catch (error) {
      this.retryCount++

      if (this.retryCount <= this.config.maxRetries) {
        const delay = Math.pow(2, this.retryCount) * 1000
        this.log(
          `[DataManager] Fetch failed, retrying in ${delay}ms ` +
            `(attempt ${this.retryCount}/${this.config.maxRetries})`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.fetchWithRetry()
      }

      // 重试次数用尽，使用缓存数据
      this.log(`[DataManager] Max retries exceeded, using cached data`)
      if (this.data) {
        return this.data
      }

      // 如果连缓存都没有，返回空数据
      throw error
    }
  }

  /**
   * 获取看板数据
   *
   * 从原 ws/route.ts 移植过来的逻辑
   */
  private async fetchDashboardData(): Promise<DashboardData> {
    // 获取服务端配置
    const config = getServerConfig()

    // 创建 REST 客户端
    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: config.binance.apiSecret,
      baseUrl: config.binance.restApi,
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
    const nonStableCoins =
      accountInfo.assets?.filter(
        (a: BinanceAsset) => !['USDT', 'USDC', 'FDUSD', 'BUSD'].includes(a.asset)
      ) || []

    if (nonStableCoins.length > 0) {
      try {
        const symbols = nonStableCoins.map((a: BinanceAsset) => `${a.asset}USDT`)
        const pricePromises = symbols.map(async (symbol: string) => {
          try {
            const res = await fetch(
              `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`
            )
            if (!res.ok) return null
            return await res.json()
          } catch {
            return null
          }
        })
        const priceResults = await Promise.all(pricePromises)

        const pricesMap: Record<string, number> = {}
        priceResults.forEach(result => {
          if (result?.symbol && result.price) {
            pricesMap[result.symbol.replace('USDT', '')] = parseFloat(result.price)
          }
        })

        // 重新计算总余额
        const totalUsdBalance =
          accountInfo.assets?.reduce((total: number, asset: BinanceAsset) => {
            const balance = parseFloat(asset.walletBalance || '0')
            if (['USDT', 'USDC', 'FDUSD', 'BUSD'].includes(asset.asset)) {
              return total + balance
            }
            return total + balance * (pricesMap[asset.asset] || 0)
          }, 0) || 0

        account.totalWalletBalance = totalUsdBalance.toString()
        account.availableBalance = totalUsdBalance.toString()
      } catch (error) {
        this.log(`[DataManager] Failed to fetch prices: ${error}`)
      }
    } else {
      // 只有稳定币
      const totalUsdBalance =
        accountInfo.assets?.reduce((total: number, asset: BinanceAsset) => {
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
      (total: number, pos: BinancePosition) => total + parseFloat(pos.unRealizedProfit || '0'),
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

    if (!this.dailySnapshot || this.dailySnapshot.date !== todayDateString) {
      this.dailySnapshot = {
        date: todayDateString,
        balance: currentBalance,
        unrealizedProfit: totalUnrealizedProfit,
      }
    } else {
      const snapshotEquity = this.dailySnapshot.balance - this.dailySnapshot.unrealizedProfit
      todayRealizedPnl = currentEquity - snapshotEquity
    }

    // 映射并过滤持仓数据
    const positions = positionsInfo
      .map((p: BinancePosition) => mapBinancePosition(p))
      .filter((p: Position) => parseFloat(p.positionAmount) !== 0)

    // 获取持仓中所有唯一的 symbol
    const symbols = Array.from(new Set(positions.map((p: Position) => p.symbol)))

    // 获取历史订单（每个 symbol 查询最近 50 条，用于后续合并）
    const allTrades: (BinanceUserTrade & { symbol: string })[] = []

    // 并发查询所有持仓交易对的最近成交记录
    const tradesPromises = symbols.map(async symbol => {
      try {
        const trades = await client.getUserTrades(symbol, {
          limit: 50, // 获取最近 50 条，确保有足够数据用于合并
        })
        return trades.map((t: BinanceUserTrade) => ({ ...t, symbol }))
      } catch {
        return []
      }
    })

    const tradesResults = await Promise.all(tradesPromises)
    tradesResults.forEach(trades => {
      allTrades.push(...trades)
    })

    // 按 orderId 合并成交记录，然后取最近 20 条
    const mergedOrders = this.mergeTradesByOrderId(allTrades)
    const orders = mergedOrders.slice(0, 20)

    // 统计当前委托订单
    const openOrdersStats = {
      total: openOrdersInfo.length,
      buy: openOrdersInfo.filter((t: BinanceOrder) => t.side === 'BUY').length,
      sell: openOrdersInfo.filter((t: BinanceOrder) => t.side === 'SELL').length,
    }

    const openOrders = openOrdersInfo.map(this.mapOpenOrderToOrder)

    // 获取持仓交易对的K线数据
    const klines = await this.fetchKlinesForPositions(client, symbols)

    return {
      account,
      positions,
      orders,
      openOrdersStats,
      openOrders,
      todayRealizedPnl,
      klines,
      timestamp: Date.now(),
    }
  }

  /**
   * 获取持仓交易对的K线数据
   */
  private async fetchKlinesForPositions(
    _client: BinanceRestClient,
    symbols: string[]
  ): Promise<Record<string, KlineData[]>> {
    const klines: Record<string, KlineData[]> = {}

    if (symbols.length === 0) {
      return klines
    }

    const now = Date.now()
    const config = getServerConfig()

    // 并发获取所有交易对的K线数据
    const klinePromises = symbols.map(async symbol => {
      try {
        // 检查缓存
        const cached = this.klinesCache.get(symbol)
        if (cached && now - cached.updatedAt < this.klinesCacheTTL) {
          return { symbol, klines: cached.data }
        }

        // 直接调用币安API获取K线数据（返回数组格式）
        const response = await fetch(
          `${config.binance.restApi}/fapi/v1/klines?symbol=${symbol}&interval=${this.defaultKlinesInterval}&limit=${this.defaultKlinesLimit}`
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const rawKlines = await response.json()
        const data = mapBinanceKlines(rawKlines)

        // 更新缓存
        this.klinesCache.set(symbol, {
          data,
          updatedAt: now,
        })

        return { symbol, klines: data }
      } catch (error) {
        this.log(`[DataManager] Failed to fetch klines for ${symbol}: ${error}`)
        // 尝试使用缓存数据
        const cached = this.klinesCache.get(symbol)
        if (cached) {
          return { symbol, klines: cached.data }
        }
        return { symbol, klines: [] }
      }
    })

    const klineResults = await Promise.all(klinePromises)

    klineResults.forEach(result => {
      klines[result.symbol] = result.klines
    })

    return klines
  }

  /**
   * 按 orderId 合并成交记录
   *
   * 同一个订单可能有多条成交记录，需要合并为一条订单显示
   */
  private mergeTradesByOrderId(trades: (BinanceUserTrade & { symbol: string })[]): SimpleOrder[] {
    // 按 orderId 分组
    const ordersMap = new Map<number, (BinanceUserTrade & { symbol: string })[]>()

    trades.forEach(trade => {
      const existing = ordersMap.get(trade.orderId) || []
      existing.push(trade)
      ordersMap.set(trade.orderId, existing)
    })

    // 合并每个订单的成交记录
    const mergedOrders: SimpleOrder[] = []

    ordersMap.forEach(orderTrades => {
      // 按时间排序，确保取到正确的首次和最后成交
      const sorted = orderTrades.sort((a, b) => a.time - b.time)
      const firstTrade = sorted[0]
      const lastTrade = sorted[sorted.length - 1]

      // 累加成交数量
      const totalQty = sorted.reduce((sum, t) => sum + parseFloat(t.qty), 0)

      // 累加手续费
      const totalCommission = sorted.reduce((sum, t) => sum + parseFloat(t.commission || '0'), 0)

      // 累加已实现盈亏
      const totalRealizedPnl = sorted.reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0)

      // 使用加权平均价格（成交金额 / 成交数量）
      const totalAmount = sorted.reduce(
        (sum, t) => sum + parseFloat(t.price) * parseFloat(t.qty),
        0
      )
      const avgPrice = totalQty > 0 ? totalAmount / totalQty : parseFloat(lastTrade.price)

      mergedOrders.push({
        id: firstTrade.id, // 使用第一条成交的 ID
        orderId: firstTrade.orderId,
        symbol: firstTrade.symbol,
        price: avgPrice.toString(),
        origQty: totalQty.toString(),
        executedQty: totalQty.toString(),
        side: firstTrade.side,
        status: 'FILLED',
        time: firstTrade.time, // 使用最早的时间
        updateTime: lastTrade.time, // 使用最后的时间
        commission: totalCommission.toString(),
        commissionAsset: firstTrade.commissionAsset,
        realizedPnl: totalRealizedPnl.toString(),
        buyer: firstTrade.buyer,
      })
    })

    // 按时间降序排序
    return mergedOrders.sort((a, b) => b.time - a.time)
  }

  /**
   * 将 getOpenOrders API 返回的数据映射为简化订单类型
   */
  private mapOpenOrderToOrder(order: BinanceOrder): SimpleOrder {
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
   * 广播数据更新给所有订阅者
   */
  private broadcast(data: DashboardData): void {
    this.metrics.broadcastsSent++
    let successCount = 0
    let failCount = 0

    this.subscribers.forEach(callback => {
      try {
        callback(data)
        successCount++
      } catch (error) {
        failCount++
        this.log(`[DataManager] Callback error: ${error}`)
      }
    })

    if (failCount > 0) {
      this.log(`[DataManager] Broadcast completed: ${successCount} success, ${failCount} failed`)
    }
  }

  /**
   * 广播错误给所有订阅者
   */
  private broadcastError(): void {
    // 使用缓存数据广播，标记为错误状态
    if (this.data) {
      this.subscribers.forEach(callback => {
        try {
          callback({ ...this.data!, timestamp: Date.now() })
        } catch (err) {
          this.log(`[DataManager] Error callback failed: ${err}`)
        }
      })
    }
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat(): void {
    this.log(`[DataManager] Heartbeat (subscribers: ${this.subscribers.size})`)
  }

  /**
   * 输出指标日志
   */
  private logMetrics(): void {
    const successRate =
      this.metrics.totalFetches > 0
        ? ((this.metrics.totalFetches - this.metrics.failedFetches) / this.metrics.totalFetches) *
          100
        : 100

    this.log(
      `[DataManager] Metrics: ` +
        `total=${this.metrics.totalFetches}, ` +
        `failed=${this.metrics.failedFetches}, ` +
        `successRate=${successRate.toFixed(1)}%, ` +
        `avgTime=${this.metrics.avgFetchTime.toFixed(0)}ms, ` +
        `broadcasts=${this.metrics.broadcastsSent}, ` +
        `subscribers=${this.subscribers.size}, ` +
        `refs=${this.refCount}`
    )
  }

  /**
   * 获取指标
   */
  getMetrics(): DataManagerMetrics {
    return { ...this.metrics }
  }

  /**
   * 日志输出
   */
  private log(_message: string): void {
    if (this.config.enableLog) {
    }
  }
}

/**
 * 导出单例获取函数
 */
export function getDataManager(): DataManager {
  return DataManager.getInstance()
}
