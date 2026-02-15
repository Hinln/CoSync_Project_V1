# CoSync (同频) - 寻找属于你的频率

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/version-v1.0.0-blue)](https://github.com/Hinln/CoSync_Project_V1)

**CoSync (同频)** 是一款专为年轻人打造的开源匿名社交平台。我们相信匿名社交不应是虚假和骚扰的温床，通过引入金融级实人认证逻辑，我们在保护用户隐私的同时，确保了社交环境的真实与纯净。

---

## ✨ 项目亮点

- 🛡️ **安全先行**：集成阿里云金融级实人认证，从源头杜绝机器人与虚假账号。
- 🕵️ **深度匿名**：自研身份混淆逻辑，让交流回归内容本身。
- ⚡ **现代架构**：前端采用 Expo (React Native) 跨平台方案，后端基于 tRPC + Drizzle ORM，极致的类型安全体验。
- 🐳 **一键部署**：完整的 Docker 容器化支持，配合自动化部署脚本。

---

## 🛠️ 技术栈

### 前端 (Mobile)
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS)
- **State Management**: React Query (TanStack Query)

### 后端 (Server)
- **Runtime**: Node.js
- **Framework**: tRPC / Express
- **ORM**: Drizzle ORM
- **Database**: MySQL
- **Security**: JWT + 阿里云金融级人脸实人认证 + 阿里云短信

---

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/Hinln/CoSync_Project_V1.git
cd CoSync_Project_V1
```
2. 环境配置
在 backend 目录下，根据模板创建你的环境变量文件：
```bash
cp backend/.env.example backend/.env
```
注意：你需要在阿里云控制台申请认证与短信的 AccessKey，并按 .env.example 填写。

3. 一键启动 (Docker)
我们提供了部署脚本：
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📅 路线图 (Roadmap)
- [x] V1 核心架构搭建
- [x] 阿里云金融级人脸实人认证流程集成
- [x] 短信验证码登录与手机号换绑（阿里云短信）
- [ ] 实时聊天加密升级
- [ ] 基于兴趣算法的“频率匹配”功能
- [ ] AI 辅助内容审核

🤝 贡献说明
欢迎任何形式的 Pull Request 或 Issue！
如果你在使用过程中发现了 Bug，或者有更好的创意，请随时通过 Issue 与我联系。

📄 开源协议
本项目采用 MIT License 协议。
