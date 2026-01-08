/**
 * 访问码认证中间件
 *
 * 验证请求头中的访问码是否正确
 */

import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/config'

/** 认证请求头名称 */
export const AUTH_HEADER = 'x-access-code'

/** 认证失败响应 */
export function createAuthErrorResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '访问被拒绝，请输入正确的访问码',
      },
    },
    { status: 401 }
  )
}

/**
 * 验证访问码
 */
export function validateAccessCode(code: string | null): boolean {
  if (!code) return false

  // 如果未配置访问码，则允许访问（开发模式）
  if (!authConfig.accessCode) {
    return true
  }

  return code === authConfig.accessCode
}

/**
 * 从请求中提取并验证访问码
 */
export function checkAuth(request: Request): { authenticated: boolean; error?: Response } {
  const code = request.headers.get(AUTH_HEADER)

  if (!validateAccessCode(code)) {
    return {
      authenticated: false,
      error: createAuthErrorResponse(),
    }
  }

  return { authenticated: true }
}
