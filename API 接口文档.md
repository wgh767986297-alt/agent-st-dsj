# API - 接口文档

## 概述

- **服务地址**: `http://localhost:8082`
- **路由前缀**: `/dsjpt/jk/`
- **请求方式**: POST
- **Content-Type**: `application/json`

## 通用说明

### 请求头

| 参数         | 必填     | 说明                   |
| ------------ | -------- | ---------------------- |
| Content-Type | 是       | `application/json`     |
| token        | 部分接口 | 登录后获取的 JWT Token |

### 响应格式

**成功响应：**

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {}
}
```

**失败响应：**

```json
{
  "status": "error",
  "message": "错误信息"
}
```

### 公共错误码

| 错误信息       | 说明                     |
| -------------- | ------------------------ |
| IP 未授权！    | IP 不在白名单中          |
| 缺少 token！   | 请求头中未携带 token     |
| token 已过期！ | Token 已失效，需重新登录 |
| 权限不足！     | 用户角色权限不足         |
| 服务器错误     | 服务端异常               |

---

## 一、基础接口（12 个）

### 1.1 用户登录

**接口**: `POST /dsjpt/jk/login.xhtml`

**权限**: 无（公开接口）

**请求参数**:

```json
{
  "idCard": "320101199001010001",
  "password": "Admin@123"
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功！",
  "result": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "data": {
    "id": 1,
    "name": "系统管理员",
    "id_card": "320101199001010001",
    "phone": "13800000001",
    "company": "平台管理中心",
    "department": "平台管理中心",
    "shzt": "01",
    "role": "超级管理员",
    "ip": "127.0.0.1"
  }
}
```

---

### 1.2 用户注册

**接口**: `POST /dsjpt/jk/register.xhtml`

**权限**: 无（公开接口）

**请求参数**:

```json
{
  "name": "张三",
  "idCard": "320101199001011234",
  "phone": "13800138000",
  "company": "某某公司",
  "department": "技术部",
  "password": "123456"
}
```

**响应示例**:

```json
{
  "status": "success",
  "message": "成功！"
}
```

**错误响应**:

```json
{
  "status": "error",
  "message": "身份证号已被注册！"
}
```

---

### 1.3 修改个人信息

**接口**: `POST /dsjpt/jk/profile.xhtml`

**权限**: 已登录用户

**请求头**:

```
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**请求参数**:

```json
{
  "id": 1,
  "name": "张三",
  "phone": "13900139000",
  "company": "新公司",
  "department": "新部门",
  "password": "newpassword"
}
```

**响应示例**:

```json
{
  "status": "success",
  "message": "成功！"
}
```

---

### 1.4 插入会话记录

**接口**: `POST /dsjpt/jk/insertMsg.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "account": "320101199001010001",
  "sessionId": "session_001",
  "title": "会话标题",
  "content": "[{\"role\":\"user\",\"content\":\"你好\",\"timestamp\":1705824000000}]",
  "validity": "1",
  "qaCount": 1
}
```

**响应示例**:

```json
{
  "code": "200",
  "status": "succeed",
  "message": "操作成功",
  "data": "",
  "token": "刷新后的新 token"
}
```

---

### 1.5 更新会话记录

**接口**: `POST /dsjpt/jk/updateMsg.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "account": "320101199001010001",
  "sessionId": "session_001",
  "title": "新标题",
  "content": "[...]",
  "validity": "1",
  "qaCount": 10
}
```

---

### 1.6 逻辑删除会话记录

**接口**: `POST /dsjpt/jk/deleteLogicMsg.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "account": "320101199001010001",
  "sessionId": "session_001"
}
```

---

### 1.7 查询会话记录

**接口**: `POST /dsjpt/jk/selectByIdMsg.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "account": "320101199001010001",
  "sessionId": "session_001",
  "startTime": "20250101000000",
  "endTime": "20250121235959",
  "limit": 100
}
```

**响应示例**:

```json
{
  "code": "200",
  "status": "succeed",
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "account": "320101199001010001",
      "session_id": "session_001",
      "title": "会话标题",
      "content": "[...]",
      "create_time": "20250121120000",
      "update_time": "20250121120500"
    }
  ],
  "token": "刷新后的新 token"
}
```

---

### 1.8 查询所有用户

**接口**: `POST /dsjpt/jk/getAllUserXx.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "shzt": "01",
  "idCard": "320101199001010001",
  "name": "张三"
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功！",
  "userList": [
    {
      "id": 1,
      "name": "张三",
      "id_card": "320101199001010001",
      "phone": "13800000001",
      "company": "某某公司",
      "department": "技术部",
      "shzt": "01",
      "role": "普通用户",
      "create_time": "2025-01-01 10:00:00"
    }
  ]
}
```

