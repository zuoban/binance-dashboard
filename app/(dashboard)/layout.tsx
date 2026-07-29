/**
 * Dashboard 布局
 *
 * 访问码开启时由 proxy.ts 在服务端完成访问控制，避免客户端二次鉴权造成页面闪烁。
 */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <main className="p-4 min-h-screen">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
