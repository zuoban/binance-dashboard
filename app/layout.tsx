import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ba-Dashboard',
  description: '一个普通的看板',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
