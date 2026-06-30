# NTJK API 接口文档

## 版本信息

- **版本**: v6.1
- **更新时间**: 2026-06-25
- **基础 URL**: `http://50.18.22.92:8082/dsjpt/jk`
- **Python 实现**: 基于 ntjk_api.py

---

## 概述

南通开数字警员平台 API 接口文档，提供数字警员、Skill、MCP 服务的管理、授权、审核等功能。

### 核心特性

1. **数字警员管理** - 创建、更新、删除、审核数字警员
2. **Skill 管理** - 技能的全生命周期管理
3. **MCP 服务管理** - MCP 服务的注册、审核、授权
4. **资源关联** - 数字警员与 Skill/MCP 的关联管理
5. **统一授权** - 支持部门/用户两级授权体系
6. **两级审核** - 部门审核 + 超级管理员审核
7. **操作日志** - 完整的操作审计追踪

---

## 认证说明

### Token 认证

所有接口（除登录和零信任登录外）都需要在请求头中携带 Token：

```
token: <JWT_TOKEN>
```

### Token 获取方式

1. **账号密码登录**: `POST /dsjpt/jk/login.xhtml`
2. **零信任登录**: `POST /dsjpt/jk/zero-trust/login.xhtml`

---

## 数据表结构

### t_digital_officer（数字警员表）

```sql
CREATE TABLE t_digital_officer (
    id SERIAL PRIMARY KEY,                    -- 主键 ID，自增
    officer_code VARCHAR(50) UNIQUE NOT NULL, -- 警员编码，唯一标识
    officer_name VARCHAR(100) NOT NULL,       -- 警员名称
    description TEXT,                         -- 描述信息
    avatar_url VARCHAR(500),                  -- 头像 URL 地址
    config JSONB,                             -- 配置信息（JSON 格式）
    creator_id INTEGER REFERENCES t_user(id), -- 创建者 ID
    dept_id INTEGER REFERENCES t_department(id), -- 所属部门 ID
    dept_audit_status VARCHAR(2) DEFAULT '00',-- 部门审核状态：00-待审核，01-通过，02-拒绝
    super_audit_status VARCHAR(2) DEFAULT '00',-- 超级审核状态：00-待审核，01-通过，02-拒绝
    is_public BOOLEAN DEFAULT FALSE,          -- 是否公开：true-公开，false-不公开
    is_deleted BOOLEAN DEFAULT FALSE,         -- 是否删除：true-已删除，false-未删除
    use_count INTEGER DEFAULT 0,              -- 使用次数
    last_used_time TIMESTAMP,                 -- 最后使用时间
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 更新时间
);
```

**字段说明**:

| 字段               | 类型         | 必填 | 中文说明     | 示例/备注                   |
| ------------------ | ------------ | ---- | ------------ | --------------------------- |
| id                 | INTEGER      | 自动 | 主键 ID      | 自增                        |
| officer_code       | VARCHAR(50)  | 是   | 警员编码     | 唯一标识，如 "officer001"   |
| officer_name       | VARCHAR(100) | 是   | 警员名称     | 如 "人员核查员"             |
| description        | TEXT         | 否   | 描述信息     | 警员功能描述                |
| avatar_url         | VARCHAR(500) | 否   | 头像 URL     | 头像图片地址                |
| config             | JSONB        | 否   | 配置信息     | JSON 格式配置               |
| creator_id         | INTEGER      | 是   | 创建者 ID    | 关联 t_user.id              |
| dept_id            | INTEGER      | 是   | 部门 ID      | 关联 t_department.id        |
| dept_audit_status  | VARCHAR(2)   | 自动 | 部门审核状态 | 00-待审核，01-通过，02-拒绝 |
| super_audit_status | VARCHAR(2)   | 自动 | 超级审核状态 | 00-待审核，01-通过，02-拒绝 |
| is_public          | BOOLEAN      | 自动 | 是否公开     | true/false                  |
| is_deleted         | BOOLEAN      | 自动 | 是否删除     | true/false（软删除）        |
| use_count          | INTEGER      | 自动 | 使用次数     | 调用次数统计                |
| last_used_time     | TIMESTAMP    | 自动 | 最后使用时间 | -                           |
| create_time        | TIMESTAMP    | 自动 | 创建时间     | 自动生成                    |
| update_time        | TIMESTAMP    | 自动 | 更新时间     | 自动生成                    |

### t_skill（技能表）

```sql
CREATE TABLE t_skill (
    id SERIAL PRIMARY KEY,                    -- 主键 ID，自增
    skill_code VARCHAR(50) UNIQUE NOT NULL,   -- 技能编码，唯一标识
    skill_name VARCHAR(100) NOT NULL,         -- 技能名称
    description TEXT,                         -- 描述信息
    skill_type VARCHAR(50),                   -- 技能类型
    skill_config JSONB,                       -- 技能配置（JSON 格式）
    creator_id INTEGER REFERENCES t_user(id), -- 创建者 ID
    dept_id INTEGER REFERENCES t_department(id), -- 所属部门 ID
    dept_audit_status VARCHAR(2) DEFAULT '00',-- 部门审核状态：00-待审核，01-通过，02-拒绝
    super_audit_status VARCHAR(2) DEFAULT '00',-- 超级审核状态：00-待审核，01-通过，02-拒绝
    is_public BOOLEAN DEFAULT FALSE,          -- 是否公开：true-公开，false-不公开
    is_deleted BOOLEAN DEFAULT FALSE,         -- 是否删除：true-已删除，false-未删除
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 更新时间
);
```

**字段说明**:

| 字段               | 类型         | 必填 | 中文说明     | 示例/备注                                  |
| ------------------ | ------------ | ---- | ------------ | ------------------------------------------ |
| id                 | INTEGER      | 自动 | 主键 ID      | 自增                                       |
| skill_code         | VARCHAR(50)  | 是   | 技能编码     | 唯一标识，如 "skill001"                    |
| skill_name         | VARCHAR(100) | 是   | 技能名称     | 如 "人员核查"                              |
| description        | TEXT         | 否   | 描述信息     | 技能功能描述                               |
| skill_type         | VARCHAR(50)  | 否   | 技能类型     | 如 "QUERY"（查询类）、"ANALYSIS"（分析类） |
| skill_config       | JSONB        | 否   | 技能配置     | API 地址、参数等配置                       |
| creator_id         | INTEGER      | 是   | 创建者 ID    | 关联 t_user.id                             |
| dept_id            | INTEGER      | 是   | 部门 ID      | 关联 t_department.id                       |
| dept_audit_status  | VARCHAR(2)   | 自动 | 部门审核状态 | 00-待审核，01-通过，02-拒绝                |
| super_audit_status | VARCHAR(2)   | 自动 | 超级审核状态 | 00-待审核，01-通过，02-拒绝                |
| is_public          | BOOLEAN      | 自动 | 是否公开     | true/false                                 |
| is_deleted         | BOOLEAN      | 自动 | 是否删除     | true/false（软删除）                       |
| create_time        | TIMESTAMP    | 自动 | 创建时间     | 自动生成                                   |
| update_time        | TIMESTAMP    | 自动 | 更新时间     | 自动生成                                   |

### t_mcp_service（MCP 服务表）

```sql
CREATE TABLE t_mcp_service (
    id SERIAL PRIMARY KEY,                    -- 主键 ID，自增
    service_code VARCHAR(50) UNIQUE NOT NULL, -- 服务编码，唯一标识
    service_name VARCHAR(100) NOT NULL,       -- 服务名称
    description TEXT,                         -- 描述信息
    service_url VARCHAR(500) NOT NULL,        -- 服务地址 URL
    api_key VARCHAR(200),                     -- API 密钥
    service_type VARCHAR(50),                 -- 服务类型
    protocol_type VARCHAR(50) DEFAULT 'streamableHttp', -- 协议类型
    config JSONB,                             -- 配置信息（JSON 格式）
    tools JSONB,                              -- 工具列表（JSON 数组）
    tools_count INTEGER DEFAULT 0,            -- 工具数量
    creator_id INTEGER REFERENCES t_user(id), -- 创建者 ID
    dept_id INTEGER REFERENCES t_department(id), -- 所属部门 ID
    dept_audit_status VARCHAR(2) DEFAULT '00',-- 部门审核状态：00-待审核，01-通过，02-拒绝
    super_audit_status VARCHAR(2) DEFAULT '00',-- 超级审核状态：00-待审核，01-通过，02-拒绝
    is_public BOOLEAN DEFAULT FALSE,          -- 是否公开：true-公开，false-不公开
    is_deleted BOOLEAN DEFAULT FALSE,         -- 是否删除：true-已删除，false-未删除
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 更新时间
);
```

