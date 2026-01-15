# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 16 的币安合约交易信息查看系统，采用现代化技术栈构建。核心特性是实时数据推送和账户资产监控。

### 技术栈
- **框架**: Next.js 16.1+ (App Router)
- **语言**: TypeScript 5.9+ (严格模式)
- **样式**: Tailwind CSS 4.x
- **状态管理**: Zustand 5.x
- **数据可视化**: Recharts 2.x
- **API 客户端**: Axios 1.7+
- **表单验证**: Zod 4.x
- **包管理器**: pnpm 10.x

## 开发命令

```bash
# 开发服务器（热重载）
pnpm dev

# 生产构建
pnpm build

# 生产服务器（需先执行 pnpm build）
pnpm start

# 代码检查
pnpm lint

# 类型检查
pnpm type-check

# 代码格式化
pnpm format

# 检查环境变量
pnpm check

# 测试 Listen Key（可选）
pnpm test:listenkey
```

## 核心架构

### 全局单例数据推送架构（最重要）

项目采用**全局单例数据推送架构**，这是理解整个系统的基础：

1. **DataManager** (`lib/services/data-manager.ts`)
   - 全局单例，负责统一获取和缓存币安数据
   - 每 5 秒自动刷新数据
   - 基于引用计数管理生命周期（有连接时启动，无连接时停止）
   - 避免多标签页重复调用币安 API

2. **ConnectionManager** (`lib/services/connection-manager.ts`)
   - 跟踪所有活跃的 SSE 连接
   - 管理 DataManager 的生命周期
   - 向连接广播数据更新

3. **数据流向**
   ```
   DataManager → ConnectionManager → SSE → 客户端 (useDashboardWebSocket Hook)
   ```

### 目录结构

```
lib/
├── binance/              # 币安 API 集成
│   ├── rest-client.ts    # REST API 客户端（签名、错误处理）
│   ├── signature.ts      # 请求签名工具
│   └── endpoints.ts      # API 端点定义
├── services/             # 核心服务（单例模式）
│   ├── data-manager.ts       # 数据管理器（获取、缓存、广播）
│   ├── connection-manager.ts # 连接管理器（SSE 连接跟踪）
│   └── types.ts              # 服务层类型定义
├── store/                # Zustand 状态管理
│   ├── account-store.ts  # 账户数据状态
│   ├── positions-store.ts # 持仓数据状态
│   ├── orders-store.ts   # 订单数据状态
│   └── ws-store.ts       # WebSocket 连接状态
├── hooks/                # 自定义 React Hooks
│   ├── useDashboardWebSocket.ts  # SSE 数据订阅（主要 Hook）
│   └── useBinance*.ts            # 币安 API 调用 Hooks
├── config/               # 配置文件
│   └── env.ts            # 环境变量验证（Zod）
└── utils/                # 工具函数
    ├── binance-mapper.ts # 币安数据映射
    └── account-mapper.ts # 账户数据映射

app/
├── api/                  # API Routes
│   ├── dashboard/ws/     # SSE 数据推送端点
│   └── binance/          # 币安 API 代理
└── (dashboard)/          # Dashboard 路由组
    └── dashboard/        # 看板页面
```

## 重要模式

### 1. 环境变量验证

所有环境变量通过 `lib/config/env.ts` 中的 Zod schema 验证：
- 开发环境：缺失配置时显示警告
- 生产环境：缺失必需配置会抛出错误并阻止启动

### 2. 币安 API 调用

**服务端**（API Routes）：
```typescript
import { BinanceRestClient } from '@/lib/binance/rest-client'
import { getServerConfig } from '@/lib/config'

const client = new BinanceRestClient({
  apiKey: config.binance.apiKey,
  apiSecret: config.binance.apiSecret,
  baseUrl: config.binance.restApi,
})
```

**客户端**（通过 API 代理）：
```typescript
// 使用 useDashboardWebSocket Hook 订阅 SSE 数据流
// 避免直接调用币安 API
```

### 3. 访问码认证

当设置 `ACCESS_CODE` 环境变量时：
- `middleware.ts` 拦截所有 API 请求
- 验证 `x-access-code` 请求头
- `/api/auth/verify` 为公开端点（用于验证）

### 4. 数据映射

币安 API 返回的数据格式复杂，使用 mapper 工具转换为简化类型：
- `lib/utils/binance-mapper.ts`: 持仓数据映射
- `lib/utils/account-mapper.ts`: 账户数据映射

## 开发注意事项

### 添加新的币安 API 端点

1. 在 `lib/binance/endpoints.ts` 添加端点定义
2. 在 `BinanceRestClient` 类添加方法（`lib/binance/rest-client.ts`）
3. 创建对应的 API Route 代理（`app/api/binance/`）

### 修改数据刷新逻辑

修改 `DataManager` 类中的 `fetchDashboardData()` 方法。这是唯一需要修改的地方来改变数据获取逻辑。

### 添加新的状态管理

1. 在 `lib/store/` 创建新的 store 文件
2. 使用 Zustand 的 `create()` API
3. 导出 selector 函数用于派生状态

### Docker 部署

- Next.js 配置为 `output: 'standalone'` 模式
- 图片优化已禁用（`unoptimized: true`）
- 使用 `node:20-alpine` 基础镜像
- 支持多架构构建（amd64/arm64）

## 常见任务

### 调试 SSE 连接

在开发环境中，SSE 和 DataManager 会输出详细日志：
```
[DataManager] Data fetched and broadcasted (123ms, subscribers: 2)
[ConnectionManager] Connection abc123... registered. Total: 1
```

### 测试币安 API

使用 `pnpm test:listenkey` 测试 Listen Key 创建和刷新。

### 添加新的可视化组件

1. 在 `components/dashboard/` 创建组件
2. 使用 Recharts 库
3. 通过 `useDashboardWebSocket` Hook 获取数据

## 安全要点

- API 密钥仅存储在服务端
- 所有币安 API 调用通过 Next.js API Routes 代理
- 使用 Zod 验证所有 API 输入
- 生产环境必须配置所有必需的环境变量
- 建议使用只读权限的币安 API 密钥
