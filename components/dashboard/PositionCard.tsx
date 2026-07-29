/**
 * 持仓卡片组件
 */

'use client'

import { Position, Order, KlineData } from '@/types/binance'
import { useExchangeInfo } from '@/lib/hooks'
import { memo, useEffect, useMemo, useState } from 'react'
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

function PositionCardComponent({
  position,
  exchangeInfo,
  openOrders = [],
  klines,
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

    return {
      unrealizedProfit,
      leverage,
      positionAmount,
      entryPrice,
      positionValue,
      isLong,
      isProfit,
    }
  }, [position])

  return (
    <div
      className={`position-card ${positionData.isProfit ? 'position-card--profit' : 'position-card--loss'} ${className}`}
    >
      <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
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
              <h3 className="font-mono text-base font-bold tracking-tight text-[#f2f7f1]">
                {position.symbol}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xs font-semibold ${
                    positionData.isLong ? 'text-[#73e2ad]' : 'text-[#ff9999]'
                  }`}
                >
                  {positionData.isLong ? '做多' : '做空'}
                </span>
                <span className="text-xs font-medium text-[#5f7771]">·</span>
                <span className="text-xs font-medium text-[#a8b9b1]">
                  {positionData.leverage}x 杠杆
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-lg font-bold ${
                  positionData.isProfit ? 'text-[#42d392]' : 'text-[#ff8585]'
                }`}
              >
                {positionData.isProfit ? '+' : ''}${positionData.unrealizedProfit.toFixed(2)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  positionData.isProfit ? 'text-[#73e2ad]' : 'text-[#ff9999]'
                }`}
              >
                {positionData.isProfit ? '+' : ''}
                {((positionData.unrealizedProfit / positionData.positionValue) * 100).toFixed(2)}%
              </span>
            </div>
            <div
              className={`mt-0.5 text-[10px] font-medium ${
                positionData.isProfit ? 'text-[#73e2ad]' : 'text-[#ff9999]'
              }`}
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
            <div className="font-mono text-base font-bold tracking-tight text-[#f2f7f1]">
              ${formatPrice(position.markPrice, position.symbol, exchangeInfo)}
            </div>
          </div>

          <div className="position-metric space-y-1">
            <div className="position-metric__label">盈亏平衡价</div>
            {position.breakEvenPrice && parseFloat(position.breakEvenPrice) > 0 ? (
              <span className="font-mono text-base font-bold text-[#f3bd62]">
                ${formatPrice(position.breakEvenPrice, position.symbol, exchangeInfo)}
              </span>
            ) : (
              <span className="text-sm text-[#526861]">-</span>
            )}
          </div>

          <div className="position-metric space-y-1">
            <div className="position-metric__label">强平价格</div>
            {position.liquidationPrice && parseFloat(position.liquidationPrice) > 0 ? (
              <span className="font-mono text-base font-bold text-[#ff8585]">
                ${formatPrice(position.liquidationPrice, position.symbol, exchangeInfo)}
              </span>
            ) : (
              <span className="text-sm text-[#526861]">-</span>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <KlineChart
          symbol={position.symbol}
          data={klineData}
          height={400}
          pricePrecision={pricePrecision}
          openOrders={openOrders}
          visibleCount={visibleKlineCount}
        />

        <div className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-[#0a1c1c]/90 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="10"
              max="50"
              step="10"
              value={visibleKlineCount}
              onChange={e => setVisibleKlineCount(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #42d392 0%, #42d392 ${((visibleKlineCount - 10) / 40) * 100}%, #26433d ${((visibleKlineCount - 10) / 40) * 100}%, #26433d 100%)`,
              }}
              className="h-1.5 w-32 cursor-pointer appearance-none rounded-full border-none outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#dff9eb] [&::-webkit-slider-thumb]:bg-[#42d392] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-[#42d392]/40 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#dff9eb] [&::-moz-range-thumb]:bg-[#42d392]"
            />
            <span className="min-w-[20px] text-right font-mono text-xs font-semibold tabular-nums text-[#73e2ad]">
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
    areKlineDataEqual(previous.klines?.[symbol] || [], next.klines?.[symbol] || []) &&
    areRelevantOrdersEqual(previous.openOrders || [], next.openOrders || [], symbol)
  )
}

export const PositionCard = memo(PositionCardComponent, arePositionCardPropsEqual)

export function PositionCards({
  positions,
  openOrders,
  klines,
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
        />
      ))}
    </div>
  )
}