**字段说明**:

| 字段               | 类型         | 必填 | 中文说明     | 示例/备注                   |
| ------------------ | ------------ | ---- | ------------ | --------------------------- |
| id                 | INTEGER      | 自动 | 主键 ID      | 自增                        |
| service_code       | VARCHAR(50)  | 是   | 服务编码     | 唯一标识，如 "mcp001"       |
| service_name       | VARCHAR(100) | 是   | 服务名称     | 如 "户籍查询"               |
| description        | TEXT         | 否   | 描述信息     | 服务功能描述                |
| service_url        | VARCHAR(500) | 是   | 服务地址     | MCP 服务端点 URL            |
| api_key            | VARCHAR(200) | 否   | API 密钥     | 认证密钥                    |
| service_type       | VARCHAR(50)  | 否   | 服务类型     | 如 "QUERY"、"ANALYSIS"      |
| protocol_type      | VARCHAR(50)  | 否   | 协议类型     | streamableHttp/sse 等       |
| config             | JSONB        | 否   | 配置信息     | 额外配置参数                |
| tools              | JSONB        | 否   | 工具列表     | JSON 数组，包含工具定义     |
| tools_count        | INTEGER      | 自动 | 工具数量     | 自动计算                    |
| creator_id         | INTEGER      | 是   | 创建者 ID    | 关联 t_user.id              |
| dept_id            | INTEGER      | 是   | 部门 ID      | 关联 t_department.id        |
| dept_audit_status  | VARCHAR(2)   | 自动 | 部门审核状态 | 00-待审核，01-通过，02-拒绝 |
| super_audit_status | VARCHAR(2)   | 自动 | 超级审核状态 | 00-待审核，01-通过，02-拒绝 |
| is_public          | BOOLEAN      | 自动 | 是否公开     | true/false                  |
| is_deleted         | BOOLEAN      | 自动 | 是否删除     | true/false（软删除）        |
| create_time        | TIMESTAMP    | 自动 | 创建时间     | 自动生成                    |
| update_time        | TIMESTAMP    | 自动 | 更新时间     | 自动生成                    |

### t_officer_resource_relation（数字警员资源关联表）

```sql
CREATE TABLE t_officer_resource_relation (
    id SERIAL PRIMARY KEY,                    -- 主键 ID，自增
    officer_id INTEGER NOT NULL REFERENCES t_digital_officer(id) ON DELETE CASCADE, -- 数字警员 ID
    resource_id INTEGER NOT NULL,             -- 资源 ID（Skill 或 MCP 的 ID）
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('SKILL', 'MCP')), -- 资源类型
    config_override JSONB,                    -- 配置覆盖（JSON 格式）
    sort_order INTEGER DEFAULT 0,             -- 排序顺序
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 创建时间
);
```

**字段说明**:

| 字段            | 类型        | 必填 | 中文说明    | 示例/备注                 |
| --------------- | ----------- | ---- | ----------- | ------------------------- |
| id              | INTEGER     | 自动 | 主键 ID     | 自增                      |
| officer_id      | INTEGER     | 是   | 数字警员 ID | 关联 t_digital_officer.id |
| resource_id     | INTEGER     | 是   | 资源 ID     | Skill 或 MCP 的 ID        |
| resource_type   | VARCHAR(20) | 是   | 资源类型    | SKILL/MCP                 |
| config_override | JSONB       | 否   | 配置覆盖    | 针对该警员的特殊配置      |
| sort_order      | INTEGER     | 否   | 排序顺序    | 数字越小越靠前            |
| create_time     | TIMESTAMP   | 自动 | 创建时间    | 自动生成                  |

---

### t_skill_auth（Skill 授权表）

```sql
CREATE TABLE t_skill_auth (
    id SERIAL PRIMARY KEY,                    -- 主键 ID，自增
    skill_id INTEGER REFERENCES t_skill(id),  -- 技能 ID
    dept_id INTEGER REFERENCES t_department(id), -- 部门 ID
    user_id INTEGER REFERENCES t_user(id),    -- 用户 ID
    grantor_id INTEGER REFERENCES t_user(id), -- 授权人 ID
    auth_target_type VARCHAR(20) DEFAULT 'dept', -- 授权目标类型：dept-部门，user-用户
    auth_type VARCHAR(20) DEFAULT 'read',     -- 授权类型：read-只读，write-读写
    status VARCHAR(2) DEFAULT '01',           -- 授权状态：01-有效，00-无效
    expire_time TIMESTAMP,                    -- 过期时间
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 更新时间
);
```

**字段说明**:

| 字段             | 类型        | 必填 | 中文说明     | 示例/备注             |
| ---------------- | ----------- | ---- | ------------ | --------------------- |
| id               | INTEGER     | 自动 | 主键 ID      | 自增                  |
| skill_id         | INTEGER     | 是   | 技能 ID      | 关联 t_skill.id       |
| dept_id          | INTEGER     | 条件 | 部门 ID      | 授权给部门时必填      |
| user_id          | INTEGER     | 条件 | 用户 ID      | 授权给用户时必填      |
| grantor_id       | INTEGER     | 是   | 授权人 ID    | 谁授权的              |
| auth_target_type | VARCHAR(20) | 是   | 授权目标类型 | dept-部门，user-用户  |
| auth_type        | VARCHAR(20) | 否   | 授权类型     | read-只读，write-读写 |
| status           | VARCHAR(2)  | 是   | 授权状态     | 01-有效，00-无效      |
| expire_time      | TIMESTAMP   | 否   | 过期时间     | 为空表示永不过期      |
| create_time      | TIMESTAMP   | 自动 | 创建时间     | 自动生成              |
| update_time      | TIMESTAMP   | 自动 | 更新时间     | 自动生成              |

---

### t_mcp_auth（MCP 授权表）

```sql
CREATE TABLE t_mcp_auth (
    id SERIAL PRIMARY KEY,                    -- 主键 ID，自增
    mcp_id INTEGER REFERENCES t_mcp_service(id), -- MCP 服务 ID
    dept_id INTEGER REFERENCES t_department(id), -- 部门 ID
    user_id INTEGER REFERENCES t_user(id),    -- 用户 ID
    grantor_id INTEGER REFERENCES t_user(id), -- 授权人 ID
    auth_target_type VARCHAR(20) DEFAULT 'dept', -- 授权目标类型：dept-部门，user-用户
    auth_type VARCHAR(20) DEFAULT 'read',     -- 授权类型：read-只读，write-读写
    status VARCHAR(2) DEFAULT '01',           -- 授权状态：01-有效，00-无效
    expire_time TIMESTAMP,                    -- 过期时间
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 更新时间
);
```

**字段说明**:

| 字段             | 类型        | 必填 | 中文说明     | 示例/备注             |
| ---------------- | ----------- | ---- | ------------ | --------------------- |
| id               | INTEGER     | 自动 | 主键 ID      | 自增                  |
| mcp_id           | INTEGER     | 是   | MCP 服务 ID  | 关联 t_mcp_service.id |
| dept_id          | INTEGER     | 条件 | 部门 ID      | 授权给部门时必填      |
| user_id          | INTEGER     | 条件 | 用户 ID      | 授权给用户时必填      |
| grantor_id       | INTEGER     | 是   | 授权人 ID    | 谁授权的              |
| auth_target_type | VARCHAR(20) | 是   | 授权目标类型 | dept-部门，user-用户  |
| auth_type        | VARCHAR(20) | 否   | 授权类型     | read-只读，write-读写 |
| status           | VARCHAR(2)  | 是   | 授权状态     | 01-有效，00-无效      |
| expire_time      | TIMESTAMP   | 否   | 过期时间     | 为空表示永不过期      |
| create_time      | TIMESTAMP   | 自动 | 创建时间     | 自动生成              |
| update_time      | TIMESTAMP   | 自动 | 更新时间     | 自动生成              |

---

### t_officer_auth（数字警员授权表）

