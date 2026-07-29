/**
 * Next.js 路由代理
 *
 * 保护 API 路由
 */

import { NextRequest, NextResponse } from 'next/server'
import { authConfig } from '@/lib/config'
import { AUTH_COOKIE_NAME, validateAuthSession } from '@/lib/middleware/auth'

// 不需要认证的 API 路径
const PUBLIC_API_PATHS = ['/api/auth/verify']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 开发模式且未配置访问码时，跳过认证
  if (!authConfig.accessCode) {
    return NextResponse.next()
  }

  // 只处理 API 路由
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 公开 API 不需要认证
  if (PUBLIC_API_PATHS.some(path => pathname === path)) {
    return NextResponse.next()
  }

  // 仅接受 HttpOnly 会话 Cookie，避免将访问码暴露给 JavaScript、URL 和日志。
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value

  if (!(await validateAuthSession(sessionToken))) {
    return new NextResponse(
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
