import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse, isAdminAccount, isDepartmentAdmin } from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

export interface Department {
  id: number
  dept_code: string
  dept_name: string
  parent_id: number | null
  admin_id: number | null
  admin_name?: string
  user_quota: number
  used_quota: number
  normal_user_count?: number
  authorized_skill_count?: number
  authorized_mcp_count?: number
  authorized_officer_count?: number
  status: string
  create_time?: string
}

export interface CreateDepartmentPayload {
  dept_code: string
  dept_name: string
  parent_id?: number | null
  admin_id?: number | null
  user_quota?: number
  status?: string
}

export interface UpdateDepartmentPayload {
  id: number
  dept_name?: string
  parent_id?: number | null
  admin_id?: number | null
  user_quota?: number
  used_quota?: number
  status?: string
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

export const departmentApi = {
  async create(payload: CreateDepartmentPayload): Promise<{ id: number }> {
    const response = await postApi<BaseResponse<{ id: number }>>(
      '/dsjpt/jk/dept/create.xhtml',
      payload,
    )
    return response.data || { id: 0 }
  },

  async update(payload: UpdateDepartmentPayload): Promise<void> {
    await postApi('/dsjpt/jk/dept/update.xhtml', payload)
  },

  async remove(id: number): Promise<void> {
    await postApi('/dsjpt/jk/dept/delete.xhtml', { id })
  },

  async list(
    params: { status?: string; parent_id?: number | null; dept_id?: number; user_id?: number } = {},
  ): Promise<Department[]> {
    // 按角色控制传参：超级管理员不传 dept_id 和 user_id，部门管理员只传 dept_id
    const roleParams: Record<string, unknown> = { ...params }
    if (isAdminAccount()) {
      // 超级管理员：显式置空，enrichBody 跳过，JSON.stringify 移除
      roleParams.dept_id = undefined
      roleParams.user_id = undefined
    } else if (isDepartmentAdmin()) {
      // 部门管理员：不传 user_id，dept_id 由 enrichBody 自动补充
      roleParams.user_id = undefined
    }
    const response = await postApi<BaseResponse<Department[]>>('/dsjpt/jk/dept/list.xhtml', roleParams)
    return response.data || []
  },
}