```sql
CREATE TABLE t_officer_auth (
    id SERIAL PRIMARY KEY,                    -- 主键 ID，自增
    officer_id INTEGER REFERENCES t_digital_officer(id), -- 数字警员 ID
    dept_id INTEGER REFERENCES t_department(id), -- 部门 ID
    user_id INTEGER REFERENCES t_user(id),    -- 用户 ID
    grantor_id INTEGER REFERENCES t_user(id), -- 授权人 ID
    auth_target_type VARCHAR(20) DEFAULT 'dept', -- 授权目标类型：dept-部门，user-用户
    status VARCHAR(2) DEFAULT '01',           -- 授权状态：01-有效，00-无效
    expire_time TIMESTAMP,                    -- 过期时间
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 更新时间
);
```

**字段说明**:

| 字段             | 类型        | 必填 | 中文说明     | 示例/备注                 |
| ---------------- | ----------- | ---- | ------------ | ------------------------- |
| id               | INTEGER     | 自动 | 主键 ID      | 自增                      |
| officer_id       | INTEGER     | 是   | 数字警员 ID  | 关联 t_digital_officer.id |
| dept_id          | INTEGER     | 条件 | 部门 ID      | 授权给部门时必填          |
| user_id          | INTEGER     | 条件 | 用户 ID      | 授权给用户时必填          |
| grantor_id       | INTEGER     | 是   | 授权人 ID    | 谁授权的                  |
| auth_target_type | VARCHAR(20) | 是   | 授权目标类型 | dept-部门，user-用户      |
| status           | VARCHAR(2)  | 是   | 授权状态     | 01-有效，00-无效          |
| expire_time      | TIMESTAMP   | 否   | 过期时间     | 为空表示永不过期          |
| create_time      | TIMESTAMP   | 自动 | 创建时间     | 自动生成                  |
| update_time      | TIMESTAMP   | 自动 | 更新时间     | 自动生成                  |

---

## 接口列表

### 一、用户管理接口

#### 1. 用户登录

**接口**: `POST /login.xhtml`

**权限**: 公开

**请求参数**:

| 字段     | 类型   | 必填 | 中文说明 | 示例                 |
| -------- | ------ | ---- | -------- | -------------------- |
| idCard   | String | 是   | 身份证号 | "320xxxxxxxxxxxxxxx" |
| password | String | 是   | 密码     | "password123"        |

**请求示例**:

```json
{
  "idCard": "320xxxxxxxxxxxxxxx",
  "password": "password123"
}
```

**响应参数**:

