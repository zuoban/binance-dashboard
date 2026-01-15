/**
 * 空状态组件
 */

import React from 'react'

interface EmptyStateProps {
  /** 图标 */
  icon?: React.ReactNode
  /** 标题 */
  title: string
  /** 描述 */
  description?: string
  /** 操作按钮 */
  action?: React.ReactNode
  /** 自定义样式类名 */
  className?: string
}

/**
 * 空状态显示
 */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  const defaultIcon = (
    <svg className="w-10 h-10 text-[#71717a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  )

  return (
    <div className={`flex flex-col items-center justify-center py-8 px-3 ${className}`}>
      {/* 图标 */}
      <div className="mb-2">{icon || defaultIcon}</div>

      {/* 标题 */}
      <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">{title}</h3>

      {/* 描述 */}
      {description && (
        <p className="text-xs text-[#71717a] mb-3 text-center max-w-md">{description}</p>
      )}

      {/* 操作按钮 */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/**
 * 简化的空状态（无操作按钮）
 */
interface SimpleEmptyStateProps {
  title: string
  description?: string
  className?: string
}

export function SimpleEmptyState({ title, description, className = '' }: SimpleEmptyStateProps) {
  return <EmptyState title={title} description={description} className={className} />
}
