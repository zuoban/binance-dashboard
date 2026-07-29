/**
 * 风险历史工具回归测试
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  appendRiskHistory,
  clearRiskHistory,
  getNewRiskAlerts,
  getRiskAlertKey,
  loadRiskHistory,
  MAX_RISK_HISTORY_EVENTS,
  parseRiskHistory,
  RISK_HISTORY_STORAGE_KEY,
  saveRiskHistory,
  type RiskHistoryStorage,
} from '../lib/utils/risk-history'

const alerts = [
  {
    id: 'liquidation-BTCUSDC-LONG',
    severity: 'critical' as const,
    title: 'BTCUSDC 强平距离偏近',
    description: '当前标记价格距强平价 2.00%',
  },
]

function createMemoryStorage(): RiskHistoryStorage {
  const values = new Map<string, string>()

  return {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

test('风险事件会按发生时间倒序追加并保留元数据', () => {
  const history = appendRiskHistory([], alerts, 1000)
  const nextHistory = appendRiskHistory(history, [{ ...alerts[0], id: 'available-margin' }], 2000)

  assert.equal(nextHistory.length, 2)
  assert.equal(nextHistory[0].alertId, 'available-margin')
  assert.equal(nextHistory[1].occurredAt, 1000)
})

test('风险历史会过滤无效数据并限制最大保留数量', () => {
  const oversizedHistory = Array.from({ length: MAX_RISK_HISTORY_EVENTS + 1 }, (_, index) => ({
    id: `event-${index}`,
    alertId: `alert-${index}`,
    severity: 'warning' as const,
    title: '风险提醒',
    description: '测试事件',
    occurredAt: index,
  }))

  const parsed = parseRiskHistory([...oversizedHistory, { invalid: true }])

  assert.equal(parsed.length, MAX_RISK_HISTORY_EVENTS)
  assert.equal(parsed[0].id, 'event-0')
})

test('持续存在的相同告警不会重复写入，等级变化会被记录', () => {
  const activeAlertKeys = new Set([getRiskAlertKey(alerts[0])])
  const severityChangedAlert = { ...alerts[0], severity: 'warning' as const }

  const newAlerts = getNewRiskAlerts([alerts[0], severityChangedAlert], activeAlertKeys)

  assert.deepEqual(newAlerts, [severityChangedAlert])
})

test('清空风险历史后不再读取到已保存事件', () => {
  const storage = createMemoryStorage()
  const history = appendRiskHistory([], alerts, 1000)

  assert.equal(saveRiskHistory(storage, history), true)
  assert.deepEqual(loadRiskHistory(storage), history)
  assert.equal(clearRiskHistory(storage), true)
  assert.equal(storage.getItem(RISK_HISTORY_STORAGE_KEY), null)
  assert.deepEqual(loadRiskHistory(storage), [])
})
