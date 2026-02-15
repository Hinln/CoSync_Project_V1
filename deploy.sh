#!/bin/bash
# ============================================================
# 同频 (CoSync) 一键部署脚本
# ============================================================
# 使用方法：chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e

echo "============================================"
echo "  同频 (CoSync) 后端服务部署"
echo "============================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "[错误] Docker 未安装，请先安装 Docker"
    echo "安装命令: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 检查 Docker Compose 是否可用
if ! docker compose version &> /dev/null 2>&1; then
    if ! command -v docker-compose &> /dev/null; then
        echo "[错误] Docker Compose 未安装"
        exit 1
    fi
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

echo "[1/4] 检查环境变量配置..."
if [ ! -f "backend/.env" ]; then
    echo ""
    echo "[提示] 未找到 backend/.env 文件"
    echo "正在从模板创建..."
    cp backend/.env.example backend/.env
    echo ""
    echo "=========================================="
    echo "  请编辑 backend/.env 填写以下必要配置："
    echo "=========================================="
    echo "  - DATABASE_URL    (数据库连接)"
    echo "  - JWT_SECRET      (JWT 密钥)"
    echo "  - ALIYUN_*        (阿里云三要素认证)"
    echo "=========================================="
    echo ""
    echo "编辑完成后重新运行本脚本"
    exit 0
fi

echo "[2/4] 构建 Docker 镜像..."
$COMPOSE_CMD build --no-cache backend

echo "[3/4] 启动所有服务..."
$COMPOSE_CMD up -d mysql redis
echo "等待数据库启动..."
sleep 15

$COMPOSE_CMD up -d backend

echo "[4/4] 检查服务状态..."
sleep 5

# 检查后端健康状态
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/api/health | grep -q '"ok":true'; then
        echo ""
        echo "============================================"
        echo "  部署成功！"
        echo "============================================"
        echo ""
        echo "  后端 API:  http://localhost:3000"
        echo "  健康检查:  http://localhost:3000/api/health"
        echo "  数据库:    localhost:3306"
        echo "  Redis:     localhost:6379"
        echo ""
        echo "  查看日志:  $COMPOSE_CMD logs -f backend"
        echo "  停止服务:  $COMPOSE_CMD down"
        echo "  重启服务:  $COMPOSE_CMD restart"
        echo "============================================"
        exit 0
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "等待后端服务就绪... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
done

echo ""
echo "[警告] 后端服务可能未完全启动，请检查日志："
echo "$COMPOSE_CMD logs backend"
