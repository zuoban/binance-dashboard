/**
 * 币安交易规则 Hook
 *
 * 获取并缓存交易对的精度信息
 */

'use client'

import { useState, useEffect } from 'react'

/**
 * 交易对精度信息
 */
export interface SymbolPrecision {
  /** 价格精度 */
  pricePrecision: number
  /** 数量精度 */
  quantityPrecision: number
}

/**
 * 交易规则数据结构
 */
export interface ExchangeInfoData {
  [symbol: string]: SymbolPrecision
}

/**
 * Hook 返回值
 */
interface UseExchangeInfoReturn {
  /** 交易规则数据 */
  exchangeInfo: ExchangeInfoData
  /** 是否正在加载 */
  loading: boolean
  /** 错误信息 */
  error: string | null
}

/**
 * 全局缓存
 */
type CacheState = {
  data: ExchangeInfoData
  loading: boolean
  error: string | null
  promise: Promise<void> | null
  listeners: Set<(state: CacheState) => void>
}

const globalCache: CacheState = {
  data: {},
  loading: false,
  error: null,
  promise: null,
  listeners: new Set(),
}

/**
 * 通知所有监听器
 */
function notifyListeners() {
  globalCache.listeners.forEach(listener => listener(globalCache))
}

/**
 * 获取交易规则 Hook
 */
export function useExchangeInfo(): UseExchangeInfoReturn {
  const [localState, setLocalState] = useState<CacheState>(() => globalCache)

  // 订阅全局缓存变化
  useEffect(() => {
    const listener = (state: CacheState) => {
      setLocalState({ ...state })
    }

    globalCache.listeners.add(listener)

    return () => {
      globalCache.listeners.delete(listener)
    }
  }, [])

  // 如果没有正在进行的请求且没有数据，则发起请求
  useEffect(() => {
    if (globalCache.loading || Object.keys(globalCache.data).length > 0) {
      return
    }

    const fetchExchangeInfo = async () => {
      try {
        globalCache.loading = true
        globalCache.error = null
        notifyListeners()

        const response = await fetch('/api/binance/exchange-info')
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error?.message || '获取交易规则失败')
        }

        // 解析交易规则数据
        const precisionMap: ExchangeInfoData = {}

        if (result.data && result.data.symbols) {
          result.data.symbols.forEach((symbol: any) => {
            precisionMap[symbol.symbol] = {
              pricePrecision: symbol.pricePrecision || 2,
              quantityPrecision: symbol.quantityPrecision || 3,
            }
          })
        }

        globalCache.data = precisionMap
        globalCache.loading = false
        notifyListeners()
      } catch (err: any) {
        console.error('[ExchangeInfo] 获取失败:', err)
        globalCache.error = err.message || '获取交易规则失败'
        globalCache.loading = false
        notifyListeners()
      }
    }

    globalCache.promise = fetchExchangeInfo()
  }, [])

  return {
    exchangeInfo: localState.data,
    loading: localState.loading,
    error: localState.error,
  }
}
