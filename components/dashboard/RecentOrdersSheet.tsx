/**
 * 移动端最近成交抽屉组件
 *
 * 使用清晰的列表替代精密小圆点，方便触控用户浏览并打开订单详情。
 */

'use client'

import { useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDialogFocus } from '@/lib/hooks'
import { formatDistanceToNow } from '@/lib/utils/date'
import type { Order } from '@/types/binance'

interface RecentOrdersSheetProps {
  /** 最近成交订单 */
  orders: Order[]
  /** 选择订单 */
  onSelectOrder: (order: Order) => void
  /** 关闭抽屉 */
  onClose: () => void
}

function getOrderTradeTime(order: Order): number {
  return Number.isFinite(order.updateTime) && order.updateTime > 0 ? order.updateTime : order.time
}

function formatQuantity(quantity: string): string {
  const parsedQuantity = Number.parseFloat(quantity)
  return Number.isFinite(parsedQuantity) ? parsedQuantity.toLocaleString('zh-CN') : '--'
}

function getPnl(order: Order): number | null {
  if (order.realizedPnl === undefined) {
    return null
  }

  const parsedPnl = Number.parseFloat(order.realizedPnl)
  return Number.isFinite(parsedPnl) ? parsedPnl : null
}

/**
 * 展示最近成交列表，并保持完整的键盘焦点行为。
 */
export function RecentOrdersSheet({ orders, onSelectOrder, onClose }: RecentOrdersSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const closeSheet = useCallback(() => onClose(), [onClose])
  const { dialogRef, onDialogKeyDown } = useDialogFocus<HTMLElement>({
    onClose: closeSheet,
    initialFocusRef: closeButtonRef,
  })

  return createPortal(
    <div
      className="recent-orders-sheet"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          closeSheet()
        }
      }}
    >
      <section
        ref={dialogRef}
        className="recent-orders-sheet__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recent-orders-sheet-title"
        aria-describedby="recent-orders-sheet-description"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
      >
        <div className="recent-orders-sheet__handle" aria-hidden="true" />
        <header className="recent-orders-sheet__header">
          <div>
            <p className="recent-orders-sheet__eyebrow">最近成交</p>
            <h2 id="recent-orders-sheet-title">查看订单记录</h2>
            <p id="recent-orders-sheet-description">选择一笔成交，查看价格、数量与盈亏明细。</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="recent-orders-sheet__close"
            onClick={closeSheet}
            aria-label="关闭最近成交"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m6 6 12 12M18 6 6 18"
              />
            </svg>
          </button>
        </header>

        <div className="recent-orders-sheet__list" aria-label={`最近 ${orders.length} 笔成交`}>
          {orders.map(order => {
            const pnl = getPnl(order)
            const tradeTime = getOrderTradeTime(order)
            const sideLabel = order.side === 'BUY' ? '买入' : '卖出'

            return (
              <button
                key={`${order.orderId}-${order.time}`}
                type="button"
                className="recent-orders-sheet__item"
                onClick={() => onSelectOrder(order)}
                aria-label={`查看 ${order.symbol} ${sideLabel}订单详情，${formatDistanceToNow(tradeTime)}`}
              >
                <span className="recent-orders-sheet__identity">
                  <strong>{order.symbol}</strong>
                  <span
                    className={`recent-orders-sheet__side recent-orders-sheet__side--${order.side.toLowerCase()}`}
                  >
                    {sideLabel}
                  </span>
                </span>
                <span className="recent-orders-sheet__details">
                  <span>
                    数量 {formatQuantity(order.executedQty)} · {formatDistanceToNow(tradeTime)}
                  </span>
                  <strong
                    className={
                      pnl === null ? 'is-neutral' : pnl >= 0 ? 'is-positive' : 'is-negative'
                    }
                  >
                    {pnl === null ? '盈亏 --' : `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`}
                  </strong>
                </span>
                <svg
                  className="recent-orders-sheet__chevron"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="m9 18 6-6-6-6"
                  />
                </svg>
              </button>
            )
          })}
        </div>
      </section>
    </div>,
    document.body
  )
}
