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
  clearRiskHistory,
  getNewRiskAlerts,
  getRiskAlertKey,
  loadRiskHistory,
  saveRiskHistory,
  type RiskHistoryStorage,
  type RiskHistoryEvent,
} from '@/lib/utils/risk-history'

function getBrowserStorage(): RiskHistoryStorage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getStoredRiskHistory(): RiskHistoryEvent[] {
  const storage = getBrowserStorage()
  return storage ? loadRiskHistory(storage) : []
}

/** 返回本地风险时间线和清空操作。 */
export function useRiskHistory(alerts: RiskAlert[]) {
  const [history, setHistory] = useState<RiskHistoryEvent[]>(getStoredRiskHistory)
  const activeAlertKeysRef = useRef(new Set<string>())

  const clearHistory = useCallback(() => {
    setHistory([])

    const storage = getBrowserStorage()
    if (storage) {
      clearRiskHistory(storage)
    }
  }, [])

  useEffect(() => {
    const currentAlertKeys = new Set(alerts.map(getRiskAlertKey))
    const newAlerts = getNewRiskAlerts(alerts, activeAlertKeysRef.current)
    activeAlertKeysRef.current = currentAlertKeys

    if (newAlerts.length === 0) {
      return
    }

    // 风险事件来自外部实时数据流，写入本地时间线需要同步 React 状态。
    setHistory(previous => {
      const next = appendRiskHistory(previous, newAlerts, Date.now())
      const storage = getBrowserStorage()

      if (storage) {
        saveRiskHistory(storage, next)
      }

      return next
    })
  }, [alerts])

  return { history, clearHistory }
}
