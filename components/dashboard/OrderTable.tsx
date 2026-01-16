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
          className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
          dot: 'bg-emerald-500',
        }
      case 'CANCELED':
        return {
          label: '已撤销',
          className: 'bg-slate-100 text-slate-600 border border-slate-200',
          dot: 'bg-slate-500',
        }
      case 'NEW':
        return {
          label: '新建',
          className: 'bg-blue-100 text-blue-700 border border-blue-200',
          dot: 'bg-blue-500',
        }
      case 'PARTIALLY_FILLED':
        return {
          label: '部分成交',
          className: 'bg-amber-100 text-amber-700 border border-amber-200',
          dot: 'bg-amber-500',
        }
      case 'PENDING_CANCEL':
        return {
          label: '撤销中',
          className: 'bg-orange-100 text-orange-700 border border-orange-200',
          dot: 'bg-orange-500',
        }
      case 'REJECTED':
        return {
          label: '已拒绝',
          className: 'bg-red-100 text-red-700 border border-red-200',
          dot: 'bg-red-500',
        }
      case 'EXPIRED':
        return {
          label: '已过期',
          className: 'bg-slate-100 text-slate-600 border border-slate-200',
          dot: 'bg-slate-500',
        }
      default:
        return {
          label: status,
          className: 'bg-slate-100 text-slate-600 border border-slate-200',
          dot: 'bg-slate-500',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold ${config.className}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
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
      <div className="flex flex-col items-center justify-center py-0">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4 mt-8">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-sm text-slate-500 font-medium">暂无订单记录</p>
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
              className="group px-3 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-xs">{order.symbol}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      order.side === 'BUY'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {order.side === 'BUY' ? '买' : '卖'}
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                    {order.type === 'MARKET'
                      ? '市价'
                      : order.type === 'LIMIT'
                        ? '限价'
                        : order.type}
                  </span>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="flex items-center justify-between text-[11px] mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[10px]">价格</span>
                    <span className="font-semibold text-slate-900">
                      ${formatPrice(price, order.symbol, exchangeInfo)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[10px]">数量</span>
                    <span className="font-semibold text-slate-900">{executedQty.toFixed(4)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[10px]">金额</span>
                  <span className="font-semibold text-slate-900">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {(order.commission !== undefined ||
                (order.realizedPnl !== undefined && order.side === 'SELL')) && (
                <div className="flex items-center justify-between text-[10px] mb-1.5 pt-1.5 border-t border-slate-100">
                  {order.commission !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">手续费</span>
                      <span className="font-medium text-slate-700">
                        {parseFloat(order.commission).toFixed(4)}
                        {order.commissionAsset && ` ${order.commissionAsset}`}
                      </span>
                    </div>
                  )}
                  {order.realizedPnl !== undefined && order.side === 'SELL' && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">盈亏</span>
                      <span
                        className={`font-semibold ${
                          parseFloat(order.realizedPnl) >= 0
                            ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded'
                            : 'text-red-600 bg-red-50 px-1.5 py-0.5 rounded'
                        }`}
                      >
                        {parseFloat(order.realizedPnl) >= 0 ? '+' : ''}
                        {parseFloat(order.realizedPnl).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[10px] text-slate-400">{formatDistanceToNow(order.time)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 bg-white rounded-lg overflow-hidden shadow-sm">
        <thead className="bg-slate-50">
          <tr>
            <th
              onClick={() => handleSort('time')}
              className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
            >
              时间 {sortField === 'time' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('symbol')}
              className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
            >
              交易对 {sortField === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('side')}
              className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
            >
              方向 {sortField === 'side' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('type')}
              className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
            >
              类型 {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              价格
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              数量
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              已成交
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              手续费
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              实现盈亏
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              状态
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {sortedOrders.map((order, index) => (
            <tr
              key={
                order.id ? `${order.id}` : `${order.orderId}-${order.symbol}-${order.time}-${index}`
              }
              className="hover:bg-slate-50 transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                {formatDistanceToNow(order.time)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900">
                {order.symbol}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <span
                  className={`font-medium ${order.side === 'BUY' ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {order.side === 'BUY' ? '买入' : '卖出'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{order.type}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                ${formatPrice(parseFloat(order.price), order.symbol, exchangeInfo)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                {parseFloat(order.origQty).toFixed(4)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                {parseFloat(order.executedQty).toFixed(4)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                {order.commission !== undefined ? (
                  <>
                    {parseFloat(order.commission).toFixed(4)}
                    {order.commissionAsset && ` ${order.commissionAsset}`}
                  </>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {order.realizedPnl !== undefined ? (
                  <span
                    className={`font-semibold ${
                      parseFloat(order.realizedPnl) >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {parseFloat(order.realizedPnl) >= 0 ? '+' : ''}
                    {parseFloat(order.realizedPnl).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <OrderStatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
