/**
 * 持仓卡片组件
 */

'use client'

import { Position, Order } from '@/types/binance'
import { useExchangeInfo } from '@/lib/hooks'
import { useMemo } from 'react'

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
 * 计算价格百分比
 */
function calculatePercentage(basePrice: string, targetPrice: string): number {
  const base = parseFloat(basePrice)
  const target = parseFloat(targetPrice)
  if (base === 0 || Number.isNaN(base) || Number.isNaN(target)) return 0
  return ((target - base) / base) * 100
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
 * 获取最近的买卖单
 */
function getNearbyOrders(orders: Order[], symbol: string) {
  const relatedOrders = orders.filter(order => order.symbol === symbol)

  const nearbyBuyOrder = relatedOrders
    .filter(
      order =>
        order.side === 'BUY' && (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED')
    )
    .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))[0]

  const nearbySellOrder = relatedOrders
    .filter(
      order =>
        order.side === 'SELL' && (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED')
    )
    .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))[0]

  return { nearbyBuyOrder, nearbySellOrder }
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

  const { nearbyBuyOrder, nearbySellOrder } = useMemo(
    () => getNearbyOrders(openOrders, position.symbol),
    [openOrders, position.symbol]
  )

  return (
    <div
      className={`card relative p-3 transition-all duration-300 hover:scale-[1.02] ${
        positionData.isProfit
          ? 'hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10'
          : 'hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10'
      } ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 tracking-wide">{position.symbol}</h3>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide ${
              positionData.isLong
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            {positionData.isLong ? '做多' : '做空'}
          </span>
        </div>

        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200">
          {positionData.leverage}x
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-xs text-slate-500 font-medium">持仓金额</span>
          <span className="text-sm font-bold text-slate-900">
            ${positionData.positionValue.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-xs text-slate-500 font-medium">持仓数量</span>
          <span className="text-sm font-semibold text-slate-700">
            {formatAmount(Math.abs(positionData.positionAmount), position.symbol, exchangeInfo)}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-xs text-slate-500 font-medium">入场价格</span>
          <span className="text-sm font-semibold text-slate-700">
            ${formatPrice(position.entryPrice, position.symbol, exchangeInfo)}
          </span>
        </div>

        {position.breakEvenPrice && parseFloat(position.breakEvenPrice) > 0 && (
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">盈亏平衡价</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-amber-600">
                ${formatPrice(position.breakEvenPrice, position.symbol, exchangeInfo)}
              </span>
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  parseFloat(position.breakEvenPrice) > parseFloat(position.markPrice)
                    ? 'text-emerald-700 bg-emerald-100'
                    : parseFloat(position.breakEvenPrice) < parseFloat(position.markPrice)
                      ? 'text-red-700 bg-red-100'
                      : 'text-slate-600 bg-slate-100'
                }`}
              >
                {calculatePercentage(position.markPrice, position.breakEvenPrice) > 0 ? '+' : ''}
                {calculatePercentage(position.markPrice, position.breakEvenPrice).toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {position.liquidationPrice && parseFloat(position.liquidationPrice) > 0 && (
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">强平价格</span>
            <span className="text-sm font-semibold text-red-600">
              ${formatPrice(position.liquidationPrice, position.symbol, exchangeInfo)}
            </span>
          </div>
        )}

        {nearbyBuyOrder && (
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">委托买价</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-600">
                ${formatPrice(nearbyBuyOrder.price, position.symbol, exchangeInfo)}
              </span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded text-slate-600 bg-slate-100">
                {calculatePercentage(nearbyBuyOrder.price, position.markPrice) > 0 ? '+' : ''}
                {calculatePercentage(nearbyBuyOrder.price, position.markPrice).toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-xs text-slate-500 font-medium">标记价格</span>
          <span className="text-sm font-semibold text-blue-600">
            ${formatPrice(position.markPrice, position.symbol, exchangeInfo)}
          </span>
        </div>

        {nearbySellOrder && (
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-500 font-medium">委托卖价</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-red-600">
                ${formatPrice(nearbySellOrder.price, position.symbol, exchangeInfo)}
              </span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded text-slate-600 bg-slate-100">
                {calculatePercentage(position.markPrice, nearbySellOrder.price) > 0 ? '+' : ''}
                {calculatePercentage(position.markPrice, nearbySellOrder.price).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">未实现盈亏</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-base font-bold tracking-wide ${
                positionData.isProfit ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {positionData.isProfit ? '+' : ''}$
              {formatPrice(positionData.unrealizedProfit, position.symbol, exchangeInfo)}
            </span>
          </div>
        </div>
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

  if (positions.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">暂无持仓</p>
      </div>
    )
  }

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
