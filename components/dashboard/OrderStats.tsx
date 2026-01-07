/**
 * 订单统计组件
 */

import { useMemo } from 'react';

interface OrderStatsProps {
  /** 订单统计数据 */
  stats: {
    total: number;
    buy: number;
    sell: number;
    filled: number;
    totalVolume: number;
  };
  /** 自定义样式类名 */
  className?: string;
  /** 是否使用紧凑样式（无边框和背景） */
  compact?: boolean;
}

/**
 * 格式化数字显示
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

/**
 * 订单统计卡片
 */
export function OrderStats({ stats, className = '', compact = false }: OrderStatsProps) {
  return (
    <div className={`${compact ? '' : 'bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4'} ${className}`}>
      {/* 统计数据 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 总订单 */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">总订单</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {stats.total}
          </p>
        </div>

        {/* 买入 */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">买入</p>
          <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
            {stats.buy}
          </p>
        </div>

        {/* 卖出 */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">卖出</p>
          <p className="text-base font-semibold text-red-600 dark:text-red-400">
            {stats.sell}
          </p>
        </div>
      </div>

      {/* 交易量 */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">成交金额</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            ${formatNumber(stats.totalVolume)}
          </span>
        </div>
      </div>
    </div>
  );
}
