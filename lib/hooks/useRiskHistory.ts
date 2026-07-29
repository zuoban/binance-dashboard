/**
 * 风险历史 Hook
 *
 * 监听新出现的风险信号并在当前浏览器保留可复盘的时间线。
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RiskAlert } from '@/lib/utils/risk'
import {
  appendRiskHistory,
  parseRiskHistory,
  type RiskHistoryEvent,
} from '@/lib/utils/risk-history'

const RISK_HISTORY_STORAGE_KEY = 'dashboard-risk-history'

function getStoredRiskHistory(): RiskHistoryEvent[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    return parseRiskHistory(
      JSON.parse(window.localStorage.getItem(RISK_HISTORY_STORAGE_KEY) || 'null') as unknown
    )
  } catch {
    return []
  }
}

/** 返回本地风险时间线和清空操作。 */
export function useRiskHistory(alerts: RiskAlert[]) {
  const [history, setHistory] = useState<RiskHistoryEvent[]>(getStoredRiskHistory)
  const activeAlertKeysRef = useRef(new Set<string>())

  const clearHistory = useCallback(() => {
    setHistory([])

    try {
      window.localStorage.removeItem(RISK_HISTORY_STORAGE_KEY)
    } catch {
      // 存储不可用时仅清空当前页面中的时间线。
    }
  }, [])

  useEffect(() => {
    const currentAlertKeys = new Set(alerts.map(alert => `${alert.id}-${alert.severity}`))
    const newAlerts = alerts.filter(
      alert => !activeAlertKeysRef.current.has(`${alert.id}-${alert.severity}`)
    )
    activeAlertKeysRef.current = currentAlertKeys

    if (newAlerts.length === 0) {
      return
    }

    // 风险事件来自外部实时数据流，写入本地时间线需要同步 React 状态。
    setHistory(previous => {
      const next = appendRiskHistory(previous, newAlerts, Date.now())

      try {
        window.localStorage.setItem(RISK_HISTORY_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // 存储不可用时仍保留本次页面会话中的记录。
      }

      return next
    })
  }, [alerts])

  return { history, clearHistory }
}
