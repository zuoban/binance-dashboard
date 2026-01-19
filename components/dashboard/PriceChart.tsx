/**
 * 实时价格图表组件
 */

'use client'

import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
 * 价格详情模态框
 */
function PriceModal({
  point,
  onClose,
  symbol,
}: {
  point: PriceDataPoint
  onClose: () => void
  symbol: string
}) {
  // 监听 ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    // 禁止背景滚动
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 模态框内容 */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">{symbol.replace('USDT', '/USDT')}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">时间</div>
            <div className="text-base font-medium text-slate-900">{point.time}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">价格</div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ${point.price.toFixed(2)}
            </div>
          </div>
          {point.volume !== undefined && (
            <div>
              <div className="text-xs text-slate-500 mb-1">成交量</div>
              <div className="text-base font-medium text-slate-700">{point.volume.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * 实时价格走势图
 * 显示交易对的实时价格变化
 */
export function PriceChart({ symbol, data, type = 'line', className = '' }: PriceChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<PriceDataPoint | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // 格式化数据
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      price: parseFloat(point.price.toFixed(2)),
    }))
  }, [data])

  // 动态计算 Y 轴边距
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 0]

    const prices = chartData.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    // 使用价格范围的 10% 作为边距，但至少 0.5
    const margin = Math.max(priceRange * 0.1, 0.5)

    return [minPrice - margin, maxPrice + margin]
  }, [chartData])

  // 计算价格变化
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { value: 0, percentage: 0 }
    const firstPrice = chartData[0].price
    const lastPrice = chartData[chartData.length - 1].price
    const value = lastPrice - firstPrice
    const percentage = (value / firstPrice) * 100
    return { value, percentage }
  }, [chartData])

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      setSelectedPoint(data.activePayload[0].payload)
    }
  }

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
          <AreaChart data={chartData} onClick={handleChartClick}>
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
              domain={yAxisDomain}
            />
            <Tooltip
              content={() => null}
              cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#10B981' : '#EF4444'}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#priceGradient)"
              activeDot={{ r: 6, strokeWidth: 0, className: 'cursor-pointer' }}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={value => `$${value.toFixed(2)}`}
              domain={yAxisDomain}
            />
            <Tooltip
              content={() => null}
              cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#10B981' : '#EF4444'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, className: 'cursor-pointer' }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* 模态框 */}
      {selectedPoint && isClient && (
        <PriceModal point={selectedPoint} symbol={symbol} onClose={() => setSelectedPoint(null)} />
      )}
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

  // 动态计算 Y 轴边距
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 0]

    const prices = chartData.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    // 使用价格范围的 10% 作为边距，但至少 0.5
    const margin = Math.max(priceRange * 0.1, 0.5)

    return [minPrice - margin, maxPrice + margin]
  }, [chartData])

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
          <YAxis hide domain={yAxisDomain} />
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
