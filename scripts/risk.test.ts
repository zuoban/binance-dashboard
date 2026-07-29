/**
 * 风险计算回归测试
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import type { Position } from '../types/binance'
import { calculateLiquidationDistance, getDashboardRiskAlerts } from '../lib/utils/risk'

function createPosition(overrides: Partial<Position> = {}): Position {
  return {
    symbol: 'BTCUSDC',
    positionAmount: '1',
    entryPrice: '100',
    markPrice: '100',
    unrealizedProfit: '0',
    liquidationPrice: '95',
    breakEvenPrice: '100',
    leverage: '10',
    positionSide: 'LONG',
    marginType: 'cross',
    notional: '100',
    isolatedWallet: '0',
    dualSide: false,
    ...overrides,
  }
}

test('强平距离按多空方向正确计算', () => {
  assert.equal(calculateLiquidationDistance(createPosition()), 5)
  assert.equal(
    calculateLiquidationDistance(
      createPosition({ positionAmount: '-1', positionSide: 'BOTH', liquidationPrice: '105' })
    ),
    5
  )
})

test('风险监控汇总临近强平、低可用保证金与断线信号', () => {
  const alerts = getDashboardRiskAlerts({
    positions: [createPosition({ liquidationPrice: '98' })],
    availableMarginPercent: 8,
    isConnected: false,
    isConnecting: false,
  })

  assert.deepEqual(
    alerts.map(alert => [alert.id, alert.severity]),
    [
      ['available-margin', 'critical'],
      ['liquidation-BTCUSDC-LONG', 'critical'],
      ['realtime-connection', 'warning'],
    ]
  )
})
