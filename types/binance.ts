/**
 * 币安合约 API 类型定义
 * 参考: https://developers.binance.com/docs/zh-CN/derivatives/usds-margined-futures
 */

// ==================== 持仓信息 ====================

export interface Position {
  /** 交易对 */
  symbol: string
  /** 持仓数量 */
  positionAmount: string
  /** 入场价格 */
  entryPrice: string
  /** 标记价格 */
  markPrice: string
  /** 未实现盈亏 */
  unrealizedProfit: string
  /** 强平价格 */
  liquidationPrice: string
  /** 盈亏平衡价 */
  breakEvenPrice: string
  /** 杠杆倍数 */
  leverage: string
  /** 持仓方向 */
  positionSide: 'LONG' | 'SHORT' | 'BOTH'
  /** 保证金类型 */
  marginType: 'isolated' | 'cross'
  /** 未结盈亏 */
  notional: string
  /** 隔离保证金 */
  isolatedWallet: string
  /** 双向持仓模式 */
  dualSide: boolean
}

// ==================== 订单信息 ====================

export type OrderStatus =
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'PENDING_CANCEL'
  | 'REJECTED'
  | 'EXPIRED'
  | 'EXPIRED_IN_MATCH'

export type OrderType =
  | 'LIMIT'
  | 'MARKET'
  | 'STOP'
  | 'STOP_MARKET'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_MARKET'
  | 'TRAILING_STOP_MARKET'

export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTX'

export interface Order {
  /** 成交记录 ID（可选，仅在使用 getUserTrades API 时存在） */
  id?: number
  /** 订单 ID */
  orderId: number
  /** 交易对 */
  symbol: string
  /** 客户端订单 ID */
  clientOrderId: string
  /** 订单价格 */
  price: string
  /** 原始数量 */
  origQty: string
  /** 已成交数量 */
  executedQty: string
  /** 累计成交金额 */
  cumQuote: string
  /** 订单状态 */
  status: OrderStatus
  /** 时间在力 */
  timeInForce: TimeInForce
  /** 订单类型 */
  type: OrderType
  /** 买卖方向 */
  side: 'BUY' | 'SELL'
  /** 止损价格 */
  stopPrice: string
  /** 冰山订单数量 */
  icebergQty: string
  /** 订单创建时间 */
  time: number
  /** 订单更新时间 */
  updateTime: number
  /** 是否只减仓 */
  reduceOnly: boolean
  /** 是否全平 */
  closePosition: boolean
  /** 方向 */
  positionSide: 'BOTH' | 'LONG' | 'SHORT'
  /** 是否只减仓 */
  workingType: 'MARK_PRICE' | 'CONTRACT_PRICE'
  /** 原始订单类型 */
  origType: OrderType
  /** 价格保护 */
  priceMatch: 'NONE' | 'MATCH' | 'OPPONENT' | 'OPPONENT_5' | 'OPPONENT_10' | 'OPPONENT_20'
  /** 自定义止损 */
  selfTradePreventionMode: 'EXPIRE_NONE' | 'EXPIRE_TAKER' | 'EXPIRE_MAKER' | 'EXPIRE_BOTH'
  /** GPU 失败原因 */
  priceProtect: boolean
  /** 手续费 */
  commission?: string
  /** 手续费计价单位 */
  commissionAsset?: string
  /** 实现盈亏 */
  realizedPnl?: string
  /** 是否买方 */
  buyer?: boolean
}

// ==================== 账户资产信息 ====================

