# AGENTS.md

此文件为 AI 编码助手提供项目特定的指导和最佳实践。

## 核心命令

### 开发和构建

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 生产构建(会自动检查环境变量)
pnpm start        # 启动生产服务器
pnpm check        # 检查环境变量配置
```

### 代码质量

```bash
pnpm lint         # 运行 ESLint
pnpm type-check   # TypeScript 类型检查(严格模式)
pnpm format       # 使用 Prettier 格式化代码
```

### 测试

```bash
pnpm test:listenkey  # 测试 Listen Key 功能
```

注意: 项目使用 TypeScript 严格类型检查和构建时验证作为主要测试策略,无传统单元测试框架。

## 代码风格指南

### 格式化规则(Prettier)

- 不使用分号(无尾随分号)
- 使用单引号而非双引号
- 缩进: 2 个空格
- 尾随逗号: ES5 标准
- 箭头函数参数: 省略括号(单参数时)
- 打印宽度: 100 字符

### 导入顺序

1. React 相关导入
2. 第三方库导入
3. 内部模块导入(使用 @ 别名)
4. 相对路径导入

示例:

```typescript
import { useState, useEffect } from 'react'
import { useBinanceAccount } from '@/lib/hooks'
import { AccountAsset } from '@/types/binance'
import { LoadingState } from '@/types/common'
```

### TypeScript 最佳实践

- 使用 `interface` 定义对象形状和组件 props
- 使用 `type` 定义联合类型、函数类型和元组
- 避免使用 `any`,使用 `unknown` 或具体类型
- 为函数参数和返回值显式标注类型
- 使用 JSDoc 注释描述复杂类型和函数用途

### 命名约定

- 变量和函数: camelCase (`totalBalance`, `fetchAccount`)
- React 组件: PascalCase (`AssetOverview`, `PositionCard`)
- 类: PascalCase (`BinanceRestClient`, `BinanceApiError`)
- 常量: SCREAMING_SNAKE_CASE (`API_TIMEOUT`, `MAX_RETRIES`)
- 私有方法: 前缀下划线(`_buildSignedUrl`)
- 文件名: kebab-case (`account-store.ts`, `use-dashboard-data.ts`)

### 组件开发规范

- 客户端组件: 文件顶部添加 `'use client'`
- Props 接口命名: `ComponentNameProps` (如 `AssetOverviewProps`)
- 使用 JSDoc 为 props 添加描述性注释
- 组件导出使用命名导出而非默认导出
- 合理使用 Tailwind CSS 类名,优先使用响应式和暗色模式变体

### 状态管理(Zustand)

- Store 文件位于 `lib/store/`
- 使用 `create()` 函数创建 store
- 分离状态、actions 和 selectors
- Selectors 作为纯函数导出,用于派生状态
- 使用 `set` 和 `get` 访问状态和方法

### API 路由规范

- 文件路径: `app/api/[path]/route.ts`
- 返回标准格式: `{ success: boolean, data?: T, error?: { code, message } }`
- 使用 `NextResponse.json()` 返回响应
- 错误处理: 捕获异常并返回适当的 HTTP 状态码
- 敏感操作(如 API 密钥)仅在服务端处理

### 错误处理

- 创建自定义错误类继承 `Error`(如 `BinanceApiError`)
- 使用 `try-catch` 包裹异步操作
- 记录错误到控制台并返回用户友好的消息
- 区分客户端错误(4xx)和服务端错误(5xx)

### 输入验证

- 使用 Zod Schema 定义验证规则
- 所有 API 输入参数必须验证
- 在 API 路由中使用 `validateQueryParams()`
- 为验证错误返回标准错误响应

### 环境变量

- 配置文件: `.env.local`(本地,不提交)和 `.env.example`(模板)
- 公共变量前缀: `NEXT_PUBLIC_`
- 私有变量: 仅服务端访问
- 配置集中管理在 `lib/config.ts`
- 使用 `getServerConfig()` 获取服务端专用配置

### Hooks 开发规范

- 自定义 hooks 位于 `lib/hooks/`
- 命名以 `use` 开头,使用 camelCase
- 返回对象包含状态、错误、加载状态和操作方法
- 使用 `useCallback` 和 `useMemo` 优化性能
- 合理使用 `useRef` 存储不会触发重渲染的值

### 文件结构规范

- `app/` - Next.js App Router 页面和 API 路由
- `components/` - 可复用 UI 组件(按功能分组)
- `lib/` - 核心业务逻辑和工具函数
  - `binance/` - 币安 API 集成
  - `hooks/` - 自定义 React hooks
  - `store/` - Zustand 状态管理
  - `utils/` - 工具函数
  - `validations/` - Zod 验证 schemas
- `types/` - TypeScript 类型定义 (binance.ts, common.ts, index.ts)

### 注释规范

- 文件顶部添加描述文件用途的 JSDoc 注释
- 复杂函数添加 JSDoc 说明参数和返回值
- 特殊业务逻辑添加行内注释解释原因
- 注释使用中文

### 安全最佳实践

- API 密钥通过环境变量管理,不硬编码
- 服务端处理敏感操作,客户端仅展示
- 使用速率限制防止滥用
- 验证所有用户输入
- 不在客户端日志中输出敏感信息

## 工作流程

1. 开发新功能前,先运行 `pnpm type-check` 确保类型无错误
2. 编写代码时遵循上述风格指南
3. 完成后运行 `pnpm lint` 和 `pnpm format`
4. 提交前确保 `pnpm build` 成功
5. 环境变量配置正确,使用 `pnpm check` 验证

## 重要注意事项

- 项目使用 TypeScript 严格模式,必须正确处理类型
- 组件优先使用命名导出而非默认导出
- 避免在组件中直接访问 `window`,使用 `useEffect` 或条件检查
- 使用 `date-fns` 处理日期,而非原生 Date 方法
- WebSocket 连接管理集中在 `lib/hooks/useWebSocket.ts`
- 所有 API 调用通过 Next.js API Routes 代理,保护密钥
