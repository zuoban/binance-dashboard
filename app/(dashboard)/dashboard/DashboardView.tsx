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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">权益总额</p>
        </div>
        <p className="text-3xl font-bold text-gradient">${formatNumber(totalEquity)}</p>
      </div>

      {openOrdersStats && openOrdersStats.total > 0 && (
        <div className="card p-5 backdrop-blur-sm hover:bg-slate-50/50 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              当前委托
            </p>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">{openOrdersStats.total}</p>
          <p className="text-xs text-slate-400">
            买 <span className="text-emerald-600 font-medium">{openOrdersStats.buy}</span> / 卖{' '}
            <span className="text-red-500 font-medium">{openOrdersStats.sell}</span>
          </p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="card p-5 backdrop-blur-sm hover:bg-slate-50/50 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              最近订单
            </p>
          </div>
          <p
            className={`text-3xl font-bold mb-1 ${totalPnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
          >
            {totalPnl >= 0 ? '+' : ''}${formatNumber(totalPnl)}
          </p>
          <div className="flex gap-1 justify-end items-center mb-1">
            {orders.slice(0, 10).map((order, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 hover:scale-150 ${
                  order.side === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                title={`${order.side === 'BUY' ? '买入' : '卖出'} - ${formatRecentOrderTime(order.time)}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              买{' '}
              <span className="text-emerald-600">
                {orders.filter(o => o.side === 'BUY').length}
              </span>{' '}
              / 卖{' '}
              <span className="text-red-500">{orders.filter(o => o.side === 'SELL').length}</span>
            </p>
            <p className="text-xs text-slate-400">
              {formatRecentOrderTime(orders[0].time)}{' '}
              <span className={orders[0].side === 'BUY' ? 'text-emerald-600' : 'text-red-500'}>
                {orders[0].side === 'BUY' ? '买' : '卖'}
              </span>
            </p>
          </div>
        </div>
      )}
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
              isConnecting ? 'bg-amber-500' : isConnected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
            title={isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接'}
          />
          <span className="text-xs text-slate-500">
            {isConnecting ? '连接中...' : isConnected ? '实时连接' : '连接断开'}
          </span>
          {lastUpdateText && <span className="text-xs text-slate-400">· {lastUpdateText}</span>}
        </div>
        {!isConnected && !isConnecting && (
          <button
            onClick={reconnect}
            className="h-7 px-3 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
            title="重新连接"
          >
            重新连接
          </button>
        )}
      </div>

      {loading && positions.length === 0 && (
        <div className="flex justify-center py-16">
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            <div className="lg:col-span-3 p-0">
              {positions.length === 0 ? (
                <EmptyState title="暂无持仓" description="您当前没有活跃的持仓仓位" />
              ) : (
                <div className="space-y-2">
                  <PositionCards positions={positions} openOrders={openOrders} />
                </div>
              )}
            </div>

            <div className="lg:col-span-1 p-0">
              <div className="card overflow-hidden backdrop-blur-sm p-0">
                <div className="max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin p-0">
                  <OrderTable orders={orders.slice(0, 10)} compact={true} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
