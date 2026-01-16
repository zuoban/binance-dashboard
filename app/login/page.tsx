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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b]/5 via-transparent to-[#3b82f6]/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.08),transparent_50%)]" />
      <div className="relative max-w-md w-full px-4">
        <div className="card p-8 glow-primary backdrop-blur-sm bg-opacity-90">
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-5 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-[#f59e0b]/20 transition-transform hover:scale-105">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gradient mb-2">访问验证</h1>
            <p className="text-sm text-[#71717a]">请输入访问码以继续访问交易看板</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="access-code"
                className="block text-xs font-semibold text-[#a1a1aa] mb-2 uppercase tracking-wider"
              >
                访问码
              </label>
              <div className="relative">
                <input
                  id="access-code"
                  type="password"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full px-4 py-3.5 border-2 border-[#1e1e32] rounded-xl bg-[#13131f]/50 text-[#f4f4f5] placeholder-[#71717a] focus:ring-2 focus:ring-[#f59e0b]/50 focus:border-[#f59e0b] outline-none transition-all duration-300"
                  placeholder="••••••••"
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#ef4444] flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code}
              className="w-full py-3.5 px-4 gradient-primary hover:opacity-90 disabled:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-[#f59e0b]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#f59e0b]/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  验证中...
                </span>
              ) : (
                '确认访问'
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-[#52525b]">币安合约交易看板 · 实时数据监控</p>
        </div>
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
