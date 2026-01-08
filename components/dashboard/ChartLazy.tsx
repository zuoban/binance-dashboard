/**
 * 图表组件懒加载配置
 *
 * 将大型图表组件拆分为单独的代码块，按需加载
 */

import { lazy } from 'react'

/**
 * 懒加载 PnL 收益曲线图
 */
export const PnLChart = lazy(() =>
  import('./PnLChart').then(module => ({
    default: module.PnLChart,
  }))
)

/**
 * 懒加载简化版 PnL 图表
 */
export const SimplePnLChart = lazy(() =>
  import('./PnLChart').then(module => ({
    default: module.SimplePnLChart,
  }))
)

/**
 * 懒加载持仓分布饼图
 */
export const PositionDistribution = lazy(() =>
  import('./PositionDistribution').then(module => ({
    default: module.PositionDistribution,
  }))
)

/**
 * 懒加载简化版持仓分布图
 */
export const SimplePositionDistribution = lazy(() =>
  import('./PositionDistribution').then(module => ({
    default: module.SimplePositionDistribution,
  }))
)

/**
 * 懒加载实时价格图表
 */
export const PriceChart = lazy(() =>
  import('./PriceChart').then(module => ({
    default: module.PriceChart,
  }))
)

/**
 * 懒加载简化版价格图表
 */
export const SimplePriceChart = lazy(() =>
  import('./PriceChart').then(module => ({
    default: module.SimplePriceChart,
  }))
)
