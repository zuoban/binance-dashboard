/**
 * K 线图价格范围计算工具
 *
 * 除蜡烛价格外，可将订单等关键价位纳入纵轴范围，避免边缘标注被图表裁切。
 */

export interface ChartPriceRange {
  minPrice: number
  maxPrice: number
  /** 与 requiredLevels 顺序一致；远端价位由图表边缘徽标承接。 */
  levelPlacements: (ChartLevelPlacement | null)[]
}

export type ChartLevelPlacement = 'visible' | 'above' | 'below'

interface ResolveChartPriceRangeOptions {
  /** 单侧最多允许关键价位把蜡烛原始区间扩展多少倍。 */
  maxExpansionRatio?: number
}

/** 判断未知价格是否为图表可使用的有效正数。 */
function isPositivePrice(price: number | undefined): price is number {
  return price !== undefined && Number.isFinite(price) && price > 0
}

/**
 * 计算带安全留白的图表纵轴范围。
 *
 * requiredLevels 中的有效价位会始终包含在最终范围内，供订单线等关键标注使用。
 */
export function resolveChartPriceRange(
  prices: readonly number[],
  requiredLevels: readonly (number | undefined)[] = [],
  { maxExpansionRatio = 1.5 }: ResolveChartPriceRangeOptions = {}
): ChartPriceRange {
  const validPrices = prices.filter(isPositivePrice)
  const baseMinPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0
  const baseMaxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0
  const naturalRange = baseMaxPrice - baseMinPrice
  const fallbackRange = Math.max(Math.abs(baseMaxPrice) * 0.005, 0.01)
  const expansionBase = Math.max(naturalRange, fallbackRange)
  const minimumAllowedPrice = baseMinPrice - expansionBase * maxExpansionRatio
  const maximumAllowedPrice = baseMaxPrice + expansionBase * maxExpansionRatio
  const protectedPrices = requiredLevels.filter(
    (price): price is number =>
      isPositivePrice(price) && price >= minimumAllowedPrice && price <= maximumAllowedPrice
  )
  const allPrices = [...validPrices, ...protectedPrices]
  const rangeMinPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0
  const rangeMaxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0
  const priceRange = rangeMaxPrice - rangeMinPrice
  const padding = Math.max(priceRange * 0.05, Math.max(Math.abs(rangeMaxPrice) * 0.0005, 0.01))
  const minPrice = rangeMinPrice - padding
  const maxPrice = rangeMaxPrice + padding

  return {
    minPrice,
    maxPrice,
    levelPlacements: requiredLevels.map(price => {
      if (!isPositivePrice(price)) {
        return null
      }
      if (price < minPrice) {
        return 'below'
      }
      if (price > maxPrice) {
        return 'above'
      }
      return 'visible'
    }),
  }
}
