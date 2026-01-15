/**
 * 实时价格图表组件
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
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

interface PriceDataPoint {
  /** 时间戳 */
  timestamp: number
  /** 时间标签 */
  time: string
  /** 价格 */
  price: number
  /** 成交量 */
  volume?: number
}

interface PriceChartProps {
  /** 交易对名称 */
  symbol: string
  /** 价格数据点数组 */
  data: PriceDataPoint[]
  /** 图表类型 */
  type?: 'line' | 'area'
  /** 自定义样式类名 */
  className?: string
}

/**
 * 自定义 Tooltip 组件
 */
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: PriceDataPoint }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{data.time}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          价格: ${data.price.toFixed(2)}
        </p>
        {data.volume && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            成交量: {data.volume.toFixed(2)}
          </p>
        )}
      </div>
    )
  }
  return null
}

/**
 * 实时价格走势图
 * 显示交易对的实时价格变化
 */
export function PriceChart({ symbol, data, type = 'line', className = '' }: PriceChartProps) {
  // 格式化数据
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      price: parseFloat(point.price.toFixed(2)),
    }))
  }, [data])

  // 计算价格变化
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { value: 0, percentage: 0 }
    const firstPrice = chartData[0].price
    const lastPrice = chartData[chartData.length - 1].price
    const value = lastPrice - firstPrice
    const percentage = (value / firstPrice) * 100
    return { value, percentage }
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">暂无价格数据</p>
        </div>
      </div>
    )
  }

  const currentPrice = chartData[chartData.length - 1].price
  const isPositive = priceChange.value >= 0

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      {/* 标题和当前价格 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {symbol.replace('USDT', '/USDT')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">实时价格走势</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${currentPrice.toFixed(2)}
            </p>
            <p className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}
              {priceChange.value.toFixed(2)} ({isPositive ? '+' : ''}
              {priceChange.percentage.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      {/* 图表 */}
      <ResponsiveContainer width="100%" height={300}>
        {type === 'area' ? (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isPositive ? '#10B981' : '#EF4444'}
                  stopOpacity={0.3}
                />
                <stop offset="95%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={value => `$${value.toFixed(2)}`}
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#10B981' : '#EF4444'}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={value => `$${value.toFixed(2)}`}
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#10B981' : '#EF4444'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

/**
 * 简化版价格图表
 * 仅显示价格走势，不显示详细信息
 */
export function SimplePriceChart({ symbol, data, className = '' }: Omit<PriceChartProps, 'type'>) {
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      price: parseFloat(point.price.toFixed(2)),
    }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      </div>
    )
  }

  const currentPrice = chartData[chartData.length - 1].price
  const firstPrice = chartData[0].price
  const isPositive = currentPrice >= firstPrice

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {symbol.replace('USDT', '')}
        </span>
        <span className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          ${currentPrice.toFixed(2)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="simplePriceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={isPositive ? '#10B981' : '#EF4444'}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#simplePriceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