---

### 1.9 用户审核

**接口**: `POST /dsjpt/jk/userSh.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "id": 1,
  "shzt": "01"
}
```

**shzt 值**: `00` 待审核 | `01` 通过 | `02` 未通过

---

### 1.10 查询登录日志

**接口**: `POST /dsjpt/jk/getLoginLog.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "loginip": "127.0.0.1",
  "account": "320101199001010001",
  "startTime": "20250101000000",
  "endTime": "20250121235959"
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功！",
  "logList": [
    {
      "id": "20250121120000xxx",
      "account": "320101199001010001",
      "username": "张三",
      "logindate": "20250121120000",
      "loginip": "127.0.0.1",
      "logintype": "01",
      "status": "01"
    }
  ]
}
```

---

### 1.11 统计信息

**接口**: `POST /dsjpt/jk/getWdtxff.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "type": "0"
}
```

**type 值**: `0` 今日 | `1` 近 7 天 | `2` 近 30 天

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功！",
  "data": {
    "wdTotal": 1000,
    "fjxx": "{}",
    "zzl": "15.50%",
    "top5": [
      {
        "name": "张三",
        "department": "技术部",
        "company": "某某公司",
        "value": 100
      }
    ]
  }
}
```

---

### 1.12 会话统计

**接口**: `POST /dsjpt/jk/getHhxx.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "start_time": "20250101000000",
  "end_time": "20250121235959",
  "name": "张三"
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功！",
  "data": {
    "2025-01-01": 50,
    "2025-01-02": 60,
    "2025-01-03": 45
  }
}
```

---

## 二、权限管理接口（27 个）

### 2.1 部门管理

#### 2.1.1 创建部门

**接口**: `POST /dsjpt/jk/dept/create.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "dept_code": "DEPT001",
  "dept_name": "技术部",
  "parent_id": null,
  "admin_id": 1,
  "user_quota": 100,
  "status": "01"
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "部门创建成功",
  "data": {
    "id": 1
  }
}
```

---

#### 2.1.2 更新部门

**接口**: `POST /dsjpt/jk/dept/update.xhtml`

**权限**: 超级管理员

**说明**: 支持更新部门信息，包括部门管理员（admin_id）

**请求参数**:

```json
{
  "id": 1, // 部门 ID（必填）
  "dept_name": "技术研发部", // 部门名称（可选）
  "parent_id": null, // 父部门 ID（可选）
  "admin_id": 5, // 部门管理员 ID（可选，支持更新）
  "user_quota": 200, // 用户配额（可选）
  "used_quota": 50, // 已用配额（可选）
  "status": "01" // 状态：01 启用 00 禁用（可选）
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "部门更新成功"
}
```

**注意事项**:

- `admin_id` 是用户表 `t_user` 的主键 ID
- 设置 `admin_id` 前，确保该用户已存在且已分配部门管理员角色
- 可通过 `/dsjpt/jk/getAllUserXx.xhtml` 接口查询用户 ID

---

#### 2.1.3 删除部门

**接口**: `POST /dsjpt/jk/dept/delete.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 1
}
```

---

#### 2.1.4 查询部门列表

**接口**: `POST /dsjpt/jk/dept/list.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "status": "01",
  "parent_id": null
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
      "dept_code": "DEPT001",
      "dept_name": "技术部",
      "parent_id": null,
      "admin_id": 2,
      "admin_name": "李四",
      "user_quota": 100,
      "used_quota": 25,
      "status": "01",
      "create_time": "2025-01-01 10:00:00"
    }
  ]
}
```

---

### 2.2 角色管理

#### 2.2.1 分配角色

**接口**: `POST /dsjpt/jk/role/assign.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "user_id": 2,
  "role_id": 2,
  "dept_id": 1
}
```

**role_id 说明**:

- 1: 超级管理员
- 2: 部门管理员
- 3: 普通用户
- 4: 安全审计员

---

#### 2.2.2 取消角色

**接口**: `POST /dsjpt/jk/role/remove.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "user_id": 2,
  "role_id": 2
}
```

---

#### 2.2.3 查询用户角色

**接口**: `POST /dsjpt/jk/role/list.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "user_id": 2
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": [
    {
      "id": 2,
      "role_code": "DEPT_ADMIN",
      "role_name": "部门管理员",
      "role_type": "dept_admin",
      "description": "部门级管理员"
    }
  ]
}
```

---

### 2.3 Skill 管理

#### 2.3.1 创建 Skill

**接口**: `POST /dsjpt/jk/skill/create.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "skill_code": "SKILL001",
  "skill_name": "智能问答",
  "description": "智能问答技能",
  "skill_type": "qa",
  "skill_config": {
    "model": "gpt-3.5",
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

**说明**:

- 普通用户创建后状态为 `00`（待审核）
- 部门管理员创建后状态为 `01`（已上架）

---

#### 2.3.2 更新 Skill

**接口**: `POST /dsjpt/jk/skill/update.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "id": 1,
  "skill_name": "智能问答 V2",
  "description": "升级版本",
  "skill_config": {...}
}
```

---

#### 2.3.3 删除/下架 Skill

**接口**: `POST /dsjpt/jk/skill/delete.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "id": 1
}
```

**说明**: 实际是将状态设置为 `02`（已下架）

---

#### 2.3.4 查询 Skill 列表

**接口**: `POST /dsjpt/jk/skill/list.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "status": "01",
  "dept_id": 1,
  "creator_id": 2,
  "is_public": true
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
      "skill_code": "SKILL001",
      "skill_name": "智能问答",
      "description": "智能问答技能",
      "skill_type": "qa",
      "skill_config": {...},
      "creator_id": 2,
      "creator_name": "李四",
      "dept_id": 1,
      "dept_name": "技术部",
      "status": "01",
      "is_public": true,
      "create_time": "2025-01-01 10:00:00"
    }
  ]
}
```

---

#### 2.3.5 审核 Skill

**接口**: `POST /dsjpt/jk/skill/audit.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 1,
  "status": "01",
  "audit_remark": "审核通过，同意上架"
}
```

**status 值**: `01` 已上架 | `02` 已下架 | `03` 审核未通过

---

### 2.4 数字警员管理

#### 2.4.1 创建数字警员

**接口**: `POST /dsjpt/jk/officer/create.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "officer_code": "OFFICER001",
  "officer_name": "警员小张",
  "description": "交通管理数字警员",
  "avatar_url": "http://example.com/avatar.png",
  "config": {
    "voice": "male",
    "speed": 1.0,
    "volume": 80
  }
}
```

---

#### 2.4.2 更新数字警员

**接口**: `POST /dsjpt/jk/officer/update.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "id": 1,
  "officer_name": "警员小张（更新）",
  "description": "新描述",
  "config": {...}
}
```

---

#### 2.4.3 删除/移除数字警员

**接口**: `POST /dsjpt/jk/officer/delete.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "id": 1
}
```

---

#### 2.4.4 查询数字警员列表

**接口**: `POST /dsjpt/jk/officer/list.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "status": "01",
  "dept_id": 1,
  "creator_id": 2,
  "is_public": true
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
      "officer_code": "OFFICER001",
      "officer_name": "警员小张",
      "description": "交通管理数字警员",
      "avatar_url": "http://example.com/avatar.png",
      "config": {...},
      "creator_id": 2,
      "creator_name": "李四",
      "dept_id": 1,
      "dept_name": "技术部",
      "status": "01",
      "is_public": true,
      "create_time": "2025-01-01 10:00:00"
    }
  ]
}
```

---

#### 2.4.5 审核数字警员

**接口**: `POST /dsjpt/jk/officer/audit.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 1,
  "status": "01",
  "audit_remark": "审核通过，同意入库"
}
```

**status 值**: `01` 已入库 | `02` 已移除 | `03` 审核未通过

---

### 2.5 授权管理

#### 2.5.1 授权 Skill 给部门

**接口**: `POST /dsjpt/jk/auth/skill.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "skill_id": 1,
  "dept_id": 1,
  "auth_type": "read",
  "expire_time": "2025-12-31 23:59:59"
}
```

**auth_type 值**: `read` 读 | `write` 写 | `manage` 管理

---

#### 2.5.2 取消 Skill 授权

**接口**: `POST /dsjpt/jk/auth/cancelSkill.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "skill_id": 1,
  "dept_id": 1
}
```

---

#### 2.5.3 查询 Skill 授权列表

**接口**: `POST /dsjpt/jk/auth/skillList.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "dept_id": 1,
  "skill_id": 1
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
      "skill_id": 1,
      "skill_name": "智能问答",
      "dept_id": 1,
      "dept_name": "技术部",
      "grantor_id": 1,
      "auth_type": "read",
      "status": "01",
      "expire_time": "2025-12-31 23:59:59",
      "create_time": "2025-01-01 10:00:00"
    }
  ]
}
```

---

#### 2.5.4 授权数字警员给用户

**接口**: `POST /dsjpt/jk/auth/officer.xhtml`

**权限**: 部门管理员

**请求参数**:

```json
{
  "officer_id": 1,
  "user_id": 2,
  "expire_time": "2025-12-31 23:59:59"
}
```

---

#### 2.5.5 取消数字警员授权

**接口**: `POST /dsjpt/jk/auth/cancelOfficer.xhtml`

**权限**: 部门管理员

**请求参数**:

```json
{
  "officer_id": 1,
  "user_id": 2
}
```

---

#### 2.5.6 查询数字警员授权列表

**接口**: `POST /dsjpt/jk/auth/officerList.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "user_id": 2,
  "officer_id": 1
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
      "officer_id": 1,
      "officer_name": "警员小张",
      "user_id": 2,
      "user_name": "张三",
      "grantor_id": 2,
      "status": "01",
      "expire_time": "2025-12-31 23:59:59",
      "create_time": "2025-01-01 10:00:00"
    }
  ]
}
```

---

### 2.6 操作日志

#### 2.6.1 查询操作日志

**接口**: `POST /dsjpt/jk/log/operation.xhtml`

**权限**: 安全审计员

**请求参数**:

```json
{
  "user_id": 1,
  "user_account": "320101199001010001",
  "operation_type": "CREATE",
  "start_time": "2025-01-01 00:00:00",
  "end_time": "2025-01-21 23:59:59",
  "limit": 100
}
```

**operation_type 值**: `CREATE` | `UPDATE` | `DELETE` | `ASSIGN` | `AUTH` | `AUDIT` | `APPLY`

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "user_account": "320101199001010001",
      "user_name": "系统管理员",
      "user_role": "super_admin",
      "operation_type": "CREATE",
      "operation_module": "DEPARTMENT",
      "operation_content": { "dept_id": 1, "dept_name": "技术部" },
      "request_ip": "127.0.0.1",
      "request_url": "/dsjpt/jk/dept/create.xhtml",
      "status": "01",
      "create_time": "2025-01-01 10:00:00"
    }
  ]
}
```

---

### 2.7 发布申请

#### 2.7.1 提交 Skill 发布申请

**接口**: `POST /dsjpt/jk/apply/skill.xhtml`

**权限**: 普通用户

**请求参数**:

```json
{
  "skill_id": 1,
  "apply_type": "publish",
  "apply_reason": "申请上架到技能库，供全平台使用"
}
```

**apply_type 值**: `publish` 发布上架 | `cancel` 取消上架

---

#### 2.7.2 审核 Skill 发布申请

**接口**: `POST /dsjpt/jk/apply/skillAudit.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "id": 1,
  "status": "01",
  "audit_remark": "同意上架"
}
```

**status 值**: `00` 待审核 | `01` 已通过 | `02` 已拒绝

---

#### 2.7.3 查询 Skill 发布申请列表

**接口**: `POST /dsjpt/jk/apply/skillList.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "status": "00",
  "dept_id": 1
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
      "skill_id": 1,
      "skill_name": "智能问答",
      "applicant_id": 2,
      "applicant_name": "李四",
      "apply_type": "publish",
      "apply_reason": "申请上架",
      "dept_id": 1,
      "status": "00",
      "auditor_id": null,
      "audit_remark": null,
      "audit_time": null,
      "create_time": "2025-01-01 10:00:00"
    }
  ]
}
```

---

## 三、统一授权管理接口（新增）

### 3.1 接口列表

| 接口              | 路径                             | 权限       | 说明                     |
| ----------------- | -------------------------------- | ---------- | ------------------------ |
| 查询可授权资源    | `/dsjpt/jk/auth/resources.xhtml` | 已登录用户 | 查询所有可授权的资源列表 |
| 查询授权列表      | `/dsjpt/jk/auth/authList.xhtml`  | 已登录用户 | 查询部门或用户的授权详情 |
| 统一授权          | `/dsjpt/jk/auth/grant.xhtml`     | 超级管理员 | 授权资源给部门或用户     |
| 统一取消授权      | `/dsjpt/jk/auth/revoke.xhtml`    | 超级管理员 | 取消资源的授权           |
| 授权 MCP          | `/dsjpt/jk/mcp/auth.xhtml`       | 超级管理员 | 授权 MCP 给部门          |
| 取消 MCP 授权     | `/dsjpt/jk/mcp/cancelAuth.xhtml` | 超级管理员 | 取消 MCP 授权            |
| 查询 MCP 授权列表 | `/dsjpt/jk/mcp/authList.xhtml`   | 已登录用户 | 查询 MCP 授权详情        |

### 3.2 接口详细说明

#### 3.2.1 查询可授权资源

**接口**: `POST /dsjpt/jk/auth/resources.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "resource_type": "skill", // 可选：skill/mcp/officer
  "status": "01", // 可选：01 启用 00 禁用
  "is_public": true, // 可选：是否公开
  "keyword": "核查", // 可选：关键词搜索
  "page": 1, // 可选：页码
  "limit": 20 // 可选：每页数量
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": [
    {
      "resource_type": "skill",
      "resource_id": 1,
      "resource_code": "SKILL_001",
      "resource_name": "人员信息核查",
      "description": "核查人员身份信息",
      "status": "01",
      "is_public": true,
      "create_time": "2025-01-15 10:00:00"
    }
  ]
}
```

---

#### 3.2.2 查询授权列表（支持部门和用户）

**接口**: `POST /dsjpt/jk/auth/authList.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "auth_target_type": "user", // 必填：user-用户授权 | dept-部门授权
  "dept_id": 1, // 可选：部门 ID
  "user_id": 2, // 可选：用户 ID（查询用户授权时）
  "officer_id": 1 // 可选：警员 ID
}
```

**响应示例（查询用户授权，带部门信息）**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": [
    {
      "id": 1,
      "officer_id": 1,
      "user_id": 2,
      "user_name": "张三",
      "user_id_card": "320101199001010001",
      "user_phone": "13800138000",
      "user_dept_id": 1, // 用户所属部门 ID
      "user_dept_name": "技术部", // 用户所属部门名称
      "officer_name": "警员小张",
      "officer_code": "OFFICER_001",
      "scene_type": "traffic",
      "status": "01",
      "expire_time": "2026-12-31 23:59:59",
      "auth_time": "2025-01-15 10:00:00",
      "grantor_name": "系统管理员"
    }
  ]
}
```

