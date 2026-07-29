/**
 * 访问码登录页面
 */

'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

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
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': code,
        },
      })

      const result = await response.json()

      if (result.success) {
        // 服务端已写入 HttpOnly 会话 Cookie，避免在浏览器中保存访问码。
        const redirectParam = searchParams.get('redirect')
        const redirect = redirectParam?.startsWith('/') ? redirectParam : '/dashboard'
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(66,211,146,0.16),transparent_27rem),radial-gradient(circle_at_84%_72%,rgba(216,179,106,0.13),transparent_25rem)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(202,221,210,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(202,221,210,0.035)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="relative w-full max-w-md">
        <div className="card p-7 sm:p-9">
          <div className="text-center mb-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f7d99a]/45 bg-[linear-gradient(145deg,#e5c276,#a67836)] text-[#15201c] shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="m5 15 7-7 7 7"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v11" />
              </svg>
            </div>
            <p className="dashboard-overline mb-2">Binance Futures · Private workspace</p>
            <h1 className="mb-2 text-3xl font-bold tracking-[-0.05em] text-[#f2f7f1]">访问验证</h1>
            <p className="text-sm text-[#a8b9b1]">请输入访问码以继续访问交易看板</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="access-code"
                className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-[#71857c]"
              >
                访问码
              </label>
              <div className="relative">
                <input
                  id="access-code"
                  type="password"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#071b1b]/75 px-4 py-3.5 text-[#f2f7f1] placeholder-[#526861] outline-none transition focus:border-[#d8b36a]/70 focus:ring-4 focus:ring-[#d8b36a]/10"
                  placeholder="••••••••"
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-[#ff7676]/25 bg-[#ff7676]/10 p-3">
                <svg
                  className="h-4 w-4 shrink-0 text-[#ff8585]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-[#ffb4b4]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code}
              className="w-full rounded-xl border border-[#f7d99a]/30 bg-[linear-gradient(135deg,#e5c276,#b38441)] px-4 py-3.5 font-bold text-[#17211d] shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
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
          <p className="text-xs text-[#71857c]">币安合约交易看板 · 实时数据监控</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-[#71857c]">加载中...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
