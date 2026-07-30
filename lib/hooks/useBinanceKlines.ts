'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KlineData } from '@/types/binance'
import type { BinanceMarkPriceWSMessage } from '@/types/binance-api'
import { binanceConfig } from '@/lib/config'

type KlineInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '1w'
  | '1M'

interface UseBinanceKlinesOptions {
  symbol: string
  interval?: KlineInterval
  limit?: number
  enableWS?: boolean
}

interface UseBinanceKlinesReturn {
  /** 与 K 线同源的最新标记价格。 */
  markPrice: number | null
  klines: KlineData[]
  loading: boolean
  error: string | null
  wsConnected: boolean
  lastUpdate: number | null
  refresh: () => Promise<void>
}

interface MarkPriceSnapshot {
  price: number
  time: number
}

const MARK_PRICE_POLL_INTERVAL = 1000
const HISTORY_RESYNC_INTERVAL = 60 * 1000
const STREAM_STALE_TIMEOUT = 6000
const MAX_RECONNECT_DELAY = 30000

function convertKlineData(binanceKline: unknown): KlineData | null {
  if (!Array.isArray(binanceKline) || binanceKline.length < 6) {
    return null
  }

  const [openTime, open, high, low, close, volume] = binanceKline
  const values = [openTime, open, high, low, close, volume]
  if (values.some(value => value === undefined || value === null)) {
    return null
  }

  const parsedOpenTime = Number(openTime)
  const parsedOpen = Number.parseFloat(String(open))
  const parsedHigh = Number.parseFloat(String(high))
  const parsedLow = Number.parseFloat(String(low))
  const parsedClose = Number.parseFloat(String(close))
  const parsedVolume = Number.parseFloat(String(volume))

  if (
    !Number.isFinite(parsedOpenTime) ||
    !Number.isFinite(parsedOpen) ||
    !Number.isFinite(parsedHigh) ||
    !Number.isFinite(parsedLow) ||
    !Number.isFinite(parsedClose) ||
    !Number.isFinite(parsedVolume)
  ) {
    return null
  }

  return {
    time: Math.floor(parsedOpenTime / 1000),
    open: parsedOpen,
    high: parsedHigh,
    low: parsedLow,
    close: parsedClose,
    volume: parsedVolume,
  }
}

function isMarkPriceMessage(message: unknown): message is BinanceMarkPriceWSMessage {
  if (typeof message !== 'object' || message === null) {
    return false
  }

  const candidate = message as Partial<BinanceMarkPriceWSMessage>
  return (
    candidate.e === 'markPriceUpdate' &&
    typeof candidate.p === 'string' &&
    typeof candidate.E === 'number' &&
    typeof candidate.s === 'string'
  )
}

function parseMarkPriceSnapshot(payload: unknown): MarkPriceSnapshot | null {
  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const data = payload as { markPrice?: unknown; time?: unknown }
  if (typeof data.markPrice !== 'string') {
    return null
  }

  const price = Number.parseFloat(data.markPrice)
  if (!Number.isFinite(price) || price <= 0) {
    return null
  }

  const time = typeof data.time === 'number' && Number.isFinite(data.time) ? data.time : Date.now()
  return { price, time }
}

function getKlineOpenTime(timestamp: number, interval: KlineInterval): number {
  if (interval === '1M') {
    const date = new Date(timestamp)
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  }

  if (interval === '1w') {
    const date = new Date(timestamp)
    const daysSinceMonday = (date.getUTCDay() + 6) % 7
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday)
  }

  const intervalMilliseconds: Record<Exclude<KlineInterval, '1w' | '1M'>, number> = {
    '1m': 60 * 1000,
    '3m': 3 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  }

  return Math.floor(timestamp / intervalMilliseconds[interval]) * intervalMilliseconds[interval]
}

/** 使用币安 USD-M 标记价格流。该流与持仓风险计算使用相同价格口径。 */
function getMarkPriceStreamUrl(symbol: string): string {
  return `${binanceConfig.wsApi.replace(/\/$/, '')}/${symbol.toLowerCase()}@markPrice@1s`
}

