# NTJK API 接口文档

## 版本信息
- **版本**: v7.0 (优化版)
- **更新时间**: 2026-06-25
- **基础 URL**: `http://50.18.22.92:8082/dsjpt/jk`
- **Python 实现**: ntjk_api.py

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

1. **账号密码登录**: `POST /login.xhtml`
2. **零信任登录**: `POST /zero-trust/login.xhtml`

---

## 接口列表

### 一、用户管理接口

#### 1. 用户登录

**接口**: `POST /login.xhtml`

**权限**: 公开

**请求参数**:
| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| idCard | String | 是 | 身份证号 | "320xxxxxxxxxxxxxxx" |
| password | String | 是 | 密码 | "password123" |

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
    "dept_name": "技术部",
    "role_type": "dept_admin"
  }
}
```

#### 2. 零信任登录

**接口**: `POST /zero-trust/login.xhtml`

**权限**: 公开

**请求头**:
```
RZZX-USERTOKEN: <用户令牌 ID>
RZZX-APPTOKEN: <应用令牌>
```

#### 3. 用户注册

**接口**: `POST /register.xhtml`

**权限**: 公开

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | String | 是 | 姓名 |
| idCard | String | 是 | 身份证号 |
| phone | String | 是 | 手机号 |
| company | String | 否 | 公司 |
| department | Integer | 是 | 部门 ID |
| password | String | 是 | 密码 |

**功能说明**:
- 自动检查身份证是否重复
- 自动检查手机号是否重复
- 自动检查部门用户配额
- 自动分配普通用户角色

**响应示例**:
```json
{
  "status": "success",
  "message": "成功！"
}
```

#### 4. 查询用户列表

**接口**: `POST /getAllUserXx.xhtml`

**权限**: 登录用户

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| shzt | String | 否 | 审核状态 |
| idCard | String | 否 | 身份证号 |
| name | String | 否 | 姓名 |
| dept_id | Integer | 否 | 部门 ID |

---

### 二、部门管理接口

#### 1. 创建部门

**接口**: `POST /dept/create.xhtml`

**权限**: 超级管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dept_code | String | 是 | 部门编码 |
| dept_name | String | 是 | 部门名称 |
| parent_id | Integer | 否 | 父部门 ID |
| admin_id | Integer | 否 | 管理员 ID |
| user_quota | Integer | 否 | 用户配额 |
| status | String | 是 | 状态 (01-正常) |

#### 2. 部门列表

**接口**: `POST /dept/list.xhtml`

**权限**: 登录用户

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | String | 否 | 状态 |
| parent_id | Integer | 否 | 父部门 ID |

**响应包含**:
- 部门基本信息
- 用户配额使用情况
- 已授权 Skill/MCP/数字警员数量

---

### 三、角色管理接口

#### 1. 分配角色

**接口**: `POST /role/assign.xhtml`

**权限**: 超级管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | Integer | 是 | 用户 ID |
| role_id | Integer | 是 | 角色 ID |
| dept_id | Integer | 是 | 部门 ID |

**响应示例**:
```json
{
  "status": "succeed",
  "message": "分配成功"
}
```

#### 2. 取消角色

**接口**: `POST /role/remove.xhtml`

**权限**: 超级管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | Integer | 是 | 用户 ID |
| role_id | Integer | 是 | 角色 ID |

---

### 四、Skill 管理接口

#### 1. 创建 Skill

**接口**: `POST /skill/create.xhtml`

**权限**: 登录用户

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skill_code | String | 是 | 技能编码 |
| skill_name | String | 是 | 技能名称 |
| description | String | 否 | 描述 |
| skill_type | String | 否 | 技能类型 |
| skill_config | Object | 否 | 技能配置 |

**响应示例**:
```json
{
  "status": "succeed",
  "message": "创建成功",
  "data": {"id": 101}
}
```

#### 2. 更新 Skill

**接口**: `POST /skill/update.xhtml`

**权限**: 创建者或管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | Skill ID |
| skill_name | String | 否 | 技能名称 |
| description | String | 否 | 描述 |
| skill_config | Object | 否 | 技能配置 |

#### 3. Skill 列表查询

**接口**: `POST /skill/list.xhtml`

**权限**: 登录用户（仅查看有权限的）

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dept_audit_status | String | 否 | 部门审核状态 |
| super_audit_status | String | 否 | 超级审核状态 |
| dept_id | Integer | 否 | 部门 ID |
| creator_id | Integer | 否 | 创建者 ID |
| is_public | Boolean | 否 | 是否公开 |
| limit | Integer | 否 | 每页数量 |
| page | Integer | 否 | 页码 |

#### 4. 部门审核 Skill

**接口**: `POST /skill/deptAudit.xhtml`

**权限**: 部门管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | Skill ID |
| dept_audit_status | String | 是 | 审核状态 (01-通过，02-拒绝) |
| dept_audit_remark | String | 否 | 审核备注 |

#### 5. 超级管理员审核 Skill

**接口**: `POST /skill/superAudit.xhtml`

**权限**: 超级管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | Skill ID |
| super_audit_status | String | 是 | 审核状态 (01-通过，02-拒绝) |
| super_audit_remark | String | 否 | 审核备注 |

**说明**: 审核通过后自动设置 is_public = TRUE

#### 6. 申请删除 Skill

**接口**: `POST /skill/applyDelete.xhtml`

**权限**: 创建者

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | Skill ID |
| delete_reason | String | 是 | 删除原因 |

#### 7. 部门审核删除 Skill

**接口**: `POST /skill/deptAuditDelete.xhtml`

**权限**: 部门管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | Skill ID |
| dept_delete_audit_status | String | 是 | 审核状态 |
| dept_delete_remark | String | 否 | 审核备注 |

#### 8. 超级管理员审核删除 Skill

**接口**: `POST /skill/superAuditDelete.xhtml`

**权限**: 超级管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | Skill ID |
| super_delete_audit_status | String | 是 | 审核状态 |
| super_delete_remark | String | 否 | 审核备注 |

**说明**: 审核通过后自动清理所有授权记录和关联关系

#### 9. 设置 Skill 上架/下架

**接口**: `POST /skill/setPublic.xhtml`

**权限**: 管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | Skill ID |
| is_public | Boolean | 是 | 是否公开 |

#### 10. 申请下架 Skill

**接口**: `POST /skill/applyRemove.xhtml`

**权限**: 部门管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | Skill ID |
| delete_reason | String | 是 | 下架原因 |

#### 11. 超级管理员审核下架 Skill

**接口**: `POST /skill/superAuditRemove.xhtml`

**权限**: 超级管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | Skill ID |
| super_delete_audit_status | String | 是 | 审核状态 |
| super_delete_remark | String | 否 | 审核备注 |

#### 12. Skill 授权

**接口**: `POST /auth/grant.xhtml`

**权限**: 管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource_type | String | 是 | 资源类型 (skill) |
| resource_id | Integer | 是 | Skill ID |
| auth_target_type | String | 是 | 授权类型 (dept/user) |
| dept_id | Integer | 条件 | 部门 ID（授权给部门时必填） |
| user_id | Integer | 条件 | 用户 ID（授权给用户时必填） |
| auth_type | String | 否 | 授权类型 (read/write) |
| status | String | 是 | 授权状态 (01/00) |
| expire_time | String | 否 | 过期时间 |

#### 13. Skill 取消授权

**接口**: `POST /auth/revoke.xhtml`

**权限**: 管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource_type | String | 是 | 资源类型 (skill) |
| resource_id | Integer | 是 | Skill ID |
| auth_target_type | String | 是 | 授权类型 (dept/user) |
| dept_id | Integer | 条件 | 部门 ID |
| user_id | Integer | 条件 | 用户 ID |

---

### 五、MCP 服务管理接口

#### 1. 创建或更新 MCP 服务

**接口**: `POST /mcp/createOrUpdate.xhtml`

**权限**: 登录用户

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 否 | 服务 ID（更新时必填） |
| service_code | String | 是 | 服务编码 |
| service_name | String | 是 | 服务名称 |
| description | String | 否 | 描述 |
| service_url | String | 是 | 服务地址 |
| api_key | String | 否 | API 密钥 |
| service_type | String | 否 | 服务类型 |
| protocol_type | String | 否 | 协议类型 |
| config | Object | 否 | 配置信息 |
| tools | Array | 否 | 工具列表 |

**响应示例**:
```json
{
  "status": "succeed",
  "message": "创建成功",
  "data": {"id": 201}
}
```

#### 2. 获取 MCP 详情

**接口**: `POST /mcp/get.xhtml`

**权限**: 登录用户

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | MCP ID |

#### 3. MCP 列表查询

**接口**: `POST /mcp/listEnhanced.xhtml`

**权限**: 登录用户

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | Integer | 否 | 页码 |
| page_size | Integer | 否 | 每页数量 |
| enabled_only | Boolean | 否 | 仅启用 |
| protocol_type | String | 否 | 协议类型 |
| category | String | 否 | 分类 |
| keyword | String | 否 | 关键词 |

#### 4. 删除 MCP 服务

**接口**: `POST /mcp/delete.xhtml`

**权限**: 超级管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | MCP ID |

#### 5. 部门审核 MCP

**接口**: `POST /mcp/deptAudit.xhtml`

**权限**: 部门管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | MCP ID |
| dept_audit_status | String | 是 | 审核状态 |
| dept_audit_remark | String | 否 | 审核备注 |

#### 6. 超级管理员审核 MCP

**接口**: `POST /mcp/superAudit.xhtml`

**权限**: 超级管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | MCP ID |
| super_audit_status | String | 是 | 审核状态 |
| super_audit_remark | String | 否 | 审核备注 |

#### 7-12. MCP 删除/下架相关接口

与 Skill 类似，包括：
- `POST /mcp/applyDelete.xhtml` - 申请删除
- `POST /mcp/deptAuditDelete.xhtml` - 部门审核删除
- `POST /mcp/superAuditDelete.xhtml` - 超级审核删除
- `POST /mcp/applyRemove.xhtml` - 申请下架
- `POST /mcp/superAuditRemove.xhtml` - 超级审核下架
- `POST /mcp/setPublic.xhtml` - 设置公开

#### 13. MCP 授权

**接口**: `POST /mcp/auth.xhtml`

**权限**: 管理员

**请求参数**: 参考 Skill 授权

#### 14. MCP 取消授权

**接口**: `POST /mcp/cancelAuth.xhtml`

**权限**: 管理员

**请求参数**: 参考 Skill 取消授权

#### 15. MCP 授权列表

**接口**: `POST /mcp/authList.xhtml`

**权限**: 管理员

---

### 六、数字警员管理接口

#### 1. 创建数字警员

**接口**: `POST /officer/create.xhtml`

**权限**: 登录用户

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| officer_code | String | 是 | 警员编码 |
| officer_name | String | 是 | 警员名称 |
| description | String | 否 | 描述 |
| avatar_url | String | 否 | 头像 URL |
| config | Object | 否 | 配置信息 |

#### 2. 更新数字警员

**接口**: `POST /officer/update.xhtml`

**权限**: 创建者或管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Integer | 是 | 数字警员 ID |
| officer_name | String | 否 | 警员名称 |
| description | String | 否 | 描述 |
| avatar_url | String | 否 | 头像 URL |
| skill_ids | String | 否 | Skill ID 列表 (逗号分隔) |
| mcp_ids | String | 否 | MCP ID 列表 (逗号分隔) |

#### 3. 数字警员列表查询

**接口**: `POST /officer/list.xhtml`

**权限**: 登录用户

**请求参数**: 参考 Skill 列表查询

#### 4-11. 数字警员审核/删除/下架接口

与 Skill 类似，包括：
- `POST /officer/deptAudit.xhtml` - 部门审核
- `POST /officer/superAudit.xhtml` - 超级审核
- `POST /officer/applyDelete.xhtml` - 申请删除
- `POST /officer/deptAuditDelete.xhtml` - 部门审核删除
- `POST /officer/superAuditDelete.xhtml` - 超级审核删除
- `POST /officer/applyRemove.xhtml` - 申请下架
- `POST /officer/superAuditRemove.xhtml` - 超级审核下架
- `POST /officer/setPublic.xhtml` - 设置公开

#### 12. 数字警员授权

**接口**: `POST /auth/officer.xhtml`

**权限**: 管理员

#### 13. 数字警员取消授权

**接口**: `POST /auth/cancelOfficer.xhtml`

**权限**: 管理员

---

### 七、数字警员资源关联接口

#### 1. 添加资源到数字警员

**接口**: `POST /officer/addResource.xhtml`

**权限**: 创建者或管理员

**模式 1: 单资源添加**

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| officer_id | Integer | 是 | 数字警员 ID |
| resource_type | String | 是 | 资源类型 (SKILL/MCP) |
| resource_id | Integer | 是 | 资源 ID |
| sort_order | Integer | 否 | 排序顺序 |
| config | Object | 否 | 配置信息 |

**模式 2: 多资源批量添加**

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| officer_id | Integer | 是 | 数字警员 ID |
| skill_ids | String | 否 | Skill ID 列表 (逗号分隔) |
| mcp_ids | String | 否 | MCP ID 列表 (逗号分隔) |

**说明**: 批量模式会清空现有所有关联后重新插入

#### 2. 从数字警员移除资源

**接口**: `POST /officer/removeResource.xhtml`

**权限**: 创建者或管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| officer_id | Integer | 是 | 数字警员 ID |
| resource_type | String | 是 | 资源类型 |
| resource_id | Integer | 是 | 资源 ID |

#### 3. 更新资源配置

**接口**: `POST /officer/updateResourceConfig.xhtml`

**权限**: 创建者或管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| officer_id | Integer | 是 | 数字警员 ID |
| resource_type | String | 是 | 资源类型 |
| resource_id | Integer | 是 | 资源 ID |
| config_override | Object | 是 | 配置覆盖 |

#### 4. 获取数字警员的资源列表

**接口**: `POST /officer/getResources.xhtml`

**权限**: 登录用户

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| officer_id | Integer | 是 | 数字警员 ID |

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
        "is_public": true
      }
    ]
  }
}
```

