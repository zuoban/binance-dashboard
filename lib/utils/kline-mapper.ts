/**
 * K线数据映射工具
 *
 * 将币安API返回的K线数据转换为我们的格式
 * 币安API返回的是数组格式: [openTime, open, high, low, close, volume, closeTime, ...]
 */

import type { KlineData } from '@/types/binance'

/**
 * 币安K线数组格式
 */
export type BinanceKlineArray = [
  number, // openTime
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  number, // closeTime
  string, // quoteAssetVolume
  number, // numberOfTrades
  string, // takerBuyBaseAssetVolume
  string, // takerBuyQuoteAssetVolume
  string, // ignore
]

/**
 * 将币安K线数据数组转换为我们的格式
 */
export function mapBinanceKlines(data: BinanceKlineArray[]): KlineData[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter(item => item && Array.isArray(item) && item.length >= 6).map(mapBinanceKline)
}

/**
 * 将单个币安K线数组转换为我们的格式
 */
export function mapBinanceKline(data: BinanceKlineArray): KlineData {
  return {
    time: Math.floor((data[0] as number) / 1000),
    open: parseFloat(data[1] as string),
    high: parseFloat(data[2] as string),
    low: parseFloat(data[3] as string),
    close: parseFloat(data[4] as string),
    volume: parseFloat(data[5] as string),
  }
}

/**
 * 转换lightweight-charts格式的K线数据
 */
export function toLightweightChartsFormat(
  data: KlineData[]
): { time: number; open: number; high: number; low: number; close: number; volume?: number }[] {
  return data.map(kline => ({
    time: kline.time,
    open: kline.open,
    high: kline.high,
    low: kline.low,
    close: kline.close,
    volume: kline.volume,
  }))
}
