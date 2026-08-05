/**
 * 访问码登录页面
 */

'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
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
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-intro">
          <div className="login-brand">
            <div className="dashboard-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="m16 5 4.2 4.2L16 13.4l-4.2-4.2L16 5Z" fill="currentColor" />
                <path d="m8.8 12.2 4.2 4.2-4.2 4.2-4.2-4.2 4.2-4.2Z" fill="currentColor" />
                <path d="m23.2 12.2 4.2 4.2-4.2 4.2-4.2-4.2 4.2-4.2Z" fill="currentColor" />
                <path d="m16 19.4 4.2 4.2L16 27.8l-4.2-4.2 4.2-4.2Z" fill="currentColor" />
                <path d="m16 12.2 4.2 4.2-4.2 4.2-4.2-4.2 4.2-4.2Z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p>BINANCE FUTURES</p>
              <strong>合约交易看板</strong>
            </div>
          </div>

          <div className="login-intro__copy">
            <h1>欢迎回来</h1>
            <p>查看实时仓位、风险阈值与订单状态。</p>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-panel__heading">
            <h2>验证访问码</h2>
            <span>请输入访问码以进入工作台</span>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="access-code">访问码</label>
            <div className="login-field">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" strokeWidth={1.7} />
                <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" strokeWidth={1.7} />
              </svg>
              <input
                id="access-code"
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={e => {
                  setCode(e.target.value)
                  if (error) {
                    setError('')
                  }
                }}
                placeholder="输入访问码"
                autoComplete="current-password"
                autoFocus
                required
              />
              <button
                type="button"
                className="login-field__toggle"
                onClick={() => setShowCode(current => !current)}
                aria-label={showCode ? '隐藏访问码' : '显示访问码'}
                aria-pressed={showCode}
              >
                {showCode ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="m4 4 16 16M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.7 10.7 0 0 1 12 5c5.5 0 9 5.5 9 7a10.8 10.8 0 0 1-2.1 3.1M6.2 6.2C4.2 7.5 3 9.5 3 12c0 1.5 3.5 7 9 7 1.3 0 2.5-.3 3.5-.7"
                    />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 12c0-1.5 3.5-7 9-7s9 5.5 9 7-3.5 7-9 7-9-5.5-9-7Z"
                    />
                    <circle cx="12" cy="12" r="2.5" strokeWidth={1.8} />
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading || !code} className="login-submit">
              {loading ? (
                <span>
                  <i className="loading-spinner" aria-hidden="true" />
                  验证中...
                </span>
              ) : (
                <>
                  进入工作台
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="m9 18 6-6-6-6"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="login-form-panel__footnote">
            访问凭证仅用于本次安全会话，不会保存在浏览器中
          </p>
        </div>
      </section>
    </main>
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
