import axios from 'axios'
import { getAuthToken, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

export interface ModelConfig {
  name: string
  apikey?: string | null
  apibase?: string | null
  model?: string | null
  max_retries?: number | null
  connect_timeout?: number | null
  read_timeout?: number | null
  enable_thinking?: boolean
  admin?: boolean
}

export interface ModelListResponse {
  status?: string
  total?: number
  data?: ModelConfig[]
}

export interface ModelChangeResponse {
  status?: string
  data?: ModelConfig
}

const modelApi = axios.create({
  baseURL: import.meta.env.VITE_CHAT_API_BASE || '/chatApi',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

modelApi.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.token = token
    }
    return config
  },
  (error) => Promise.reject(error),
)

modelApi.interceptors.response.use(
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

export const getModelList = async (isAdmin?: boolean) => {
  const params: Record<string, string> = {}
  if (isAdmin !== undefined) {
    params.is_admin = String(isAdmin)
  }
  const response = await modelApi.get<ModelListResponse, ModelListResponse>('/model_list', {
    params,
  })
  return response.data || []
}

export const saveModel = (modelName: string, payload: Partial<ModelConfig>) => {
  return modelApi.put<ModelChangeResponse, ModelChangeResponse>(
    `/add_model/${encodeURIComponent(modelName)}`,
    payload,
  )
}

export const updateModel = (modelName: string, payload: Partial<ModelConfig>) => {
  return modelApi.put<ModelChangeResponse, ModelChangeResponse>(
    `/change_model/${encodeURIComponent(modelName)}`,
    payload,
  )
}

export const deleteModel = (modelName: string) => {
  return modelApi.delete<unknown, unknown>(`/delete_model/${encodeURIComponent(modelName)}`)
}

export default modelApi
