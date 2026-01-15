/**
 * Dashboard 布局
 */

'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getStoredAccessCode } from '@/lib/utils/fetch-with-auth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const accessCode = getStoredAccessCode()

  useEffect(() => {
    if (!accessCode) {
      router.push('/login')
    }
  }, [accessCode, router])

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