**响应示例（查询部门授权）**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": [
    {
      "resource_type": "skill",
      "id": 1,
      "resource_id": 1,
      "target_id": 1,
      "target_name": "技术部",
      "auth_target_type": "dept",
      "resource_name": "智能问答",
      "resource_code": "SKILL_001",
      "status": "01",
      "expire_time": "2026-12-31 23:59:59",
      "auth_time": "2025-01-15 10:00:00",
      "grantor_name": "系统管理员"
    },
    {
      "resource_type": "mcp",
      "id": 2,
      "resource_id": 2,
      "target_id": 1,
      "target_name": "技术部",
      "auth_target_type": "dept",
      "resource_name": "户籍查询服务",
      "resource_code": "MCP_002",
      "status": "01",
      "expire_time": "2026-12-31 23:59:59",
      "auth_time": "2025-01-16 10:00:00",
      "grantor_name": "系统管理员"
    }
  ]
}
```

---

#### 3.2.3 统一授权（支持部门和用户）

**接口**: `POST /dsjpt/jk/auth/grant.xhtml`

**权限**: 超级管理员

**请求参数（授权给用户）**:

```json
{
  "auth_target_type": "user", // 必填：user-用户 | dept-部门
  "user_id": 2, // 用户 ID（授权给用户时必填）
  "resource_type": "officer", // 必填：skill/mcp/officer
  "resource_id": 1, // 必填：资源 ID
  "officer_id": 1, // 可选：警员 ID（授权 skill/mcp 时需要）
  "expire_time": "2026-12-31 23:59:59"
}
```

**请求参数（授权给部门）**:

```json
{
  "auth_target_type": "dept", // 必填：user-用户 | dept-部门
  "dept_id": 1, // 部门 ID（授权给部门时必填）
  "resource_type": "skill", // 必填：skill/mcp/officer
  "resource_id": 1, // 必填：资源 ID
  "auth_type": "read", // 可选：read/write/manage
  "expire_time": "2026-12-31 23:59:59"
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "授权用户成功"
}
```

**授权规则说明**:

- **部门授权**：支持 skill、mcp 类型，不支持 officer
- **用户授权**：支持 officer、skill、mcp 类型
  - officer：直接授权给用户
  - skill/mcp：需要通过 officer 间接授权

---

#### 3.2.4 统一取消授权

**接口**: `POST /dsjpt/jk/auth/revoke.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "auth_target_type": "user", // 必填：user-用户 | dept-部门
  "user_id": 2, // 用户 ID（取消用户授权时必填）
  "dept_id": 1, // 部门 ID（取消部门授权时必填）
  "resource_type": "officer", // 必填：skill/mcp/officer
  "resource_id": 1, // 必填：资源 ID
  "officer_id": 1 // 可选：警员 ID（取消 skill/mcp 时需要）
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "取消用户授权成功"
}
```

---

#### 3.2.5 授权 MCP 给部门

**接口**: `POST /dsjpt/jk/mcp/auth.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "mcp_id": 1,
  "dept_id": 1,
  "auth_type": "read",
  "expire_time": "2026-12-31 23:59:59"
}
```

---

#### 3.2.6 取消 MCP 授权

**接口**: `POST /dsjpt/jk/mcp/cancelAuth.xhtml`

**权限**: 超级管理员

**请求参数**:

```json
{
  "mcp_id": 1,
  "dept_id": 1
}
```

---

#### 3.2.7 查询 MCP 授权列表

**接口**: `POST /dsjpt/jk/mcp/authList.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "dept_id": 1,
  "mcp_id": 1
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
      "mcp_id": 1,
      "service_name": "户籍查询服务",
      "dept_id": 1,
      "dept_name": "技术部",
      "grantor_id": 1,
      "auth_type": "read",
      "status": "01",
      "expire_time": "2026-12-31 23:59:59",
      "create_time": "2025-01-15 10:00:00"
    }
  ]
}
```

---

## 四、接口权限汇总表

### 按权限分类

| 权限级别   | 接口数量 | 说明                         |
| ---------- | -------- | ---------------------------- |
| 公开接口   | 2        | login, register              |
| 已登录用户 | 30       | 基础查询、个人操作、授权查询 |
| 部门管理员 | 2        | 警员授权相关                 |
| 超级管理员 | 18       | 部门/角色/审核/授权          |
| 安全审计员 | 1        | 操作日志查询                 |

### 接口清单（当前可用 68 个）

**基础接口（12 个）**

| 序号 | 接口路径                         | 权限要求 |
| ---- | -------------------------------- | -------- |
| 1    | `/dsjpt/jk/login.xhtml`          | 公开     |
| 2    | `/dsjpt/jk/register.xhtml`       | 公开     |
| 3    | `/dsjpt/jk/profile.xhtml`        | 已登录   |
| 4    | `/dsjpt/jk/insertMsg.xhtml`      | 已登录   |
| 5    | `/dsjpt/jk/updateMsg.xhtml`      | 已登录   |
| 6    | `/dsjpt/jk/deleteLogicMsg.xhtml` | 已登录   |
| 7    | `/dsjpt/jk/selectByIdMsg.xhtml`  | 已登录   |
| 8    | `/dsjpt/jk/getAllUserXx.xhtml`   | 已登录   |
| 9    | `/dsjpt/jk/userSh.xhtml`         | 已登录   |
| 10   | `/dsjpt/jk/getLoginLog.xhtml`    | 已登录   |
| 11   | `/dsjpt/jk/getWdtxff.xhtml`      | 已登录   |
| 12   | `/dsjpt/jk/getHhxx.xhtml`        | 已登录   |

**权限管理接口（27 个）**

| 序号 | 接口路径                             | 权限要求   |
| ---- | ------------------------------------ | ---------- |
| 13   | `/dsjpt/jk/dept/create.xhtml`        | 超级管理员 |
| 14   | `/dsjpt/jk/dept/update.xhtml`        | 超级管理员 |
| 15   | `/dsjpt/jk/dept/delete.xhtml`        | 超级管理员 |
| 16   | `/dsjpt/jk/dept/list.xhtml`          | 已登录     |
| 17   | `/dsjpt/jk/role/assign.xhtml`        | 超级管理员 |
| 18   | `/dsjpt/jk/role/remove.xhtml`        | 超级管理员 |
| 19   | `/dsjpt/jk/role/list.xhtml`          | 已登录     |
| 20   | `/dsjpt/jk/skill/create.xhtml`       | 已登录     |
| 21   | `/dsjpt/jk/skill/update.xhtml`       | 已登录     |
| 22   | `/dsjpt/jk/skill/delete.xhtml`       | 已登录     |
| 23   | `/dsjpt/jk/skill/list.xhtml`         | 已登录     |
| 24   | `/dsjpt/jk/skill/audit.xhtml`        | 超级管理员 |
| 25   | `/dsjpt/jk/officer/create.xhtml`     | 已登录     |
| 26   | `/dsjpt/jk/officer/update.xhtml`     | 已登录     |
| 27   | `/dsjpt/jk/officer/delete.xhtml`     | 已登录     |
| 28   | `/dsjpt/jk/officer/list.xhtml`       | 已登录     |
| 29   | `/dsjpt/jk/officer/audit.xhtml`      | 超级管理员 |
| 30   | `/dsjpt/jk/auth/skill.xhtml`         | 超级管理员 |
| 31   | `/dsjpt/jk/auth/cancelSkill.xhtml`   | 超级管理员 |
| 32   | `/dsjpt/jk/auth/skillList.xhtml`     | 已登录     |
| 33   | `/dsjpt/jk/auth/officer.xhtml`       | 部门管理员 |
| 34   | `/dsjpt/jk/auth/cancelOfficer.xhtml` | 部门管理员 |
| 35   | `/dsjpt/jk/auth/officerList.xhtml`   | 已登录     |
| 36   | `/dsjpt/jk/log/operation.xhtml`      | 安全审计员 |
| 37   | `/dsjpt/jk/apply/skill.xhtml`        | 普通用户   |
| 38   | `/dsjpt/jk/apply/skillAudit.xhtml`   | 超级管理员 |
| 39   | `/dsjpt/jk/apply/skillList.xhtml`    | 已登录     |

**统一授权管理接口（7 个）**

| 序号 | 接口路径                         | 权限要求   |
| ---- | -------------------------------- | ---------- |
| 40   | `/dsjpt/jk/auth/resources.xhtml` | 已登录     |
| 41   | `/dsjpt/jk/auth/authList.xhtml`  | 已登录     |
| 42   | `/dsjpt/jk/auth/grant.xhtml`     | 超级管理员 |
| 43   | `/dsjpt/jk/auth/revoke.xhtml`    | 超级管理员 |
| 44   | `/dsjpt/jk/mcp/auth.xhtml`       | 超级管理员 |
| 45   | `/dsjpt/jk/mcp/cancelAuth.xhtml` | 超级管理员 |
| 46   | `/dsjpt/jk/mcp/authList.xhtml`   | 已登录     |

**MCP 服务管理接口（7 个）**

| 序号 | 接口路径                     | 权限要求 |
| ---- | ---------------------------- | -------- |
| 47   | `/dsjpt/jk/mcp/create.xhtml` | 已登录   |
| 48   | `/dsjpt/jk/mcp/update.xhtml` | 已登录   |
| 49   | `/dsjpt/jk/mcp/delete.xhtml` | 已登录   |
| 50   | `/dsjpt/jk/mcp/list.xhtml`   | 已登录   |

**数字警员 - 资源关联接口（8 个）**

| 序号 | 接口路径                                       | 权限要求 | 状态    | 说明                              |
| ---- | ---------------------------------------------- | -------- | ------- | --------------------------------- |
| 51   | `/dsjpt/jk/officer/addResource.xhtml`          | 已登录   | ✅ 推荐 | 支持 skill/mcp                    |
| 52   | `/dsjpt/jk/officer/removeResource.xhtml`       | 已登录   | ✅ 推荐 | 支持 skill/mcp                    |
| 53   | `/dsjpt/jk/officer/updateResourceConfig.xhtml` | 已登录   | ✅ 推荐 | 支持 skill/mcp                    |
| 54   | `/dsjpt/jk/officer/getResources.xhtml`         | 已登录   | ✅ 推荐 | 查询所有资源                      |
| 55   | `/dsjpt/jk/officer/addSkill.xhtml`             | 已登录   | ⚠️ 废弃 | 请使用 addResource.xhtml          |
| 56   | `/dsjpt/jk/officer/removeSkill.xhtml`          | 已登录   | ⚠️ 废弃 | 请使用 removeResource.xhtml       |
| 57   | `/dsjpt/jk/officer/updateSkillConfig.xhtml`    | 已登录   | ⚠️ 废弃 | 请使用 updateResourceConfig.xhtml |
| 58   | `/dsjpt/jk/officer/getSkills.xhtml`            | 已登录   | ⚠️ 废弃 | 请使用 getResources.xhtml         |

---

## 四、测试示例

### cURL 测试

#### 登录

```bash
curl -X POST http://localhost:8082/dsjpt/jk/login.xhtml \
  -H "Content-Type: application/json" \
  -d "{\"idCard\":\"320101199001010001\",\"password\":\"Admin@123\"}"
