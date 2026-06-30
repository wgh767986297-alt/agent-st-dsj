import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'
import type { SkillItem } from '@/api/skillManage'
import type { OfficerItem } from '@/api/officer'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

// ========== 类型定义 ==========

/** 可授权资源（对齐 /auth/resources.xhtml 实际返回字段） */
export interface AuthResource {
  resource_type: 'skill' | 'mcp' | 'officer'
  resource_id: number
  resource_name: string
  resource_code: string
  description: string
  is_public: boolean
  dept_audit_status: string
  super_audit_status: string
  creator_id: number
  creator_name: string
  dept_id: number
  dept_name: string
  create_time: string
}

/** 授权记录 - 用户授权 */
export interface UserAuthRecord {
  id: number
  officer_id?: number
  user_id: number
  user_name: string
  user_id_card?: string
  user_phone?: string
  user_dept_id?: number
  user_dept_name?: string
  officer_name?: string
  officer_code?: string
  scene_type?: string
  status: string
  expire_time?: string
  auth_time?: string
  grantor_name?: string
}

/** 授权记录 - 部门授权 */
export interface DeptAuthRecord {
  resource_type: 'skill' | 'mcp' | 'officer'
  id: number
  resource_id: number
  target_id: number
  target_name: string
  auth_target_type: 'dept' | 'user'
  resource_name: string
  resource_code: string
  status: string
  expire_time?: string
  auth_time?: string
  grantor_name?: string
}

/** Skill 授权记录 */
export interface SkillAuthRecord {
  id: number
  skill_id: number
  skill_name?: string
  dept_id: number
  dept_name?: string
  grantor_id?: number
  auth_type: string
  status: string
  expire_time?: string
  create_time?: string
}

/** 警员授权记录 */
export interface OfficerAuthRecord {
  id: number
  officer_id: number
  officer_name?: string
  user_id: number
  user_name?: string
  grantor_id?: number
  status: string
  expire_time?: string
  create_time?: string
}

/** MCP 授权记录 */
export interface McpAuthRecord {
  id: number
  mcp_id: number
  service_name?: string
  dept_id: number
  dept_name?: string
  grantor_id?: number
  auth_type: string
  status: string
  expire_time?: string
  create_time?: string
}

// ========== MCP 后端管理类型 ==========

export interface McpBackendItem {
  id: number
  service_name?: string
  identifier?: string
  url?: string
  description?: string
  category?: string
  status?: string
  create_time?: string
}

// ========== 基础请求封装 ==========

const BASE_URL =
  import.meta.env.VITE_PARSE_API_URL || import.meta.env.VITE_API_URL || 'http://10.32.71.224:8080'

const buildUrl = (path: string) => `${BASE_URL}${path}`

function enrichBody(body: Record<string, unknown>): Record<string, unknown> {
  const userId = getCurrentUserId()
  const deptId = getCurrentDeptId()
  const enriched = { ...body }
  // 使用 'in' 检查：调用方可通过显式声明 key（包括 undefined）来阻止自动注入
  if (userId != null && !('user_id' in enriched)) {
    enriched.user_id = userId
  }
  if (deptId != null && !('dept_id' in enriched)) {
    enriched.dept_id = deptId
  }
  return enriched
}

async function postApi<T extends BaseResponse>(path: string, body: object): Promise<T> {
  const token = getAuthToken()

  if (!token) {
    handleAuthExpired('登录状态已失效，请重新登录')
    throw new Error('登录状态已失效，请重新登录')
  }

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify(enrichBody(body as Record<string, unknown>)),
  })

  const text = await response.text()
  let data: T

  try {
    data = text ? (JSON.parse(text) as T) : ({} as T)
  } catch {
    throw new Error(text || '接口返回格式错误')
  }

  if (isAuthExpiredResponse(data, response.status)) {
    handleAuthExpired()
    throw new Error(data.message || 'token已过期')
  }

  if (!response.ok) {
    throw new Error(data.message || `请求失败: ${response.status}`)
  }

  if (data.status && !['success', 'succeed'].includes(data.status)) {
    throw new Error(data.message || '操作失败')
  }

  return data
}

