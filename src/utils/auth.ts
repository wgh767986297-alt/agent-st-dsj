import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export const AUTH_TOKEN_KEY = 'auth_token'
export const USER_ACCOUNT_KEY = 'user_account'
export const USER_PROFILE_KEY = 'user_profile'
const USER_ROLE_KEY = 'user_role_state'

const ADMIN_ROLE = '超级管理员'
const DEPARTMENT_ADMIN_ROLE = '部门管理员'
const SECURITY_AUDITOR_ROLE = '安全审计员'
const ROLE_STATE_VERSION = 'v3'
const ROLE_STATE_SALT = 'ai-assistant-role-state'
let runtimeRoles: string[] = []
let authExpiredHandled = false
export const authStateVersion = ref(0)

export interface StoredUserProfile {
  id?: string | number
  name?: string
  role?: string
  role_list?: string[]
  ip?: string
  clientIp?: string
  loginIp?: string
  idCard?: string
  phone?: string
  company?: string
  department?: string
  dept_id?: number
}

const ID_CARD_REGEX = /^\d{17}[\dXx]$/

export function validateIdCard(idCard: string): boolean {
  return ID_CARD_REGEX.test(idCard)
}

export function validatePasswordLength(password: string, minLength = 6): boolean {
  return password.length >= minLength
}

export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return !!getAuthToken()
}

export function isAuthExpiredResponse(data: unknown, status?: number): boolean {
  if (status === 401) {
    return true
  }

  if (!data) {
    return false
  }

  const text =
    typeof data === 'string'
      ? data
      : typeof data === 'object'
        ? [
            (data as { message?: unknown }).message,
            (data as { detail?: unknown }).detail,
            (data as { error?: unknown }).error,
            (data as { msg?: unknown }).msg,
          ]
            .filter(Boolean)
            .join(' ')
        : String(data)

  return /token.*(过期|失效|expired)|登录.*(过期|失效)|未认证|unauthorized/i.test(text)
}

export function handleAuthExpired(message = '登录已过期，请重新登录'): void {
  if (authExpiredHandled) {
    return
  }

  authExpiredHandled = true
  ElMessage.warning(message)
  clearAuth()

  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }

  window.setTimeout(() => {
    authExpiredHandled = false
  }, 1000)
}

function decodeJwtRecord(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) {
      return null
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    )

    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

const normalizeRoleValue = (value: unknown): string[] => {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap(normalizeRoleValue)
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return normalizeRoleValue(
      record.role || record.name || record.authority || record.permission || record.code,
    )
  }

  return String(value)
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean)
}

function getRolesFromRecord(record: Record<string, unknown> | null | undefined): string[] {
  if (!record) {
    return []
  }

  // 优先处理 role_list 结构: [{ role_name: "xxx" }, ...]
  const roleList = record.role_list
  if (Array.isArray(roleList)) {
    const names = roleList
      .map((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          return (item as Record<string, unknown>).role_name || (item as Record<string, unknown>).name || ''
        }
        return ''
      })
      .filter(Boolean) as string[]
    if (names.length > 0) return names
  }

  return [
    ...normalizeRoleValue(record.role),
    ...normalizeRoleValue(record.userRole),
    ...normalizeRoleValue(record.user_role),
    ...normalizeRoleValue(record.roles),
    ...normalizeRoleValue(record.authorities),
    ...normalizeRoleValue(record.permissions),
    ...getRolesFromRecord(record.user as Record<string, unknown> | null | undefined),
    ...getRolesFromRecord(record.profile as Record<string, unknown> | null | undefined),
  ]
}

function encodeBase64(value: string): string {
  try {
    return btoa(unescape(encodeURIComponent(value)))
  } catch {
    return ''
  }
}

function decodeBase64(value: string): string {
  try {
    return decodeURIComponent(escape(atob(value)))
  } catch {
    return ''
  }
}