#### 5. 保存数字警员资源关联

**接口**: `POST /officer/saveResources.xhtml`

**权限**: 创建者或管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| officer_id | Integer | 是 | 数字警员 ID |
| resources | Array | 是 | 资源列表 |
| resources[].resource_type | String | 是 | 资源类型 |
| resources[].resource_id | Integer | 是 | 资源 ID |
| resources[].sort_order | Integer | 否 | 排序顺序 |
| resources[].config_override | Object | 否 | 配置覆盖 |

**说明**: 使用清空重插策略，必须传递完整的资源列表

---

### 八、统一授权管理接口

#### 1. 获取可授权资源列表

**接口**: `POST /auth/resources.xhtml`

**权限**: 管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource_type | String | 否 | 资源类型 (skill/mcp/officer) |
| status | String | 否 | 状态 |
| is_public | Boolean | 否 | 是否公开 |
| keyword | String | 否 | 关键词 |
| page | Integer | 否 | 页码 |
| limit | Integer | 否 | 每页数量 |

#### 2. 获取授权列表

**接口**: `POST /auth/authList.xhtml`

**权限**: 管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| auth_target_type | String | 否 | 授权类型 (dept/user) |
| resource_type | String | 否 | 资源类型 |
| resource_id | Integer | 否 | 资源 ID |
| dept_id | Integer | 否 | 部门 ID |
| status | String | 否 | 授权状态 |

