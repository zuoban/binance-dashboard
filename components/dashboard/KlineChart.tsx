'use client'

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  TouchEvent as ReactTouchEvent,
} from 'react'
import Chart from 'react-apexcharts'
import type { KlineInterval } from '@/lib/hooks/useBinanceKlines'
import { areKlineDataEqual, areRelevantOrdersEqual } from '@/lib/utils/kline-equality'
import { resolveChartOrderLevels } from '@/lib/utils/chart-order-levels'
import type { ChartOrderLevel } from '@/lib/utils/chart-order-levels'
import { resolveChartPriceRange } from '@/lib/utils/chart-price-range'
import type { ChartLevelPlacement } from '@/lib/utils/chart-price-range'
import type { KlineData, Order } from '@/types/binance'

const MOBILE_MEDIA_QUERY = '(max-width: 767px)'
const mobileSubscribers = new Set<() => void>()
let mobileQueryList: MediaQueryList | null = null

function getMobileQueryList(): MediaQueryList | null {
  if (typeof window === 'undefined') {
    return null
  }
  mobileQueryList ??= window.matchMedia(MOBILE_MEDIA_QUERY)
  return mobileQueryList
}

function notifyMobileSubscribers(): void {
  mobileSubscribers.forEach(subscriber => subscriber())
}

function subscribeMobileViewport(subscriber: () => void): () => void {
  const queryList = getMobileQueryList()
  mobileSubscribers.add(subscriber)
  if (mobileSubscribers.size === 1) {
    queryList?.addEventListener('change', notifyMobileSubscribers)
  }

  return () => {
    mobileSubscribers.delete(subscriber)
    if (mobileSubscribers.size === 0) {
      queryList?.removeEventListener('change', notifyMobileSubscribers)
    }
  }
}

function getMobileViewportSnapshot(): boolean {
  return getMobileQueryList()?.matches ?? false
}

function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeMobileViewport, getMobileViewportSnapshot, () => false)
}

interface KlineChartProps {
  /** 当前 K 线所属交易对 */
  symbol: string
  data: KlineData[]
  height?: number
  className?: string
  pricePrecision?: number
  openOrders?: Order[]
  visibleCount?: number
  /** 与图表同源的最新标记价格，用作当前价格线。 */
  markPrice?: number
  /** 当前持仓强平价格。 */
  liquidationPrice?: number
  /** 当前标记价格行情源状态。 */
  feedMode?: 'loading' | 'stream' | 'polling' | 'error'
  /** 最新一笔有效行情的接收时间。 */
  lastUpdate?: number | null
  /** K 线周期。 */
  interval?: KlineInterval
  theme: 'dark' | 'light'
}

type KlineFeedMode = NonNullable<KlineChartProps['feedMode']>

const FEED_STATUS: Record<KlineFeedMode, string> = {
  loading: '连接行情',
  stream: '实时',
  polling: '轮询',
  error: '行情异常',
}

const KLINE_INTERVAL_MILLISECONDS: Record<KlineInterval, number> = {
  '1m': 60 * 1000,
  '3m': 3 * 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
}

const KLINE_INTERVAL_LABELS: Record<KlineInterval, string> = {
  '1m': '1 分钟',
  '3m': '3 分钟',
  '5m': '5 分钟',
  '15m': '15 分钟',
  '30m': '30 分钟',
  '1h': '1 小时',
  '2h': '2 小时',
  '4h': '4 小时',
  '6h': '6 小时',
  '8h': '8 小时',
  '12h': '12 小时',
  '1d': '1 天',
  '1w': '1 周',
  '1M': '1 月',
}

function formatRangeDuration(milliseconds: number): string {
  const totalMinutes = Math.max(1, Math.round(milliseconds / (60 * 1000)))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return hours > 0 ? `${days} 天 ${hours} 小时` : `${days} 天`
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
  }
  return `${minutes} 分钟`
}

function formatLocalTimezone(): string {
  const offsetMinutes = -new Date().getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60
  return `UTC${sign}${hours}${minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''}`
}

const LOCAL_TIMEZONE = formatLocalTimezone()

interface KlineFeedStatusProps {
  feedMode: KlineFeedMode
  lastUpdate?: number | null
}