function getRoleStorageSalt(): string {
  return `${ROLE_STATE_SALT}:${getAuthToken() || 'anonymous'}`
}

function obfuscateRoles(roles: string[]): string {
  const text = JSON.stringify(roles)
  const salt = getRoleStorageSalt()
  const encoded = Array.from(text)
    .map((char, index) => char.charCodeAt(0) ^ salt.charCodeAt(index % salt.length))
    .join('.')

  return `${ROLE_STATE_VERSION}:${encodeBase64(encoded)}`
}

function deobfuscateRoles(value: string): string[] {
  const [version, payload] = value.split(':')
  if (version !== ROLE_STATE_VERSION || !payload) {
    return []
  }

  const decoded = decodeBase64(payload)
  if (!decoded) {
    return []
  }

  const salt = getRoleStorageSalt()
  try {
    const text = decoded
      .split('.')
      .map((code, index) =>
        String.fromCharCode(Number(code) ^ salt.charCodeAt(index % salt.length)),
      )
      .join('')
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getStoredRoles(): string[] {
  const raw = localStorage.getItem(USER_ROLE_KEY)
  if (!raw) {
    return []
  }

  const roles = deobfuscateRoles(raw)
  if (roles.length === 0) {
    localStorage.removeItem(USER_ROLE_KEY)
  }

  return roles
}

function setStoredRoles(roles: string[]): void {
  if (roles.length === 0) {
    localStorage.removeItem(USER_ROLE_KEY)
    return
  }

  localStorage.setItem(USER_ROLE_KEY, obfuscateRoles(roles))
}

/** 获取当前用户所有角色（合并内存、localStorage、JWT 三个来源） */
function getAllUserRoles(): string[] {
  const stored = getStoredRoles()
  if (runtimeRoles.length === 0 && stored.length > 0) {
    runtimeRoles = stored
  }
  const all = [...runtimeRoles, ...stored, ...getRolesFromToken()]
  return [...new Set(all.filter(Boolean))]
}

/** 检查当前用户是否为安全审计员 */
export function isSecurityAuditor(): boolean {
  authStateVersion.value
  return getAllUserRoles().includes(SECURITY_AUDITOR_ROLE)
}

/** 检查当前用户是否为部门管理员 */
export function isDepartmentAdmin(): boolean {
  authStateVersion.value
  return getAllUserRoles().includes(DEPARTMENT_ADMIN_ROLE)
}

export function getRolesFromToken(): string[] {
  const token = getAuthToken()
  if (!token) {
    return []
  }

  const payload = decodeJwtRecord(token)
  return Array.from(new Set(getRolesFromRecord(payload)))
}

export function isAdminAccount(): boolean {
  // UI visibility only. Backend admin APIs must validate token permissions.
  authStateVersion.value
  return getAllUserRoles().some((role) => role === ADMIN_ROLE || role === '超级管理员用户')
}

export function saveAuth(token: string, profile?: StoredUserProfile): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)

  if (!profile) {
    // Token 刷新场景：只更新 token 和角色，不动已有 profile
    // 保留旧角色兜底，防止新 token 的 JWT 不含角色信息导致角色丢失
    const previousRoles = getStoredRoles()
    const tokenRoles = getRolesFromToken()
    runtimeRoles = [...new Set([...tokenRoles, ...previousRoles])]
    setStoredRoles(runtimeRoles)
    authStateVersion.value += 1
    return
  }

  // 登录场景（传入了 profile）：清除上一次登录的旧用户数据，防止切换账号后残留上一个用户的信息
  localStorage.removeItem(USER_PROFILE_KEY)
  localStorage.removeItem(USER_ROLE_KEY)
  localStorage.removeItem(USER_ACCOUNT_KEY)
  localStorage.removeItem('name')
  localStorage.removeItem('username')
  localStorage.removeItem('realName')
  localStorage.removeItem('role')
  localStorage.removeItem('idCard')
  localStorage.removeItem('id_card')
  localStorage.removeItem('identityCard')
  localStorage.removeItem('company')
  localStorage.removeItem('department')

  // 优先使用 role_list 数组
  const profileRoles = profile.role_list && profile.role_list.length > 0
    ? profile.role_list
    : normalizeRoleValue(profile.role)
  const profileWithoutRole = { ...profile }
  delete profileWithoutRole.role
  const tokenRoles = getRolesFromToken()
  runtimeRoles = [...new Set([...profileRoles, ...tokenRoles])]
  setStoredRoles(runtimeRoles)
  // 不使用旧 profile 合并，直接用新数据写入，避免跨用户数据泄露
  const nextProfile = { ...profileWithoutRole, role_list: runtimeRoles }
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(nextProfile))
  authStateVersion.value += 1
}

