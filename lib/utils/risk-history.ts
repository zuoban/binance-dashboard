/**
 * 风险历史工具
 *
 * 管理本地风险事件时间线的数据结构，不包含任何交易指令。
 */

import type { RiskAlert } from './risk'

/** 本地风险时间线的最大保留数量。 */
export const MAX_RISK_HISTORY_EVENTS = 100

export interface RiskHistoryEvent extends RiskAlert {
  /** 事件发生时间 */
  occurredAt: number
  /** 触发该事件的风险项标识 */
  alertId: string
}

/** 将新出现的风险信号写入时间线，并保留最近的有限记录。 */
export function appendRiskHistory(
  history: RiskHistoryEvent[],
  alerts: RiskAlert[],
  occurredAt: number
): RiskHistoryEvent[] {
  const events = alerts.map((alert, index) => ({
    ...alert,
    id: `${occurredAt}-${alert.id}-${index}`,
    alertId: alert.id,
    occurredAt,
  }))

  return [...events, ...history].slice(0, MAX_RISK_HISTORY_EVENTS)
}

/** 安全解析 localStorage 中的风险历史，忽略无效记录。 */
export function parseRiskHistory(value: unknown): RiskHistoryEvent[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (event): event is RiskHistoryEvent =>
        typeof event === 'object' &&
        event !== null &&
        typeof event.id === 'string' &&
        typeof event.alertId === 'string' &&
        (event.severity === 'warning' || event.severity === 'critical') &&
        typeof event.title === 'string' &&
        typeof event.description === 'string' &&
        typeof event.occurredAt === 'number' &&
        Number.isFinite(event.occurredAt)
    )
    .slice(0, MAX_RISK_HISTORY_EVENTS)
}
