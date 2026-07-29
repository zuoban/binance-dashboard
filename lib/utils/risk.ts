/**
 * 看板风险计算工具
 *
 * 仅用于展示风险信号，不参与下单、撤单或仓位操作。
 */

import type { Position } from '@/types/binance'

export type RiskSeverity = 'warning' | 'critical'

export interface RiskAlert {
  /** 稳定的渲染标识 */
  id: string
  /** 风险等级 */
  severity: RiskSeverity
  /** 风险标题 */
  title: string
  /** 风险说明 */
  description: string
}

export interface RiskThresholds {
  /** 强平距离预警阈值（百分比） */
  liquidationWarningPercent: number
  /** 强平距离严重阈值（百分比） */
  liquidationCriticalPercent: number
  /** 可用保证金预警阈值（百分比） */
  availableMarginWarningPercent: number
  /** 可用保证金严重阈值（百分比） */
  availableMarginCriticalPercent: number
  /** 数据延迟预警阈值（秒） */
  dataDelayWarningSeconds: number
}

interface DashboardRiskOptions {
  positions: Position[]
  availableMarginPercent: number
  isConnected: boolean
  isConnecting: boolean
  thresholds?: RiskThresholds
}

/** 默认风险偏好，适用于未设置本地配置的用户。 */
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  liquidationWarningPercent: 8,
  liquidationCriticalPercent: 3,
  availableMarginWarningPercent: 25,
  availableMarginCriticalPercent: 10,
  dataDelayWarningSeconds: 15,
}

/** 校验用户输入的风险偏好，防止反向或无效阈值造成误提示。 */
export function isRiskThresholds(value: RiskThresholds): boolean {
  const values = Object.values(value)
  if (values.some(item => !Number.isFinite(item) || item <= 0)) {
    return false
  }

  return (
    value.liquidationCriticalPercent <= value.liquidationWarningPercent &&
    value.availableMarginCriticalPercent <= value.availableMarginWarningPercent &&
    value.liquidationWarningPercent <= 100 &&
    value.availableMarginWarningPercent <= 100 &&
    value.dataDelayWarningSeconds <= 300
  )
}

function isLongPosition(position: Position): boolean {
  return (
    position.positionSide === 'LONG' ||
    (position.positionSide === 'BOTH' && Number.parseFloat(position.positionAmount) > 0)
  )
}

/**
 * 计算标记价格到强平价格的安全距离百分比。无有效强平价时返回 null。
 */
export function calculateLiquidationDistance(position: Position): number | null {
  const markPrice = Number.parseFloat(position.markPrice)
  const liquidationPrice = Number.parseFloat(position.liquidationPrice)

  if (
    !Number.isFinite(markPrice) ||
    !Number.isFinite(liquidationPrice) ||
    markPrice <= 0 ||
    liquidationPrice <= 0
  ) {
    return null
  }

  const distance = isLongPosition(position)
    ? ((markPrice - liquidationPrice) / markPrice) * 100
    : ((liquidationPrice - markPrice) / markPrice) * 100

  return Math.max(0, distance)
}

function getLiquidationSeverity(distance: number, thresholds: RiskThresholds): RiskSeverity | null {
  if (distance <= thresholds.liquidationCriticalPercent) {
    return 'critical'
  }
  if (distance <= thresholds.liquidationWarningPercent) {
    return 'warning'
  }
  return null
}

/**
 * 汇总当前仓位、可用保证金和实时连接的展示风险。
 */
export function getDashboardRiskAlerts({
  positions,
  availableMarginPercent,
  isConnected,
  isConnecting,
  thresholds = DEFAULT_RISK_THRESHOLDS,
}: DashboardRiskOptions): RiskAlert[] {
  const alerts: RiskAlert[] = []

  for (const position of positions) {
    const distance = calculateLiquidationDistance(position)
    if (distance === null) {
      continue
    }

    const severity = getLiquidationSeverity(distance, thresholds)
    if (severity) {
      alerts.push({
        id: `liquidation-${position.symbol}-${position.positionSide}`,
        severity,
        title: `${position.symbol} 强平距离偏近`,
        description: `当前标记价格距强平价 ${distance.toFixed(2)}%`,
      })
    }
  }

  if (Number.isFinite(availableMarginPercent)) {
    const marginSeverity =
      availableMarginPercent <= thresholds.availableMarginCriticalPercent
        ? 'critical'
        : availableMarginPercent <= thresholds.availableMarginWarningPercent
          ? 'warning'
          : null

    if (marginSeverity) {
      alerts.push({
        id: 'available-margin',
        severity: marginSeverity,
        title: '可用保证金占比偏低',
        description: `当前可用保证金占权益 ${availableMarginPercent.toFixed(1)}%`,
      })
    }
  }

  if (!isConnected && !isConnecting) {
    alerts.push({
      id: 'realtime-connection',
      severity: 'warning',
      title: '实时数据连接中断',
      description: '数据可能不是最新状态，请等待自动重连或手动重试。',
    })
  }

  return alerts.sort((first, second) => {
    if (first.severity === second.severity) {
      return first.id.localeCompare(second.id)
    }
    return first.severity === 'critical' ? -1 : 1
  })
}
