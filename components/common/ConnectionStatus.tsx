/**
 * 连接状态指示器组件
 *
 * 显示 WebSocket 连接状态
 */

'use client';

import { useWebSocketStore, getConnectionStatusText } from '@/lib/store';

interface ConnectionStatusProps {
  /** 是否显示文本 */
  showText?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 连接状态指示器
 */
export function ConnectionStatus({ showText = true, className = '' }: ConnectionStatusProps) {
  const { isConnected, isConnecting } = useWebSocketStore();

  const statusText = getConnectionStatusText(useWebSocketStore.getState());

  const getStatusColor = () => {
    if (isConnecting) {
      return 'bg-yellow-500';
    }
    if (isConnected) {
      return 'bg-green-500';
    }
    return 'bg-red-500';
  };

  const getStatusDotAnimation = () => {
    if (isConnecting) {
      return 'animate-pulse';
    }
    if (isConnected) {
      return 'animate-pulse';
    }
    return '';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 状态指示灯 */}
      <div className="relative">
        <div
          className={`w-2 h-2 rounded-full ${getStatusColor()} ${getStatusDotAnimation()}`}
        />
      </div>

      {/* 状态文本 */}
      {showText && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {statusText}
        </span>
      )}
    </div>
  );
}

/**
 * 简化版连接状态指示器（只显示圆点）
 */
export function ConnectionDot({ className = '' }: { className?: string }) {
  const { isConnected, isConnecting } = useWebSocketStore();

  const getColorClass = () => {
    if (isConnecting) {
      return 'bg-yellow-500 animate-pulse';
    }
    if (isConnected) {
      return 'bg-green-500 animate-pulse';
    }
    return 'bg-red-500';
  };

  return (
    <div
      className={`w-2 h-2 rounded-full ${getColorClass()} ${className}`}
      title={getConnectionStatusText(useWebSocketStore.getState())}
    />
  );
}

/**
 * 连接状态徽章
 */
export function ConnectionBadge({ className = '' }: { className?: string }) {
  const { isConnected, isConnecting } = useWebSocketStore();

  const getBadgeVariant = () => {
    if (isConnecting) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700';
    }
    if (isConnected) {
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
    }
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
  };

  const getText = () => {
    if (isConnecting) {
      return '连接中';
    }
    if (isConnected) {
      return '已连接';
    }
    return '未连接';
  };

  return (
    <div
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeVariant()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {getText()}
    </div>
  );
}
