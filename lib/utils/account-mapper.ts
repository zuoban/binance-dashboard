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
    // open 损失
    openOrderInitialMargin: data.openOrderInitialMargin || '0',
    // leverage 倍数
    leverage: data.leverage || '1',
    // 持仓模式
    notionalLeverage: data.notionalLeverage || '0',
    // 持仓模式
    notionalValue: data.notionalValue || '0',
    // isolated 保证金余额
    isolatedWalletBalance: data.isolatedWalletBalance || '0',
    // 更新时间
    updateTime: data.updateTime || Date.now(),
    // 总持仓保证金
    totalPositionInitialMargin: data.totalPositionInitialMargin || '0',
    // 总维持保证金
    totalMaintMargin: data.totalMaintMargin || '0',
    // 最大可提取金额
    maxWithdrawAmount: data.maxWithdrawAmount || '0',
    // 总 open 订单保证金
    totalOpenOrderInitialMargin: data.totalOpenOrderInitialMargin || '0',
    // 总 cross 钱包余额
    totalCrossWalletBalance: data.totalCrossWalletBalance || '0',
    // 总 cross 未实现盈亏
    totalCrossUnPnl: data.totalCrossUnPnl || '0',
    // 资产列表
    assets: data.assets || [],
    // 当前杠杆
    currentLeverage: data.currentLeverage || '1',
    // 保证金模式
    marginMode: data.marginMode || 'cross',
  };
}
