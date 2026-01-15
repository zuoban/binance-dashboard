/**
 * 币安 API 数据映射工具
 *
 * 将币安 API 返回的原始数据转换为我们的类型格式
 */

import { Position } from '@/types/binance'

/**
 * 将币安 positionRisk API 响应转换为我们的 Position 类型
 */
export function mapBinancePosition(data: any): Position {
  return {
    symbol: data.symbol,
    positionAmount: data.positionAmt || '0',
    entryPrice: data.entryPrice || '0',
    markPrice: data.markPrice || '0',
    unrealizedProfit: data.unRealizedProfit || '0',
    liquidationPrice: data.liquidationPrice || '0',
    breakEvenPrice: data.breakEvenPrice || '0',
    leverage: data.leverage || '1',
    positionSide: data.positionSide || 'BOTH',
    marginType: data.marginType || 'cross',
    notional: data.notional || '0',
    isolatedWallet: data.isolatedWallet || '0',
    dualSide: data.dualSide === true || data.dualSide === 'true',
  }
}

/**
 * 批量转换持仓数据
 */
export function mapBinancePositions(dataArray: any[]): Position[] {
  if (!Array.isArray(dataArray)) {
    console.warn('[mapBinancePositions] Input is not an array:', dataArray)
    return []
  }

  return dataArray
    .filter(item => item && typeof item === 'object')
    .map(mapBinancePosition)
    .filter(position => {
      // 只返回有实际持仓的仓位（持仓数量不为 0）
      const amt = parseFloat(position.positionAmount)
      return !isNaN(amt) && amt !== 0
    })
}