/** 以同一笔标记价同步当前 K 线收盘价和页面价格线，避免两个价格源产生视觉偏差。 */
function applyMarkPriceToKlines(
  previous: KlineData[],
  price: number,
  timestamp: number,
  interval: KlineInterval,
  limit: number
): KlineData[] {
  const openTime = Math.floor(getKlineOpenTime(timestamp, interval) / 1000)
  const latest = previous[previous.length - 1]

  if (!latest || latest.time < openTime) {
    return [
      ...previous,
      {
        time: openTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
      },
    ].slice(-limit)
  }

  if (latest.time > openTime) {
    return previous
  }

  const high = Math.max(latest.high, price)
  const low = Math.min(latest.low, price)
  if (latest.close === price && latest.high === high && latest.low === low) {
    return previous
  }

  return [
    ...previous.slice(0, -1),
    {
      ...latest,
      high,
      low,
      close: price,
      // 标记价格 K 线不包含成交量，保持币安接口返回的 0。
      volume: 0,
    },
  ]
}

/**
 * 获取标记价格 K 线，并优先通过标记价格 WebSocket 实时更新当前 candle。
 * 当部分网络环境无法持续接收公共标记价流时，自动降级为 premiumIndex 轮询；
 * 两种路径都会使用同一价格同步图表与持仓标记价。
 */
