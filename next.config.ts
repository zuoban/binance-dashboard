import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 输出模式（用于 Docker 部署）
  output: 'standalone',

  // 图片优化
  images: {
    unoptimized: true, // Docker 部署时禁用图片优化
  },
};

export default nextConfig;
