/**
 * 通用类型定义
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: number
    message: string
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta?: PaginationMeta
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface ConnectionState {
  isConnected: boolean
  isConnecting: boolean
  reconnectCount: number
  lastConnected: number | null
  lastDisconnected: number | null
}
