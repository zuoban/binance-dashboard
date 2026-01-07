/**
 * WebSocket 连接状态管理 Store
 *
 * 使用 Zustand 管理 WebSocket 连接的全局状态
 */

import { create } from 'zustand';
import { ConnectionState } from '@/types/common';

interface WebSocketState extends ConnectionState {
  // 额外状态
  listenKey: string | null;
  lastMessageTime: number | null;
  messageCount: number;

  // Actions
  setConnected: () => void;
  setDisconnected: () => void;
  setConnecting: () => void;
  incrementMessageCount: () => void;
  setListenKey: (key: string) => void;
  clearListenKey: () => void;
  reset: () => void;
}

/**
 * WebSocket Store
 */
export const useWebSocketStore = create<WebSocketState>((set) => ({
  // 初始状态
  isConnected: false,
  isConnecting: false,
  reconnectCount: 0,
  lastConnected: null,
  lastDisconnected: null,
  listenKey: null,
  lastMessageTime: null,
  messageCount: 0,

  // 设置已连接
  setConnected: () =>
    set((state) => ({
      isConnected: true,
      isConnecting: false,
      lastConnected: Date.now(),
      reconnectCount: state.reconnectCount > 0 ? state.reconnectCount : 0,
    })),

  // 设置已断开
  setDisconnected: () =>
    set({
      isConnected: false,
      isConnecting: false,
      lastDisconnected: Date.now(),
    }),

  // 设置正在连接
  setConnecting: () =>
    set((state) => ({
      isConnecting: true,
      reconnectCount: state.reconnectCount + 1,
    })),

  // 增加消息计数
  incrementMessageCount: () =>
    set((state) => ({
      messageCount: state.messageCount + 1,
      lastMessageTime: Date.now(),
    })),

  // 设置 Listen Key
  setListenKey: (key) =>
    set({
      listenKey: key,
    }),

  // 清除 Listen Key
  clearListenKey: () =>
    set({
      listenKey: null,
    }),

  // 重置状态
  reset: () =>
    set({
      isConnected: false,
      isConnecting: false,
      reconnectCount: 0,
      lastConnected: null,
      lastDisconnected: null,
      listenKey: null,
      lastMessageTime: null,
      messageCount: 0,
    }),
}));

// ==================== Selectors ====================

/**
 * 获取连接状态文本
 */
export const getConnectionStatusText = (state: WebSocketState): string => {
  if (state.isConnecting) return '连接中...';
  if (state.isConnected) return '已连接';
  return '未连接';
};

/**
 * 获取连接状态颜色
 */
export const getConnectionStatusColor = (state: WebSocketState): string => {
  if (state.isConnecting) return 'yellow';
  if (state.isConnected) return 'green';
  return 'red';
};

/**
 * 是否需要重连
 */
export const shouldReconnect = (state: WebSocketState, maxAttempts: number = 5): boolean => {
  return !state.isConnected && !state.isConnecting && state.reconnectCount < maxAttempts;
};

/**
 * 计算连接时长（毫秒）
 */
export const getConnectionDuration = (state: WebSocketState): number => {
  if (!state.isConnected || !state.lastConnected) return 0;
  return Date.now() - state.lastConnected;
};

/**
 * 计算断开时长（毫秒）
 */
export const getDisconnectedDuration = (state: WebSocketState): number => {
  if (state.isConnected || !state.lastDisconnected) return 0;
  return Date.now() - state.lastDisconnected;
};

/**
 * 获取最后消息时间间隔（秒）
 */
export const getLastMessageInterval = (state: WebSocketState): number => {
  if (!state.lastMessageTime) return 0;
  return Math.floor((Date.now() - state.lastMessageTime) / 1000);
};
