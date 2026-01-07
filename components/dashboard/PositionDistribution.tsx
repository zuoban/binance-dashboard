/**
 * 持仓分布饼图组件
 */

'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Position } from '@/types/binance';

interface PositionDistributionData {
  /** 交易对名称 */
  name: string;
  /** 占比（美元） */
  value: number;
  /** 持仓方向 */
  side: 'LONG' | 'SHORT' | 'BOTH';
  /** 颜色 */
  color: string;
  /** 索引签名（Recharts 要求） */
  [key: string]: string | number;
}

interface PositionDistributionProps {
  /** 持仓列表 */
  positions: Position[];
  /** 自定义样式类名 */
  className?: string;
}

// 预定义颜色方案
const COLORS = [
  '#3B82F6', // 蓝色
  '#10B981', // 绿色
  '#F59E0B', // 橙色
  '#EF4444', // 红色
  '#8B5CF6', // 紫色
  '#EC4899', // 粉色
  '#14B8A6', // 青色
  '#F97316', // 深橙色
  '#6366F1', // 靛蓝色
  '#84CC16', // 黄绿色
];

/**
 * 获取持仓方向标签
 */
function getPositionSideLabel(side: 'LONG' | 'SHORT' | 'BOTH'): string {
  switch (side) {
    case 'LONG':
      return '做多';
    case 'SHORT':
      return '做空';
    case 'BOTH':
      return '双向';
    default:
      return side;
  }
}

/**
 * 持仓分布饼图
 * 显示各币种持仓的占比分布
 */
export function PositionDistribution({
  positions,
  className = '',
}: PositionDistributionProps) {
  // 计算持仓分布数据
  const chartData = useMemo((): PositionDistributionData[] => {
    if (positions.length === 0) return [];

    return positions.map((position, index) => {
      const notionalValue =
        Math.abs(parseFloat(position.positionAmount)) *
        parseFloat(position.markPrice);

      return {
        name: position.symbol.replace('USDT', ''), // 移除 USDT 后缀，更简洁
        value: notionalValue,
        side: position.positionSide,
        color: COLORS[index % COLORS.length],
      };
    });
  }, [positions]);

  // 计算总价值
  const totalValue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalValue) * 100).toFixed(1);

      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {data.name}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {getPositionSideLabel(data.side)}
          </p>
          <p className="text-sm text-gray-900 dark:text-white">
            价值: ${data.value.toFixed(2)}
          </p>
          <p className="text-sm text-gray-900 dark:text-white">
            占比: {percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  // 自定义 Legend
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => (
          <div
            key={index}
            className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">暂无持仓数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      {/* 标题 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          持仓分布
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          各币种持仓占比分布
        </p>
      </div>

      {/* 图表 */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* 总价值 */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            总持仓价值
          </span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            ${totalValue.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 简化版持仓分布图
 * 仅显示饼图，不显示详细统计
 */
export function SimplePositionDistribution({
  positions,
  className = '',
}: PositionDistributionProps) {
  const chartData = useMemo((): PositionDistributionData[] => {
    if (positions.length === 0) return [];

    return positions.map((position, index) => {
      const notionalValue =
        Math.abs(parseFloat(position.positionAmount)) *
        parseFloat(position.markPrice);

      return {
        name: position.symbol.replace('USDT', ''),
        value: notionalValue,
        side: position.positionSide,
        color: COLORS[index % COLORS.length],
      };
    });
  }, [positions]);

  if (chartData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500 dark:text-gray-400">暂无持仓数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | undefined) =>
              value ? `$${value.toFixed(2)}` : '$0.00'
            }
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
