/**
 * K 线图价格范围回归测试
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveChartPriceRange } from '../lib/utils/chart-price-range'

test('下一笔买卖价超出蜡烛区间时仍会被纵轴完整包含', () => {
  const range = resolveChartPriceRange([100, 104, 108, 110], [90, 120])

  assert.ok(range.minPrice < 90)
  assert.ok(range.maxPrice > 120)
  assert.deepEqual(range.levelPlacements, ['visible', 'visible'])
})

test('下一笔买卖价位于最高或最低边界时保留安全留白', () => {
  const range = resolveChartPriceRange([100, 105, 110], [100, 110])

  assert.ok(range.minPrice < 100)
  assert.ok(range.maxPrice > 110)
  assert.deepEqual(range.levelPlacements, ['visible', 'visible'])
})

test('无效关键价位不会污染图表纵轴范围', () => {
  const range = resolveChartPriceRange([100, 110], [undefined, 0, Number.NaN])

  assert.ok(Number.isFinite(range.minPrice))
  assert.ok(Number.isFinite(range.maxPrice))
  assert.ok(range.minPrice < 100)
  assert.ok(range.maxPrice > 110)
  assert.deepEqual(range.levelPlacements, [null, null, null])
})

test('极远订单使用边缘提示，不压缩蜡烛主体', () => {
  const range = resolveChartPriceRange([100, 104, 108, 110], [40, 180])

  assert.ok(range.minPrice > 90)
  assert.ok(range.maxPrice < 120)
  assert.deepEqual(range.levelPlacements, ['below', 'above'])
})
