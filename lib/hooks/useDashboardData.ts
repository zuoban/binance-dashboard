/**
 * useDashboardData Hook
 *
 * 通过统一接口获取看板的所有数据
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth'

interface DashboardData {
  account: {
    totalWalletBalance: string
    availableBalance: string
    unrealizedProfit: string
  } | null
  positions: any[]
  orders: any[]
  orderStats: {
    total: number
    buy: number
    sell: number
    filled: number
    totalVolume: number
  }
}

interface UseDashboardDataOptions {
  /** 自动刷新间隔（毫秒），默认 5000ms */
  refreshInterval?: number
  /** 订单查询时间范围（毫秒），默认 1 小时 */
  orderTimeRange?: number
  /** 是否自动获取数据 */
  autoFetch?: boolean
}

interface UseDashboardDataReturn {
  /** 账户数据 */
  account: DashboardData['account'] | null
  /** 持仓数据 */
  positions: any[]
  /** 订单数据 */
  orders: any[]
  /** 订单统计 */
  orderStats: DashboardData['orderStats']
  /** 加载状态 */
  loading: boolean
  /** 错误信息 */
  error: string | null
  /** 刷新倒计时 */
  countdown: number
  /** 手动刷新 */
  refetch: () => Promise<void>
}

/**
 * 看板数据 Hook
 *
 * @param options - 配置选项
 * @returns 看板数据和操作方法
 */
export function useDashboardData(options: UseDashboardDataOptions = {}): UseDashboardDataReturn {
  const { refreshInterval = 5000, orderTimeRange = 60 * 60 * 1000, autoFetch = true } = options

  const [data, setData] = useState<DashboardData>({
    account: null,
    positions: [],
    orders: [],
    orderStats: {
      total: 0,
      buy: 0,
      sell: 0,
      filled: 0,
      totalVolume: 0,
    },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(refreshInterval / 1000)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstLoadRef = useRef(true)

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      // 只在首次加载时设置 loading 为 true
      if (isFirstLoadRef.current) {
        setLoading(true)
      }
      setError(null)

      const response = await fetchWithAuth(
        `/api/binance/dashboard?orderTimeRange=${orderTimeRange}`
      )
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch dashboard data')
      }

      setData({
        account: result.data.account,
        positions: result.data.positions || [],
        orders: result.data.orders || [],
        orderStats: result.data.orderStats || {
          total: 0,
          buy: 0,
          sell: 0,
          filled: 0,
          totalVolume: 0,
        },
      })

      isFirstLoadRef.current = false
      setCountdown(refreshInterval / 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useDashboardData] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [refreshInterval, orderTimeRange])

  // 手动刷新
  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // 自动获取数据
  useEffect(() => {
    if (!autoFetch) return

    // 首次获取
    fetchData()

    // 设置定时器
    intervalRef.current = setInterval(() => {
      fetchData()
    }, refreshInterval)

    // 倒计时定时器
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? refreshInterval / 1000 : prev - 1))
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [autoFetch, refreshInterval, fetchData])

  return {
    account: data.account,
    positions: data.positions,
    orders: data.orders,
    orderStats: data.orderStats,
    loading,
    error,
    countdown,
    refetch,
  }
}
