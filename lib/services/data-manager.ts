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
  DataErrorCallback,
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

  /** 指标日志定时器 */
  private metricsIntervalId: NodeJS.Timeout | null = null

  /** 当前进行中的刷新任务，防止慢请求与重试叠加 */
  private inFlightFetch: Promise<void> | null = null

  /** 当前进行中的数据聚合请求，供 SSE 与兼容 REST 接口复用 */
  private inFlightDataFetch: Promise<DashboardData> | null = null

  /** 订阅者集合 */
  private subscribers: Set<{ onData: DataCallback; onError?: DataErrorCallback }> = new Set()

  /** 引用计数 */
  private refCount = 0

  /** 配置 */
  private config: DataManagerConfig

  /** 指标 */
  private metrics: DataManagerMetrics

  /** 当日已实现盈亏缓存，避免为每次实时刷新重复调用收益接口 */
  private realizedPnlCache: { date: string; value: number; updatedAt: number } | null = null

  /** 已实现盈亏缓存过期时间 */
  private readonly realizedPnlCacheTTL = 60 * 1000

  /** K线数据缓存 */
  private klinesCache: Map<string, KlinesCacheItem> = new Map()

  /** K线数据缓存过期时间。15 分钟 K 线不需要每 5 秒重新拉取。 */
  private readonly klinesCacheTTL = 60 * 1000

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
    void this.fetchAndBroadcast()

    // 启动定时刷新
    this.refreshIntervalId = setInterval(() => {
      void this.fetchAndBroadcast()
    }, this.config.refreshInterval)

    // 启动心跳
    this.heartbeatIntervalId = setInterval(() => {
      this.sendHeartbeat()
    }, this.config.heartbeatInterval)

    // 启动指标日志（每分钟）
    if (this.config.enableLog) {
      this.metricsIntervalId = setInterval(() => {
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

    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId)
      this.metricsIntervalId = null
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
  subscribe(callback: DataCallback, onError?: DataErrorCallback): () => void {
    const subscriber = { onData: callback, onError }
    this.subscribers.add(subscriber)
    this.log(`[DataManager] New subscriber added. Total: ${this.subscribers.size}`)

    // 新订阅者立即获得当前数据
    if (this.data) {
      callback(this.data)
    }

    // 返回取消订阅函数
    return () => {
      this.subscribers.delete(subscriber)
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
   * 获取一次最新看板快照。
   *
   * 兼容 REST 接口通过此方法复用同一聚合逻辑；并发调用会合并为一次 Binance 请求。
   */
  async getDashboardSnapshot(): Promise<DashboardData> {
    const data = await this.fetchLatestDashboardData()
    this.data = data
    return data
  }

  /**
   * 获取并广播数据
   */
  private async fetchAndBroadcast(): Promise<void> {
    if (this.inFlightFetch) {
      this.log('[DataManager] Skipping overlapping refresh')
      return this.inFlightFetch
    }

    const fetchPromise = this.performFetchAndBroadcast()
    this.inFlightFetch = fetchPromise

    void fetchPromise.finally(() => {
      if (this.inFlightFetch === fetchPromise) {
        this.inFlightFetch = null
      }
    })

    return fetchPromise
  }

  /**
   * 执行单次数据刷新。
   */
  private async performFetchAndBroadcast(): Promise<void> {
    const startTime = Date.now()

    try {
      // 获取数据（带重试）
      const data = await this.fetchLatestDashboardData()
      this.data = data

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

      // 通知订阅者本次刷新失败，避免将旧数据伪装成最新数据。
      this.broadcastError('暂时无法获取最新交易数据，系统将自动重试')
    }
  }

  /**
   * 带重试的数据获取
   */
  private async fetchLatestDashboardData(): Promise<DashboardData> {
    if (this.inFlightDataFetch) {
      return this.inFlightDataFetch
    }

    const fetchPromise = this.fetchWithRetry()
    this.inFlightDataFetch = fetchPromise

    try {
      return await fetchPromise
    } finally {
      if (this.inFlightDataFetch === fetchPromise) {
        this.inFlightDataFetch = null
      }
    }
  }

  private async fetchWithRetry(attempt = 0): Promise<DashboardData> {
    try {
      return await this.fetchDashboardData()
    } catch (error) {
      const nextAttempt = attempt + 1

      if (nextAttempt <= this.config.maxRetries) {
        const delay = Math.pow(2, nextAttempt) * 1000
        this.log(
          `[DataManager] Fetch failed, retrying in ${delay}ms ` +
            `(attempt ${nextAttempt}/${this.config.maxRetries})`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.fetchWithRetry(nextAttempt)
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
        (a: BinanceAsset) =>
          !['USDT', 'USDC', 'FDUSD', 'BUSD'].includes(a.asset) &&
          parseFloat(a.walletBalance || '0') !== 0
      ) || []

    if (nonStableCoins.length > 0) {
      try {
        const symbols = nonStableCoins.map((a: BinanceAsset) => `${a.asset}USDT`)
        const pricePromises = symbols.map(async (symbol: string) => {
          try {
            const res = await fetch(
              `${config.binance.restApi}/fapi/v1/ticker/price?${new URLSearchParams({ symbol })}`,
              {
                cache: 'no-store',
                signal: AbortSignal.timeout(10000),
              }
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

    // 直接汇总币安收益历史，避免进程重启或多实例时零点快照失真。
    const todayRealizedPnl = await this.getTodayRealizedPnl(client)

    // 映射并过滤持仓数据
    const positions = positionsInfo
      .map((p: BinancePosition) => mapBinancePosition(p))
      .filter((p: Position) => parseFloat(p.positionAmount) !== 0)

    // 获取持仓中所有唯一的 symbol
    const symbols = Array.from(new Set(positions.map((p: Position) => p.symbol)))

    // 已平仓交易对不再保留 K 线缓存，避免长时间运行时缓存无界增长。
    const activeSymbols = new Set(symbols)
    for (const cachedSymbol of this.klinesCache.keys()) {
      if (!activeSymbols.has(cachedSymbol)) {
        this.klinesCache.delete(cachedSymbol)
      }
    }

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
   * 获取 UTC 当日已实现盈亏。
   */
  private async getTodayRealizedPnl(client: BinanceRestClient): Promise<number> {
    const now = new Date()
    const todayStartTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const date = new Date(todayStartTime).toISOString().slice(0, 10)
    const cached = this.realizedPnlCache

    if (
      cached &&
      cached.date === date &&
      Date.now() - cached.updatedAt < this.realizedPnlCacheTTL
    ) {
      return cached.value
    }

    try {
      const incomes = await client.getIncomeHistory({
        incomeType: 'REALIZED_PNL',
        startTime: todayStartTime,
        endTime: Date.now(),
        limit: 1000,
      })
      const value = incomes.reduce((total, income) => total + parseFloat(income.income || '0'), 0)

      this.realizedPnlCache = {
        date,
        value,
        updatedAt: Date.now(),
      }

      return value
    } catch (error) {
      this.log(`[DataManager] Failed to fetch realized PnL: ${error}`)
      return cached?.date === date ? cached.value : 0
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
          `${config.binance.restApi}/fapi/v1/klines?${new URLSearchParams({
            symbol,
            interval: this.defaultKlinesInterval,
            limit: this.defaultKlinesLimit.toString(),
          })}`,
          {
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
          }
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

    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onData(data)
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
  private broadcastError(message: string): void {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onError?.(message)
      } catch (error) {
        this.log(`[DataManager] Error callback failed: ${error}`)
      }
    })
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
  private log(message: string): void {
    if (this.config.enableLog) {
      console.debug(message)
    }
  }
}

/**
 * 导出单例获取函数
 */
export function getDataManager(): DataManager {
  return DataManager.getInstance()
}
