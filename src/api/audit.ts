import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

// ==================== 待审批列表项 ====================
export interface PendingItem {
  resource_type: string    // skill / mcp / officer
  resource_id: number
  resource_name: string
  resource_code: string
  audit_status: string           // 00-待审核, 01-通过, 02-拒绝
  delete_audit_status: string | null
  audit_type: string             // create / delete / remove
  creator_id: number
  creator_name: string
  create_time: string
  audit_remark: string | null
  delete_remark: string | null
  dept_id?: number
  dept_name?: string
}

export interface PendingListResult {
  list: PendingItem[]
  count: number
  dept_id?: number
}

const BASE_URL =
  import.meta.env.VITE_PARSE_API_URL || import.meta.env.VITE_API_URL || 'http://10.32.71.224:8080'

const buildUrl = (path: string) => `${BASE_URL}${path}`

function enrichBody(body: Record<string, unknown>): Record<string, unknown> {
  const userId = getCurrentUserId()
  const deptId = getCurrentDeptId()
  const enriched = { ...body }
  // 使用 'in' 检查：调用方可通过显式声明 user_id/dept_id（包括 undefined）来阻止自动注入
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
    headers: { 'Content-Type': 'application/json', token },
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

// ==================== 资源类型到 URL 路径映射 ====================
function resourcePath(type: string): string {
  switch (type) {
    case 'skill': return 'skill'
    case 'mcp': return 'mcp'
    case 'officer': return 'officer'
    default: throw new Error(`未知资源类型: ${type}`)
  }
}

export const auditApi = {
  // ========== 待审批列表 ==========

  /**
   * 部门管理员 - 获取待审批列表
   * 默认带当前用户 dept_id（筛选本部门），不传 user_id（看全部成员）
   * 可通过 filters 传入额外的 dept_id / user_id 作为外置筛选条件
   */
  async getDeptPendingList(
    resource_type?: string,
    audit_type?: string,
    filters?: { dept_id?: number; user_id?: number },
  ): Promise<PendingListResult> {
    const body: Record<string, unknown> = {}
    if (resource_type) body.resource_type = resource_type
    if (audit_type) body.audit_type = audit_type
    // dept_id：优先用筛选条件，否则用当前用户部门（部门管理员只看本部门）
    body.dept_id = filters?.dept_id ?? getCurrentDeptId() ?? undefined
    // user_id：仅当筛选条件明确传入时才带（否则看全部成员，显式声明阻止自动注入）
    body.user_id = filters?.user_id ?? undefined
    const response = await postApi<BaseResponse<PendingListResult>>(
      '/dsjpt/jk/audit/deptPendingList.xhtml',
      body,
    )
    return response.data || { list: [], count: 0 }
  },

  /**
   * 超级管理员 - 获取待审批列表
   * 默认不传 dept_id / user_id（看全部），二者仅作为外置筛选条件
   * 可通过 filters 传入作为部门/用户联动筛选
   */
  async getSuperPendingList(
    resource_type?: string,
    audit_type?: string,
    filters?: { dept_id?: number; user_id?: number },
  ): Promise<PendingListResult> {
    const body: Record<string, unknown> = {}
    if (resource_type) body.resource_type = resource_type
    if (audit_type) body.audit_type = audit_type
    // 显式声明 key（包括 undefined），阻止 enrichBody 自动注入
    body.dept_id = filters?.dept_id ?? undefined
    body.user_id = filters?.user_id ?? undefined
    const response = await postApi<BaseResponse<PendingListResult>>(
      '/dsjpt/jk/audit/superPendingList.xhtml',
      body,
    )
    return response.data || { list: [], count: 0 }
  },

  // ========== 部门审核（一级） ==========

  /** 部门审核 - 发布/创建 */
  async deptAudit(
    resourceType: string,
    id: number,
    status: string,
    remark?: string,
  ): Promise<void> {
    const path = resourcePath(resourceType)
    await postApi(`/dsjpt/jk/${path}/deptAudit.xhtml`, {
      id,
      dept_audit_status: status,
      ...(remark ? { dept_audit_remark: remark } : {}),
    })
  },

  /** 部门审核 - 删除 */
  async deptAuditDelete(
    resourceType: string,
    id: number,
    status: string,
    remark?: string,
  ): Promise<void> {
    const path = resourcePath(resourceType)
    await postApi(`/dsjpt/jk/${path}/deptAuditDelete.xhtml`, {
      id,
      dept_delete_audit_status: status,
      ...(remark ? { dept_delete_remark: remark } : {}),
    })
  },

  /** 部门审核 - 下架 */
  async deptAuditRemove(
    resourceType: string,
    id: number,
    status: string,
    remark?: string,
  ): Promise<void> {
    const path = resourcePath(resourceType)
    await postApi(`/dsjpt/jk/${path}/deptAuditRemove.xhtml`, {
      id,
      dept_delete_audit_status: status,
      ...(remark ? { dept_delete_remark: remark } : {}),
    })
  },

  // ========== 超级管理员审核（二级） ==========

  /** 超级管理员审核 - 发布/创建 */
  async superAudit(
    resourceType: string,
    id: number,
    status: string,
    remark?: string,
  ): Promise<void> {
    const path = resourcePath(resourceType)
    await postApi(`/dsjpt/jk/${path}/superAudit.xhtml`, {
      id,
      super_audit_status: status,
      ...(remark ? { super_audit_remark: remark } : {}),
    })
  },

  /** 超级管理员审核 - 删除 */
  async superAuditDelete(
    resourceType: string,
    id: number,
    status: string,
    remark?: string,
  ): Promise<void> {
    const path = resourcePath(resourceType)
    await postApi(`/dsjpt/jk/${path}/superAuditDelete.xhtml`, {
      id,
      super_delete_audit_status: status,
      ...(remark ? { super_delete_remark: remark } : {}),
    })
  },

  // ========== 获取待审批总数（用于导航栏角标） ==========

  /** 获取当前用户所有待审批项的总数（不传类型参数 = 查全部，一次请求） */
  async getTotalPendingCount(isSuperAdmin: boolean): Promise<number> {
    const result = isSuperAdmin
      ? await this.getSuperPendingList()
      : await this.getDeptPendingList()
    return result.count || 0
  },

  /** 超级管理员审核 - 下架 */
  async superAuditRemove(
    resourceType: string,
    id: number,
    status: string,
    remark?: string,
  ): Promise<void> {
    const path = resourcePath(resourceType)
    await postApi(`/dsjpt/jk/${path}/superAuditRemove.xhtml`, {
      id,
      super_delete_audit_status: status,
      ...(remark ? { super_delete_remark: remark } : {}),
    })
  },
}
