import axios from 'axios'
import {
  AUTH_TOKEN_KEY,
  getCurrentAccount,
  handleAuthExpired,
  isAuthExpiredResponse,
  saveAuth,
} from '@/utils/auth'
import { getClientIp } from '@/utils/clientIp'

const historyApi = axios.create({
  baseURL: import.meta.env.VITE_PARSE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

historyApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      config.headers.token = `${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

historyApi.interceptors.response.use(
  (response) => {
    if (isAuthExpiredResponse(response.data, response.status)) {
      handleAuthExpired()
      return Promise.reject(new Error(response.data.message || 'token已过期'))
    }

    return response.data
  },
  (error) => {


    if (isAuthExpiredResponse(error.response?.data, error.response?.status)) {
      handleAuthExpired()
      return Promise.reject(new Error(error.response?.data?.message || 'token已过期'))
    }

    return Promise.reject(error)
  },
)

const withClientIp = async <T extends Record<string, unknown>>(payload: T) => ({
  ...payload,
  ip: await getClientIp(),
})

const readReturnedToken = (value: unknown): string => {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const record = value as Record<string, unknown>
  const directToken =
    record.token || record.newToken || record.accessToken || record.access_token || record.authToken

  if (typeof directToken === 'string' && directToken.trim()) {
    return directToken.trim()
  }

  return readReturnedToken(record.result) || readReturnedToken(record.data)
}

const refreshAuthToken = <T>(response: T): T => {
  const token = readReturnedToken(response)
  if (token) {
    saveAuth(token)
  }

  return response
}

const getAccount = (): string => {
  return getCurrentAccount()
}

export const insertMsg = async (
  account: string,
  sessionId: string,
  title: string,
  content: string,
  qaCount: number,
) => {
  const response = await historyApi.post(
    '/qbpt/ntjk/insertMsg.xhtml',
    await withClientIp({
      account,
      sessionId,
      title,
      content,
      qaCount,
    }),
  )
  return refreshAuthToken(response)
}

export const deleteLogicMsg = async (account: string, sessionId: string) => {
  return historyApi.post(
    '/qbpt/ntjk/deleteLogicMsg.xhtml',
    await withClientIp({
      account,
      sessionId,
    }),
  )
}

export const selectByIdMsg = async (account: string, sessionId?: string, limit?: number) => {
  const params: Record<string, unknown> = { account, sessionId }
  if (limit !== undefined) {
    params.limit = limit
  }
  return historyApi.post(
    '/qbpt/ntjk/selectByIdMsg.xhtml',
    await withClientIp(params),
  )
}

export const updateMsg = async (
  account: string,
  sessionId: string,
  title: string,
  content: string,
  qaCount: number,
) => {
  const response = await historyApi.post(
    '/qbpt/ntjk/updateMsg.xhtml',
    await withClientIp({
      account,
      sessionId,
      title,
      content,
      qaCount,
    }),
  )
  return refreshAuthToken(response)
}

export const historyServices = {
  insertMsg,
  deleteLogicMsg,
  selectByIdMsg,
  updateMsg,
  getAccount,
}

export default historyApi
