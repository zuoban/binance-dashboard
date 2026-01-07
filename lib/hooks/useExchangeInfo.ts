/**
 * 币安交易规则 Hook
 *
 * 获取并缓存交易对的精度信息
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * 交易对精度信息
 */
export interface SymbolPrecision {
  /** 价格精度 */
  pricePrecision: number;
  /** 数量精度 */
  quantityPrecision: number;
}

/**
 * 交易规则数据结构
 */
export interface ExchangeInfoData {
  [symbol: string]: SymbolPrecision;
}

/**
 * Hook 返回值
 */
interface UseExchangeInfoReturn {
  /** 交易规则数据 */
  exchangeInfo: ExchangeInfoData;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 获取交易规则 Hook
 */
export function useExchangeInfo(): UseExchangeInfoReturn {
  const [exchangeInfo, setExchangeInfo] = useState<ExchangeInfoData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/binance/exchange-info');
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error?.message || '获取交易规则失败');
        }

        // 解析交易规则数据
        const precisionMap: ExchangeInfoData = {};

        if (result.data && result.data.symbols) {
          result.data.symbols.forEach((symbol: any) => {
            precisionMap[symbol.symbol] = {
              pricePrecision: symbol.pricePrecision || 2,
              quantityPrecision: symbol.quantityPrecision || 3,
            };
          });
        }

        setExchangeInfo(precisionMap);
      } catch (err: any) {
        console.error('[ExchangeInfo] 获取失败:', err);
        setError(err.message || '获取交易规则失败');
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeInfo();
  }, []);

  return { exchangeInfo, loading, error };
}