| 字段                       | 类型    | 中文说明 | 说明                                  |
| -------------------------- | ------- | -------- | ------------------------------------- |
| status                     | String  | 状态     | succeed-成功，error-失败              |
| message                    | String  | 消息     | 操作结果描述                          |
| result.token               | String  | 访问令牌 | JWT Token，用于后续请求认证           |
| data.id                    | Integer | 用户 ID  | 用户唯一标识                          |
| data.name                  | String  | 用户姓名 | -                                     |
| data.id_card               | String  | 身份证号 | -                                     |
| data.department            | Integer | 部门 ID  | 所属部门 ID                           |
| data.dept_name             | String  | 部门名称 | 所属部门名称                          |
| data.role_type             | String  | 主要角色 | 优先级最高的角色类型                  |
| data.role_list             | Array   | 角色列表 | 用户拥有的所有角色                    |
| data.role_list[].role_type | String  | 角色类型 | super_admin/dept_admin/normal_user 等 |
| data.role_list[].role_name | String  | 角色名称 | 角色中文名称                          |

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
    "name": "张三",
    "id_card": "320xxxxxxxxxxxxxxx",
    "department": 1,
    "dept_name": "技术部",
    "role_type": "dept_admin",
    "role_list": [
      { "role_type": "dept_admin", "role_name": "部门管理员" },
      { "role_type": "normal_user", "role_name": "普通用户" }
    ]
  }
}
```

#### 2. 零信任登录

**接口**: `POST /zero-trust/login.xhtml`

**权限**: 公开（通过零信任网关认证）

**请求头**:

```
RZZX-USERTOKEN: <用户令牌 ID>
RZZX-APPTOKEN: <应用令牌>
```

**响应**:

```json
{
  "status": "succeed",
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": 1,
    "name": "张三",
    "id_card": "320xxx",
    "dept_name": "技术部",
    "role_type": "dept_admin",
    "role_list": [...]
  }
}
```

#### 3. 用户注册

**接口**: `POST /register.xhtml`

**权限**: 公开

**请求**:

```json
{
  "name": "张三",
  "idCard": "320xxxxxxxxxxxxxxx",
  "phone": "13800138000",
  "company": "xxx 公司",
  "department": 1,
  "password": "password123"
}
```

**响应**:

```json
{
  "status": "success",
  "message": "成功！"
}
```

#### 4. 修改个人信息

**接口**: `POST /profile.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "id": 1,
  "name": "新名称",
  "phone": "13900139000",
  "company": "新公司",
  "department": 2,
  "password": "newPassword123"
}
```

**响应**:

```json
{
  "status": "success",
  "message": "成功！"
}
```

#### 5. 查询用户列表

**接口**: `POST /getAllUserXx.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "shzt": "01",
  "idCard": "320xxx",
  "name": "张三",
  "dept_id": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功！",
  "userList": [
    {
      "id": 1,
      "name": "张三",
      "id_card": "320xxx",
      "department": 1,
      "dept_id": 1,
      "role_type": "dept_admin",
      "role_list": [...]
    }
  ]
}
```

#### 6. 按部门查询用户

**接口**: `POST /user/byDept.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "dept_id": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功！",
  "userList": [...]
}
```

#### 7. 用户审核

**接口**: `POST /userSh.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "id": 1,
  "shzt": "01"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功！"
}
```

---

### 二、部门管理接口

#### 1. 创建部门

**接口**: `POST /dept/create.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "dept_code": "bgs",
  "dept_name": "办公室",
  "parent_id": null,
  "admin_id": 1,
  "user_quota": 100,
  "status": "01"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "创建成功",
  "data": { "id": 5 }
}
```

#### 2. 更新部门

**接口**: `POST /dept/update.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 1,
  "dept_name": "新名称",
  "parent_id": null,
  "admin_id": 2,
  "user_quota": 150,
  "status": "01"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "更新成功"
}
```

#### 3. 删除部门

**接口**: `POST /dept/delete.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "删除成功"
}
```

#### 4. 部门列表

**接口**: `POST /dept/list.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "status": "01",
  "parent_id": null
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": [
    {
      "id": 1,
      "dept_code": "bgs",
      "dept_name": "办公室",
      "admin_id": 1,
      "admin_name": "张三",
      "user_quota": 100,
      "used_quota": 25,
      "normal_user_count": 20,
      "authorized_skill_count": 15,
      "authorized_mcp_count": 8,
      "authorized_officer_count": 5,
      "status": "01"
    }
  ]
}
```

---

### 三、角色管理接口

#### 1. 分配角色

**接口**: `POST /role/assign.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "user_id": 1,
  "role_id": 2,
  "dept_id": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "分配成功"
}
```

#### 2. 取消角色

**接口**: `POST /role/remove.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "user_id": 1,
  "role_id": 2
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "取消成功"
}
```

#### 3. 用户角色列表

**接口**: `POST /role/list.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "user_id": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": [
    {
      "role_type": "dept_admin",
      "role_name": "部门管理员"
    }
  ]
}
```

---

### 四、Skill 管理接口

#### 1. 创建 Skill

**接口**: `POST /skill/create.xhtml`

**权限**: 登录用户

**请求参数**:

| 字段         | 类型   | 必填 | 中文说明 | 示例                                    |
| ------------ | ------ | ---- | -------- | --------------------------------------- |
| skill_code   | String | 是   | 技能编码 | 唯一标识，如 "skill001"                 |
| skill_name   | String | 是   | 技能名称 | "人员核查"                              |
| description  | String | 否   | 描述信息 | "用于人员信息核查"                      |
| skill_type   | String | 否   | 技能类型 | "QUERY"（查询类）、"ANALYSIS"（分析类） |
| skill_config | Object | 否   | 技能配置 | API 地址、参数等配置信息                |

**请求示例**:

```json
{
  "skill_code": "skill001",
  "skill_name": "人员核查",
  "description": "用于人员信息核查",
  "skill_type": "QUERY",
  "skill_config": {
    "api_url": "https://api.example.com/check",
    "method": "POST"
  }
}
```

**响应参数**:

| 字段    | 类型    | 中文说明 | 说明              |
| ------- | ------- | -------- | ----------------- |
| status  | String  | 状态     | succeed-成功      |
| message | String  | 消息     | "创建成功"        |
| data.id | Integer | 技能 ID  | 新创建的 Skill ID |

**响应示例**:

```json
{
  "status": "succeed",
  "message": "创建成功",
  "data": { "id": 101 }
}
```

#### 2. 更新 Skill

**接口**: `POST /skill/update.xhtml`

**权限**: 创建者或管理员

**请求**:

```json
{
  "id": 101,
  "skill_name": "新名称",
  "description": "新描述",
  "skill_config": {...}
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "更新成功"
}
```

#### 3. 删除 Skill（申请）

**接口**: `POST /skill/applyDelete.xhtml`

**权限**: 创建者

**请求**:

```json
{
  "id": 101,
  "delete_reason": "不再使用"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "删除申请已提交，等待审核"
}
```

#### 4. Skill 列表查询

**接口**: `POST /skill/list.xhtml`

**权限**: 登录用户（仅查看有权限的）

**请求**:

```json
{
  "dept_audit_status": "01",
  "super_audit_status": "01",
  "dept_id": 1,
  "creator_id": 1,
  "is_public": true,
  "limit": 20,
  "page": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...],
    "total": 100
  }
}
```

#### 5. 部门审核 Skill

**接口**: `POST /skill/deptAudit.xhtml`

**权限**: 部门管理员

**请求**:

```json
{
  "id": 101,
  "dept_audit_status": "01",
  "dept_audit_remark": "审核通过"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "审核成功"
}
```

#### 6. 超级管理员审核 Skill

**接口**: `POST /skill/superAudit.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 101,
  "super_audit_status": "01",
  "super_audit_remark": "审核通过"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "审核成功，资源已公开"
}
```

#### 7. 设置 Skill 上架/下架

**接口**: `POST /skill/setPublic.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "id": 101,
  "is_public": true
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "设置成功"
}
```

#### 8. 申请下架 Skill

**接口**: `POST /skill/applyRemove.xhtml`

**权限**: 部门管理员

**请求**:

```json
{
  "id": 101,
  "delete_reason": "需要下架"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "下架申请已提交"
}
```

#### 9. 超级管理员审核下架 Skill

**接口**: `POST /skill/superAuditRemove.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 101,
  "super_delete_audit_status": "01",
  "super_delete_remark": "同意下架"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "下架成功，已清理所有授权记录"
}
```

---

### 五、MCP 服务管理接口

#### 1. 创建或更新 MCP 服务

**接口**: `POST /mcp/createOrUpdate.xhtml`

**权限**: 登录用户

**请求参数**:

| 字段          | 类型    | 必填 | 中文说明 | 示例                            |
| ------------- | ------- | ---- | -------- | ------------------------------- |
| id            | Integer | 否   | 服务 ID  | 更新时必填，创建时不填或为 null |
| service_code  | String  | 是   | 服务编码 | 唯一标识，如 "mcp001"           |
| service_name  | String  | 是   | 服务名称 | "户籍查询"                      |
| description   | String  | 否   | 描述信息 | "户籍信息查询服务"              |
| service_url   | String  | 是   | 服务地址 | MCP 服务端点 URL                |
| api_key       | String  | 否   | API 密钥 | 认证密钥                        |
| service_type  | String  | 否   | 服务类型 | "QUERY"、"ANALYSIS" 等          |
| protocol_type | String  | 否   | 协议类型 | "streamableHttp"（默认）、"sse" |
| config        | Object  | 否   | 配置信息 | 额外配置参数                    |
| tools         | Array   | 否   | 工具列表 | MCP 提供的工具定义数组          |

**tools 数组项字段**:

| 字段        | 类型   | 中文说明 | 说明                       |
| ----------- | ------ | -------- | -------------------------- |
| name        | String | 工具名称 | 工具唯一标识               |
| description | String | 工具描述 | 工具功能描述               |
| inputSchema | Object | 输入模式 | JSON Schema 格式的参数定义 |

**请求示例**:

```json
{
  "id": null,
  "service_code": "mcp001",
  "service_name": "户籍查询",
  "description": "户籍信息查询服务",
  "service_url": "http://mcp-server:8000/sse",
  "api_key": "sk-xxx",
  "service_type": "QUERY",
  "protocol_type": "streamableHttp",
  "config": {},
  "tools": [
    {
      "name": "query_household",
      "description": "查询户籍信息",
      "inputSchema": {...}
    }
  ]
}
```

**响应参数**:

| 字段    | 类型    | 中文说明 | 说明                     |
| ------- | ------- | -------- | ------------------------ |
| status  | String  | 状态     | succeed-成功             |
| message | String  | 消息     | "创建成功" 或 "更新成功" |
| data.id | Integer | 服务 ID  | 新创建或更新的服务 ID    |

**响应示例**:

```json
{
  "status": "succeed",
  "message": "创建成功",
  "data": { "id": 201 }
}
```

#### 2. 获取 MCP 详情

**接口**: `POST /mcp/get.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "id": 201
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "id": 201,
    "service_code": "mcp001",
    "service_name": "户籍查询",
    "service_url": "http://mcp-server:8000/sse",
    "tools_count": 5,
    "tools": [...],
    "is_public": true
  }
}
```

#### 3. MCP 列表查询

**接口**: `POST /mcp/listEnhanced.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "page": 1,
  "page_size": 20,
  "enabled_only": true,
  "protocol_type": "streamableHttp",
  "category": "QUERY",
  "keyword": "户籍"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "total": 50,
    "items": [...],
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}
```

#### 4. 删除 MCP 服务

**接口**: `POST /mcp/delete.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 201
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "删除成功"
}
```

#### 5. 部门审核 MCP

**接口**: `POST /mcp/deptAudit.xhtml`

**权限**: 部门管理员

**请求**:

```json
{
  "id": 201,
  "dept_audit_status": "01",
  "dept_audit_remark": "审核通过"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "审核成功"
}
```

#### 6. 超级管理员审核 MCP

**接口**: `POST /mcp/superAudit.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 201,
  "super_audit_status": "01",
  "super_audit_remark": "审核通过"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "审核成功，资源已公开"
}
```

#### 7. 申请删除 MCP

**接口**: `POST /mcp/applyDelete.xhtml`

**权限**: 创建者

**请求**:

```json
{
  "id": 201,
  "delete_reason": "服务下线"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "删除申请已提交"
}
```

#### 8. 部门审核删除 MCP

**接口**: `POST /mcp/deptAuditDelete.xhtml`

**权限**: 部门管理员

**请求**:

```json
{
  "id": 201,
  "dept_delete_audit_status": "01",
  "dept_delete_remark": "同意删除"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "审核成功"
}
```

#### 9. 超级管理员审核删除 MCP

**接口**: `POST /mcp/superAuditDelete.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 201,
  "super_delete_audit_status": "01",
  "super_delete_remark": "同意删除"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "删除成功，已清理所有授权记录"
}
```

#### 10. 申请下架 MCP

**接口**: `POST /mcp/applyRemove.xhtml`

**权限**: 部门管理员

**请求**:

```json
{
  "id": 201,
  "delete_reason": "临时下架维护"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "下架申请已提交"
}
```

#### 11. 超级管理员审核下架 MCP

**接口**: `POST /mcp/superAuditRemove.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 201,
  "super_delete_audit_status": "01",
  "super_delete_remark": "同意下架"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "下架成功，已清理所有授权记录"
}
```

#### 12. 设置 MCP 上架/下架

**接口**: `POST /mcp/setPublic.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "id": 201,
  "is_public": true
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "设置成功"
}
```

---

### 六、数字警员管理接口

#### 1. 创建数字警员

**接口**: `POST /officer/create.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "officer_code": "officer001",
  "officer_name": "人员核查员",
  "description": "用于人员信息核查的数字警员",
  "avatar_url": "http://example.com/avatar.png",
  "config": {}
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "创建成功",
  "data": { "id": 301 }
}
```

#### 2. 更新数字警员

**接口**: `POST /officer/update.xhtml`

**权限**: 创建者或管理员

**请求**:

```json
{
  "id": 301,
  "officer_name": "新名称",
  "description": "新描述",
  "avatar_url": "http://example.com/new-avatar.png",
  "skill_ids": "101,102,103",
  "mcp_ids": "201,202"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "数字警员更新成功"
}
```

#### 3. 删除数字警员（申请）

**接口**: `POST /officer/applyDelete.xhtml`

**权限**: 创建者

**请求**:

```json
{
  "id": 301,
  "delete_reason": "不再使用"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "删除申请已提交"
}
```

#### 4. 数字警员列表查询

**接口**: `POST /officer/list.xhtml`

**权限**: 登录用户（仅查看有权限的）

**请求**:

```json
{
  "dept_audit_status": "01",
  "super_audit_status": "01",
  "dept_id": 1,
  "creator_id": 1,
  "is_public": true,
  "limit": 20,
  "page": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...],
    "total": 50
  }
}
```

#### 5. 部门审核数字警员

**接口**: `POST /officer/deptAudit.xhtml`

**权限**: 部门管理员

**请求**:

```json
{
  "id": 301,
  "dept_audit_status": "01",
  "dept_audit_remark": "审核通过"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "审核成功"
}
```

#### 6. 超级管理员审核数字警员

**接口**: `POST /officer/superAudit.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 301,
  "super_audit_status": "01",
  "super_audit_remark": "审核通过"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "审核成功，资源已公开"
}
```

#### 7. 设置数字警员上架/下架

**接口**: `POST /officer/setPublic.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "id": 301,
  "is_public": true
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "设置成功"
}
```

#### 8. 申请下架数字警员

**接口**: `POST /officer/applyRemove.xhtml`

**权限**: 部门管理员

**请求**:

```json
{
  "id": 301,
  "delete_reason": "需要下架"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "下架申请已提交"
}
```

#### 9. 超级管理员审核下架数字警员

**接口**: `POST /officer/superAuditRemove.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "id": 301,
  "super_delete_audit_status": "01",
  "super_delete_remark": "同意下架"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "下架成功，已清理所有授权记录"
}
```

---

### 七、数字警员资源关联接口

#### 1. 添加资源到数字警员

**接口**: `POST /officer/addResource.xhtml`

**权限**: 创建者或管理员

**模式 1: 单资源添加**

**请求参数**:

| 字段          | 类型    | 必填 | 中文说明    | 示例                   |
| ------------- | ------- | ---- | ----------- | ---------------------- |
| officer_id    | Integer | 是   | 数字警员 ID | 301                    |
| resource_type | String  | 是   | 资源类型    | "SKILL" 或 "MCP"       |
| resource_id   | Integer | 是   | 资源 ID     | Skill 或 MCP 的 ID     |
| sort_order    | Integer | 否   | 排序顺序    | 数字越小越靠前，默认 0 |
| config        | Object  | 否   | 配置信息    | 针对该资源的特殊配置   |

**请求示例**:

```json
{
  "officer_id": 301,
  "resource_type": "SKILL",
  "resource_id": 101,
  "sort_order": 1,
  "config": {}
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "添加成功",
  "data": { "id": 456 }
}
```

**模式 2: 多资源批量添加（清空重插）**

**请求参数**:

| 字段       | 类型    | 必填 | 中文说明      | 示例                       |
| ---------- | ------- | ---- | ------------- | -------------------------- |
| officer_id | Integer | 是   | 数字警员 ID   | 301                        |
| skill_ids  | String  | 否   | Skill ID 列表 | 逗号分隔，如 "101,102,103" |
| mcp_ids    | String  | 否   | MCP ID 列表   | 逗号分隔，如 "201,202"     |

**请求示例**:

```json
{
  "officer_id": 301,
  "skill_ids": "101,102,103",
  "mcp_ids": "201,202"
}
```

**响应示例**:

```json
{
  "status": "succeed",
  "message": "批量添加成功，共 5 个资源",
  "data": { "count": 5 }
}
```

**注意事项**:

- 多资源批量模式会**清空现有所有关联**后重新插入
- 前端必须传递**完整的资源列表**，不要只传递变更部分
- skill_ids 和 mcp_ids 必须是逗号分隔的数字字符串，不能有空格
- 自动跳过无效 ID（非数字）

#### 2. 从数字警员移除资源

**接口**: `POST /officer/removeResource.xhtml`

**权限**: 创建者或管理员

**请求**:

```json
{
  "officer_id": 301,
  "resource_type": "SKILL",
  "resource_id": 101
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "移除成功"
}
```

#### 3. 更新资源配置

**接口**: `POST /officer/updateResourceConfig.xhtml`

**权限**: 创建者或管理员

**请求**:

```json
{
  "officer_id": 301,
  "resource_type": "SKILL",
  "resource_id": 101,
  "config_override": { "api_key": "new_key" }
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "更新成功"
}
```

#### 4. 获取数字警员的资源列表

**接口**: `POST /officer/getResources.xhtml`

**权限**: 登录用户

**请求参数**:

| 字段       | 类型    | 必填 | 中文说明    | 示例 |
| ---------- | ------- | ---- | ----------- | ---- |
| officer_id | Integer | 是   | 数字警员 ID | 301  |

**请求示例**:

```json
{
  "officer_id": 301
}
```

**响应参数**:

| 字段                        | 类型    | 中文说明 | 说明                      |
| --------------------------- | ------- | -------- | ------------------------- |
| status                      | String  | 状态     | succeed-成功              |
| message                     | String  | 消息     | 操作结果描述              |
| data.list                   | Array   | 资源列表 | 该警员关联的所有资源      |
| data.list[].resource_type   | String  | 资源类型 | "SKILL" 或 "MCP"          |
| data.list[].resource_id     | Integer | 资源 ID  | Skill 或 MCP 的 ID        |
| data.list[].resource_name   | String  | 资源名称 | Skill 名称或 MCP 服务名称 |
| data.list[].resource_code   | String  | 资源编码 | Skill 编码或 MCP 服务编码 |
| data.list[].sort_order      | Integer | 排序顺序 | 数字越小越靠前            |
| data.list[].config_override | Object  | 配置覆盖 | 针对该警员的特殊配置      |
| data.list[].is_public       | Boolean | 是否公开 | 该资源是否公开            |

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [
      {
        "resource_type": "SKILL",
        "resource_id": 101,
        "resource_name": "人员核查",
        "resource_code": "skill001",
        "sort_order": 0,
        "config_override": {},
        "is_public": true
      },
      {
        "resource_type": "MCP",
        "resource_id": 201,
        "resource_name": "户籍查询",
        "resource_code": "mcp001",
        "sort_order": 1,
        "config_override": {},
        "is_public": true
      }
    ]
  }
}
```

