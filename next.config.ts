import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 避免上级目录的锁文件导致 Turbopack 将 workspace 根目录识别错误。
  turbopack: {
    root: process.cwd(),
  },

  // 启用 standalone 输出模式（用于 Docker 部署）
  output: 'standalone',

  // 图片优化
  images: {
    unoptimized: true, // Docker 部署时禁用图片优化
  },

  // 基础浏览器安全策略。CSP 需要随第三方图表资源单独评估，因此不在这里设置过严规则。
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
