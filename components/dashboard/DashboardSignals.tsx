/**
 * 看板信号组件
 *
 * 集中展示风险提醒与实时数据可信度，帮助用户快速判断当前看板是否适合决策。
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import type { RiskAlert } from '@/lib/utils/risk'

interface RiskMonitorProps {
  alerts: RiskAlert[]
}

interface DataReliabilityProps {
  lastUpdate: number | null
  isConnected: boolean
  isConnecting: boolean
  reconnectCount: number
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

/** 风险监控条。无风险时保持低干扰状态，有风险时突出显示最高等级信号。 */
export function RiskMonitor({ alerts }: RiskMonitorProps) {
  const visibleAlerts = alerts.slice(0, 3)
  const hasCriticalAlert = alerts.some(alert => alert.severity === 'critical')
  const severity = hasCriticalAlert ? 'critical' : alerts.length > 0 ? 'warning' : 'healthy'
  const styles = {
    healthy: 'border-emerald-100 bg-emerald-50/60 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    critical: 'border-red-200 bg-red-50 text-red-900',
  }[severity]

  return (
    <section
      aria-live="polite"
      className={`relative overflow-hidden rounded-xl border px-4 py-3 ${styles}`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          severity === 'critical'
            ? 'bg-red-500'
            : severity === 'warning'
              ? 'bg-amber-500'
              : 'bg-emerald-500'
        }`}
      />
      <div className="flex items-start gap-3 pl-1">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            severity === 'critical'
              ? 'bg-red-100 text-red-600'
              : severity === 'warning'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-emerald-100 text-emerald-600'
          }`}
        >
          <SignalIcon severity={severity} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-bold tracking-wide">风险监控</p>
            <span className="text-[11px] font-medium opacity-70">
              强平距离 ≤ 8% · 可用保证金 ≤ 25%
            </span>
          </div>
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

  const isStale = dataDelay !== null && dataDelay >= 15000
  const connection = isConnecting ? '连接中' : isConnected ? '实时同步' : '连接中断'
  const connectionClassName = isConnecting
    ? 'text-amber-600'
    : isConnected
      ? 'text-emerald-600'
      : 'text-red-600'

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold tracking-wide text-slate-700">数据可信度</p>
        <span
          className={`flex items-center gap-1.5 text-[11px] font-semibold ${connectionClassName}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isConnecting
                ? 'animate-pulse bg-amber-500'
                : isConnected
                  ? 'bg-emerald-500'
                  : 'bg-red-500'
            }`}
          />
          {connection}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            数据延迟
          </p>
          <p className={`mt-0.5 font-semibold ${isStale ? 'text-amber-600' : 'text-slate-700'}`}>
            {dataDelay === null ? '等待首包' : formatDelay(dataDelay)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            本次重连
          </p>
          <p className="mt-0.5 font-semibold text-slate-700">{reconnectCount} 次</p>
        </div>
        <div className="hidden sm:block">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            推送频率
          </p>
          <p className="mt-0.5 font-semibold text-slate-700">约 5 秒</p>
        </div>
      </div>
    </section>
  )
}