#### 5. 保存数字警员资源关联（完整列表模式）

**接口**: `POST /officer/saveResources.xhtml`

**权限**: 创建者或管理员

**请求参数**:

| 字段                        | 类型    | 必填 | 中文说明    | 示例                          |
| --------------------------- | ------- | ---- | ----------- | ----------------------------- |
| officer_id                  | Integer | 是   | 数字警员 ID | 301                           |
| resources                   | Array   | 是   | 资源列表    | 要关联的资源数组              |
| resources[].resource_type   | String  | 是   | 资源类型    | "SKILL" 或 "MCP"              |
| resources[].resource_id     | Integer | 是   | 资源 ID     | Skill 或 MCP 的 ID            |
| resources[].sort_order      | Integer | 否   | 排序顺序    | 数字越小越靠前，默认从 0 开始 |
| resources[].config_override | Object  | 否   | 配置覆盖    | 针对该资源的特殊配置          |

**resources 数组项字段说明**:

| 字段            | 类型    | 必填 | 中文说明 | 说明                            |
| --------------- | ------- | ---- | -------- | ------------------------------- |
| resource_type   | String  | 是   | 资源类型 | SKILL-技能，MCP-MCP 服务        |
| resource_id     | Integer | 是   | 资源 ID  | 对应的 Skill 或 MCP 的 ID       |
| sort_order      | Integer | 否   | 排序顺序 | 控制资源显示顺序，从 0 开始     |
| config_override | Object  | 否   | 配置覆盖 | JSON 格式，针对该警员的特殊配置 |

**请求示例**:

```json
{
  "officer_id": 301,
  "resources": [
    {
      "resource_type": "SKILL",
      "resource_id": 101,
      "sort_order": 0,
      "config_override": {}
    },
    {
      "resource_type": "MCP",
      "resource_id": 201,
      "sort_order": 1,
      "config_override": { "api_key": "xxx" }
    }
  ]
}
```

**响应参数**:

| 字段       | 类型    | 中文说明 | 说明                    |
| ---------- | ------- | -------- | ----------------------- |
| status     | String  | 状态     | succeed-成功            |
| message    | String  | 消息     | "保存成功，共 X 个资源" |
| data.count | Integer | 资源数量 | 保存的资源总数          |

**响应示例**:

