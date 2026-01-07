/**
 * 访问码验证 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/config';

/**
 * POST /api/auth/verify
 * 验证访问码是否正确
 */
export async function POST(request: NextRequest) {
  const code = request.headers.get('x-access-code');

  if (!code) {
    return NextResponse.json(
      { success: false, error: { message: '缺少访问码' } },
      { status: 400 }
    );
  }

  // 如果未配置访问码，允许访问
  if (!authConfig.accessCode) {
    return NextResponse.json({ success: true });
  }

  if (code === authConfig.accessCode) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: { message: '访问码错误' } },
    { status: 401 }
  );
}
