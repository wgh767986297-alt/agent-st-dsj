import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

export interface SkillItem {
  id: number
  skill_code: string
  skill_name: string
  description: string
  skill_type: string
  skill_config?: Record<string, unknown>
  creator_id?: number
  creator_name?: string
  dept_id?: number
  dept_name?: string
  /** 统一上架状态：01-上架审核中 02-已上架 03-审核失败 04-下架审核中 05-已下架 06-下架失败 */
  status?: string
  /** 部门审核状态 */
  dept_audit_status: string
  /** 超级管理员审核状态 */
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

export interface CreateSkillPayload {
  skill_code: string
  skill_name: string
  description?: string
  skill_type?: string
  skill_config?: Record<string, unknown>
  is_public?: boolean
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

export interface SkillListParams {
  dept_audit_status?: string
  super_audit_status?: string
  dept_id?: number
  creator_id?: number
  skill_type?: string
  keyword?: string
  is_public?: boolean
  page?: number
  limit?: number
}

export interface SkillListResult {
  list: SkillItem[]
  total: number
}

export const skillManageApi = {
  async create(payload: CreateSkillPayload): Promise<void> {
    await postApi('/dsjpt/jk/skill/create.xhtml', payload)
  },

  async list(params: SkillListParams = {}): Promise<SkillListResult> {
    const response = await postApi<BaseResponse<SkillItem[] | SkillListResult>>(
      '/dsjpt/jk/skill/list.xhtml',
      params,
    )
    const data = response.data
    if (!data) return { list: [], total: 0 }
    if (Array.isArray(data)) return { list: data, total: data.length }
    if (typeof data === 'object' && 'list' in data) return data as SkillListResult
    return { list: [], total: 0 }
  },

  // ========== 两级审核 ==========

  /** 部门审核技能 dept_audit_status: '02'-通过 '03'-驳回 */
  async deptAudit(
    id: number,
    dept_audit_status: '02' | '03',
    dept_audit_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/skill/deptAudit.xhtml', { id, dept_audit_status, dept_audit_remark })
  },

  /** 超级管理员审核技能 */
  async superAudit(
    id: number,
    super_audit_status: '02' | '03',
    super_audit_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/skill/superAudit.xhtml', {
      id,
      super_audit_status,
      super_audit_remark,
    })
  },

  // ========== 上架审核流程 ==========

  /** 申请上架技能 */
  async applyPublish(id: number): Promise<void> {
    await postApi('/dsjpt/jk/skill/applyPublish.xhtml', { id })
  },

  /** 重新申请上架技能（被拒绝后） */
  async reapplyPublish(id: number): Promise<void> {
    await postApi('/dsjpt/jk/skill/reapplyPublish.xhtml', { id })
  },

  // ========== 上架/下架 ==========

  /** 设置技能上架状态（前置条件：两级审核都通过） */
  async setPublic(skill_id: number, is_public: boolean): Promise<void> {
    await postApi('/dsjpt/jk/skill/setPublic.xhtml', { skill_id, is_public })
  },

  // ========== 直接删除（无需审核） ==========

  /** 直接删除技能（超级管理员/创建者/部门管理员，无需审核流程） */
  async delete(id: number): Promise<void> {
    await postApi('/dsjpt/jk/skill/delete.xhtml', { id })
  },

  // ========== 删除审核流程 ==========

  /** 申请删除技能 */
  async applyDelete(id: number, delete_reason: string): Promise<void> {
    await postApi('/dsjpt/jk/skill/applyDelete.xhtml', { id, delete_reason })
  },

  /** 部门审核删除 */
  async deptAuditDelete(
    id: number,
    dept_delete_audit_status: '02' | '03',
    dept_delete_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/skill/deptAuditDelete.xhtml', {
      id,
      dept_delete_audit_status,
      dept_delete_remark,
    })
  },

  /** 超级管理员审核删除 */
  async superAuditDelete(
    id: number,
    super_delete_audit_status: '02' | '03',
    super_delete_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/skill/superAuditDelete.xhtml', {
      id,
      super_delete_audit_status,
      super_delete_remark,
    })
  },

  // ========== 下架审核流程 ==========

  /** 申请下架技能（部门管理员） */
  async applyRemove(id: number, delete_reason: string): Promise<void> {
    await postApi('/dsjpt/jk/skill/applyRemove.xhtml', { id, delete_reason })
  },

  /** 超级管理员审核下架（05-通过 06-拒绝） */
  async superAuditRemove(
    id: number,
    super_delete_audit_status: '05' | '06',
    super_delete_remark?: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/skill/superAuditRemove.xhtml', {
      id,
      super_delete_audit_status,
      super_delete_remark,
    })
  },
}
