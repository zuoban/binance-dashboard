/**
 * Dashboard SSE API Route
 *
 * 提供实时看板数据的 SSE 连接
 *
 * 新架构特性：
 * - 全局单例 DataManager 统一获取数据
 * - 所有连接共享同一数据源
 * - 避免多标签页重复调用币安 API
 */

import { NextRequest } from 'next/server'
import { getConnectionManager } from '@/lib/services/connection-manager'
import { getDataManager } from '@/lib/services/data-manager'

/**
 * GET /api/dashboard/ws
 * SSE (Server-Sent Events) 流
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const connectionId = crypto.randomUUID()

  const stream = new ReadableStream({
    async start(controller) {
      // 获取管理器实例
      const connectionManager = getConnectionManager()
      const dataManager = getDataManager()

      /**
       * 发送 SSE 事件
       */
      const sendEvent = (data: Record<string, unknown>, event = 'data') => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      try {
        // 1. 立即发送当前最新数据（如果 DataManager 已有数据）
        const currentData = dataManager.getCurrentData()
        if (currentData) {
          sendEvent({
            type: 'data',
            data: currentData,
            timestamp: Date.now(),
          })
        }

        // 2. 注册连接到 ConnectionManager
        // 连接会自动接收后续的数据广播
        const cleanup = connectionManager.registerConnection(connectionId, controller, encoder)

        // 3. 设置断开清理
        request.signal.addEventListener('abort', () => {
          cleanup()
          controller.close()
          console.log(`[Dashboard WS] Connection ${connectionId.slice(0, 8)}... closed`)
        })

        console.log(
          `[Dashboard WS] Connection ${connectionId.slice(0, 8)}... established. ` +
            `Active: ${connectionManager.getConnectionCount()}`
        )
      } catch (error) {
        // 注册失败（如连接数超限）
        sendEvent(
          {
            type: 'error',
            error: error instanceof Error ? error.message : 'Connection failed',
            timestamp: Date.now(),
          },
          'error'
        )
        controller.close()
        console.error(`[Dashboard WS] Connection ${connectionId.slice(0, 8)}... failed:`, error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
