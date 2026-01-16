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
import { useState, useEffect } from 'react'

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
  isConnected,
  isConnecting,
  lastUpdate,
  reconnect,
}: {
  totalEquity: number
  openOrdersStats: { total: number; buy: number; sell: number } | null
  orders: Order[]
  totalPnl: number
  loading: boolean
  isConnected: boolean
  isConnecting: boolean
  lastUpdate: number | null
  reconnect: () => void
}) {
  const [lastUpdateText, setLastUpdateText] = useState('')

  useEffect(() => {
    const updateTime = () => {
      if (lastUpdate) {
        setLastUpdateText(formatRecentOrderTime(lastUpdate))
      } else {
        setLastUpdateText('')
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [lastUpdate])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card overflow-hidden backdrop-blur-sm">
        <div className="bg-white px-5 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isConnecting
                    ? 'bg-amber-500 animate-pulse'
                    : isConnected
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-red-500'
                }`}
                title={isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接'}
              />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                权益总额
              </p>
            </div>
            {!isConnected && !isConnecting && (
              <button
                onClick={reconnect}
                className="px-2.5 py-1 text-[10px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
                title="重新连接"
              >
                重新连接
              </button>
            )}
          </div>
        </div>
        <div className="px-5 py-2.5">
          <div className="flex items-baseline gap-2 mb-1.5">
            <p className="text-5xl font-bold text-slate-900 tracking-tight">
              ${formatNumber(totalEquity)}
            </p>
            <span className="text-sm font-medium text-slate-400">USDC</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  totalEquity > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  totalEquity > 0 ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {totalEquity > 0 ? '正常交易' : '空仓状态'}
              </span>
            </div>
            {lastUpdateText && (
              <>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-xs text-slate-500 font-medium">{lastUpdateText}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {openOrdersStats && openOrdersStats.total > 0 && (
        <div className="card overflow-hidden backdrop-blur-sm">
          <div className="bg-white px-5 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                当前委托
              </p>
            </div>
          </div>
          <div className="px-5 py-2.5">
            <p className="text-4xl font-bold text-slate-900 tracking-tight mb-1.5">
              {openOrdersStats.total}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400">委托</span>
              <span className="text-xs text-slate-500">买</span>
              <span className="text-lg font-bold text-emerald-600">{openOrdersStats.buy}</span>
              <div className="w-px h-3 bg-slate-200" />
              <span className="text-xs text-slate-500">卖</span>
              <span className="text-lg font-bold text-red-500">{openOrdersStats.sell}</span>
            </div>
          </div>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="card overflow-hidden backdrop-blur-sm">
          <div className="bg-white px-5 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                最近订单
              </p>
            </div>
          </div>
          <div className="px-5 py-2.5">
            <div className="flex items-center justify-between">
              <p
                className={`text-4xl font-bold tracking-tight ${totalPnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
              >
                {totalPnl >= 0 ? '+' : ''}${formatNumber(totalPnl)}
              </p>
              <div className="flex gap-1 items-center">
                {orders.slice(0, 10).map((order, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-200 hover:scale-150 cursor-pointer ${
                      order.side === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    title={`${order.side === 'BUY' ? '买入' : '卖出'} - ${formatRecentOrderTime(order.time)}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400">成交</span>
                <span className="text-xs text-slate-500">买</span>
                <span className="text-lg font-bold text-emerald-600">
                  {orders.filter(o => o.side === 'BUY').length}
                </span>
                <div className="w-px h-3 bg-slate-200" />
                <span className="text-xs text-slate-500">卖</span>
                <span className="text-lg font-bold text-red-500">
                  {orders.filter(o => o.side === 'SELL').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {formatRecentOrderTime(orders[0].time)}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                    orders[0].side === 'BUY'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {orders[0].side === 'BUY' ? '买入' : '卖出'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
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
    onError: () => {},
    onConnectionChange: () => {},
  })

  if (!mounted) {
    return <></>
  }

  const totalEquity = account
    ? parseFloat(account.totalWalletBalance) + parseFloat(account.unrealizedProfit)
    : 0

  const totalPnl = orders.length > 0 ? calculateTotalPnl(orders) : 0

  return (
    <div className="space-y-4">
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
            isConnected={isConnected}
            isConnecting={isConnecting}
            lastUpdate={lastUpdate}
            reconnect={reconnect}
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
              <div className="card overflow-hidden backdrop-blur-sm bg-transparent">
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
