/**
 * 持仓卡片组件
 */

'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { useExchangeInfo } from '@/lib/hooks'
import { calculateLiquidationDistance } from '@/lib/utils/risk'
import { Position, Order, KlineData } from '@/types/binance'
import { areKlineDataEqual, areRelevantOrdersEqual, KlineChart } from './KlineChart'

interface PositionCardProps {
  /** 持仓数据 */
  position: Position
  /** 交易规则数据 */
  exchangeInfo: Record<string, { pricePrecision: number; quantityPrecision: number }>
  /** 当前委托订单 */
  openOrders?: Order[]
  /** K线数据 */
  klines?: Record<string, KlineData[]>
  /** 当前主题 */
  theme: 'dark' | 'light'
  /** 自定义样式类名 */
  className?: string
}

interface PositionCardsProps {
  /** 持仓列表 */
  positions: Position[]
  /** 当前委托订单 */
  openOrders?: Order[]
  /** K线数据 */
  klines?: Record<string, KlineData[]>
  /** 当前主题 */
  theme: 'dark' | 'light'
  /** 自定义样式类名 */
  className?: string
}

function getSymbolPrecision(
  symbol: string,
  exchangeInfo: Record<string, { pricePrecision: number; quantityPrecision: number }>
): number {
  return exchangeInfo[symbol]?.pricePrecision ?? 2
}

function formatPrice(
  price: string | number,
  symbol: string,
  exchangeInfo: Record<string, { pricePrecision: number; quantityPrecision: number }>
): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  if (num === 0 || Number.isNaN(num)) return '0.00'
  const precision = getSymbolPrecision(symbol, exchangeInfo)
  return num.toFixed(precision)
}

function formatAmount(
  amount: string | number,
  symbol: string,
  exchangeInfo: Record<string, { pricePrecision: number; quantityPrecision: number }>
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === 0 || Number.isNaN(num)) return '0'
  const precision = exchangeInfo[symbol]?.quantityPrecision ?? 3
  return num.toFixed(precision)
}

function isLongPosition(position: Position): boolean {
  return (
    position.positionSide === 'LONG' ||
    (position.positionSide === 'BOTH' && parseFloat(position.positionAmount) > 0)
  )
}

/** 将强平距离映射为可快速扫读的视觉等级，与风险监控默认阈值保持一致。 */
function getLiquidationTone(distance: number): 'safe' | 'warning' | 'critical' {
  if (distance <= 3) {
    return 'critical'
  }
  if (distance <= 8) {
    return 'warning'
  }
  return 'safe'
}

/** 持仓卡内的强平安全距离。25% 以上视为充足空间，并在刻度上封顶展示。 */
function PositionRiskGauge({ distance }: { distance: number }) {
  const tone = getLiquidationTone(distance)
  const filledPercent = Math.min(100, (distance / 25) * 100)
  const status = tone === 'critical' ? '风险偏高' : tone === 'warning' ? '需要关注' : '安全区间'

  return (
    <section className={`position-risk-gauge position-risk-gauge--${tone}`}>
      <div className="position-risk-gauge__header">
        <span>距强平价</span>
        <div>
          <strong>{distance.toFixed(2)}%</strong>
          <span>{status}</span>
        </div>
      </div>
      <div
        className="position-risk-gauge__track"
        role="progressbar"
        aria-label="当前持仓距强平价的安全距离"
        aria-valuemin={0}
        aria-valuemax={25}
        aria-valuenow={Math.min(25, distance)}
      >
        <span style={{ width: `${filledPercent}%` }} />
        <i className="position-risk-gauge__threshold" aria-hidden="true" />
      </div>
      <div className="position-risk-gauge__scale" aria-hidden="true">
        <span>0%</span>
        <span>预警 8%</span>
        <span>25%+</span>
      </div>
    </section>
  )
}

