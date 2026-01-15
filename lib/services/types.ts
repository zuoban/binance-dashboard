/**
 * 服务层类型定义
 *
 * 定义数据管理器和连接管理器使用的类型
 */

import type { AccountAsset, Position } from '@/types/binance'

/**
 * 简化的订单类型（只保留页面需要的字段）
 */
export interface SimpleOrder {
  /** 订单 ID */
  orderId: number
  /** 成交记录 ID（可选） */
  id?: number
  /** 交易对 */
  symbol: string
  /** 订单价格 */
  price: string
  /** 原始数量 */
  origQty: string
  /** 已成交数量 */
  executedQty: string
  /** 买卖方向 */
  side: 'BUY' | 'SELL'
  /** 订单状态 */
  status: string
  /** 订单创建时间 */
  time: number
  /** 订单更新时间 */
  updateTime: number
  /** 手续费 */
  commission?: string
  /** 手续费计价单位 */
  commissionAsset?: string
  /** 实现盈亏 */
  realizedPnl?: string
  /** 是否买方 */
  buyer?: boolean
}

/**
 * 开放订单统计
 */
export interface OpenOrdersStats {
  /** 总订单数 */
  total: number
  /** 买单数量 */
  buy: number
  /** 卖单数量 */
  sell: number
}

/**
 * 看板数据
 */
export interface DashboardData {
  /** 账户资产信息 */
  account: AccountAsset
  /** 持仓列表 */
  positions: Position[]
  /** 历史订单（最近 5 条） */
  orders: SimpleOrder[]
  /** 开放订单统计 */
  openOrdersStats: OpenOrdersStats
  /** 开放订单列表 */
  openOrders: SimpleOrder[]
  /** 今日已实现盈亏 */
  todayRealizedPnl: number
  /** 数据时间戳 */
  timestamp: number
}

/**
 * SSE 连接信息
 */
export interface SSEConnection {
  /** 连接唯一 ID */
  id: string
  /** ReadableStream 控制器 */
  controller: ReadableStreamDefaultController
  /** 文本编码器 */
  encoder: TextEncoder
  /** 连接创建时间 */
  createdAt: number
}

/**
 * 数据更新回调函数类型
 */
export type DataCallback = (data: DashboardData) => void

/**
 * 数据管理器指标
 */
export interface DataManagerMetrics {
  /** 总获取次数 */
  totalFetches: number
  /** 失败次数 */
  failedFetches: number
  /** 平均获取耗时（毫秒） */
  avgFetchTime: number
  /** 最后获取时间 */
  lastFetchTime: number
  /** 广播次数 */
  broadcastsSent: number
}

/**
 * 数据管理器配置
 */
export interface DataManagerConfig {
  /** 数据刷新间隔（毫秒） */
  refreshInterval: number
  /** 心跳间隔（毫秒） */
  heartbeatInterval: number
  /** 最大重试次数 */
  maxRetries: number
  /** 是否启用日志 */
  enableLog: boolean
}

/**
 * 连接管理器配置
 */
export interface ConnectionManagerConfig {
  /** 最大连接数 */
  maxConnections: number
  /** 是否启用日志 */
  enableLog: boolean
}

/**
 * SSE 事件类型
 */
export type SSEEventType = 'data' | 'heartbeat' | 'error'

/**
 * SSE 消息
 */
export interface SSEMessage<T = unknown> {
  /** 消息类型 */
  type: SSEEventType
  /** 消息数据 */
  data?: T
  /** 错误信息（仅错误消息） */
  error?: string
  /** 时间戳 */
  timestamp: number
}
