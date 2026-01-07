# 币安合约交易信息查看系统

<div align="center">

**一个现代化的币安合约交易信息查看系统**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

[功能特性](#功能特性) • [快速开始](#快速开始) • [部署](#部署) • [文档](#文档)

</div>

---

## 📋 项目简介

这是一个功能完整的币安合约交易信息查看系统，提供实时持仓监控、历史订单查询、资产概览和数据可视化功能。采用现代化的技术栈构建，注重安全性、性能和用户体验。

### 核心功能

- ✅ **实时持仓监控** - 查看当前持仓仓位、盈亏和风险指标
- ✅ **历史订单查询** - 支持按交易对、时间范围筛选历史订单
- ✅ **账户资产概览** - 总览账户余额、可用余额和未实现盈亏
- ✅ **WebSocket 实时推送** - 自动接收账户数据更新
- ✅ **数据可视化** - PnL 收益曲线、持仓分布饼图、实时价格走势
- ✅ **响应式设计** - 完美适配桌面端和移动端
- 🔒 **安全可靠** - API 密钥服务端管理、速率限制、输入验证

---

## 🛠️ 技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **框架** | Next.js | 16.1+ | React 框架，支持 App Router |
| **语言** | TypeScript | 5.9+ | 严格模式，完整类型检查 |
| **样式** | Tailwind CSS | 4.x | 原子化 CSS 框架 |
| **状态管理** | Zustand | 5.x | 轻量级状态管理库 |
| **数据可视化** | Recharts | 2.x | React 图表库 |
| **HTTP 客户端** | Axios | 1.7+ | HTTP 请求库 |
| **WebSocket** | 原生 API | - | 实时数据推送 |
| **表单验证** | Zod | 4.x | TypeScript 优先的验证库 |
| **包管理器** | pnpm | 10.x | 快速、节省磁盘空间的包管理器 |

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18.17.0
- pnpm >= 8.0.0

### 1. 克隆项目

```bash
git clone https://github.com/your-username/binance-dashboard.git
cd binance-dashboard
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入你的币安 API 密钥：

```env
# 币安 API 配置
NEXT_PUBLIC_BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_secret_key_here

# API 端点（使用默认值即可）
NEXT_PUBLIC_BINANCE_REST_API=https://fapi.binance.com
NEXT_PUBLIC_BINANCE_WS_API=wss://fstream.binance.com/ws

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ 重要安全提示：**

1. **创建只读权限的 API 密钥**
   - 登录币安账户
   - 进入"API 管理"页面
   - 创建新密钥时**只勾选"读取"权限**
   - 不要启用"提现"或"交易"权限

2. **保护密钥安全**
   - ❌ 不要将 `.env.local` 提交到 Git
   - ✅ 使用环境变量管理密钥
   - ✅ 生产环境在部署平台配置环境变量

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

---

## 📁 项目结构

```
binance-dashboard/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Dashboard 路由组
│   │   ├── layout.tsx            # Dashboard 布局
│   │   ├── page.tsx              # 首页
│   │   ├── positions/            # 持仓页面
│   │   ├── orders/               # 订单页面
│   │   └── assets/               # 资产页面
│   ├── api/                      # API 路由代理
│   │   └── binance/
│   │       ├── account/route.ts
│   │       ├── positions/route.ts
│   │       ├── orders/route.ts
│   │       ├── exchange/route.ts
│   │       └── listen-key/route.ts
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页（重定向）
├── components/
│   ├── ui/                       # shadcn/ui 基础组件
│   ├── layout/                   # 布局组件
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── dashboard/                # 仪表板组件
│   │   ├── AssetOverview.tsx
│   │   ├── PositionCard.tsx
│   │   ├── OrderTable.tsx
│   │   ├── PnLChart.tsx
│   │   ├── PositionDistribution.tsx
│   │   ├── PriceChart.tsx
│   │   └── ChartLazy.tsx         # 图表懒加载
│   └── common/                   # 通用组件
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       ├── EmptyState.tsx
│       ├── ConnectionStatus.tsx
│       └── ChartLoader.tsx
├── lib/
│   ├── binance/                  # 币安 API 集成
│   │   ├── types.ts              # 类型定义
│   │   ├── signature.ts          # 签名工具
│   │   ├── rest-client.ts        # REST API 客户端
│   │   ├── websocket-client.ts   # WebSocket 客户端
│   │   └── endpoints.ts          # API 端点配置
│   ├── config.ts                 # 应用配置
│   ├── config/
│   │   └── env.ts                # 环境变量验证
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useBinancePositions.ts
│   │   ├── useBinanceOrders.ts
│   │   ├── useBinanceAccount.ts
│   │   ├── useWebSocket.ts
│   │   └── useBinanceWebSocket.ts
│   ├── store/                    # Zustand 状态管理
│   │   ├── positions-store.ts
│   │   ├── orders-store.ts
│   │   ├── account-store.ts
│   │   └── ws-store.ts
│   ├── middleware/               # 中间件
│   │   └── rate-limit.ts         # 速率限制
│   ├── validations/              # 验证 Schema
│   │   └── api.ts
│   └── utils/                    # 工具函数
│       ├── date.ts
│       └── index.ts
├── types/
│   └── binance.ts                # 币安类型定义
├── .env.example                  # 环境变量模板
├── .env.local                    # 本地环境变量（不提交）
├── next.config.ts                # Next.js 配置
├── tsconfig.json                 # TypeScript 配置
├── tailwind.config.ts            # Tailwind CSS 配置
└── package.json
```

---

## 🎯 功能特性详解

### 1. 实时持仓监控

- 查看所有活跃持仓
- 实时显示未实现盈亏
- 支持做多/做空方向标识
- 显示杠杆倍数和保证金模式

### 2. 历史订单查询

- 按交易对筛选订单
- 支持时间范围查询
- 订单状态标签（已完成、已撤销、部分成交等）
- 排序功能（按时间、价格等）

### 3. 账户资产概览

- 总余额和可用余额
- 未实现盈亏统计
- 风险等级评估
- 资产变化趋势图

### 4. 数据可视化

- **PnL 收益曲线** - 显示账户盈亏历史走势
- **持仓分布饼图** - 各币种持仓占比
- **实时价格图表** - 交易对价格走势（支持折线图和面积图）

### 5. WebSocket 实时推送

- 自动连接和重连
- 心跳检测（每 30 秒）
- Listen Key 自动刷新（每 30 分钟）
- 连接状态实时显示

---

## 🔒 安全特性

### API 密钥保护

- ✅ API 密钥仅存储在服务端
- ✅ 通过 Next.js API Routes 代理请求
- ✅ 客户端无法访问敏感信息

### 输入验证

- ✅ 使用 Zod 验证所有 API 输入
- ✅ 交易对格式验证（XXXUSDT）
- ✅ 数值范围验证
- ✅ 类型安全的数据转换

### 速率限制

- ✅ API 路由速率限制（60 次/分钟）
- ✅ 基于 IP 的限流
- ✅ 标准 429 响应和 Retry-After 头

### 环境变量验证

- ✅ 启动时验证所有必需配置
- ✅ 生产环境缺失配置会抛出错误
- ✅ 开发环境友好提示

---

## 📦 部署

### Vercel 部署（推荐）

1. **Fork 并推送到 GitHub**

2. **在 Vercel 中导入项目**
   - 访问 [vercel.com](https://vercel.com)
   - 点击"New Project"
   - 导入你的 GitHub 仓库

3. **配置环境变量**

在 Vercel 项目设置中添加以下环境变量：

```env
NEXT_PUBLIC_BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_secret_key_here
NEXT_PUBLIC_BINANCE_REST_API=https://fapi.binance.com
NEXT_PUBLIC_BINANCE_WS_API=wss://fstream.binance.com/ws
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

4. **部署**

点击"Deploy"按钮，Vercel 会自动：
- 安装依赖（`pnpm install`）
- 构建项目（`pnpm build`）
- 部署到全球 CDN

### 其他平台

项目可以部署到任何支持 Next.js 的平台：

- **Netlify** - 支持 Next.js，自动构建
- **Railway** - 全栈应用部署
- **自托管** - 使用 Docker 或 Node.js

---

## 📝 开发脚本

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
```

---

## 🌐 API 文档

项目使用币安合约 API 的以下端点：

### REST API

- `GET /fapi/v2/account` - 账户信息
- `GET /fapi/v2/positionRisk` - 持仓风险
- `GET /fapi/v1/userTrades` - 用户交易记录
- `GET /fapi/v1/exchangeInfo` - 交易规则和交易对

### WebSocket

- `wss://fstream.binance.com/ws/<listenKey>` - 用户数据流

完整的 API 文档请参考：[币安合约 API 文档](https://developers.binance.com/docs/zh-CN/derivatives/usds-margined-futures)

---

## 🧪 测试

项目包含以下测试策略：

1. **类型检查** - TypeScript 严格模式
2. **环境变量验证** - 启动时自动验证
3. **API 输入验证** - Zod Schema 验证
4. **构建测试** - `pnpm build` 验证

---

## 🐛 故障排除

### 常见问题

**Q: 提示"API credentials not configured"**

A: 检查 `.env.local` 文件是否正确配置了 API 密钥。

**Q: WebSocket 连接失败**

A: 确保网络可以访问 `wss://fstream.binance.com`，检查防火墙设置。

**Q: 图表不显示**

A: 确保有持仓数据，图表仅在有数据时显示。

**Q: 构建失败**

A: 删除 `.next` 目录和 `node_modules`，重新安装依赖：

```bash
rm -rf .next node_modules
pnpm install
pnpm build
```

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🤝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📞 联系方式

- 项目主页: [GitHub Repository](https://github.com/your-username/binance-dashboard)
- 问题反馈: [Issues](https://github.com/your-username/binance-dashboard/issues)

---

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Zustand](https://zustand-demo.pmnd.rs/) - 状态管理
- [Recharts](https://recharts.org/) - 图表库
- [Zod](https://zod.dev/) - 表单验证
- [币安](https://www.binance.com/) - 交易平台

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持！**

Made with ❤️ by [Your Name]

</div>
