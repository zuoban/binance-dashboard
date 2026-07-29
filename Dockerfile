# 多阶段构建 - 生产环境优化

# ============================================
# 依赖安装阶段（仅用于构建）
# ============================================
FROM docker.m.daocloud.io/library/node:20-alpine AS deps

# 安装与 packageManager 和 lockfile 对应的 pnpm 版本
RUN corepack enable pnpm && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# 先复制依赖文件，利用 Docker 层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN pnpm install --frozen-lockfile

# ============================================
# 构建阶段
# ============================================
FROM deps AS builder

WORKDIR /app

# 设置构建时环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SKIP_FONT_OPTIMIZATION=true

# 复制 node_modules 从 deps 阶段（无需重新安装）
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建应用
RUN pnpm build

# ============================================
# 生产运行阶段（最小化镜像）
# ============================================
FROM docker.m.daocloud.io/library/node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 仅安装运行时必需的依赖（tzdata 用于时区）
RUN apk add --no-cache tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制公共静态文件
COPY --from=builder /app/public ./public

# 复制 standalone 输出（已包含所有必要的依赖）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 清理不需要的文件（多架构 sharp 库、TypeScript 等）
# 必须在切换用户前以 root 执行
# 保留 linuxmusl-arm64 (Alpine ARM64)，删除其他平台
RUN rm -rf node_modules/.pnpm/@img+sharp-libvips-linux-arm64@* && \
    rm -rf node_modules/.pnpm/@img+sharp-linux-arm64@* && \
    rm -rf node_modules/.pnpm/typescript@*

# 切换到非 root 用户
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
