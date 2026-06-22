# 功能API配置说明

## 概述

本项目支持9个功能模块，每个模块对应不同的API接口：

1. **穿透分析 (ctfx)** - 情报线索穿透分析
2. **形式研判 (xsyp)** - 形势研判分析
3. **警情案件 (jqaj)** - 警情案件分析
4. **群体防范 (qtff)** - 群体性事件防范
5. **专题分析 (ztfx)** - 专题分析报告
6. **值班要情 (zbyq)** - 值班要情报告
7. **人员档案 (ryda)** - 人员档案查询
8. **智能调度 (zndd)** - 智能调度预案
9. **群体聚集 (qtjj)** - 群体聚集事件分析

## 配置步骤

### 1. 环境变量配置

复制 `.env.example` 为 `.env` 文件，并填入实际的API token：

```bash
cp .env.example .env
```

编辑 `.env` 文件，替换所有 `your_*_token_here` 为实际的API token。

### 2. API配置结构

所有API配置位于 `src/api/functionApis.ts` 中，每个配置包含：

- `id`: 功能ID
- `label`: 显示标签
- `url`: API端点URL
- `auth`: 认证头 (Bearer token)
- `inputs`: 请求参数构建函数
- `description`: 功能描述

### 3. 类型定义

API相关类型定义在 `src/types/api.ts` 中：

- `FunctionApiConfig`: 功能API配置接口
- `ApiRequestBody`: API请求体接口
- `StreamingResponse`: 流式响应接口

## 使用方法

### 在组件中使用

```typescript
import { getFunctionButtons, getApiConfig } from '@/api/functionApis'
import { functionApiServices } from '@/api/functionApiServices'

// 获取所有功能按钮
const buttons = getFunctionButtons()

// 获取特定功能的配置
const config = getApiConfig('ctfx')

// 调用功能API
await functionApiServices.callFunctionApi(
  'ctfx',
  '查询内容',
  (delta, type, metadata) => {
    // 处理流式数据块
    console.log('收到数据:', delta)
  },
  () => {
    // 完成回调
    console.log('API调用完成')
  },
  (error) => {
    // 错误回调
    console.error('API调用失败:', error)
  },
)
```

### 验证配置

```typescript
// 验证API配置是否有效
const isValid = functionApiServices.validateApiConfig('ctfx')
console.log('配置有效:', isValid)
```

## 注意事项

1. **Token安全**: 确保API token不会被提交到版本控制系统
2. **环境变量**: 生产环境中使用实际的环境变量配置
3. **错误处理**: API调用失败时会自动回退到通用问答接口
4. **流式响应**: 所有功能API都支持流式响应，提升用户体验

## 故障排除

- 如果API调用失败，检查token是否正确配置
- 确认网络连接和API端点URL是否可访问
- 查看浏览器控制台的错误信息
