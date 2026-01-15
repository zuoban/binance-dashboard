/**
 * 资产概览组件
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useBinanceAccount } from '@/lib/hooks'

interface AssetOverviewProps {
  /** 自定义样式类名 */
  className?: string
  /** 总余额（可选，如果不传则组件内部获取） */
  balance?: string
  /** 可用余额（可选） */
  availableBalance?: string
  /** 未实现盈亏（可选） */
  profit?: string
  /** 盈亏百分比（可选） */
  profitPercentage?: string
  /** 风险等级（可选） */
  riskLevel?: 'low' | 'medium' | 'high'
  /** 是否加载中（可选） */
  loading?: boolean
  /** 资产列表（可选） */
  assets?: Array<{ asset: string; walletBalance: string }>
  /** 今日已实现盈亏（可选） */
  todayRealizedPnl?: number
}

/**
 * 资产概览卡片
 */
export function AssetOverview({
  className = '',
  balance: externalBalance,
  availableBalance: externalAvailableBalance,
  profit: externalProfit,
  riskLevel: externalRiskLevel,
  loading: externalLoading,
  assets: externalAssets,
  todayRealizedPnl,
}: AssetOverviewProps) {
  // 如果外部没有传入数据，则内部获取
  const internal = useBinanceAccount(
    externalBalance === undefined ? { autoFetch: true } : { autoFetch: false }
  )

  const balance = externalBalance ?? internal.balance
  const availableBalance = externalAvailableBalance ?? internal.availableBalance
  const profit = externalProfit ?? internal.profit
  const riskLevel = externalRiskLevel ?? internal.riskLevel
  const loading = externalLoading ?? internal.loading
  const assets = useMemo(
    () => externalAssets ?? internal.assets ?? [],
    [externalAssets, internal.assets]
  )

  // 获取资产价格
  const [prices, setPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchPrices = async () => {
      if (assets.length === 0) return

      try {
        const symbols = assets.map(a => a.asset).join(',')
        const response = await fetch(`/api/binance/prices?symbols=${symbols}`)
        const result = await response.json()

        if (result.success) {
          setPrices(result.data)
        }
      } catch (error) {
        console.error('[AssetOverview] Failed to fetch prices:', error)
      }
    }

    fetchPrices()
  }, [assets])

  // 计算资产在 USD 中的价值
  const assetsWithUsdValue = useMemo(
    () =>
      assets.map(asset => {
        const price = prices[asset.asset] || 0
        const quantity = parseFloat(asset.walletBalance)
        const usdValue = quantity * price
        return {
          ...asset,
          usdValue,
        }
      }),
    [assets, prices]
  )

  const getProfitColor = () => {
    const profitNum = parseFloat(profit)
    if (isNaN(profitNum)) return 'text-gray-600 dark:text-gray-400'
    return profitNum >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 ${className}`}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded"></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded"></div>
            <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded"></div>
            <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 ${className}`}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">账户概览</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">风险</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              riskLevel === 'high'
                ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : riskLevel === 'medium'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            }`}
          >
            {riskLevel === 'high' ? '高' : riskLevel === 'medium' ? '中' : '低'}
          </span>
        </div>
      </div>

      {/* 主要数据 */}
      <div className="space-y-4">
        {/* 总余额 */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">总余额</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${parseFloat(balance || '0').toFixed(2)}
          </p>
        </div>

        {/* 可用余额、未实现盈亏、今日已实现盈亏 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">可用余额</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              ${parseFloat(availableBalance || '0').toFixed(2)}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">未实现盈亏</p>
            <div className="flex items-center gap-1">
              <p className={`text-sm font-semibold ${getProfitColor()}`}>
                ${isNaN(parseFloat(profit)) ? '0.00' : parseFloat(profit).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">今日已实现盈亏</p>
            <p
              className={`text-sm font-semibold ${
                todayRealizedPnl && todayRealizedPnl >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : todayRealizedPnl && todayRealizedPnl < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              ${todayRealizedPnl ? todayRealizedPnl.toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* 权益总额 */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">权益总额</p>
          <p className={`text-base font-semibold ${getProfitColor()}`}>
            ${(parseFloat(balance || '0') + parseFloat(profit || '0')).toFixed(2)}
          </p>
        </div>

        {/* 资产明细 */}
        {assets.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">资产明细 (&gt;$1)</p>
            <div className="grid grid-cols-2 gap-3">
              {assetsWithUsdValue
                .filter(asset => asset.usdValue > 1)
                .map(asset => (
                  <div
                    key={asset.asset}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2"
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{asset.asset}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${asset.usdValue.toFixed(2)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
