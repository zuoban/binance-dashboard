/**
 * 图表加载包装器
 */

'use client';

import { Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ChartLoaderProps {
  /** 图表组件 */
  children: React.ReactNode;
  /** 加载提示文本 */
  fallbackText?: string;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 图表加载包装器
 * 提供 Suspense 边界和加载状态
 */
export function ChartLoader({
  children,
  fallbackText = '加载图表中...',
  className = '',
}: ChartLoaderProps) {
  return (
    <Suspense
      fallback={
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" showText text={fallbackText} />
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
