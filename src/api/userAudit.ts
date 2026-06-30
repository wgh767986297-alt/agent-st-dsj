import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse, isAdminAccount, isDepartmentAdmin } from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseAuditResponse {
  message?: string
  status?: ApiStatus
}

interface UserListResponse extends BaseAuditResponse {
  userList?: AuditUser[]
}

export type AuditStatus = '00' | '01' | '02' | string

export interface AuditUser {
  id: string | number
  name?: string
  idCard?: string
  phone?: string
  company?: string
  department?: string
  role?: string
  shzt?: AuditStatus
  isDeleted?: number
  dept_id?: number
}

const AUDIT_BASE_URL =
  import.meta.env.VITE_PARSE_API_URL || import.meta.env.VITE_API_URL || 'http://10.32.71.224:8080'

const buildUrl = (path: string) => `${AUDIT_BASE_URL}${path}`

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

async function postAudit<T extends BaseAuditResponse>(path: string, body: object): Promise<T> {
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

export const userAuditApi = {
  async getAllUsers(
    params: {
      shzt?: string
      idCard?: string
      name?: string
    } = {},
  ): Promise<AuditUser[]> {
    // 按角色控制传参：超级管理员不传 dept_id 和 user_id（可查全部部门），部门管理员只传 dept_id
    const roleParams: Record<string, unknown> = { ...params }
    if (isAdminAccount()) {
      roleParams.dept_id = undefined
      roleParams.user_id = undefined
    } else if (isDepartmentAdmin()) {
      roleParams.user_id = undefined
    }
    const response = await postAudit<UserListResponse>('/dsjpt/jk/getAllUserXx.xhtml', roleParams)
    return response.userList || []
  },

  async updateStatus(id: string | number, shzt: '01' | '02'): Promise<void> {
    await postAudit('/dsjpt/jk/userSh.xhtml', {
      id: String(id),
      shzt,
    })
  },

  /** 调整用户部门 */
  async changeDept(user_id: number, dept_id: number): Promise<void> {
    await postAudit('/dsjpt/jk/user/changeDept.xhtml', { user_id, dept_id })
  },

  /** 删除用户 */
  async deleteUser(user_id: number): Promise<void> {
    await postAudit('/dsjpt/jk/user/delete.xhtml', { user_id })
  },
}
