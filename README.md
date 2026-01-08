# 币安合约看板

<div align="center">

**现代化的币安合约交易信息查看系统**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

[功能特性](#功能特性) &bull; [快速开始](#快速开始) &bull; [Docker 部署](#docker-部署) &bull; [安全配置](#安全配置)

</div>

---

## 概述

一个功能完整的币安合约交易信息查看系统，提供实时持仓监控、账户资产概览和数据可视化功能。采用现代化技术栈构建，注重安全性与性能。

### 核心功能

- **实时持仓监控** - 查看当前持仓仓位、盈亏和风险指标
- **账户资产概览** - 总览账户余额、可用余额和未实现盈亏
- **WebSocket 实时推送** - 自动接收账户数据更新
- **数据可视化** - PnL 收益曲线、持仓分布饼图、实时价格走势
- **访问码认证** - 可选的访问码保护功能
- **响应式设计** - 完美适配桌面端和移动端

---

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| **框架** | Next.js 16 | React 框架，App Router |
| **语言** | TypeScript 5 | 严格类型检查 |
| **样式** | Tailwind CSS 4 | 原子化 CSS 框架 |
| **状态管理** | Zustand | 轻量级状态管理 |
| **数据可视化** | Recharts | React 图表库 |
| **HTTP 客户端** | Axios | HTTP 请求库 |
| **表单验证** | Zod | TypeScript 优先的验证库 |

---

## 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8

### 安装

```bash
# 克隆项目
git clone https://github.com/zuoban/binance-dashboard.git
cd binance-dashboard

# 安装依赖
pnpm install
```

### 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# 币安 API 配置（必填）
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_secret_key_here

# API 端点（可选，使用默认值即可）
NEXT_PUBLIC_BINANCE_REST_API=https://fapi.binance.com
NEXT_PUBLIC_BINANCE_WS_API=wss://fstream.binance.com/ws

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 访问码认证（可选）
# 设置后用户需要输入此访问码才能访问
# ACCESS_CODE=your-access-code-here
```

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## Docker 部署

### 快速启动

```bash
# 使用 Docker Compose（推荐）
docker-compose up -d
```

### 手动运行

```bash
docker run -d \
  --name binance-dashboard \
  -p 3000:3000 \
  -e BINANCE_API_KEY=your_api_key \
  -e BINANCE_API_SECRET=your_api_secret \
  ghcr.io/zuoban/binance-dashboard:latest
```

### 镜像信息

- **镜像地址**: `ghcr.io/zuoban/binance-dashboard`
- **支持架构**: `linux/amd64`、`linux/arm64`
- **镜像大小**: ~208MB
- **基础镜像**: node:20-alpine

> 详细的 Docker 部署指南请参阅 [DOCKER.md](DOCKER.md)

---

## 安全配置

### API 密钥保护

**重要**: 请使用具有**只读权限**的币安 API 密钥

1. 登录币安账户，进入"API 管理"页面
2. 创建新密钥时**仅勾选"读取"权限**
3. 不要启用"提现"或"交易"权限

### 访问码认证（可选）

设置环境变量 `ACCESS_CODE` 后，用户需要输入正确的访问码才能访问应用：

```env
ACCESS_CODE=your-random-access-code
```

建议使用至少 16 字符的随机字符串。

### API 请求保护

- API 密钥仅存储在服务端
- 通过 Next.js API Routes 代理请求
- 客户端无法访问敏感信息
- 使用 Zod 验证所有 API 输入

---

## 项目结构

```
binance-dashboard/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Dashboard 路由组
│   │   ├── layout.tsx            # Dashboard 布局
│   │   └── dashboard/            # 仪表板页面
│   ├── login/                    # 登录页面（访问码认证）
│   ├── api/                      # API 路由
│   │   ├── auth/                 # 认证相关 API
│   │   └── binance/              # 币安 API 代理
│   │       ├── account/          # 账户信息
│   │       ├── positions/        # 持仓信息
│   │       ├── orders/           # 订单历史
│   │       ├── exchange/         # 交易所信息
│   │       ├── exchange-info/    # 交易规则
│   │       └── listen-key/       # WebSocket 密钥
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
├── components/
│   ├── ui/                       # 基础 UI 组件
│   ├── dashboard/                # 仪表板组件
│   │   ├── AssetOverview.tsx     # 资产概览
│   │   ├── PositionCard.tsx      # 持仓卡片
│   │   ├── PnLChart.tsx          # 收益曲线
│   │   └── PositionDistribution.tsx  # 持仓分布
│   └── common/                   # 通用组件
├── lib/
│   ├── binance/                  # 币安 API 集成
│   │   ├── types.ts              # 类型定义
│   │   ├── signature.ts          # 签名工具
│   │   ├── rest-client.ts        # REST API 客户端
│   │   └── websocket-client.ts   # WebSocket 客户端
│   ├── config/                   # 配置文件
│   ├── hooks/                    # 自定义 Hooks
│   ├── store/                    # Zustand 状态管理
│   └── utils/                    # 工具函数
├── scripts/
│   ├── check-env.ts              # 环境变量检查
│   └── test-listenkey.ts         # Listen Key 测试
├── middleware.ts                 # Next.js 中间件（访问码认证）
├── Dockerfile                    # Docker 镜像构建
├── docker-compose.yml            # Docker Compose 配置
└── build-docker.sh               # 多架构镜像构建脚本
```

---

## 开发脚本

```bash
# 启动开发服务器
pnpm dev

# 生产构建
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint

# 类型检查
pnpm type-check

# 代码格式化
pnpm format

# 检查环境变量
pnpm check
```

---

## API 文档

项目使用币安合约 API 的以下端点：

### REST API

- `GET /fapi/v2/account` - 账户信息
- `GET /fapi/v2/positionRisk` - 持仓风险
- `GET /fapi/v1/userTrades` - 用户交易记录
- `GET /fapi/v1/exchangeInfo` - 交易规则和交易对

### WebSocket

- `wss://fstream.binance.com/ws/<listenKey>` - 用户数据流

完整文档: [币安合约 API 文档](https://developers.binance.com/docs/zh-CN/derivatives/usds-margined-futures)

---

## 环境变量参考

| 变量名 | 必需 | 说明 | 默认值 |
|--------|------|------|--------|
| `BINANCE_API_KEY` | ✅ | 币安 API Key | - |
| `BINANCE_API_SECRET` | ✅ | 币安 API Secret | - |
| `NEXT_PUBLIC_BINANCE_REST_API` | ❌ | REST API 端点 | `https://fapi.binance.com` |
| `NEXT_PUBLIC_BINANCE_WS_API` | ❌ | WebSocket API 端点 | `wss://fstream.binance.com/ws` |
| `NEXT_PUBLIC_APP_URL` | ❌ | 应用访问地址 | `http://localhost:3000` |
| `ACCESS_CODE` | ❌ | 访问码（留空则不启用） | - |
| `BINANCE_TESTNET` | ❌ | 使用测试网 | - |

---

## 故障排除

### 提示"API credentials not configured"

检查 `.env.local` 文件是否正确配置了 API 密钥。

### WebSocket 连接失败

确保网络可以访问 `wss://fstream.binance.com`，检查防火墙设置。

### 构建失败

删除 `.next` 目录和 `node_modules`，重新安装依赖：

```bash
rm -rf .next node_modules
pnpm install
pnpm build
```

### Docker 容器无法启动

```bash
# 查看容器日志
docker logs binance-dashboard

# 检查环境变量
docker inspect binance-dashboard | grep -A 20 "Env"
```

---

## 部署平台

### Vercel（推荐）

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 配置环境变量
4. 部署

### 其他平台

- **Netlify** - 支持 Next.js
- **Railway** - 全栈应用部署
- **Docker** - 使用 `docker-compose.yml`

---

## 许可证

MIT License

---

## 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Zustand](https://zustand-demo.pmnd.rs/) - 状态管理
- [Recharts](https://recharts.org/) - 图表库
- [币安](https://www.binance.com/) - 交易平台

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持！**

Made with ❤️

</div>
