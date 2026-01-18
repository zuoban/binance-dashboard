/**
 * 订单详情 Tooltip 组件
 */

'use client'

import { Order, OrderStatus } from '@/types/binance'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useExchangeInfo } from '@/lib/hooks'
import { formatDistanceToNow } from '@/lib/utils/date'

interface OrderTooltipProps {
  /** 订单数据 */
  order: Order
  /** 子元素 */
  children: React.ReactNode
}

/**
 * 订单状态标签 (复制自 OrderTable)
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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.className}`}
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
 * 订单详情 Tooltip
 */
export function OrderTooltip({ order, children }: OrderTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const { exchangeInfo } = useExchangeInfo()
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    placement: 'top',
    arrowOffset: 0,
  })
  const [isClient, setIsClient] = useState(false)

  // 确保只在客户端渲染 Portal
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true)
  }, [])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        isVisible &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false)
      }
    }

    // 同时监听 mousedown 和 touchstart 以兼容移动端并保证响应速度
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isVisible])

  // 计算位置
  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const scrollY = window.scrollY
      const viewportWidth = window.innerWidth
      const isMobile = viewportWidth < 768

      // Tooltip 尺寸设定
      // 桌面端固定 320px, 移动端最大 90vw
      const tooltipMaxWidth = isMobile ? Math.min(320, viewportWidth * 0.9) : 320
      const tooltipHeight = 180 // 更新估算高度，内容变少了

      // 1. 计算目标 Left 位置 (Tooltip 中心点 X 坐标)
      const triggerCenter = rect.left + rect.width / 2
      let targetLeft = triggerCenter

      if (isMobile) {
        // 移动端：强制居中
        targetLeft = viewportWidth / 2
      } else {
        // 桌面端：跟随触发器，但防止溢出屏幕
        const halfWidth = tooltipMaxWidth / 2
        const minLeft = halfWidth + 10 // 左侧最小间距
        const maxLeft = viewportWidth - halfWidth - 10 // 右侧最大间距

        if (targetLeft < minLeft) targetLeft = minLeft
        if (targetLeft > maxLeft) targetLeft = maxLeft
      }

      // 2. 计算 Top 位置和 Placement
      // 默认显示在上方
      let top = rect.top + scrollY - 10
      let placement = 'top'

      // 垂直方向检测：如果上方空间不足，则显示在下方
      if (rect.top < tooltipHeight + 20) {
        top = rect.bottom + scrollY + 10
        placement = 'bottom'
      }

      // 3. 计算箭头偏移量
      // 箭头默认在 Tooltip 中心 (targetLeft)，需要移动到 triggerCenter
      let arrowOffset = triggerCenter - targetLeft

      // 限制箭头偏移量，防止箭头脱离 Tooltip
      const maxArrowOffset = tooltipMaxWidth / 2 - 12 // 留出圆角和箭头宽度的余量
      if (arrowOffset > maxArrowOffset) arrowOffset = maxArrowOffset
      if (arrowOffset < -maxArrowOffset) arrowOffset = -maxArrowOffset

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPosition({ top, left: targetLeft, placement, arrowOffset })
    }
  }, [isVisible])

  const executedQty = parseFloat(order.executedQty)
  const price = parseFloat(order.price)
  const totalAmount = executedQty * price
  const pnl = order.realizedPnl !== undefined ? parseFloat(order.realizedPnl) : null
  const isPnlPositive = pnl !== null && pnl >= 0

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex items-center justify-center cursor-pointer -m-1 p-1 rounded-full transition-colors hover:bg-slate-100/50"
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
      </div>

      {isVisible &&
        isClient &&
        createPortal(
          <div
            className="absolute z-[9999] pointer-events-none"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            <div
              ref={tooltipRef}
              className={`w-80 max-w-[90vw] -translate-x-1/2 pb-2 transition-all duration-200 pointer-events-auto ${
                position.placement === 'top' ? '-translate-y-full' : ''
              }`}
            >
              <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden relative">
                {/* Header - 与 Compact Card 一致 */}
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 tracking-wide">
                        {order.symbol}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                          order.side === 'BUY'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}
                      >
                        {order.side === 'BUY' ? '买入' : '卖出'}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
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

                {/* Content - 与 Compact Card 一致 */}
                <div className="px-3 py-2.5 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">成交价格</span>
                      <p className="text-sm font-bold text-slate-900 tracking-tight">
                        ${formatPrice(price, order.symbol, exchangeInfo)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">成交数量</span>
                      <p className="text-sm font-bold text-slate-700 tracking-tight">
                        {executedQty.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">成交金额</span>
                      <p className="text-sm font-semibold text-slate-900 tracking-tight">
                        ${totalAmount.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.commission !== undefined && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">手续费</span>
                          <span className="text-xs font-medium text-slate-700">
                            {parseFloat(order.commission).toFixed(4)}
                            {order.commissionAsset && ` ${order.commissionAsset}`}
                          </span>
                        </div>
                      )}
                      {pnl !== null && order.side === 'SELL' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">盈亏</span>
                          <span
                            className={`text-sm font-bold px-2 py-0.5 rounded ${
                              isPnlPositive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isPnlPositive ? '+' : ''}
                            {pnl.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Time - 与 Compact Card 一致 */}
                <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100">
                  <div className="text-[10px] text-slate-400 font-medium">
                    {formatDistanceToNow(order.time)}
                  </div>
                </div>
              </div>

              {/* 小箭头 - 根据位置动态调整 */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-slate-200 rotate-45 ${
                  position.placement === 'top'
                    ? '-bottom-1.5 border-r border-b'
                    : '-top-1.5 border-l border-t z-10'
                }`}
                style={{
                  marginLeft: position.arrowOffset, // 箭头保持在触发元素正上方/下方
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
