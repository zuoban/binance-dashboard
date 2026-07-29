/**
 * 风险阈值偏好 Hook
 *
 * 将当前浏览器的风险提示偏好保存在 localStorage，不会发送到服务端。
 */

'use client'

import { useCallback, useState } from 'react'
import { DEFAULT_RISK_THRESHOLDS, isRiskThresholds, type RiskThresholds } from '@/lib/utils/risk'

const RISK_THRESHOLDS_STORAGE_KEY = 'dashboard-risk-thresholds'

function getStoredRiskThresholds(): RiskThresholds {
  if (typeof window === 'undefined') {
    return DEFAULT_RISK_THRESHOLDS
  }

  try {
    const storedValue: unknown = JSON.parse(
      window.localStorage.getItem(RISK_THRESHOLDS_STORAGE_KEY) || 'null'
    )

    if (
      typeof storedValue === 'object' &&
      storedValue !== null &&
      isRiskThresholds(storedValue as RiskThresholds)
    ) {
      return storedValue as RiskThresholds
    }
  } catch {
    // 本地存储不可用或内容损坏时回退为默认设置。
  }

  return DEFAULT_RISK_THRESHOLDS
}

/** 返回风险阈值、保存和恢复默认设置操作。 */
export function useRiskThresholds() {
  const [thresholds, setThresholds] = useState<RiskThresholds>(getStoredRiskThresholds)

  const saveThresholds = useCallback((nextThresholds: RiskThresholds): boolean => {
    if (!isRiskThresholds(nextThresholds)) {
      return false
    }

    setThresholds(nextThresholds)

    try {
      window.localStorage.setItem(RISK_THRESHOLDS_STORAGE_KEY, JSON.stringify(nextThresholds))
    } catch {
      // 存储不可用不影响当前页面的提示配置。
    }

    return true
  }, [])

  const resetThresholds = useCallback(() => {
    setThresholds(DEFAULT_RISK_THRESHOLDS)

    try {
      window.localStorage.removeItem(RISK_THRESHOLDS_STORAGE_KEY)
    } catch {
      // 存储不可用时仅恢复当前页面的默认设置。
    }
  }, [])

  return { thresholds, saveThresholds, resetThresholds }
}
