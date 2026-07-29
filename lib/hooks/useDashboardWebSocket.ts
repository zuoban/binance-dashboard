/**
 * useDashboardWebSocket Hook
 *
 * 通过 SSE (Server-Sent Events) 实时接收看板数据
 * 每 5 秒自动推送最新数据
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { AccountAsset, Position, Order, KlineData } from '@/types/binance'

interface DashboardData {
  account: AccountAsset | null
  positions: Position[]
  orders: Order[]
  openOrdersStats: {
    total: number
    buy: number
    sell: number
  }
  openOrders: Order[]
  todayRealizedPnl: number
  klines: Record<string, KlineData[]>
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
  positions: Position[]
  /** 订单数据 */
  orders: Order[]
  /** 当前委托订单统计 */
  openOrdersStats: DashboardData['openOrdersStats']
  /** 当前委托订单数据 */
  openOrders: Order[]
  /** 今日已实现盈亏 */
  todayRealizedPnl: number
  /** K线数据 */
  klines: Record<string, KlineData[]>
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
    klines: {},
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
      return
    }

    try {
      setIsConnecting(true)
      setError(null)

      // EventSource 会自动携带同源 HttpOnly 会话 Cookie。
      const eventSource = new EventSource('/api/dashboard/ws')
      eventSourceRef.current = eventSource

      // 连接成功（SSE 没有显式的 open 事件，第一次收到消息就是连接成功）
      eventSource.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        onConnectionChange?.(true)
      }

      // 接收数据消息
      eventSource.addEventListener('data', (event: MessageEvent) => {
        try {
          const rawData = event.data

          if (!rawData || rawData.trim() === '') {
            return
          }

          const message = JSON.parse(rawData)

          if (message.type === 'data') {
            setData(message.data)
            setLoading(false)
            setError(null)
            setLastUpdate(message.timestamp)
            onDataUpdate?.(message.data)
          }
        } catch {
          const errorMessage = '无法解析服务端实时数据'
          setError(errorMessage)
          onError?.(errorMessage)
        }
      })

      // 接收服务端业务错误。该事件不代表 SSE 连接中断，因此不会触发原生 onerror。
      eventSource.addEventListener('dashboard-error', (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data) as { error?: unknown }
          const errorMessage =
            typeof message.error === 'string' ? message.error : '无法获取最新交易数据'

          setError(errorMessage)
          setLoading(false)
          onError?.(errorMessage)
        } catch {
          const errorMessage = '无法解析服务端错误信息'
          setError(errorMessage)
          setLoading(false)
          onError?.(errorMessage)
        }
      })

      // 连接错误（EventSource 的原生 onerror 回调）
      eventSource.onerror = () => {
        // 根据 readyState 提供更详细的错误信息
        let errorMessage = 'Connection error'
        if (eventSource.readyState === EventSource.CLOSED) {
          errorMessage = 'Connection closed'
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          errorMessage = 'Connection failed - unable to establish connection'
        }

        setError(errorMessage)
        setIsConnecting(false)
        setIsConnected(false)
        onConnectionChange?.(false)
        onError?.(errorMessage)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setIsConnecting(false)
      cleanup()
    }
  }, [cleanup, onDataUpdate, onError, onConnectionChange])

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    cleanup()
    setIsConnected(false)
    setIsConnecting(false)
    onConnectionChange?.(false)
  }, [cleanup, onConnectionChange])

  const reconnect = useCallback(() => {
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
    // 只在 autoConnect 变化时重新执行，避免因为 connect/cleanup 函数引用变化导致重连
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect])

  return {
    account: data.account,
    positions: data.positions,
    orders: data.orders,
    openOrdersStats: data.openOrdersStats,
    openOrders: data.openOrders,
    todayRealizedPnl: data.todayRealizedPnl,
    klines: data.klines,
    loading,
    error,
    isConnected,
    isConnecting,
    lastUpdate,
    reconnect,
    disconnect,
  }
}
