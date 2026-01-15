/**
 * 订单表格组件
 */

'use client'

import { useState } from 'react'
import { Order, OrderStatus } from '@/types/binance'
import { formatDistanceToNow } from '@/lib/utils/date'
import { useExchangeInfo } from '@/lib/hooks'

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

interface OrderTableProps {
  /** 订单列表 */
  orders: Order[]
  /** 自定义样式类名 */
  className?: string
  /** 是否为紧凑模式 */
  compact?: boolean
}

/**
 * 订单状态标签
 */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'FILLED':
        return {
          label: '已完成',
          className: 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30',
        }
      case 'CANCELED':
        return {
          label: '已撤销',
          className: 'bg-[#71717a]/10 text-[#71717a] border border-[#71717a]/30',
        }
      case 'NEW':
        return {
          label: '新建',
          className: 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30',
        }
      case 'PARTIALLY_FILLED':
        return {
          label: '部分成交',
          className: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30',
        }
      case 'PENDING_CANCEL':
        return {
          label: '撤销中',
          className: 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30',
        }
      case 'REJECTED':
        return {
          label: '已拒绝',
          className: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30',
        }
      case 'EXPIRED':
        return {
          label: '已过期',
          className: 'bg-[#71717a]/10 text-[#71717a] border border-[#71717a]/30',
        }
      default:
        return {
          label: status,
          className: 'bg-[#71717a]/10 text-[#71717a] border border-[#71717a]/30',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

/**
 * 订单表格
 */
export function OrderTable({ orders, className = '', compact = false }: OrderTableProps) {
  const { exchangeInfo } = useExchangeInfo()
  const [sortField, setSortField] = useState<keyof Order>('time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 排序处理（紧凑模式不支持排序）
  const handleSort = (field: keyof Order) => {
    if (compact) return // 紧凑模式不支持排序

    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // 排序后的订单
  const sortedOrders = [...orders].sort((a, b) => {
    if (compact) return 0 // 紧凑模式不排序

    const aVal = a[sortField]
    const bVal = b[sortField]

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }

    return 0
  })

  if (orders.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">暂无订单记录</p>
      </div>
    )
  }

  // 紧凑模式：只显示关键列
  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        {orders.map((order, index) => {
          const executedQty = parseFloat(order.executedQty)
          const price = parseFloat(order.price)
          const totalAmount = executedQty * price

          return (
            <div
              key={
                order.id ? `${order.id}` : `${order.orderId}-${order.symbol}-${order.time}-${index}`
              }
              className="px-4 py-3 bg-[#1a1a2e] rounded-lg hover:bg-[#1e1e32] transition-all duration-200"
            >
              {/* 第一行：交易对 + 方向 + 类型 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#f4f4f5] text-xs">{order.symbol}</span>
                  <span
                    className={`text-xs font-medium ${
                      order.side === 'BUY' ? 'text-[#10b981]' : 'text-[#ef4444]'
                    }`}
                  >
                    {order.side === 'BUY' ? '买' : '卖'}
                  </span>
                  <span className="text-[10px] text-[#71717a] bg-[#0a0a0f] px-1.5 py-0.5 rounded">
                    {order.type === 'MARKET'
                      ? '市价'
                      : order.type === 'LIMIT'
                        ? '限价'
                        : order.type}
                  </span>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              {/* 第二行：价格 + 数量 + 金额 */}
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-4">
                  <span className="text-[#71717a]">
                    <span className="font-medium text-[#f4f4f5]">
                      ${formatPrice(price, order.symbol, exchangeInfo)}
                    </span>
                  </span>
                  <span className="text-[#71717a]">
                    <span className="font-medium text-[#f4f4f5]">{executedQty.toFixed(4)}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[#71717a]">
                    <span className="font-semibold text-[#f59e0b]">${totalAmount.toFixed(2)}</span>
                  </span>
                </div>
              </div>

              {/* 第三行：手续费 + 实现盈亏 */}
              {(order.commission !== undefined || order.realizedPnl !== undefined) && (
                <div className="flex items-center justify-between text-xs mb-1.5">
                  {order.commission !== undefined && (
                    <span className="text-[#71717a]">
                      <span className="font-medium text-[#f4f4f5]">
                        {parseFloat(order.commission).toFixed(4)}
                        {order.commissionAsset && ` ${order.commissionAsset}`}
                      </span>
                    </span>
                  )}
                  {order.realizedPnl !== undefined && (
                    <span
                      className={`font-medium ${
                        parseFloat(order.realizedPnl) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                      }`}
                    >
                      {parseFloat(order.realizedPnl) >= 0 ? '+' : ''}
                      {parseFloat(order.realizedPnl).toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {/* 第四行：时间 */}
              <div className="text-[10px] text-[#71717a]">{formatDistanceToNow(order.time)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {/* 表头 */}
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              onClick={() => handleSort('time')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              时间 {sortField === 'time' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('symbol')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              交易对 {sortField === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('side')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              方向 {sortField === 'side' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('type')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              类型 {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              价格
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              数量
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              已成交
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              手续费
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              实现盈亏
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              状态
            </th>
          </tr>
        </thead>

        {/* 表体 */}
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {sortedOrders.map((order, index) => (
            <tr
              key={
                order.id ? `${order.id}` : `${order.orderId}-${order.symbol}-${order.time}-${index}`
              }
              className="hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {formatDistanceToNow(order.time)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {order.symbol}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span
                  className={`${
                    order.side === 'BUY'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {order.side === 'BUY' ? '买入' : '卖出'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {order.type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ${formatPrice(parseFloat(order.price), order.symbol, exchangeInfo)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {parseFloat(order.origQty).toFixed(4)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {parseFloat(order.executedQty).toFixed(4)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {order.commission !== undefined ? (
                  <>
                    {parseFloat(order.commission).toFixed(4)}
                    {order.commissionAsset && ` ${order.commissionAsset}`}
                  </>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {order.realizedPnl !== undefined ? (
                  <span
                    className={
                      parseFloat(order.realizedPnl) >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {parseFloat(order.realizedPnl).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <OrderStatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
