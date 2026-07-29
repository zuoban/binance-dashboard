/**
 * Dashboard 视图组件
 *
 * 包含实际的数据获取和 UI 渲染逻辑
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useDashboardWebSocket,
  useExchangeInfo,
  useIsMounted,
  useRiskThresholds,
  useSessionExpiryRedirect,
} from '@/lib/hooks'
import { PositionCards } from '@/components/dashboard/PositionCard'
import { OrderModal } from '@/components/dashboard/OrderModal'
import { DataReliability, RiskMonitor } from '@/components/dashboard/DashboardSignals'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Order } from '@/types/binance'
import { getDashboardRiskAlerts } from '@/lib/utils/risk'

function calculateTotalPnl(orders: Order[]): number {
  return orders.reduce((total, order) => {
    if (order.realizedPnl !== undefined) {
      const pnl = Number.parseFloat(order.realizedPnl)
      return Number.isFinite(pnl) ? total + pnl : total
    }
    return total
  }, 0)
}

function formatRecentOrderTime(timestamp: number): string {
  const now = Date.now()
  const diff = Math.max(0, now - timestamp)

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

function formatTimeDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`
  }
  if (minutes > 0) {
    return `${minutes}分钟`
  }
  return `${seconds}秒`
}

function LastUpdateTime({ lastUpdate }: { lastUpdate: number | null }) {
  const [lastUpdateText, setLastUpdateText] = useState(() =>
    lastUpdate ? formatRecentOrderTime(lastUpdate) : ''
  )

  useEffect(() => {
    const updateTime = () => {
      setLastUpdateText(lastUpdate ? formatRecentOrderTime(lastUpdate) : '')
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [lastUpdate])

  if (!lastUpdateText) {
    return null
  }

  return (
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
  )
}

function StatsOverview({
  totalEquity,
  availableMargin,
  availableMarginPercent,
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
  availableMargin: number
  availableMarginPercent: number
  openOrdersStats: { total: number; buy: number; sell: number } | null
  orders: Order[]
  totalPnl: number
  loading: boolean
  isConnected: boolean
  isConnecting: boolean
  lastUpdate: number | null
  reconnect: () => void
}) {
  const { exchangeInfo } = useExchangeInfo()
  const { buyOrderCount, sellOrderCount } = useMemo(
    () =>
      orders.reduce(
        (counts, order) => {
          if (order.side === 'BUY') {
            counts.buyOrderCount++
          } else {
            counts.sellOrderCount++
          }
          return counts
        },
        { buyOrderCount: 0, sellOrderCount: 0 }
      ),
    [orders]
  )

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
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-400">可用保证金</span>
            <span className="font-semibold text-slate-700">${formatNumber(availableMargin)}</span>
            <span className="text-slate-400">USDC</span>
            <span className="text-slate-400">{formatNumber(availableMarginPercent, 1)}%</span>
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
            <LastUpdateTime lastUpdate={lastUpdate} />
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
          <div className="bg-white px-5 py-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  最近订单
                </p>
                <span className="text-xs text-slate-400 font-normal ml-1">{orders.length}</span>
              </div>
              <div className="flex items-center gap-3">
                {orders.length >= 2 && (
                  <>
                    <span className="text-xs text-slate-400">
                      耗时 {formatTimeDuration(orders[0].time - orders[orders.length - 1].time)}
                    </span>
                    <div className="w-px h-3 bg-slate-200" />
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">买</span>
                  <span className="text-xs font-bold text-emerald-600">{buyOrderCount}</span>
                </div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">卖</span>
                  <span className="text-xs font-bold text-red-500">{sellOrderCount}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col">
                <p
                  className={`text-4xl font-bold tracking-tight ${totalPnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                >
                  {totalPnl >= 0 ? '+' : ''}${formatNumber(totalPnl)}
                </p>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${orders[0].side === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {orders[0].side === 'BUY' ? '买入' : '卖出'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatRecentOrderTime(orders[0].time)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {orders.slice(0, 20).map(order => {
                  const orderLabel = `${order.side === 'BUY' ? '买入' : '卖出'} - ${formatRecentOrderTime(order.time)}`

                  return (
                    <OrderModal
                      key={`${order.orderId}-${order.time}`}
                      order={order}
                      exchangeInfo={exchangeInfo}
                    >
                      <button
                        type="button"
                        aria-label={`查看订单详情：${orderLabel}`}
                        className={`h-2.5 w-2.5 rounded-full transition-all duration-200 hover:scale-125 hover:ring-1 hover:ring-offset-1 ${
                          order.side === 'BUY'
                            ? 'bg-emerald-400 hover:ring-emerald-300'
                            : 'bg-red-400 hover:ring-red-300'
                        }`}
                        title={orderLabel}
                      />
                    </OrderModal>
                  )
                })}
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
  const handleConnectionError = useSessionExpiryRedirect()
  const { thresholds, saveThresholds, resetThresholds } = useRiskThresholds()

  const {
    account,
    positions,
    orders,
    openOrdersStats,
    openOrders,
    klines,
    loading,
    error,
    isConnected,
    isConnecting,
    lastUpdate,
    reconnectCount,
    reconnect,
  } = useDashboardWebSocket({ onConnectionError: handleConnectionError })

  if (!mounted) {
    return <></>
  }

  const totalEquity = account
    ? parseFloat(account.totalWalletBalance) + parseFloat(account.unrealizedProfit)
    : 0
  const availableMargin = account ? parseFloat(account.availableBalance) || 0 : 0
  const availableMarginPercent = totalEquity > 0 ? (availableMargin / totalEquity) * 100 : 0

  const totalPnl = orders.length > 0 ? calculateTotalPnl(orders) : 0
  const hasNoData = !account && positions.length === 0
  const riskAlerts = getDashboardRiskAlerts({
    positions,
    availableMarginPercent,
    isConnected,
    isConnecting,
    thresholds,
  })

  return (
    <div className="space-y-4">
      {loading && hasNoData && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="md" showText />
        </div>
      )}

      {!loading && error && hasNoData && (
        <EmptyState
          title="暂时无法加载交易数据"
          description={error}
          action={
            <button
              onClick={reconnect}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700"
            >
              立即重试
            </button>
          }
        />
      )}

      {(!loading || positions.length > 0) && !(error && hasNoData) && (
        <>
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <span>{error}</span>
              <button
                onClick={reconnect}
                className="shrink-0 text-xs font-semibold text-amber-900 underline underline-offset-2"
              >
                重试
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
            <RiskMonitor
              alerts={riskAlerts}
              thresholds={thresholds}
              onSaveThresholds={saveThresholds}
              onResetThresholds={resetThresholds}
            />
            <DataReliability
              lastUpdate={lastUpdate}
              isConnected={isConnected}
              isConnecting={isConnecting}
              reconnectCount={reconnectCount}
              dataDelayWarningSeconds={thresholds.dataDelayWarningSeconds}
            />
          </div>
          <StatsOverview
            totalEquity={totalEquity}
            availableMargin={availableMargin}
            availableMarginPercent={availableMarginPercent}
            openOrdersStats={openOrdersStats}
            orders={orders}
            totalPnl={totalPnl}
            loading={loading}
            isConnected={isConnected}
            isConnecting={isConnecting}
            lastUpdate={lastUpdate}
            reconnect={reconnect}
          />

          <div className="space-y-4">
            {positions.length === 0 ? (
              <EmptyState title="暂无持仓" description="您当前没有活跃的持仓仓位" />
            ) : (
              <div className="space-y-2">
                <PositionCards positions={positions} openOrders={openOrders} klines={klines} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
