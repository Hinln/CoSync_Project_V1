#!/bin/bash

# CoSync 后端一键部署脚本
# 交互式收集环境变量 -> 生成 .env -> 启动 Docker

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}      CoSync (同频) 后端一键部署助手      ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 检查 docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未检测到 Docker。请先安装 Docker 和 Docker Compose。${NC}"
    exit 1
fi

ENV_FILE="backend/.env"
EXAMPLE_FILE="backend/.env.example"

# 确保 .env.example 存在
if [ ! -f "$EXAMPLE_FILE" ]; then
    echo -e "${RED}错误: 找不到 backend/.env.example 模板文件。请确认你在项目根目录下运行此脚本。${NC}"
    exit 1
fi

echo -e "${YELLOW}正在配置环境变量...${NC}"
echo -e "请根据提示输入配置信息，按回车确认。如果想使用默认值（如果有），直接回车即可。"
echo ""

# 读取函数
read_input() {
    local prompt="$1"
    local var_name="$2"
    local default_val="$3"
    
    local input_val
    if [ -n "$default_val" ]; then
        read -p "$(echo -e "${GREEN}$prompt${NC} [默认: $default_val]: ")" input_val
    else
        read -p "$(echo -e "${GREEN}$prompt${NC}: ")" input_val
    fi
    
    if [ -z "$input_val" ]; then
        input_val="$default_val"
    fi
    
    # 导出变量供 envsubst 使用（如果有）或者直接写入
    export "$var_name"="$input_val"
    eval "$var_name=\"$input_val\""
}

# --- 收集配置 ---

# 1. 基础配置
read_input "数据库连接串 (DATABASE_URL)" "DATABASE_URL" "mysql://root:password@host.docker.internal:3306/cosync"
read_input "OAuth 回调域名 (OAUTH_SERVER_URL)" "OAUTH_SERVER_URL" "https://yourdomain.com"
read_input "JWT 密钥 (JWT_SECRET)" "JWT_SECRET" "$(openssl rand -hex 32)"
read_input "项目 Owner OpenID (可选)" "OWNER_OPEN_ID" "admin_openid"

# 2. 阿里云认证
echo -e "\n${YELLOW}--- 阿里云实人认证配置 ---${NC}"
read_input "阿里云 AccessKey ID" "ALIYUN_ACCESS_KEY" ""
read_input "阿里云 AccessKey Secret" "ALIYUN_ACCESS_SECRET" ""
read_input "实人认证场景 ID (SceneId)" "ALIYUN_SCENE_ID" ""
read_input "认证回跳地址 (VERIFY_RETURN_URL)" "VERIFY_RETURN_URL" "${OAUTH_SERVER_URL}/verify-callback"

# 3. 阿里云短信
echo -e "\n${YELLOW}--- 阿里云短信配置 ---${NC}"
read_input "短信签名 (SignName)" "SMS_SIGN_NAME" ""
read_input "短信模板 Code (TemplateCode)" "SMS_TEMPLATE_CODE" ""
# 默认复用主 AK，但也允许覆盖
read_input "短信 AccessKey ID (留空则复用主AK)" "SMS_ACCESS_KEY_ID" "$ALIYUN_ACCESS_KEY"
read_input "短信 AccessKey Secret (留空则复用主AK)" "SMS_ACCESS_KEY_SECRET" "$ALIYUN_ACCESS_SECRET"

# 4. 阿里云 OSS
echo -e "\n${YELLOW}--- 阿里云 OSS 配置 (图片上传) ---${NC}"
read_input "OSS Bucket 名称" "OSS_BUCKET" ""
read_input "OSS 区域 (如 oss-cn-hangzhou)" "OSS_REGION" "oss-cn-hangzhou"
read_input "OSS AccessKey ID (留空则复用主AK)" "OSS_ACCESS_KEY_ID" "$ALIYUN_ACCESS_KEY"
read_input "OSS AccessKey Secret (留空则复用主AK)" "OSS_ACCESS_KEY_SECRET" "$ALIYUN_ACCESS_SECRET"

# --- 生成 .env 文件 ---
echo -e "\n${YELLOW}正在生成配置文件...${NC}"

# 复制模板
cp "$EXAMPLE_FILE" "$ENV_FILE"

# 逐行替换 (使用 sed 适配不同系统)
# 辅助函数：替换 .env 中的 KEY=VALUE
set_env() {
    local key="$1"
    local val="$2"
    # 转义特殊字符
    val=$(echo "$val" | sed -e 's/[\/&]/\\&/g')
    
    if grep -q "^$key=" "$ENV_FILE"; then
        # 如果存在，替换
        # macOS 和 Linux sed 语法略有不同，这里使用兼容写法
        sed -i.bak "s/^$key=.*/$key=\"$val\"/" "$ENV_FILE" && rm "$ENV_FILE.bak"
    else
        # 如果不存在，追加
        echo "$key=\"$val\"" >> "$ENV_FILE"
    fi
}

set_env "DATABASE_URL" "$DATABASE_URL"
set_env "OAUTH_SERVER_URL" "$OAUTH_SERVER_URL"
set_env "JWT_SECRET" "$JWT_SECRET"
set_env "OWNER_OPEN_ID" "$OWNER_OPEN_ID"

set_env "ALIYUN_ACCESS_KEY" "$ALIYUN_ACCESS_KEY"
set_env "ALIYUN_ACCESS_SECRET" "$ALIYUN_ACCESS_SECRET"
set_env "ALIYUN_SCENE_ID" "$ALIYUN_SCENE_ID"
set_env "VERIFY_RETURN_URL" "$VERIFY_RETURN_URL"

set_env "SMS_SIGN_NAME" "$SMS_SIGN_NAME"
set_env "SMS_TEMPLATE_CODE" "$SMS_TEMPLATE_CODE"
set_env "SMS_ACCESS_KEY_ID" "$SMS_ACCESS_KEY_ID"
set_env "SMS_ACCESS_KEY_SECRET" "$SMS_ACCESS_KEY_SECRET"

set_env "OSS_BUCKET" "$OSS_BUCKET"
set_env "OSS_REGION" "$OSS_REGION"
set_env "OSS_ACCESS_KEY_ID" "$OSS_ACCESS_KEY_ID"
set_env "OSS_ACCESS_KEY_SECRET" "$OSS_ACCESS_KEY_SECRET"

# 固定值
set_env "VITE_APP_ID" "cosync_app"
set_env "NODE_ENV" "production"

echo -e "${GREEN}配置文件 backend/.env 生成成功！${NC}"

# --- 启动 Docker ---
echo -e "\n${YELLOW}准备启动 Docker 容器...${NC}"
echo -e "正在拉取镜像并构建..."

# 检查端口占用
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}警告: 端口 3000 似乎已被占用。Docker 启动可能会失败。${NC}"
    read -p "是否继续? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

docker compose up -d --build

echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}   CoSync 后端部署成功！   ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "API 地址: http://localhost:3000"
echo -e "健康检查: http://localhost:3000/api/health"
echo -e "查看日志: docker compose logs -f"
