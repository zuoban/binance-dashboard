/**
 * Dashboard 布局
 */

'use client';

import { Footer } from '@/components/layout/Footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
