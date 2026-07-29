/**
 * 访问码验证 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { authConfig } from '@/lib/config'
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE_SECONDS,
  createAuthSessionToken,
  validateAccessCode,
  validateAuthSession,
} from '@/lib/middleware/auth'
import { checkRateLimit, strictRateLimit } from '@/lib/middleware/rate-limit'

/**
 * GET /api/auth/verify
 * 返回当前 Cookie 会话状态，供客户端路由守卫使用。
 */
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const authenticated = await validateAuthSession(sessionToken)

  return NextResponse.json({ success: authenticated })
}

/**
 * POST /api/auth/verify
 * 验证访问码是否正确
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = await checkRateLimit(request, strictRateLimit)
  if (!rateLimitResult.allowed) {
    return rateLimitResult.error!
  }

  const code = request.headers.get('x-access-code')

  if (authConfig.accessCode && !code) {
    return NextResponse.json({ success: false, error: { message: '缺少访问码' } }, { status: 400 })
  }

  if (validateAccessCode(code)) {
    const response = NextResponse.json({ success: true })

    if (authConfig.accessCode) {
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: await createAuthSessionToken(),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
      })
    }

    return response
  }

  return NextResponse.json({ success: false, error: { message: '访问码错误' } }, { status: 401 })
}
