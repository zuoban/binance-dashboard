/**
 * Dashboard 视图组件
 *
 * 包含实际的数据获取和 UI 渲染逻辑
 */

'use client'

import { useDashboardWebSocket } from '@/lib/hooks'
import { useIsMounted } from '@/lib/hooks'
import { PositionCards } from '@/components/dashboard/PositionCard'
import { OrderTable } from '@/components/dashboard/OrderTable'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { format } from 'date-fns'

export function DashboardView() {
  const mounted = useIsMounted()

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
    onError: err => {
      console.error('[Dashboard] WebSocket error:', err)
    },
    onConnectionChange: connected => {
      console.log('[Dashboard] Connection state changed:', connected)
    },
  })

  if (!mounted) {
    return <></>
  }

  const totalEquity = account
    ? parseFloat(account.totalWalletBalance) + parseFloat(account.unrealizedProfit)
    : 0
  const isProfit = account && parseFloat(account.unrealizedProfit) >= 0

  return (
    <div className="space-y-6">
      {/* 顶部连接状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full status-dot ${
              isConnecting ? 'bg-[#f59e0b]' : isConnected ? 'bg-[#10b981]' : 'bg-[#ef4444]'
            }`}
            title={isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接'}
          />
          <span className="text-xs text-[#71717a]">
            {isConnecting ? '连接中...' : isConnected ? '实时连接' : '连接断开'}
          </span>
          {lastUpdate && (
            <span className="text-xs text-[#71717a]">
              · 更新于 {format(new Date(lastUpdate), 'HH:mm:ss')}
            </span>
          )}
        </div>
        {!isConnected && !isConnecting && (
          <button
            onClick={reconnect}
            className="px-3 py-1.5 text-xs font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1e1e32] rounded-lg transition-all duration-200"
            title="重新连接"
          >
            重新连接
          </button>
        )}
      </div>

      {/* 加载状态 */}
      {loading && positions.length === 0 && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" showText />
        </div>
      )}

      {/* 主要内容 */}
      {(!loading || positions.length > 0) && (
        <>
          {/* 权益总额卡片 */}
          {account && (
            <div className="card p-6 glow-primary">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#a1a1aa] mb-2">权益总额</p>
                  <p className="text-4xl font-bold text-gradient">${totalEquity.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-sm text-[#71717a]">
                      未实现盈亏:
                      <span
                        className={`ml-1 font-medium ${
                          isProfit ? 'text-[#10b981]' : 'text-[#ef4444]'
                        }`}
                      >
                        {isProfit ? '+' : ''}${parseFloat(account.unrealizedProfit).toFixed(2)}
                      </span>
                    </p>
                    <span className="text-[#71717a]">·</span>
                    <p className="text-sm text-[#71717a]">
                      杠杆:
                      <span className="ml-1 text-[#a1a1aa]">
                        {positions.length > 0 ? positions[0].leverage : '1'}x
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isProfit ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#ef4444]/10 text-[#ef4444]'
                    }`}
                  >
                    {isProfit ? '盈利' : '亏损'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 左侧：委托统计 + 持仓 */}
            <div className="lg:col-span-3 space-y-6">
              {/* 当前委托统计 */}
              {openOrdersStats && openOrdersStats.total > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-[#f4f4f5] mb-4 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#f59e0b]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                    当前委托
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#1a1a2e] rounded-lg p-4 text-center hover:bg-[#1e1e32] transition-colors">
                      <p className="text-3xl font-bold text-[#3b82f6]">{openOrdersStats.total}</p>
                      <p className="text-xs text-[#71717a] mt-1">委托总数</p>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg p-4 text-center hover:bg-[#1e1e32] transition-colors">
                      <p className="text-3xl font-bold text-[#10b981]">
                        {openOrdersStats.buy}
                        {openOrdersStats.total > 0 && (
                          <span className="ml-1 text-lg font-normal text-[#71717a]">
                            ({((openOrdersStats.buy / openOrdersStats.total) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#71717a] mt-1">委托买</p>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg p-4 text-center hover:bg-[#1e1e32] transition-colors">
                      <p className="text-3xl font-bold text-[#ef4444]">
                        {openOrdersStats.sell}
                        {openOrdersStats.total > 0 && (
                          <span className="ml-1 text-lg font-normal text-[#71717a]">
                            ({((openOrdersStats.sell / openOrdersStats.total) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#71717a] mt-1">委托卖</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 持仓列表 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#f4f4f5] flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#f59e0b]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                    当前持仓
                    {positions.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-[#71717a]">
                        {positions.length} 个
                      </span>
                    )}
                  </h2>
                </div>

                {positions.length === 0 ? (
                  <EmptyState title="暂无持仓" description="您当前没有活跃的持仓仓位" />
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <PositionCards positions={positions} openOrders={openOrders} />
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：订单列表（从顶部开始） */}
            <div className="lg:col-span-1">
              <div className="card overflow-hidden sticky top-24">
                {/* 标题 */}
                <div className="px-4 py-3 border-b border-[#1e1e32] bg-[#13131f]">
                  <h2 className="text-sm font-semibold text-[#f4f4f5] flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#f59e0b]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    最近 5 条订单
                  </h2>
                </div>
                {loading && orders.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : /* 订单列表 */
                orders.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg
                      className="w-12 h-12 mx-auto text-[#71717a] mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-xs text-[#71717a]">无订单记录</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
                    <OrderTable orders={orders} compact={true} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
