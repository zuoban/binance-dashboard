/**
 * 综合看板页面
 *
 * 整合持仓、订单、资产信息
 */

'use client'

import { useState, useEffect } from 'react'
import { useDashboardData, useDashboardConfig } from '@/lib/hooks'
import { PositionCards } from '@/components/dashboard/PositionCard'
import { OrderTable } from '@/components/dashboard/OrderTable'
import { ConfigPanel } from '@/components/dashboard/ConfigPanel'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'

export default function DashboardPage() {
  const [showConfig, setShowConfig] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 客户端挂载后才能显示动态内容
  useEffect(() => {
    setMounted(true)
  }, [])

  /**
   * 清除服务端缓存
   */
  const clearServerCache = async (orderTimeRange?: number) => {
    try {
      const url = orderTimeRange
        ? `/api/binance/dashboard/cache?orderTimeRange=${orderTimeRange}`
        : '/api/binance/dashboard/cache'
      await fetch(url, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  // 获取配置
  const { config, updateConfig } = useDashboardConfig()

  // 使用统一接口获取所有数据
  const {
    account,
    positions,
    orders,
    openOrdersStats,
    openOrders,
    loading,
    countdown,
  } = useDashboardData({
    autoFetch: true,
    refreshInterval: config.refreshInterval,
    orderTimeRange: config.orderTimeRange,
  })

  return (
    <div className="space-y-4">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">交易看板</h1>
          <span className="text-xs text-gray-400">
            · 每 {config.refreshInterval / 1000} 秒自动刷新{mounted && ` (${countdown}s)`}
          </span>
        </div>
        <button
          onClick={() => setShowConfig(true)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="配置"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {/* 加载状态 */}
      {loading && positions.length === 0 && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" showText />
        </div>
      )}

      {/* 主要内容 */}
      {(!loading || positions.length > 0) && (
        <>
          {/* 权益总额 */}
          {account && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-6 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">权益总额</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">
                ${(parseFloat(account.totalWalletBalance) + parseFloat(account.unrealizedProfit)).toFixed(2)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* 左侧：委托统计 + 持仓 */}
            <div className="lg:col-span-3 space-y-4">
              {/* 当前委托统计 */}
              {openOrdersStats && openOrdersStats.total > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">当前委托</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {openOrdersStats.total}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">委托总数</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {openOrdersStats.buy}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">委托买</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {openOrdersStats.sell}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">委托卖</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 持仓列表 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    当前持仓
                    {positions.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {positions.length} 个
                      </span>
                    )}
                  </h2>
                </div>

                {positions.length === 0 ? (
                  <EmptyState title="暂无持仓" description="您当前没有活跃的持仓仓位" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PositionCards positions={positions} openOrders={openOrders} />
                  </div>
                )}
              </div>
            </div>

          {/* 右侧：订单列表（从顶部开始） */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-4">
              {/* 标题 */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  最近 5 条订单
                </h2>
              </div>
              {loading && orders.length === 0 ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <>
                  {/* 订单列表 */}
                  {orders.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">无订单记录</p>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
                      <OrderTable orders={orders.slice(0, 5)} compact={true} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      {/* 配置面板 */}
      {showConfig && (
        <ConfigPanel
          refreshInterval={config.refreshInterval}
          orderTimeRangeHours={config.orderTimeRange}
          onSave={async (refreshInterval, orderTimeRangeHours) => {
            const newOrderTimeRange = orderTimeRangeHours * 60 * 60 * 1000

            // 清除旧的缓存
            await clearServerCache(config.orderTimeRange)

            // 更新配置（useEffect 会自动触发数据重新获取）
            updateConfig({ refreshInterval, orderTimeRange: newOrderTimeRange })

            setShowConfig(false)
          }}
          onCancel={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}
