/**
 * DataManager 回归测试
 *
 * 验证兼容 REST 接口与 SSE 刷新共用数据请求，以及上游错误可以明确通知订阅者。
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { DataManager } from '../lib/services/data-manager'
import type { DashboardData } from '../lib/services/types'

interface DataManagerInternals {
  fetchWithRetry: () => Promise<DashboardData>
  broadcastError: (message: string) => void
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
