'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { KlineData } from '@/types/binance'
import { BinanceKlineWSMessage } from '@/types/binance-api'
import { binanceConfig } from '@/lib/config'

interface UseBinanceKlinesOptions {
  symbol: string
  interval?:
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
  limit?: number
  enableWS?: boolean
}

interface UseBinanceKlinesReturn {
  klines: KlineData[]
  loading: boolean
  error: string | null
  wsConnected: boolean
  lastUpdate: number | null
  refresh: () => Promise<void>
}

export function useBinanceKlines({
  symbol,
  interval = '15m',
  limit = 50,
  enableWS = process.env.NODE_ENV === 'production',
}: UseBinanceKlinesOptions): UseBinanceKlinesReturn {
  const [klines, setKlines] = useState<KlineData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [wsEnabled, setWsEnabled] = useState(enableWS)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const wsErrorCountRef = useRef(0)
  const maxWsErrors = 1

  const convertKlineData = useCallback((binanceKline: unknown): KlineData => {
    const data = binanceKline as [
      number,
      string,
      string,
      string,
      string,
      string,
      number,
      string,
      number,
      string,
      string,
      string,
    ]
    return {
      time: Math.floor(data[0] / 1000),
      open: parseFloat(data[1]),
      high: parseFloat(data[2]),
      low: parseFloat(data[3]),
      close: parseFloat(data[4]),
      volume: parseFloat(data[5]),
    }
  }, [])

  const fetchHistoricalKlines = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `${binanceConfig.restApi}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const convertedData = data.map(convertKlineData)

      setKlines(convertedData)
      setLastUpdate(Date.now())
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch klines'
      setError(message)
      setLoading(false)
    }
  }, [symbol, interval, limit, convertKlineData])

  const handleWSMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as BinanceKlineWSMessage

        if (data.e === 'kline' && data.k) {
          const { k } = data
          const kline: KlineData = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
          }

          setLastUpdate(Date.now())

          if (k.x) {
            setKlines(prev => {
              const newData = [...prev]
              if (newData.length > 0 && newData[newData.length - 1].time === kline.time) {
                newData[newData.length - 1] = kline
              } else {
                newData.push(kline)
              }
              return newData.slice(-limit)
            })
          } else {
            setKlines(prev => {
              const newData = [...prev]
              if (newData.length > 0) {
                newData[newData.length - 1] = kline
              }
              return newData
            })
          }
        }
      } catch (err) {}
    },
    [limit]
  )

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    if (!wsEnabled) {
      return
    }

    try {
      const wsUrl = `${binanceConfig.wsApi}/${symbol.toLowerCase()}@kline_${interval}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
        wsErrorCountRef.current = 0
      }

      ws.onmessage = handleWSMessage

      ws.onerror = _event => {
        setWsConnected(false)

        wsErrorCountRef.current += 1

        if (wsErrorCountRef.current >= maxWsErrors) {
          setWsEnabled(false)

          if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
          }
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current)
            reconnectTimerRef.current = null
          }
        }
      }

      ws.onclose = event => {
        setWsConnected(false)

        if (event.code === 1006 || event.code === 1000) {
          wsErrorCountRef.current += 1

          if (wsErrorCountRef.current >= maxWsErrors) {
            setWsEnabled(false)

            if (wsRef.current) {
              wsRef.current.close()
              wsRef.current = null
            }
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current)
              reconnectTimerRef.current = null
            }
            return
          }
        }

        if (wsEnabled && enableWS) {
          reconnectTimerRef.current = setTimeout(() => {
            connectWS()
          }, 5000)
        }
      }
    } catch (err) {
      wsErrorCountRef.current += 1

      if (wsErrorCountRef.current >= maxWsErrors) {
        setWsEnabled(false)

        if (wsRef.current) {
          wsRef.current.close()
          wsRef.current = null
        }
      }
    }
  }, [symbol, interval, enableWS, wsEnabled, handleWSMessage])

  const refresh = useCallback(async () => {
    await fetchHistoricalKlines()
  }, [fetchHistoricalKlines])

  useEffect(() => {
    fetchHistoricalKlines()

    if (enableWS && wsEnabled) {
      connectWS()
    } else {
      const intervalMs = 15000
      refreshTimerRef.current = setInterval(() => {
        fetchHistoricalKlines()
      }, intervalMs)
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      setWsConnected(false)
    }
  }, [fetchHistoricalKlines, enableWS, wsEnabled, connectWS])

  return {
    klines,
    loading,
    error,
    wsConnected,
    lastUpdate,
    refresh,
  }
}
