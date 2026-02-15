# CoSync 项目部署填写清单

以下为项目在部署前需补充/核对的配置项。请逐项填写并保存。带“是”的必须填写，未填会导致后端无法启动或功能不可用。

| 项目位置 | 键/项名 | 必填 | 说明 | 示例/格式 |
|---|---|---|---|---|
| backend/.env | DATABASE_URL | 是 | MySQL 连接字符串，容器内主机名用 mysql | mysql://cosync_user:cosync_pass_2026@mysql:3306/cosync |
| backend/.env | JWT_SECRET | 是 | 后端会话签名密钥 | 64位hex，例：openssl rand -hex 32 |
| backend/.env | ALIYUN_ACCESS_KEY | 是 | 阿里云实人认证 AccessKeyId | 字符串 |
| backend/.env | ALIYUN_ACCESS_SECRET | 是 | 阿里云实人认证 AccessKeySecret | 字符串 |
| backend/.env | ALIYUN_SCENE_ID | 是 | 阿里云实人认证场景 ID | 数字或数字字符串 |
| backend/.env | VERIFY_RETURN_URL | 是 | 认证成功回跳地址（你的域名） | https://yourdomain.com/verify-callback |
| backend/.env | VITE_APP_ID | 是 | OAuth 应用 ID（前后端共享） | 字符串 |
| backend/.env | OAUTH_SERVER_URL | 是 | OAuth 服务后端地址 | https://yourdomain.com |
| backend/.env | OWNER_OPEN_ID | 是 | 项目所有者 OpenID | 字符串 |
| backend/.env | BUILT_IN_FORGE_API_URL | 否 | 内置服务基址（LLM/存储/图像/语音/通知） | https://api.manusforge.example |
| backend/.env | BUILT_IN_FORGE_API_KEY | 否 | 内置服务 API Key | 字符串 |
| backend/.env | OSS_ACCESS_KEY_ID | 否 | OSS 存储 AccessKeyId | 字符串 |
| backend/.env | OSS_ACCESS_KEY_SECRET | 否 | OSS 存储 AccessKeySecret | 字符串 |
| backend/.env | OSS_BUCKET | 否 | OSS 存储桶名称 | cosync-uploads |
| backend/.env | OSS_REGION | 否 | OSS 区域 | oss-cn-hangzhou |
| backend/.env | OSS_ENDPOINT | 否 | OSS 端点 | https://oss-cn-hangzhou.aliyuncs.com |
| docker-compose.yml | MYSQL_ROOT_PASSWORD | 建议 | 数据库 root 密码（仅容器） | 自定义强密码 |
| docker-compose.yml | MYSQL_DATABASE | 建议 | 业务数据库名 | cosync |
| docker-compose.yml | MYSQL_USER | 建议 | 业务数据库用户 | cosync_user |
| docker-compose.yml | MYSQL_PASSWORD | 建议 | 业务数据库用户密码 | cosync_pass_2026 |
| docker-compose.yml | BACKEND_PORT | 否 | 后端对外映射端口 | 3000 |
| docker-compose.yml | MYSQL_PORT | 否 | MySQL 对外映射端口 | 3306 |
| docker-compose.yml | REDIS_PORT | 否 | Redis 对外映射端口 | 6379 |
| docker-compose.yml | NGINX_HTTP_PORT | 否 | Nginx HTTP 端口 | 80 |
| docker-compose.yml | NGINX_HTTPS_PORT | 否 | Nginx HTTPS 端口 | 443 |
| nginx/nginx.conf | server_name | 建议 | 站点域名 | yourdomain.com |
| nginx/nginx.conf | ssl_certificate/ssl_certificate_key | 视情况 | HTTPS 证书与私钥路径 | /etc/nginx/ssl/fullchain.pem / /etc/nginx/ssl/privkey.pem |
| 项目根 .env | VITE_APP_ID | 建议 | 映射到 EXPO_PUBLIC_APP_ID | 与 backend/.env 一致 |
| 项目根 .env | VITE_OAUTH_PORTAL_URL | 建议 | 映射到 EXPO_PUBLIC_OAUTH_PORTAL_URL | 你的登录门户 URL |
| 项目根 .env | OAUTH_SERVER_URL | 建议 | 映射到 EXPO_PUBLIC_OAUTH_SERVER_URL | https://yourdomain.com |
| 项目根 .env | OWNER_OPEN_ID | 建议 | 映射到 EXPO_PUBLIC_OWNER_OPEN_ID | 字符串 |
| 项目根 .env | OWNER_NAME | 否 | 映射到 EXPO_PUBLIC_OWNER_NAME | 显示名 |
| 项目根 .env | EXPO_PUBLIC_API_BASE_URL | 建议 | 前端请求 API 基础地址 | https://yourdomain.com |
| backend/server/_core/oauth.ts | EXPO_WEB_PREVIEW_URL | 否 | 前端 Web 预览地址（开发） | http://localhost:8081 |
| backend/server/_core/oauth.ts | EXPO_PACKAGER_PROXY_URL | 否 | Expo 打包代理地址（开发） | http://localhost:8081 |

## 一致性与校验提示
- Compose 与 backend/.env 的数据库凭证必须一致：MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE ↔ DATABASE_URL。
- ALIYUN_* 与 VERIFY_RETURN_URL 为强校验项，未填将阻止后端启动（env.ts 中 zod 校验）。
- 前端公共变量建议通过项目根 .env 设置，再由 frontend/scripts/load-env.js 自动映射到 EXPO_PUBLIC_*；EXPO_PUBLIC_API_BASE_URL需直接填写。
- 如启用 HTTPS 与反代，请在 OpenResty/Nginx 配置中正确填写证书路径与域名，并反代 /api 到后端 3000。
