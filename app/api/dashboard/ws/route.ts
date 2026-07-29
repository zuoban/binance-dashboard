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
import { AUTH_COOKIE_NAME, validateAuthSession } from '@/lib/middleware/auth'

/**
 * GET /api/dashboard/ws
 * SSE (Server-Sent Events) 流
 */
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value

  // Proxy 已保护 API 路由；这里再次检查，避免部署配置变更时暴露实时流。
  if (!(await validateAuthSession(sessionToken))) {
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
      /**
       * 发送 SSE 事件
       */
      const sendEvent = (data: Record<string, unknown>, event = 'data') => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      try {
        // 注册连接到 ConnectionManager。subscribe 会立即发送缓存快照，避免重复推送。
        const cleanup = connectionManager.registerConnection(connectionId, controller, encoder)

        // 设置断开清理
        request.signal.addEventListener('abort', () => {
          cleanup()
          controller.close()
        })
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
