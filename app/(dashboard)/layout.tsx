/**
 * Dashboard 布局
 *
 * 访问码开启时由 proxy.ts 在服务端完成访问控制，避免客户端二次鉴权造成页面闪烁。
 */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell min-h-screen">
      <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