function PositionCardComponent({
  position,
  exchangeInfo,
  openOrders = [],
  klines,
  theme,
  className = '',
}: PositionCardProps) {
  const klineData = klines?.[position.symbol] || []
  const [visibleKlineCount, setVisibleKlineCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 30
    try {
      const saved = localStorage.getItem('kline-visible-count')
      return saved ? Number.parseInt(saved, 10) : 30
    } catch {
      return 30
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('kline-visible-count', visibleKlineCount.toString())
    } catch (error) {
      console.error('Failed to save kline visible count:', error)
    }
  }, [visibleKlineCount])

  const pricePrecision = useMemo(
    () => getSymbolPrecision(position.symbol, exchangeInfo),
    [position.symbol, exchangeInfo]
  )

  const positionData = useMemo(() => {
    const unrealizedProfit = parseFloat(position.unrealizedProfit)
    const leverage = parseFloat(position.leverage)
    const positionAmount = parseFloat(position.positionAmount)
    const entryPrice = parseFloat(position.entryPrice)
    const positionValue = Math.abs(positionAmount) * entryPrice

    const isLong = isLongPosition(position)
    const isProfit = unrealizedProfit >= 0
    const liquidationDistance = calculateLiquidationDistance(position)

    return {
      unrealizedProfit,
      leverage,
      positionAmount,
      entryPrice,
      positionValue,
      isLong,
      isProfit,
      liquidationDistance,
    }
  }, [position])

  return (
    <div className={`position-card ${className}`}>
      <div className="position-card__header px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                positionData.isLong
                  ? 'bg-[#42d392]/10 text-[#73e2ad] ring-1 ring-[#42d392]/15'
                  : 'bg-[#ff7676]/10 text-[#ff9999] ring-1 ring-[#ff7676]/15'
              }`}
            >
              {positionData.isLong ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              )}
            </div>
            <div>
              <h3 className="theme-text-primary font-mono text-base font-bold tracking-tight">
                {position.symbol}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`position-direction ${positionData.isLong ? 'position-direction--long' : 'position-direction--short'}`}
                >
                  {positionData.isLong ? '做多' : '做空'}
                </span>
                <span className="theme-text-muted text-xs font-medium">·</span>
                <span className="theme-text-secondary text-xs font-medium">
                  {positionData.leverage}x 杠杆
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span
                className={`position-pnl ${positionData.isProfit ? 'position-pnl--positive' : 'position-pnl--negative'}`}
              >
                {positionData.isProfit ? '+' : ''}${positionData.unrealizedProfit.toFixed(2)}
              </span>
              <span
                className={`position-pnl-percent ${positionData.isProfit ? 'position-pnl--positive' : 'position-pnl--negative'}`}
              >
                {positionData.isProfit ? '+' : ''}
                {((positionData.unrealizedProfit / positionData.positionValue) * 100).toFixed(2)}%
              </span>
            </div>
            <div
              className={`position-pnl-status ${positionData.isProfit ? 'position-pnl--positive' : 'position-pnl--negative'}`}
            >
              {positionData.isProfit ? '盈利中' : '亏损中'}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          <div className="position-metric space-y-1">
            <div className="position-metric__label">持仓金额</div>
            <div className="position-metric__value">${positionData.positionValue.toFixed(2)}</div>
          </div>

          <div className="position-metric space-y-1">
            <div className="position-metric__label">持仓数量</div>
            <div className="position-metric__value">
              {formatAmount(Math.abs(positionData.positionAmount), position.symbol, exchangeInfo)}
            </div>
          </div>

          <div className="position-metric space-y-1">
            <div className="position-metric__label">入场价格</div>
            <div className="position-metric__value">
              ${formatPrice(position.entryPrice, position.symbol, exchangeInfo)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          <div className="position-metric space-y-1">
            <div className="position-metric__label">标记价格</div>
            <div className="position-metric__value text-base font-bold">
              ${formatPrice(position.markPrice, position.symbol, exchangeInfo)}
            </div>
          </div>

          <div className="position-metric space-y-1">
            <div className="position-metric__label">盈亏平衡价</div>
            {position.breakEvenPrice && parseFloat(position.breakEvenPrice) > 0 ? (
              <span className="position-break-even">
                ${formatPrice(position.breakEvenPrice, position.symbol, exchangeInfo)}
              </span>
            ) : (
              <span className="theme-text-muted text-sm">-</span>
            )}
          </div>

          <div className="position-metric space-y-1">
            <div className="position-metric__label">强平价格</div>
            {position.liquidationPrice && parseFloat(position.liquidationPrice) > 0 ? (
              <span className="position-liquidation">
                ${formatPrice(position.liquidationPrice, position.symbol, exchangeInfo)}
              </span>
            ) : (
              <span className="theme-text-muted text-sm">-</span>
            )}
          </div>
        </div>

        {positionData.liquidationDistance !== null && (
          <PositionRiskGauge distance={positionData.liquidationDistance} />
        )}
      </div>

      <div className="relative">
        <KlineChart
          symbol={position.symbol}
          data={klineData}
          height={400}
          pricePrecision={pricePrecision}
          openOrders={openOrders}
          visibleCount={visibleKlineCount}
          theme={theme}
        />

        <div className="chart-density-control absolute bottom-3 right-3 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="10"
              max="50"
              step="10"
              value={visibleKlineCount}
              onChange={e => setVisibleKlineCount(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, var(--success) 0%, var(--success) ${((visibleKlineCount - 10) / 40) * 100}%, var(--range-track) ${((visibleKlineCount - 10) / 40) * 100}%, var(--range-track) 100%)`,
              }}
              className="h-1.5 w-32 cursor-pointer appearance-none rounded-full border-none outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#dff9eb] [&::-webkit-slider-thumb]:bg-[#42d392] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-[#42d392]/40 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#dff9eb] [&::-moz-range-thumb]:bg-[#42d392]"
            />
            <span className="theme-success-text min-w-[20px] text-right font-mono text-xs font-semibold tabular-nums">
              {visibleKlineCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * SSE 每次推送都会创建新的对象。仅当当前仓位展示的数据、相关挂单或 K 线变化时重绘卡片。
 */
function arePositionCardPropsEqual(previous: PositionCardProps, next: PositionCardProps): boolean {
  const previousPosition = previous.position
  const nextPosition = next.position
  const symbol = previousPosition.symbol

  const isPositionEqual =
    previousPosition.symbol === nextPosition.symbol &&
    previousPosition.positionAmount === nextPosition.positionAmount &&
    previousPosition.entryPrice === nextPosition.entryPrice &&
    previousPosition.markPrice === nextPosition.markPrice &&
    previousPosition.unrealizedProfit === nextPosition.unrealizedProfit &&
    previousPosition.liquidationPrice === nextPosition.liquidationPrice &&
    previousPosition.breakEvenPrice === nextPosition.breakEvenPrice &&
    previousPosition.leverage === nextPosition.leverage &&
    previousPosition.positionSide === nextPosition.positionSide

  return (
    isPositionEqual &&
    previous.exchangeInfo === next.exchangeInfo &&
    previous.className === next.className &&
    previous.theme === next.theme &&
    areKlineDataEqual(previous.klines?.[symbol] || [], next.klines?.[symbol] || []) &&
    areRelevantOrdersEqual(previous.openOrders || [], next.openOrders || [], symbol)
  )
}

export const PositionCard = memo(PositionCardComponent, arePositionCardPropsEqual)

export function PositionCards({
  positions,
  openOrders,
  klines,
  theme,
  className = '',
}: PositionCardsProps) {
  const { exchangeInfo } = useExchangeInfo()

  return (
    <div className={`space-y-2 ${className}`}>
      {positions.map(position => (
        <PositionCard
          key={position.symbol}
          position={position}
          exchangeInfo={exchangeInfo}
          openOrders={openOrders}
          klines={klines}
          theme={theme}
        />
      ))}
    </div>
  )
}
