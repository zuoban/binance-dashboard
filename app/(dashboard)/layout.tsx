/**
 * Dashboard 布局
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredAccessCode } from '@/lib/utils/fetch-with-auth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Footer } from '@/components/layout/Footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const accessCode = getStoredAccessCode();
    if (!accessCode) {
      router.push('/login');
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 主内容区 */}
      <main className="flex-1 px-8 py-6">
        {children}
      </main>

      {/* 页脚 */}
      <Footer />
    </div>
  );
}
