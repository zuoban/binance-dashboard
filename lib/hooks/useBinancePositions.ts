/**
 * useBinancePositions Hook
 *
 * 用于获取和管理币安持仓数据的自定义 Hook
 */

import { useEffect, useCallback } from 'react';
import { usePositionsStore, getActivePositions, getTotalUnrealizedProfit } from '@/lib/store';

interface UseBinancePositionsOptions {
  /** 是否自动获取数据 */
  autoFetch?: boolean;
  /** 刷新间隔（毫秒） */
  refreshInterval?: number;
  /** 是否只显示有持仓的仓位 */
  onlyActive?: boolean;
}

/**
 * 持仓数据 Hook
 *
 * @param options - 配置选项
 * @returns 持仓数据和操作方法
 *
 * @example
 * ```tsx
 * const { positions, loading, error, refetch } = useBinancePositions({
 *   autoFetch: true,
 *   refreshInterval: 5000,
 *   onlyActive: true,
 * });
 * ```
 */
export function useBinancePositions(options: UseBinancePositionsOptions = {}) {
  const {
    autoFetch = true,
    refreshInterval,
    onlyActive = false,
  } = options;

  const {
    positions,
    loadingState,
    error,
    fetchPositions,
    clearError,
  } = usePositionsStore();

  // 获取持仓数据
  const loadPositions = useCallback(async () => {
    await fetchPositions();
  }, [fetchPositions]);

  // 手动刷新
  const refetch = useCallback(async () => {
    await loadPositions();
  }, [loadPositions]);

  // 自动获取数据
  useEffect(() => {
    if (autoFetch) {
      loadPositions();
    }
  }, [autoFetch, loadPositions]);

  // 定时刷新
  useEffect(() => {
    if (!refreshInterval || !autoFetch) return;

    const interval = setInterval(() => {
      loadPositions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, autoFetch, loadPositions]);

  // 处理错误
  useEffect(() => {
    if (error) {
      console.error('[useBinancePositions] Error:', error);
    }
  }, [error]);

  // 过滤持仓
  const filteredPositions = onlyActive ? getActivePositions(positions) : positions;

  // 计算总未实现盈亏
  const totalUnrealizedProfit = getTotalUnrealizedProfit(filteredPositions);

  return {
    // 数据
    positions: filteredPositions,
    totalUnrealizedProfit,
    loading: loadingState === 'loading',
    error,
    // 操作
    refetch,
    clearError,
    // 状态
    isLoading: loadingState === 'loading',
    isSuccess: loadingState === 'success',
    isError: loadingState === 'error',
  };
}
