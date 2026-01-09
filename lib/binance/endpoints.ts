/**
 * 币安合约 API 端点配置
 *
 * 参考: https://developers.binance.com/docs/zh-CN/derivatives/usds-margined-futures/rest-api
 */

/**
 * API 端点类型
 */
export type ApiEndpointType = 'GET' | 'POST' | 'DELETE' | 'PUT'

/**
 * API 端点接口
 */
export interface ApiEndpoint {
  /** 端点路径 */
  path: string
  /** HTTP 方法 */
  method: ApiEndpointType
  /** 是否需要签名 */
  signed: boolean
  /** 是否需要 API Key */
  needKey: boolean
  /** 权重（用于限流） */
  weight: number
}

/**
 * 币安合约 API 端点
 */
export const BinanceEndpoints = {
  // ==================== 账户信息 ====================

  /**
   * 获取账户信息（USER_DATA）
   * 权重: 20
   */
  ACCOUNT: {
    path: '/fapi/v2/account',
    method: 'GET',
    signed: true,
    needKey: true,
    weight: 20,
  } as ApiEndpoint,

  // ==================== 持仓信息 ====================

  /**
   * 获取当前持仓（USER_DATA）
   * 权重: 5
   */
  POSITION_RISK: {
    path: '/fapi/v2/positionRisk',
    method: 'GET',
    signed: true,
    needKey: true,
    weight: 5,
  } as ApiEndpoint,

  /**
   * 获取用户持仓（USER_DATA）
   * 权重: 5
   */
  ACCOUNT_POSITION: {
    path: '/fapi/v2/positionRisk',
    method: 'GET',
    signed: true,
    needKey: true,
    weight: 5,
  } as ApiEndpoint,

  // ==================== 订单管理 ====================

  /**
   * 查询当前订单（USER_DATA）
   * 权重: 5
   */
  OPEN_ORDERS: {
    path: '/fapi/v1/openOrders',
    method: 'GET',
    signed: true,
    needKey: true,
    weight: 5,
  } as ApiEndpoint,

  /**
   * 查询所有订单（USER_DATA）
   * 权重: 10
   */
  ALL_ORDERS: {
    path: '/fapi/v1/allOrders',
    method: 'GET',
    signed: true,
    needKey: true,
    weight: 10,
  } as ApiEndpoint,

  /**
   * 查询成交记录（USER_DATA）
   * 权重: 20
   */
  USER_TRADES: {
    path: '/fapi/v1/userTrades',
    method: 'GET',
    signed: true,
    needKey: true,
    weight: 20,
  } as ApiEndpoint,

  /**
   * 查询订单（USER_DATA）
   * 权重: 5
   */
  ORDER: {
    path: '/fapi/v1/order',
    method: 'GET',
    signed: true,
    needKey: true,
    weight: 5,
  } as ApiEndpoint,

  // ==================== 交易对信息 ====================

  /**
   * 获取交易对信息（MARKET_DATA）
   * 权重: 10
   */
  EXCHANGE_INFO: {
    path: '/fapi/v1/exchangeInfo',
    method: 'GET',
    signed: false,
    needKey: false,
    weight: 10,
  } as ApiEndpoint,

  /**
   * 获取深度信息（MARKET_DATA）
   * 权重: 根据不同限制有所变化
   */
  DEPTH: {
    path: '/fapi/v1/depth',
    method: 'GET',
    signed: false,
    needKey: false,
    weight: 10,
  } as ApiEndpoint,

  /**
   * 24小时价格变动统计（MARKET_DATA）
   * 权重: 根据不同交易对数量变化
   */
  TICKER_24HR: {
    path: '/fapi/v1/ticker/24hr',
    method: 'GET',
    signed: false,
    needKey: false,
    weight: 10,
  } as ApiEndpoint,

  // ==================== K线数据 ====================

  /**
   * 获取 K 线数据（MARKET_DATA）
   * 权重: 1
   */
  KLINE: {
    path: '/fapi/v1/klines',
    method: 'GET',
    signed: false,
    needKey: false,
    weight: 1,
  } as ApiEndpoint,

  // ==================== WebSocket ====================

  /**
   * 获取 Listen Key（用于用户数据流）
   * 权重: 1
   */
  LISTEN_KEY: {
    path: '/fapi/v1/listenKey',
    method: 'POST',
    signed: true,
    needKey: true,
    weight: 1,
  } as ApiEndpoint,

  /**
   * 延长 Listen Key 有效期
   * 权重: 1
   */
  KEEP_ALIVE_LISTEN_KEY: {
    path: '/fapi/v1/listenKey',
    method: 'PUT',
    signed: true,
    needKey: true,
    weight: 1,
  } as ApiEndpoint,

  /**
   * 关闭 Listen Key
   * 权重: 1
   */
  CLOSE_LISTEN_KEY: {
    path: '/fapi/v1/listenKey',
    method: 'DELETE',
    signed: true,
    needKey: true,
    weight: 1,
  } as ApiEndpoint,
}

