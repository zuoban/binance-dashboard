/**
 * 会话过期重定向 Hook
 *
 * 当实时连接异常时校验 HttpOnly 会话 Cookie。仅在服务端确认会话失效后跳转登录页，
 * 因此网络波动不会中断用户当前的看板。
 */

'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth'

interface SessionVerificationResponse {
  success?: unknown
}

const SESSION_CHECK_COOLDOWN = 5000

/**
 * 返回一个可传入实时连接错误回调的会话检查函数。
 */
export function useSessionExpiryRedirect(): () => Promise<void> {
  const router = useRouter()
  const isCheckingRef = useRef(false)
  const lastCheckAtRef = useRef(0)

  return useCallback(async () => {
    const now = Date.now()

    if (isCheckingRef.current || now - lastCheckAtRef.current < SESSION_CHECK_COOLDOWN) {
      return
    }

    isCheckingRef.current = true
    lastCheckAtRef.current = now

    try {
      const response = await fetchWithAuth('/api/auth/verify', { cache: 'no-store' })
      const result = (await response.json()) as SessionVerificationResponse

      if (result.success !== true) {
        router.replace('/login?redirect=/dashboard')
      }
    } catch {
      // 网络异常时保留当前页面，交由 SSE 的自动重连机制恢复连接。
    } finally {
      isCheckingRef.current = false
    }
  }, [router])
}
