/**
 * 综合看板页面
 *
 * 整合持仓、订单、资产信息
 */

'use client'

// 完全禁用 SSR 和缓存
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { DashboardContent } from './DashboardContent'

export default function DashboardPage() {
  return <DashboardContent />
}
