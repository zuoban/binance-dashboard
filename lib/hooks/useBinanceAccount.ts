/**
 * useBinanceAccount Hook
 *
 * 用于获取和管理币安账户资产数据的自定义 Hook
 */

import { useEffect, useCallback, useMemo } from 'react';
import {
  useAccountStore,
  getTotalWalletBalance,
  getAvailableBalance,
  getUnrealizedProfit,
  getUnrealizedProfitPercentage,
  getAssetsByType,
  getRiskLevel,
} from '@/lib/store';

interface UseBinanceAccountOptions {
  /** 是否自动获取数据 */
  autoFetch?: boolean;
  /** 刷新间隔（毫秒） */
  refreshInterval?: number;
}

/**
 * 账户资产数据 Hook
 *
 * @param options - 配置选项
 * @returns 账户数据和操作方法
 *
 * @example
 * ```tsx
 * const { account, balance, profit, profitPercentage, loading, refetch } = useBinanceAccount({
 *   autoFetch: true,
 *   refreshInterval: 5000,
 * });
 * ```
 */
export function useBinanceAccount(options: UseBinanceAccountOptions = {}) {
  const { autoFetch = true, refreshInterval } = options;

  const {
    account,
    loadingState,
    error,
    fetchAccount,
    clearError,
  } = useAccountStore();

  // 获取账户数据
  const loadAccount = useCallback(async () => {
    await fetchAccount();
  }, [fetchAccount]);

  // 手动刷新
  const refetch = useCallback(async () => {
    await loadAccount();
  }, [loadAccount]);

  // 自动获取数据
  useEffect(() => {
    if (autoFetch) {
      loadAccount();
    }
  }, [autoFetch, loadAccount]);

  // 定时刷新
  useEffect(() => {
    if (!refreshInterval || !autoFetch) return;

    const interval = setInterval(() => {
      loadAccount();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, autoFetch, loadAccount]);

  // 处理错误
  useEffect(() => {
    if (error) {
      console.error('[useBinanceAccount] Error:', error);
    }
  }, [error]);

  // 计算属性
  const balance = useMemo(() => getTotalWalletBalance(account), [account]);
  const availableBalance = useMemo(() => getAvailableBalance(account), [account]);
  const profit = useMemo(() => getUnrealizedProfit(account), [account]);
  const profitPercentage = useMemo(() => getUnrealizedProfitPercentage(account), [account]);
  const assets = useMemo(() => getAssetsByType(account), [account]);
  const riskLevel = useMemo(() => getRiskLevel(account), [account]);

  return {
    // 数据
    account,
    balance,
    availableBalance,
    profit,
    profitPercentage,
    assets,
    riskLevel,
    // 状态
    loading: loadingState === 'loading',
    error,
    isLoading: loadingState === 'loading',
    isSuccess: loadingState === 'success',
    isError: loadingState === 'error',
    // 操作
    refetch,
    clearError,
  };
}
