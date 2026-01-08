/**
 * 应用配置
 *
 * 从环境变量中读取配置，并提供默认值
 */

/**
 * 币安 API 配置
 */
export const binanceConfig = {
  /** REST API 基础 URL */
  restApi: process.env.NEXT_PUBLIC_BINANCE_REST_API || 'https://fapi.binance.com',
  /** WebSocket API 基础 URL */
  wsApi: process.env.NEXT_PUBLIC_BINANCE_WS_API || 'wss://fstream.binance.com/ws',
  /** 是否使用测试网 */
  useTestnet: process.env.NEXT_PUBLIC_USE_TESTNET === 'true',
} as const

/**
 * 应用配置
 */
export const appConfig = {
  /** 应用 URL */
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  /** 环境 */
  env: process.env.NODE_ENV || 'development',
  /** 是否开发环境 */
  isDevelopment: process.env.NODE_ENV === 'development',
  /** 是否生产环境 */
  isProduction: process.env.NODE_ENV === 'production',
} as const

/**
 * API 配置
 */
export const apiConfig = {
  /** 请求超时时间（毫秒） */
  timeout: parseInt(process.env.API_TIMEOUT || '10000', 10),
  /** 重试次数 */
  retries: parseInt(process.env.API_RETRIES || '3', 10),
  /** 重试延迟（毫秒） */
  retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000', 10),
  /** 接收窗口时间（毫秒） */
  recvWindow: parseInt(process.env.RECV_WINDOW || '5000', 10),
} as const

/**
 * WebSocket 配置 */
export const wsConfig = {
  /** 连接超时时间（毫秒） */
  connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT || '10000', 10),
  /** 重连最大次数 */
  maxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT_ATTEMPTS || '5', 10),
  /** 重连延迟（毫秒） */
  reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY || '1000', 10),
  /** Ping 间隔（毫秒） */
  pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10),
  /** Listen Key 更新间隔（毫秒） */
  listenKeyRefreshInterval: parseInt(process.env.WS_LISTEN_KEY_REFRESH_INTERVAL || '1800000', 10), // 30分钟
} as const

/**
 * UI 配置
 */
export const uiConfig = {
  /** 数据刷新间隔（毫秒） */
  refreshInterval: parseInt(process.env.UI_REFRESH_INTERVAL || '5000', 10),
  /** 分页大小 */
  pageSize: parseInt(process.env.UI_PAGE_SIZE || '20', 10),
  /** 小数位数 */
  decimalPlaces: parseInt(process.env.UI_DECIMAL_PLACES || '2', 10),
} as const

/**
 * 认证配置
 */
export const authConfig = {
  /** 访问码（留空则不启用认证） */
  accessCode: process.env.ACCESS_CODE || '',
  /** 是否启用认证 */
  enabled: !!process.env.ACCESS_CODE,
} as const

/**
 * 完整配置对象
 */
export const config = {
  binance: binanceConfig,
  app: appConfig,
  api: apiConfig,
  ws: wsConfig,
  ui: uiConfig,
  auth: authConfig,
} as const

/**
 * 验证配置
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // API Key 和 Secret 只在服务端可用，在服务端时才验证
  if (typeof window === 'undefined') {
    if (!process.env.BINANCE_API_KEY) {
      errors.push('Missing BINANCE_API_KEY in environment variables')
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [] }
}

/**
 * 获取服务端专用配置（包含 API Key 和 API Secret）
 * ⚠️ 警告：此函数只能在服务端调用
 */
export function getServerConfig() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerConfig can only be called on the server side')
  }

  return {
    ...config,
    binance: {
      ...binanceConfig,
      apiKey: process.env.BINANCE_API_KEY || '',
      apiSecret: process.env.BINANCE_API_SECRET || '',
    },
  }
}