```json
{
  "status": "succeed",
  "message": "保存成功，共 2 个资源",
  "data": { "count": 2 }
}
```

**注意事项**:

- 该接口使用**清空重插策略**：先清空该警员的所有资源关联，然后重新插入
- 前端必须传递**完整的资源列表**，不要只传递变更部分
- resources 数组必须是有效的 JSON 数组格式
- 每个资源项必须是对象格式，且包含 resource_type 和 resource_id

#### 6. 兼容旧接口：添加 Skill

**接口**: `POST /officer/addSkill.xhtml`

**权限**: 创建者或管理员

**请求**:

```json
{
  "officer_id": 301,
  "skill_id": 101,
  "sort_order": 1,
  "config": {}
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "添加成功"
}
```

#### 7. 兼容旧接口：获取 Skills

**接口**: `POST /officer/getSkills.xhtml`

**请求**:

```json
{
  "officer_id": 301
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...]
  }
}
```

---

### 八、统一授权管理接口

#### 1. 获取可授权资源列表

**接口**: `POST /auth/resources.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "resource_type": "skill",
  "status": "01",
  "is_public": true,
  "keyword": "核查",
  "page": 1,
  "limit": 20
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...],
    "total": 50
  }
}
```

#### 2. 获取授权列表

**接口**: `POST /auth/authList.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "auth_target_type": "dept",
  "resource_type": "skill",
  "resource_id": 101,
  "dept_id": 1,
  "user_id": null,
  "status": "01"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [
      {
        "auth_target_type": "dept",
        "target_dept_id": 1,
        "target_dept_name": "技术部",
        "resource_type": "skill",
        "resource_id": 101,
        "resource_name": "人员核查",
        "status": "01",
        "auth_type": "read",
        "expire_time": "2024-12-31 23:59:59",
        "auth_time": "2024-01-01 10:00:00",
        "grantor_id": 1,
        "grantor_name": "管理员"
      }
    ]
  }
}
```

#### 3. 部门管理员查看管辖部门授权列表

**接口**: `POST /auth/deptUserList.xhtml`

**权限**: 部门管理员

**请求**:

```json
{
  "dept_id": 1,
  "resource_type": "skill",
  "auth_target_type": "user",
  "status": "01"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...]
  }
}
```

#### 4. 授权资源

**接口**: `POST /auth/grant.xhtml`

**权限**: 管理员

**请求参数**:

| 字段             | 类型    | 必填 | 中文说明     | 示例                                    |
| ---------------- | ------- | ---- | ------------ | --------------------------------------- |
| resource_type    | String  | 是   | 资源类型     | "skill"、"mcp"、"officer"               |
| resource_id      | Integer | 是   | 资源 ID      | 要授权的资源 ID                         |
| auth_target_type | String  | 是   | 授权目标类型 | "dept"-部门，"user"-用户                |
| dept_id          | Integer | 条件 | 部门 ID      | 授权给部门时必填                        |
| user_id          | Integer | 条件 | 用户 ID      | 授权给用户时必填                        |
| auth_type        | String  | 否   | 授权类型     | "read"-只读，"write"-读写，默认 "read"  |
| status           | String  | 是   | 授权状态     | "01"-有效，"00"-无效，默认 "01"         |
| expire_time      | String  | 否   | 过期时间     | "2024-12-31 23:59:59"，为空表示永不过期 |

**请求示例**:

```json
{
  "resource_type": "skill",
  "resource_id": 101,
  "auth_target_type": "dept",
  "dept_id": 1,
  "user_id": null,
  "auth_type": "read",
  "status": "01",
  "expire_time": "2024-12-31 23:59:59"
}
```

**响应参数**:

| 字段    | 类型    | 中文说明    | 说明                |
| ------- | ------- | ----------- | ------------------- |
| status  | String  | 状态        | succeed-成功        |
| message | String  | 消息        | "授权成功"          |
| data.id | Integer | 授权记录 ID | 新创建的授权记录 ID |

**响应示例**:

```json
{
  "status": "succeed",
  "message": "授权成功",
  "data": { "id": 501 }
}
```

#### 5. 取消授权

**接口**: `POST /auth/revoke.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "resource_type": "skill",
  "resource_id": 101,
  "auth_target_type": "dept",
  "dept_id": 1,
  "user_id": null
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "取消授权成功"
}
```

---

### 九、Skill 授权管理接口

#### 1. 授权 Skill

**接口**: `POST /auth/skill.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "skill_id": 101,
  "auth_target_type": "dept",
  "dept_id": 1,
  "user_id": null,
  "auth_type": "read",
  "status": "01",
  "expire_time": "2024-12-31 23:59:59"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "授权成功",
  "data": { "id": 501 }
}
```

#### 2. 取消 Skill 授权

**接口**: `POST /auth/cancelSkill.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "skill_id": 101,
  "dept_id": 1,
  "user_id": null
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "取消授权成功"
}
```

#### 3. 查询 Skill 授权列表

**接口**: `POST /auth/skillList.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "skill_id": 101,
  "dept_id": 1,
  "user_id": null,
  "auth_target_type": "dept"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...]
  }
}
```

---

### 十、MCP 授权管理接口

#### 1. 授权 MCP

**接口**: `POST /mcp/auth.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "mcp_id": 201,
  "auth_target_type": "dept",
  "dept_id": 1,
  "user_id": null,
  "auth_type": "read",
  "status": "01",
  "expire_time": "2024-12-31 23:59:59"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "授权成功",
  "data": { "id": 601 }
}
```

#### 2. 取消 MCP 授权

**接口**: `POST /mcp/cancelAuth.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "mcp_id": 201,
  "dept_id": 1,
  "user_id": null
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "取消授权成功"
}
```

#### 3. 查询 MCP 授权列表

**接口**: `POST /mcp/authList.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "mcp_id": 201,
  "dept_id": 1,
  "user_id": null,
  "auth_target_type": "dept"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...]
  }
}
```

---

### 十一、数字警员授权管理接口

#### 1. 授权数字警员

**接口**: `POST /auth/officer.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "officer_id": 301,
  "auth_target_type": "user",
  "dept_id": null,
  "user_id": 1,
  "status": "01",
  "expire_time": "2024-12-31 23:59:59"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "授权成功",
  "data": { "id": 701 }
}
```

#### 2. 取消数字警员授权

**接口**: `POST /auth/cancelOfficer.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "officer_id": 301,
  "user_id": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "取消授权成功"
}
```

#### 3. 查询数字警员授权列表

**接口**: `POST /auth/officerList.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "officer_id": 301,
  "user_id": 1,
  "auth_target_type": "user"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...]
  }
}
```

---

### 十二、审核管理接口

#### 1. 部门待审批列表

**接口**: `POST /audit/deptPendingList.xhtml`

**权限**: 部门管理员

**请求**:

```json
{
  "resource_type": "skill",
  "audit_type": "create"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [
      {
        "resource_type": "skill",
        "resource_id": 101,
        "resource_name": "人员核查",
        "resource_code": "skill001",
        "audit_status": "00",
        "delete_audit_status": null,
        "audit_type": "create",
        "creator_id": 40,
        "creator_name": "张三",
        "create_time": "2026-06-24 10:00:00",
        "audit_remark": null,
        "delete_remark": null
      }
    ],
    "count": 2,
    "dept_id": 1
  }
}
```

#### 2. 超级待审批列表

**接口**: `POST /audit/superPendingList.xhtml`

**权限**: 超级管理员

**请求**:

```json
{
  "resource_type": "skill",
  "audit_type": "create",
  "dept_id": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [
      {
        "resource_type": "skill",
        "resource_id": 101,
        "resource_name": "人员核查",
        "resource_code": "skill001",
        "dept_id": 1,
        "dept_name": "平台管理中心",
        "audit_status": "00",
        "delete_audit_status": null,
        "audit_type": "create",
        "creator_id": 40,
        "creator_name": "张三",
        "create_time": "2026-06-24 10:00:00",
        "audit_remark": null,
        "delete_remark": null
      }
    ],
    "count": 1
  }
}
```

#### 3. Skill 发布申请

**接口**: `POST /apply/skill.xhtml`

**权限**: 创建者

**请求**:

```json
{
  "skill_id": 101,
  "apply_type": "publish",
  "apply_reason": "申请发布"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "申请已提交"
}
```

#### 4. Skill 发布审核

**接口**: `POST /apply/skillAudit.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "id": 1,
  "status": "01",
  "auditor_id": 1,
  "audit_remark": "审核通过"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "审核成功"
}
```