/**
 * 币安 API 基础 URL
 */
export const BinanceBaseUrl = {
  /** REST API */
  REST: 'https://fapi.binance.com',
  /** WebSocket */
  WS: 'wss://fstream.binance.com/ws',
  /** 测试网 REST API */
  TESTNET_REST: 'https://testnet.binancefuture.com',
  /** 测试网 WebSocket */
  TESTNET_WS: 'wss://stream.binancefuture.com/ws',
}

/**
 * API 权限类型
 */
export enum ApiPermission {
  /** 只读权限（查看持仓、订单等） */
  READ_ONLY = 'READ_ONLY',
  /** 交易权限（下单、撤单等） */
  TRADING = 'TRADING',
}

/**
 * 币安 API 错误代码
 */
export enum BinanceErrorCode {
  /** 成功 */
  SUCCESS = 0,
  /** 未知错误 */
  UNKNOWN = -1000,
  /** 断开连接 */
  DISCONNECTED = -1001,
  /** 未授权 */
  UNAUTHORIZED = -1002,
  /** 请求过多 */
  TOO_MANY_REQUESTS = -1003,
  /** IP 被限制 */
  IP_BANNED = -1004,
  /** 未知位置 */
  UNKNOWN_LOCATION = -1005,
  /** 只接受只读请求 */
  READ_ONLY_LIMITED = -1006,
  /** 超时 */
  TIMEOUT = -1021,
  /** 签名无效 */
  INVALID_SIGNATURE = -1022,
  /** 时间戳超出接收时间窗口 */
  TIMESTAMP_FOR_THIS_REQUEST_IS_OUTSIDE_RECVWINDOW = -1023,
  /** API Key 格式无效 */
  INVALID_API_KEY_FORMAT = -1025,
  /** 该 API Key 没有绑定此 IP */
  THIS_APIKEY_DOES_NOT_HAVE_BINDING_UID = -1026,
  /** 没有该 API Key 的交易权限 */
  THIS_APIKEY_DOES_NOT_HAVE_PERMIT = -1027,
}

/**
 * 限流配置
 */
export const RateLimitConfig = {
  /** 默认请求权重限制 */
  DEFAULT_WEIGHT_LIMIT: 2400,
  /** 每分钟请求数限制 */
  REQUEST_LIMIT_PER_MINUTE: 2400,
  /** 每秒请求数限制 */
  REQUEST_LIMIT_PER_SECOND: 300,
  /** 时间窗口（毫秒） */
  RECV_WINDOW: 5000,
}

/**
 * K 线间隔
 */
export const KlineInterval = {
  /** 1 秒 */
  '1s': '1s',
  /** 1 分钟 */
  '1m': '1m',
  /** 3 分钟 */
  '3m': '3m',
  /** 5 分钟 */
  '5m': '5m',
  /** 15 分钟 */
  '15m': '15m',
  /** 30 分钟 */
  '30m': '30m',
  /** 1 小时 */
  '1h': '1h',
  /** 2 小时 */
  '2h': '2h',
  /** 4 小时 */
  '4h': '4h',
  /** 6 小时 */
  '6h': '6h',
  /** 8 小时 */
  '8h': '8h',
  /** 12 小时 */
  '12h': '12h',
  /** 1 天 */
  '1d': '1d',
  /** 3 天 */
  '3d': '3d',
  /** 1 周 */
  '1w': '1w',
  /** 1 月 */
  '1M': '1M',
} as const

export type KlineInterval = (typeof KlineInterval)[keyof typeof KlineInterval]
