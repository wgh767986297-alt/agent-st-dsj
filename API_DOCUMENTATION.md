# NTJK API 接口文档

## 概述

数据接口系统，提供数字警员、技能、MCP 服务的管理和授权功能。

**基本信息**:

- **基础 URL**: `http://50.18.22.92:8082/dsjpt/jk`
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **认证方式**: Token (JWT)

---

## 认证说明

### Token 获取

登录后在响应头中获取 Token：

```http
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token 使用

所有需要认证的接口需在请求头中携带 Token：

```http
token: <your_token>
```

### Token 有效期

- **默认有效期**: 24 小时
- **自动刷新**: 每次请求自动刷新有效期

---

## 接口分类

### 1. 基础接口

#### 1.1 用户注册

**接口**: `POST /register.xhtml`

**权限**: 公开

**请求参数**:

```json
{
  "user_account": "zhangsan",
  "password": "password123",
  "name": "张三",
  "id_card": "320102199001011234",
  "phone": "13800138000",
  "company": "江苏省公安厅",
  "department": "情报指挥中心"
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "注册成功",
  "data": {
    "id": 123
  }
}
```

---

#### 1.2 用户登录

**接口**: `POST /login.xhtml`

**权限**: 公开

**请求参数**:

```json
{
  "user_account": "zhangsan",
  "password": "password123"
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "登录成功",
  "data": {
    "id": 123,
    "user_account": "zhangsan",
    "name": "张三",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### 1.3 获取用户信息

**接口**: `POST /profile.xhtml`

**权限**: 登录用户

**请求参数**:

```json
{
  "id": 123
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "id": 123,
    "user_account": "zhangsan",
    "name": "张三",
    "department": "情报指挥中心"
  }
}
```

---

### 2. 部门管理接口（超级管理员）

#### 2.1 创建部门

**接口**: `POST /dept/create.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "dept_code": "dept001",
  "dept_name": "情报指挥中心",
  "parent_id": null,
  "admin_id": 123,
  "user_quota": 100,
  "status": "01"
}
```

**说明**:

- `admin_id`: 部门管理员用户 ID，创建后会自动分配部门管理员角色
- 如果指定了 `admin_id`，会自动为该用户分配部门管理员角色并关联到该部门

---

#### 2.2 部门列表

**接口**: `POST /dept/list.xhtml`

**权限**: 登录用户

**请求参数**:

```json
{
  "parent_id": null,
  "level": 1
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": [
    {
      "id": 1,
      "dept_code": "DEFAULT",
      "dept_name": "默认中心"
    }
  ]
}
```

---

### 3. 数字警员管理接口（两级审核）

#### 3.1 创建数字警员

**接口**: `POST /officer/create.xhtml`

**权限**: 登录用户

**请求参数**:

```json
{
  "officer_name": "小智",
  "description": "智能问答警员",
  "avatar_url": "http://example.com/avatar.png",
  "config": {
    "welcome_message": "您好，我是小智"
  },
  "is_public": false
}
```

**说明**:

- 创建后状态：`dept_audit_status='00'`（待部门审核）
- 部门 ID 自动从当前用户获取

**响应示例**:

```json
{
  "status": "succeed",
  "message": "数字警员创建成功，已提交部门管理员审核",
  "data": {
    "id": 123
  }
}
```

---

#### 3.2 部门审核数字警员

**接口**: `POST /officer/deptAudit.xhtml`

**权限**: 部门管理员

**请求参数**:

```json
{
  "id": 123,
  "dept_audit_status": "01",
  "dept_audit_remark": "符合上架要求"
}
```

**审核状态**:

- `dept_audit_status='01'`: 审核通过（提交超级管理员审核）
- `dept_audit_status='02'`: 审核拒绝

**响应示例**:

```json
{
  "status": "succeed",
  "message": "部门审核通过，已提交超级管理员审核"
}
```

---

#### 3.3 超级管理员审核数字警员

**接口**: `POST /officer/superAudit.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 123,
  "super_audit_status": "01",
  "super_audit_remark": "同意上架"
}
```

**前置条件**: 部门审核必须已通过（`dept_audit_status='01'`）

**审核状态**:

- `super_audit_status='01'`: 审核通过（创建者可以上架）
- `super_audit_status='02'`: 审核拒绝

**响应示例**:

```json
{
  "status": "succeed",
  "message": "审核通过，创建者可以上架该资源"
}
```

---

#### 3.4 申请删除数字警员

**接口**: `POST /officer/applyDelete.xhtml`

**权限**: 创建者或超级管理员

**请求参数**:

```json
{
  "id": 123,
  "delete_reason": "业务调整，不再需要该警员"
}
```

**说明**:

- 删除原因必填
- 申请后状态：`dept_delete_audit_status='00'`（待部门审核）

**响应示例**:

```json
{
  "status": "succeed",
  "message": "删除申请已提交，等待部门管理员审核"
}
```

---

#### 3.5 部门审核删除数字警员

**接口**: `POST /officer/deptAuditDelete.xhtml`

**权限**: 部门管理员

**请求参数**:

```json
{
  "id": 123,
  "dept_delete_audit_status": "01",
  "dept_delete_remark": "同意删除"
}
```

**前置条件**: 必须存在删除申请（`delete_reason` 不为空）

**响应示例**:

```json
{
  "status": "succeed",
  "message": "部门审核通过，已提交超级管理员审核"
}
```

---

#### 3.6 超级管理员审核删除数字警员

**接口**: `POST /officer/superAuditDelete.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 123,
  "super_delete_audit_status": "01",
  "super_delete_remark": "同意删除"
}
```

**说明**:

- 审核通过：执行软删除（`is_deleted=TRUE`）
- 审核拒绝：清空删除原因，允许重新申请

**响应示例**:

```json
{
  "status": "succeed",
  "message": "删除审核通过"
}
```

---

#### 3.7 设置数字警员上架状态

**接口**: `POST /officer/setPublic.xhtml`

**权限**: 创建者或超级管理员

**请求参数**:

```json
{
  "officer_id": 123,
  "is_public": true
}
```

**前置条件**:

- 部门审核通过（`dept_audit_status='01'`）
- 超级管理员审核通过（`super_audit_status='01'`）

**响应示例**:

```json
{
  "status": "succeed",
  "message": "上架成功"
}
```

---

#### 3.8 数字警员列表

**接口**: `POST /officer/list.xhtml`

**权限**: 登录用户

**请求参数**:

```json
{
  "dept_audit_status": "01",
  "super_audit_status": "01",
  "dept_id": 1,
  "creator_id": 123,
  "is_public": true
}
```

---

### 4. 技能管理接口（两级审核）

#### 4.1 创建技能

**接口**: `POST /skill/create.xhtml`

**权限**: 登录用户

**请求参数**:

```json
{
  "skill_code": "skill001",
  "skill_name": "人口查询",
  "description": "查询人口信息",
  "skill_type": "query",
  "skill_config": {
    "api_url": "http://example.com/api"
  },
  "is_public": false
}
```

**说明**:

- 创建后状态：`dept_audit_status='00'`（待部门审核）

---

#### 4.2 部门审核技能

**接口**: `POST /skill/deptAudit.xhtml`

**权限**: 部门管理员

**请求参数**:

```json
{
  "id": 123,
  "dept_audit_status": "01",
  "dept_audit_remark": "符合上架要求"
}
```

---

#### 4.3 超级管理员审核技能

**接口**: `POST /skill/superAudit.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 123,
  "super_audit_status": "01",
  "super_audit_remark": "同意上架"
}
```

**前置条件**: 部门审核必须已通过

---

#### 4.4 申请删除技能

**接口**: `POST /skill/applyDelete.xhtml`

**权限**: 创建者或超级管理员

**请求参数**:

```json
{
  "id": 123,
  "delete_reason": "技能已废弃"
}
```

---

#### 4.5 部门审核删除技能

**接口**: `POST /skill/deptAuditDelete.xhtml`

**权限**: 部门管理员

**请求参数**:

```json
{
  "id": 123,
  "dept_delete_audit_status": "01",
  "dept_delete_remark": "同意删除"
}
```

---

#### 4.6 超级管理员审核删除技能

**接口**: `POST /skill/superAuditDelete.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 123,
  "super_delete_audit_status": "01",
  "super_delete_remark": "同意删除"
}
```

---

#### 4.7 设置技能上架状态

**接口**: `POST /skill/setPublic.xhtml`

**权限**: 创建者或超级管理员

**请求参数**:

```json
{
  "skill_id": 123,
  "is_public": true
}
```

**前置条件**: 两级审核都通过

---

#### 4.8 技能列表

**接口**: `POST /skill/list.xhtml`

**权限**: 登录用户

**请求参数**:

```json
{
  "dept_audit_status": "01",
  "super_audit_status": "01",
  "dept_id": 1,
  "skill_type": "query",
  "keyword": "人口"
}
```

---

### 5. MCP 服务管理接口（两级审核）

#### 5.1 创建 MCP 服务

**接口**: `POST /mcp/create.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "service_code": "mcp001",
  "service_name": "天气查询服务",
  "description": "查询天气信息",
  "service_url": "http://example.com/mcp",
  "api_key": "your_api_key",
  "service_type": "weather",
  "config": {},
  "is_public": false
}
```

**说明**:

- 创建后状态：`dept_audit_status='00'`（待部门审核）

---

#### 5.2 部门审核 MCP 服务

**接口**: `POST /mcp/deptAudit.xhtml`

**权限**: 部门管理员

**请求参数**:

```json
{
  "id": 123,
  "dept_audit_status": "01",
  "dept_audit_remark": "符合上架要求"
}
```

---

#### 5.3 超级管理员审核 MCP 服务

**接口**: `POST /mcp/superAudit.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 123,
  "super_audit_status": "01",
  "super_audit_remark": "同意上架"
}
```

---

#### 5.4 申请删除 MCP 服务

**接口**: `POST /mcp/applyDelete.xhtml`

**权限**: 创建者或超级管理员

**请求参数**:

```json
{
  "id": 123,
  "delete_reason": "服务已下线"
}
```

---

#### 5.5 部门审核删除 MCP 服务

**接口**: `POST /mcp/deptAuditDelete.xhtml`

**权限**: 部门管理员

**请求参数**:

```json
{
  "id": 123,
  "dept_delete_audit_status": "01",
  "dept_delete_remark": "同意删除"
}
```

---

#### 5.6 超级管理员审核删除 MCP 服务

**接口**: `POST /mcp/superAuditDelete.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 123,
  "super_delete_audit_status": "01",
  "super_delete_remark": "同意删除"
}
```

---

#### 5.7 设置 MCP 服务上架状态

**接口**: `POST /mcp/setPublic.xhtml`

**权限**: 创建者或超级管理员

**请求参数**:

```json
{
  "mcp_id": 123,
  "is_public": true
}
```

**前置条件**: 两级审核都通过

---

#### 5.8 MCP 服务列表

**接口**: `POST /mcp/list.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "dept_audit_status": "01",
  "super_audit_status": "01",
  "dept_id": 1,
  "service_type": "weather"
}
```

---

### 6. 授权管理接口

#### 6.1 授权技能给部门

**接口**: `POST /auth/skill.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "skill_id": 123,
  "dept_id": 456,
  "auth_type": "read",
  "expire_time": "2026-12-31 23:59:59"
}
```

---

#### 6.2 取消技能授权

**接口**: `POST /auth/cancelSkill.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "skill_id": 123,
  "dept_id": 456
}
```

---

#### 6.3 统一授权

**接口**: `POST /auth/grant.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "resource_type": "skill",
  "resource_id": 123,
  "auth_target_type": "dept",
  "dept_id": 456,
  "user_id": null,
  "auth_type": "read",
  "expire_time": "2026-12-31 23:59:59"
}
```

**授权对象类型**:

- `dept`: 部门
- `user`: 用户

---

#### 6.4 统一取消授权

**接口**: `POST /auth/revoke.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "resource_type": "skill",
  "resource_id": 123,
  "auth_target_type": "dept",
  "dept_id": 456,
  "user_id": null
}
```

---

### 7. 日志查询接口

#### 7.1 操作日志列表

**接口**: `POST /log/operation.xhtml`

**权限**: 安全审计员

**请求参数**:

```json
{
  "user_id": 123,
  "operation_type": "CREATE",
  "operation_module": "SKILL",
  "start_time": "2026-01-01 00:00:00",
  "end_time": "2026-12-31 23:59:59",
  "page": 1,
  "limit": 20
}
```

---

#### 7.2 导出操作日志

**接口**: `POST /log/export.xhtml`

**权限**: 安全审计员

**请求参数**: 同操作日志列表

**响应**: Excel 文件下载

---

### 8. 用户管理接口

#### 8.1 按部门查询用户

**接口**: `POST /user/byDept.xhtml`

**权限**: 登录用户

**请求参数**:

```json
{
  "dept_id": 123
}
```

---

#### 8.2 调整用户部门

**接口**: `POST /user/changeDept.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "user_id": 123,
  "dept_id": 456
}
```

**说明**:

- 自动更新 `t_user_role` 表中的部门关联
- 如果用户是部门管理员，会降级为普通用户

---

## 状态码说明

### HTTP 状态码

| 状态码 | 说明                       |
| ------ | -------------------------- |
| 200    | 成功                       |
| 400    | 请求参数错误               |
| 401    | 未授权（Token 无效或过期） |
| 403    | 权限不足                   |
| 404    | 资源不存在                 |
| 500    | 服务器内部错误             |

### 业务状态码

| 状态码  | 说明 |
| ------- | ---- |
| succeed | 成功 |
| error   | 失败 |

---

## 错误处理

### 错误响应格式

```json
{
  "status": "error",
  "message": "错误描述信息"
}
```

### 常见错误

1. **Token 无效**

   ```json
   {
     "status": "error",
     "message": "token 已过期！"
   }
   ```

2. **权限不足**

   ```json
   {
     "status": "error",
     "message": "权限不足！"
   }
   ```

3. **审核状态不符合**

   ```json
   {
     "status": "error",
     "message": "部门审核未通过，无法提交超级管理员审核！"
   }
   ```

4. **上架条件不满足**
   ```json
   {
     "status": "error",
     "message": "超级管理员审核未通过，无法上架！"
   }
   ```

---

## 状态字段说明

### 创建审核状态 (dept_audit_status, super_audit_status)

适用于：数字警员、技能、MCP 服务

| 值   | 含义   | 说明                 |
| ---- | ------ | -------------------- |
| '00' | 待审核 | 刚创建或重新提交审核 |
| '01' | 已通过 | 审核通过             |
| '02' | 已拒绝 | 审核不通过           |

### 删除审核状态 (dept_delete_audit_status, super_delete_audit_status)

适用于：数字警员、技能、MCP 服务

| 值   | 含义   | 说明           |
| ---- | ------ | -------------- |
| '00' | 待审核 | 已提交删除申请 |
| '01' | 已通过 | 审核通过       |
| '02' | 已拒绝 | 审核不通过     |

### 删除标记 (is_deleted)

适用于：数字警员、技能、MCP 服务

| 值    | 含义   | 说明                     |
| ----- | ------ | ------------------------ |
| false | 未删除 | 正常状态                 |
| true  | 已删除 | 软删除，数据保留但不可用 |

### 公开状态 (is_public)

适用于：数字警员、技能、MCP 服务

| 值    | 含义   | 说明                |
| ----- | ------ | ------------------- |
| false | 不公开 | 仅创建者/部门内可见 |
| true  | 公开   | 所有用户可见可用    |

---

## 角色权限说明

### 超级管理员 (super_admin)

- 所有资源的管理权限
- 两级审核的最终审核权
- 授权技能给部门/用户
- 查看操作日志
- 调整用户部门

### 安全审计员 (security_auditor)

- 查看操作日志
- 导出操作日志

### 部门管理员 (dept_admin)

- 管理部门内资源
- 部门审核权（一审）
- 创建的资源直接通过部门审核

### 普通用户 (normal_user)

- 创建资源（待审核）
- 使用已公开的资源
- 管理自己创建的资源（上架/下架、申请删除）

---

## 审核流程图

### 创建审核流程

```
用户创建
  ↓
dept_audit_status='00' (部门待审)
  ↓
部门管理员审核
  ├─ 通过 → dept_audit_status='01' → 提交超级管理员
  └─ 拒绝 → dept_audit_status='02' → 结束
  ↓
超级管理员审核
  ├─ 通过 → super_audit_status='01' → 用户可以上架
  └─ 拒绝 → super_audit_status='02' → 结束
  ↓
用户选择上架
  ↓
is_public=true (已上架)
```

### 删除审核流程

```
用户申请删除
  ↓
填写 delete_reason
  ↓
dept_delete_audit_status='00' (部门待审)
  ↓
部门管理员审核
  ├─ 通过 → dept_delete_audit_status='01' → 提交超级管理员
  └─ 拒绝 → dept_delete_audit_status='02' → 结束
  ↓
超级管理员审核
  ├─ 通过 → is_deleted=TRUE → 软删除
  └─ 拒绝 → 清空 delete_reason → 允许重新申请
```

---

## 快速开始

### 1. 注册账号

```bash
curl -X POST http://50.18.22.92:8082/dsjpt/jk/register.xhtml \
  -H "Content-Type: application/json" \
  -d '{
    "user_account": "test",
    "password": "test123",
    "name": "测试用户"
  }'
```

### 2. 登录获取 Token

```bash
curl -X POST http://50.18.22.92:8082/dsjpt/jk/login.xhtml \
  -H "Content-Type: application/json" \
  -d '{
    "user_account": "test",
    "password": "test123"
  }'
```

### 3. 创建数字警员

```bash
curl -X POST http://50.18.22.92:8082/dsjpt/jk/officer/create.xhtml \
  -H "Content-Type: application/json" \
  -H "token: <your_token>" \
  -d '{
    "officer_name": "小智",
    "description": "智能问答警员"
  }'
```

### 4. 部门审核

```bash
curl -X POST http://50.18.22.92:8082/dsjpt/jk/officer/deptAudit.xhtml \
  -H "Content-Type: application/json" \
  -H "token: <dept_admin_token>" \
  -d '{
    "id": 123,
    "dept_audit_status": "01",
    "dept_audit_remark": "符合上架要求"
  }'
```

### 5. 超级管理员审核

```bash
curl -X POST http://50.18.22.92:8082/dsjpt/jk/officer/superAudit.xhtml \
  -H "Content-Type: application/json" \
  -H "token: <super_admin_token>" \
  -d '{
    "id": 123,
    "super_audit_status": "01",
    "super_audit_remark": "同意上架"
  }'
```

### 6. 上架资源

```bash
curl -X POST http://50.18.22.92:8082/dsjpt/jk/officer/setPublic.xhtml \
  -H "Content-Type: application/json" \
  -H "token: <creator_token>" \
  -d '{
    "officer_id": 123,
    "is_public": true
  }'
```

---

## 变更历史

| 日期       | 版本 | 变更内容                                      |
| ---------- | ---- | --------------------------------------------- |
| 2026-06-23 | 3.0  | 重构为两级审核流程，新增删除审核流程          |
| 2026-06-22 | 2.0  | 重构状态字段：audit_status 和 is_deleted 分离 |
| 2026-01-01 | 1.0  | 初始版本                                      |

---

_文档更新时间：2026-06-23_
