'use client'

import { useMemo, useState, useEffect } from 'react'
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
  data: KlineData[]
  height?: number
  className?: string
  pricePrecision?: number
  openOrders?: Order[]
}

export function KlineChart({
  data,
  height = 150,
  className = '',
  pricePrecision,
  openOrders = [],
}: KlineChartProps) {
  const isMobile = useIsMobile()
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const options: any = useMemo(() => {
    if (data.length === 0) {
      return {
        chart: {
          height: 300,
          background: 'transparent',
        },
        title: {
          text: '加载中...',
          align: 'center',
          style: {
            color: '#94a3b8',
            fontSize: '12px',
          },
        },
      }
    }

    const allPrices = data.flatMap(d => [d.open, d.close, d.low, d.high])
    const klineMinPrice = Math.min(...allPrices)
    const klineMaxPrice = Math.max(...allPrices)

    const priceChange = data.length >= 2 ? data[data.length - 1].close - data[0].open : 0
    const isPositive = priceChange >= 0

    const formatPrice = (value: number) => {
      if (pricePrecision !== undefined) {
        return value.toFixed(pricePrecision)
      }
      return value < 1 ? value.toFixed(4) : value.toFixed(2)
    }

    const lastClose = data[data.length - 1].close
    const lastCloseFormatted = lastClose.toFixed(6)

    const activeOrders = openOrders.filter(
      order => order.status === 'NEW' || order.status === 'PARTIALLY_FILLED'
    )

    const ordersWithDistance = activeOrders.map(order => ({
      order,
      price: parseFloat(order.price),
      distance: Math.abs(parseFloat(order.price) - lastClose),
    }))

    const ordersAbove = ordersWithDistance
      .filter(o => o.price > lastClose)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)

    const ordersBelow = ordersWithDistance
      .filter(o => o.price < lastClose)
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
    const padding = priceRange * 0.03

    const dates = data.map(d => {
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
      },
      plotOptions: {
        candlestick: {
          colors: {
            upward: '#10b981',
            downward: '#ef4444',
          },
          wick: {
            useFillColor: true,
          },
        },
      },
      series: [
        {
          data: data.map(d => ({
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
            colors: '#94a3b8',
            fontSize: '10px',
            fontFamily: 'ui-monospace, monospace',
          },
          formatter: (value: string) => {
            const date = new Date(value)
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
          },
        },
        axisBorder: {
          show: true,
          color: 'rgba(148, 163, 184, 0.2)',
          height: 1,
        },
        axisTicks: {
          show: false,
        },
        tooltip: {
          enabled: false,
        },
      },
      yaxis: {
        min: minPrice - padding,
        max: maxPrice + padding,
        labels: {
          show: true,
          style: {
            colors: '#94a3b8',
            fontSize: '10px',
            fontFamily: 'ui-monospace, monospace',
          },
          formatter: (value: number) => formatPrice(value),
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      grid: {
        borderColor: 'rgba(148, 163, 184, 0.1)',
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
          left: 10,
          right: 5,
          bottom: 10,
          top: 24,
        },
      },
      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        x: {
          format: 'MM/dd HH:mm',
        },
        theme: 'light',
        style: {
          fontSize: '12px',
          fontFamily: 'ui-sans-serif, system-ui',
        },
        custom: ({ dataPointIndex }: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any

          const kline = data[dataPointIndex]
          if (!kline) return ''

          const changePercent = kline.open > 0 ? ((kline.close - kline.open) / kline.open) * 100 : 0
          const changeColor = changePercent >= 0 ? '#10b981' : '#ef4444'
          const changeBgColor =
            changePercent >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'

          const amplitude = kline.low > 0 ? ((kline.high - kline.low) / kline.low) * 100 : 0

          const date = new Date(kline.time * 1000)

          return `
            <div style="padding: 12px; min-width: 220px; background: rgba(255, 255, 255, 0.98); border: 2px solid ${changeColor}; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); backdrop-filter: blur(8px);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                <div>
                  <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 2px;">
                    ${date.toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div style="font-size: 10px; color: #94a3b8;">
                    15分钟 K线
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; background: ${changeBgColor};">
                    <span style="font-size: 12px; font-weight: 700; color: ${changeColor};">
                      ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 13px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: #94a3b8; font-size: 12px; width: 24px;">开</span>
                  <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">
                    ${formatPrice(kline.open)}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: #94a3b8; font-size: 12px; width: 24px;">高</span>
                  <span style="font-weight: 600; color: #10b981; font-family: ui-monospace, monospace;">
                    ${formatPrice(kline.high)}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: #94a3b8; font-size: 12px; width: 24px;">收</span>
                  <span style="font-weight: 600; color: ${kline.close >= kline.open ? '#10b981' : '#ef4444'}; font-family: ui-monospace, monospace;">
                    ${formatPrice(kline.close)}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: #94a3b8; font-size: 12px; width: 24px;">低</span>
                  <span style="font-weight: 600; color: #ef4444; font-family: ui-monospace, monospace;">
                    ${formatPrice(kline.low)}
                  </span>
                </div>
              </div>

              <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b; font-size: 12px; font-weight: 500;">振幅</span>
                <span style="font-size: 14px; font-weight: 700; color: #f59e0b; font-family: ui-monospace, monospace;">
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
            y: lastClose,
            borderColor: isPositive ? '#10b981' : '#ef4444',
            strokeDashArray: 4,
            label: {
              borderColor: isPositive ? '#10b981' : '#ef4444',
              style: {
                color: isPositive ? '#10b981' : '#ef4444',
                background: isPositive ? '#ecfdf5' : '#fef2f2',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'ui-monospace, monospace',
              },
              text: lastCloseFormatted,
              position: 'left',
              offsetX: isMobile ? -20 : -50,
            },
          },
          ...nearbyOrders.map(({ order, price }) => ({
            y: price,
            borderColor: order.side === 'BUY' ? '#10b981' : '#ef4444',
            strokeDashArray: 2,
            offsetY: 0,
          })),
        ],
      },
    }
  }, [data, height, pricePrecision, openOrders, isMobile])
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (data.length === 0) {
    return (
      <div
        className={`bg-slate-50 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <span className="text-xs text-slate-400">加载中...</span>
      </div>
    )
  }

  return (
    <div className={className} style={{ height }}>
      <Chart options={options} series={options.series} type="candlestick" height={height} />
    </div>
  )
}
