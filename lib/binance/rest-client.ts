/**
 * 币安合约 REST API 客户端
 *
 * 提供统一的 API 调用接口，自动处理签名、错误处理、重试等逻辑
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios'
import { BinanceSignature } from './signature'
import { BinanceEndpoints, BinanceErrorCode } from './endpoints'
import type {
  BinanceAccountInfo,
  BinancePosition,
  BinanceOrder,
  BinanceUserTrade,
  BinanceTicker24hr,
  BinanceErrorResponse,
} from '@/types/binance-api'

/**
 * 币安 API 收益历史记录类型
 */
export interface BinanceIncome {
  symbol: string
  incomeType: string
  income: string
  asset: string
  info: string
  time: number
  tranId: number
  tradeId: string
}

/**
 * 币安 K 线数据类型
 */
export interface BinanceKline {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  closeTime: number
  quoteAssetVolume: string
  numberOfTrades: number
  takerBuyBaseAssetVolume: string
  takerBuyQuoteAssetVolume: string
}

/**
 * 币安 API 错误类
 */
export class BinanceApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public details?: BinanceErrorResponse | unknown
  ) {
    super(message)
    this.name = 'BinanceApiError'
  }
}

/**
 * REST API 客户端配置
 */
export interface RestClientConfig {
  /** API Key */
  apiKey: string
  /** API Secret */
  apiSecret: string
  /** 基础 URL */
  baseUrl?: string
  /** 请求超时时间（毫秒） */
  timeout?: number
  /** 是否启用请求日志 */
  enableLog?: boolean
}

/**
 * REST API 客户端类
 */
export class BinanceRestClient {
  private client: AxiosInstance
  private apiKey: string
  private apiSecret: string
  private enableLog: boolean

