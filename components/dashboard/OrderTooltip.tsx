/**
 * 订单详情 Tooltip 组件
 */

'use client'

import { Order } from '@/types/binance'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useExchangeInfo } from '@/lib/hooks'
import { formatDistanceToNow, formatDateTime } from '@/lib/utils/date'

interface OrderTooltipProps {
  /** 订单数据 */
  order: Order
  /** 子元素 */
  children: React.ReactNode
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
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top', offsetX: 0 })
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
      const scrollX = window.scrollX
      const scrollY = window.scrollY

      // Tooltip 尺寸估计 (宽度固定 320px, 高度约 300px)
      const tooltipHeight = 300
      const tooltipWidth = Math.min(320, window.innerWidth - 20) // 响应式宽度

      // 视口尺寸
      const viewportWidth = window.innerWidth

      // 默认显示在上方
      let top = rect.top + scrollY - 10
      let left = rect.left + scrollX + rect.width / 2
      let placement = 'top' // 用于控制箭头方向和 translateY

      // 1. 垂直方向检测：如果上方空间不足，则显示在下方
      if (rect.top < tooltipHeight + 20) {
        // 上方空间不足，显示在下方
        top = rect.bottom + scrollY + 10
        placement = 'bottom'
      }

      // 2. 水平方向检测：防止左右溢出
      // 计算 Tooltip 左边缘和右边缘
      const halfWidth = tooltipWidth / 2
      const leftEdge = rect.left + rect.width / 2 - halfWidth
      const rightEdge = rect.left + rect.width / 2 + halfWidth

      let offsetX = 0

      if (leftEdge < 10) {
        // 左侧溢出，向右偏移
        offsetX = 10 - leftEdge
      } else if (rightEdge > viewportWidth - 10) {
        // 右侧溢出，向左偏移
        offsetX = viewportWidth - 10 - rightEdge
      }

      // 应用偏移
      left += offsetX

      setPosition({ top, left, placement, offsetX })
    }
  }, [isVisible])

  const executedQty = parseFloat(order.executedQty)
  const origQty = parseFloat(order.origQty)
  const price = parseFloat(order.price)
  const totalAmount = executedQty * price
  const pnl = order.realizedPnl !== undefined ? parseFloat(order.realizedPnl) : null
  const isPnlPositive = pnl !== null && pnl >= 0
  const commission = order.commission !== undefined ? parseFloat(order.commission) : null
  const commissionValue = commission ? commission : 0

  // 计算盈亏率
  const pnlRate = pnl !== null && totalAmount > 0 ? (pnl / totalAmount) * 100 : null

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex items-center justify-center p-1.5 cursor-pointer hover:bg-slate-100 rounded-full transition-colors"
        onClick={e => {
          e.stopPropagation()
          setIsVisible(!isVisible)
        }}
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
              style={{
                transform: `translate(calc(-50% + ${-position.offsetX}px), ${
                  position.placement === 'top' ? '-100%' : '0'
                })`,
              }}
            >
              <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden relative">
                {/* 头部 */}
                <div
                  className={`px-4 py-3 ${
                    order.side === 'BUY'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                      : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white font-bold text-base">{order.symbol}</p>
                      <p className="text-white/90 text-xs font-medium">
                        {formatDistanceToNow(order.time)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-md text-white text-xs font-bold text-center">
                        {order.side === 'BUY' ? '买入' : '卖出'}
                      </span>
                      <span className="px-2.5 py-0.5 bg-white/15 backdrop-blur-sm rounded-md text-white/90 text-[10px] font-semibold text-center">
                        {order.type === 'MARKET'
                          ? '市价'
                          : order.type === 'LIMIT'
                            ? '限价'
                            : order.type}
                      </span>
                    </div>
                  </div>
                  <div className="text-white/80 text-[10px] font-mono">订单 #{order.orderId}</div>
                </div>

                {/* 内容 */}
                <div className="px-4 py-3 space-y-3">
                  {/* 价格和数量 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-md p-2.5">
                      <p className="text-[10px] text-slate-500 font-medium mb-1">成交价格</p>
                      <p className="text-base font-bold text-slate-900">
                        ${formatPrice(price, order.symbol, exchangeInfo)}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">每单位</p>
                    </div>
                    <div className="bg-slate-50 rounded-md p-2.5">
                      <p className="text-[10px] text-slate-500 font-medium mb-1">成交数量</p>
                      <p className="text-base font-bold text-slate-900">{executedQty.toFixed(4)}</p>
                      {origQty !== executedQty && (
                        <p className="text-[9px] text-amber-600 mt-0.5">
                          原始: {origQty.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 成交金额 */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-md px-3 py-2.5 border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-medium mb-1">成交总额</p>
                    <p className="text-xl font-bold text-slate-900">${totalAmount.toFixed(2)}</p>
                    <p className="text-[9px] text-slate-500 mt-1">
                      {executedQty.toFixed(4)} × ${formatPrice(price, order.symbol, exchangeInfo)}
                    </p>
                  </div>

                  {/* 费用和盈亏详情 */}
                  <div className="space-y-2">
                    {/* 手续费 */}
                    {commission !== null && (
                      <div className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
                        <div>
                          <p className="text-[10px] text-slate-500 font-medium">手续费</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">
                            {commission.toFixed(4)} {order.commissionAsset || ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">约</p>
                          <p className="text-xs font-semibold text-slate-600">
                            ${commissionValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 实现盈亏 */}
                    {pnl !== null && order.side === 'SELL' && (
                      <div
                        className={`rounded-md px-3 py-2 ${
                          isPnlPositive
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200'
                            : 'bg-gradient-to-br from-red-50 to-red-100 border border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-slate-600 font-medium">实现盈亏</p>
                          {pnlRate !== null && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isPnlPositive
                                  ? 'bg-emerald-200 text-emerald-800'
                                  : 'bg-red-200 text-red-800'
                              }`}
                            >
                              {isPnlPositive ? '+' : ''}
                              {pnlRate.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-lg font-bold ${
                            isPnlPositive ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isPnlPositive ? '+' : ''}${pnl.toFixed(2)}
                        </p>
                        {commission !== null && (
                          <p className="text-[9px] text-slate-500 mt-1">扣除手续费后净盈亏</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 时间信息 */}
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[10px]">创建时间</span>
                      <span className="font-mono text-slate-700 text-[10px]">
                        {formatDateTime(order.time)}
                      </span>
                    </div>
                    {order.updateTime && order.updateTime !== order.time && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[10px]">更新时间</span>
                        <span className="font-mono text-slate-700 text-[10px]">
                          {formatDateTime(order.updateTime)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[10px]">订单状态</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        {order.status === 'FILLED' ? '已完成' : order.status}
                      </span>
                    </div>
                  </div>

                  {/* 附加信息 */}
                  {(order.id || order.buyer !== undefined) && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      {order.id && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 text-[10px]">成交 ID</span>
                          <span className="font-mono text-slate-600 text-[10px]">{order.id}</span>
                        </div>
                      )}
                      {order.buyer !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 text-[10px]">成交角色</span>
                          <span
                            className={`text-[10px] font-semibold ${
                              order.buyer ? 'text-emerald-600' : 'text-slate-600'
                            }`}
                          >
                            {order.buyer ? 'Maker（挂单方）' : 'Taker（吃单方）'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
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
                  marginLeft: position.offsetX, // 箭头保持在触发元素正上方/下方，反向抵消容器的偏移
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
