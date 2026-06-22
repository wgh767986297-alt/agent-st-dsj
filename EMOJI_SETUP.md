# Emoji 图片部署指南（内网环境）

## 概述

本项目已配置为使用本地emoji图片，以支持内网环境部署。emoji图片需要从Twemoji项目下载并放置到项目的public目录中。

## 部署步骤

### 1. 下载Twemoji图片

您需要从Twemoji GitHub仓库下载emoji图片。有以下几种方式：

#### 方式一：使用Git克隆仓库（推荐）

```bash
# 克隆Twemoji仓库
git clone https://github.com/jdecked/twemoji.git

# 进入仓库目录
cd twemoji

# 复制72x72尺寸的图片到项目public目录
cp -r assets/72x72/ [您的项目路径]/public/emoji/
```

#### 方式二：手动下载

1. 访问 https://github.com/jdecked/twemoji
2. 下载最新版本的zip文件
3. 解压后，将 `assets/72x72/` 目录下的所有png文件复制到您项目的 `public/emoji/` 目录

### 2. 创建emoji目录

在您的项目根目录下创建以下目录结构：

```
ai-assistant/
├── public/
│   └── emoji/          # 存放emoji图片
│       ├── 2705.png   # ✅
│       ├── 274C.png   # ❌
│       ├── 26A0.png   # ⚠️
│       └── ...        # 其他emoji图片
├── src/
└── ...
```

### 3. 验证部署

1. 确保所有emoji图片都已正确放置在 `public/emoji/` 目录中
2. 启动项目：`npm run dev` 或 `npm run build`
3. 在聊天界面发送包含emoji的消息，检查是否能正常显示

## 常用Emoji列表

项目中已配置以下常用emoji的转换：

- ✅ 2705.png
- ❌ 274C.png
- ⚠️ 26A0.png
- 📝 1F4DD.png
- 🔄 1F504.png
- 🚀 1F680.png
- 👤 1F464.png
- 💬 1F4AC.png
- 💥 1F4A5.png
- 🛑 1F6D1.png
- ✨ 2728.png
- 📊 1F4CA.png
- 🔍 1F50D.png
- 🔧 1F527.png
- 📋 1F4CB.png
- 📦 1F4E6.png
- 🗑️ 1F5D1.png
- ... (更多emoji请参考 src/utils/emojiConverter.ts 文件)

## 注意事项

1. **图片尺寸**：使用72x72尺寸的图片，这是在清晰度和性能之间的最佳平衡
2. **文件命名**：确保图片文件名与emoji的Unicode码点一致（例如：✅ 对应 2705.png）
3. **权限问题**：确保web服务器有权限读取 `public/emoji/` 目录
4. **缓存问题**：部署后如果emoji不显示，尝试清除浏览器缓存

## 故障排除

### Emoji不显示

1. 检查浏览器控制台是否有404错误，确认图片路径是否正确
2. 确认 `public/emoji/` 目录是否存在且包含所有必需的图片文件
3. 检查web服务器配置，确保静态资源可以正常访问

### 部分Emoji显示，部分不显示

1. 检查缺失的emoji对应的图片文件是否存在
2. 确认文件名是否正确（大小写敏感）
3. 查看浏览器控制台，找到缺失的图片文件名

## 扩展Emoji支持

如果需要支持更多emoji，可以：

1. 在 `src/utils/emojiConverter.ts` 文件的 `emojiMap` 对象中添加新的emoji映射
2. 从Twemoji仓库下载对应的图片文件到 `public/emoji/` 目录
3. 重启应用

## 参考资源

- Twemoji GitHub: https://github.com/jdecked/twemoji
- Twemoji CDN: https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.0.3/
- Emoji Unicode码点查询: https://unicode.org/emoji/charts/full-emoji-list.html
