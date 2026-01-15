/**
 * 加载动画组件
 */

interface LoadingSpinnerProps {
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否显示文本 */
  showText?: boolean
  /** 自定义文本 */
  text?: string
  /** 自定义样式类名 */
  className?: string
}

/** 尺寸类名映射表（使用常量避免引用变化） */
const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-3 h-3',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

/**
 * 加载动画
 */
export function LoadingSpinner({
  size = 'md',
  showText = false,
  text = '加载中...',
  className = '',
}: LoadingSpinnerProps) {
  const spinnerSizeClass = SIZE_CLASSES[size]
  const wrapperClassName = className
    ? `flex flex-col items-center justify-center gap-3 ${className}`
    : 'flex flex-col items-center justify-center gap-3'

  return (
    <div className={wrapperClassName}>
      {/* Spinner */}
      <div
        className={`${spinnerSizeClass} border-2 border-[#1e1e32] border-t-[#f59e0b] rounded-full animate-spin`}
      />

      {/* 文本 */}
      {showText && <p className="text-xs text-[#71717a]">{text}</p>}
    </div>
  )
}

/**
 * 页面级加载动画
 */
export function PageLoading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
      <LoadingSpinner size="lg" showText text={text} />
    </div>
  )
}

/**
 * 内联加载动画（小尺寸）
 */
export function InlineLoading({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div className="w-3 h-3 border-2 border-[#1e1e32] border-t-[#f59e0b] rounded-full animate-spin" />
      <span className="text-xs text-[#71717a]">加载中...</span>
    </div>
  )
}
