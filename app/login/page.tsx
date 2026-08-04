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
    <main className="login-shell">
      <div className="login-shell__grid" aria-hidden="true" />
      <div className="login-shell__orbit" aria-hidden="true" />

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
              <p>Futures intelligence</p>
              <strong>PRIVATE DESK</strong>
            </div>
          </div>

          <div className="login-intro__copy">
            <p className="dashboard-overline">REAL-TIME DERIVATIVES WORKSPACE</p>
            <h1>你的合约决策中枢</h1>
            <p>统一查看实时仓位、风险阈值和订单信号，保持每一次决策都有数据依据。</p>
          </div>

          <div className="login-intro__signals" aria-label="工作台能力">
            <div>
              <span>01</span>
              <p>仓位与行情同步</p>
            </div>
            <div>
              <span>02</span>
              <p>强平距离监控</p>
            </div>
            <div>
              <span>03</span>
              <p>私密会话保护</p>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-panel__status">
            <span>SECURE ACCESS</span>
            <i aria-hidden="true" />
            <span>ENCRYPTED SESSION</span>
          </div>

          <div className="login-form-panel__heading">
            <p>身份验证</p>
            <h2>欢迎回来</h2>
            <span>输入工作台访问码以继续</span>
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
                type="password"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="输入访问码"
                autoComplete="current-password"
                autoFocus
                required
              />
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
                  <span aria-hidden="true">↗</span>
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
