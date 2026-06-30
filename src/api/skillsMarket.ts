import axios from 'axios'
import { getAuthToken, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

export interface SkillTemplateResponse {
  download_url?: string
  filename?: string
}

export interface SkillManifest {
  name?: string
  description?: string
  version?: string
  category?: string
  type?: string
  autonomous_safe?: boolean
  os?: string[]
  tags?: string[]
}

export interface UploadSkillGenerated {
  'handler.py'?: boolean
  'prompt.md'?: boolean
  'manifest.yaml'?: boolean
}

export interface UploadSkillResponse {
  status?: string
  message?: string
  skill_name?: string
  path?: string
  source_folder?: string
  generated?: UploadSkillGenerated
  manifest?: SkillManifest
  files?: string[]
}

const skillsMarketApi = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

skillsMarketApi.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.token = token
    }
    return config
  },
  (error) => Promise.reject(error),
)

skillsMarketApi.interceptors.response.use(
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

const apiUrl = () => import.meta.env.VITE_CHAT_API_BASE || ''

export const getSkillTemplate = async (): Promise<SkillTemplateResponse> => {
  const baseUrl = apiUrl()
  const response = await skillsMarketApi.get<SkillTemplateResponse, SkillTemplateResponse>(
    `${baseUrl}/api/skills/template`,
  )
  return response
}

export interface UploadSkillMetadata {
  skill_name?: string
  overwrite?: boolean
}

export const uploadSkill = async (
  file: File,
  metadata?: UploadSkillMetadata,
): Promise<UploadSkillResponse> => {
  const baseUrl = apiUrl()
  const formData = new FormData()
  formData.append('file', file)
  if (metadata) {
    if (metadata.skill_name) formData.append('skill_name', metadata.skill_name)
    if (metadata.overwrite !== undefined) formData.append('overwrite', String(metadata.overwrite))
  }
  const response = await skillsMarketApi.post<UploadSkillResponse, UploadSkillResponse>(
    `${baseUrl}/upload_skill`,
    formData,
    {
      headers: { 'Content-Type': undefined },
    },
  )
  return response
}
