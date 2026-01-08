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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        {/* 登录卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">访问验证</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">请输入访问码以继续</p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 访问码输入 */}
            <div>
              <label
                htmlFor="access-code"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                访问码
              </label>
              <input
                id="access-code"
                type="password"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="请输入访问码"
                autoFocus
                required
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading || !code}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed"
            >
              {loading ? '验证中...' : '确认'}
            </button>
          </form>
        </div>

        {/* 底部提示 */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          币安合约交易看板
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="text-gray-500 dark:text-gray-400">加载中...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
