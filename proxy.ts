/**
 * Next.js 路由代理
 *
 * 保护 API 路由
 */

import { NextRequest, NextResponse } from 'next/server'
import { authConfig } from '@/lib/config'

// 不需要认证的 API 路径
const PUBLIC_API_PATHS = ['/api/auth/verify']

export function proxy(request: NextRequest) {
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

  // 验证访问码
  // 支持两种方式：请求头（fetch API）和查询参数（EventSource）
  const codeFromHeader = request.headers.get('x-access-code')
  const codeFromQuery = request.nextUrl.searchParams.get('code')
  const accessCode = codeFromHeader || codeFromQuery

  if (!accessCode || accessCode !== authConfig.accessCode) {
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
