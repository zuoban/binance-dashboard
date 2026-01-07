/**
 * 持仓状态管理 Store
 *
 * 使用 Zustand 管理持仓数据的全局状态
 */

import { create } from 'zustand';
import { Position } from '@/types/binance';
import { LoadingState } from '@/types/common';
import { mapBinancePositions } from '@/lib/utils/binance-mapper';

interface PositionsState {
  // 状态
  positions: Position[];
  loadingState: LoadingState;
  error: string | null;
  lastUpdated: number | null;

  // Actions
  setPositions: (positions: Position[]) => void;
  updatePosition: (symbol: string, data: Partial<Position>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  fetchPositions: () => Promise<void>;
  reset: () => void;
}

/**
 * 持仓 Store
 */
export const usePositionsStore = create<PositionsState>((set, get) => ({
  // 初始状态
  positions: [],
  loadingState: 'idle',
  error: null,
  lastUpdated: null,

  // 设置持仓列表
  setPositions: (positions) =>
    set({
      positions,
      loadingState: 'success',
      error: null,
      lastUpdated: Date.now(),
    }),

  // 更新单个持仓
  updatePosition: (symbol, data) =>
    set((state) => ({
      positions: state.positions.map((pos) =>
        pos.symbol === symbol ? { ...pos, ...data } : pos
      ),
    })),

  // 设置加载状态
  setLoading: (loading) =>
    set({
      loadingState: loading ? 'loading' : 'idle',
    }),

  // 设置错误
  setError: (error) =>
    set({
      error,
      loadingState: 'error',
    }),

  // 清除错误
  clearError: () =>
    set({
      error: null,
    }),

  // 获取持仓数据
  fetchPositions: async () => {
    const { setLoading, setError, setPositions } = get();

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/binance/positions');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch positions');
      }

      // 使用映射函数转换数据
      const mappedPositions = mapBinancePositions(result.data || []);
      console.log('[Positions Store] Fetched positions:', mappedPositions);

      setPositions(mappedPositions);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(message);
      console.error('[Positions Store] Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  },

  // 重置状态
  reset: () =>
    set({
      positions: [],
      loadingState: 'idle',
      error: null,
      lastUpdated: null,
    }),
}));

// ==================== Selectors ====================

/**
 * 获取有持仓的仓位（过滤掉持仓数量为0的）
 */
export const getActivePositions = (positions: Position[]) => {
  return positions.filter((p) => parseFloat(p.positionAmount) !== 0);
};

/**
 * 获取总未实现盈亏
 */
export const getTotalUnrealizedProfit = (positions: Position[]) => {
  return positions.reduce((total, p) => {
    return total + parseFloat(p.unrealizedProfit || '0');
  }, 0);
};

/**
 * 按交易对获取持仓
 */
export const getPositionBySymbol = (positions: Position[], symbol: string) => {
  return positions.find((p) => p.symbol === symbol);
};
