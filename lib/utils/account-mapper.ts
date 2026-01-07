/**
 * 币安账户数据映射工具
 *
 * 将币安 API 返回的账户信息映射到我们的类型定义
 */

import { AccountAsset } from '@/types/binance';

/**
 * 映射账户信息数据
 * @param data 币安 API 返回的账户信息
 * @returns 标准化的账户信息
 */
export function mapBinanceAccount(data: any): AccountAsset {
  // 币安 API 返回的字段名
  return {
    // 总钱包余额
    totalWalletBalance: data.totalWalletBalance || '0',
    // 可用余额
    availableBalance: data.availableBalance || '0',
    // 未实现盈亏 (币安API字段: totalUnrealizedProfit)
    unrealizedProfit: data.totalUnrealizedProfit || '0',
    // 保证金余额
    marginBalance: data.marginBalance || '0',
    // 持仓保证金
    maintainMargin: data.maintMargin || '0',
    // 账户余额
    balance: data.balance || '0',
    // cross 保证金余额
    crossWalletBalance: data.crossWalletBalance || '0',
    // cross 未实现盈亏
    crossUnPnl: data.crossUnPnl || '0',
    // 持仓未结盈亏
    crossUnPnlRatio: data.crossUnPnlRatio || '0',
    // 持仓保证金
    positionInitialMargin: data.positionInitialMargin || '0',
    // 资产列表（如果有）
    assets: data.assets || [],
    // 当前杠杆
    currentLeverage: data.currentLeverage || '1',
    // 保证金模式
    marginMode: data.marginMode || 'cross',
  };
}
