/**
 * useDashboardWebSocket Hook
 *
 * 通过 SSE (Server-Sent Events) 实时接收看板数据
 * 每 5 秒自动推送最新数据
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { AccountAsset } from '@/types/binance'

interface DashboardData {
  account: AccountAsset | null
  positions: any[]
  orders: any[]
  openOrdersStats: {
    total: number
    buy: number
    sell: number
  }
  openOrders: any[]
  todayRealizedPnl: number
}

interface UseDashboardWebSocketOptions {
  /** 是否自动连接 */
  autoConnect?: boolean
  /** 数据更新回调 */
  onDataUpdate?: (data: DashboardData) => void
  /** 错误回调 */
  onError?: (error: string) => void
  /** 连接状态变化回调 */
  onConnectionChange?: (connected: boolean) => void
}

interface UseDashboardWebSocketReturn {
  /** 账户数据 */
  account: DashboardData['account'] | null
  /** 持仓数据 */
  positions: any[]
  /** 订单数据 */
  orders: any[]
  /** 当前委托订单统计 */
  openOrdersStats: DashboardData['openOrdersStats']
  /** 当前委托订单数据 */
  openOrders: any[]
  /** 今日已实现盈亏 */
  todayRealizedPnl: number
  /** 加载状态 */
  loading: boolean
  /** 错误信息 */
  error: string | null
  /** 是否已连接 */
  isConnected: boolean
  /** 是否正在连接 */
  isConnecting: boolean
  /** 最后更新时间 */
  lastUpdate: number | null
  /** 手动重连 */
  reconnect: () => void
  /** 手动断开 */
  disconnect: () => void
}

/**
 * 看板 SSE Hook
 *
 * @param options - 配置选项
 * @returns 看板数据和操作方法
 */
export function useDashboardWebSocket(
  options: UseDashboardWebSocketOptions = {}
): UseDashboardWebSocketReturn {
  const { autoConnect = true, onDataUpdate, onError, onConnectionChange } = options

  const [data, setData] = useState<DashboardData>({
    account: null,
    positions: [],
    orders: [],
    openOrdersStats: {
      total: 0,
      buy: 0,
      sell: 0,
    },
    openOrders: [],
    todayRealizedPnl: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  /**
   * 连接 SSE
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log('[useDashboardWebSocket] Already connected')
      return
    }

    try {
      setIsConnecting(true)
      setError(null)

      // 构建 SSE URL
      const url = `/api/dashboard/ws`

      console.log('[useDashboardWebSocket] Connecting to:', url)

      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      // 连接成功（SSE 没有显式的 open 事件，第一次收到消息就是连接成功）
      eventSource.onopen = () => {
        console.log('[useDashboardWebSocket] Connected')
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        onConnectionChange?.(true)
      }

      // 接收数据消息
      eventSource.addEventListener('data', (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data)
          console.log('[useDashboardWebSocket] Data received:', message)

          if (message.type === 'data') {
            setData(message.data)
            setLoading(false)
            setError(null)
            setLastUpdate(message.timestamp)
            onDataUpdate?.(message.data)
          }
        } catch (err) {
          console.error('[useDashboardWebSocket] Error parsing message:', err)
        }
      })

      // 接收错误消息
      eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data)
          console.error('[useDashboardWebSocket] Server error:', message.error)
          setError(message.error)
          onError?.(message.error)
        } catch (err) {
          console.error('[useDashboardWebSocket] Error parsing error message:', err)
        }
      })

      // 连接错误
      eventSource.onerror = (err) => {
        console.error('[useDashboardWebSocket] Connection error:', err)
        setError('Connection error')
        setIsConnecting(false)
        setIsConnected(false)
        onConnectionChange?.(false)

        // EventSource 会自动重连，但我们可以在这里处理一些逻辑
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('[useDashboardWebSocket] Connection closed')
        }
      }
    } catch (err) {
      console.error('[useDashboardWebSocket] Connection error:', err)
      setError(err instanceof Error ? err.message : 'Connection failed')
      setIsConnecting(false)
      cleanup()
    }
  }, [cleanup, onDataUpdate, onError, onConnectionChange])

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    console.log('[useDashboardWebSocket] Disconnecting...')
    cleanup()
    setIsConnected(false)
    setIsConnecting(false)
    onConnectionChange?.(false)
  }, [cleanup, onConnectionChange])

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    console.log('[useDashboardWebSocket] Manual reconnect...')
    disconnect()
    // 短暂延迟后重连
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, 1000)
  }, [disconnect, connect])

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      cleanup()
    }
  }, [autoConnect]) // 只在 autoConnect 变化时执行

  return {
    account: data.account,
    positions: data.positions,
    orders: data.orders,
    openOrdersStats: data.openOrdersStats,
    openOrders: data.openOrders,
    todayRealizedPnl: data.todayRealizedPnl,
    loading,
    error,
    isConnected,
    isConnecting,
    lastUpdate,
    reconnect,
    disconnect,
  }
}
