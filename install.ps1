# CoSync (同频) 后端一键部署脚本 (Windows PowerShell)
# 交互式收集环境变量 -> 生成 .env -> 启动 Docker

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "      CoSync (同频) 后端一键部署助手      " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 docker
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未检测到 Docker。请先安装 Docker Desktop。" -ForegroundColor Red
    exit 1
}

$EnvFile = "backend\.env"
$ExampleFile = "backend\.env.example"

if (-not (Test-Path $ExampleFile)) {
    Write-Host "错误: 找不到 backend\.env.example 模板文件。" -ForegroundColor Red
    exit 1
}

Write-Host "正在配置环境变量..." -ForegroundColor Yellow
Write-Host "请根据提示输入配置信息，按回车确认。如果想使用默认值，直接回车即可。"
Write-Host ""

function Read-Input {
    param(
        [string]$Prompt,
        [string]$DefaultValue
    )
    if ($DefaultValue) {
        $InputVal = Read-Host "$Prompt [默认: $DefaultValue]"
    } else {
        $InputVal = Read-Host "$Prompt"
    }
    
    if ([string]::IsNullOrWhiteSpace($InputVal)) {
        return $DefaultValue
    }
    return $InputVal
}

# --- 收集配置 ---

# 1. 基础配置
$DATABASE_URL = Read-Input "数据库连接串 (DATABASE_URL)" "mysql://root:password@host.docker.internal:3306/cosync"
$OAUTH_SERVER_URL = Read-Input "OAuth 回调域名 (OAUTH_SERVER_URL)" "https://yourdomain.com"
$JWT_SECRET = Read-Input "JWT 密钥 (JWT_SECRET)" -DefaultValue ([Guid]::NewGuid().ToString())
$OWNER_OPEN_ID = Read-Input "项目 Owner OpenID (可选)" "admin_openid"

# 2. 阿里云认证
Write-Host "`n--- 阿里云实人认证配置 ---" -ForegroundColor Yellow
$ALIYUN_ACCESS_KEY = Read-Input "阿里云 AccessKey ID" ""
$ALIYUN_ACCESS_SECRET = Read-Input "阿里云 AccessKey Secret" ""
$ALIYUN_SCENE_ID = Read-Input "实人认证场景 ID (SceneId)" ""
$VERIFY_RETURN_URL = Read-Input "认证回跳地址 (VERIFY_RETURN_URL)" "$OAUTH_SERVER_URL/verify-callback"

# 3. 阿里云短信
Write-Host "`n--- 阿里云短信配置 ---" -ForegroundColor Yellow
$SMS_SIGN_NAME = Read-Input "短信签名 (SignName)" ""
$SMS_TEMPLATE_CODE = Read-Input "短信模板 Code (TemplateCode)" ""
$SMS_ACCESS_KEY_ID = Read-Input "短信 AccessKey ID (留空则复用主AK)" $ALIYUN_ACCESS_KEY
$SMS_ACCESS_KEY_SECRET = Read-Input "短信 AccessKey Secret (留空则复用主AK)" $ALIYUN_ACCESS_SECRET

# 4. 阿里云 OSS
Write-Host "`n--- 阿里云 OSS 配置 (图片上传) ---" -ForegroundColor Yellow
$OSS_BUCKET = Read-Input "OSS Bucket 名称" ""
$OSS_REGION = Read-Input "OSS 区域 (如 oss-cn-hangzhou)" "oss-cn-hangzhou"
$OSS_ACCESS_KEY_ID = Read-Input "OSS AccessKey ID (留空则复用主AK)" $ALIYUN_ACCESS_KEY
$OSS_ACCESS_KEY_SECRET = Read-Input "OSS AccessKey Secret (留空则复用主AK)" $ALIYUN_ACCESS_SECRET

# --- 生成 .env 文件 ---
Write-Host "`n正在生成配置文件..." -ForegroundColor Yellow

# 读取模板内容
$Content = Get-Content $ExampleFile -Raw

# 辅助替换函数
function Set-EnvVar {
    param($Content, $Key, $Value)
    # 简单正则替换：KEY="value" 或 KEY=value
    # 注意：这里假设模板中已有 KEY=... 的占位符，或者我们直接追加
    if ($Content -match "$Key=") {
        $Content = $Content -replace "$Key=.*", "$Key=`"$Value`""
    } else {
        $Content += "`n$Key=`"$Value`""
    }
    return $Content
}

$Content = Set-EnvVar $Content "DATABASE_URL" $DATABASE_URL
$Content = Set-EnvVar $Content "OAUTH_SERVER_URL" $OAUTH_SERVER_URL
$Content = Set-EnvVar $Content "JWT_SECRET" $JWT_SECRET
$Content = Set-EnvVar $Content "OWNER_OPEN_ID" $OWNER_OPEN_ID

$Content = Set-EnvVar $Content "ALIYUN_ACCESS_KEY" $ALIYUN_ACCESS_KEY
$Content = Set-EnvVar $Content "ALIYUN_ACCESS_SECRET" $ALIYUN_ACCESS_SECRET
$Content = Set-EnvVar $Content "ALIYUN_SCENE_ID" $ALIYUN_SCENE_ID
$Content = Set-EnvVar $Content "VERIFY_RETURN_URL" $VERIFY_RETURN_URL

$Content = Set-EnvVar $Content "SMS_SIGN_NAME" $SMS_SIGN_NAME
$Content = Set-EnvVar $Content "SMS_TEMPLATE_CODE" $SMS_TEMPLATE_CODE
$Content = Set-EnvVar $Content "SMS_ACCESS_KEY_ID" $SMS_ACCESS_KEY_ID
$Content = Set-EnvVar $Content "SMS_ACCESS_KEY_SECRET" $SMS_ACCESS_KEY_SECRET

$Content = Set-EnvVar $Content "OSS_BUCKET" $OSS_BUCKET
$Content = Set-EnvVar $Content "OSS_REGION" $OSS_REGION
$Content = Set-EnvVar $Content "OSS_ACCESS_KEY_ID" $OSS_ACCESS_KEY_ID
$Content = Set-EnvVar $Content "OSS_ACCESS_KEY_SECRET" $OSS_ACCESS_KEY_SECRET

# 固定值
$Content = Set-EnvVar $Content "VITE_APP_ID" "cosync_app"
$Content = Set-EnvVar $Content "NODE_ENV" "production"

# 写入文件
$Content | Set-Content $EnvFile -Encoding UTF8
Write-Host "配置文件 backend\.env 生成成功！" -ForegroundColor Green

# --- 启动 Docker ---
Write-Host "`n准备启动 Docker 容器..." -ForegroundColor Yellow

# 检查端口 (PowerShell 方式)
$PortOpen = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($PortOpen) {
    Write-Host "警告: 端口 3000 似乎已被占用。Docker 启动可能会失败。" -ForegroundColor Yellow
    $Confirm = Read-Host "是否继续? (y/n)"
    if ($Confirm -ne "y") {
        exit 1
    }
}

docker compose up -d --build

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "   CoSync 后端部署成功！   " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "API 地址: http://localhost:3000"
Write-Host "健康检查: http://localhost:3000/api/health"
Write-Host "查看日志: docker compose logs -f"
