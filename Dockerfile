# 多阶段构建 - 生产环境优化

FROM docker.m.daocloud.io/library/node:20-alpine AS base

# 安装依赖仅用于运行时
RUN apk add --no-cache tzdata

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装 pnpm
RUN npm install -g pnpm@9

# 安装依赖
RUN pnpm install --frozen-lockfile --prod=false

# 构建阶段
FROM base AS builder

# 设置构建时环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# 禁用 Google Fonts 下载（使用系统字体回退）
ENV NEXT_PUBLIC_SKIP_FONT_OPTIMIZATION=true

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产运行阶段
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要的文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 复制构建输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
