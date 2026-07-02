import {
  getAuthToken,
  getCurrentUserId,
  getCurrentDeptId,
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
  user_account?: string
  idCard?: string
  password: string
  ip?: string
}

export interface RegisterPayload {
  name: string
  idCard: string
  phone: string
  company: string
  department: string
  dept_id?: number
  password: string
}

export interface ChangePasswordPayload {
  password: string
}

export interface UpdateProfilePayload {
  id: number
  name?: string
  phone?: string
  company?: string
  department?: number | string
  password?: string
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
    body: JSON.stringify(enrichBody(body as Record<string, unknown>)),
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
    // dept_id 可能在顶层或嵌套对象中
    const pickDeptId = (s: Record<string, unknown>) =>
      s.dept_id || s.deptId || s.departmentId || s.department_id || s.department
    let deptId = pickDeptId(parsed)
    if (!deptId) {
      for (const key of ['data', 'user', 'profile', 'result']) {
        const nested = parsed[key] as Record<string, unknown> | undefined
        if (nested) {
          deptId = pickDeptId(nested)
          if (deptId) break
        }
      }
    }
    let deptName = parsed.dept_name || parsed.deptName || parsed.departmentName || parsed.department_name
    if (!deptName) {
      for (const key of ['data', 'user', 'profile', 'result']) {
        const nested = parsed[key] as Record<string, unknown> | undefined
        if (nested) {
          deptName = nested.dept_name || nested.deptName || nested.departmentName || nested.department_name
          if (deptName) break
        }
      }
    }
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
      dept_id: deptId ? (Number(deptId) || undefined) : undefined,
      department: deptName as string | undefined,
    }
  } catch {
    return {}
  }
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    // 兼容新旧接口：新接口用 user_account，旧接口用 idCard
    const loginBody: Record<string, string> = {
      password: payload.password,
    }
    if (payload.user_account) {
      loginBody.user_account = payload.user_account
    } else if (payload.idCard) {
      loginBody.idCard = payload.idCard
    }
    if (payload.ip) {
      loginBody.ip = payload.ip
    }

    const response = await postJson<LoginResult, Partial<LoginResult>>(
      '/dsjpt/jk/login.xhtml',
      loginBody,
    )

    // 新版: token 在 data.token
    // 旧版: token 在 result.token
    const token =
      ((response.data as Record<string, unknown> | undefined)?.token as string | undefined) ||
      response.result?.token

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
    await postJson('/dsjpt/jk/register.xhtml', payload)
  },

  /** 零信任登录（第三方平台映射），token 通过请求头传递 */
  async loginByZeroTrust(userToken: string, appToken: string): Promise<LoginResult> {
    const response = await postJson<LoginResult, Partial<LoginResult>>(
      '/zero-trust/login.xhtml',
      {},
      {
        'RZZX-USERTOKEN': userToken,
        'RZZX-APPTOKEN': appToken,
      },
    )

    const token =
      ((response.data as Record<string, unknown> | undefined)?.token as string | undefined) ||
      response.result?.token

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

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    const token = getAuthToken()

    if (!token) {
      throw new Error('登录状态已失效，请重新登录')
    }

    await postJson('/dsjpt/jk/profile.xhtml', payload, { token })
  },

  /** 修改用户信息（管理员用） */
  async updateProfile(payload: UpdateProfilePayload): Promise<void> {
    const token = getAuthToken()
    if (!token) {
      throw new Error('登录状态已失效，请重新登录')
    }
    await postJson('/dsjpt/jk/profile.xhtml', payload, { token })
  },
}
