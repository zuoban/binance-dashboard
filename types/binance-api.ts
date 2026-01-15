/**
 * 币安 API 响应类型定义
 */

/**
 * 币安资产信息
 */
export interface BinanceAsset {
  asset: string
  walletBalance: string
  availableBalance: string
  crossWalletBalance: string
  crossUnPnl: string
  maintainedMargin: string
  initialMargin: string
  positionInitialMargin: string
  openOrderInitialMargin: string
  maxWithdrawAmount: string
  crossAssetBalanceWithoutBorrowNeg: string
  crossAssetBalanceWithoutBorrowPos: string
  unrealizedProfit: string
  marginBalance: string
}

/**
 * 币安账户信息
 */
export interface BinanceAccountInfo {
  feeTier: number
  canTrade: boolean
  canDeposit: boolean
  canWithdraw: boolean
  updateTime: number
  totalInitialMargin: string
  totalMaintMargin: string
  totalWalletBalance: string
  totalUnrealizedProfit: string
  totalMarginBalance: string
  totalPositionInitialMargin: string
  totalOpenOrderInitialMargin: string
  totalCrossWalletBalance: string
  totalCrossUnPnl: string
  assets: BinanceAsset[]
  positions: BinancePosition[]
  // 可选的额外字段
  availableBalance?: string
  marginBalance?: string
  maintMargin?: string
  balance?: string
  crossWalletBalance?: string
  crossUnPnl?: string
  crossUnPnlRatio?: string
  positionInitialMargin?: string
  openOrderInitialMargin?: string
  leverage?: string
  notionalLeverage?: string
  notionalValue?: string
  isolatedWalletBalance?: string
  maxWithdrawAmount?: string
  currentLeverage?: string
  marginMode?: string
}

/**
 * 币安持仓信息
 */
export interface BinancePosition {
  symbol: string
  positionAmount: string
  positionAmt?: string // 币安 API 可能使用的另一个字段名
  entryPrice: string
  breakEvenPrice: string
  unRealizedProfit: string
  liquidationPrice: string
  markPrice?: string
  leverage: string
  maxNotionalValue: string
  marginType: string
  isolatedMargin: string
  isAutoAddMargin: string
  positionSide: string
  notional: string
  isolatedWallet: string
  updateTime: number
  adlQuantile: string
  dualSide?: boolean | string
}

/**
 * 币安用户成交记录
 */
export interface BinanceUserTrade {
  symbol: string
  id: number
  orderId: number
  side: 'BUY' | 'SELL'
  price: string
  qty: string
  quoteQty: string
  time: number
  positionSide: string
  maker: boolean
  buyer: boolean
  commission: string
  commissionAsset: string
  realizedPnl: string
}

/**
 * 币安订单信息
 */
export interface BinanceOrder {
  symbol: string
  orderId: number
  clientOrderId: string
  price: string
  origQty: string
  executedQty: string
  reduceOnly: string
  side: 'BUY' | 'SELL'
  positionSide: string
  status: string
  timeInForce: string
  type: string
  stopPrice: string
  workingType: string
  priceProtect: string
  origType: string
  time: number
  updateTime: number
}

/**
 * 币安价格信息
 */
export interface BinancePrice {
  symbol: string
  price: string
  time: number
}

/**
 * 币安错误响应
 */
export interface BinanceErrorResponse {
  code: number
  msg: string
}

/**
 * 币安 24hr Ticker 信息
 */
export interface BinanceTicker24hr {
  symbol: string
  priceChange: string
  priceChangePercent: string
  weightedAvgPrice: string
  prevClosePrice: string
  lastPrice: string
  lastQty: string
  bidPrice: string
  bidQty: string
  askPrice: string
  askQty: string
  openPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
  openTime: number
  closeTime: number
  firstId: number
  lastId: number
  count: number
}
