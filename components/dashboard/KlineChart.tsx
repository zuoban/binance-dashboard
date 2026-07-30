'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { KlineData, Order } from '@/types/binance'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
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
  theme: 'dark' | 'light'
}

function KlineChartComponent({
  symbol,
  data,
  height = 150,
  className = '',
  pricePrecision,
  openOrders = [],
  visibleCount = 30,
  markPrice,
  theme,
}: KlineChartProps) {
  const isMobile = useIsMobile()
  const displayData = useMemo(() => {
    if (visibleCount && visibleCount > 0 && data.length > visibleCount) {
      return data.slice(-visibleCount)
    }
    return data
  }, [data, visibleCount])

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [shouldRenderChart, setShouldRenderChart] = useState(
    () => typeof window !== 'undefined' && !('IntersectionObserver' in window)
  )

  useEffect(() => {
    const chartContainer = chartContainerRef.current

    if (!chartContainer) {
      return
    }

    if (!('IntersectionObserver' in window)) {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setShouldRenderChart(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' }
    )

    observer.observe(chartContainer)

    return () => observer.disconnect()
  }, [])
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const options: any = useMemo(() => {
    const chartTheme =
      theme === 'light'
        ? {
            axis: '#6b7e74',
            grid: 'rgba(51, 87, 74, 0.14)',
            axisBorder: 'rgba(51, 87, 74, 0.22)',
            tooltipBackground: 'rgba(255, 255, 252, 0.98)',
            tooltipText: '#16342c',
            tooltipMuted: '#697d73',
            tooltipDivider: 'rgba(51, 87, 74, 0.16)',
            tooltipShadow: 'rgba(41, 68, 55, 0.16)',
            annotationPositive: '#e9f8ef',
            annotationNegative: '#fff0f0',
            annotationPositiveText: '#0b6e43',
            annotationNegativeText: '#a83a3a',
            annotationMark: '#fff1d4',
            annotationMarkText: '#84530d',
            positive: '#159b63',
            negative: '#d95555',
            warning: '#ad7120',
          }
        : {
            axis: '#94a3b8',
            grid: 'rgba(148, 163, 184, 0.1)',
            axisBorder: 'rgba(148, 163, 184, 0.2)',
            tooltipBackground: 'rgba(8, 26, 26, 0.97)',
            tooltipText: '#f2f7f1',
            tooltipMuted: '#a8b9b1',
            tooltipDivider: 'rgba(202, 221, 210, 0.12)',
            tooltipShadow: 'rgba(0, 0, 0, 0.32)',
            annotationPositive: '#167249',
            annotationNegative: '#952f2f',
            annotationPositiveText: '#dff9eb',
            annotationNegativeText: '#ffe2e2',
            annotationMark: '#4b3516',
            annotationMarkText: '#ffe0a3',
            positive: '#42d392',
            negative: '#ff7676',
            warning: '#f3bd62',
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

    const hasMarkPrice = markPrice !== undefined && Number.isFinite(markPrice) && markPrice > 0
    const allPrices = displayData.flatMap(d => [d.open ?? 0, d.close ?? 0, d.low ?? 0, d.high ?? 0])
    if (hasMarkPrice) {
      allPrices.push(markPrice)
    }
    const klineMinPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0
    const klineMaxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0

    const priceChange =
      displayData.length >= 2 ? displayData[displayData.length - 1].close - displayData[0].open : 0
    const isPositive = priceChange >= 0

    const formatPrice = (value: number) => {
      if (pricePrecision !== undefined) {
        return value.toFixed(pricePrecision)
      }
      return value < 1 ? value.toFixed(4) : value.toFixed(2)
    }

    const lastKline = displayData[displayData.length - 1]
    const lastClose = lastKline?.close ?? 0
    const referencePrice = hasMarkPrice ? markPrice : lastClose
    const referencePriceFormatted = formatPrice(referencePrice)
    const referencePriceColor = hasMarkPrice
      ? chartTheme.warning
      : isPositive
        ? chartTheme.positive
        : chartTheme.negative
    const referencePriceBackground = hasMarkPrice
      ? chartTheme.annotationMark
      : isPositive
        ? chartTheme.annotationPositive
        : chartTheme.annotationNegative
    const referencePriceTextColor = hasMarkPrice
      ? chartTheme.annotationMarkText
      : isPositive
        ? chartTheme.annotationPositiveText
        : chartTheme.annotationNegativeText

    const activeOrders = openOrders.filter(
      order =>
        order.symbol === symbol && (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED')
    )

    const ordersWithDistance = activeOrders.map(order => ({
      order,
      price: parseFloat(order.price),
      distance: Math.abs(parseFloat(order.price) - referencePrice),
    }))

    const ordersAbove = ordersWithDistance
      .filter(o => o.price > referencePrice)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)

    const ordersBelow = ordersWithDistance
      .filter(o => o.price < referencePrice)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)

    const nearbyOrders = [...ordersAbove, ...ordersBelow]
    const nearbyOrderPrices = nearbyOrders.map(o => o.price)

    let minPrice = klineMinPrice
    let maxPrice = klineMaxPrice

    if (nearbyOrderPrices.length > 0) {
      minPrice = Math.min(klineMinPrice, ...nearbyOrderPrices)
      maxPrice = Math.max(klineMaxPrice, ...nearbyOrderPrices)
    }

    const priceRange = maxPrice - minPrice
    const padding = Math.max(priceRange * 0.05, Math.max(Math.abs(maxPrice) * 0.0005, 0.01))

    const dates = displayData.map(d => {
      const date = new Date(d.time * 1000)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    })

    return {
      chart: {
        height: height,
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
        categories: dates,
        labels: {
          show: true,
          style: {
            colors: chartTheme.axis,
            fontSize: isMobile ? '9px' : '10px',
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
        min: minPrice - padding,
        max: maxPrice + padding,
        floating: isMobile, // 移动端浮动Y轴标签，节省空间
        labels: {
          show: true,
          style: {
            colors: chartTheme.axis,
            fontSize: isMobile ? '9px' : '10px',
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
        strokeDashArray: 4,
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
        enabled: true,
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
          enabled: isMobile,
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
                  ${!isMobile ? `<div style="font-size: 10px; color: ${chartTheme.axis};">15分钟标记价格 K 线</div>` : ''}
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
        yaxis: [
          {
            y: referencePrice,
            borderColor: referencePriceColor,
            strokeDashArray: 4,
            label: {
              borderColor: referencePriceColor,
              style: {
                color: referencePriceTextColor,
                background: referencePriceBackground,
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'ui-monospace, monospace',
              },
              text: hasMarkPrice ? `标记 ${referencePriceFormatted}` : referencePriceFormatted,
              position: 'center',
              offsetX: 0,
            },
          },
          ...nearbyOrders.map(({ order, price }) => ({
            y: price,
            borderColor: order.side === 'BUY' ? chartTheme.positive : chartTheme.negative,
            strokeDashArray: 2,
            offsetY: 0,
          })),
        ],
      },
    }
  }, [displayData, symbol, height, pricePrecision, openOrders, isMobile, markPrice, theme])
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (displayData.length === 0) {
    return (
      <div
        className={`chart-placeholder flex items-center justify-center rounded-lg ${className}`}
        style={{ height }}
      >
        <span className="theme-text-muted text-xs">加载中...</span>
      </div>
    )
  }

  return (
    <div ref={chartContainerRef} className={className} style={{ height }}>
      {shouldRenderChart ? (
        <Chart
          key={`${displayData[0]?.time}-${displayData[displayData.length - 1]?.time}`}
          options={options}
          series={options.series}
          type="candlestick"
          height={height}
        />
      ) : (
        <div
          className="chart-placeholder flex h-full items-center justify-center rounded-lg"
          aria-busy="true"
        >
          <span className="theme-text-muted text-xs">图表加载中...</span>
        </div>
      )}
    </div>
  )
}

/**
 * SSE 消息反序列化后会生成新的数组引用。逐项比较可避免未变化的 K 线反复触发图表更新。
 */
export function areKlineDataEqual(previousData: KlineData[], nextData: KlineData[]): boolean {
  if (previousData === nextData) {
    return true
  }

  if (previousData.length !== nextData.length) {
    return false
  }

  return previousData.every((previousKline, index) => {
    const nextKline = nextData[index]
    return (
      previousKline.time === nextKline?.time &&
      previousKline.open === nextKline.open &&
      previousKline.high === nextKline.high &&
      previousKline.low === nextKline.low &&
      previousKline.close === nextKline.close &&
      previousKline.volume === nextKline.volume
    )
  })
}

/**
 * 比较会影响 K 线标注的当前交易对挂单，避免其他看板数据刷新时重复更新 ApexCharts。
 */
export function areRelevantOrdersEqual(
  previousOrders: Order[],
  nextOrders: Order[],
  symbol: string
): boolean {
  const previous = previousOrders.filter(order => order.symbol === symbol)
  const next = nextOrders.filter(order => order.symbol === symbol)

  if (previous.length !== next.length) {
    return false
  }

  return previous.every((order, index) => {
    const nextOrder = next[index]
    return (
      order.orderId === nextOrder?.orderId &&
      order.price === nextOrder.price &&
      order.status === nextOrder.status &&
      order.side === nextOrder.side
    )
  })
}

export const KlineChart = memo(KlineChartComponent, (previous, next) => {
  return (
    previous.symbol === next.symbol &&
    areKlineDataEqual(previous.data, next.data) &&
    previous.height === next.height &&
    previous.className === next.className &&
    previous.pricePrecision === next.pricePrecision &&
    previous.markPrice === next.markPrice &&
    areRelevantOrdersEqual(previous.openOrders || [], next.openOrders || [], previous.symbol)
  )
})
