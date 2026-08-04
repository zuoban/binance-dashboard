/**
 * 看板信号组件
 *
 * 集中展示风险提醒与页头实时数据可信度，帮助用户快速判断当前看板是否适合决策。
 */

'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatISO } from 'date-fns'
import {
  DEFAULT_RISK_THRESHOLDS,
  isRiskThresholds,
  type RiskAlert,
  type RiskThresholds,
} from '@/lib/utils/risk'
import { useRiskHistory } from '@/lib/hooks'
import { formatDateTime } from '@/lib/utils/date'
import type { RiskHistoryEvent } from '@/lib/utils/risk-history'

interface RiskMonitorProps {
  alerts: RiskAlert[]
  thresholds: RiskThresholds
  onSaveThresholds: (thresholds: RiskThresholds) => boolean
  onResetThresholds: () => void
}

interface DataReliabilityProps {
  lastUpdate: number | null
  isConnected: boolean
  isConnecting: boolean
  reconnectCount: number
  dataDelayWarningSeconds: number
}

function formatDelay(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  }

  const seconds = Math.floor(milliseconds / 1000)
  if (seconds < 60) {
    return `${seconds}秒`
  }

  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
}

function SignalIcon({ severity }: { severity: 'healthy' | RiskAlert['severity'] }) {
  if (severity === 'healthy') {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }

  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-7.938 4h15.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.35 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  )
}

function RiskThresholdSettings({
  thresholds,
  onSaveThresholds,
  onResetThresholds,
}: Omit<RiskMonitorProps, 'alerts'>) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(thresholds)
  const [error, setError] = useState('')

  const openSettings = () => {
    setDraft(thresholds)
    setError('')
    setIsOpen(true)
  }

  const updateDraft = (field: keyof RiskThresholds, value: string) => {
    setDraft(current => ({ ...current, [field]: Number(value) }))
  }

  const handleSave = () => {
    if (!isRiskThresholds(draft) || !onSaveThresholds(draft)) {
      setError('严重阈值需小于或等于预警阈值，所有数值必须在有效范围内。')
      return
    }

    setIsOpen(false)
  }

  const handleReset = () => {
    onResetThresholds()
    setDraft(DEFAULT_RISK_THRESHOLDS)
    setError('')
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div className="risk-threshold-settings">
      <button
        type="button"
        onClick={openSettings}
        className="risk-monitor__settings"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        阈值设置
      </button>
      {isOpen &&
        createPortal(
          <div
            className="risk-modal"
            role="presentation"
            onMouseDown={event => {
              if (event.target === event.currentTarget) {
                setIsOpen(false)
              }
            }}
          >
            <section
              className="risk-modal__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="risk-threshold-dialog-title"
            >
              <header className="risk-modal__header">
                <div>
                  <p className="risk-modal__eyebrow">Risk controls</p>
                  <h2 id="risk-threshold-dialog-title">风险阈值设置</h2>
                  <p>仅保存到当前浏览器，用于调整看板风险提醒的敏感度。</p>
                </div>
                <button
                  type="button"
                  className="risk-modal__close"
                  onClick={() => setIsOpen(false)}
                  aria-label="关闭阈值设置"
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
              <div className="risk-modal__form">
                <label className="risk-modal__field">
                  强平预警（%）
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={draft.liquidationWarningPercent}
                    onChange={event => updateDraft('liquidationWarningPercent', event.target.value)}
                    className="theme-field"
                  />
                </label>
                <label className="risk-modal__field">
                  强平严重（%）
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={draft.liquidationCriticalPercent}
                    onChange={event =>
                      updateDraft('liquidationCriticalPercent', event.target.value)
                    }
                    className="theme-field"
                  />
                </label>
                <label className="risk-modal__field">
                  保证金预警（%）
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={draft.availableMarginWarningPercent}
                    onChange={event =>
                      updateDraft('availableMarginWarningPercent', event.target.value)
                    }
                    className="theme-field"
                  />
                </label>
                <label className="risk-modal__field">
                  保证金严重（%）
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={draft.availableMarginCriticalPercent}
                    onChange={event =>
                      updateDraft('availableMarginCriticalPercent', event.target.value)
                    }
                    className="theme-field"
                  />
                </label>
                <label className="risk-modal__field">
                  数据延迟预警（秒）
                  <input
                    type="number"
                    min="1"
                    max="300"
                    step="1"
                    value={draft.dataDelayWarningSeconds}
                    onChange={event => updateDraft('dataDelayWarningSeconds', event.target.value)}
                    className="theme-field"
                  />
                </label>
              </div>
              {error && (
                <p role="alert" className="risk-modal__error">
                  {error}
                </p>
              )}
              <footer className="risk-modal__footer">
                <button type="button" onClick={handleSave} className="theme-action-button">
                  保存到此浏览器
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="risk-modal__secondary-action"
                >
                  恢复默认
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="risk-modal__cancel"
                >
                  取消
                </button>
              </footer>
            </section>
          </div>,
          document.body
        )}
    </div>
  )
}

