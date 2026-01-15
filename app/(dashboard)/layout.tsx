/**
 * Dashboard 布局
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredAccessCode } from '@/lib/utils/fetch-with-auth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useIsMounted } from '@/lib/hooks'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const mounted = useIsMounted()
  const accessCode = getStoredAccessCode()

  useEffect(() => {
    if (mounted && !accessCode) {
      router.push('/login')
    }
  }, [accessCode, router, mounted])

  if (!mounted) {
    return <></>
  }

  if (!accessCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <main className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