#### 3. 部门管理员查看管辖部门授权列表

**接口**: `POST /auth/deptUserList.xhtml`

**权限**: 部门管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dept_id | Integer | 是 | 部门 ID |
| resource_type | String | 否 | 资源类型 |
| auth_target_type | String | 否 | 授权类型 |
| status | String | 否 | 授权状态 |

#### 4. 授权资源（统一接口）

**接口**: `POST /auth/grant.xhtml`

**权限**: 管理员

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource_type | String | 是 | 资源类型 (skill/mcp/officer) |
| resource_id | Integer | 是 | 资源 ID |
| auth_target_type | String | 是 | 授权类型 (dept/user) |
| dept_id | Integer | 条件 | 部门 ID |
| user_id | Integer | 条件 | 用户 ID |
| auth_type | String | 否 | 授权类型 (read/write) |
| status | String | 是 | 授权状态 (01/00) |
| expire_time | String | 否 | 过期时间 |

**响应示例**:
```json
{
  "status": "succeed",
  "message": "授权成功",
  "data": {"id": 501}
}
```

#### 5. 取消授权（统一接口）

**接口**: `POST /auth/revoke.xhtml`

**权限**: 管理员

**请求参数**: 参考授权接口

---

## 优化说明

### v7.0 优化内容

