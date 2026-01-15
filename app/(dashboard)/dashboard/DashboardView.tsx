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
import { Order } from '@/types/binance'

function calculateTotalPnl(orders: Order[]): number {
  return orders.reduce((total, order) => {
    if (order.realizedPnl !== undefined) {
      return total + parseFloat(order.realizedPnl)
    }
    return total
  }, 0)
}

function formatRecentOrderTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) {
    return `${seconds}秒前`
  }

  if (minutes < 60) {
    return `${minutes}分钟前`
  }

  if (hours < 24) {
    return `${hours}小时前`
  }

  const days = Math.floor(hours / 24)
  if (days === 1) {
    return '昨天'
  }

  if (days < 7) {
    return `${days}天前`
  }

  return format(new Date(timestamp), 'MM-dd HH:mm')
}

function formatNumber(num: number, decimals: number = 2): string {
  const formatted = num.toFixed(decimals)
  if (decimals > 0) {
    return formatted.replace(/\.?0+$/, '')
  }
  return formatted
}

function StatCard({
  title,
  value,
  subtext,
  color,
  subtitle,
}: {
  title: string
  value: string | number
  subtext?: string
  color?: string
  subtitle?: string
}) {
  return (
    <div className="card p-2">
      <p className="text-[10px] text-[#71717a] mb-1">{title}</p>
      <p className={`text-lg font-bold ${color || 'text-[#f4f4f5]'}`}>{value}</p>
      {subtext && <p className="text-[10px] text-[#71717a]">{subtext}</p>}
      {subtitle && <p className="text-[10px] text-[#71717a]">{subtitle}</p>}
    </div>
  )
}

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

  const totalPnl = orders.length > 0 ? calculateTotalPnl(orders) : 0

  return (
    <div className="space-y-3">
      {/* 顶部连接状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full status-dot ${
              isConnecting ? 'bg-[#f59e0b]' : isConnected ? 'bg-[#10b981]' : 'bg-[#ef4444]'
            }`}
            title={isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接'}
          />
          <span className="text-[10px] text-[#71717a]">
            {isConnecting ? '连接中...' : isConnected ? '实时连接' : '连接断开'}
          </span>
          {lastUpdate && (
            <span className="text-[10px] text-[#71717a]">
              · {format(new Date(lastUpdate), 'HH:mm:ss')}
            </span>
          )}
        </div>
        {!isConnected && !isConnecting && (
          <button
            onClick={reconnect}
            className="px-2 py-0.5 text-[10px] font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1e1e32] rounded transition-all duration-200"
            title="重新连接"
          >
            重新连接
          </button>
        )}
      </div>

      {/* 加载状态 */}
      {loading && positions.length === 0 && (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="md" showText />
        </div>
      )}

      {/* 主要内容 */}
      {(!loading || positions.length > 0) && (
        <>
          {/* 统计卡片行 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* 权益总额 */}
            {account && (
              <StatCard
                title="权益总额"
                value={`$${formatNumber(totalEquity)}`}
                color="text-gradient"
              />
            )}

            {/* 当前委托统计 */}
            {openOrdersStats && openOrdersStats.total > 0 && (
              <StatCard
                title="当前委托"
                value={openOrdersStats.total}
                subtext={`买 ${openOrdersStats.buy} / 卖 ${openOrdersStats.sell}`}
                color="text-[#3b82f6]"
              />
            )}

            {/* 最近订单统计 */}
            {!loading && orders.length > 0 && (
              <StatCard
                title="最近订单"
                value={`${totalPnl >= 0 ? '+' : ''}$${formatNumber(totalPnl)}`}
                subtext={`买 ${orders.filter(o => o.side === 'BUY').length} / 卖 ${orders.filter(o => o.side === 'SELL').length}`}
                subtitle={`${formatRecentOrderTime(orders[0].time)} ${orders[0].side === 'BUY' ? '买' : '卖'}`}
                color={totalPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}
              />
            )}
          </div>

          {/* 主要内容区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* 左侧：持仓 */}
            <div className="lg:col-span-3">
              <div>
                {positions.length === 0 ? (
                  <EmptyState title="暂无持仓" description="您当前没有活跃的持仓仓位" />
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                    <PositionCards positions={positions} openOrders={openOrders} />
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：订单列表 */}
            <div className="lg:col-span-1">
              <div className="card overflow-hidden sticky top-16">
                <div className="px-3 py-2 border-b border-[#1e1e32] bg-[#13131f]">
                  <h2 className="text-[10px] font-semibold text-[#f4f4f5]">最近 10 条订单</h2>
                </div>
                {loading && orders.length === 0 ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : null}
                {!loading && orders.length > 0 && (
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin">
                    <OrderTable orders={orders.slice(0, 10)} compact={true} />
                  </div>
                )}
                {!loading && orders.length === 0 && (
                  <div className="p-4 text-center">
                    <p className="text-[10px] text-[#71717a]">无订单记录</p>
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