/** 独立刷新行情新鲜度，避免为了秒数文案重建整张图。 */
function KlineFeedStatus({ feedMode, lastUpdate }: KlineFeedStatusProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (lastUpdate === null || lastUpdate === undefined) {
      return
    }

    const timerId = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(timerId)
  }, [lastUpdate])

  const ageSeconds =
    typeof lastUpdate === 'number' ? Math.max(0, Math.floor((now - lastUpdate) / 1000)) : null
  const freshness =
    ageSeconds === null
      ? null
      : ageSeconds < 3
        ? '刚刚'
        : ageSeconds < 60
          ? `${ageSeconds} 秒前`
          : `${Math.floor(ageSeconds / 60)} 分钟前`
  const freshnessTone = ageSeconds !== null && ageSeconds >= 15 ? 'stale' : 'fresh'

  return (
    <span
      className={`kline-feed-status kline-feed-status--${feedMode} kline-feed-status--${freshnessTone}`}
      aria-label={`行情状态：${FEED_STATUS[feedMode]}${freshness ? `，${freshness}更新` : ''}`}
    >
      <i aria-hidden="true" />
      <span>{FEED_STATUS[feedMode]}</span>
      {freshness && <small>{freshness}</small>}
    </span>
  )
}

function formatChartPrice(value: number, pricePrecision?: number): string {
  if (pricePrecision !== undefined) {
    return value.toFixed(pricePrecision)
  }
  return value < 1 ? value.toFixed(4) : value.toFixed(2)
}

interface PriceGap {
  absolute: number
  percent: number
  relation: '高于' | '低于' | '等于'
}

interface EdgeOrderLevel {
  key: 'buy' | 'sell'
  level: ChartOrderLevel<Order>
  placement: Exclude<ChartLevelPlacement, 'visible'>
}

function calculatePriceGap(markPrice?: number, orderPrice?: number): PriceGap | null {
  if (
    typeof markPrice !== 'number' ||
    !Number.isFinite(markPrice) ||
    markPrice <= 0 ||
    typeof orderPrice !== 'number' ||
    !Number.isFinite(orderPrice) ||
    orderPrice <= 0
  ) {
    return null
  }

  const absolute = Math.abs(orderPrice - markPrice)
  const percent = (absolute / markPrice) * 100
  if (!Number.isFinite(percent)) {
    return null
  }

  return {
    absolute,
    percent,
    relation: orderPrice > markPrice ? '高于' : orderPrice < markPrice ? '低于' : '等于',
  }
}

function formatPriceGapPercent(percent: number): string {
  return percent > 0 && percent < 0.01 ? '<0.01%' : `${percent.toFixed(2)}%`
}

const KLINE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatKlineTime(timestamp: number): string {
  return KLINE_TIME_FORMATTER.format(new Date(timestamp * 1000))
}

/** 将相邻价位标签错开，避免买单、卖单和标记价文字互相遮挡。 */
function resolveAnnotationLabelOffsets(
  prices: readonly number[],
  minPrice: number,
  maxPrice: number,
  chartHeight: number
): number[] {
  const priceRange = maxPrice - minPrice
  if (prices.length < 2 || priceRange <= 0 || chartHeight <= 0) {
    return prices.map(() => 0)
  }

  const plotHeight = Math.max(120, chartHeight - 60)
  const minimumPriceSpacing = (priceRange * 28) / plotHeight
  const sorted = prices
    .map((price, index) => ({ price, index }))
    .sort((left, right) => left.price - right.price)
  const offsets = prices.map(() => 0)
  let clusterStart = 0

  const distributeCluster = (start: number, end: number) => {
    const clusterSize = end - start
    if (clusterSize < 2) {
      return
    }
    for (let position = 0; position < clusterSize; position += 1) {
      const item = sorted[start + position]
      // 价格轴从上到下递减：低价标签向下移，高价标签向上移。
      offsets[item.index] = Math.round(((clusterSize - 1) / 2 - position) * 22)
    }
  }

  for (let index = 1; index <= sorted.length; index += 1) {
    const isClusterBoundary =
      index === sorted.length || sorted[index].price - sorted[index - 1].price > minimumPriceSpacing
    if (isClusterBoundary) {
      distributeCluster(clusterStart, index)
      clusterStart = index
    }
  }

  return offsets
}

