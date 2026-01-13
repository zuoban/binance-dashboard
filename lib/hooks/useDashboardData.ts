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
  openOrdersStats: {
    total: number
    buy: number
    sell: number
  }
  openOrders: any[]
}

interface UseDashboardDataOptions {
  /** 自动刷新间隔（毫秒），默认 10000ms */
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
  /** 当前委托订单统计 */
  openOrdersStats: DashboardData['openOrdersStats']
  /** 当前委托订单数据 */
  openOrders: any[]
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
  const { refreshInterval = 10000, orderTimeRange = 60 * 60 * 1000, autoFetch = true } = options

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
    openOrdersStats: {
      total: 0,
      buy: 0,
      sell: 0,
    },
    openOrders: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(refreshInterval / 1000)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstLoadRef = useRef(true)
  const isCancelledRef = useRef(false) // 用于取消进行中的请求
  const isRequestingRef = useRef(false) // 用于防止重复请求

  // 获取数据
  const fetchData = useCallback(async () => {
    // 防止重复请求
    if (isRequestingRef.current) {
      console.log('[useDashboardData] Request already in progress, skipping')
      return
    }

    // 检查是否已取消
    if (isCancelledRef.current) {
      console.log('[useDashboardData] Request cancelled')
      return
    }

    // 设置请求标志
    isRequestingRef.current = true

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

      // 检查是否在请求期间被取消
      if (isCancelledRef.current) {
        console.log('[useDashboardData] Request cancelled after fetch')
        return
      }

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
        openOrdersStats: result.data.openOrdersStats || {
          total: 0,
          buy: 0,
          sell: 0,
        },
        openOrders: result.data.openOrders || [],
      })

      isFirstLoadRef.current = false
      setCountdown(refreshInterval / 1000)
    } catch (err) {
      // 只在未取消时设置错误
      if (!isCancelledRef.current) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        console.error('[useDashboardData] Error:', err)
      }
    } finally {
      // 只在未取消时设置 loading 和重置请求标志
      if (!isCancelledRef.current) {
        setLoading(false)
      }
      isRequestingRef.current = false
    }
  }, [refreshInterval, orderTimeRange])

  // 存储最新的 fetchData 函数
  const fetchDataRef = useRef(fetchData)
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  // 手动刷新
  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // 自动获取数据
  useEffect(() => {
    if (!autoFetch) return

    // 重置取消标志
    isCancelledRef.current = false

    // 立即获取数据（首次加载或参数变化时）
    fetchDataRef.current()

    // 设置定时器
    intervalRef.current = setInterval(() => {
      fetchDataRef.current()
    }, refreshInterval)

    // 倒计时定时器
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? refreshInterval / 1000 : prev - 1))
    }, 1000)

    return () => {
      // 设置取消标志，阻止进行中的请求更新状态
      isCancelledRef.current = true

      // 清除定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }

      console.log('[useDashboardData] Cleanup completed')
    }
  }, [autoFetch, refreshInterval, orderTimeRange]) // 直接依赖 orderTimeRange

  return {
    account: data.account,
    positions: data.positions,
    orders: data.orders,
    orderStats: data.orderStats,
    openOrdersStats: data.openOrdersStats,
    openOrders: data.openOrders,
    loading,
    error,
    countdown,
    refetch,
  }
}
