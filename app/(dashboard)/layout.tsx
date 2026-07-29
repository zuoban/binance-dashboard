/**
 * Dashboard 布局
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>(
    'checking'
  )

  useEffect(() => {
    let active = true

    const verifySession = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        const result = (await response.json()) as { success?: boolean }

        if (active) {
          setAuthState(result.success ? 'authenticated' : 'unauthenticated')
        }
      } catch {
        if (active) {
          setAuthState('unauthenticated')
        }
      }
    }

    void verifySession()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (authState === 'unauthenticated') {
      router.replace('/login?redirect=/dashboard')
    }
  }, [authState, router])

  if (authState !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <main className="p-4 min-h-screen">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
