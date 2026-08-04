/**
 * Dashboard 视图组件
 *
 * 包含实际的数据获取和 UI 渲染逻辑
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, formatISO } from 'date-fns'
import dynamic from 'next/dynamic'
import {
  useDashboardWebSocket,
  useExchangeInfo,
  useIsMounted,
  useRiskThresholds,
  useSessionExpiryRedirect,
} from '@/lib/hooks'
import { PositionCards } from '@/components/dashboard/PositionCard'
import { DataReliability, RiskMonitor } from '@/components/dashboard/DashboardSignals'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { getDashboardRiskAlerts } from '@/lib/utils/risk'
import type { Order } from '@/types/binance'

type DashboardTheme = 'dark' | 'light'

const RECENT_ORDER_LIMIT = 20

const OrderModal = dynamic(
  () =>
    import('@/components/dashboard/OrderModal').then(module => ({ default: module.OrderModal })),
  { ssr: false }
)

function calculateTotalPnl(orders: Order[]): number {
  return orders.reduce((total, order) => {
    if (order.realizedPnl !== undefined) {
      const pnl = Number.parseFloat(order.realizedPnl)
      return Number.isFinite(pnl) ? total + pnl : total
    }
    return total
  }, 0)
}

/**
 * 合并后的订单以末笔成交时间作为真实交易时间，异常数据再回退到首笔成交时间。
 */
function getOrderTradeTime(order: Order): number {
  if (Number.isFinite(order.updateTime) && order.updateTime > 0) {
    return order.updateTime
  }

  return Number.isFinite(order.time) && order.time > 0 ? order.time : 0
}

function getRecentOrders(orders: Order[]): Order[] {
  return [...orders]
    .sort((left, right) => {
      const tradeTimeDifference = getOrderTradeTime(right) - getOrderTradeTime(left)
      return tradeTimeDifference !== 0 ? tradeTimeDifference : right.time - left.time
    })
    .slice(0, RECENT_ORDER_LIMIT)
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

  return format(timestamp, 'MM-dd HH:mm')
}

function formatNumber(num: number, decimals: number = 2): string {
  const formatted = num.toFixed(decimals)
  if (decimals > 0) {
    return formatted.replace(/\.?0+$/, '')
  }
  return formatted
}

