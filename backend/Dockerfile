# ============================================================
# 同频 (CoSync) 后端服务 Dockerfile
# 多阶段构建：构建阶段 + 生产运行阶段
# ============================================================

# ==================== 构建阶段 ====================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9.12.0

# 复制依赖文件
COPY package.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN pnpm install --frozen-lockfile || pnpm install

# 复制源代码
COPY . .

# 构建后端服务
RUN pnpm build

# ==================== 生产运行阶段 ====================
FROM node:20-alpine AS production

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9.12.0

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 复制依赖文件
COPY package.json ./

# 仅安装生产依赖
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# 从构建阶段复制编译产物
COPY --from=builder /app/dist ./dist

# 复制 drizzle 迁移文件（用于数据库初始化）
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

# 复制共享类型
COPY shared ./shared

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 启动服务
CMD ["node", "dist/index.js"]
