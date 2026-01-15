/**
 * 侧边栏导航组件
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * 导航菜单项
 */
interface NavItem {
  /** 路由路径 */
  path: string
  /** 显示标签 */
  label: string
  /** 图标 SVG */
  icon: string
  /** 折叠时的简短标签 */
  shortLabel?: string
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: '交易看板',
    shortLabel: '看板',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>',
  },
]

interface SidebarProps {
  /** 自定义样式类名 */
  className?: string
  /** 是否折叠 */
  collapsed?: boolean
  /** 折叠切换回调 */
  onToggle?: () => void
}

/**
 * 侧边栏导航
 */
export function Sidebar({ className = '', collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <aside className={`h-full flex flex-col ${className}`}>
      {/* Logo 区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1e1e32]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          {!collapsed && <span className="text-lg font-bold text-gradient">币安合约</span>}
        </Link>
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-[#1e1e32] transition-colors text-[#a1a1aa]"
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {navItems.map(item => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-2 ${
              isActive(item.path)
                ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30'
                : 'text-[#a1a1aa] hover:bg-[#1e1e32] hover:text-[#f4f4f5]'
            }`}
            title={collapsed ? item.label : undefined}
          >
            <div
              className="w-5 h-5 flex-shrink-0"
              dangerouslySetInnerHTML={{ __html: item.icon }}
            />
            {!collapsed && <span className="font-medium">{item.label}</span>}
            {collapsed && <span className="text-xs ml-auto">{item.shortLabel}</span>}
          </Link>
        ))}
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-[#1e1e32]">
        {!collapsed && (
          <div className="text-xs text-[#71717a]">
            <p>实时数据来自币安 API</p>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <svg
              className="w-4 h-4 text-[#71717a]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
      </div>
    </aside>
  )
}
