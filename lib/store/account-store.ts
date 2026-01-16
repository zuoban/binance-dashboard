/**
 * 账户状态管理 Store
 *
 * 使用 Zustand 管理账户资产数据的全局状态
 */

import { create } from 'zustand'
import { AccountAsset } from '@/types/binance'
import { LoadingState } from '@/types/common'
import { mapBinanceAccount } from '@/lib/utils/account-mapper'
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth'

interface AccountState {
  // 状态
  account: AccountAsset | null
  loadingState: LoadingState
  error: string | null
  lastUpdated: number | null

  // Actions
  setAccount: (account: AccountAsset) => void
  updateBalance: (balance: string) => void
  updateUnrealizedProfit: (profit: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  fetchAccount: () => Promise<void>
  reset: () => void
}

/**
 * 账户 Store
 */
export const useAccountStore = create<AccountState>((set, get) => ({
  // 初始状态
  account: null,
  loadingState: 'idle',
  error: null,
  lastUpdated: null,

  // 设置账户信息
  setAccount: account =>
    set({
      account,
      loadingState: 'success',
      error: null,
      lastUpdated: Date.now(),
    }),

  // 更新余额
  updateBalance: balance =>
    set(state => ({
      account: state.account
        ? {
            ...state.account,
            availableBalance: balance,
          }
        : null,
    })),

  // 更新未实现盈亏
  updateUnrealizedProfit: profit =>
    set(state => ({
      account: state.account
        ? {
            ...state.account,
            unrealizedProfit: profit,
          }
        : null,
    })),

  // 设置加载状态
  setLoading: loading =>
    set({
      loadingState: loading ? 'loading' : 'idle',
    }),

  // 设置错误
  setError: error =>
    set({
      error,
      loadingState: 'error',
    }),

  // 清除错误
  clearError: () =>
    set({
      error: null,
    }),

  // 获取账户信息
  fetchAccount: async () => {
    const { setLoading, setError, setAccount } = get()

    try {
      setLoading(true)
      setError(null)

      const response = await fetchWithAuth('/api/binance/account')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch account information')
      }

      // 映射 API 数据到我们的类型
      const mappedAccount = mapBinanceAccount(result.data)
      setAccount(mappedAccount)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  },

  // 重置状态
  reset: () =>
    set({
      account: null,
      loadingState: 'idle',
      error: null,
      lastUpdated: null,
    }),
}))

// ==================== Selectors ====================

/**
 * 获取总余额
 */
export const getTotalWalletBalance = (account: AccountAsset | null) => {
  if (!account) return '0'
  return account.totalWalletBalance
}

/**
 * 获取可用余额
 */
export const getAvailableBalance = (account: AccountAsset | null) => {
  if (!account) return '0'
  return account.availableBalance
}

/**
 * 获取未实现盈亏
 */
export const getUnrealizedProfit = (account: AccountAsset | null) => {
  if (!account) return '0'
  return account.unrealizedProfit
}

/**
 * 获取盈亏百分比
 */
export const getUnrealizedProfitPercentage = (account: AccountAsset | null) => {
  if (!account) return '0'
  const balance = parseFloat(account.totalWalletBalance)
  const profit = parseFloat(account.unrealizedProfit)
  if (isNaN(balance) || balance === 0) return '0'
  if (isNaN(profit)) return '0'
  return ((profit / balance) * 100).toFixed(2)
}

/**
 * 按资产类型分组
 */
export const getAssetsByType = (account: AccountAsset | null) => {
  if (!account) return []
  return account.assets || []
}

/**
 * 获取特定资产信息
 */
export const getAssetBySymbol = (account: AccountAsset | null, symbol: string) => {
  if (!account) return null
  return account.assets?.find(a => a.asset === symbol) || null
}

/**
 * 计算风险等级
 */
export const getRiskLevel = (account: AccountAsset | null): 'low' | 'medium' | 'high' => {
  if (!account) return 'low'

  const balance = parseFloat(account.totalWalletBalance)
  const unrealizedProfit = parseFloat(account.unrealizedProfit)

  if (isNaN(balance) || isNaN(unrealizedProfit) || balance === 0) return 'low'

  const profitPercentage = (unrealizedProfit / balance) * 100

  if (profitPercentage < -10) return 'high'
  if (profitPercentage < -5) return 'medium'
  return 'low'
}
