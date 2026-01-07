#!/bin/bash

# 多架构 Docker 镜像构建和推送脚本
# 支持: linux/amd64, linux/arm64
# 使用 GitHub Container Registry

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
# GitHub Container Registry 格式: ghcr.io/username/repo:tag
GITHUB_USERNAME="${GITHUB_USERNAME:-zuoban}"
IMAGE_NAME="binance-dashboard"
IMAGE_TAG="${DOCKER_IMAGE_TAG:-latest}"
REGISTRY="ghcr.io"
FULL_IMAGE_NAME="${REGISTRY}/${GITHUB_USERNAME}/${IMAGE_NAME}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  多架构 Docker 镜像构建和推送脚本${NC}"
echo -e "${GREEN}  (GitHub Container Registry)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查 Docker 登录状态
echo -e "${YELLOW}检查 Docker 登录状态...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 运行中${NC}"
echo ""

# 检查是否已登录 GHCR
echo -e "${YELLOW}检查 GitHub Container Registry 登录状态...${NC}"
if ! docker buildx inspect "$BUILDER_NAME" > /dev/null 2>&1; then
    echo -e "${YELLOW}请先登录 GitHub Container Registry:${NC}"
    echo -e "${BLUE}使用 GitHub Personal Access Token (PAT) 登录${NC}"
    echo -e "${YELLOW}1. 访问: https://github.com/settings/tokens${NC}"
    echo -e "${YELLOW}2. 生成 PAT (需要 read:packages 和 write:packages 权限)${NC}"
    echo -e "${YELLOW}3. 执行: echo ${NC}\${BLUE}\"<PAT>\"${NC} ${YELLOW}| docker login ghcr.io -u${NC} \${BLUE}\"<GitHub-username>\"${NC} ${YELLOW}--password-stdin${NC}"
    echo ""
    docker login ghcr.io
    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: GitHub Container Registry 登录失败${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ GitHub Container Registry 已登录${NC}"
echo ""

# 创建并使用 buildx builder
echo -e "${YELLOW}设置 Docker buildx...${NC}"
BUILDER_NAME="multiarch-builder"

if ! docker buildx inspect "$BUILDER_NAME" > /dev/null 2>&1; then
    docker buildx create --name "$BUILDER_NAME" --driver docker-container --use
    echo -e "${GREEN}✓ 创建 buildx builder: $BUILDER_NAME${NC}"
else
    docker buildx use "$BUILDER_NAME"
    echo -e "${GREEN}✓ 使用现有 buildx builder: $BUILDER_NAME${NC}"
fi
echo ""

# 构建平台列表
PLATFORMS="linux/amd64,linux/arm64"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}开始构建多架构镜像${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "平台: ${PLATFORMS}"
echo -e "镜像: ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
echo ""

# 构建并推送多架构镜像
echo -e "${YELLOW}构建和推送镜像...${NC}"
docker buildx build \
  --platform "$PLATFORMS" \
  --tag "${FULL_IMAGE_NAME}:${IMAGE_TAG}" \
  --tag "${FULL_IMAGE_NAME}:latest" \
  --push \
  --progress=plain \
  .

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ 构建和推送成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "镜像地址:"
    echo -e "  ${BLUE}${FULL_IMAGE_NAME}:${IMAGE_TAG}${NC}"
    echo -e "  ${BLUE}${FULL_IMAGE_NAME}:latest${NC}"
    echo ""
    echo -e "${YELLOW}使用方法:${NC}"
    echo -e "  docker run -d -p 3000:3000 ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
    echo ""
    echo -e "${YELLOW}拉取镜像:${NC}"
    echo -e "  docker pull ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
    echo ""

    # 显示镜像信息
    echo -e "${YELLOW}镜像信息:${NC}"
    docker buildx imagetools inspect "${FULL_IMAGE_NAME}:${IMAGE_TAG}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ 构建或推送失败${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
