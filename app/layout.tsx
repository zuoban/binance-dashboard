import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '币安合约看板',
  description: '实时查看币安合约账户、持仓、委托与交易数据。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
