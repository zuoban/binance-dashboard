/**
 * DataManager 回归测试
 *
 * 验证兼容 REST 接口与 SSE 刷新共用数据请求，以及上游错误可以明确通知订阅者。
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { DataManager } from '../lib/services/data-manager'
import type { BinanceRestClient } from '../lib/binance/rest-client'
import type { BinanceUserTrade } from '../types/binance-api'
import type { DashboardData, DataManagerMetrics, UserTradesCacheItem } from '../lib/services/types'

interface DataManagerInternals {
  fetchWithRetry: () => Promise<DashboardData>
  broadcastError: (message: string) => void
  mapWithConcurrency: <T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>
  ) => Promise<R[]>
  fetchTradesForSymbols: (
    client: Pick<BinanceRestClient, 'getUserTrades'>,
    symbols: string[]
  ) => Promise<(BinanceUserTrade & { symbol: string })[]>
  userTradesCache: Map<string, UserTradesCacheItem>
  metrics: DataManagerMetrics
}

const dashboardData = {
  account: {},
  positions: [],
  orders: [],
  openOrdersStats: { total: 0, buy: 0, sell: 0 },
  openOrders: [],
  todayRealizedPnl: 0,
  klines: {},
  timestamp: 1,
} as unknown as DashboardData

test('并发获取快照会合并为一次数据聚合请求', async () => {
  const manager = DataManager.getInstance()
  const internals = manager as unknown as DataManagerInternals
  const originalFetchWithRetry = internals.fetchWithRetry
  let calls = 0
  let resolveFetch: (value: DashboardData) => void = () => {}

  internals.fetchWithRetry = () => {
    calls++
    return new Promise(resolve => {
      resolveFetch = resolve
    })
  }

  try {
    const firstRequest = manager.getDashboardSnapshot()
    const secondRequest = manager.getDashboardSnapshot()

    assert.equal(calls, 1)
    resolveFetch(dashboardData)

    assert.equal(await firstRequest, dashboardData)
    assert.equal(await secondRequest, dashboardData)
  } finally {
    internals.fetchWithRetry = originalFetchWithRetry
  }
})

test('上游数据错误会明确通知订阅者', () => {
  const manager = DataManager.getInstance()
  const internals = manager as unknown as DataManagerInternals
  let receivedMessage: string | null = null
  const unsubscribe = manager.subscribe(
    () => {},
    message => {
      receivedMessage = message
    }
  )

  try {
    internals.broadcastError('无法获取最新交易数据')
    assert.equal(receivedMessage, '无法获取最新交易数据')
  } finally {
    unsubscribe()
  }
})

test('成交记录请求会限制并发并复用短期缓存', async () => {
  const manager = DataManager.getInstance()
  const internals = manager as unknown as DataManagerInternals
  const originalMetrics = { ...internals.metrics }
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
  let activeRequests = 0
  let maxActiveRequests = 0
  let requestCount = 0

  const client: Pick<BinanceRestClient, 'getUserTrades'> = {
    async getUserTrades(symbol) {
      requestCount++
      activeRequests++
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests)

      try {
        await new Promise<void>(resolve => setTimeout(resolve, 5))
        return [
          {
            symbol,
            id: requestCount,
            orderId: requestCount,
            side: 'BUY',
            price: '100',
            qty: '1',
            quoteQty: '100',
            time: requestCount,
            positionSide: 'BOTH',
            maker: false,
            buyer: true,
            commission: '0',
            commissionAsset: 'USDT',
            realizedPnl: '0',
          },
        ]
      } finally {
        activeRequests--
      }
    },
  }

  internals.userTradesCache.clear()

  try {
    const firstTrades = await internals.fetchTradesForSymbols(client, symbols)
    const secondTrades = await internals.fetchTradesForSymbols(client, symbols)

    assert.equal(firstTrades.length, symbols.length)
    assert.equal(secondTrades.length, symbols.length)
    assert.equal(maxActiveRequests, 3)
    assert.equal(requestCount, symbols.length)
    assert.equal(internals.metrics.userTradesRequests, symbols.length)
    assert.equal(internals.metrics.userTradesCacheHits, symbols.length)
  } finally {
    internals.userTradesCache.clear()
    internals.metrics = originalMetrics
  }
})

test('受控并发映射限制 K 线等批量请求并保留结果顺序', async () => {
  const manager = DataManager.getInstance()
  const internals = manager as unknown as DataManagerInternals
  let activeRequests = 0
  let maxActiveRequests = 0

  const results = await internals.mapWithConcurrency([1, 2, 3, 4, 5], 3, async item => {
    activeRequests++
    maxActiveRequests = Math.max(maxActiveRequests, activeRequests)

    try {
      await new Promise<void>(resolve => setTimeout(resolve, 5))
      return item * 2
    } finally {
      activeRequests--
    }
  })

  assert.equal(maxActiveRequests, 3)
  assert.deepEqual(results, [2, 4, 6, 8, 10])
})