export function getStoredUserProfile(): StoredUserProfile | null {
  const raw = localStorage.getItem(USER_PROFILE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as StoredUserProfile
  } catch {
    localStorage.removeItem(USER_PROFILE_KEY)
    return null
  }
}

export function getCurrentAccount(): string {
  const profile = getStoredUserProfile()
  return String(profile?.idCard || profile?.name || '').trim()
}

/** 获取当前登录用户的 ID */
export function getCurrentUserId(): number | null {
  const profile = getStoredUserProfile()
  if (profile?.id) {
    const num = Number(profile.id)
    return Number.isNaN(num) ? null : num
  }
  // 回退：从 JWT 中解析
  const token = getAuthToken()
  if (token) {
    const payload = decodeJwtRecord(token)
    if (payload) {
      const id = payload.userId || payload.user_id || payload.id || payload.sub
      if (id) {
        const num = Number(id)
        return Number.isNaN(num) ? null : num
      }
    }
  }
  return null
}

/** 获取当前登录用户的部门 ID */
export function getCurrentDeptId(): number | null {
  // 优先从存储的 profile 中读取
  const profile = getStoredUserProfile()
  if (profile?.dept_id) {
    const num = Number(profile.dept_id)
    if (!Number.isNaN(num)) return num
  }
  // 回退1：profile.department 可能存的是数字 ID
  if (profile?.department) {
    const num = Number(profile.department)
    if (!Number.isNaN(num) && num > 0) return num
  }
  // 回退2：从 JWT 中解析（含嵌套结构）
  const token = getAuthToken()
  if (token) {
    const payload = decodeJwtRecord(token)
    if (payload) {
      const pickDeptId = (s: Record<string, unknown>) =>
        s.dept_id || s.deptId || s.departmentId || s.department_id || s.department
      // 顶层字段
      let jitDeptId = pickDeptId(payload)
      if (!jitDeptId) {
        // 嵌套对象：data.dept_id, user.dept_id 等
        for (const key of ['data', 'user', 'profile', 'result']) {
          const nested = payload[key] as Record<string, unknown> | undefined
          if (nested) {
            jitDeptId = pickDeptId(nested)
            if (jitDeptId) break
          }
        }
      }
      if (jitDeptId) {
        const num = Number(jitDeptId)
        if (!Number.isNaN(num) && num > 0) return num
      }
    }
  }
  return null
}

export function clearAuth(): void {
  runtimeRoles = []
  const cookies = ['JSESSIONID', 'sessionId', 'token', AUTH_TOKEN_KEY]
  cookies.forEach((cookieName) => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  })

  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USER_PROFILE_KEY)
  localStorage.removeItem(USER_ROLE_KEY)

  // Remove legacy scattered profile keys written by older builds.
  localStorage.removeItem(USER_ACCOUNT_KEY)
  localStorage.removeItem('name')
  localStorage.removeItem('username')
  localStorage.removeItem('realName')
  localStorage.removeItem('role')
  localStorage.removeItem('idCard')
  localStorage.removeItem('id_card')
  localStorage.removeItem('identityCard')
  localStorage.removeItem('company')
  localStorage.removeItem('department')
  authStateVersion.value += 1
}
