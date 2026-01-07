/**
 * 订单表格组件
 */

'use client';

import { useState } from 'react';
import { Order, OrderStatus } from '@/types/binance';
import { formatDistanceToNow } from '@/lib/utils/date';
import { useExchangeInfo } from '@/lib/hooks';

/**
 * 获取交易对的价格精度
 */
function getSymbolPrecision(
  symbol: string,
  exchangeInfo: Record<string, { pricePrecision: number; quantityPrecision: number }>
): number {
  const precision = exchangeInfo[symbol]?.pricePrecision;
  if (precision !== undefined) {
    return precision;
  }
  return 2;
}

/**
 * 格式化价格
 */
function formatPrice(
  price: string | number,
  symbol: string,
  exchangeInfo: Record<string, { pricePrecision: number; quantityPrecision: number }>
): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (num === 0) return '0.00';
  if (isNaN(num)) return '0.00';
  const precision = getSymbolPrecision(symbol, exchangeInfo);
  return num.toFixed(precision);
}

interface OrderTableProps {
  /** 订单列表 */
  orders: Order[];
  /** 自定义样式类名 */
  className?: string;
  /** 是否为紧凑模式 */
  compact?: boolean;
}

/**
 * 订单状态标签
 */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'FILLED':
        return {
          label: '已完成',
          className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        };
      case 'CANCELED':
        return {
          label: '已撤销',
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
      case 'NEW':
        return {
          label: '新建',
          className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        };
      case 'PARTIALLY_FILLED':
        return {
          label: '部分成交',
          className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        };
      case 'PENDING_CANCEL':
        return {
          label: '撤销中',
          className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        };
      case 'REJECTED':
        return {
          label: '已拒绝',
          className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
      case 'EXPIRED':
        return {
          label: '已过期',
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

/**
 * 紧凑模式订单状态标签
 */
function CompactOrderStatusBadge({ status }: { status: OrderStatus }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'FILLED':
        return {
          label: '已完成',
          className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        };
      case 'CANCELED':
        return {
          label: '已撤销',
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
      case 'NEW':
        return {
          label: '新建',
          className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        };
      case 'PARTIALLY_FILLED':
        return {
          label: '部分成交',
          className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        };
      case 'PENDING_CANCEL':
        return {
          label: '撤销中',
          className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        };
      case 'REJECTED':
        return {
          label: '已拒绝',
          className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
      case 'EXPIRED':
        return {
          label: '已过期',
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

/**
 * 订单表格
 */
export function OrderTable({ orders, className = '', compact = false }: OrderTableProps) {
  const { exchangeInfo } = useExchangeInfo();
  const [sortField, setSortField] = useState<keyof Order>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 排序处理（紧凑模式不支持排序）
  const handleSort = (field: keyof Order) => {
    if (compact) return; // 紧凑模式不支持排序

    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 排序后的订单
  const sortedOrders = [...orders].sort((a, b) => {
    if (compact) return 0; // 紧凑模式不排序

    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return 0;
  });

  if (orders.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">暂无订单记录</p>
      </div>
    );
  }

  // 紧凑模式：只显示关键列
  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {orders.map((order) => {
          const executedQty = parseFloat(order.executedQty);
          const price = parseFloat(order.price);
          const totalAmount = executedQty * price;

          return (
            <div
              key={order.orderId}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              {/* 第一行：交易对 + 方向 + 类型 */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-semibold text-gray-900 dark:text-white text-xs">
                  {order.symbol}
                </span>
                <span
                  className={`text-xs font-medium ${
                    order.side === 'BUY'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {order.side === 'BUY' ? '买' : '卖'}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {order.type === 'MARKET' ? '市价' : order.type === 'LIMIT' ? '限价' : order.type}
                </span>
              </div>

              {/* 第二行：价格 + 数量 + 金额 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 dark:text-gray-400">
                    价格: <span className="font-medium text-gray-900 dark:text-white">${formatPrice(price, order.symbol, exchangeInfo)}</span>
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    数量: <span className="font-medium text-gray-900 dark:text-white">{executedQty.toFixed(4)}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 dark:text-gray-400">
                    金额: <span className="font-semibold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
                  </span>
                </div>
              </div>

              {/* 第三行：时间 */}
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                {formatDistanceToNow(order.time)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {/* 表头 */}
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              onClick={() => handleSort('time')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              时间 {sortField === 'time' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('symbol')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              交易对 {sortField === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('side')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              方向 {sortField === 'side' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('type')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              类型 {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              价格
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              数量
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              已成交
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              状态
            </th>
          </tr>
        </thead>

        {/* 表体 */}
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {sortedOrders.map((order) => (
            <tr key={order.orderId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {formatDistanceToNow(order.time)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {order.symbol}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span
                  className={`${
                    order.side === 'BUY'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {order.side === 'BUY' ? '买入' : '卖出'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {order.type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ${formatPrice(parseFloat(order.price), order.symbol, exchangeInfo)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {parseFloat(order.origQty).toFixed(4)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {parseFloat(order.executedQty).toFixed(4)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <OrderStatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
