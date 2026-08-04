/**
 * K 线展示数据比较工具
 *
 * SSE 会为未变化的数据创建新引用，这些比较函数用于保留图表组件的渲染结果。
 */

import type { KlineData, Order } from '@/types/binance'

/** 比较两组 K 线数值，避免仅引用变化时刷新图表。 */
export function areKlineDataEqual(previousData: KlineData[], nextData: KlineData[]): boolean {
  if (previousData === nextData) {
    return true
  }

  if (previousData.length !== nextData.length) {
    return false
  }

  return previousData.every((previousKline, index) => {
    const nextKline = nextData[index]
    return (
      previousKline.time === nextKline?.time &&
      previousKline.open === nextKline.open &&
      previousKline.high === nextKline.high &&
      previousKline.low === nextKline.low &&
      previousKline.close === nextKline.close &&
      previousKline.volume === nextKline.volume
    )
  })
}

/** 比较会影响指定交易对图表标注的开放订单。 */
export function areRelevantOrdersEqual(
  previousOrders: Order[],
  nextOrders: Order[],
  symbol: string
): boolean {
  const previous = previousOrders.filter(order => order.symbol === symbol)
  const next = nextOrders.filter(order => order.symbol === symbol)

  if (previous.length !== next.length) {
    return false
  }

  return previous.every((order, index) => {
    const nextOrder = next[index]
    return (
      order.orderId === nextOrder?.orderId &&
      order.price === nextOrder.price &&
      order.stopPrice === nextOrder.stopPrice &&
      order.status === nextOrder.status &&
      order.side === nextOrder.side &&
      order.type === nextOrder.type &&
      order.origType === nextOrder.origType &&
      order.reduceOnly === nextOrder.reduceOnly &&
      order.closePosition === nextOrder.closePosition &&
      order.workingType === nextOrder.workingType &&
      order.positionSide === nextOrder.positionSide
    )
  })
}
