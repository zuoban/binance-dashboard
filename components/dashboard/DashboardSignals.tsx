/**
 * 看板信号组件
 *
 * 集中展示风险提醒与实时数据可信度，帮助用户快速判断当前看板是否适合决策。
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
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
  theme: 'dark' | 'light'
}

interface DataReliabilityProps {
  lastUpdate: number | null
  isConnected: boolean
  isConnecting: boolean
  reconnectCount: number
  dataDelayWarningSeconds: number
  theme: 'dark' | 'light'
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

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={openSettings}
        className="rounded-md border border-current/20 px-2 py-1 text-[10px] font-bold tracking-wide opacity-75 transition hover:bg-white/45 hover:opacity-100"
      >
        阈值设置
      </button>
      {isOpen && (
        <div className="mt-3 border-t border-current/15 pt-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-[11px] font-semibold">
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
            <label className="text-[11px] font-semibold">
              强平严重（%）
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={draft.liquidationCriticalPercent}
                onChange={event => updateDraft('liquidationCriticalPercent', event.target.value)}
                className="theme-field"
              />
            </label>
            <label className="text-[11px] font-semibold">
              保证金预警（%）
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={draft.availableMarginWarningPercent}
                onChange={event => updateDraft('availableMarginWarningPercent', event.target.value)}
                className="theme-field"
              />
            </label>
            <label className="text-[11px] font-semibold">
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
            <label className="text-[11px] font-semibold">
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
            <p role="alert" className="mt-2 text-[11px] font-semibold text-red-700">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleSave} className="theme-action-button">
              保存到此浏览器
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-current/20 px-2.5 py-1.5 text-[11px] font-bold opacity-80 transition hover:bg-white/45 hover:opacity-100"
            >
              恢复默认
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-1 text-[11px] font-semibold opacity-70 transition hover:opacity-100"
            >
              取消
            </button>
          </div>
        </div>
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
    <div className="mt-3 border-t border-current/15 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold">风险历史</p>
          <p className="text-[10px] font-medium opacity-70">本地保留最近 100 条事件</p>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] font-bold opacity-70 transition hover:opacity-100"
            >
              清空
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(current => !current)}
            className="rounded-md border border-current/20 px-2 py-1 text-[10px] font-bold transition hover:bg-white/45"
            aria-expanded={isOpen}
          >
            {isOpen ? '收起' : `查看${history.length > 0 ? `（${history.length}）` : ''}`}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="mt-3 space-y-2 border-l border-current/20 pl-3">
          {visibleHistory.length > 0 ? (
            visibleHistory.map(event => (
              <div key={event.id} className="relative">
                <span
                  className={`absolute -left-[1.05rem] top-1.5 h-1.5 w-1.5 rounded-full ${
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

/** 风险监控条。无风险时保持低干扰状态，有风险时突出显示最高等级信号。 */
export function RiskMonitor({
  alerts,
  thresholds,
  onSaveThresholds,
  onResetThresholds,
  theme,
}: RiskMonitorProps) {
  const { history, clearHistory } = useRiskHistory(alerts)
  const visibleAlerts = alerts.slice(0, 3)
  const hasCriticalAlert = alerts.some(alert => alert.severity === 'critical')
  const severity = hasCriticalAlert ? 'critical' : alerts.length > 0 ? 'warning' : 'healthy'
  const styles = (
    theme === 'light'
      ? {
          healthy: 'border-[#159b63]/25 bg-[#159b63]/[0.08] text-[#125b3b]',
          warning: 'border-[#ad7120]/25 bg-[#ad7120]/[0.09] text-[#70450c]',
          critical: 'border-[#d95555]/25 bg-[#d95555]/[0.08] text-[#842f2f]',
        }
      : {
          healthy: 'border-[#42d392]/20 bg-[#42d392]/[0.07] text-[#b5f0d0]',
          warning: 'border-[#f3bd62]/25 bg-[#f3bd62]/[0.08] text-[#f6d797]',
          critical: 'border-[#ff7676]/25 bg-[#ff7676]/[0.08] text-[#ffb4b4]',
        }
  )[severity]

  return (
    <section
      aria-live="polite"
      className={`risk-monitor relative overflow-hidden rounded-xl border px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.13)] backdrop-blur-sm ${styles}`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          severity === 'critical'
            ? 'bg-[#ff7676]'
            : severity === 'warning'
              ? 'bg-[#f3bd62]'
              : 'bg-[#42d392]'
        }`}
      />
      <div className="flex items-start gap-3 pl-1">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            severity === 'critical'
              ? 'bg-[#ff7676]/15 text-[#ffadad]'
              : severity === 'warning'
                ? 'bg-[#f3bd62]/15 text-[#f6d797]'
                : 'bg-[#42d392]/15 text-[#93e5ba]'
          }`}
        >
          <SignalIcon severity={severity} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-bold tracking-wide">风险监控</p>
            <span className="text-[11px] font-medium opacity-70">
              强平距离 ≤ {thresholds.liquidationWarningPercent}% · 可用保证金 ≤{' '}
              {thresholds.availableMarginWarningPercent}%
            </span>
          </div>
          <RiskThresholdSettings
            thresholds={thresholds}
            onSaveThresholds={onSaveThresholds}
            onResetThresholds={onResetThresholds}
            theme={theme}
          />
          {visibleAlerts.length > 0 ? (
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {visibleAlerts.map(alert => (
                <div key={alert.id} className="min-w-0">
                  <p className="truncate text-xs font-semibold">{alert.title}</p>
                  <p className="truncate text-[11px] opacity-75">{alert.description}</p>
                </div>
              ))}
              {alerts.length > visibleAlerts.length && (
                <p className="text-[11px] font-semibold opacity-75">
                  另有 {alerts.length - visibleAlerts.length} 项提醒
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-[11px] font-medium opacity-75">风险指标处于当前预设阈值内。</p>
          )}
          <RiskHistoryTimeline history={history} onClear={clearHistory} />
        </div>
      </div>
    </section>
  )
}

/** 实时数据可信度条，显示连接状态、数据延迟和本次页面会话的重连次数。 */
export function DataReliability({
  lastUpdate,
  isConnected,
  isConnecting,
  reconnectCount,
  dataDelayWarningSeconds,
  theme,
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
  const connectionClassName = isConnecting
    ? 'theme-connection--connecting'
    : isConnected
      ? 'theme-connection--live'
      : 'theme-connection--offline'

  return (
    <section
      className={`data-reliability data-reliability--${theme} rounded-xl border px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.13)] backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="theme-text-primary text-xs font-bold tracking-wide">数据可信度</p>
        <span
          className={`flex items-center gap-1.5 text-[11px] font-semibold ${connectionClassName}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isConnecting
                ? 'animate-pulse bg-[#f3bd62]'
                : isConnected
                  ? 'bg-[#42d392]'
                  : 'bg-[#ff7676]'
            }`}
          />
          {connection}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div>
          <p className="theme-text-muted text-[10px] font-medium uppercase tracking-wider">
            数据延迟（≥ {dataDelayWarningSeconds}秒）
          </p>
          <p
            className={`theme-data-value mt-0.5 font-semibold ${isStale ? 'theme-text-warning' : ''}`}
          >
            {dataDelay === null ? '等待首包' : formatDelay(dataDelay)}
          </p>
        </div>
        <div>
          <p className="theme-text-muted text-[10px] font-medium uppercase tracking-wider">
            本次重连
          </p>
          <p className="theme-data-value mt-0.5 font-semibold">{reconnectCount} 次</p>
        </div>
        <div className="hidden sm:block">
          <p className="theme-text-muted text-[10px] font-medium uppercase tracking-wider">
            推送频率
          </p>
          <p className="theme-data-value mt-0.5 font-semibold">约 5 秒</p>
        </div>
      </div>
    </section>
  )
}
