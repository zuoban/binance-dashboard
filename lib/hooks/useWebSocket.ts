/**
 * useWebSocket Hook
 *
 * 用于管理 WebSocket 连接的自定义 Hook
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useWebSocketStore } from '@/lib/store'

interface UseWebSocketOptions {
  /** WebSocket URL */
  url: string
  /** 是否自动连接 */
  autoConnect?: boolean
  /** 重连最大次数 */
  maxReconnectAttempts?: number
  /** 重连延迟（毫秒） */
  reconnectDelay?: number
  /** 心跳间隔（毫秒） */
  pingInterval?: number
  /** 消息处理回调 */
  onMessage?: (event: MessageEvent) => void
  /** 连接成功回调 */
  onOpen?: (event: Event) => void
  /** 连接关闭回调 */
  onClose?: (event: CloseEvent) => void
  /** 错误回调 */
  onError?: (event: Event) => void
}

/**
 * WebSocket Hook
 *
 * @param options - 配置选项
 * @returns WebSocket 状态和操作方法
 *
 * @example
 * ```tsx
 * const { isConnected, sendMessage, lastMessage } = useWebSocket({
 *   url: 'wss://fstream.binance.com/ws/listenKey',
 *   autoConnect: true,
 *   onMessage: (event) => {
 *     const data = JSON.parse(event.data);
 *   },
 * });
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    autoConnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    pingInterval = 30000,
    onMessage,
    onOpen,
    onClose,
    onError,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null)

  const {
    isConnected,
    isConnecting,
    reconnectCount,
    setConnected,
    setDisconnected,
    setConnecting,
    incrementMessageCount,
  } = useWebSocketStore()

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current)
      pingTimerRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnecting()

      const ws = new WebSocket(url)
      wsRef.current = ws

      // 连接成功
      ws.onopen = event => {
        setConnected()
        onOpen?.(event)

        // 启动心跳
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ method: 'ping' }))
          }
        }, pingInterval)
      }

      // 接收消息
      ws.onmessage = event => {
        incrementMessageCount()
        setLastMessage(event)
        onMessage?.(event)
      }

      // 连接关闭
      ws.onclose = event => {
        setDisconnected()
        clearTimers()
        onClose?.(event)

        // 自动重连
        if (!event.wasClean && reconnectCount < maxReconnectAttempts) {
          reconnectTimerRef.current = setTimeout(
            () => {
              connect()
            },
            reconnectDelay * Math.pow(2, reconnectCount)
          ) // 指数退避
        }
      }

      // 错误处理
      ws.onerror = event => {
        onError?.(event)
      }
    } catch (error) {
      setDisconnected()
    }
  }, [
    url,
    setConnected,
    setDisconnected,
    setConnecting,
    incrementMessageCount,
    onOpen,
    onMessage,
    onClose,
    onError,
    clearTimers,
    reconnectCount,
    maxReconnectAttempts,
    reconnectDelay,
    pingInterval,
  ])

  // 断开连接
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    clearTimers()
  }, [clearTimers])

  // 发送消息
  const sendMessage = useCallback((data: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      wsRef.current.send(message)
    } else {
    }
  }, [])

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
    // 只在 autoConnect 变化时重新执行，避免因为 connect/disconnect 函数引用变化导致重连
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect])

  return {
    // 状态
    isConnected,
    isConnecting,
    reconnectCount,
    lastMessage,
    // 操作
    connect,
    disconnect,
    sendMessage,
    // WebSocket 实例
    ws: wsRef.current,
  }
}
