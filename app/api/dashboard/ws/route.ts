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
import { authConfig } from '@/lib/config'

/**
 * GET /api/dashboard/ws
 * SSE (Server-Sent Events) 流
 */
export async function GET(request: NextRequest) {
  // 从查询参数获取访问码（EventSource 不支持自定义请求头）
  const { searchParams } = new URL(request.url)
  const codeFromQuery = searchParams.get('code')
  const codeFromHeader = request.headers.get('x-access-code')

  // 优先使用请求头中的访问码，其次使用查询参数
  const accessCode = codeFromHeader || codeFromQuery

  // 验证访问码
  if (authConfig.accessCode && accessCode !== authConfig.accessCode) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '访问被拒绝',
        },
      }),
      {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }
    )
  }

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
