/**
 * Dashboard 视图组件
 *
 * 包含实际的数据获取和 UI 渲染逻辑
 */

'use client'

import { useEffect, useState } from 'react'
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
      <div className="h-3 w-px bg-white/10" />
      <div className="flex items-center gap-1.5">
        <svg
          className="h-3.5 w-3.5 text-[#71857c]"
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
        <span className="text-xs font-medium text-[#a8b9b1]">{lastUpdateText}</span>
      </div>
    </>
  )
}

function DashboardHeader({
  isConnected,
  isConnecting,
  lastUpdate,
  reconnect,
}: {
  isConnected: boolean
  isConnecting: boolean
  lastUpdate: number | null
  reconnect: () => void
}) {
  const statusText = isConnecting
    ? '正在建立连接'
    : isConnected
      ? '实时数据同步中'
      : '数据连接已中断'
  const statusClassName = isConnecting
    ? 'connection-pill--connecting'
    : isConnected
      ? ''
      : 'connection-pill--offline'

  return (
    <header className="dashboard-header px-5 py-5 sm:px-7 sm:py-6">
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="dashboard-brand-mark" aria-hidden="true">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="m5 15 7-7 7 7"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v11" />
            </svg>
          </div>
          <div>
            <p className="dashboard-overline">Binance Futures · Private workspace</p>
            <h1 className="dashboard-title mt-1">合约交易看板</h1>
            <p className="dashboard-subtitle">以实时仓位、风险与订单信号辅助快速决策</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
          <div className={`connection-pill ${statusClassName}`}>
            <span className={`status-dot ${isConnected ? 'status-dot--live' : ''}`} />
            {statusText}
          </div>
          {lastUpdate && (
            <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1.5 text-[11px] font-medium text-[#a8b9b1]">
              更新于 {formatRecentOrderTime(lastUpdate)}
            </span>
          )}
          {!isConnected && !isConnecting && (
            <button
              type="button"
              onClick={reconnect}
              className="rounded-full border border-[#d8b36a]/35 bg-[#d8b36a]/10 px-3 py-1.5 text-[11px] font-bold text-[#edcf90] transition hover:border-[#d8b36a]/70 hover:bg-[#d8b36a]/18"
            >
              重新连接
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

function StatsOverview({
  totalEquity,
  availableMargin,
  availableMarginPercent,
  openOrdersStats,
  orders,
  totalPnl,
  lastUpdate,
}: {
  totalEquity: number
  availableMargin: number
  availableMarginPercent: number
  openOrdersStats: { total: number; buy: number; sell: number } | null
  orders: Order[]
  totalPnl: number
  lastUpdate: number | null
}) {
  const { exchangeInfo } = useExchangeInfo()

  const orderStats = openOrdersStats || { total: 0, buy: 0, sell: 0 }
  const latestOrder = orders[0]

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article className="card dashboard-stat-card dashboard-stat-card--primary">
        <div className="relative z-10 flex items-center justify-between">
          <p className="stat-label">账户权益</p>
          <span className="rounded-full border border-[#d8b36a]/25 bg-[#d8b36a]/10 px-2 py-1 font-mono text-[10px] font-bold text-[#edcf90]">
            USDC
          </span>
        </div>
        <div className="relative z-10 mt-5 flex items-end gap-2">
          <p className="stat-number">${formatNumber(totalEquity)}</p>
          <span className="stat-unit mb-1">TOTAL</span>
        </div>
        <div className="card-divider relative z-10 mt-4" />
        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="stat-meta">
            可用保证金 <strong>${formatNumber(availableMargin)}</strong>
          </span>
          <span className="stat-meta">{formatNumber(availableMarginPercent, 1)}%</span>
          <span
            className={`flex items-center gap-1.5 text-[11px] font-bold ${totalEquity > 0 ? 'text-[#93e5ba]' : 'text-[#71857c]'}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${totalEquity > 0 ? 'bg-[#42d392]' : 'bg-[#71857c]'}`}
            />
            {totalEquity > 0 ? '交易就绪' : '空仓状态'}
          </span>
          <LastUpdateTime lastUpdate={lastUpdate} />
        </div>
      </article>

      <article className="card dashboard-stat-card">
        <div className="relative z-10 flex items-center justify-between">
          <p className="stat-label">当前委托</p>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7aa8ff]/10 text-[#9dbdff]"
            aria-hidden="true"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M7 7h10M7 12h10M7 17h6"
              />
            </svg>
          </span>
        </div>
        <div className="relative z-10 mt-5 flex items-end gap-2">
          <p className="stat-number stat-number--compact">{orderStats.total}</p>
          <span className="stat-unit mb-1">OPEN ORDERS</span>
        </div>
        <div className="card-divider relative z-10 mt-4" />
        <div className="relative z-10 mt-3 flex items-center gap-4 text-xs">
          <span className="text-[#a8b9b1]">
            买入 <strong className="ml-1 font-mono text-sm text-[#42d392]">{orderStats.buy}</strong>
          </span>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-[#a8b9b1]">
            卖出{' '}
            <strong className="ml-1 font-mono text-sm text-[#ff9292]">{orderStats.sell}</strong>
          </span>
        </div>
      </article>

      <article className="card dashboard-stat-card">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="stat-label">最近订单盈亏</p>
            <span className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#71857c]">
              {orders.length}
            </span>
          </div>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d8b36a]/10 text-[#edcf90]"
            aria-hidden="true"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="m5 15 4-4 3 3 6-7"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 7h4v4" />
            </svg>
          </span>
        </div>
        <div className="relative z-10 mt-5 flex items-end gap-2">
          <p
            className={`stat-number stat-number--compact ${totalPnl >= 0 ? 'text-[#42d392]' : 'text-[#ff8585]'}`}
          >
            {totalPnl >= 0 ? '+' : ''}${formatNumber(totalPnl)}
          </p>
          <span className="stat-unit mb-1">REALIZED</span>
        </div>
        <div className="card-divider relative z-10 mt-4" />
        <div className="relative z-10 mt-3 flex items-center justify-between gap-3">
          {latestOrder ? (
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${latestOrder.side === 'BUY' ? 'bg-[#42d392]/10 text-[#93e5ba]' : 'bg-[#ff7676]/10 text-[#ffadad]'}`}
              >
                {latestOrder.side === 'BUY' ? '买入' : '卖出'}
              </span>
              <span className="text-[11px] font-medium text-[#a8b9b1]">
                {formatRecentOrderTime(latestOrder.time)}
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-medium text-[#71857c]">等待订单数据</span>
          )}
          <div className="flex items-center gap-2">
            {orders.length >= 2 && (
              <span className="hidden text-[10px] text-[#71857c] sm:inline">
                {formatTimeDuration(orders[0].time - orders[orders.length - 1].time)}
              </span>
            )}
            <div className="grid grid-cols-5 gap-1.5">
              {orders.slice(0, 10).map(order => {
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
                      className={`h-2 w-2 rounded-full transition hover:scale-125 ${order.side === 'BUY' ? 'bg-[#42d392] hover:ring-2 hover:ring-[#42d392]/25' : 'bg-[#ff7676] hover:ring-2 hover:ring-[#ff7676]/25'}`}
                      title={orderLabel}
                    />
                  </OrderModal>
                )
              })}
            </div>
          </div>
        </div>
      </article>
    </section>
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
    <div className="space-y-4 sm:space-y-5">
      <DashboardHeader
        isConnected={isConnected}
        isConnecting={isConnecting}
        lastUpdate={lastUpdate}
        reconnect={reconnect}
      />
      {loading && hasNoData && (
        <div className="card flex justify-center py-16">
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
              className="rounded-lg border border-[#d8b36a]/35 bg-[#d8b36a]/10 px-3 py-1.5 text-xs font-bold text-[#edcf90] transition hover:bg-[#d8b36a]/20"
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
              className="flex items-center justify-between gap-3 rounded-xl border border-[#f3bd62]/25 bg-[#f3bd62]/10 px-4 py-3 text-sm text-[#f6d797]"
            >
              <span>{error}</span>
              <button
                onClick={reconnect}
                className="shrink-0 text-xs font-bold text-[#f6d797] underline underline-offset-2"
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
            lastUpdate={lastUpdate}
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
