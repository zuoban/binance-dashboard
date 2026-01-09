/**
 * useDashboardConfig Hook
 *
 * 管理看板配置，使用 localStorage 持久化
 */

import { useState, useEffect } from 'react'

interface DashboardConfig {
  /** 自动刷新间隔（毫秒） */
  refreshInterval: number
  /** 订单查询时间范围（毫秒） */
  orderTimeRange: number
}

const DEFAULT_CONFIG: DashboardConfig = {
  refreshInterval: 10000, // 10秒
  orderTimeRange: 60 * 60 * 1000, // 1小时
}

const STORAGE_KEY = 'dashboard_config'

/**
 * 看板配置 Hook
 */
export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)

  // 客户端挂载后从 localStorage 读取配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setConfig({ ...DEFAULT_CONFIG, ...parsed })
      }
    } catch (error) {
      console.error('Failed to load dashboard config:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  /**
   * 更新配置
   */
  const updateConfig = (newConfig: Partial<DashboardConfig>) => {
    const updated = { ...config, ...newConfig }
    setConfig(updated)

    // 保存到 localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to save dashboard config:', error)
      }
    }
  }

  /**
   * 重置为默认配置
   */
  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG))
      } catch (error) {
        console.error('Failed to reset dashboard config:', error)
      }
    }
  }

  return {
    config,
    updateConfig,
    resetConfig,
    isLoaded,
  }
}
