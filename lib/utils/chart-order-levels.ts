/**
 * 图表订单价位解析工具
 *
 * 将完整订单或服务层简化订单统一转换为 K 线图可使用的价位与短标签。
 */

/** K 线图所需的最小订单结构，兼容 Order 与 SimpleOrder */
export interface ChartOrderLike {
  orderId: number
  price: string | number
  side: 'BUY' | 'SELL'
  type?: string | null
  origType?: string | null
  stopPrice?: string | number | null
  reduceOnly?: boolean
  closePosition?: boolean
  workingType?: string | null
  positionSide?: string | null
}

/** 图表订单短标签 */
export type ChartOrderLabel = '止损' | '止盈' | '触发买' | '触发卖' | '买入' | '卖出'

/** 图表订单价位类别 */
export type ChartOrderLevelKind =
  | 'stop-loss'
  | 'take-profit'
  | 'trigger-buy'
  | 'trigger-sell'
  | 'buy'
  | 'sell'

/** 图表实际采用的订单价格字段 */
export type ChartOrderPriceSource = 'stopPrice' | 'price'

/** 条件单触发价格来源；普通订单没有触发源 */
export type ChartOrderTriggerSource = 'MARK_PRICE' | 'CONTRACT_PRICE' | 'unknown' | null

/** 解析后的图表订单价位 */
export interface ChartOrderLevel<TOrder extends ChartOrderLike = ChartOrderLike> {
  order: TOrder
  orderId: number
  price: number
  priceSource: ChartOrderPriceSource
  triggerSource: ChartOrderTriggerSource
  label: ChartOrderLabel
  kind: ChartOrderLevelKind
}

interface ConditionalOrderType {
  isConditional: boolean
  isStopLoss: boolean
  isTakeProfit: boolean
}

/** 将未知的价格值转换为有效正数 */
function parsePositivePrice(value: string | number | null | undefined): number | null {
  const price = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(price) && price > 0 ? price : null
}

/** 同时检查 type 与 origType，避免币安返回的当前类型丢失原始条件单语义 */
function resolveConditionalType(order: ChartOrderLike): ConditionalOrderType {
  const orderTypes = [order.type, order.origType]
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.toUpperCase())

  const isTakeProfit = orderTypes.some(value => value.startsWith('TAKE_PROFIT'))
  const isStopLoss = orderTypes.some(
    value => value === 'STOP' || value.startsWith('STOP_') || value.startsWith('TRAILING_')
  )

  return {
    isConditional: isTakeProfit || isStopLoss,
    isStopLoss,
    isTakeProfit,
  }
}

/** 将币安触发价格来源收敛为图表可识别的稳定值 */
function resolveTriggerSource(order: ChartOrderLike): ChartOrderTriggerSource {
  const workingType = order.workingType?.toUpperCase()
  return workingType === 'MARK_PRICE' || workingType === 'CONTRACT_PRICE' ? workingType : 'unknown'
}

/**
 * 解析单个开放订单的图表价位。
 *
 * 条件单优先使用触发价，普通订单使用委托价；没有有效正价格时返回 null。
 */
export function resolveChartOrderLevel<TOrder extends ChartOrderLike>(
  order: TOrder
): ChartOrderLevel<TOrder> | null {
  const conditionalType = resolveConditionalType(order)
  const price = conditionalType.isConditional
    ? parsePositivePrice(order.stopPrice)
    : parsePositivePrice(order.price)

  if (price === null) {
    return null
  }

  const priceSource: ChartOrderPriceSource = conditionalType.isConditional ? 'stopPrice' : 'price'
  const positionSide = order.positionSide?.toUpperCase()
  const isHedgeModeClosingOrder =
    (positionSide === 'LONG' && order.side === 'SELL') ||
    (positionSide === 'SHORT' && order.side === 'BUY')
  const isClosingOrder =
    order.reduceOnly === true || order.closePosition === true || isHedgeModeClosingOrder
  let label: ChartOrderLabel
  let kind: ChartOrderLevelKind

  if (conditionalType.isTakeProfit && isClosingOrder) {
    label = '止盈'
    kind = 'take-profit'
  } else if (conditionalType.isStopLoss && isClosingOrder) {
    label = '止损'
    kind = 'stop-loss'
  } else if (conditionalType.isConditional) {
    label = order.side === 'BUY' ? '触发买' : '触发卖'
    kind = order.side === 'BUY' ? 'trigger-buy' : 'trigger-sell'
  } else {
    label = order.side === 'BUY' ? '买入' : '卖出'
    kind = order.side === 'BUY' ? 'buy' : 'sell'
  }

  return {
    order,
    orderId: order.orderId,
    price,
    priceSource,
    triggerSource: conditionalType.isConditional ? resolveTriggerSource(order) : null,
    label,
    kind,
  }
}

/** 批量解析并自动过滤没有有效价位的订单 */
export function resolveChartOrderLevels<TOrder extends ChartOrderLike>(
  orders: readonly TOrder[]
): ChartOrderLevel<TOrder>[] {
  return orders.reduce<ChartOrderLevel<TOrder>[]>((levels, order) => {
    const level = resolveChartOrderLevel(order)
    if (level) {
      levels.push(level)
    }
    return levels
  }, [])
}
