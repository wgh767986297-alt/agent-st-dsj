import {
  getAuthToken,
  handleAuthExpired,
  isAuthExpiredResponse,
  type StoredUserProfile,
} from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseAuthResponse<T = unknown, D = unknown> {
  message?: string
  status?: ApiStatus
  result?: T
  data?: D
}

export interface LoginPayload {
  idCard: string
  password: string
  ip?: string
}

export interface RegisterPayload {
  name: string
  idCard: string
  phone: string
  company: string
  department: string
  password: string
}

export interface ChangePasswordPayload {
  password: string
}

export interface LoginResult {
  token: string
  id?: string | number
  name?: string
  role?: string
  ip?: string
  clientIp?: string
  client_ip?: string
  loginIp?: string
  login_ip?: string
  userIp?: string
  user_ip?: string
  idCard?: string
  phone?: string
  company?: string
  department?: string
  username?: string
  realName?: string
  companyName?: string
  departmentName?: string
  unit?: string
  dept?: string
  deptName?: string
  id_card?: string
  identityCard?: string
  cardNo?: string
  user?: Partial<LoginResult>
  profile?: Partial<LoginResult>
}

const AUTH_BASE_URL =
  import.meta.env.VITE_PARSE_API_URL || import.meta.env.VITE_API_URL || 'http://10.32.71.224:8080'

const buildUrl = (path: string) => `${AUTH_BASE_URL}${path}`

async function postJson<T, D = unknown>(
  path: string,
  body: object,
  headers?: Record<string, string>,
): Promise<BaseAuthResponse<T, D>> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let data: BaseAuthResponse<T, D>

  try {
    data = text ? (JSON.parse(text) as BaseAuthResponse<T, D>) : {}
  } catch {
    throw new Error(text || '接口返回格式错误')
  }

  if (!response.ok) {
    if (isAuthExpiredResponse(data, response.status)) {
      handleAuthExpired()
    }
    throw new Error(data.message || `请求失败: ${response.status}`)
  }

  if (isAuthExpiredResponse(data, response.status)) {
    handleAuthExpired()
    throw new Error(data.message || 'token已过期')
  }

  if (data.status && !['success', 'succeed'].includes(data.status)) {
    throw new Error(data.message || '操作失败')
  }

  return data
}

export function decodeJwtPayload(token: string): StoredUserProfile {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    )
    const parsed = JSON.parse(json) as Record<string, unknown>
    return {
      id: parsed.userId as string | number | undefined,
      name: (parsed.name || parsed.realName || parsed.real_name || parsed.nickName) as
        | string
        | undefined,
      role: (parsed.role || parsed.userRole || parsed.user_role) as string | undefined,
      idCard: (parsed.idCard ||
        parsed.id_card ||
        parsed.identityCard ||
        parsed.identity_card ||
        parsed.cardNo ||
        parsed.card_no ||
        parsed.username) as string | undefined,
    }
  } catch {
    return {}
  }
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    const response = await postJson<LoginResult, Partial<LoginResult>>(
      '/qbpt/ntjk/login.xhtml',
      payload,
    )
    const token = response.result?.token

    if (!token) {
      throw new Error(response.message || '登录成功但未返回 token')
    }

    const nestedProfile = response.result?.user || response.result?.profile

    return {
      ...response.data,
      ...response.result,
      ...nestedProfile,
      token,
    }
  },

  async register(payload: RegisterPayload): Promise<void> {
    await postJson('/qbpt/ntjk/register.xhtml', payload)
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    const token = getAuthToken()

    if (!token) {
      throw new Error('登录状态已失效，请重新登录')
    }

    await postJson('/qbpt/ntjk/profile.xhtml', payload, { token })
  },
}
