/**
 * Dashboard 内容组件
 *
 * 实际的看板内容，通过动态导入避免 Hydration 问题
 */

'use client'

import { DashboardView } from './DashboardView'

export function DashboardContent() {
  return <DashboardView />
}