1. **统一审核流程** - 使用 ResourceAuditManager 统一管理 Skill、MCP、数字警员的审核
2. **统一删除/下架流程** - 使用 ResourceRemovalManager 统一管理删除和下架
3. **统一授权流程** - 使用 UnifiedAuthManager 统一授权接口
4. **数据库连接优化** - 使用 db_cursor 上下文管理器
5. **Token 验证优化** - 使用 @require_token 装饰器
6. **代码精简** - 删除 28 个冗余方法，减少 853 行代码

### 优化模块

| 模块名称 | 功能说明 |
|---------|---------|
| db_cursor() | 数据库连接上下文管理器 |
| @require_token | Token 验证装饰器 |
| @require_role | 角色权限装饰器 |
| ResourceAuditManager | 通用审核管理器 |
| ResourceRemovalManager | 通用下架管理器 |
| UnifiedAuthManager | 统一授权管理器 |

---

## 附录

### 状态码说明

| 状态码 | 说明 |
|-------|------|
| 00 | 待审核 |
| 01 | 通过/有效 |
| 02 | 拒绝/无效 |

### 角色类型

| 角色类型 | 说明 |
|---------|------|
| super_admin | 超级管理员 |
| dept_admin | 部门管理员 |
| normal_user | 普通用户 |

### 资源类型

| 资源类型 | 说明 |
|---------|------|
| skill | 技能 |
| mcp | MCP 服务 |
| officer | 数字警员 |

---

**文档版本**: v7.0  
**最后更新**: 2026-06-25
