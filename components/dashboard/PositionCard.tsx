/**
 * 持仓卡片组件
 */

'use client'

import { Position, Order, KlineData } from '@/types/binance'
import { useExchangeInfo } from '@/lib/hooks'
import { useMemo, useState } from 'react'
import { KlineChart } from './KlineChart'

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

export function PositionCard({
  position,
  exchangeInfo,
  openOrders = [],
  klines,
  className = '',
}: PositionCardProps) {
  const klineData = klines?.[position.symbol] || []
  const [visibleKlineCount, setVisibleKlineCount] = useState<number | undefined>(30)

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
      className={`rounded-xl border bg-white shadow-sm transition-all duration-300 hover:shadow-md ${
        positionData.isProfit
          ? 'border-emerald-100 hover:border-emerald-200'
          : 'border-red-100 hover:border-red-200'
      } ${className}`}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                positionData.isLong ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
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
              <h3 className="text-base font-bold text-slate-900">{position.symbol}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xs font-semibold ${
                    positionData.isLong ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {positionData.isLong ? '做多' : '做空'}
                </span>
                <span className="text-xs font-medium text-slate-500">·</span>
                <span className="text-xs font-medium text-slate-500">{positionData.leverage}x</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-lg font-bold ${
                  positionData.isProfit ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {positionData.isProfit ? '+' : ''}${positionData.unrealizedProfit.toFixed(2)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  positionData.isProfit ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {positionData.isProfit ? '+' : ''}
                {((positionData.unrealizedProfit / positionData.positionValue) * 100).toFixed(2)}%
              </span>
            </div>
            <div
              className={`mt-0.5 text-[10px] font-medium ${
                positionData.isProfit ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {positionData.isProfit ? '盈利中' : '亏损中'}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-400">持仓金额</div>
            <div className="text-sm font-semibold text-slate-900">
              ${positionData.positionValue.toFixed(2)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-400">持仓数量</div>
            <div className="text-sm font-semibold text-slate-900">
              {formatAmount(Math.abs(positionData.positionAmount), position.symbol, exchangeInfo)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-400">入场价格</div>
            <div className="text-sm font-semibold text-slate-900">
              ${formatPrice(position.entryPrice, position.symbol, exchangeInfo)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-400">标记价格</div>
            <div className="text-base font-bold text-slate-900">
              ${formatPrice(position.markPrice, position.symbol, exchangeInfo)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-400">盈亏平衡价</div>
            {position.breakEvenPrice && parseFloat(position.breakEvenPrice) > 0 ? (
              <span className="text-base font-bold text-amber-600">
                ${formatPrice(position.breakEvenPrice, position.symbol, exchangeInfo)}
              </span>
            ) : (
              <span className="text-sm text-slate-300">-</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-400">强平价格</div>
            {position.liquidationPrice && parseFloat(position.liquidationPrice) > 0 ? (
              <span className="text-base font-bold text-red-600">
                ${formatPrice(position.liquidationPrice, position.symbol, exchangeInfo)}
              </span>
            ) : (
              <span className="text-sm text-slate-300">-</span>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <KlineChart
          data={klineData}
          height={400}
          pricePrecision={pricePrecision}
          openOrders={openOrders}
          visibleCount={visibleKlineCount}
        />

        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="10"
              max="50"
              step="10"
              value={visibleKlineCount || 10}
              onChange={e =>
                setVisibleKlineCount(e.target.value === '10' ? undefined : Number(e.target.value))
              }
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${(((visibleKlineCount || 10) - 10) / 40) * 100}%, #e2e8f0 ${(((visibleKlineCount || 10) - 10) / 40) * 100}%, #e2e8f0 100%)`,
              }}
              className="w-32 h-1.5 rounded-full appearance-none cursor-pointer border-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-emerald-400 [&::-webkit-slider-thumb]:to-emerald-600 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-emerald-400/50 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-emerald-400 [&::-moz-range-thumb]:to-emerald-600 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:shadow-emerald-400/50 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150 [&::-moz-range-thumb]:hover:scale-110"
            />
            <span className="text-xs font-semibold text-emerald-600 min-w-[20px] text-right tabular-nums">
              {visibleKlineCount || 10}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

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
