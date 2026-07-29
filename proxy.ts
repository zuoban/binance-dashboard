/**
 * Next.js 路由代理
 *
 * 保护 API 路由和看板页面
 */

import { NextRequest, NextResponse } from 'next/server'
import { authConfig } from '@/lib/config'
import { AUTH_COOKIE_NAME, validateAuthSession } from '@/lib/middleware/auth'

// 不需要认证的 API 路径
const PUBLIC_API_PATHS = ['/api/auth/verify']

// 需要会话认证的页面路径
const PROTECTED_PAGE_PATHS = ['/dashboard']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 开发模式且未配置访问码时，跳过认证
  if (!authConfig.accessCode) {
    return NextResponse.next()
  }

  const isApiRequest = pathname.startsWith('/api')
  const isProtectedPage = PROTECTED_PAGE_PATHS.some(
    path => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (!isApiRequest && !isProtectedPage) {
    return NextResponse.next()
  }

  // 公开 API 不需要认证
  if (isApiRequest && PUBLIC_API_PATHS.some(path => pathname === path)) {
    return NextResponse.next()
  }

  // 仅接受 HttpOnly 会话 Cookie，避免将访问码暴露给 JavaScript、URL 和日志。
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value

  if (!(await validateAuthSession(sessionToken))) {
    if (isProtectedPage) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(loginUrl)
    }

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
  matcher: ['/api/:path*', '/dashboard/:path*'],
}
