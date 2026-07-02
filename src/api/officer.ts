import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

export interface OfficerItem {
  id: number
  officer_code?: string
  officer_name: string
  description: string
  avatar_url?: string
  config?: Record<string, unknown>
  creator_id?: number
  creator_name?: string
  dept_id?: number
  dept_name?: string
  /** 统一上架状态：01-上架审核中 02-已上架 03-审核失败 04-下架审核中 05-已下架 06-下架失败 */
  status?: string
  /** 部门审核状态: '00'-待审核 '02'-通过 '03'-驳回 */
  dept_audit_status: string
  /** 超级管理员审核状态: '00'-待审核 '02'-通过 '03'-驳回 */
  super_audit_status: string
  /** 部门删除审核状态 */
  dept_delete_audit_status?: string
  /** 超级管理员删除审核状态 */
  super_delete_audit_status?: string
  /** 删除原因 */
  delete_reason?: string
  /** 上架状态 */
  is_public: boolean
  create_time?: string
}

export interface CreateOfficerPayload {
  officer_code?: string
  officer_name: string
  description?: string
  avatar_url?: string
  config?: Record<string, unknown>
  is_public?: boolean
}

export interface OfficerResource {
  id: number
  officer_id: number
  resource_type: 'skill' | 'mcp'
  resource_id: number
  resource_name?: string
  resource_code?: string
  resource_category?: string
  sort_order?: number
  status?: string
  /** 资源是否公开上架（来自 Skill/MCP 表 JOIN） */
  is_public?: boolean
  /** 配置覆盖 */
  config_override?: Record<string, unknown>
}

export interface AddResourcePayload {
  officer_id: number
  resource_type: 'skill' | 'mcp'
  resource_id: number
  sort_order?: number
  config?: Record<string, unknown>
}

/** 更新数字警员（含资源关联） */
export interface UpdateOfficerPayload {
  id: number
  officer_code?: string
  officer_name?: string
  description?: string
  avatar_url?: string
  /** Skill ID 列表，逗号分隔，如 "101,102,103" */
  skill_ids?: string
  /** MCP ID 列表，逗号分隔，如 "201,202" */
  mcp_ids?: string
}

/** 资源列表项（saveResources 使用） */
export interface OfficerResourceItem {
  resource_type: 'SKILL' | 'MCP'
  resource_id: number
  sort_order?: number
  config_override?: Record<string, unknown>
}

/** 保存资源完整列表（清空重插） */
export interface SaveResourcesPayload {
  officer_id: number
  resources: OfficerResourceItem[]
}

const BASE_URL =
  import.meta.env.VITE_PARSE_API_URL || import.meta.env.VITE_API_URL || 'http://10.32.71.224:8080'

const buildUrl = (path: string) => `${BASE_URL}${path}`

