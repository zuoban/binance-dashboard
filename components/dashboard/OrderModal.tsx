/**
 * 订单详情模态框组件
 */

'use client'

import { Order, OrderStatus } from '@/types/binance'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useExchangeInfo } from '@/lib/hooks'
import { formatDistanceToNow } from '@/lib/utils/date'

interface OrderModalProps {
  /** 订单数据 */
  order: Order
  /** 触发元素 */
  children: React.ReactNode
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
          className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500 shadow-emerald-500/30',
        }
      case 'CANCELED':
        return {
          label: '已撤销',
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-500',
        }
      case 'NEW':
        return {
          label: '新建',
          className: 'bg-blue-100 text-blue-700 border-blue-200',
          dot: 'bg-blue-500 shadow-blue-500/30',
        }
      case 'PARTIALLY_FILLED':
        return {
          label: '部分成交',
          className: 'bg-amber-100 text-amber-700 border-amber-200',
          dot: 'bg-amber-500 shadow-amber-500/30',
        }
      case 'PENDING_CANCEL':
        return {
          label: '撤销中',
          className: 'bg-orange-100 text-orange-700 border-orange-200',
          dot: 'bg-orange-500',
        }
      case 'REJECTED':
        return {
          label: '已拒绝',
          className: 'bg-red-100 text-red-700 border-red-200',
          dot: 'bg-red-500 shadow-red-500/30',
        }
      case 'EXPIRED':
        return {
          label: '已过期',
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-500',
        }
      default:
        return {
          label: status,
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-500',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.className}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${config.dot}`} />
      {config.label}
    </span>
  )
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
 * 订单详情模态框
 */
export function OrderModal({ order, children }: OrderModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { exchangeInfo } = useExchangeInfo()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // 监听 ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // 禁止背景滚动
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const executedQty = parseFloat(order.executedQty)
  const price = parseFloat(order.price)
  const totalAmount = executedQty * price
  const pnl = order.realizedPnl !== undefined ? parseFloat(order.realizedPnl) : null
  const isPnlPositive = pnl !== null && pnl >= 0
  const commission = order.commission !== undefined ? parseFloat(order.commission) : null

  return (
    <>
      <div
        className="relative inline-flex items-center justify-center cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        {children}
      </div>

      {isOpen &&
        isClient &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* 背景遮罩 */}
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            {/* 模态框内容 */}
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* 头部 */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{order.symbol}</h3>
                    <span className="text-xs text-slate-500 font-medium">
                      {formatDistanceToNow(order.time)}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        order.side === 'BUY'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.side === 'BUY' ? '买入' : '卖出'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        order.type === 'MARKET'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {order.type === 'MARKET' ? '市价' : '限价'}
                    </span>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>

              {/* 内容区域 */}
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* 价格 */}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">成交价格</div>
                    <div className="text-base font-bold text-slate-900">
                      ${formatPrice(price, order.symbol, exchangeInfo)}
                    </div>
                  </div>

                  {/* 数量 */}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">成交数量</div>
                    <div className="text-base font-bold text-slate-900">
                      {executedQty.toFixed(4)}
                    </div>
                  </div>

                  {/* 金额 */}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">成交金额</div>
                    <div className="text-base font-bold text-slate-900">
                      ${totalAmount.toFixed(2)}
                    </div>
                  </div>

                  {/* 盈亏/手续费 */}
                  <div>
                    {pnl !== null && order.side === 'SELL' ? (
                      <>
                        <div className="text-xs text-slate-500 mb-1">实现盈亏</div>
                        <div
                          className={`text-base font-bold ${
                            isPnlPositive ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {isPnlPositive ? '+' : ''}
                          {pnl.toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-slate-500 mb-1">手续费</div>
                        <div className="text-base font-bold text-slate-700">
                          {commission !== null ? parseFloat(commission.toFixed(4)) : 0}
                          <span className="text-xs font-normal ml-1 text-slate-400">
                            {order.commissionAsset}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 底部 ID 信息 */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Order ID: {order.orderId}</span>
                  <span>{new Date(order.time).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
