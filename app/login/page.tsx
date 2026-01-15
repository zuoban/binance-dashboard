/**
 * 访问码登录页面
 */

'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { storeAccessCode } from '@/lib/utils/fetch-with-auth'

function LoginForm() {
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 验证访问码
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': code,
        },
      })

      const result = await response.json()

      if (result.success) {
        // 存储访问码
        storeAccessCode(code)

        // 使用 window.location.href 确保跳转成功
        const redirect = searchParams.get('redirect') || '/dashboard'
        window.location.href = redirect
      } else {
        setError('访问码错误，请重试')
      }
    } catch {
      setError('验证失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="max-w-md w-full">
        {/* 登录卡片 */}
        <div className="card p-8 glow-primary">
          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 gradient-primary rounded-xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#f4f4f5]">访问验证</h1>
            <p className="mt-2 text-sm text-[#71717a]">请输入访问码以继续</p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 访问码输入 */}
            <div>
              <label
                htmlFor="access-code"
                className="block text-sm font-medium text-[#a1a1aa] mb-2"
              >
                访问码
              </label>
              <input
                id="access-code"
                type="password"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-4 py-3 border border-[#1e1e32] rounded-lg bg-[#13131f] text-[#f4f4f5] placeholder-[#71717a] focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent outline-none transition-all duration-200"
                placeholder="请输入访问码"
                autoFocus
                required
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading || !code}
              className="w-full py-3 px-4 gradient-primary hover:opacity-90 disabled:bg-[#71717a] disabled:opacity-50 text-white font-medium rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#f59e0b] focus:ring-offset-2 focus:ring-offset-[#0a0a0f] disabled:cursor-not-allowed"
            >
              {loading ? '验证中...' : '确认'}
            </button>
          </form>
        </div>

        {/* 底部提示 */}
        <p className="mt-6 text-center text-sm text-[#71717a]">币安合约交易看板</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
          <div className="text-[#71717a]">加载中...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
