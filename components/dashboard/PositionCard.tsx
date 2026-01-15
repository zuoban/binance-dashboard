/**
 * 持仓卡片组件
 */

'use client'

import { Position, Order } from '@/types/binance'
import { useExchangeInfo } from '@/lib/hooks'

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
  const precision = exchangeInfo[symbol]?.pricePrecision
  if (precision !== undefined) {
    return precision
  }
  return 2
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
  if (num === 0) return '0.00'
  if (isNaN(num)) return '0.00'
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
  if (num === 0) return '0'
  if (isNaN(num)) return '0'
  const precision = exchangeInfo[symbol]?.quantityPrecision || 3
  return num.toFixed(precision)
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
  const unrealizedProfit = parseFloat(position.unrealizedProfit)
  const leverage = parseFloat(position.leverage)
  const positionAmount = parseFloat(position.positionAmount)
  const entryPrice = parseFloat(position.entryPrice)
  const positionValue = Math.abs(positionAmount) * entryPrice

  // 过滤出与当前持仓相关的委托订单
  const relatedOpenOrders = openOrders.filter(order => order.symbol === position.symbol)

  // 找到最近的买单（价格最高的买单）
  const nearbyBuyOrder = relatedOpenOrders
    .filter(
      order =>
        order.side === 'BUY' && (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED')
    )
    .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))[0]

  // 找到最近的卖单（价格最低的卖单）
  const nearbySellOrder = relatedOpenOrders
    .filter(
      order =>
        order.side === 'SELL' && (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED')
    )
    .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))[0]

  // 判断持仓方向：
  // 1. 双向持仓模式：positionSide 为 LONG 或 SHORT
  // 2. 单向持仓模式：positionSide 为 BOTH，通过 positionAmt 的正负判断（正数为做多，负数为做空）
  const isLong =
    position.positionSide === 'LONG' || (position.positionSide === 'BOTH' && positionAmount > 0)
  const isProfit = unrealizedProfit >= 0

  return (
    <div
      className={`card p-2.5 transition-all duration-200 ${
        isProfit
          ? 'hover:border-[#10b981]/50 hover:glow-success'
          : 'hover:border-[#ef4444]/50 hover:glow-danger'
      } ${className}`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold text-[#f4f4f5]">{position.symbol}</h3>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isLong ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#ef4444]/10 text-[#ef4444]'
            }`}
          >
            {isLong ? '多' : '空'}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-[#71717a] bg-[#1a1a2e] px-1.5 py-0.5 rounded">
            {leverage}x
          </span>
        </div>
      </div>

      {/* 数据 */}
      <div className="space-y-1 mb-1.5">
        <div className="flex justify-between items-center py-0.5 border-b border-[#1e1e32]">
          <span className="text-[10px] text-[#71717a]">持仓金额</span>
          <span className="text-[10px] font-semibold text-[#f4f4f5]">
            ${positionValue.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center py-0.5 border-b border-[#1e1e32]">
          <span className="text-[10px] text-[#71717a]">持仓数量</span>
          <span className="text-[10px] font-medium text-[#f4f4f5]">
            {formatAmount(Math.abs(positionAmount), position.symbol, exchangeInfo)}
          </span>
        </div>

        <div className="flex justify-between items-center py-0.5 border-b border-[#1e1e32]">
          <span className="text-[10px] text-[#71717a]">入场价格</span>
          <span className="text-[10px] font-medium text-[#f4f4f5]">
            ${formatPrice(position.entryPrice, position.symbol, exchangeInfo)}
          </span>
        </div>

        {position.breakEvenPrice && parseFloat(position.breakEvenPrice) > 0 && (
          <div className="flex justify-between items-center py-0.5 border-b border-[#1e1e32]">
            <span className="text-[10px] text-[#71717a]">盈亏平衡价</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-[#f59e0b]">
                ${formatPrice(position.breakEvenPrice, position.symbol, exchangeInfo)}
              </span>
              <span
                className={`text-[10px] ${
                  parseFloat(position.breakEvenPrice) > parseFloat(position.markPrice)
                    ? 'text-[#10b981]'
                    : parseFloat(position.breakEvenPrice) < parseFloat(position.markPrice)
                      ? 'text-[#ef4444]'
                      : 'text-[#71717a]'
                }`}
              >
                (
                {(
                  ((parseFloat(position.breakEvenPrice) - parseFloat(position.markPrice)) /
                    parseFloat(position.markPrice)) *
                  100
                ).toFixed(2)}
                %)
              </span>
            </div>
          </div>
        )}

        {position.liquidationPrice && parseFloat(position.liquidationPrice) > 0 && (
          <div className="flex justify-between items-center py-0.5 border-b border-[#1e1e32]">
            <span className="text-[10px] text-[#71717a]">强平价格</span>
            <span className="text-[10px] font-medium text-[#ef4444]">
              ${formatPrice(position.liquidationPrice, position.symbol, exchangeInfo)}
            </span>
          </div>
        )}

        {/* 最近委托买单 */}
        {nearbyBuyOrder && (
          <div className="flex justify-between items-center py-0.5 border-b border-[#1e1e32]">
            <span className="text-[10px] text-[#71717a]">委托买价</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-[#10b981]">
                ${formatPrice(nearbyBuyOrder.price, position.symbol, exchangeInfo)}
              </span>
              <span className="text-[10px] text-[#71717a]">
                (
                {(
                  ((parseFloat(position.markPrice) - parseFloat(nearbyBuyOrder.price)) /
                    parseFloat(position.markPrice)) *
                  100
                ).toFixed(2)}
                %)
              </span>
            </div>
          </div>
        )}

        {/* 标记价格 */}
        <div className="flex justify-between items-center py-0.5 border-b border-[#1e1e32]">
          <span className="text-[10px] text-[#71717a]">标记价格</span>
          <span className="text-[10px] font-medium text-[#3b82f6]">
            ${formatPrice(position.markPrice, position.symbol, exchangeInfo)}
          </span>
        </div>

        {/* 最近委托卖单 */}
        {nearbySellOrder && (
          <div className="flex justify-between items-center py-0.5">
            <span className="text-[10px] text-[#71717a]">委托卖价</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-[#ef4444]">
                ${formatPrice(nearbySellOrder.price, position.symbol, exchangeInfo)}
              </span>
              <span className="text-[10px] text-[#71717a]">
                (
                {(
                  ((parseFloat(nearbySellOrder.price) - parseFloat(position.markPrice)) /
                    parseFloat(position.markPrice)) *
                  100
                ).toFixed(2)}
                %)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 底部：未实现盈亏 */}
      <div className="pt-1.5 border-t border-[#1e1e32]">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[#71717a]">未实现盈亏</span>
          <div className="flex items-center gap-0.5">
            <span className={`text-xs font-bold ${isProfit ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {isProfit ? '+' : ''}${formatPrice(unrealizedProfit, position.symbol, exchangeInfo)}
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
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">暂无持仓</p>
      </div>
    )
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
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
