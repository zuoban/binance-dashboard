/**
 * useBinanceOrders Hook
 *
 * 用于获取和管理币安订单数据的自定义 Hook
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useOrdersStore } from '@/lib/store';

interface UseBinanceOrdersOptions {
  /** 交易对（可选） */
  symbol?: string;
  /** 是否自动获取数据 */
  autoFetch?: boolean;
  /** 订单 ID（查询单个订单） */
  orderId?: number;
  /** 开始时间 */
  startTime?: number;
  /** 结束时间 */
  endTime?: number;
  /** 每页数量 */
  limit?: number;
}

/**
 * 订单数据 Hook
 *
 * @param options - 配置选项
 * @returns 订单数据和操作方法
 *
 * @example
 * ```tsx
 * // 查询特定交易对的订单
 * const { orders, loading, error, refetch, pagination } = useBinanceOrders({
 *   symbol: 'BTCUSDT',
 *   autoFetch: true,
 *   limit: 50,
 * });
 *
 * // 不指定 symbol，返回空数组（用于不需要订单数据的场景）
 * const { orders } = useBinanceOrders({
 *   autoFetch: false,
 * });
 * ```
 */
export function useBinanceOrders(options: UseBinanceOrdersOptions) {
  const {
    symbol,
    autoFetch = true,
    orderId,
    startTime,
    endTime,
    limit = 20,
  } = options;

  const {
    orders,
    loadingState,
    error,
    filters,
    pagination,
    fetchOrders,
    setFilters,
    setPagination,
    clearError,
  } = useOrdersStore();

  // 获取订单数据
  const loadOrders = useCallback(async () => {
    if (!symbol) return;
    await fetchOrders(symbol, {
      orderId,
      startTime,
      endTime,
      limit,
    });
  }, [fetchOrders, symbol, orderId, startTime, endTime, limit]);

  // 手动刷新
  const refetch = useCallback(async () => {
    await loadOrders();
  }, [loadOrders]);

  // 更改页码
  const goToPage = useCallback(
    (page: number) => {
      setPagination({ page });
    },
    [setPagination]
  );

  // 更改筛选条件
  const applyFilters = useCallback(
    (newFilters: Parameters<typeof setFilters>[0]) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  // 自动获取数据
  useEffect(() => {
    if (autoFetch && symbol) {
      loadOrders();
    }
  }, [autoFetch, symbol, loadOrders]);

  // 处理错误
  useEffect(() => {
    if (error) {
      console.error('[useBinanceOrders] Error:', error);
    }
  }, [error]);

  // 过滤订单
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // 按交易对筛选
    if (filters.symbol) {
      result = result.filter((o) => o.symbol === filters.symbol);
    }

    // 按状态筛选
    if (filters.status) {
      result = result.filter((o) => o.status === filters.status);
    }

    // 按时间范围筛选
    if (filters.startDate) {
      result = result.filter((o) => o.time >= filters.startDate!);
    }

    if (filters.endDate) {
      result = result.filter((o) => o.time <= filters.endDate!);
    }

    return result;
  }, [orders, filters]);

  // 分页订单
  const paginatedOrders = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, pagination]);

  return {
    // 数据
    orders: paginatedOrders,
    allOrders: orders,
    filteredOrders,
    // 状态
    loading: loadingState === 'loading',
    error,
    isLoading: loadingState === 'loading',
    isSuccess: loadingState === 'success',
    isError: loadingState === 'error',
    // 操作
    refetch,
    goToPage,
    applyFilters,
    clearError,
    // 分页信息
    pagination: {
      ...pagination,
      totalPages: Math.ceil(filteredOrders.length / pagination.limit),
    },
  };
}
