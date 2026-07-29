/**
 * 访问码认证中间件
 *
 * 验证请求头中的访问码是否正确
 */

import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/config'

/** 认证请求头名称 */
export const AUTH_HEADER = 'x-access-code'

/** 认证会话 Cookie 名称 */
export const AUTH_COOKIE_NAME = 'binance_dashboard_session'

/** 认证会话最长有效期 */
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

const SESSION_VERSION = 'v1'
const textEncoder = new TextEncoder()

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
  // 未配置访问码时不启用认证
  if (!authConfig.accessCode) {
    return true
  }

  return code === authConfig.accessCode
}

/**
 * 生成不可读的无状态会话令牌。
 *
 * 令牌由访问码派生，访问码轮换后旧会话会自动失效，且不会把访问码本身写入 Cookie。
 */
export async function createAuthSessionToken(
  expiresAt: number = Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000
): Promise<string> {
  if (!authConfig.accessCode) {
    return ''
  }

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(authConfig.accessCode),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(`binance-dashboard-session:${SESSION_VERSION}:${expiresAt}`)
  )
  const token = Array.from(new Uint8Array(signature), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')

  return `${SESSION_VERSION}.${expiresAt}.${token}`
}

/**
 * 验证请求携带的会话令牌。
 */
export async function validateAuthSession(token: string | undefined): Promise<boolean> {
  if (!authConfig.accessCode) {
    return true
  }

  if (!token) {
    return false
  }

  const [version, expiryText, signature, ...extraParts] = token.split('.')
  const expiresAt = Number(expiryText)

  if (
    version !== SESSION_VERSION ||
    extraParts.length > 0 ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    return false
  }

  return (
    token === `${SESSION_VERSION}.${expiresAt}.${signature}` &&
    token === (await createAuthSessionToken(expiresAt))
  )
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
