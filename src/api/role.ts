import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

export interface RoleInfo {
  id: number
  role_code: string
  role_name: string
  role_type: string
  description?: string
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

export const roleApi = {
  /** 分配角色 role_id: 1-超级管理员 2-部门管理员 3-普通用户 4-安全审计员 */
  async assign(user_id: number, role_id: number, dept_id?: number): Promise<void> {
    await postApi('/dsjpt/jk/role/assign.xhtml', { user_id, role_id, dept_id })
  },

  /** 取消角色（需传入部门ID以指定从哪个部门移除） */
  async remove(user_id: number, role_id: number, dept_id?: number): Promise<void> {
    await postApi('/dsjpt/jk/role/remove.xhtml', { user_id, role_id, dept_id })
  },

  /** 查询用户角色 */
  async list(user_id: number): Promise<RoleInfo[]> {
    const response = await postApi<BaseResponse<RoleInfo[]>>('/dsjpt/jk/role/list.xhtml', {
      user_id,
    })
    return response.data || []
  },
}
