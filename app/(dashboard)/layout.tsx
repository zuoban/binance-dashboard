/**
 * Dashboard 布局
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredAccessCode } from '@/lib/utils/fetch-with-auth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const accessCode = getStoredAccessCode()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !accessCode) {
      router.push('/login')
    }
  }, [accessCode, router, mounted])

  // 未挂载时不渲染任何内容，避免 Hydration 不匹配
  if (!mounted) {
    return <></>
  }

  // 未登录时显示加载状态
  if (!accessCode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="px-8 py-6">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主内容区 */}
      <main className="px-8 py-6">{children}</main>
    </div>
  )
}