export const authManageApi = {
  // ========== 统一授权管理 ==========

  /**
   * 查询可授权资源（user_id / dept_id 仅作外置筛选条件，默认不传 = 看全部）
   */
  async getResources(
    params: {
      resource_type?: 'skill' | 'mcp' | 'officer'
      status?: string
      is_public?: boolean
      keyword?: string
      page?: number
      limit?: number
      dept_id?: number
      user_id?: number
    } = {},
  ): Promise<AuthResource[]> {
    // 显式声明 body key，仅在调用方明确传入时才带值，阻止 enrichBody 自动注入
    const body: Record<string, unknown> = {}
    if (params.resource_type) body.resource_type = params.resource_type
    if (params.status) body.status = params.status
    if (params.is_public !== undefined) body.is_public = params.is_public
    if (params.keyword) body.keyword = params.keyword
    if (params.page) body.page = params.page
    if (params.limit) body.limit = params.limit
    body.dept_id = params.dept_id ?? undefined
    body.user_id = params.user_id ?? undefined
    const response = await postApi<BaseResponse<AuthResource[]>>(
      '/dsjpt/jk/auth/resources.xhtml',
      body,
    )
    // 实际 API 返回 data 为扁平数组
    return Array.isArray(response.data) ? response.data : []
  },

  /** 按部门查询用户（二级联动选择器） */
  async getUsersByDept(
    dept_id: number,
  ): Promise<
    { id: number; name: string; user_account?: string; phone?: string; department?: string }[]
  > {
    const response = await postApi<
      BaseResponse<
        { id: number; name: string; user_account?: string; phone?: string; department?: string }[]
      > & { userList?: { id: number; name: string; user_account?: string; phone?: string; department?: string }[] }
    >('/dsjpt/jk/user/byDept.xhtml', { dept_id })
    return response.data || response.userList || []
  },

  /**
   * 查询授权列表（dept_id / user_id 仅作外置筛选条件）
   */
  async getAuthList(params: {
    auth_target_type: 'user' | 'dept'
    dept_id?: number
    user_id?: number
    officer_id?: number
  }): Promise<(UserAuthRecord | DeptAuthRecord)[]> {
    // 显式声明 body key，仅当调用方传入时才带值
    const body: Record<string, unknown> = { auth_target_type: params.auth_target_type }
    if (params.officer_id != null) body.officer_id = params.officer_id
    body.dept_id = params.dept_id ?? undefined
    body.user_id = params.user_id ?? undefined
    const response = await postApi<BaseResponse<(UserAuthRecord | DeptAuthRecord)[]>>(
      '/dsjpt/jk/auth/authList.xhtml',
      body,
    )
    return response.data || []
  },

  /** 统一授权 */
  async grant(payload: {
    auth_target_type: 'user' | 'dept'
    user_id?: number
    dept_id?: number
    resource_type: 'skill' | 'mcp' | 'officer'
    resource_id: number
    officer_id?: number
    auth_type?: 'read' | 'write' | 'manage'
    expire_time?: string
  }): Promise<void> {
    await postApi('/dsjpt/jk/auth/grant.xhtml', payload)
  },

  /** 统一取消授权 */
  async revoke(payload: {
    auth_target_type: 'user' | 'dept'
    user_id?: number
    dept_id?: number
    resource_type: 'skill' | 'mcp' | 'officer'
    resource_id: number
    officer_id?: number
  }): Promise<void> {
    await postApi('/dsjpt/jk/auth/revoke.xhtml', payload)
  },

  // ========== Skill 授权（旧接口） ==========

  /** 授权 Skill 给部门 */
  async grantSkillToDept(
    skill_id: number,
    dept_id: number,
    auth_type: 'read' | 'write' | 'manage' = 'read',
    expire_time?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/auth/skill.xhtml', { skill_id, dept_id, auth_type, expire_time })
  },

  /** 取消 Skill 授权 */
  async cancelSkillAuth(skill_id: number, dept_id: number): Promise<void> {
    await postApi('/dsjpt/jk/auth/cancelSkill.xhtml', { skill_id, dept_id })
  },

  /** 查询 Skill 授权列表（dept_id / user_id 仅作外置筛选条件） */
  async getSkillAuthList(
    params: {
      dept_id?: number
      skill_id?: number
      user_id?: number
      auth_target_type?: 'user' | 'dept'
      status?: string
      page?: number
      page_size?: number
      keyword?: string
      category?: string
    } = {},
  ): Promise<{ items: SkillItem[]; total: number }> {
    const body: Record<string, unknown> = {}
    if (params.skill_id != null) body.skill_id = params.skill_id
    if (params.auth_target_type) body.auth_target_type = params.auth_target_type
    if (params.status) body.status = params.status
    if (params.page) body.page = params.page
    if (params.page_size) body.page_size = params.page_size
    if (params.keyword) body.keyword = params.keyword
    if (params.category) body.category = params.category
    body.dept_id = params.dept_id ?? undefined
    body.user_id = params.user_id ?? undefined
    const response = await postApi<
      BaseResponse<SkillItem[] | { list: SkillItem[]; items: SkillItem[]; total: number }>
    >('/dsjpt/jk/auth/skillList.xhtml', body)
    const data = response.data
    if (!data) return { items: [], total: 0 }
    if (Array.isArray(data)) return { items: data, total: data.length }
    if (typeof data === 'object') {
      const items = data.items || data.list || []
      return { items, total: data.total || items.length }
    }
    return { items: [], total: 0 }
  },

  // ========== 数字警员授权（旧接口） ==========

  /** 授权数字警员给用户 */
  async grantOfficerToUser(
    officer_id: number,
    user_id: number,
    expire_time?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/auth/officer.xhtml', { officer_id, user_id, expire_time })
  },

  /** 取消数字警员授权 */
  async cancelOfficerAuth(officer_id: number, user_id: number): Promise<void> {
    await postApi('/dsjpt/jk/auth/cancelOfficer.xhtml', { officer_id, user_id })
  },

  /** 查询数字警员授权列表（user_id 仅作外置筛选条件） */
  async getOfficerAuthList(
    params: {
      user_id?: number
      officer_id?: number
      auth_target_type?: 'user' | 'dept'
      status?: string
      page?: number
      page_size?: number
      keyword?: string
    } = {},
  ): Promise<{ items: OfficerItem[]; total: number }> {
    const body: Record<string, unknown> = {}
    if (params.officer_id != null) body.officer_id = params.officer_id
    if (params.auth_target_type) body.auth_target_type = params.auth_target_type
    if (params.status) body.status = params.status
    if (params.page) body.page = params.page
    if (params.page_size) body.page_size = params.page_size
    if (params.keyword) body.keyword = params.keyword
    body.user_id = params.user_id ?? undefined
    const response = await postApi<
      BaseResponse<OfficerItem[] | { list: OfficerItem[]; items: OfficerItem[]; total: number }>
    >('/dsjpt/jk/auth/officerList.xhtml', body)
    const data = response.data
    if (!data) return { items: [], total: 0 }
    if (Array.isArray(data)) return { items: data, total: data.length }
    if (typeof data === 'object') {
      const items = data.items || data.list || []
      return { items, total: data.total || items.length }
    }
    return { items: [], total: 0 }
  },

  // ========== MCP 后端管理 ==========

  /** 创建 MCP 服务（后端接口） */
  async createMcp(payload: Record<string, unknown>): Promise<void> {
    await postApi('/dsjpt/jk/mcp/create.xhtml', payload)
  },

  /** 更新 MCP 服务（后端接口） */
  async updateMcp(payload: Record<string, unknown>): Promise<void> {
    await postApi('/dsjpt/jk/mcp/update.xhtml', payload)
  },

  /** 删除 MCP 服务（后端接口） */
  async deleteMcp(id: number): Promise<void> {
    await postApi('/dsjpt/jk/mcp/delete.xhtml', { id })
  },

  /** 查询 MCP 服务列表（后端接口） */
  async listMcp(params: Record<string, unknown> = {}): Promise<McpBackendItem[]> {
    const response = await postApi<BaseResponse<McpBackendItem[]>>(
      '/dsjpt/jk/mcp/list.xhtml',
      params,
    )
    return response.data || []
  },

  // ========== MCP 授权 ==========

  /** 授权 MCP 给部门 */
  async grantMcpToDept(
    mcp_id: number,
    dept_id: number,
    auth_type: 'read' | 'write' | 'manage' = 'read',
    expire_time?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/mcp/auth.xhtml', { mcp_id, dept_id, auth_type, expire_time })
  },

  /** 取消 MCP 授权 */
  async cancelMcpAuth(mcp_id: number, dept_id: number): Promise<void> {
    await postApi('/dsjpt/jk/mcp/cancelAuth.xhtml', { mcp_id, dept_id })
  },

  /** 查询 MCP 授权列表（dept_id 仅作外置筛选条件） */
  async getMcpAuthList(
    params: { dept_id?: number; mcp_id?: number } = {},
  ): Promise<McpAuthRecord[]> {
    const body: Record<string, unknown> = {}
    if (params.mcp_id != null) body.mcp_id = params.mcp_id
    body.dept_id = params.dept_id ?? undefined
    const response = await postApi<BaseResponse<McpAuthRecord[]>>(
      '/dsjpt/jk/mcp/authList.xhtml',
      body,
    )
    return response.data || []
  },

  // ========== MCP 两级审核 ==========

  /** 部门审核 MCP 服务 */
  async deptAuditMcp(
    id: number,
    dept_audit_status: '02' | '03',
    dept_audit_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/mcp/deptAudit.xhtml', { id, dept_audit_status, dept_audit_remark })
  },

  /** 超级管理员审核 MCP 服务 */
  async superAuditMcp(
    id: number,
    super_audit_status: '02' | '03',
    super_audit_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/mcp/superAudit.xhtml', { id, super_audit_status, super_audit_remark })
  },

  /** 设置 MCP 上架状态 */
  async setMcpPublic(mcp_id: number, is_public: boolean): Promise<void> {
    await postApi('/dsjpt/jk/mcp/setPublic.xhtml', { mcp_id, is_public })
  },

  /** 申请删除 MCP 服务 */
  async applyDeleteMcp(id: number, delete_reason: string): Promise<void> {
    await postApi('/dsjpt/jk/mcp/applyDelete.xhtml', { id, delete_reason })
  },

  /** 部门审核删除 MCP */
  async deptAuditDeleteMcp(
    id: number,
    dept_delete_audit_status: '02' | '03',
    dept_delete_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/mcp/deptAuditDelete.xhtml', {
      id,
      dept_delete_audit_status,
      dept_delete_remark,
    })
  },

  /** 超级管理员审核删除 MCP */
  async superAuditDeleteMcp(
    id: number,
    super_delete_audit_status: '02' | '03',
    super_delete_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/mcp/superAuditDelete.xhtml', {
      id,
      super_delete_audit_status,
      super_delete_remark,
    })
  },
}
