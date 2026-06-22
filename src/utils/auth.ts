import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export const AUTH_TOKEN_KEY = 'auth_token'
export const USER_ACCOUNT_KEY = 'user_account'
export const USER_PROFILE_KEY = 'user_profile'
const USER_ROLE_KEY = 'user_role_state'

const ADMIN_ROLE = '超级管理员用户'
const ROLE_STATE_VERSION = 'v1'
const ROLE_STATE_SALT = 'ai-assistant-role-state'
let runtimeRole = ''
let authExpiredHandled = false
export const authStateVersion = ref(0)

export interface StoredUserProfile {
  id?: string | number
  name?: string
  role?: string
  ip?: string
  clientIp?: string
  loginIp?: string
  idCard?: string
  phone?: string
  company?: string
  department?: string
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

function obfuscateRole(role: string): string {
  const salt = getRoleStorageSalt()
  const encoded = Array.from(role)
    .map((char, index) => char.charCodeAt(0) ^ salt.charCodeAt(index % salt.length))
    .join('.')

  return `${ROLE_STATE_VERSION}:${encodeBase64(encoded)}`
}

function deobfuscateRole(value: string): string {
  const [version, payload] = value.split(':')
  if (version !== ROLE_STATE_VERSION || !payload) {
    return ''
  }

  const decoded = decodeBase64(payload)
  if (!decoded) {
    return ''
  }

  const salt = getRoleStorageSalt()
  try {
    return decoded
      .split('.')
      .map((code, index) =>
        String.fromCharCode(Number(code) ^ salt.charCodeAt(index % salt.length)),
      )
      .join('')
  } catch {
    return ''
  }
}

function getStoredRole(): string {
  const raw = localStorage.getItem(USER_ROLE_KEY)
  if (!raw) {
    return ''
  }

  const role = deobfuscateRole(raw).trim()
  if (!role) {
    localStorage.removeItem(USER_ROLE_KEY)
  }

  return role
}

function setStoredRole(role: string): void {
  if (!role) {
    localStorage.removeItem(USER_ROLE_KEY)
    return
  }

  localStorage.setItem(USER_ROLE_KEY, obfuscateRole(role))
}

function resolvePrimaryRole(roles: string[]): string {
  return roles.find((role) => role === ADMIN_ROLE) || roles[0] || ''
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
  const storedRole = getStoredRole()
  if (!runtimeRole && storedRole) {
    runtimeRole = storedRole
  }

  const roles = [runtimeRole, storedRole, ...getRolesFromToken()].filter(Boolean)
  return roles.includes(ADMIN_ROLE)
}

export function saveAuth(token: string, profile?: StoredUserProfile): void {
  const previousStoredRole = getStoredRole()
  localStorage.setItem(AUTH_TOKEN_KEY, token)

  if (!profile) {
    const tokenRoles = getRolesFromToken()
    runtimeRole = resolvePrimaryRole([...tokenRoles, previousStoredRole])
    if (runtimeRole) {
      setStoredRole(runtimeRole)
    }
    authStateVersion.value += 1
    return
  }

  const current = getStoredUserProfile()
  const profileRoles = normalizeRoleValue(profile.role)
  const profileWithoutRole = { ...profile }
  delete profileWithoutRole.role
  const tokenRoles = getRolesFromToken()
  const roles = [...profileRoles, ...tokenRoles]
  runtimeRole = resolvePrimaryRole(roles)
  setStoredRole(runtimeRole)
  const nextProfile = { ...current, ...profileWithoutRole }
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

export function clearAuth(): void {
  runtimeRole = ''
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
