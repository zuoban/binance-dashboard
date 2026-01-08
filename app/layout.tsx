import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  adjustFontFallback: true, // 使用本地字体回退，避免网络请求
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  adjustFontFallback: true, // 使用本地字体回退，避免网络请求
})

export const metadata: Metadata = {
  title: '币安合约看板',
  description: '专业的币安合约交易信息查看系统，提供实时持仓监控、历史订单查询和资产概览功能',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