function RiskHistoryTimeline({
  history,
  onClear,
}: {
  history: RiskHistoryEvent[]
  onClear: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const visibleHistory = history.slice(0, 6)

  return (
    <div className="risk-history">
      <div className="risk-history__header">
        <div>
          <p className="risk-history__title">风险历史</p>
          <p className="risk-history__caption">本地保留最近 100 条事件</p>
        </div>
        <div className="risk-history__actions">
          {history.length > 0 && (
            <button type="button" onClick={onClear} className="risk-history__clear">
              清空
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(current => !current)}
            className="risk-history__toggle"
            aria-expanded={isOpen}
          >
            {isOpen ? '收起' : `查看${history.length > 0 ? `（${history.length}）` : ''}`}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="risk-history__timeline">
          {visibleHistory.length > 0 ? (
            visibleHistory.map(event => (
              <div key={event.id} className="risk-history__event">
                <span
                  className={`risk-history__event-dot ${
                    event.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="text-[11px] font-bold">{event.title}</p>
                  <time
                    className="text-[10px] font-medium opacity-65"
                    dateTime={formatISO(event.occurredAt)}
                  >
                    {formatDateTime(event.occurredAt)}
                  </time>
                </div>
                <p className="text-[10px] font-medium opacity-75">{event.description}</p>
              </div>
            ))
          ) : (
            <p className="text-[11px] font-medium opacity-70">暂未记录风险事件。</p>
          )}
        </div>
      )}
    </div>
  )
}

/** 风险监控条。健康状态采用中性终端表面，预警时才增强对应风险色。 */
export const RiskMonitor = memo(function RiskMonitor({
  alerts,
  thresholds,
  onSaveThresholds,
  onResetThresholds,
}: RiskMonitorProps) {
  const { history, clearHistory } = useRiskHistory(alerts)
  const visibleAlerts = alerts.slice(0, 3)
  const hasCriticalAlert = alerts.some(alert => alert.severity === 'critical')
  const severity = hasCriticalAlert ? 'critical' : alerts.length > 0 ? 'warning' : 'healthy'
  const statusLabel =
    severity === 'critical' ? '需立即处理' : severity === 'warning' ? '需要关注' : '监控正常'

  return (
    <section aria-live="polite" className={`risk-monitor risk-monitor--${severity}`}>
      <div className="risk-monitor__body">
        <span className="risk-monitor__icon">
          <SignalIcon severity={severity} />
        </span>
        <div className="risk-monitor__content">
          <div className="risk-monitor__toolbar">
            <div className="risk-monitor__heading">
              <div className="risk-monitor__title-row">
                <p>风险监控</p>
                <span className="risk-monitor__state">{statusLabel}</span>
              </div>
              <p className="risk-monitor__thresholds">
                强平预警 ≤ <strong>{thresholds.liquidationWarningPercent}%</strong>
                <span aria-hidden="true">·</span>
                可用保证金 ≤ <strong>{thresholds.availableMarginWarningPercent}%</strong>
              </p>
            </div>
            <RiskThresholdSettings
              thresholds={thresholds}
              onSaveThresholds={onSaveThresholds}
              onResetThresholds={onResetThresholds}
            />
          </div>
          {visibleAlerts.length > 0 ? (
            <div className="risk-monitor__alerts">
              {visibleAlerts.map(alert => (
                <div key={alert.id} className="risk-monitor__alert">
                  <p>{alert.title}</p>
                  <span>{alert.description}</span>
                </div>
              ))}
              {alerts.length > visibleAlerts.length && (
                <p className="risk-monitor__more-alerts">
                  另有 {alerts.length - visibleAlerts.length} 项提醒
                </p>
              )}
            </div>
          ) : (
            <p className="risk-monitor__summary">当前风险指标正常，持续监控中。</p>
          )}
          <RiskHistoryTimeline history={history} onClear={clearHistory} />
        </div>
      </div>
    </section>
  )
})

/** 页头数据可信度摘要，显示连接状态、数据延迟和本次页面会话的重连次数。 */
export function DataReliability({
  lastUpdate,
  isConnected,
  isConnecting,
  reconnectCount,
  dataDelayWarningSeconds,
}: DataReliabilityProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const dataDelay = useMemo(() => {
    if (!lastUpdate) {
      return null
    }
    return Math.max(0, now - lastUpdate)
  }, [lastUpdate, now])

  const isStale = dataDelay !== null && dataDelay >= dataDelayWarningSeconds * 1000
  const connection = isConnecting ? '连接中' : isConnected ? '实时同步' : '连接中断'
  const connectionTone = isConnecting ? 'connecting' : isConnected ? 'live' : 'offline'

  return (
    <section className="dashboard-telemetry" aria-label="数据可信度">
      <div className="dashboard-telemetry__header">
        <p className="dashboard-telemetry__title">数据可信度</p>
        <span
          className={`dashboard-telemetry__connection dashboard-telemetry__connection--${connectionTone}`}
        >
          <span className="dashboard-telemetry__status-dot" />
          {connection}
        </span>
      </div>
      <div className="dashboard-telemetry__metrics">
        <div className="dashboard-telemetry__metric">
          <p className="dashboard-telemetry__label">数据延迟（≥ {dataDelayWarningSeconds}秒）</p>
          <p
            className={`dashboard-telemetry__value ${isStale ? 'dashboard-telemetry__value--warning' : ''}`}
          >
            {dataDelay === null ? '等待首包' : formatDelay(dataDelay)}
          </p>
        </div>
        <div className="dashboard-telemetry__metric">
          <p className="dashboard-telemetry__label">本次重连</p>
          <p className="dashboard-telemetry__value">{reconnectCount} 次</p>
        </div>
        <div className="dashboard-telemetry__metric">
          <p className="dashboard-telemetry__label">推送频率</p>
          <p className="dashboard-telemetry__value">约 5 秒</p>
        </div>
      </div>
    </section>
  )
}
