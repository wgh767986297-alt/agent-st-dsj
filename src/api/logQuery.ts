import axios from 'axios'
import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

export interface LoginLogItem {
  id?: string
  account?: string
  username?: string
  loginip?: string
  logindate?: string
  logintype?: string
  status?: string
}

export interface ConversationLogItem {
  id?: string
  session_id?: string
  sessionId?: string
  account?: string
  user_account?: string
  title?: string
  content?: string
  ip?: string
  create_time?: string
  update_time?: string
  createTime?: string
  updateTime?: string
}

export interface LoginLogQueryParams {
  account?: string
  loginip?: string
  startTime?: string
  endTime?: string
}

export interface ConversationLogQueryParams {
  account?: string
  title?: string
  startTime?: string
  endTime?: string
}

const logQueryApi = axios.create({
  baseURL: import.meta.env.VITE_PARSE_API_URL || '/serverApi',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

logQueryApi.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.token = token
    }
    // 自动注入当前用户 ID 和部门 ID
    if (config.data && typeof config.data === 'object') {
      const userId = getCurrentUserId()
      const deptId = getCurrentDeptId()
      const data = config.data as Record<string, unknown>
      if (userId != null && !('user_id' in data)) {
        data.user_id = userId
      }
      if (deptId != null && !('dept_id' in data)) {
        data.dept_id = deptId
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

logQueryApi.interceptors.response.use(
  (response) => {
    if (isAuthExpiredResponse(response.data, response.status)) {
      handleAuthExpired()
      return Promise.reject(new Error(response.data?.message || 'token已过期'))
    }

    return response.data
  },
  (error) => {
    if (isAuthExpiredResponse(error.response?.data, error.response?.status)) {
      handleAuthExpired()
    }
    return Promise.reject(error)
  },
)

const unwrapArray = <T>(response: unknown, keys: string[]): T[] => {
  if (Array.isArray(response)) {
    return response as T[]
  }

  if (!response || typeof response !== 'object') {
    return []
  }

  const record = response as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) {
      return value as T[]
    }
  }

  const nestedData = record.data
  if (Array.isArray(nestedData)) {
    return nestedData as T[]
  }

  if (nestedData && typeof nestedData === 'object') {
    return unwrapArray<T>(nestedData, keys)
  }

  return []
}

const compactPayload = (payload: Record<string, string | undefined>) => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value === 'string' && value.trim()),
  )
}

export const getLoginLogs = async (params: LoginLogQueryParams = {}) => {
  const token = getAuthToken() || undefined
  const response = await logQueryApi.post<unknown, unknown>(
    '/dsjpt/jk/getLoginLog.xhtml',
    compactPayload({
      token,
      account: params.account?.trim(),
      loginip: params.loginip?.trim(),
      startTime: params.startTime?.trim(),
      endTime: params.endTime?.trim(),
    }),
  )

  return unwrapArray<LoginLogItem>(response, ['logList', 'logs', 'list'])
}

export const getConversationLogs = async (params: ConversationLogQueryParams = {}) => {
  const response = await logQueryApi.post<unknown, unknown>(
    '/dsjpt/jk/selectByIdMsg.xhtml',
    compactPayload({
      account: params.account?.trim(),
      title: params.title?.trim(),
      startTime: params.startTime?.trim(),
      endTime: params.endTime?.trim(),
    }),
  )

  return unwrapArray<ConversationLogItem>(response, ['data', 'list', 'msgList', 'records'])
}

export default logQueryApi