function enrichBody(body: Record<string, unknown>): Record<string, unknown> {
  const userId = getCurrentUserId()
  const deptId = getCurrentDeptId()
  const enriched = { ...body }
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

export const officerApi = {
  // ========== 数字警员 CRUD ==========

  async create(payload: CreateOfficerPayload): Promise<{ id: number }> {
    const response = await postApi<BaseResponse<{ id: number }>>(
      '/dsjpt/jk/officer/create.xhtml',
      payload,
    )
    return response.data || { id: 0 }
  },

  async list(
    params: {
      dept_audit_status?: string
      super_audit_status?: string
      dept_id?: number
      creator_id?: number
      is_public?: boolean
    } = {},
  ): Promise<OfficerItem[]> {
    const response = await postApi<BaseResponse<OfficerItem[] | { list: OfficerItem[]; total: number }>>(
      '/dsjpt/jk/officer/list.xhtml',
      params,
    )
    const data = response.data
    if (!data) return []
    if (Array.isArray(data)) return data
    if (typeof data === 'object' && 'list' in data) return (data as { list: OfficerItem[] }).list
    return []
  },

  // ========== 两级审核 ==========

  /** 部门审核数字警员 dept_audit_status: '02'-通过 '03'-驳回 */
  async deptAudit(
    id: number,
    dept_audit_status: '02' | '03',
    dept_audit_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/officer/deptAudit.xhtml', { id, dept_audit_status, dept_audit_remark })
  },

  /** 超级管理员审核数字警员 super_audit_status: '02'-通过 '03'-驳回（前置条件：部门审核已通过） */
  async superAudit(
    id: number,
    super_audit_status: '02' | '03',
    super_audit_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/officer/superAudit.xhtml', {
      id,
      super_audit_status,
      super_audit_remark,
    })
  },

  // ========== 上架审核流程 ==========

  /** 申请上架数字警员 */
  async applyPublish(id: number): Promise<void> {
    await postApi('/dsjpt/jk/officer/applyPublish.xhtml', { id })
  },

  /** 重新申请上架数字警员（被拒绝后） */
  async reapplyPublish(id: number): Promise<void> {
    await postApi('/dsjpt/jk/officer/reapplyPublish.xhtml', { id })
  },

  // ========== 上架/下架 ==========

  /** 设置数字警员上架状态（前置条件：两级审核都通过） */
  async setPublic(officer_id: number, is_public: boolean): Promise<void> {
    await postApi('/dsjpt/jk/officer/setPublic.xhtml', { officer_id, is_public })
  },

  // ========== 直接删除（无需审核，仅限已下架的资源） ==========

  /** 直接删除数字警员（超级管理员/创建者/部门管理员，仅限 is_public=false 时） */
  async delete(id: number): Promise<void> {
    await postApi('/dsjpt/jk/officer/delete.xhtml', { id })
  },

  // ========== 删除审核流程 ==========

  /** 申请删除数字警员（前置条件：is_public=false 即已下架） */
  async applyDelete(id: number, delete_reason: string): Promise<void> {
    await postApi('/dsjpt/jk/officer/applyDelete.xhtml', { id, delete_reason })
  },

  /** 部门审核删除 */
  async deptAuditDelete(
    id: number,
    dept_delete_audit_status: '02' | '03',
    dept_delete_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/officer/deptAuditDelete.xhtml', {
      id,
      dept_delete_audit_status,
      dept_delete_remark,
    })
  },

  /** 超级管理员审核删除（通过则软删除） */
  async superAuditDelete(
    id: number,
    super_delete_audit_status: '02' | '03',
    super_delete_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/officer/superAuditDelete.xhtml', {
      id,
      super_delete_audit_status,
      super_delete_remark,
    })
  },

  // ========== 下架审核流程 ==========

  /** 申请下架数字警员 */
  async applyRemove(id: number): Promise<void> {
    await postApi('/dsjpt/jk/officer/applyRemove.xhtml', { id })
  },

  /** 部门管理员审核下架 dept_audit_status: '05'-通过 '06'-拒绝 */
  async deptAuditRemove(
    id: number,
    dept_audit_status: '05' | '06',
    dept_audit_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/officer/deptAuditRemove.xhtml', { id, dept_audit_status, dept_audit_remark })
  },

  /** 超级管理员审核下架（05-通过 06-拒绝） */
  async superAuditRemove(
    id: number,
    super_delete_audit_status: '05' | '06',
    super_delete_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/officer/superAuditRemove.xhtml', {
      id,
      super_delete_audit_status,
      super_delete_remark,
    })
  },

  // ========== 数字警员 - 资源关联 ==========

  /** 添加资源到数字警员 - 模式 1：单资源添加 */
  async addResource(payload: AddResourcePayload): Promise<{ id: number }> {
    const response = await postApi<BaseResponse<{ id: number }>>(
      '/dsjpt/jk/officer/addResource.xhtml',
      payload,
    )
    return response.data || { id: 0 }
  },

  /** 批量添加资源 - 模式 2：多资源批量（清空重插） */
  async addResourcesBatch(
    officer_id: number,
    skill_ids?: string,
    mcp_ids?: string,
  ): Promise<{ count: number }> {
    const response = await postApi<BaseResponse<{ count: number }>>(
      '/dsjpt/jk/officer/addResource.xhtml',
      { officer_id, skill_ids, mcp_ids },
    )
    return response.data || { count: 0 }
  },

  /** 保存资源完整列表（清空后重新插入） */
  async saveResources(payload: SaveResourcesPayload): Promise<{ count: number }> {
    const response = await postApi<BaseResponse<{ count: number }>>(
      '/dsjpt/jk/officer/saveResources.xhtml',
      payload,
    )
    return response.data || { count: 0 }
  },

  /** 移除资源 */
  async removeResource(
    officer_id: number,
    resource_type: 'skill' | 'mcp',
    resource_id: number,
  ): Promise<void> {
    await postApi('/dsjpt/jk/officer/removeResource.xhtml', {
      officer_id,
      resource_type,
      resource_id,
    })
  },

  /** 更新资源配置 */
  async updateResourceConfig(
    officer_id: number,
    resource_type: 'skill' | 'mcp',
    resource_id: number,
    sort_order?: number,
    config?: Record<string, unknown>,
  ): Promise<void> {
    await postApi('/dsjpt/jk/officer/updateResourceConfig.xhtml', {
      officer_id,
      resource_type,
      resource_id,
      sort_order,
      config,
    })
  },

  /** 查询数字警员的所有资源 */
  async getResources(officer_id: number): Promise<OfficerResource[]> {
    const response = await postApi<BaseResponse<{ list: OfficerResource[] } | OfficerResource[]>>(
      '/dsjpt/jk/officer/getResources.xhtml',
      { officer_id },
    )
    const data = response.data
    if (!data) return []
    if (Array.isArray(data)) return data
    if (typeof data === 'object' && 'list' in data) return data.list
    return []
  },

  // ========== 数字警员 - 更新 ==========

  /** 更新数字警员（支持同时更新资源关联） */
  async update(payload: UpdateOfficerPayload): Promise<void> {
    await postApi('/dsjpt/jk/officer/update.xhtml', payload)
  },
}