function KlineChartComponent({
  symbol,
  data,
  height = 150,
  className = '',
  pricePrecision,
  openOrders = [],
  visibleCount = 32,
  markPrice,
  liquidationPrice,
  feedMode = 'loading',
  lastUpdate,
  interval = '15m',
  theme,
}: KlineChartProps) {
  const isMobile = useIsMobile()
  const displayData = useMemo(() => {
    if (visibleCount && visibleCount > 0 && data.length > visibleCount) {
      return data.slice(-visibleCount)
    }
    return data
  }, [data, visibleCount])
  const latestClose = displayData[displayData.length - 1]?.close
  const displayedMarkPrice =
    typeof markPrice === 'number' && Number.isFinite(markPrice) && markPrice > 0
      ? markPrice
      : typeof latestClose === 'number' && Number.isFinite(latestClose) && latestClose > 0
        ? latestClose
        : undefined
  const activeOrderLevels = useMemo(
    () =>
      resolveChartOrderLevels(
        openOrders.filter(
          order =>
            order.symbol === symbol &&
            (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED')
        )
      ),
    [openOrders, symbol]
  )
  const nextOrderLevels = useMemo(() => {
    if (displayedMarkPrice === undefined) {
      return { buy: undefined, sell: undefined }
    }

    const findNearestLevel = (side: 'BUY' | 'SELL'): ChartOrderLevel<Order> | undefined => {
      let nearestLevel: ChartOrderLevel<Order> | undefined
      let nearestDistance = Number.POSITIVE_INFINITY

      for (const level of activeOrderLevels) {
        if (level.order.side !== side) {
          continue
        }
        const distance = Math.abs(level.price - displayedMarkPrice)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestLevel = level
        }
      }

      return nearestLevel
    }

    return {
      buy: findNearestLevel('BUY'),
      sell: findNearestLevel('SELL'),
    }
  }, [activeOrderLevels, displayedMarkPrice])
  const nextOrderPrices = useMemo(
    () => ({ buy: nextOrderLevels.buy?.price, sell: nextOrderLevels.sell?.price }),
    [nextOrderLevels]
  )
  const priceGaps = {
    buy: calculatePriceGap(displayedMarkPrice, nextOrderPrices.buy),
    sell: calculatePriceGap(displayedMarkPrice, nextOrderPrices.sell),
  }
  const formatGapValue = (gap: PriceGap | null) =>
    gap
      ? {
          absolute: formatChartPrice(gap.absolute, pricePrecision),
          percent: formatPriceGapPercent(gap.percent),
        }
      : null
  const buyGapValue = formatGapValue(priceGaps.buy)
  const sellGapValue = formatGapValue(priceGaps.sell)
  const describeGap = (label: string, gap: PriceGap | null) =>
    gap
      ? `${label}价格${gap.relation}标记价格 ${formatChartPrice(gap.absolute, pricePrecision)}，价差占标记价格 ${formatPriceGapPercent(gap.percent)}`
      : `暂无${label}价差`

  const displayDataRef = useRef(displayData)
  const [pinnedTime, setPinnedTime] = useState<number | null>(null)
  const [hoveredTime, setHoveredTime] = useState<number | null>(null)
  const [hasExploredChart, setHasExploredChart] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    displayDataRef.current = displayData
  }, [displayData])

  const selectKlineByIndex = useCallback((rawIndex: unknown, pinSelection: boolean) => {
    const index = Number(rawIndex)
    if (!Number.isInteger(index) || index < 0) {
      return
    }

    const kline = displayDataRef.current[index]
    if (!kline) {
      return
    }

    if (pinSelection) {
      setPinnedTime(previous => (previous === kline.time ? previous : kline.time))
      setHoveredTime(null)
      setHasExploredChart(true)
      return
    }

    setHoveredTime(previous => (previous === kline.time ? previous : kline.time))
  }, [])

  const resolvedPinnedTime =
    pinnedTime !== null && displayData.some(kline => kline.time === pinnedTime) ? pinnedTime : null
  const resolvedHoveredTime =
    hoveredTime !== null && displayData.some(kline => kline.time === hoveredTime)
      ? hoveredTime
      : null
  const activeTime = resolvedPinnedTime ?? resolvedHoveredTime
  const activeKline = useMemo(
    () =>
      displayData.find(kline => kline.time === activeTime) ?? displayData[displayData.length - 1],
    [activeTime, displayData]
  )

  const activeChangePercent = activeKline
    ? activeKline.open > 0
      ? ((activeKline.close - activeKline.open) / activeKline.open) * 100
      : 0
    : 0
  const activeAmplitude = activeKline
    ? activeKline.low > 0
      ? ((activeKline.high - activeKline.low) / activeKline.low) * 100
      : 0
    : 0
  const chartHeight = isMobile ? Math.min(height, 300) : height

  const movePinnedSelection = useCallback(
    (direction: -1 | 1) => {
      if (displayData.length === 0) {
        return
      }

      const fallbackIndex = displayData.length - 1
      const currentIndex =
        resolvedPinnedTime === null
          ? fallbackIndex
          : displayData.findIndex(kline => kline.time === resolvedPinnedTime)
      const nextIndex = Math.min(
        fallbackIndex,
        Math.max(0, (currentIndex < 0 ? fallbackIndex : currentIndex) + direction)
      )
      setPinnedTime(displayData[nextIndex].time)
      setHoveredTime(null)
      setHasExploredChart(true)
    },
    [displayData, resolvedPinnedTime]
  )

  const handleChartKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (displayData.length === 0) {
        return
      }

      if (event.key === 'Escape' || event.key === 'End') {
        event.preventDefault()
        setPinnedTime(null)
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        setPinnedTime(displayData[0].time)
        setHoveredTime(null)
        setHasExploredChart(true)
        return
      }

      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return
      }

      event.preventDefault()
      const direction = event.key === 'ArrowLeft' ? -1 : 1
      movePinnedSelection(direction)
    },
    [displayData, movePinnedSelection]
  )

  const handleChartTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0]
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }, [])

  const handleChartTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current
      const touch = event.changedTouches[0]
      touchStartRef.current = null
      if (!start || !touch) {
        return
      }

      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y
      if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return
      }

      movePinnedSelection(deltaX < 0 ? -1 : 1)
    },
    [movePinnedSelection]
  )

  const chartPriceRange = useMemo(() => {
    const klinePrices = displayData
      .flatMap(kline => [kline.open, kline.close, kline.low, kline.high])
      .filter(price => Number.isFinite(price) && price > 0)

    if (displayedMarkPrice !== undefined) {
      klinePrices.push(displayedMarkPrice)
    }

    return resolveChartPriceRange(klinePrices, [nextOrderPrices.buy, nextOrderPrices.sell])
  }, [displayData, displayedMarkPrice, nextOrderPrices])
  const edgeOrderLevels = useMemo(
    () =>
      [
        {
          key: 'buy' as const,
          level: nextOrderLevels.buy,
          placement: chartPriceRange.levelPlacements[0],
        },
        {
          key: 'sell' as const,
          level: nextOrderLevels.sell,
          placement: chartPriceRange.levelPlacements[1],
        },
      ].filter(
        (item): item is EdgeOrderLevel =>
          item.level !== undefined && item.placement !== null && item.placement !== 'visible'
      ),
    [chartPriceRange.levelPlacements, nextOrderLevels]
  )
  const intervalLabel = KLINE_INTERVAL_LABELS[interval]
  const loadedCount = displayData.length
  const rangeLabel = formatRangeDuration(KLINE_INTERVAL_MILLISECONDS[interval] * loadedCount)
  const loadedCountLabel =
    loadedCount < visibleCount ? `已加载 ${loadedCount}/${visibleCount} 根` : `${loadedCount} 根`
  const chartMeta =
    loadedCount > 0
      ? `近 ${rangeLabel} · ${intervalLabel}/根 · ${loadedCountLabel} · ${LOCAL_TIMEZONE}`
      : `${intervalLabel}/根 · 正在加载 · ${LOCAL_TIMEZONE}`
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const options: any = useMemo(() => {
    const chartTheme =
      theme === 'light'
        ? {
            axis: '#6b7e74',
            grid: 'rgba(51, 87, 74, 0.09)',
            axisBorder: 'rgba(51, 87, 74, 0.22)',
            tooltipBackground: 'rgba(255, 255, 252, 0.98)',
            tooltipText: '#16342c',
            tooltipMuted: '#697d73',
            tooltipDivider: 'rgba(51, 87, 74, 0.16)',
            tooltipShadow: 'rgba(41, 68, 55, 0.16)',
            positive: '#159b63',
            negative: '#d95555',
            warning: '#ad7120',
            markLine: 'rgba(173, 113, 32, 0.88)',
            buyLine: 'rgba(21, 155, 99, 0.55)',
            sellLine: 'rgba(217, 85, 85, 0.55)',
            liquidationLine: 'rgba(201, 70, 70, 0.88)',
          }
        : {
            axis: '#94a3b8',
            grid: 'rgba(148, 163, 184, 0.07)',
            axisBorder: 'rgba(148, 163, 184, 0.2)',
            tooltipBackground: 'rgba(8, 26, 26, 0.97)',
            tooltipText: '#f2f7f1',
            tooltipMuted: '#a8b9b1',
            tooltipDivider: 'rgba(202, 221, 210, 0.12)',
            tooltipShadow: 'rgba(0, 0, 0, 0.32)',
            positive: '#42d392',
            negative: '#ff7676',
            warning: '#f3bd62',
            markLine: 'rgba(243, 189, 98, 0.9)',
            buyLine: 'rgba(66, 211, 146, 0.62)',
            sellLine: 'rgba(255, 118, 118, 0.62)',
            liquidationLine: 'rgba(255, 118, 118, 0.9)',
          }

    if (displayData.length === 0) {
      return {
        chart: {
          height: 300,
          background: 'transparent',
        },
        title: {
          text: '加载中...',
          align: 'center',
          style: {
            color: chartTheme.axis,
            fontSize: '12px',
          },
        },
      }
    }

    const formatPrice = (value: number) => formatChartPrice(value, pricePrecision)
    const { minPrice, maxPrice } = chartPriceRange

    // 入场价和盈亏平衡价已在持仓信息区展示；图内仅保留进入可视区的强平风险线。
    const riskLevels = [
      {
        price: liquidationPrice,
        label: '强平',
        color: chartTheme.liquidationLine,
        strokeDashArray: 10,
      },
    ].filter(
      (
        level
      ): level is {
        price: number
        label: string
        color: string
        strokeDashArray: number
      } =>
        level.price !== undefined &&
        Number.isFinite(level.price) &&
        level.price > 0 &&
        level.price >= minPrice &&
        level.price <= maxPrice
    )

    const marketLevels = [
      {
        price: nextOrderLevels.buy?.price,
        label: nextOrderLevels.buy?.label,
        placement: chartPriceRange.levelPlacements[0],
        color: chartTheme.buyLine,
        strokeDashArray: 6,
      },
      {
        price: nextOrderLevels.sell?.price,
        label: nextOrderLevels.sell?.label,
        placement: chartPriceRange.levelPlacements[1],
        color: chartTheme.sellLine,
        strokeDashArray: 2,
      },
      {
        price: displayedMarkPrice,
        label: '标记价',
        placement: 'visible' as const,
        color: chartTheme.markLine,
        strokeDashArray: 0,
      },
    ].filter(
      (
        level
      ): level is {
        price: number
        label: string
        placement: 'visible'
        color: string
        strokeDashArray: number
      } =>
        level.price !== undefined &&
        Number.isFinite(level.price) &&
        level.price > 0 &&
        level.label !== undefined &&
        level.placement === 'visible'
    )
    const annotationLevels = [...marketLevels, ...riskLevels]
    const labelOffsets = resolveAnnotationLabelOffsets(
      annotationLevels.map(level => level.price),
      minPrice,
      maxPrice,
      chartHeight
    )

    return {
      chart: {
        height: chartHeight,
        type: 'candlestick',
        background: 'transparent',
        animations: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
        selection: {
          enabled: false,
        },
        events: {
          dataPointSelection: (_event: unknown, _chart: unknown, config: any) => {
            selectKlineByIndex(config?.dataPointIndex, true)
          },
          click: (_event: unknown, _chart: unknown, config: any) => {
            if (isMobile) {
              selectKlineByIndex(config?.dataPointIndex, true)
            }
          },
          dataPointMouseEnter: (_event: unknown, _chart: unknown, config: any) => {
            if (!isMobile) {
              selectKlineByIndex(config?.dataPointIndex, false)
            }
          },
          mouseLeave: () => {
            if (!isMobile) {
              setHoveredTime(null)
            }
          },
        },
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
      plotOptions: {
        candlestick: {
          colors: {
            upward: chartTheme.positive,
            downward: chartTheme.negative,
          },
          wick: {
            useFillColor: true,
          },
        },
      },
      series: [
        {
          data: displayData.map(d => ({
            x: d.time * 1000,
            y: [d.open, d.high, d.low, d.close],
          })),
        },
      ],
      xaxis: {
        type: 'datetime',
        labels: {
          show: true,
          style: {
            colors: chartTheme.axis,
            fontSize: isMobile ? '10px' : '10px',
            fontFamily: 'ui-monospace, monospace',
          },
          formatter: (value: string) => {
            const date = new Date(value)
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
          },
          // 移动端减少标签数量
          hideOverlappingLabels: true,
          rotate: 0,
        },
        axisBorder: {
          show: true,
          color: chartTheme.axisBorder,
          height: 1,
        },
        axisTicks: {
          show: false,
        },
        tooltip: {
          enabled: false,
        },
        crosshairs: {
          show: true,
          width: 1,
          position: 'back',
          opacity: 0.9,
          stroke: {
            color: chartTheme.axis,
            width: 1,
            dashArray: 3,
          },
        },
      },
      yaxis: {
        min: minPrice,
        max: maxPrice,
        tickAmount: isMobile ? 5 : 6,
        floating: isMobile, // 移动端浮动Y轴标签，节省空间
        labels: {
          show: true,
          style: {
            colors: chartTheme.axis,
            fontSize: isMobile ? '10px' : '10px',
            fontFamily: 'ui-monospace, monospace',
          },
          formatter: (value: number) => formatPrice(value),
          align: isMobile ? 'left' : 'right',
          offsetX: isMobile ? 0 : -5,
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        crosshairs: {
          show: true,
          position: 'back',
          stroke: {
            color: chartTheme.axis,
            width: 1,
            dashArray: 3,
          },
        },
      },
      grid: {
        borderColor: chartTheme.grid,
        strokeDashArray: 0,
        xaxis: {
          lines: {
            show: false,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
        padding: {
          left: 0,
          right: 0,
          bottom: 0,
          top: 0,
        },
      },
      tooltip: {
        enabled: !isMobile,
        shared: true,
        intersect: false,
        x: {
          format: 'MM/dd HH:mm',
        },
        theme,
        style: {
          fontSize: '12px',
          fontFamily: "'Avenir Next', 'PingFang SC', sans-serif",
        },
        // 移动端固定 tooltip 位置，避免遮挡手指或K线
        fixed: {
          enabled: false,
          position: 'topLeft',
          offsetX: 0,
          offsetY: 0,
        },
        custom: ({ dataPointIndex }: any) => {
          const kline = displayData[dataPointIndex]
          if (!kline) return ''

          const changePercent = kline.open > 0 ? ((kline.close - kline.open) / kline.open) * 100 : 0
          const changeColor = changePercent >= 0 ? chartTheme.positive : chartTheme.negative
          const changeBgColor =
            changePercent >= 0 ? 'rgba(66, 211, 146, 0.12)' : 'rgba(255, 118, 118, 0.12)'

          const amplitude = kline.low > 0 ? ((kline.high - kline.low) / kline.low) * 100 : 0

          const date = new Date(kline.time * 1000)

          // 移动端样式优化
          const containerStyle = isMobile
            ? `padding: 8px; min-width: 140px; background: ${chartTheme.tooltipBackground}; border: 1px solid ${changeColor}; border-radius: 6px; box-shadow: 0 8px 22px ${chartTheme.tooltipShadow}; backdrop-filter: blur(10px);`
            : `padding: 12px; min-width: 220px; background: ${chartTheme.tooltipBackground}; border: 1px solid ${changeColor}; border-radius: 8px; box-shadow: 0 12px 28px ${chartTheme.tooltipShadow}; backdrop-filter: blur(10px);`

          const headerStyle = isMobile
            ? `display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid ${chartTheme.tooltipDivider};`
            : `display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid ${chartTheme.tooltipDivider};`

          const fontSizeDate = isMobile ? '10px' : '11px'
          const fontSizeLabel = isMobile ? '10px' : '12px'
          const fontSizeValue = isMobile ? '11px' : '13px' // 稍微减小字体
          const gridGap = isMobile ? '8px' : '12px'

          return `
            <div style="${containerStyle}">
              <div style="${headerStyle}">
                <div>
                  <div style="font-size: ${fontSizeDate}; color: ${chartTheme.tooltipMuted}; font-weight: 500; margin-bottom: 2px;">
                    ${date.toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  ${!isMobile ? `<div style="font-size: 10px; color: ${chartTheme.axis};">${intervalLabel}标记价格 K 线</div>` : ''}
                </div>
                <div style="text-align: right;">
                  <div style="display: inline-flex; align-items: center; gap: 4px; padding: ${isMobile ? '2px 6px' : '4px 8px'}; border-radius: 6px; background: ${changeBgColor};">
                    <span style="font-size: ${isMobile ? '10px' : '12px'}; font-weight: 700; color: ${changeColor};">
                      ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: ${gridGap}; font-size: ${fontSizeValue};">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: ${chartTheme.axis}; font-size: ${fontSizeLabel}; width: ${isMobile ? '12px' : '24px'};">开</span>
                  <span style="font-weight: 600; color: ${chartTheme.tooltipText}; font-family: ui-monospace, monospace;">
                    ${formatPrice(kline.open)}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: ${chartTheme.axis}; font-size: ${fontSizeLabel}; width: ${isMobile ? '12px' : '24px'};">高</span>
                  <span style="font-weight: 600; color: ${chartTheme.positive}; font-family: ui-monospace, monospace;">
                    ${formatPrice(kline.high)}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: ${chartTheme.axis}; font-size: ${fontSizeLabel}; width: ${isMobile ? '12px' : '24px'};">收</span>
                  <span style="font-weight: 600; color: ${kline.close >= kline.open ? chartTheme.positive : chartTheme.negative}; font-family: ui-monospace, monospace;">
                    ${formatPrice(kline.close)}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: ${chartTheme.axis}; font-size: ${fontSizeLabel}; width: ${isMobile ? '12px' : '24px'};">低</span>
                  <span style="font-weight: 600; color: ${chartTheme.negative}; font-family: ui-monospace, monospace;">
                    ${formatPrice(kline.low)}
                  </span>
                </div>
              </div>

              <div style="margin-top: ${isMobile ? '8px' : '12px'}; padding-top: ${isMobile ? '4px' : '8px'}; border-top: 1px solid ${chartTheme.tooltipDivider}; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${chartTheme.tooltipMuted}; font-size: ${fontSizeLabel}; font-weight: 500;">振幅</span>
                <span style="font-size: ${isMobile ? '12px' : '14px'}; font-weight: 700; color: ${chartTheme.warning}; font-family: ui-monospace, monospace;">
                  ${amplitude.toFixed(2)}%
                </span>
              </div>
            </div>
          `
        },
      },
      annotations: {
        yaxis: annotationLevels.map((level, index) => ({
          y: level.price,
          borderColor: level.color,
          borderWidth: 1.5,
          strokeDashArray: level.strokeDashArray,
          label: {
            text: `${level.label} ${formatPrice(level.price)}`,
            position: 'right',
            offsetX: isMobile ? -6 : -8,
            offsetY: labelOffsets[index],
            borderColor: level.color,
            borderWidth: 1,
            borderRadius: 4,
            style: {
              background: chartTheme.tooltipBackground,
              color: level.color,
              fontFamily: 'var(--font-app-mono)',
              fontSize: '10px',
              fontWeight: 700,
              padding: {
                left: 5,
                right: 5,
                top: 2,
                bottom: 2,
              },
            },
          },
        })),
      },
    }
  }, [
    chartHeight,
    chartPriceRange,
    displayData,
    displayedMarkPrice,
    intervalLabel,
    isMobile,
    liquidationPrice,
    nextOrderLevels,
    pricePrecision,
    selectKlineByIndex,
    theme,
  ])
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const activeIsPositive = activeChangePercent >= 0
  const readoutMode =
    resolvedPinnedTime !== null ? '已选' : resolvedHoveredTime !== null ? '查看' : '最新'
  const chartAriaLabel = activeKline
    ? `${symbol} ${intervalLabel}标记价格 K 线，${formatKlineTime(activeKline.time)}，开盘 ${formatChartPrice(activeKline.open, pricePrecision)}，最高 ${formatChartPrice(activeKline.high, pricePrecision)}，最低 ${formatChartPrice(activeKline.low, pricePrecision)}，收盘 ${formatChartPrice(activeKline.close, pricePrecision)}`
    : `${symbol} ${intervalLabel}标记价格 K 线正在加载`
  const buyOrderLabel = nextOrderLevels.buy?.label ?? '买入'
  const sellOrderLabel = nextOrderLevels.sell?.label ?? '卖出'

  return (
    <section className={`kline-chart ${className}`} aria-label={`${symbol} K 线图表面板`}>
      <header className="kline-chart__header">
        <div className="kline-chart__identity">
          <span className="kline-chart__glyph" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <div className="kline-chart__title">标记价 K 线</div>
            <div className="kline-chart__meta">{chartMeta}</div>
          </div>
        </div>
        <KlineFeedStatus feedMode={feedMode} lastUpdate={lastUpdate} />
      </header>

      <div className={`kline-readout ${resolvedPinnedTime !== null ? 'is-expanded' : ''}`}>
        <div className="kline-readout__context">
          <div>
            <span
              className={`kline-readout__mode ${resolvedPinnedTime !== null ? 'is-pinned' : ''}`}
            >
              {readoutMode}
            </span>
            <time
              dateTime={activeKline ? new Date(activeKline.time * 1000).toISOString() : undefined}
            >
              {activeKline ? formatKlineTime(activeKline.time) : '--'}
            </time>
          </div>
          {resolvedPinnedTime !== null && (
            <button
              type="button"
              className="kline-readout__reset"
              onClick={() => setPinnedTime(null)}
            >
              返回实时
            </button>
          )}
        </div>

        <dl className="kline-readout__values">
          {[
            { key: 'open', label: '开', value: activeKline?.open },
            { key: 'high', label: '高', value: activeKline?.high },
            { key: 'low', label: '低', value: activeKline?.low },
            { key: 'close', label: '收', value: activeKline?.close },
          ].map(metric => (
            <div key={metric.key} className={`kline-readout__value--${metric.key}`}>
              <dt>{metric.label}</dt>
              <dd>
                {typeof metric.value === 'number'
                  ? formatChartPrice(metric.value, pricePrecision)
                  : '--'}
              </dd>
            </div>
          ))}
          <div className="kline-readout__value--change">
            <dt>涨跌</dt>
            <dd className={activeIsPositive ? 'is-positive' : 'is-negative'}>
              {activeKline
                ? `${activeIsPositive ? '+' : ''}${activeChangePercent.toFixed(2)}%`
                : '--'}
            </dd>
          </div>
          <div className="kline-readout__value--amplitude">
            <dt>振幅</dt>
            <dd>{activeKline ? `${activeAmplitude.toFixed(2)}%` : '--'}</dd>
          </div>
        </dl>
      </div>

      <dl className="kline-levels" aria-label="当前关键交易价位">
        {[
          {
            key: 'buy',
            label: `最近${buyOrderLabel}`,
            value: nextOrderPrices.buy,
          },
          {
            key: 'mark',
            label: '标记价格',
            value: displayedMarkPrice,
          },
          {
            key: 'sell',
            label: `最近${sellOrderLabel}`,
            value: nextOrderPrices.sell,
          },
        ].map(level => {
          const formattedValue =
            typeof level.value === 'number' ? formatChartPrice(level.value, pricePrecision) : '--'

          return (
            <div key={level.key} className={`kline-levels__item kline-levels__item--${level.key}`}>
              <dt>
                <i aria-hidden="true" />
                {level.label}
              </dt>
              <dd title={formattedValue}>{formattedValue}</dd>
            </div>
          )
        })}
      </dl>

      <div
        className="kline-gaps"
        role="group"
        aria-label={`${describeGap(buyOrderLabel, priceGaps.buy)}；${describeGap(sellOrderLabel, priceGaps.sell)}`}
      >
        <span className="kline-gaps__item kline-gaps__item--buy" aria-hidden="true">
          <i className="kline-gaps__arrow">←</i>
          <span className="kline-gaps__text">
            {buyGapValue ? (
              <>
                距{buyOrderLabel}{' '}
                <span className="kline-gaps__absolute">{buyGapValue.absolute}</span>
                <span className="kline-gaps__separator"> · </span>
                <span>{buyGapValue.percent}</span>
              </>
            ) : displayedMarkPrice === undefined ? (
              '暂无价差'
            ) : (
              '无买单'
            )}
          </span>
        </span>
        <span className="kline-gaps__item kline-gaps__item--sell" aria-hidden="true">
          <span className="kline-gaps__text">
            {sellGapValue ? (
              <>
                距{sellOrderLabel}{' '}
                <span className="kline-gaps__absolute">{sellGapValue.absolute}</span>
                <span className="kline-gaps__separator"> · </span>
                <span>{sellGapValue.percent}</span>
              </>
            ) : displayedMarkPrice === undefined ? (
              '暂无价差'
            ) : (
              '无卖单'
            )}
          </span>
          <i className="kline-gaps__arrow">→</i>
        </span>
      </div>

      <div
        className="kline-chart__plot"
        style={{ '--kline-chart-height': `${height}px` } as CSSProperties}
        role="group"
        tabIndex={0}
        aria-label={`${chartAriaLabel}。使用左右方向键查看历史 K 线，按 Home 查看最早一根，按 End 或 Escape 返回最新。`}
        onKeyDown={handleChartKeyDown}
        onTouchStart={handleChartTouchStart}
        onTouchEnd={handleChartTouchEnd}
      >
        {displayData.length === 0 ? (
          <div
            className="chart-placeholder flex h-full items-center justify-center"
            aria-busy="true"
          >
            <span className="theme-text-muted text-xs">正在获取标记价格 K 线…</span>
          </div>
        ) : (
          <>
            {!hasExploredChart && isMobile && edgeOrderLevels.length === 0 && (
              <span className="kline-chart__gesture-hint">点按查看 · 左右滑动切换</span>
            )}
            {(['above', 'below'] as const).map(placement => {
              const levels = edgeOrderLevels.filter(level => level.placement === placement)
              if (levels.length === 0) {
                return null
              }

              return (
                <div
                  key={placement}
                  className={`kline-edge-levels kline-edge-levels--${placement}`}
                >
                  {levels.map(({ key, level }) => (
                    <span
                      key={key}
                      className={`kline-edge-level kline-edge-level--${key}`}
                      aria-label={`${level.label} ${formatChartPrice(level.price, pricePrecision)}，位于当前图表${placement === 'above' ? '上方' : '下方'}`}
                    >
                      <i aria-hidden="true">{placement === 'above' ? '↑' : '↓'}</i>
                      <span>{level.label}</span>
                      <strong>{formatChartPrice(level.price, pricePrecision)}</strong>
                    </span>
                  ))}
                </div>
              )
            })}
            <Chart
              key={symbol}
              options={options}
              series={options.series}
              type="candlestick"
              height={chartHeight}
            />
          </>
        )}
      </div>
    </section>
  )
}

export const KlineChart = memo(KlineChartComponent, (previous, next) => {
  return (
    previous.symbol === next.symbol &&
    areKlineDataEqual(previous.data, next.data) &&
    previous.height === next.height &&
    previous.className === next.className &&
    previous.pricePrecision === next.pricePrecision &&
    previous.visibleCount === next.visibleCount &&
    previous.markPrice === next.markPrice &&
    previous.liquidationPrice === next.liquidationPrice &&
    previous.feedMode === next.feedMode &&
    previous.lastUpdate === next.lastUpdate &&
    previous.interval === next.interval &&
    previous.theme === next.theme &&
    areRelevantOrdersEqual(previous.openOrders || [], next.openOrders || [], previous.symbol)
  )
})
