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
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: '交易看板',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>',
  },
]

interface SidebarProps {
  /** 自定义样式类名 */
  className?: string
}

/**
 * 侧边栏导航
 */
export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <aside
      className={`w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Logo 区域 */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">币安合约看板</span>
        </Link>
      </div>

      {/* 导航菜单 */}
      <nav className="p-4">
        {navItems.map(item => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="w-5 h-5" dangerouslySetInnerHTML={{ __html: item.icon }} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>实时数据来自币安 API</p>
        </div>
      </div>
    </aside>
  )
}