```

#### 创建部门（需要 token）

```bash
curl -X POST http://localhost:8082/dsjpt/jk/dept/create.xhtml \
  -H "Content-Type: application/json" \
  -H "token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d "{\"dept_code\":\"DEPT001\",\"dept_name\":\"技术部\",\"user_quota\":100}"
```

#### 查询 Skill 列表

```bash
curl -X POST http://localhost:8082/dsjpt/jk/skill/list.xhtml \
  -H "Content-Type: application/json" \
  -H "token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d "{\"status\":\"01\"}"
```

### Python 测试

```python
import requests
import json

BASE_URL = "http://localhost:8082/dsjpt/jk"

# 登录
login_resp = requests.post(f"{BASE_URL}/login.xhtml", json={
    "idCard": "320101199001010001",
    "password": "Admin@123"
})
token = login_resp.json()["result"]["token"]

# 创建 Skill
headers = {"token": token}
skill_resp = requests.post(f"{BASE_URL}/skill/create.xhtml",
    headers=headers,
    json={
        "skill_code": "SKILL001",
        "skill_name": "测试技能",
        "description": "测试",
        "skill_type": "test"
    }
)
print(skill_resp.json())
```

---

---

## 五、已禁用接口说明

以下 7 个接口因需求待明确，已暂时禁用：

| 接口路径                                | 说明                         |
| --------------------------------------- | ---------------------------- |
| `/dsjpt/jk/skill/execute.xhtml`         | Skill 执行代理（需求待明确） |
| `/dsjpt/jk/skillLibrary/list.xhtml`     | 技能库列表（需求待明确）     |
| `/dsjpt/jk/skillLibrary/detail.xhtml`   | 技能库详情（需求待明确）     |
| `/dsjpt/jk/officerLibrary/list.xhtml`   | 数字警员库列表（需求待明确） |
| `/dsjpt/jk/officerLibrary/detail.xhtml` | 数字警员库详情（需求待明确） |
| `/dsjpt/jk/chat/init.xhtml`             | 对话初始化（需求待明确）     |
| `/dsjpt/jk/chat/send.xhtml`             | 对话消息发送（需求待明确）   |

详细说明请参考：`接口禁用说明.md`

---

**文档版本**: v1.3  
**最后更新**: 2026-06-21  
**接口总数**: 68 个可用 + 7 个禁用

### 更新说明

#### v1.3 版本更新（2026-06-21）

**数字警员资源关联增强：**

- ✅ 数字警员可关联 Skill 和 MCP 两种资源
- ✅ 新增 4 个资源管理接口（addResource/removeResource 等）
- ✅ 保留 4 个旧接口用于向后兼容
- ✅ 新增 `v_officer_resources` 视图

#### v1.2 版本更新

**统一授权管理功能：**

- 支持部门授权和用户授权两种类型
- 用户授权查询结果包含部门信息，方便联动查询
- 新增 MCP 服务管理和授权接口
- 统一授权接口支持 `auth_target_type` 参数区分授权目标

---

## 六、数字警员 - 资源关联接口（v1.3 新增）

### 6.1 添加资源到数字警员

**接口**: `POST /dsjpt/jk/officer/addResource.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "officer_id": 1,
  "resource_type": "skill", // skill 或 mcp
  "resource_id": 10,
  "sort_order": 1,
  "config": {
    "enabled": true
  }
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "添加成功"
}
```

---

### 6.2 移除资源

**接口**: `POST /dsjpt/jk/officer/removeResource.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "officer_id": 1,
  "resource_type": "mcp",
  "resource_id": 5
}
```

---

### 6.3 更新资源配置

**接口**: `POST /dsjpt/jk/officer/updateResourceConfig.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "officer_id": 1,
  "resource_type": "skill",
  "resource_id": 10,
  "sort_order": 1,
  "config": {
    "priority": "high"
  }
}
```

---

### 6.4 查询数字警员的所有资源

**接口**: `POST /dsjpt/jk/officer/getResources.xhtml`

**权限**: 已登录用户

**请求参数**:

```json
{
  "officer_id": 1
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
      "officer_id": 1,
      "resource_type": "skill",
      "resource_id": 10,
      "resource_name": "人员信息核查",
      "resource_code": "SKILL_001",
      "resource_category": "qa",
      "sort_order": 1,
      "status": "01"
    },
    {
      "id": 2,
      "officer_id": 1,
      "resource_type": "mcp",
      "resource_id": 5,
      "resource_name": "户籍查询服务",
      "resource_code": "MCP_002",
      "resource_category": "query",
      "sort_order": 2,
      "status": "01"
    }
  ]
}
```

---

### 6.5 兼容旧接口

以下接口仍然可用（向后兼容）：

| 接口        | 路径                                        | 映射                                     |
| ----------- | ------------------------------------------- | ---------------------------------------- |
| 添加 Skill  | `/dsjpt/jk/officer/addSkill.xhtml`          | → addResource (resource_type='skill')    |
| 移除 Skill  | `/dsjpt/jk/officer/removeSkill.xhtml`       | → removeResource (resource_type='skill') |
| 更新配置    | `/dsjpt/jk/officer/updateSkillConfig.xhtml` | → updateResourceConfig                   |
| 查询 Skills | `/dsjpt/jk/officer/getSkills.xhtml`         | → getResources 过滤 skill 类型           |
