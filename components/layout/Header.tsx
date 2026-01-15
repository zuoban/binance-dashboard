/**
 * Header 布局组件
 */

interface HeaderProps {
  /** 自定义样式类名 */
  className?: string
}

/**
 * 顶部导航栏
 */
export function Header({ className = '' }: HeaderProps) {
  return (
    <header className={className}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 左侧：页面标题 */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#f4f4f5]">交易看板</h1>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 text-sm font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1e1e32] rounded-lg transition-all duration-200"
              title="刷新数据"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1e1e32] rounded-lg transition-all duration-200"
              title="设置"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1e1e32] rounded-lg transition-all duration-200"
              title="退出登录"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * 简化的 Header（用于登录页等）
 */
export function SimpleHeader({ title = '币安合约' }: { title?: string }) {
  return (
    <header className="bg-[#0a0a0f] border-b border-[#1e1e32]">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gradient">{title}</h1>
        </div>
      </div>
    </header>
  )
}
