# AI助手 - 内网部署指南

## 📋 概述

本项目已配置为支持内网环境部署，所有外网地址依赖都已通过环境变量配置化。

## ⚠️ 重要说明：生产环境 API 代理配置

**核心问题**：Vite 的 `server.proxy` 配置**仅在开发环境（`npm run dev`）生效**，在生产环境（构建后的静态文件）中不生效。

**解决方案**：

- **聊天 API**：通过 Nginx 反向代理处理
- **功能 API**：直接调用后端服务（不经过 Nginx 代理）

### 前端配置（已完成）✅

`.env.production` 中的配置：

```bash
# 聊天 API - 使用相对路径，由 Nginx 代理
VITE_CHAT_API_BASE=/chatApi

# 功能 API - 使用完整 URL，直接调用后端服务
VITE_FUNCTION_API_BASE=http://50.18.22.180:8083
```

### Nginx 配置（需要您配置）🔧

在 Nginx 配置文件中添加以下代理规则：

```nginx
server {
    listen 811;
    server_name localhost;

    # 前端静态文件根目录（修改为您的实际路径）
    root /path/to/ai-assistant/dist;
    index index.html;

    # ✅ 聊天 API 代理
    location /chatApi/ {
        proxy_pass http://10.32.71.223:19000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（流式响应需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 关闭缓冲（流式响应必需）
        proxy_buffering off;
    }

    # ⚠️ 注意：功能接口（VITE_FUNCTION_API_BASE）直接调用后端服务，不经过 Nginx 代理
    # 如果需要代理功能接口，取消下面的注释并配置正确的后端地址
    # location /api/ {
    #     proxy_pass http://50.18.22.180:8083/;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    # }

    # ✅ 前端路由 fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

参考配置文件：`nginx.conf.example`

## 🔧 环境配置

### 1. 创建环境配置文件

复制 `.env.example` 为 `.env` 文件：

```bash
cp .env.example .env
```

### 2. 配置内网地址

编辑 `.env.production` 文件，设置您的内网服务地址：

```bash
# ============ API基础地址 ============
# 聊天API基础地址 -> 使用相对路径，由 Nginx 代理
VITE_CHAT_API_BASE=/chatApi

# 功能API基础地址 -> 使用完整URL，直接调用后端服务（不经过Nginx代理）
VITE_FUNCTION_API_BASE=http://50.18.22.180:8083

# 登录API地址
VITE_LOGIN_API_URL=http://your-intranet-login-server:8083/qbpt/qbpt/login_kfdl.xhtml

# ============ 功能API认证Token配置 ============
# 根据您的内网服务配置相应的token
VITE_DIFY_CTFX_TOKEN=Bearer your_ctfx_token_here
VITE_DIFY_XSYP_TOKEN=Bearer your_xsyp_token_here
# ... 其他token配置
```

**重要说明**：

- ✅ **聊天 API**：使用相对路径 `/chatApi`，通过 Nginx 代理转发
- ✅ **功能 API**：使用完整 URL `http://50.18.22.180:8083`，前端直接调用后端服务
- ⚠️ 功能接口最终请求地址会是：`http://50.18.22.180:8083/dify_new`

### 3. Vite代理配置（仅开发环境）

如果需要通过代理访问API服务，请在 `vite.config.ts` 中确认代理配置正确：

```typescript
server: {
  proxy: {
    '^/chatApi(/.*)?$': {
      target: 'http://10.32.71.223:19000',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/chatApi/, ''),
    },
    '^/apiAI(/.*)?$': {
      target: 'http://your-intranet-proxy-server:18789',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/apiAI(?:\/|$)/, '/'),
    }
  }
}
```

## 🚀 部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 清理缓存并重新构建

**重要**：修改 `.env.production` 后必须清理缓存并重新构建：

```bash
# 删除构建缓存和输出目录
rm -rf node_modules/.vite dist

# 重新构建
npm run build
```

### 3. 部署静态文件

将 `dist` 目录下的文件上传到服务器的指定目录（如 `/usr/share/nginx/html/ai-assistant/`）。

### 4. 配置 Nginx

1. 编辑 Nginx 配置文件（通常在 `/etc/nginx/conf.d/` 或 `/etc/nginx/sites-available/`）
2. 添加上述代理配置
3. 测试配置语法：`nginx -t`
4. 重载配置：`nginx -s reload`

### Nginx配置示例

完整配置请参考 `nginx.conf.example` 文件。

```nginx
server {
    listen 811;
    server_name localhost;
    root /path/to/dist;
    index index.html;

    # 聊天 API 代理
    location /chatApi/ {
        proxy_pass http://10.32.71.223:19000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;  # 流式响应必需
    }

    # 前端路由 fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔍 地址依赖检查清单

### ✅ 已配置化的地址：

1. **聊天API** (`src/api/chat.ts`)
   - 聊天接口: `${VITE_CHAT_API_BASE}/chat` → `/chatApi/chat`
   - 中止接口: `${VITE_CHAT_API_BASE}/abort` → `/chatApi/abort`
   - 文件上传: `${VITE_CHAT_API_BASE}/upload` → `/chatApi/upload`
   - 文件删除: `${VITE_CHAT_API_BASE}/upload/{fileId}` → `/chatApi/upload/{fileId}`

2. **功能API** (`src/api/functionApis.ts`)
   - 所有9个功能模块都使用: `${VITE_FUNCTION_API_BASE}/v1/workflows/run` 或 `${VITE_FUNCTION_API_BASE}/dify_new`

3. **登录API** (`src/views/LoginView.vue`)
   - 登录接口: `VITE_LOGIN_API_URL`

4. **Vite代理** (`vite.config.ts`)
   - 开发环境代理目标: `VITE_CHAT_API_BASE`

### ⚠️ 注意事项：

1. **生产环境必须配置 Nginx 反向代理**：Vite 代理仅开发环境有效
2. **Token安全**: 确保API token不会被提交到版本控制系统
3. **HTTPS**: 内网环境如需HTTPS，请相应配置Web服务器
4. **跨域**: 使用 Nginx 代理后无需额外配置 CORS（同源）
5. **防火墙**: 确保内网防火墙允许相关端口通信
6. **流式响应**：必须设置 `proxy_buffering off;` 否则会出现卡顿

## 🧪 测试验证

部署完成后，验证以下功能：

1. ✅ 登录功能正常
2. ✅ AI聊天功能正常（检查浏览器 Network 面板，请求地址应为 `http://your-server:811/chatApi/chat`）
3. ✅ 文件上传功能正常
4. ✅ 所有9个功能模块都能正常调用
5. ✅ 历史记录保存和加载正常

### 常见问题排查

**问题**：请求地址变成 `http://localhost:811/10.32.71.223:19000/chat`

**原因**：

1. `.env.production` 中配置了不带协议头的 IP 地址
2. 未配置 Nginx 反向代理

**解决**：

1. 修改 `.env.production`：`VITE_CHAT_API_BASE=/chatApi`
2. 配置 Nginx 代理规则
3. 重新构建并部署

## 📞 技术支持

如遇部署问题，请检查：

1. 环境变量配置是否正确（使用相对路径）
2. Nginx 配置是否正确（执行 `nginx -t` 检查）
3. 后端服务是否可访问
4. 网络连接是否正常
5. 浏览器控制台是否有错误信息
6. Nginx 错误日志：`tail -f /var/log/nginx/error.log`