function DashboardHeader({
  isConnected,
  isConnecting,
  lastUpdate,
  reconnectCount,
  reconnect,
  dataDelayWarningSeconds,
  theme,
  onThemeChange,
}: {
  isConnected: boolean
  isConnecting: boolean
  lastUpdate: number | null
  reconnectCount: number
  reconnect: () => void
  dataDelayWarningSeconds: number
  theme: DashboardTheme
  onThemeChange: (theme: DashboardTheme) => void
}) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header__layout relative z-10">
        <div className="dashboard-identity">
          <div className="dashboard-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="m16 5 4.2 4.2L16 13.4l-4.2-4.2L16 5Z" fill="currentColor" />
              <path d="m8.8 12.2 4.2 4.2-4.2 4.2-4.2-4.2 4.2-4.2Z" fill="currentColor" />
              <path d="m23.2 12.2 4.2 4.2-4.2 4.2-4.2-4.2 4.2-4.2Z" fill="currentColor" />
              <path d="m16 19.4 4.2 4.2L16 27.8l-4.2-4.2 4.2-4.2Z" fill="currentColor" />
              <path d="m16 12.2 4.2 4.2-4.2 4.2-4.2-4.2 4.2-4.2Z" fill="currentColor" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="dashboard-identity__eyebrow">
              <p className="dashboard-overline">Futures intelligence</p>
              <span>Private desk</span>
            </div>
            <h1 className="dashboard-title">合约交易看板</h1>
            <div className="dashboard-context" aria-label="工作台信息">
              <span>USDC-M</span>
              <i aria-hidden="true" />
              <span>实时仓位</span>
              <i aria-hidden="true" />
              <span>风险与订单信号</span>
            </div>
          </div>
        </div>

        <div className="dashboard-header__side">
          <div className="dashboard-header__actions">
            <span className="dashboard-session-badge">
              <i aria-hidden="true" />
              LIVE SESSION
            </span>
            <button
              type="button"
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
              className="theme-toggle"
              aria-label={theme === 'dark' ? '切换至浅色主题' : '切换至深色主题'}
              title={theme === 'dark' ? '切换至浅色主题' : '切换至深色主题'}
            >
              {theme === 'dark' ? (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3.5" strokeWidth={1.8} />
                  <path
                    strokeLinecap="round"
                    strokeWidth={1.8}
                    d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.72 5.28l-1.41 1.41M6.69 17.31l-1.41 1.41M18.72 18.72l-1.41-1.41M6.69 6.69 5.28 5.28"
                  />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M20.5 15.2A8.5 8.5 0 1 1 8.8 3.5 6.7 6.7 0 0 0 20.5 15.2Z"
                  />
                </svg>
              )}
              <span>{theme === 'dark' ? '浅色' : '深色'}</span>
            </button>
            {!isConnected && !isConnecting && (
              <button type="button" onClick={reconnect} className="reconnect-button">
                重新连接
              </button>
            )}
          </div>
          <DataReliability
            lastUpdate={lastUpdate}
            isConnected={isConnected}
            isConnecting={isConnecting}
            reconnectCount={reconnectCount}
            dataDelayWarningSeconds={dataDelayWarningSeconds}
          />
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
}: {
  totalEquity: number
  availableMargin: number
  availableMarginPercent: number
  openOrdersStats: { total: number; buy: number; sell: number } | null
  orders: Order[]
}) {
  const { exchangeInfo } = useExchangeInfo()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const { recentOrders, totalPnl, recentBuyCount, recentSellCount, latestOrderTime } =
    useMemo(() => {
      const nextRecentOrders = getRecentOrders(orders)
      return {
        recentOrders: nextRecentOrders,
        totalPnl: calculateTotalPnl(nextRecentOrders),
        recentBuyCount: nextRecentOrders.filter(order => order.side === 'BUY').length,
        recentSellCount: nextRecentOrders.filter(order => order.side === 'SELL').length,
        latestOrderTime: nextRecentOrders[0] ? getOrderTradeTime(nextRecentOrders[0]) : 0,
      }
    }, [orders])
  const latestOrderRelativeTime =
    latestOrderTime > 0 ? formatRecentOrderTime(latestOrderTime) : null
  const orderStats = openOrdersStats || { total: 0, buy: 0, sell: 0 }
  const marginSafetyPercent = Math.min(100, Math.max(0, availableMarginPercent))
  const marginSafetyTone =
    marginSafetyPercent <= 10 ? 'critical' : marginSafetyPercent <= 25 ? 'warning' : 'healthy'
  const closeOrderModal = useCallback(() => setSelectedOrder(null), [])

  return (
    <section className="dashboard-stats-grid">
      <article className="card dashboard-stat-card dashboard-stat-card--primary">
        <div className="relative z-10 flex items-center justify-between">
          <p className="stat-label">账户权益</p>
          <span className="stat-currency-pill">USDC</span>
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
          <div
            className="margin-safety"
            aria-label={`可用保证金占比 ${formatNumber(availableMarginPercent, 1)}%`}
          >
            <div className="margin-safety__label">
              <span>保证金安全度</span>
              <strong>{formatNumber(availableMarginPercent, 1)}%</strong>
            </div>
            <div
              className={`margin-safety__track margin-safety__track--${marginSafetyTone}`}
              role="progressbar"
              aria-label="可用保证金占权益比例"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={marginSafetyPercent}
            >
              <span style={{ width: `${marginSafetyPercent}%` }} />
            </div>
          </div>
        </div>
      </article>

      <article className="card dashboard-stat-card">
        <div className="relative z-10 flex items-center justify-between">
          <p className="stat-label">当前委托</p>
          <span className="stat-icon stat-icon--info" aria-hidden="true">
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
          <span className="stat-order-count">
            买入 <strong className="stat-order-count--buy">{orderStats.buy}</strong>
          </span>
          <span className="theme-divider h-4 w-px" />
          <span className="stat-order-count">
            卖出 <strong className="stat-order-count--sell">{orderStats.sell}</strong>
          </span>
        </div>
      </article>

      <article className="card dashboard-stat-card">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="stat-label">最近订单盈亏</p>
            <span className="stat-order-total">{recentOrders.length}</span>
          </div>
          <span className="stat-icon stat-icon--gold" aria-hidden="true">
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
            className={`stat-number stat-number--compact ${totalPnl >= 0 ? 'stat-number--positive' : 'stat-number--negative'}`}
          >
            {totalPnl >= 0 ? '+' : ''}${formatNumber(totalPnl)}
          </p>
          <span className="stat-unit mb-1">REALIZED</span>
        </div>
        <div className="card-divider relative z-10 mt-4" />
        <div className="relative z-10 mt-3 flex items-center justify-between gap-3">
          <div
            className="flex shrink-0 items-center gap-3 whitespace-nowrap"
            aria-label={`近 ${recentOrders.length} 单方向统计，买入 ${recentBuyCount} 单，卖出 ${recentSellCount} 单`}
          >
            <span className="stat-order-count">
              买入 <strong className="stat-order-count--buy">{recentBuyCount}</strong>
            </span>
            <span className="theme-divider h-4 w-px" />
            <span className="stat-order-count">
              卖出 <strong className="stat-order-count--sell">{recentSellCount}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {latestOrderRelativeTime && (
              <time
                className="stat-latest-order-time"
                dateTime={formatISO(latestOrderTime)}
                aria-label={`最近一条订单交易时间：${latestOrderRelativeTime}`}
              >
                <span>最近成交</span>
                <strong>{latestOrderRelativeTime}</strong>
              </time>
            )}
            <div className="grid grid-cols-10 gap-1 sm:gap-2 md:hidden xl:grid">
              {recentOrders.map(order => {
                const orderTradeTime = getOrderTradeTime(order)
                const orderLabel = `${order.side === 'BUY' ? '买入' : '卖出'} - ${orderTradeTime > 0 ? formatRecentOrderTime(orderTradeTime) : '时间未知'}`

                return (
                  <button
                    key={`${order.orderId}-${order.time}`}
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    aria-label={`查看订单详情：${orderLabel}`}
                    className={`activity-dot ${order.side === 'BUY' ? 'activity-dot--buy' : 'activity-dot--sell'}`}
                    title={orderLabel}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </article>
      {selectedOrder && (
        <OrderModal order={selectedOrder} exchangeInfo={exchangeInfo} onClose={closeOrderModal} />
      )}
    </section>
  )
}

export function DashboardView() {
  const mounted = useIsMounted()
  const handleConnectionError = useSessionExpiryRedirect()
  const { thresholds, saveThresholds, resetThresholds } = useRiskThresholds()
  const [theme, setTheme] = useState<DashboardTheme>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }

    try {
      const savedTheme = window.localStorage.getItem('dashboard-theme')
      return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark'
    } catch {
      // 隐私模式下存储可能不可用，继续使用深色默认主题。
      return 'dark'
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem('dashboard-theme', theme)
    } catch {
      // 存储失败不影响本次会话内的主题切换。
    }
  }, [theme])

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

  const totalEquity = account
    ? parseFloat(account.totalWalletBalance) + parseFloat(account.unrealizedProfit)
    : 0
  const availableMargin = account ? parseFloat(account.availableBalance) || 0 : 0
  const availableMarginPercent = totalEquity > 0 ? (availableMargin / totalEquity) * 100 : 0

  const hasNoData = !account && positions.length === 0
  const riskAlerts = useMemo(
    () =>
      getDashboardRiskAlerts({
        positions,
        availableMarginPercent,
        isConnected,
        isConnecting,
        thresholds,
      }),
    [availableMarginPercent, isConnected, isConnecting, positions, thresholds]
  )

  if (!mounted) {
    return <></>
  }

  return (
    <div className="dashboard-workspace">
      <DashboardHeader
        isConnected={isConnected}
        isConnecting={isConnecting}
        lastUpdate={lastUpdate}
        reconnectCount={reconnectCount}
        reconnect={reconnect}
        dataDelayWarningSeconds={thresholds.dataDelayWarningSeconds}
        theme={theme}
        onThemeChange={setTheme}
      />
      {loading && hasNoData && (
        <div className="card dashboard-loading-state">
          <div className="dashboard-loading-state__visual" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <p>正在建立实时数据链路</p>
            <span>账户、仓位和行情数据将在连接后自动同步</span>
          </div>
          <LoadingSpinner size="md" />
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
            <div role="alert" className="dashboard-inline-alert">
              <span>{error}</span>
              <button onClick={reconnect} className="dashboard-inline-alert__action">
                重试
              </button>
            </div>
          )}
          <RiskMonitor
            alerts={riskAlerts}
            thresholds={thresholds}
            onSaveThresholds={saveThresholds}
            onResetThresholds={resetThresholds}
          />
          <StatsOverview
            totalEquity={totalEquity}
            availableMargin={availableMargin}
            availableMarginPercent={availableMarginPercent}
            openOrdersStats={openOrdersStats}
            orders={orders}
          />

          <section className="dashboard-positions">
            <header className="dashboard-section-header">
              <div>
                <div className="dashboard-section-header__eyebrow">
                  <span>POSITION BOOK</span>
                  <i aria-hidden="true" />
                  <span>MARK PRICE</span>
                </div>
                <h2>活跃持仓</h2>
                <p>逐仓追踪盈亏、强平距离与关键委托价位</p>
              </div>
              <div
                className="dashboard-section-header__count"
                aria-label={`${positions.length} 个持仓`}
              >
                <strong>{positions.length}</strong>
                <span>OPEN</span>
              </div>
            </header>
            {positions.length === 0 ? (
              <EmptyState title="暂无持仓" description="您当前没有活跃的持仓仓位" />
            ) : (
              <PositionCards
                positions={positions}
                openOrders={openOrders}
                klines={klines}
                theme={theme}
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}