  constructor(config: RestClientConfig) {
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.enableLog = config.enableLog ?? process.env.NODE_ENV === 'development'

    // 创建 Axios 实断
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://fapi.binance.com',
      timeout: config.timeout || 10000,
    })

    // 添加请求拦截器
    this.client.interceptors.request.use(
      config => this.requestInterceptor(config),
      error => Promise.reject(error)
    )

    // 添加响应拦截器
    this.client.interceptors.response.use(
      response => this.responseInterceptor(response),
      error => this.responseErrorHandler(error)
    )
  }

  /**
   * 请求拦截器 - 添加公共请求头
   */
  private requestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    // 添加 API Key
    if (this.apiKey) {
      config.headers['X-MBX-APIKEY'] = this.apiKey
    }

    // 添加内容类型
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json'
    }

    return config
  }

  /**
   * 响应拦截器 - 处理成功响应
   */
  private responseInterceptor<T>(response: AxiosResponse<T>): T {
    if (this.enableLog) {
      // 简化日志：只显示关键信息，不输出完整响应体
      let dataInfo = ''

      if (Array.isArray(response.data)) {
        dataInfo = `Array(${response.data.length})`
      } else if (typeof response.data === 'object' && response.data !== null) {
        const keys = Object.keys(response.data)
        dataInfo = `Object{${keys.length} keys}`
      } else {
        dataInfo = `${typeof response.data}`
      }

      console.log(
        `[Binance API] ${response.config.method?.toUpperCase()} ${response.config.url} ` +
          `→ ${response.status} (${dataInfo})`
      )
    }

    return response.data
  }

  /**
   * 响应错误处理器 - 处理错误响应
   */
  private async responseErrorHandler(error: AxiosError<unknown>): Promise<never> {
    if (this.enableLog) {
      console.error('[Binance API] Error:', {
        message: error.message,
        response: error.response?.data,
        config: {
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
        },
      })
    }

    // 币安 API 错误
    if (error.response?.data) {
      const data = error.response.data as BinanceErrorResponse
      throw new BinanceApiError(
        data.code || error.response.status,
        data.msg || 'Unknown error',
        data
      )
    }

    // 网络错误
    if (error.code === 'ECONNABORTED') {
      throw new BinanceApiError(BinanceErrorCode.TIMEOUT, 'Request timeout')
    }

    // 其他错误
    throw new BinanceApiError(BinanceErrorCode.UNKNOWN, error.message || 'Unknown error occurred')
  }

  /**
   * 发送 GET 请求
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    signed: boolean = false
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: endpoint,
      params,
    }

    if (signed) {
      const url = this.buildSignedUrl(endpoint, params || {})
      const baseUrl = 'https://fapi.binance.com'
      config.url = url.split(baseUrl)[1]
      config.params = undefined
    }

    return this.client.request(config)
  }

  /**
   * 发送 POST 请求
   */
  async post<T>(
    endpoint: string,
    data?: Record<string, string | number | boolean | undefined>,
    signed: boolean = false
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: endpoint,
      data,
    }

    if (signed && data) {
      const { queryString, signature } = BinanceSignature.buildSignedQuery(data, this.apiSecret)
      config.data = undefined
      config.params = { ...data, timestamp: queryString.split('=')[1], signature }
    }

    return this.client.request(config)
  }

  /**
   * 发送 PUT 请求
   */
  async put<T>(
    endpoint: string,
    data?: Record<string, string | number | boolean | undefined>,
    signed: boolean = false
  ): Promise<T> {
    return this.post<T>(endpoint, data, signed)
  }

  /**
   * 发送 DELETE 请求
   */
  async delete<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    signed: boolean = false
  ): Promise<T> {
    return this.get<T>(endpoint, params, signed)
  }

  /**
   * 构建带签名的 URL
   */
  private buildSignedUrl(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined>
  ): string {
    const baseUrl = 'https://fapi.binance.com'
    return BinanceSignature.signUrl(`${baseUrl}${endpoint}`, params, this.apiSecret)
  }

  // ==================== 具体业务方法 ====================

  /**
   * 获取账户信息
   */
  async getAccountInfo(): Promise<BinanceAccountInfo> {
    return this.get(BinanceEndpoints.ACCOUNT.path, {}, true)
  }

  /**
   * 获取收益历史（包含已实现盈亏）
   */
  async getIncomeHistory(options?: {
    symbol?: string
    incomeType?: string
    startTime?: number
    endTime?: number
    limit?: number
  }): Promise<BinanceIncome[]> {
    const params: Record<string, string | number | undefined> = {}
    if (options?.symbol) params.symbol = options.symbol
    if (options?.incomeType) params.incomeType = options.incomeType
    if (options?.startTime) params.startTime = options.startTime
    if (options?.endTime) params.endTime = options.endTime
    if (options?.limit) params.limit = options.limit
    return this.get(BinanceEndpoints.INCOME_HISTORY.path, params, true)
  }

  /**
   * 获取持仓信息
   */
  async getPositions(symbol?: string): Promise<BinancePosition[]> {
    const params = symbol ? { symbol } : {}
    return this.get(BinanceEndpoints.POSITION_RISK.path, params, true)
  }

  /**
   * 获取当前订单
   */
  async getOpenOrders(symbol?: string): Promise<BinanceOrder[]> {
    const params = symbol ? { symbol } : {}
    return this.get(BinanceEndpoints.OPEN_ORDERS.path, params, true)
  }

  /**
   * 获取所有订单
   */
  async getAllOrders(
    symbol: string,
    options?: {
      orderId?: number
      startTime?: number
      endTime?: number
      limit?: number
    }
  ): Promise<BinanceOrder[]> {
    const params: Record<string, string | number | undefined> = {
      symbol,
      ...options,
    }
    return this.get(BinanceEndpoints.ALL_ORDERS.path, params, true)
  }

  /**
   * 获取用户成交记录
   */
  async getUserTrades(
    symbol: string,
    options?: {
      startTime?: number
      endTime?: number
      fromId?: number
      limit?: number
    }
  ): Promise<BinanceUserTrade[]> {
    const params: Record<string, string | number | undefined> = {
      symbol,
      ...options,
    }
    return this.get(BinanceEndpoints.USER_TRADES.path, params, true)
  }

  /**
   * 获取单个订单
   */
  async getOrder(
    symbol: string,
    orderId?: number,
    origClientOrderId?: string
  ): Promise<BinanceOrder> {
    const params: Record<string, string | number | undefined> = {
      symbol,
      orderId,
      origClientOrderId,
    }
    return this.get(BinanceEndpoints.ORDER.path, params, true)
  }

  /**
   * 获取交易对信息
   */
  async getExchangeInfo(): Promise<Record<string, unknown>> {
    return this.get(BinanceEndpoints.EXCHANGE_INFO.path)
  }

  /**
   * 获取 K 线数据
   */
  async getKlines(
    symbol: string,
    interval: string,
    options?: {
      limit?: number
      startTime?: number
      endTime?: number
    }
  ): Promise<BinanceKline[]> {
    const params: Record<string, string | number | undefined> = {
      symbol,
      interval,
      ...options,
    }
    return this.get(BinanceEndpoints.KLINE.path, params)
  }

  /**
   * 获取 24 小时价格变动统计
   */
  async get24hrTicker(symbol?: string): Promise<BinanceTicker24hr | BinanceTicker24hr[]> {
    const params = symbol ? { symbol } : {}
    return this.get(BinanceEndpoints.TICKER_24HR.path, params)
  }

  /**
   * 获取 Listen Key（用于用户数据流）
   */
  async getListenKey(): Promise<{ listenKey: string }> {
    return this.post(BinanceEndpoints.LISTEN_KEY.path, {}, true)
  }

  /**
   * 延长 Listen Key 有效期
   */
  async keepAliveListenKey(listenKey: string): Promise<void> {
    return this.put(BinanceEndpoints.KEEP_ALIVE_LISTEN_KEY.path, { listenKey }, true)
  }

  /**
   * 关闭 Listen Key
   */
  async closeListenKey(listenKey: string): Promise<void> {
    return this.delete(BinanceEndpoints.CLOSE_LISTEN_KEY.path, { listenKey }, true)
  }
}
