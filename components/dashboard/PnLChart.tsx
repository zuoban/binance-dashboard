/**
 * PnL 收益曲线图组件
 */

'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'

// Recharts Tooltip 的 payload 类型
interface TooltipPayload {
  payload: PnLDataPoint
}

interface PnLDataPoint {
  /** 时间戳 */
  timestamp: number
  /** 时间标签 */
  time: string
  /** 累计盈亏 */
  pnl: number
  /** 总余额 */
  balance: number
}

interface PnLChartProps {
  /** PnL 数据点数组 */
  data: PnLDataPoint[]
  /** 自定义样式类名 */
  className?: string
}

/**
 * 自定义 Tooltip 组件
 */
function CustomTooltip({
  active,
  payload,
}: TooltipProps<number, string> & { payload?: TooltipPayload[] }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{data.time}</p>
        <p className={`text-sm font-semibold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          盈亏: ${data.pnl.toFixed(2)}
        </p>
        <p className="text-sm text-gray-900 dark:text-white">余额: ${data.balance.toFixed(2)}</p>
      </div>
    )
  }
  return null
}

/**
 * 简化版自定义 Tooltip 组件
 */
function SimpleTooltip({
  active,
  payload,
}: TooltipProps<number, string> & { payload?: TooltipPayload[] }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{data.time}</p>
        <p className={`text-sm font-semibold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          盈亏: ${data.pnl.toFixed(2)}
        </p>
      </div>
    )
  }
  return null
}

/**
 * PnL 收益曲线图
 * 显示账户盈亏随时间的变化趋势
 */
export function PnLChart({ data, className = '' }: PnLChartProps) {
  // 格式化数据用于图表显示
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      pnl: parseFloat(point.pnl.toFixed(2)),
      balance: parseFloat(point.balance.toFixed(2)),
    }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      {/* 标题 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">盈亏曲线</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">查看您的盈亏变化趋势</p>
      </div>

      {/* 图表 */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickFormatter={value => `$${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="累计盈亏"
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="总余额"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * 简化版 PnL 图表组件
 * 仅显示盈亏，不显示余额
 */
export function SimplePnLChart({ data, className = '' }: PnLChartProps) {
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      pnl: parseFloat(point.pnl.toFixed(2)),
    }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickFormatter={value => `$${value.toFixed(0)}`}
          />
          <Tooltip content={<SimpleTooltip />} />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="盈亏"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
