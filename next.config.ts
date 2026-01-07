import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 输出模式（用于 Docker 部署）
  output: 'standalone',

  // 图片优化
  images: {
    unoptimized: true, // Docker 部署时禁用图片优化
  },

  // 实验性功能
  experimental: {
    // 禁用字体优化以避免构建时网络请求
    optimizeCss: false,
  },
};

export default nextConfig;
