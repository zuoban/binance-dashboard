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
import { Order } from '@/types/binance'
import { useEffect, useState } from 'react'

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

  const secondsTotal = Math.floor(diff / 1000)
  const minutesTotal = Math.floor(secondsTotal / 60)
  const hoursTotal = Math.floor(minutesTotal / 60)

  if (secondsTotal < 60) {
    return `${secondsTotal}秒前`
  }

  if (minutesTotal < 60) {
    return `${minutesTotal}分钟前`
  }

  if (hoursTotal < 24) {
    return `${hoursTotal}小时前`
  }

  const days = Math.floor(hoursTotal / 24)
  if (days === 1) {
    return '昨天'
  }

  if (days < 7) {
    return `${days}天前`
  }

  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${h}:${m}`
}

function formatNumber(num: number, decimals: number = 2): string {
  const formatted = num.toFixed(decimals)
  if (decimals > 0) {
    return formatted.replace(/\.?0+$/, '')
  }
  return formatted
}

function StatsOverview({
  totalEquity,
  openOrdersStats,
  orders,
  totalPnl,
  loading,
}: {
  totalEquity: number
  openOrdersStats: { total: number; buy: number; sell: number } | null
  orders: Order[]
  totalPnl: number
  loading: boolean
}) {
  return (
    <div className="card p-4 backdrop-blur-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 px-1 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
            <p className="text-xs font-semibold text-[#a1a1aa]">权益总额</p>
          </div>
          <p className="text-2xl font-bold text-gradient">${formatNumber(totalEquity)}</p>
        </div>
        {openOrdersStats && openOrdersStats.total > 0 && (
          <div className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-[#1a1a2e] transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              <p className="text-xs font-semibold text-[#a1a1aa]">当前委托</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#3b82f6]">{openOrdersStats.total}</p>
              <p className="text-[10px] text-[#71717a]">
                买 <span className="text-[#10b981]">{openOrdersStats.buy}</span> / 卖{' '}
                <span className="text-[#ef4444]">{openOrdersStats.sell}</span>
              </p>
            </div>
          </div>
        )}
        {!loading && orders.length > 0 && (
          <div className="flex items-start justify-between py-2 px-1 rounded-lg hover:bg-[#1a1a2e] transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
              <p className="text-xs font-semibold text-[#a1a1aa]">最近订单</p>
            </div>
            <div className="text-right space-y-1.5">
              <p
                className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}
              >
                {totalPnl >= 0 ? '+' : ''}${formatNumber(totalPnl)}
              </p>
              <div className="flex gap-1 justify-end items-center">
                {orders.slice(0, 10).map((order, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-200 hover:scale-150 ${
                      order.side === 'BUY' ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                    }`}
                    title={`${order.side === 'BUY' ? '买入' : '卖出'} - ${formatRecentOrderTime(order.time)}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <p className="text-[10px] text-[#71717a]">
                  买{' '}
                  <span className="text-[#10b981]">
                    {orders.filter(o => o.side === 'BUY').length}
                  </span>{' '}
                  / 卖{' '}
                  <span className="text-[#ef4444]">
                    {orders.filter(o => o.side === 'SELL').length}
                  </span>
                </p>
              </div>
              <p className="text-[10px] text-[#71717a]">
                {formatRecentOrderTime(orders[0].time)}{' '}
                <span className={orders[0].side === 'BUY' ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                  {orders[0].side === 'BUY' ? '买' : '卖'}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardView() {
  const mounted = useIsMounted()
  const [lastUpdateText, setLastUpdateText] = useState('')

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

  useEffect(() => {
    if (!lastUpdate) {
      setTimeout(() => setLastUpdateText(''), 0)
      return
    }

    const updateTime = () => {
      setLastUpdateText(formatRecentOrderTime(lastUpdate))
    }

    setTimeout(() => updateTime(), 0)
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [lastUpdate])

  if (!mounted) {
    return <></>
  }

  const totalEquity = account
    ? parseFloat(account.totalWalletBalance) + parseFloat(account.unrealizedProfit)
    : 0

  const totalPnl = orders.length > 0 ? calculateTotalPnl(orders) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full status-dot flex-shrink-0 ${
              isConnecting ? 'bg-[#f59e0b]' : isConnected ? 'bg-[#10b981]' : 'bg-[#ef4444]'
            }`}
            title={isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接'}
          />
          <span className="text-xs text-[#71717a]">
            {isConnecting ? '连接中...' : isConnected ? '实时连接' : '连接断开'}
          </span>
          {lastUpdateText && <span className="text-xs text-[#52525b]">· {lastUpdateText}</span>}
        </div>
        {!isConnected && !isConnecting && (
          <button
            onClick={reconnect}
            className="h-7 px-3 text-xs font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1e1e32] rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
            title="重新连接"
          >
            重新连接
          </button>
        )}
      </div>

      {loading && positions.length === 0 && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="md" showText />
        </div>
      )}

      {(!loading || positions.length > 0) && (
        <>
          <StatsOverview
            totalEquity={totalEquity}
            openOrdersStats={openOrdersStats}
            orders={orders}
            totalPnl={totalPnl}
            loading={loading}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
            <div className="lg:col-span-3">
              {positions.length === 0 ? (
                <EmptyState title="暂无持仓" description="您当前没有活跃的持仓仓位" />
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  <PositionCards positions={positions} openOrders={openOrders} />
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="card overflow-hidden sticky top-16 backdrop-blur-sm">
                <div className="px-4 py-3 border-b border-[#1e1e32] bg-[#13131f]/50">
                  <h2 className="text-xs font-semibold text-[#f4f4f5]">最近 10 条订单</h2>
                </div>
                {loading && orders.length === 0 ? (
                  <div className="flex justify-center py-6">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : null}
                {!loading && orders.length > 0 && (
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin">
                    <OrderTable orders={orders.slice(0, 10)} compact={true} />
                  </div>
                )}
                {!loading && orders.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-xs text-[#71717a]">无订单记录</p>
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