#### 5. Skill 发布申请列表

**接口**: `POST /apply/skillList.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "status": "00",
  "dept_id": 1
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...]
  }
}
```

---

### 十三、操作日志接口

#### 1. 查询操作日志

**接口**: `POST /log/operation.xhtml`

**权限**: 安全审计员

**请求参数**:

| 字段             | 类型    | 必填 | 中文说明 | 示例                                                                       |
| ---------------- | ------- | ---- | -------- | -------------------------------------------------------------------------- |
| user_id          | Integer | 否   | 用户 ID  | 按用户筛选                                                                 |
| user_account     | String  | 否   | 用户账号 | 按账号筛选，如身份证号                                                     |
| user_role        | String  | 否   | 用户角色 | 按角色筛选，如 "dept_admin"                                                |
| operation_type   | String  | 否   | 操作类型 | "QUERY"-查询，"CREATE"-创建，"UPDATE"-更新，"DELETE"-删除，"AUDIT"-审核    |
| operation_module | String  | 否   | 操作模块 | "OFFICER"-数字警员，"SKILL"-技能，"MCP"-MCP 服务，"USER"-用户，"DEPT"-部门 |
| start_time       | String  | 否   | 开始时间 | 14 位格式："20260601000000" 或 "2026-06-01 00:00:00"                       |
| end_time         | String  | 否   | 结束时间 | 14 位格式："20260624235959" 或 "2026-06-24 23:59:59"                       |
| limit            | Integer | 否   | 每页数量 | 默认 20，最大 100                                                          |
| offset           | Integer | 否   | 偏移量   | 分页用，从 0 开始                                                          |

**请求示例**:

```json
{
  "user_id": 1,
  "user_account": "320xxx",
  "user_role": "dept_admin",
  "operation_type": "QUERY",
  "operation_module": "OFFICER",
  "start_time": "20260601000000",
  "end_time": "20260624235959",
  "limit": 100,
  "offset": 0
}
```

**响应参数**:

| 字段                          | 类型    | 中文说明 | 说明                                  |
| ----------------------------- | ------- | -------- | ------------------------------------- |
| status                        | String  | 状态     | succeed-成功                          |
| message                       | String  | 消息     | 操作结果描述                          |
| data.list                     | Array   | 日志列表 | 操作日志记录数组                      |
| data.total                    | Integer | 总数     | 符合条件的总记录数                    |
| data.list[].id                | Integer | 日志 ID  | 主键 ID                               |
| data.list[].user_id           | Integer | 用户 ID  | 操作用户 ID                           |
| data.list[].user_account      | String  | 用户账号 | 操作用户账号（身份证号）              |
| data.list[].user_name         | String  | 用户姓名 | 操作用户姓名                          |
| data.list[].user_role         | String  | 用户角色 | 操作用户角色类型                      |
| data.list[].operation_type    | String  | 操作类型 | QUERY/CREATE/UPDATE/DELETE/AUDIT 等   |
| data.list[].operation_module  | String  | 操作模块 | OFFICER/SKILL/MCP/USER/DEPT 等        |
| data.list[].operation_content | Object  | 操作内容 | JSON 格式，记录具体操作内容           |
| data.list[].request_ip        | String  | 请求 IP  | 操作时的 IP 地址                      |
| data.list[].create_time       | String  | 创建时间 | 操作时间，格式："2026-06-24 10:00:00" |

**响应示例**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [
      {
        "id": 1,
        "user_id": 1,
        "user_account": "320xxx",
        "user_name": "张三",
        "user_role": "dept_admin",
        "operation_type": "QUERY",
        "operation_module": "OFFICER",
        "operation_content": { "action": "查询数字警员列表" },
        "request_ip": "10.32.71.224",
        "create_time": "2026-06-24 10:00:00"
      }
    ],
    "total": 100
  }
}
```

#### 2. 导出操作日志

**接口**: `POST /log/export.xhtml`

**权限**: 安全审计员

**请求**:

```json
{
  "user_id": 1,
  "operation_type": "QUERY",
  "operation_module": "OFFICER",
  "start_time": "20260601000000",
  "end_time": "20260624235959"
}
```

**响应**: 直接返回 Excel 文件（application/vnd.openxmlformats-officedocument.spreadsheetml.sheet）

**导出字段**:
| 列名 | 说明 |
|------|------|
| 时间 | create_time（格式：2026-06-24 08:56:42） |
| 用户角色 | user_role |
| 操作类型 | operation_type |
| 操作内容 | operation_content |
| 操作模块 | operation_module |
| IP 地址 | request_ip |

---

### 十四、会话记录接口

#### 1. 插入会话记录

**接口**: `POST /insertMsg.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "account": "320xxx",
  "sessionId": "session_123",
  "title": "会话标题",
  "content": "会话内容",
  "validity": "1",
  "ip": "10.32.71.224"
}
```

**响应**:

```json
{
  "code": "200",
  "status": "succeed",
  "message": "操作成功",
  "data": "",
  "token": "刷新后的 token"
}
```

#### 2. 更新会话记录

**接口**: `POST /updateMsg.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "account": "320xxx",
  "sessionId": "session_123",
  "title": "新标题",
  "content": "新内容",
  "qaCount": 10
}
```

**响应**:

```json
{
  "code": "200",
  "status": "succeed",
  "message": "操作成功",
  "data": "",
  "token": "刷新后的 token"
}
```

#### 3. 逻辑删除会话记录

**接口**: `POST /deleteLogicMsg.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "account": "320xxx",
  "sessionId": "session_123"
}
```

**响应**:

```json
{
  "code": "200",
  "status": "succeed",
  "message": "操作成功",
  "data": "",
  "token": "刷新后的 token"
}
```

#### 4. 查询会话记录

**接口**: `POST /selectByIdMsg.xhtml`

**权限**: 登录用户

**请求**:

```json
{
  "account": "320xxx",
  "sessionId": "session_123",
  "startTime": "2026-06-01 00:00:00",
  "endTime": "2026-06-24 23:59:59",
  "limit": 20
}
```

**响应**:

```json
{
  "code": "200",
  "status": "succeed",
  "message": "操作成功",
  "data": [...],
  "token": "刷新后的 token"
}
```

---

### 十五、登录日志接口

#### 查询登录日志

**接口**: `POST /getLoginLog.xhtml`

**权限**: 管理员

**请求**:

```json
{
  "account": "320xxx",
  "loginip": "10.32.71.224",
  "startTime": "2026-06-01 00:00:00",
  "endTime": "2026-06-24 23:59:59"
}
```

**响应**:

```json
{
  "status": "succeed",
  "message": "成功",
  "data": [...]
}
```

---

## 错误码说明

| 错误信息        | HTTP 状态码 | 说明               |
| --------------- | ----------- | ------------------ |
| 缺少 token！    | 400         | 请求头中缺少 token |
| token 已过期！  | 401         | Token 已过期       |
| IP 未授权！     | 403         | IP 不在白名单中    |
| 权限不足！      | 403         | 用户权限不足       |
| 用户不存在！    | 404         | 用户不存在         |
| 资源不存在！    | 404         | 请求的资源不存在   |
| 路由不存在：XXX | 404         | 请求的路由不存在   |
| 参数错误：XXX   | 400         | 参数验证失败       |
| 操作失败：XXX   | 500         | 系统错误           |

---

## 审核状态说明

| 状态码 | 说明     | 适用场景                       |
| ------ | -------- | ------------------------------ |
| `00`   | 待审核   | 刚提交审核申请                 |
| `01`   | 审核通过 | 审核已通过，资源已公开/已删除  |
| `02`   | 审核拒绝 | 审核未通过，需要修改后重新提交 |

### 两级审核流程

```
创建者提交 → 部门审核 → 超级管理员审核 → 公开/删除
               ↓            ↓
            拒绝 (02)    拒绝 (02)
```

---

## 用户角色说明

| 角色类型         | 角色名称   | 权限说明                     |
| ---------------- | ---------- | ---------------------------- |
| super_admin      | 超级管理员 | 系统最高权限，可管理所有资源 |
| security_auditor | 安全审计员 | 可查看操作日志、导出日志     |
| dept_admin       | 部门管理员 | 管理本部门资源和用户         |
| normal_user      | 普通用户   | 基础使用权限                 |

---

## 使用示例

### 场景 1: 创建数字警员后关联资源

```javascript
// 1. 创建数字警员
const officerResponse = await fetch('/dsjpt/jk/officer/create.xhtml', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', token: token },
  body: JSON.stringify({
    officer_name: '人员核查员',
    description: '用于人员信息核查',
  }),
})
const officer = await officerResponse.json()

