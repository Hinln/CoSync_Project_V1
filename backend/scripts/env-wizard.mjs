import fs from "fs";
import path from "path";
import readline from "readline";
import crypto from "crypto";
import { execSync } from "child_process";
import axios from "axios";
import mysql from "mysql2/promise";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, d = "") => new Promise((resolve) => rl.question(d ? `${q} [${d}]: ` : `${q}: `, (a) => resolve(a || d)));

const run = async () => {
  const backendPort = await ask("后端对外服务端口：", "3000");
  const dbHost = await ask("数据库主机或 IP：", "127.0.0.1");
  const dbPort = await ask("数据库端口：", "3306");
  const dbName = await ask("数据库名称：", "cosync");
  const dbUser = await ask("数据库用户名：", "cosync_user");
  const dbPass = await ask("数据库密码：", "cosync_pass");
  const jwtSecret = await ask("JWT 签名密钥（留空自动生成）：", crypto.randomBytes(32).toString("hex"));
  const aliyunKey = await ask("阿里云认证 AccessKeyId：");
  const aliyunSecret = await ask("阿里云认证 AccessKeySecret：");
  const aliyunScene = await ask("阿里云认证场景ID：");
  const aliyunRegion = await ask("阿里云认证 RegionId（如 ap-southeast-1）：", "ap-southeast-1");
  const domain = await ask("站点域名（如 https://yourdomain.com）：", "https://yourdomain.com");
  const verifyReturn = await ask("认证回跳地址（如 https://yourdomain.com/verify-callback）：", `${domain}/verify-callback`);
  const appId = await ask("应用 ID：", "cosync_app");
  const ownerOpenId = await ask("项目所有者 OpenID：", "owner_open_id");
  const smsAk = await ask("阿里云短信 AccessKeyId（通常与上面一致）：", aliyunKey);
  const smsSk = await ask("阿里云短信 AccessKeySecret（通常与上面一致）：", aliyunSecret);
  const smsSignName = await ask("阿里云短信签名（SignName）：", "");
  const smsTemplateCode = await ask("阿里云短信模板编码（TemplateCode）：", "");
  const ossBucket = await ask("OSS 桶名（可选）：", "");
  const ossRegion = await ask("OSS 区域（如 oss-cn-shanghai，可选）：", "");
  const ossEndpoint = await ask("OSS 访问地址（如 https://oss-cn-shanghai.aliyuncs.com，可选）：", "");
  const ossAk = await ask("OSS AccessKeyId（可选）：", "");
  const ossSk = await ask("OSS AccessKeySecret（可选）：", "");
  const forgeUrl = await ask("内置 Forge 服务地址（可选）：", "");
  const forgeKey = await ask("Forge 服务 API Key（可选）：", "");

  const env = [
    `DATABASE_URL=mysql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`,
    `JWT_SECRET=${jwtSecret}`,
    `ALIYUN_ACCESS_KEY=${aliyunKey}`,
    `ALIYUN_ACCESS_SECRET=${aliyunSecret}`,
    `ALIYUN_SCENE_ID=${aliyunScene}`,
    `ALIYUN_REGION=${aliyunRegion}`,
    `VERIFY_RETURN_URL=${verifyReturn}`,
    `VITE_APP_ID=${appId}`,
    `OAUTH_SERVER_URL=${domain}`,
    `OWNER_OPEN_ID=${ownerOpenId}`,
    `SMS_ACCESS_KEY_ID=${smsAk}`,
    `SMS_ACCESS_KEY_SECRET=${smsSk}`,
    `SMS_SIGN_NAME=${smsSignName}`,
    `SMS_TEMPLATE_CODE=${smsTemplateCode}`,
    forgeUrl ? `BUILT_IN_FORGE_API_URL=${forgeUrl}` : ``,
    forgeKey ? `BUILT_IN_FORGE_API_KEY=${forgeKey}` : ``,
    ossBucket ? `OSS_BUCKET=${ossBucket}` : ``,
    ossRegion ? `OSS_REGION=${ossRegion}` : ``,
    ossEndpoint ? `OSS_ENDPOINT=${ossEndpoint}` : ``,
    ossAk ? `OSS_ACCESS_KEY_ID=${ossAk}` : ``,
    ossSk ? `OSS_ACCESS_KEY_SECRET=${ossSk}` : ``,
    `PORT=3000`,
    `NODE_ENV=production`,
  ].filter(Boolean).join("\n") + "\n";

  const backendEnvPath = path.resolve(process.cwd(), ".env");
  fs.writeFileSync(backendEnvPath, env);
  console.log("已写入:", backendEnvPath);

  const rootEnvPath = path.resolve(process.cwd(), "../.env");
  const rootEnv = [`BACKEND_PORT=${backendPort}`].join("\n") + "\n";
  fs.writeFileSync(rootEnvPath, rootEnv);
  console.log("已写入:", rootEnvPath);

  try {
    const conn = await mysql.createConnection(`mysql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`);
    await conn.query("SELECT 1");
    await conn.end();
    console.log("数据库连接成功");
  } catch (e) {
    console.error("数据库连接失败:", e.message);
    rl.close();
    process.exit(1);
  }

  try {
    execSync("pnpm db:push", { stdio: "inherit", cwd: process.cwd() });
    console.log("数据库迁移完成");
  } catch {
    console.error("数据库迁移失败");
    rl.close();
    process.exit(1);
  }

  try {
    execSync("pnpm build", { stdio: "inherit", cwd: process.cwd() });
    console.log("后端构建完成");
  } catch {
    console.error("后端构建失败");
    rl.close();
    process.exit(1);
  }

  try {
    execSync("docker compose up -d", { stdio: "inherit", cwd: path.resolve(process.cwd(), "..") });
    console.log("后端容器已启动");
  } catch {
    console.error("容器启动失败，尝试本地启动");
    execSync("pnpm start", { stdio: "inherit", cwd: process.cwd() });
  }

  try {
    const url = `http://127.0.0.1:${backendPort}/api/health`;
    let ok = false;
    for (let i = 0; i < 10; i++) {
      try {
        const res = await axios.get(url, { timeout: 8000 });
        if (res.status === 200) {
          console.log("健康检查通过:", url);
          ok = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!ok) console.error("健康检查失败");
  } catch (e) {
    console.error("健康检查错误:", e.message);
  }
  rl.close();
};

run();
