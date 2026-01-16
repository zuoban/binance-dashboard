/**
 * 持仓卡片组件
 */

'use client'

import { Position, Order } from '@/types/binance'
import { useExchangeInfo, useBinanceKlines } from '@/lib/hooks'
import { useMemo } from 'react'
import { KlineChart } from './KlineChart'

interface PositionCardProps {
  /** 持仓数据 */
  position: Position
  /** 交易规则数据 */
  exchangeInfo: Record<string, { pricePrecision: number; quantityPrecision: number }>
  /** 当前委托订单 */
  openOrders?: Order[]
  /** 自定义样式类名 */
  className?: string
}

/**
 * 获取交易对的价格精度
 */
function getSymbolPrecision(
  symbol: string,
  exchangeInfo: Record<string, { pricePrecision: number; quantityPrecision: number }>
): number {
  return exchangeInfo[symbol]?.pricePrecision ?? 2
}

/**
 * 格式化价格
 */
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

/**
 * 格式化数量
 */
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

/**
 * 判断是否为做多
 */
function isLongPosition(position: Position): boolean {
  return (
    position.positionSide === 'LONG' ||
    (position.positionSide === 'BOTH' && parseFloat(position.positionAmount) > 0)
  )
}

/**
 * 单个持仓卡片
 */
export function PositionCard({
  position,
  exchangeInfo,
  openOrders = [],
  className = '',
}: PositionCardProps) {
  const { klines } = useBinanceKlines({
    symbol: position.symbol,
    interval: '15m',
    limit: 16,
  })

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
                {positionData.isProfit ? '+' : ''}$
                {formatPrice(positionData.unrealizedProfit, position.symbol, exchangeInfo)}
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

      <div className="border-t border-slate-100 px-5 py-4">
        <KlineChart
          data={klines}
          height={300}
          pricePrecision={pricePrecision}
          openOrders={openOrders}
        />
      </div>
    </div>
  )
}

/**
 * 持仓卡片列表
 */
interface PositionCardsProps {
  /** 持仓列表 */
  positions: Position[]
  /** 当前委托订单 */
  openOrders?: Order[]
  /** 自定义样式类名 */
  className?: string
}

export function PositionCards({ positions, openOrders, className = '' }: PositionCardsProps) {
  const { exchangeInfo } = useExchangeInfo()

  return (
    <div className={`space-y-2 ${className}`}>
      {positions.map(position => (
        <PositionCard
          key={position.symbol}
          position={position}
          exchangeInfo={exchangeInfo}
          openOrders={openOrders}
        />
      ))}
    </div>
  )
}
