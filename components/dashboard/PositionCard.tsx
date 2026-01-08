/**
 * 持仓卡片组件
 */

'use client'

import { Position } from '@/types/binance'
import { useExchangeInfo } from '@/lib/hooks'

interface PositionCardProps {
  /** 持仓数据 */
  position: Position
  /** 交易规则数据 */
  exchangeInfo: Record<string, { pricePrecision: number; quantityPrecision: number }>
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
export function PositionCard({ position, exchangeInfo, className = '' }: PositionCardProps) {
  const unrealizedProfit = parseFloat(position.unrealizedProfit)
  const leverage = parseFloat(position.leverage)
  const positionAmount = parseFloat(position.positionAmount)
  const entryPrice = parseFloat(position.entryPrice)
  const positionValue = positionAmount * entryPrice

  const isLong = position.positionSide === 'LONG'
  const isProfit = unrealizedProfit >= 0

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 transition-all duration-200 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 ${
        isProfit ? 'shadow-emerald-500/5' : 'shadow-red-500/5'
      } ${className}`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {position.symbol}
          </h3>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              isLong
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {isLong ? '做多' : '做空'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">{leverage}x</span>
        </div>
      </div>

      {/* 数据 */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">持仓金额</span>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            ${positionValue.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">持仓数量</span>
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            {formatAmount(position.positionAmount, position.symbol, exchangeInfo)}
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">入场价格</span>
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            ${formatPrice(position.entryPrice, position.symbol, exchangeInfo)}
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">标记价格</span>
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            ${formatPrice(position.markPrice, position.symbol, exchangeInfo)}
          </span>
        </div>

        {position.liquidationPrice && parseFloat(position.liquidationPrice) > 0 && (
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">强平价格</span>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              ${formatPrice(position.liquidationPrice, position.symbol, exchangeInfo)}
            </span>
          </div>
        )}
      </div>

      {/* 底部：未实现盈亏 */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">未实现盈亏</span>
          <div className="flex items-center gap-1">
            <span
              className={`text-sm font-bold ${
                isProfit
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
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
  /** 自定义样式类名 */
  className?: string
}

export function PositionCards({ positions, className = '' }: PositionCardsProps) {
  const { exchangeInfo } = useExchangeInfo()

  if (positions.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">暂无持仓</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {positions.map(position => (
        <PositionCard key={position.symbol} position={position} exchangeInfo={exchangeInfo} />
      ))}
    </div>
  )
}
