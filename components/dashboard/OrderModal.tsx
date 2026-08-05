/**
 * 订单详情模态框组件
 */

'use client'

import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDialogFocus, type ExchangeInfoData } from '@/lib/hooks'
import { formatDateTime, formatDistanceToNow } from '@/lib/utils/date'
import { Order, OrderStatus } from '@/types/binance'

interface OrderModalProps {
  /** 订单数据 */
  order: Order
  /** 交易对精度信息 */
  exchangeInfo: ExchangeInfoData
  /** 关闭模态框 */
  onClose: () => void
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
          tone: 'success',
        }
      case 'CANCELED':
        return {
          label: '已撤销',
          tone: 'neutral',
        }
      case 'NEW':
        return {
          label: '新建',
          tone: 'info',
        }
      case 'PARTIALLY_FILLED':
        return {
          label: '部分成交',
          tone: 'warning',
        }
      case 'PENDING_CANCEL':
        return {
          label: '撤销中',
          tone: 'warning',
        }
      case 'REJECTED':
        return {
          label: '已拒绝',
          tone: 'danger',
        }
      case 'EXPIRED':
        return {
          label: '已过期',
          tone: 'neutral',
        }
      default:
        return {
          label: status,
          tone: 'neutral',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <span className={`order-status-badge order-status-badge--${config.tone}`}>
      <i aria-hidden="true" />
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
export function OrderModal({ order, exchangeInfo, onClose }: OrderModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { dialogRef, onDialogKeyDown } = useDialogFocus<HTMLElement>({
    onClose,
    initialFocusRef: closeButtonRef,
  })

  const executedQty = parseFloat(order.executedQty)
  const price = parseFloat(order.price)
  const totalAmount = executedQty * price
  const pnl = order.realizedPnl !== undefined ? parseFloat(order.realizedPnl) : null
  const isPnlPositive = pnl !== null && pnl >= 0
  const commission = order.commission !== undefined ? parseFloat(order.commission) : null

  return createPortal(
    <div
      className="order-modal"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-dialog-title"
        className="order-modal__dialog"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
      >
        <header className="order-modal__header">
          <div className="order-modal__title-row">
            <div>
              <h3 id="order-dialog-title">{order.symbol}</h3>
              <span>{formatDistanceToNow(order.time)}</span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="order-modal__close"
              aria-label="关闭订单详情"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="order-modal__tags">
            <div>
              <span className={`order-modal__side order-modal__side--${order.side.toLowerCase()}`}>
                {order.side === 'BUY' ? '买入' : '卖出'}
              </span>
              <span className="order-modal__type">{order.type === 'MARKET' ? '市价' : '限价'}</span>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
        </header>

        <dl className="order-modal__metrics">
          <div>
            <dt>成交价格</dt>
            <dd>${formatPrice(price, order.symbol, exchangeInfo)}</dd>
          </div>
          <div>
            <dt>成交数量</dt>
            <dd>{executedQty.toFixed(4)}</dd>
          </div>
          <div>
            <dt>成交金额</dt>
            <dd>${totalAmount.toFixed(2)}</dd>
          </div>
          <div>
            {pnl !== null && order.side === 'SELL' ? (
              <>
                <dt>实现盈亏</dt>
                <dd className={isPnlPositive ? 'is-positive' : 'is-negative'}>
                  {isPnlPositive ? '+' : ''}
                  {pnl.toFixed(2)}
                </dd>
              </>
            ) : (
              <>
                <dt>手续费</dt>
                <dd>
                  {commission !== null ? parseFloat(commission.toFixed(4)) : 0}
                  <span>{order.commissionAsset}</span>
                </dd>
              </>
            )}
          </div>
        </dl>

        <footer className="order-modal__footer">
          <span>Order ID: {order.orderId}</span>
          <span>{formatDateTime(order.time)}</span>
        </footer>
      </section>
    </div>,
    document.body
  )
}
