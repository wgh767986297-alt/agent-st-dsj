import axios from 'axios'
import { AUTH_TOKEN_KEY, getCurrentAccount, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

// ✅ 附件历史 API 实例
const appendixApi = axios.create({
  baseURL: import.meta.env.VITE_CHAT_API_BASE || '/chatApi',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
appendixApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器
appendixApi.interceptors.response.use(
  (response) => {
    if (isAuthExpiredResponse(response.data, response.status)) {
      handleAuthExpired()
      return Promise.reject(new Error(response.data?.message || 'token已过期'))
    }

    return response.data
  },
  (error) => {


    // ✅ 如果后端返回 401 未认证,跳转到登录页
    if (isAuthExpiredResponse(error.response?.data, error.response?.status)) {

      handleAuthExpired()
    }

    return Promise.reject(error)
  },
)

/**
 * 分页查询附件列表
 * @param page 页码（从1开始）
 * @param page_size 每页数量（默认10）
 */
export const getAppendixList = async (page: number = 1, page_size: number = 10) => {
  return appendixApi.get('/appendix', {
    params: {
      page,
      page_size,
      usr: getCurrentAccount(),
    },
  })
}

/**
 * 删除附件
 * @param file_id 文件ID
 */
export const deleteAppendix = async (file_id: string) => {
  return appendixApi.delete(`/appendix/${file_id}`, {
    params: {
      usr: getCurrentAccount(),
    },
  })
}

export const getGeneratedHistoryList = async (page: number = 1, page_size: number = 10) => {
  return appendixApi.get('/file', {
    params: {
      page,
      page_size,
      usr: getCurrentAccount(),
    },
  })
}

export const deleteGeneratedHistory = async (file_id: string) => {
  return appendixApi.delete(`/file/${file_id}`, {
    params: {
      usr: getCurrentAccount(),
    },
  })
}

export default appendixApi