// 2. 关联资源（多资源批量）
await fetch('/dsjpt/jk/officer/addResource.xhtml', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', token: token },
  body: JSON.stringify({
    officer_id: officer.data.id,
    skill_ids: '101,102,103',
    mcp_ids: '201,202',
  }),
})
```

### 场景 2: 授权 Skill 给部门

```javascript
// 授权 Skill 给部门
await fetch('/dsjpt/jk/auth/grant.xhtml', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', token: token },
  body: JSON.stringify({
    resource_type: 'skill',
    resource_id: 101,
    auth_target_type: 'dept',
    dept_id: 1,
    auth_type: 'read',
    status: '01',
    expire_time: '2024-12-31 23:59:59',
  }),
})
```

### 场景 3: 导出操作日志

```javascript
// 导出 Excel 文件
const response = await fetch('/dsjpt/jk/log/export.xhtml', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    token: token,
  },
  body: JSON.stringify({
    start_time: '20260601000000',
    end_time: '20260624235959',
  }),
})

// 下载 Excel 文件
const blob = await response.blob()
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `operation_logs_${new Date().getTime()}.xlsx`
a.click()
window.URL.revokeObjectURL(url)
```

---

## 注意事项

### 1. ID 格式要求

- 逗号分隔：`"101,102,103"` ✅
- 不要有空格：`"101, 102, 103"` ❌
- 自动跳过无效 ID：`"101,abc,102"` → 只处理 101 和 102

### 2. 清空重插策略

- 多资源操作会**清空现有所有关联**
- 前端必须传递**完整的资源列表**
- 不要只传递变更部分

### 3. 权限控制

- 只有创建者或超级管理员可以修改资源关联
- 接口会自动检查 token 和用户权限

### 4. 事务安全

- 清空和插入在同一事务中
- 要么全部成功，要么全部失败
- 不会出现数据不一致

### 5. 日期格式

- 支持 14 位日期格式：`20260621000000`
- 自动转换为：`2026-06-21 00:00:00`

---

---

## 附录 A：常用字段字典

### 审核状态码

| 状态码 | 说明     | 使用场景                       |
| ------ | -------- | ------------------------------ |
| `00`   | 待审核   | 刚提交审核申请，等待审批       |
| `01`   | 审核通过 | 审核已通过，资源已公开或已删除 |
| `02`   | 审核拒绝 | 审核未通过，需要修改后重新提交 |

### 用户状态码（shzt）

| 状态码 | 说明             |
| ------ | ---------------- |
| `00`   | 待审核           |
| `01`   | 审核通过（正常） |
| `02`   | 审核拒绝         |

### 授权状态码

| 状态码 | 说明               |
| ------ | ------------------ |
| `00`   | 无效（已取消授权） |
| `01`   | 有效（正常授权）   |

### 部门状态码

| 状态码 | 说明 |
| ------ | ---- |
| `00`   | 停用 |
| `01`   | 正常 |

### 资源类型（resource_type）

| 类型值    | 中文说明 | 对应表            |
| --------- | -------- | ----------------- |
| `SKILL`   | 技能     | t_skill           |
| `MCP`     | MCP 服务 | t_mcp_service     |
| `OFFICER` | 数字警员 | t_digital_officer |

### 授权目标类型（auth_target_type）

| 类型值 | 中文说明 | 说明                               |
| ------ | -------- | ---------------------------------- |
| `dept` | 部门     | 授权给整个部门，部门下用户都可使用 |
| `user` | 用户     | 授权给特定用户                     |

### 操作类型（operation_type）

| 类型值         | 中文说明 | 使用场景                   |
| -------------- | -------- | -------------------------- |
| `QUERY`        | 查询     | 查看、列表、详情等查询操作 |
| `CREATE`       | 创建     | 新建资源                   |
| `UPDATE`       | 更新     | 修改资源信息               |
| `DELETE`       | 删除     | 删除资源                   |
| `AUDIT`        | 审核     | 部门审核、超级审核         |
| `AUTH`         | 授权     | 授权资源给用户/部门        |
| `REVOKE`       | 取消授权 | 取消已授权的资源           |
| `APPLY_REMOVE` | 申请下架 | 申请下架资源               |
| `AUDIT_REMOVE` | 审核下架 | 审核下架申请               |
| `LOGIN`        | 登录     | 用户登录                   |
| `LOGOUT`       | 登出     | 用户登出                   |

### 操作模块（operation_module）

| 模块值    | 中文说明 | 对应资源         |
| --------- | -------- | ---------------- |
| `USER`    | 用户     | 用户管理相关     |
| `DEPT`    | 部门     | 部门管理相关     |
| `ROLE`    | 角色     | 角色管理相关     |
| `SKILL`   | 技能     | Skill 管理相关   |
| `MCP`     | MCP 服务 | MCP 服务管理相关 |
| `OFFICER` | 数字警员 | 数字警员管理相关 |
| `AUTH`    | 授权     | 授权管理相关     |
| `LOG`     | 日志     | 日志查询相关     |

### 协议类型（protocol_type）

| 类型值           | 中文说明       | 使用场景         |
| ---------------- | -------------- | ---------------- |
| `streamableHttp` | 流式 HTTP      | MCP 服务通信协议 |
| `sse`            | 服务器发送事件 | MCP 服务通信协议 |

### 技能类型（skill_type）

| 类型值     | 中文说明 | 使用场景           |
| ---------- | -------- | ------------------ |
| `QUERY`    | 查询类   | 信息查询、数据检索 |
| `ANALYSIS` | 分析类   | 数据分析、研判     |
| `TOOL`     | 工具类   | 辅助工具           |
| `OTHER`    | 其他     | 其他类型           |

---

## 附录 B：常见错误码

| 错误信息        | HTTP 状态码 | 说明               | 解决方案                   |
| --------------- | ----------- | ------------------ | -------------------------- |
| 缺少 token！    | 400         | 请求头中缺少 token | 在请求头中添加 token 字段  |
| token 已过期！  | 401         | Token 已过期       | 重新登录获取新 token       |
| IP 未授权！     | 403         | IP 不在白名单中    | 联系管理员添加 IP 到白名单 |
| 权限不足！      | 403         | 用户权限不足       | 检查用户角色是否有权限     |
| 用户不存在！    | 404         | 用户不存在         | 检查用户 ID 是否正确       |
| 资源不存在！    | 404         | 请求的资源不存在   | 检查资源 ID 是否正确       |
| 路由不存在：XXX | 404         | 请求的路由不存在   | 检查接口 URL 是否正确      |
| 参数错误：XXX   | 400         | 参数验证失败       | 检查参数格式和必填项       |
| 操作失败：XXX   | 500         | 系统错误           | 联系技术支持               |

---

## 附录 C：日期时间格式说明

### 支持的日期格式

1. **14 位紧凑格式**（输入）:
   - 格式：`yyyyMMddHHmmss`
   - 示例：`20260621000000`
   - 说明：2026 年 6 月 21 日 00 点 00 分 00 秒

2. **标准日期格式**（输入/输出）:
   - 格式：`yyyy-MM-dd HH:mm:ss`
   - 示例：`2026-06-21 00:00:00`
   - 说明：系统会自动转换 14 位格式为标准格式

3. **日期范围查询**:
   - start_time: 开始时间（包含）
   - end_time: 结束时间（包含）
   - 示例：查询 6 月份数据
     ```json
     {
       "start_time": "20260601000000",
       "end_time": "20260630235959"
     }
     ```

---

## 附录 D：分页参数说明

### 通用分页参数

| 参数   | 类型    | 默认值 | 说明                     |
| ------ | ------- | ------ | ------------------------ |
| page   | Integer | 1      | 页码，从 1 开始          |
| limit  | Integer | 20     | 每页数量，最大 100       |
| offset | Integer | 0      | 偏移量（与 page 二选一） |

### 分页响应格式

```json
{
  "status": "succeed",
  "message": "成功",
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5
  }
}
```

**字段说明**:

- `list`: 当前页数据列表
- `total`: 总记录数
- `page`: 当前页码
- `page_size`: 每页数量
- `total_pages`: 总页数

---

_文档版本：v6.1_  
_更新时间：2026-06-25_  
_基于 ntjk_api.py 生成_  
_包含字段中文注释_
