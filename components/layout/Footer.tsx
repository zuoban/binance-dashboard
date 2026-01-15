/**
 * Footer 布局组件
 */

'use client'

interface FooterProps {
  /** 自定义样式类名 */
  className?: string
}

/**
 * 页脚
 */
export function Footer({ className = '' }: FooterProps) {
  // 直接使用当前年份
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className={`bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* 左侧：版权信息 */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>© {currentYear} 币安合约看板. All rights reserved.</p>
          </div>

          {/* 右侧：链接 */}
          <div className="flex items-center gap-6">
            <a
              href="https://www.binance.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              币安官网
            </a>
            <a
              href="https://www.binance.com/en/support"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              帮助中心
            </a>
            <a
              href="https://github.com/binance/binance-signature-examples"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              API 文档
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
