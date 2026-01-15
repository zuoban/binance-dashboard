/**
 * 连接管理器
 *
 * 全局单例，负责：
 * - 跟踪所有活跃的 SSE 连接
 * - 向连接发送数据更新
 * - 处理连接断开和清理
 * - 管理 DataManager 的生命周期
 */

import type { SSEConnection, DashboardData, ConnectionManagerConfig } from './types'
import { DataManager } from './data-manager'

/**
 * 连接管理器类（单例模式）
 */
export class ConnectionManager {
  /** 单例实例 */
  private static instance: ConnectionManager | null = null

  /** 活跃连接集合 */
  private connections: Map<string, SSEConnection> = new Map()

  /** 数据管理器 */
  private dataManager: DataManager

  /** 配置 */
  private config: ConnectionManagerConfig

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    this.dataManager = DataManager.getInstance()
    this.config = {
      maxConnections: 100, // 最大 100 个并发连接
      enableLog: process.env.NODE_ENV === 'development',
    }

    this.log('[ConnectionManager] Initialized')
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConnectionManager {
    if (!this.instance) {
      this.instance = new ConnectionManager()
    }
    return this.instance
  }

  /**
   * 注册新连接
   *
   * @param id 连接唯一 ID
   * @param controller ReadableStream 控制器
   * @param encoder 文本编码器
   * @returns 清理函数
   */
  registerConnection(
    id: string,
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder
  ): () => void {
    // 检查连接数限制
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error(
        `[ConnectionManager] Maximum connections reached (${this.config.maxConnections})`
      )
    }

    // 创建连接对象
    const connection: SSEConnection = {
      id,
      controller,
      encoder,
      createdAt: Date.now(),
    }

    // 存储连接
    this.connections.set(id, connection)
    this.log(
      `[ConnectionManager] Connection ${id.slice(0, 8)}... registered. ` +
        `Total: ${this.connections.size}`
    )

    // 增加数据管理器引用计数
    this.dataManager.incrementRef()

    // 如果是第一个连接，数据管理器会自动启动
    if (this.connections.size === 1) {
      this.log('[ConnectionManager] First connection, DataManager started')
    }

    // 订阅数据更新
    const unsubscribe = this.dataManager.subscribe(data => {
      this.sendToConnection(connection, data)
    })

    // 返回清理函数
    return () => {
      this.unregisterConnection(id)
      unsubscribe()
    }
  }

  /**
   * 注销连接
   *
   * @param id 连接 ID
   */
  unregisterConnection(id: string): void {
    if (this.connections.delete(id)) {
      this.log(
        `[ConnectionManager] Connection ${id.slice(0, 8)}... unregistered. ` +
          `Total: ${this.connections.size}`
      )

      // 减少数据管理器引用计数
      this.dataManager.decrementRef()

      // 如果没有连接了，数据管理器会自动停止
      if (this.connections.size === 0) {
        this.log('[ConnectionManager] No connections, DataManager stopped')
      }
    }
  }

  /**
   * 发送数据到指定连接
   *
   * @param connection 连接对象
   * @param data 看板数据
   */
  private sendToConnection(connection: SSEConnection, data: DashboardData): void {
    try {
      // 构造 SSE 消息
      const message = `event: data\ndata: ${JSON.stringify({
        type: 'data',
        data,
        timestamp: Date.now(),
      })}\n\n`

      // 发送数据
      connection.controller.enqueue(connection.encoder.encode(message))
    } catch (error) {
      // 发送失败，移除故障连接
      this.log(`[ConnectionManager] Error sending to ${connection.id.slice(0, 8)}...: ${error}`)
      this.unregisterConnection(connection.id)
    }
  }

  /**
   * 发送错误消息到指定连接
   *
   * @param connection 连接对象
   * @param error 错误信息
   */
  sendErrorToConnection(connection: SSEConnection, error: string): void {
    try {
      const message = `event: error\ndata: ${JSON.stringify({
        type: 'error',
        error,
        timestamp: Date.now(),
      })}\n\n`

      connection.controller.enqueue(connection.encoder.encode(message))
    } catch (err) {
      this.log(`[ConnectionManager] Error sending error to ${connection.id.slice(0, 8)}...: ${err}`)
      this.unregisterConnection(connection.id)
    }
  }

  /**
   * 获取活跃连接数
   */
  getConnectionCount(): number {
    return this.connections.size
  }

  /**
   * 清理所有连接
   */
  clearAllConnections(): void {
    this.log(`[ConnectionManager] Clearing all connections (${this.connections.size})`)

    for (const [id] of this.connections) {
      this.unregisterConnection(id)
    }

    this.connections.clear()
  }

  /**
   * 日志输出
   */
  private log(message: string): void {
    if (this.config.enableLog) {
      console.log(message)
    }
  }
}

/**
 * 导出单例获取函数
 */
export function getConnectionManager(): ConnectionManager {
  return ConnectionManager.getInstance()
}
