/**
 * Header 布局组件
 */

import Link from 'next/link'

interface HeaderProps {
  /** 自定义样式类名 */
  className?: string
}

/**
 * 顶部导航栏
 */
export function Header({ className = '' }: HeaderProps) {
  return (
    <header
      className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
          {/* Logo 和标题 */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">币安合约看板</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

/**
 * 简化的 Header（用于登录页等）
 */
export function SimpleHeader({ title = '币安合约看板' }: { title?: string }) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        </div>
      </div>
    </header>
  )
}
