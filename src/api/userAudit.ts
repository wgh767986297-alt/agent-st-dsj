import { getAuthToken, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

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
}

const AUDIT_BASE_URL =
  import.meta.env.VITE_PARSE_API_URL || import.meta.env.VITE_API_URL || 'http://10.32.71.224:8080'

const buildUrl = (path: string) => `${AUDIT_BASE_URL}${path}`

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
    body: JSON.stringify(body),
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
  async getAllUsers(): Promise<AuditUser[]> {
    const response = await postAudit<UserListResponse>('/qbpt/ntjk/getAllUserXx.xhtml', {})
    return response.userList || []
  },

  async updateStatus(id: string | number, shzt: '01' | '02'): Promise<void> {
    await postAudit('/qbpt/ntjk/userSh.xhtml', {
      id: String(id),
      shzt,
    })
  },
}
