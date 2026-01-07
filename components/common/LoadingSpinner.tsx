/**
 * 加载动画组件
 */

interface LoadingSpinnerProps {
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示文本 */
  showText?: boolean;
  /** 自定义文本 */
  text?: string;
  /** 自定义样式类名 */
  className?: string;
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
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-12 h-12';
      default:
        return 'w-8 h-8';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Spinner */}
      <div
        className={`${getSizeClass()} border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin`}
      />

      {/* 文本 */}
      {showText && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
}

/**
 * 页面级加载动画
 */
export function PageLoading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" showText text={text} />
    </div>
  );
}

/**
 * 内联加载动画（小尺寸）
 */
export function InlineLoading({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-sm text-gray-600">加载中...</span>
    </div>
  );
}
