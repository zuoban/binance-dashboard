/**
 * Dashboard 布局
 *
 * 访问码开启时由 proxy.ts 在服务端完成访问控制，避免客户端二次鉴权造成页面闪烁。
 */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell min-h-screen">
      <main className="min-h-screen px-3 py-3 sm:px-5 sm:py-5 xl:px-7 xl:py-6">
        <div className="mx-auto max-w-[1480px]">{children}</div>
      </main>
    </div>
  )
}
