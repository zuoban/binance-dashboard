/**
 * 图表订单价位解析回归测试
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolveChartOrderLevel,
  resolveChartOrderLevels,
  type ChartOrderLike,
} from '../lib/utils/chart-order-levels'
import type { SimpleOrder } from '../lib/services/types'

function createOrder(overrides: Partial<ChartOrderLike> = {}): ChartOrderLike {
  return {
    orderId: 1,
    price: '1900',
    side: 'BUY',
    type: 'LIMIT',
    ...overrides,
  }
}

test('止损市价全平单使用 stopPrice 并生成止损标签', () => {
  const order = createOrder({
    price: '0',
    side: 'SELL',
    type: 'STOP_MARKET',
    stopPrice: '1800.5',
    closePosition: true,
  })

  assert.deepEqual(resolveChartOrderLevel(order), {
    order,
    orderId: 1,
    price: 1800.5,
    priceSource: 'stopPrice',
    triggerSource: 'unknown',
    label: '止损',
    kind: 'stop-loss',
  })
})

test('止盈减仓单使用 stopPrice 并生成止盈标签', () => {
  const level = resolveChartOrderLevel(
    createOrder({
      side: 'SELL',
      type: 'TAKE_PROFIT_MARKET',
      stopPrice: '2100',
      reduceOnly: true,
    })
  )

  assert.equal(level?.price, 2100)
  assert.equal(level?.priceSource, 'stopPrice')
  assert.equal(level?.label, '止盈')
  assert.equal(level?.kind, 'take-profit')
})

test('追踪止损减仓单生成止损标签', () => {
  const level = resolveChartOrderLevel(
    createOrder({
      type: 'TRAILING_STOP_MARKET',
      stopPrice: '1850',
      reduceOnly: true,
    })
  )

  assert.equal(level?.label, '止损')
  assert.equal(level?.kind, 'stop-loss')
})

test('追踪止损没有有效 stopPrice 时不绘制不稳定的水平触发线', () => {
  const level = resolveChartOrderLevel(
    createOrder({
      type: 'TRAILING_STOP_MARKET',
      stopPrice: '0',
      price: '1850',
      reduceOnly: true,
    })
  )

  // 追踪止损的动态价位不能用委托价代替；没有稳定 stopPrice 时由图表忽略。
  assert.equal(level, null)
})

test('非减仓条件单按方向生成触发买卖标签', () => {
  const buyLevel = resolveChartOrderLevel(
    createOrder({ type: 'STOP', stopPrice: '1950', side: 'BUY' })
  )
  const sellLevel = resolveChartOrderLevel(
    createOrder({ type: 'TAKE_PROFIT', stopPrice: '1850', side: 'SELL' })
  )

  assert.equal(buyLevel?.label, '触发买')
  assert.equal(buyLevel?.kind, 'trigger-buy')
  assert.equal(sellLevel?.label, '触发卖')
  assert.equal(sellLevel?.kind, 'trigger-sell')
})

test('普通限价单使用 price 并按方向生成买卖标签', () => {
  const buyLevel = resolveChartOrderLevel(createOrder({ price: '1890', side: 'BUY' }))
  const sellLevel = resolveChartOrderLevel(createOrder({ price: '2110', side: 'SELL' }))

  assert.equal(buyLevel?.price, 1890)
  assert.equal(buyLevel?.priceSource, 'price')
  assert.equal(buyLevel?.triggerSource, null)
  assert.equal(buyLevel?.label, '买入')
  assert.equal(sellLevel?.label, '卖出')
})

test('origType 可以补全条件单语义并继续使用有效 stopPrice', () => {
  const level = resolveChartOrderLevel(
    createOrder({
      type: 'LIMIT',
      origType: 'STOP',
      stopPrice: '1875',
      price: '1860',
      reduceOnly: true,
    })
  )

  assert.equal(level?.price, 1875)
  assert.equal(level?.priceSource, 'stopPrice')
  assert.equal(level?.label, '止损')
})

test('条件单没有有效 stopPrice 时不会回退到委托 price', () => {
  const invalidStopPrices = ['0', '-1', 'NaN', 'Infinity']

  invalidStopPrices.forEach(stopPrice => {
    const level = resolveChartOrderLevel(
      createOrder({
        type: 'STOP',
        stopPrice,
        price: '1875',
        reduceOnly: true,
      })
    )

    assert.equal(level, null)
  })
})

test('对冲模式按持仓方向识别部分止损与止盈订单', () => {
  const longStop = resolveChartOrderLevel(
    createOrder({
      side: 'SELL',
      type: 'STOP_MARKET',
      stopPrice: '1800',
      positionSide: 'LONG',
      reduceOnly: false,
      closePosition: false,
    })
  )
  const shortTakeProfit = resolveChartOrderLevel(
    createOrder({
      side: 'BUY',
      type: 'TAKE_PROFIT_MARKET',
      stopPrice: '1700',
      positionSide: 'SHORT',
      reduceOnly: false,
      closePosition: false,
    })
  )

  assert.equal(longStop?.label, '止损')
  assert.equal(longStop?.kind, 'stop-loss')
  assert.equal(shortTakeProfit?.label, '止盈')
  assert.equal(shortTakeProfit?.kind, 'take-profit')
})

test('条件单暴露标记价、合约价及未知触发源', () => {
  const markPriceLevel = resolveChartOrderLevel(
    createOrder({ type: 'STOP', stopPrice: '1800', workingType: 'MARK_PRICE' })
  )
  const contractPriceLevel = resolveChartOrderLevel(
    createOrder({ type: 'STOP', stopPrice: '1800', workingType: 'CONTRACT_PRICE' })
  )
  const unknownLevel = resolveChartOrderLevel(
    createOrder({ type: 'STOP', stopPrice: '1800', workingType: 'LAST_PRICE' })
  )

  assert.equal(markPriceLevel?.triggerSource, 'MARK_PRICE')
  assert.equal(contractPriceLevel?.triggerSource, 'CONTRACT_PRICE')
  assert.equal(unknownLevel?.triggerSource, 'unknown')
})

test('兼容 data-manager 输出的 SimpleOrder 结构', () => {
  const simpleOrder: SimpleOrder = {
    orderId: 42,
    symbol: 'ETHUSDC',
    price: '0',
    origQty: '0.5',
    executedQty: '0',
    side: 'SELL',
    type: 'STOP_MARKET',
    stopPrice: '1800',
    reduceOnly: false,
    workingType: 'CONTRACT_PRICE',
    positionSide: 'LONG',
    closePosition: false,
    origType: 'STOP_MARKET',
    status: 'NEW',
    time: 1,
    updateTime: 2,
  }

  const level = resolveChartOrderLevel(simpleOrder)

  assert.equal(level?.price, 1800)
  assert.equal(level?.label, '止损')
  assert.equal(level?.triggerSource, 'CONTRACT_PRICE')
})

test('批量解析过滤零值、负数、NaN 与无限价格', () => {
  const levels = resolveChartOrderLevels([
    createOrder({ orderId: 1, price: '0' }),
    createOrder({ orderId: 2, price: '-1' }),
    createOrder({ orderId: 3, price: 'NaN' }),
    createOrder({ orderId: 4, price: 'Infinity' }),
    createOrder({ orderId: 5, price: '2000' }),
  ])

  assert.deepEqual(
    levels.map(level => ({ orderId: level.orderId, price: level.price })),
    [{ orderId: 5, price: 2000 }]
  )
})