export function useBinanceKlines({
  symbol,
  interval = '15m',
  limit = 50,
  enableWS = true,
}: UseBinanceKlinesOptions): UseBinanceKlinesReturn {
  const [markPrice, setMarkPrice] = useState<number | null>(null)
  const [klines, setKlines] = useState<KlineData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const historyResyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamStaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestMarkPriceRef = useRef<MarkPriceSnapshot | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const shouldReconnectRef = useRef(false)
  const connectWebSocketRef = useRef<() => void>(() => {})

  const applyMarkPrice = useCallback(
    (price: number, timestamp: number) => {
      if (!Number.isFinite(price) || price <= 0) {
        return
      }

      const previousSnapshot = latestMarkPriceRef.current
      if (previousSnapshot && timestamp < previousSnapshot.time) {
        return
      }

      latestMarkPriceRef.current = { price, time: timestamp }
      setMarkPrice(previous => (previous === price ? previous : price))
      setKlines(previous => applyMarkPriceToKlines(previous, price, timestamp, interval, limit))
      setLastUpdate(timestamp)
    },
    [interval, limit]
  )

  const fetchHistoricalKlines = useCallback(
    async (showLoading: boolean = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }
        setError(null)

        const response = await fetch(
          `${binanceConfig.restApi}/fapi/v1/markPriceKlines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
          { cache: 'no-store' }
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const payload = (await response.json()) as unknown
        if (!Array.isArray(payload)) {
          throw new Error('Invalid mark price kline response')
        }

        const historicalKlines = payload
          .map(convertKlineData)
          .filter((kline): kline is KlineData => kline !== null)
        const latestMarkPrice = latestMarkPriceRef.current
        const nextKlines = latestMarkPrice
          ? applyMarkPriceToKlines(
              historicalKlines,
              latestMarkPrice.price,
              latestMarkPrice.time,
              interval,
              limit
            )
          : historicalKlines

        setKlines(nextKlines)
        setMarkPrice(previous => previous ?? nextKlines[nextKlines.length - 1]?.close ?? null)
        setLastUpdate(Date.now())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch mark price klines'
        setError(message)
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [interval, limit, symbol]
  )

  const fetchLatestMarkPrice = useCallback(async () => {
    try {
      const response = await fetch(
        `${binanceConfig.restApi}/fapi/v1/premiumIndex?symbol=${symbol}`,
        { cache: 'no-store' }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const snapshot = parseMarkPriceSnapshot((await response.json()) as unknown)
      if (!snapshot) {
        throw new Error('Invalid mark price response')
      }

      applyMarkPrice(snapshot.price, snapshot.time)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch latest mark price'
      setError(message)
    }
  }, [applyMarkPrice, symbol])

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      return
    }

    void fetchLatestMarkPrice()
    pollingTimerRef.current = setInterval(() => {
      void fetchLatestMarkPrice()
    }, MARK_PRICE_POLL_INTERVAL)
  }, [fetchLatestMarkPrice])

  const stopHistoryResync = useCallback(() => {
    if (historyResyncTimerRef.current) {
      clearInterval(historyResyncTimerRef.current)
      historyResyncTimerRef.current = null
    }
  }, [])

  const startHistoryResync = useCallback(() => {
    if (historyResyncTimerRef.current) {
      return
    }

    historyResyncTimerRef.current = setInterval(() => {
      void fetchHistoricalKlines(false)
    }, HISTORY_RESYNC_INTERVAL)
  }, [fetchHistoricalKlines])

  const clearStreamStaleTimer = useCallback(() => {
    if (streamStaleTimerRef.current) {
      clearTimeout(streamStaleTimerRef.current)
      streamStaleTimerRef.current = null
    }
  }, [])

  const scheduleStreamFallback = useCallback(() => {
    clearStreamStaleTimer()
    streamStaleTimerRef.current = setTimeout(() => {
      if (shouldReconnectRef.current) {
        startPolling()
      }
    }, STREAM_STALE_TIMEOUT)
  }, [clearStreamStaleTimer, startPolling])

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current || reconnectTimerRef.current) {
      return
    }

    // 连接断开时立即启用 REST 兜底，图表不会重新回退到成交价 K 线。
    startPolling()
    reconnectAttemptsRef.current += 1
    const delay = Math.min(1000 * 2 ** (reconnectAttemptsRef.current - 1), MAX_RECONNECT_DELAY)

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null
      connectWebSocketRef.current()
    }, delay)
  }, [startPolling])

  const handleWSMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const rawMessage = JSON.parse(event.data) as unknown
        const message =
          typeof rawMessage === 'object' && rawMessage !== null && 'data' in rawMessage
            ? rawMessage.data
            : rawMessage

        if (!isMarkPriceMessage(message)) {
          return
        }

        const price = Number.parseFloat(message.p)
        if (!Number.isFinite(price) || price <= 0) {
          return
        }

        applyMarkPrice(price, message.E)
        setError(null)
        stopPolling()
        scheduleStreamFallback()
      } catch {
        // 单条行情消息解析失败不应中断后续长连接。
      }
    },
    [applyMarkPrice, scheduleStreamFallback, stopPolling]
  )

  const connectWebSocket = useCallback(() => {
    if (!enableWS || !shouldReconnectRef.current || typeof WebSocket === 'undefined') {
      startPolling()
      return
    }

    const currentWebSocket = wsRef.current
    if (
      currentWebSocket?.readyState === WebSocket.OPEN ||
      currentWebSocket?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    try {
      const webSocket = new WebSocket(getMarkPriceStreamUrl(symbol))
      wsRef.current = webSocket

      webSocket.onopen = () => {
        if (wsRef.current !== webSocket) {
          return
        }

        reconnectAttemptsRef.current = 0
        setWsConnected(true)
        // 某些网络可建立连接却收不到标记价事件，先启用轮询，首条 WS 消息到达后自动关闭。
        startPolling()
        scheduleStreamFallback()
      }

      webSocket.onmessage = handleWSMessage

      webSocket.onerror = () => {
        webSocket.close()
      }

      webSocket.onclose = () => {
        if (wsRef.current !== webSocket) {
          return
        }

        wsRef.current = null
        setWsConnected(false)
        scheduleReconnect()
      }
    } catch {
      setWsConnected(false)
      scheduleReconnect()
    }
  }, [enableWS, handleWSMessage, scheduleReconnect, scheduleStreamFallback, startPolling, symbol])

  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket
  }, [connectWebSocket])

  const refresh = useCallback(async () => {
    await Promise.all([fetchHistoricalKlines(), fetchLatestMarkPrice()])
  }, [fetchHistoricalKlines, fetchLatestMarkPrice])

  useEffect(() => {
    shouldReconnectRef.current = true
    reconnectAttemptsRef.current = 0
    latestMarkPriceRef.current = null
    setMarkPrice(null)
    setKlines([])
    startHistoryResync()

    void Promise.all([fetchHistoricalKlines(), fetchLatestMarkPrice()]).finally(() => {
      if (!shouldReconnectRef.current) {
        return
      }

      if (enableWS) {
        connectWebSocketRef.current()
      } else {
        startPolling()
      }
    })

    return () => {
      shouldReconnectRef.current = false

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      clearStreamStaleTimer()
      stopPolling()
      stopHistoryResync()

      const webSocket = wsRef.current
      wsRef.current = null
      webSocket?.close()
      setWsConnected(false)
    }
  }, [
    clearStreamStaleTimer,
    enableWS,
    fetchHistoricalKlines,
    fetchLatestMarkPrice,
    startHistoryResync,
    startPolling,
    stopHistoryResync,
    stopPolling,
  ])

  return {
    markPrice,
    klines,
    loading,
    error,
    wsConnected,
    lastUpdate,
    refresh,
  }
}
