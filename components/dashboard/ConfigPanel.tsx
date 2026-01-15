/**
 * 看板配置面板组件
 */

'use client'

import { useState } from 'react'

interface ConfigPanelProps {
  /** 自动刷新间隔（秒） */
  refreshInterval: number
  /** 保存配置 */
  onSave: (refreshInterval: number) => void
  /** 取消 */
  onCancel: () => void
}

/**
 * 刷新间隔选项（秒）
 */
const REFRESH_INTERVALS = [
  { label: '10 秒', value: 10 },
  { label: '30 秒', value: 30 },
  { label: '60 秒', value: 60 },
  { label: '2 分钟', value: 120 },
  { label: '5 分钟', value: 300 },
]

/**
 * 配置面板
 */
export function ConfigPanel({
  refreshInterval,
  onSave,
  onCancel,
}: ConfigPanelProps) {
  const [localRefreshInterval, setLocalRefreshInterval] = useState(refreshInterval / 1000)

  const handleSave = () => {
    onSave(localRefreshInterval * 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">看板配置</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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

        {/* 配置项 */}
        <div className="space-y-6">
          {/* 自动刷新间隔 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              自动刷新间隔
            </label>
            <div className="grid grid-cols-3 gap-2">
              {REFRESH_INTERVALS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setLocalRefreshInterval(option.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localRefreshInterval === option.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            保存
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
