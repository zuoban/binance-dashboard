/**
 * 综合看板页面
 *
 * 整合持仓、订单、资产信息
 */

'use client'

import { useEffect } from 'react'
import { useDashboardWebSocket } from '@/lib/hooks'
import { PositionCards } from '@/components/dashboard/PositionCard'
import { OrderTable } from '@/components/dashboard/OrderTable'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'

export default function DashboardPage() {
  // 客户端挂载后才能显示动态内容
  useEffect(() => {
    // 确保客户端渲染完成
  }, [])

  // 使用 WebSocket 接收实时数据
  const {
    account,
    positions,
    orders,
    openOrdersStats,
    openOrders,
    loading,
    isConnected,
    isConnecting,
    lastUpdate,
    reconnect,
  } = useDashboardWebSocket({
    autoConnect: true,
    onError: (err) => {
      console.error('[Dashboard] WebSocket error:', err)
    },
    onConnectionChange: (connected) => {
      console.log('[Dashboard] Connection state changed:', connected)
    },
  })

  return (
    <div className="space-y-4">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">交易看板</h1>
          {/* WebSocket 连接状态 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnecting
                  ? 'bg-yellow-400 animate-pulse'
                  : isConnected
                  ? 'bg-green-400'
                  : 'bg-red-400'
              }`}
              title={isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接'}
            />
            <span className="text-xs text-gray-400">
              {isConnecting
                ? '连接中...'
                : isConnected
                ? '实时连接'
                : '连接断开'}
            </span>
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                · 更新于 {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 重新连接按钮 */}
          {!isConnected && !isConnecting && (
            <button
              onClick={reconnect}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="重新连接"
            >
              重连
            </button>
          )}
        </div>
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
                        {openOrdersStats.total > 0 && (
                          <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                            ({((openOrdersStats.buy / openOrdersStats.total) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">委托买</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {openOrdersStats.sell}
                        {openOrdersStats.total > 0 && (
                          <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                            ({((openOrdersStats.sell / openOrdersStats.total) * 100).toFixed(1)}%)
                          </span>
                        )}
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
                      <OrderTable orders={orders} compact={true} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
