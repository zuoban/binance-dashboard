/**
 * Dashboard 布局
 */

'use client'

import { useEffect, useState } from 'react'
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

  // 未登录时显示加载状态并准备重定向
  if (!accessCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <main className="p-3 min-h-screen">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
