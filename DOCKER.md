# Docker 部署指南

本文档介绍如何使用 Docker 部署币安合约交易看板系统。

## 镜像托管平台

本项目使用 **GitHub Container Registry (GHCR)** 托管镜像，提供更好的国内访问体验。

## 前置要求

- Docker 20.10+
- GitHub 账号
- GitHub Personal Access Token (PAT)
- 币安 API Key 和 Secret（只读权限）

## 快速开始

### 1. 生成 GitHub Personal Access Token

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 设置 token 名称（如：binance-dashboard）
4. 选择权限：
   - ✅ `read:packages`
   - ✅ `write:packages`
5. 点击 "Generate token"
6. **重要**：复制生成的 token（只显示一次）

### 2. 登录 GitHub Container Registry

```bash
# 使用 PAT 登录
echo "YOUR_PAT_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 示例
echo "ghp_xxxxxxxxxxxx" | docker login ghcr.io -u zuoban --password-stdin
```

### 3. 使用构建脚本构建多架构镜像

```bash
./build-docker.sh
```

该脚本会自动：
- 构建 `linux/amd64` 和 `linux/arm64` 两种架构的镜像
- 推送到 GitHub Container Registry
- 创建 `latest` 和版本标签

### 4. 使用 Docker 运行

```bash
docker run -d \
  --name binance-dashboard \
  -p 3000:3000 \
  -e BINANCE_API_KEY=your_api_key \
  -e BINANCE_API_SECRET=your_api_secret \
  ghcr.io/zuoban/binance-dashboard:latest
```

### 5. 使用 Docker Compose（推荐）

1. 创建 `.env` 文件：

```env
# 币安 API 配置
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here

# API 端点（可选）
NEXT_PUBLIC_BINANCE_REST_API=https://fapi.binance.com
NEXT_PUBLIC_BINANCE_WS_API=wss://fstream.binance.com/ws
```

2. 启动服务：

```bash
docker-compose up -d
```

3. 查看日志：

```bash
docker-compose logs -f
```

4. 停止服务：

```bash
docker-compose down
```

## 镜像信息

- **镜像地址**: `ghcr.io/zuoban/binance-dashboard`
- **支持架构**:
  - `linux/amd64` (x86_64)
  - `linux/arm64` (ARM 64位)
- **镜像大小**: ~150MB (压缩后)
- **基础镜像**: node:20-alpine
- **托管平台**: GitHub Container Registry

## 支持的平台

- ✅ Linux x86_64 (amd64)
- ✅ Linux ARM 64位 (arm64)
- ✅ macOS (Apple Silicon M1/M2/M3)
- ✅ Raspberry Pi 4+
- ✅ 各类云服务器

## 查看镜像

访问 GitHub Packages 查看镜像：
https://github.com/users/zuoban/packages/container/package/binance-dashboard

## 自定义构建

### 修改镜像名称或标签

编辑 `build-docker.sh`，修改以下变量：

```bash
GITHUB_USERNAME="your-github-username"
IMAGE_TAG="v1.0.0"
```

### 添加更多架构

编辑 `build-docker.sh`，修改 `PLATFORMS` 变量：

```bash
PLATFORMS="linux/amd64,linux/arm64,linux/arm/v7"
```

### 本地测试构建

```bash
# 仅构建本地镜像（不推送）
docker buildx build \
  --platform linux/amd64 \
  --tag ghcr.io/zuoban/binance-dashboard:test \
  --load \
  .

# 运行测试
docker run -d -p 3000:3000 \
  -e BINANCE_API_KEY=test \
  -e BINANCE_API_SECRET=test \
  ghcr.io/zuoban/binance-dashboard:test
```

## 环境变量

| 变量名 | 必需 | 说明 | 默认值 |
|--------|------|------|--------|
| `BINANCE_API_KEY` | ✅ | 币安 API Key | - |
| `BINANCE_API_SECRET` | ✅ | 币安 API Secret | - |
| `NEXT_PUBLIC_BINANCE_REST_API` | ❌ | REST API 端点 | `https://fapi.binance.com` |
| `NEXT_PUBLIC_BINANCE_WS_API` | ❌ | WebSocket API 端点 | `wss://fstream.binance.com/ws` |
| `NODE_ENV` | ❌ | 运行环境 | `production` |

## 安全建议

1. **使用受限 API Key**
   - 仅启用只读权限
   - 限制 IP 白名单
   - 不要开启提现和交易权限

2. **GitHub Token 管理**
   - 定期轮换 PAT
   - 设置 token 过期时间
   - 不要在代码中硬编码 token

3. **环境变量管理**
   - 使用 `.env` 文件或 Docker secrets
   - 不要将 `.env` 文件提交到 Git
   - 定期更换 API 密钥

4. **网络隔离**
   - 使用反向代理 (Nginx/Traefik)
   - 启用 HTTPS
   - 限制访问来源

## 性能优化

### 镜像优化

- ✅ 使用 Alpine 基础镜像
- ✅ 多阶段构建减小镜像大小
- ✅ 启用 Next.js standalone 模式
- ✅ SWC 压缩代码

### 运行时优化

```yaml
# docker-compose.yml
services:
  binance-dashboard:
    # 限制内存使用
    mem_limit: 512m
    # 限制 CPU 使用
    cpus: '0.5'
    # 设置重启策略
    restart: unless-stopped
```

## 故障排查

### 1. 容器无法启动

```bash
# 查看容器日志
docker logs binance-dashboard

# 检查环境变量
docker inspect binance-dashboard | grep -A 20 "Env"
```

### 2. 镜像拉取失败

```bash
# 重新拉取镜像
docker pull ghcr.io/zuoban/binance-dashboard:latest

# 检查登录状态
docker login ghcr.io
```

### 3. API 请求失败

- 检查 API Key 是否正确
- 确认 API Key 有只读权限
- 检查网络连接
- 查看容器日志中的错误信息

### 4. GHCR 认证失败

```bash
# 重新登录
echo "YOUR_NEW_PAT" | docker login ghcr.io -u zuoban --password-stdin

# 清理旧凭证
docker logout ghcr.io
```

## 更新镜像

```bash
# 拉取最新镜像
docker pull ghcr.io/zuoban/binance-dashboard:latest

# 重新创建容器
docker-compose up -d --force-recreate
```

## 生产部署建议

1. **使用版本标签**
   ```bash
   ghcr.io/zuoban/binance-dashboard:v1.0.0
   ```

2. **健康检查**
   - 已内置健康检查
   - 每 30 秒检查一次
   - 失败 3 次后重启容器

3. **日志管理**
   ```bash
   # 限制日志大小
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

4. **监控和告警**
   - 使用 GitHub Actions 自动构建
   - 集成监控系统（Prometheus + Grafana）
   - 设置容器状态监控
   - 配置告警规则

## GitHub Packages 管理

### 查看镜像列表
```bash
# 使用 GitHub CLI
gh repo view --json packages --jq .packages[].name
```

### 删除旧镜像
访问：https://github.com/users/zuoban/packages/container/package/binance-dashboard/versions

### 设置镜像可见性
镜像默认是公开的，可以设置为私有（需要 GitHub Pro 账号）

## 相关链接

- **GitHub Container Registry**: https://github.com/users/zuoban/packages/container/package/binance-dashboard
- **GitHub 仓库**: https://github.com/zuoban/binance-dashboard
- **币安 API 文档**: https://developers.binance.com/docs
- **GitHub Packages 文档**: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