export interface AccountAsset {
  /** 总钱包余额 */
  totalWalletBalance: string
  /** 可用余额 */
  availableBalance: string
  /** 未实现盈亏 */
  unrealizedProfit: string
  /** 保证金余额 */
  marginBalance: string
  /** 持仓保证金 */
  maintainMargin: string
  /** 账户余额 */
  balance: string
  /** cross 保证金余额 */
  crossWalletBalance: string
  /** cross 未实现盈亏 */
  crossUnPnl: string
  /** 持仓未结盈亏 */
  crossUnPnlRatio: string
  /** 持仓保证金 */
  positionInitialMargin: string
  /** open 损失 */
  openOrderInitialMargin: string
  /** leverage 倍数 */
  leverage: string
  /** 持仓模式 */
  notionalLeverage: string
  /** 持仓模式 */
  notionalValue: string
  /** isolated 保证金余额 */
  isolatedWalletBalance: string
  /** 更新时间 */
  updateTime: number
  /** 总持仓保证金 */
  totalPositionInitialMargin: string
  /** 总维持保证金 */
  totalMaintMargin: string
  /** 最大可提取金额 */
  maxWithdrawAmount: string
  /** 总 open 订单保证金 */
  totalOpenOrderInitialMargin: string
  /** 总 cross 钱包余额 */
  totalCrossWalletBalance: string
  /** 总 cross 未实现盈亏 */
  totalCrossUnPnl: string
  /** 资产列表 */
  assets: Asset[]
  /** 当前杠杆倍数 */
  currentLeverage: string
  /** 保证金模式 */
  marginMode: string
}

export interface Asset {
  /** 资产名称 */
  asset: string
  /** 钱包余额 */
  walletBalance: string
  /** cross 钱包余额 */
  crossWalletBalance: string
  /** unrealized 盈亏 */
  unrealizedProfit: string
  /** margin 余额 */
  marginBalance: string
  /** maintain 保证金 */
  maintainMargin: string
  /** 初始保证金 */
  initialMargin: string
  /** positionInitialMargin */
  positionInitialMargin: string
  /** openOrderInitialMargin */
  openOrderInitialMargin: string
  /** cross 未实现盈亏 */
  crossUnPnl: string
  /** available 余额 */
  availableBalance: string
  /** max 可提取金额 */
  maxWithdrawAmount: string
  /** 杠杆倍数 */
  leverage: string
  /** 持仓方向 */
  positionSide: 'BOTH' | 'LONG' | 'SHORT'
  /** notional 杠杆 */
  notionalLeverage: string
  /** notional 价值 */
  notionalValue: string
  /** isolated 保证金余额 */
  isolatedWalletBalance: string
}

// ==================== API 响应 ====================

export interface BinanceApiResponse<T> {
  /** 响应代码 */
  code: number
  /** 响应消息 */
  msg: string
  /** 响应数据 */
  data: T
}

export interface BinanceErrorResponse {
  /** 错误代码 */
  code: number
  /** 错误消息 */
  msg: string
}

// ==================== API 请求参数 ====================

export interface PositionQueryParams {
  /** 交易对 */
  symbol?: string
}

export interface OrderQueryParams {
  /** 交易对 */
  symbol?: string
  /** 订单 ID */
  orderId?: number
  /** 客户端订单 ID */
  origClientOrderId?: string
  /** 开始时间 */
  startTime?: number
  /** 结束时间 */
  endTime?: number
  /** 每页数量 */
  limit?: number
}

// ==================== WebSocket ====================

export interface WebSocketMessage {
  /** 事件类型 */
  e: string
  /** 事件时间 */
  E: number
  /** 交易对 */
  s?: string
  /** 数据 */
  [key: string]: unknown
}

export interface PositionUpdateMessage extends WebSocketMessage {
  e: 'ACCOUNT_UPDATE'
  E: number
  T: number
  a: {
    /** 更新的事件原因 */
    m:
      | 'DEPOSIT'
      | 'WITHDRAW'
      | 'ADJUSTMENT'
      | 'FEE'
      | 'FUNDING_FEE'
      | 'MARGIN_CALL'
      | 'PRELIQUIDATION'
      | 'LIQUIDATION'
    /** 事件更新的账户余额 */
    B: AssetBalance[]
    /** 事件更新的持仓信息 */
    P: PositionUpdate[]
  }
}

export interface AssetBalance {
  /** 资产名称 */
  a: string
  /** 可用余额 */
  f: string
  /** 锁定余额 */
  l: string
}

export interface PositionUpdate {
  /** 交易对 */
  s: string
  /** 持仓方向 */
  ps: 'BOTH' | 'LONG' | 'SHORT'
  /** 持仓数量 */
  pa: string
  /** 入场价格 */
  ep: string
  /** 未实现盈亏 */
  up: string
  /** notional */
  mt: 'isolated' | 'cross'
  /** 持仓保证金 */
  iw: string
  /** 杠杆倍数 */
  mv: string
}
