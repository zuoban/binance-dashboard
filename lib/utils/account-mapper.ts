/**
 * 币安账户数据映射工具
 *
 * 将币安 API 返回的账户信息映射到我们的类型定义
 */

import { AccountAsset, Asset } from '@/types/binance'
import type { BinanceAccountInfo, BinanceAsset } from '@/types/binance-api'

/**
 * 将币安 Asset 类型转换为我们的 Asset 类型
 */
function mapBinanceAsset(binanceAsset: BinanceAsset): Asset {
  return {
    asset: binanceAsset.asset,
    walletBalance: binanceAsset.walletBalance,
    crossWalletBalance: binanceAsset.crossWalletBalance,
    unrealizedProfit: binanceAsset.unrealizedProfit,
    marginBalance: binanceAsset.marginBalance,
    maintainMargin: binanceAsset.maintainedMargin,
    initialMargin: binanceAsset.initialMargin,
    positionInitialMargin: binanceAsset.positionInitialMargin,
    openOrderInitialMargin: binanceAsset.openOrderInitialMargin,
    crossUnPnl: binanceAsset.crossUnPnl,
    availableBalance: binanceAsset.availableBalance,
    maxWithdrawAmount: binanceAsset.maxWithdrawAmount,
    leverage: '1', // 币安 API 中没有这个字段，使用默认值
    positionSide: 'BOTH', // 币安 API 中没有这个字段，使用默认值
    notionalLeverage: '0', // 币安 API 中没有这个字段，使用默认值
    notionalValue: '0', // 币安 API 中没有这个字段，使用默认值
    isolatedWalletBalance: '0', // 币安 API 中没有这个字段，使用默认值
  }
}

/**
 * 映射账户信息数据
 * @param data 币安 API 返回的账户信息
 * @returns 标准化的账户信息
 */
export function mapBinanceAccount(
  data: BinanceAccountInfo | Partial<Record<string, unknown>>
): AccountAsset {
  // 币安 API 返回的字段名
  return {
    // 总钱包余额
    totalWalletBalance: (data.totalWalletBalance as string) || '0',
    // 可用余额
    availableBalance: (data.availableBalance as string) || '0',
    // 未实现盈亏 (币安API字段: totalUnrealizedProfit)
    unrealizedProfit: (data.totalUnrealizedProfit as string) || '0',
    // 保证金余额
    marginBalance: (data.marginBalance as string) || '0',
    // 持仓保证金
    maintainMargin: (data.maintMargin as string) || '0',
    // 账户余额
    balance: (data.balance as string) || '0',
    // cross 保证金余额
    crossWalletBalance: (data.crossWalletBalance as string) || '0',
    // cross 未实现盈亏
    crossUnPnl: (data.crossUnPnl as string) || '0',
    // 持仓未结盈亏
    crossUnPnlRatio: (data.crossUnPnlRatio as string) || '0',
    // 持仓保证金
    positionInitialMargin: (data.positionInitialMargin as string) || '0',
    // open 损失
    openOrderInitialMargin: (data.openOrderInitialMargin as string) || '0',
    // leverage 倍数
    leverage: (data.leverage as string) || '1',
    // 持仓模式
    notionalLeverage: (data.notionalLeverage as string) || '0',
    // 持仓模式
    notionalValue: (data.notionalValue as string) || '0',
    // isolated 保证金余额
    isolatedWalletBalance: (data.isolatedWalletBalance as string) || '0',
    // 更新时间
    updateTime: (data.updateTime as number) || Date.now(),
    // 总持仓保证金
    totalPositionInitialMargin: (data.totalPositionInitialMargin as string) || '0',
    // 总维持保证金
    totalMaintMargin: (data.totalMaintMargin as string) || '0',
    // 最大可提取金额
    maxWithdrawAmount: (data.maxWithdrawAmount as string) || '0',
    // 总 open 订单保证金
    totalOpenOrderInitialMargin: (data.totalOpenOrderInitialMargin as string) || '0',
    // 总 cross 钱包余额
    totalCrossWalletBalance: (data.totalCrossWalletBalance as string) || '0',
    // 总 cross 未实现盈亏
    totalCrossUnPnl: (data.totalCrossUnPnl as string) || '0',
    // 资产列表
    assets: (data.assets as BinanceAsset[])?.map(mapBinanceAsset) || [],
    // 当前杠杆
    currentLeverage: (data.currentLeverage as string) || '1',
    // 保证金模式
    marginMode: (data.marginMode as string) || 'cross',
  }
}
