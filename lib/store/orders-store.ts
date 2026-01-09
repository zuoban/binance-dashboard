/**
 * 订单状态管理 Store
 *
 * 使用 Zustand 管理订单数据的全局状态
 */

import { create } from 'zustand'
import { Order, OrderStatus } from '@/types/binance'
import { LoadingState } from '@/types/common'
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth'

interface OrdersState {
  // 状态
  orders: Order[]
  loadingState: LoadingState
  error: string | null
  lastUpdated: number | null

  // 筛选状态
  filters: {
    symbol?: string
    status?: OrderStatus
    startDate?: number
    endDate?: number
  }

  // 分页状态
  pagination: {
    page: number
    limit: number
    total: number
  }

  // Actions
  setOrders: (orders: Order[]) => void
  addOrder: (order: Order) => void
  updateOrder: (orderId: number, data: Partial<Order>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  fetchOrders: (
    symbol: string,
    options?: {
      orderId?: number
      startTime?: number
      endTime?: number
      limit?: number
    }
  ) => Promise<void>
  setFilters: (filters: Partial<OrdersState['filters']>) => void
  setPagination: (pagination: Partial<OrdersState['pagination']>) => void
  reset: () => void
}

/**
 * 订单 Store
 */
export const useOrdersStore = create<OrdersState>((set, get) => ({
  // 初始状态
  orders: [],
  loadingState: 'idle',
  error: null,
  lastUpdated: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },

  // 设置订单列表
  setOrders: orders =>
    set({
      orders,
      loadingState: 'success',
      error: null,
      lastUpdated: Date.now(),
    }),

  // 添加单个订单
  addOrder: order =>
    set(state => ({
      orders: [order, ...state.orders],
    })),

  // 更新订单
  updateOrder: (orderId, data) =>
    set(state => ({
      orders: state.orders.map(order =>
        order.orderId === orderId ? { ...order, ...data } : order
      ),
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

  // 获取订单数据
  fetchOrders: async (symbol, options = {}) => {
    const { setLoading, setError, setOrders, setPagination } = get()

    try {
      setLoading(true)
      setError(null)

      // 构建查询参数，只有当 symbol 存在时才添加
      const params: Record<string, string> = {}
      if (symbol) {
        params.symbol = symbol
      }
      if (options.limit) {
        params.limit = options.limit.toString()
      }
      if (options.startTime) {
        params.startTime = options.startTime.toString()
      }
      if (options.endTime) {
        params.endTime = options.endTime.toString()
      }
      if (options.orderId) {
        params.orderId = options.orderId.toString()
      }

      const queryString = new URLSearchParams(params).toString()
      const response = await fetchWithAuth(`/api/binance/orders${queryString ? `?${queryString}` : ''}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch orders')
      }

      const orders = result.data || []
      setOrders(orders)
      setPagination({ total: orders.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setError(message)
      console.error('[Orders Store] Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  },

  // 设置筛选条件
  setFilters: filters =>
    set(state => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    })),

  // 设置分页
  setPagination: pagination =>
    set(state => ({
      pagination: { ...state.pagination, ...pagination },
    })),

  // 重置状态
  reset: () =>
    set({
      orders: [],
      loadingState: 'idle',
      error: null,
      lastUpdated: null,
      filters: {},
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
    }),
}))

// ==================== Selectors ====================

/**
 * 根据筛选条件过滤订单
 */
export const getFilteredOrders = (state: OrdersState) => {
  let filtered = [...state.orders]

  // 按交易对筛选
  if (state.filters.symbol) {
    filtered = filtered.filter(o => o.symbol === state.filters.symbol)
  }

  // 按状态筛选
  if (state.filters.status) {
    filtered = filtered.filter(o => o.status === state.filters.status)
  }

  // 按时间范围筛选
  if (state.filters.startDate) {
    filtered = filtered.filter(o => o.time >= state.filters.startDate!)
  }

  if (state.filters.endDate) {
    filtered = filtered.filter(o => o.time <= state.filters.endDate!)
  }

  return filtered
}

/**
 * 获取分页后的订单
 */
export const getPaginatedOrders = (orders: Order[], page: number, limit: number) => {
  const start = (page - 1) * limit
  const end = start + limit
  return orders.slice(start, end)
}

/**
 * 按状态统计订单数量
 */
export const getOrdersCountByStatus = (orders: Order[]) => {
  return orders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    },
    {} as Record<OrderStatus, number>
  )
}
