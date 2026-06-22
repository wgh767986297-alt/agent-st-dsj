import axios from 'axios'
import { getAuthToken, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

export interface KnowledgeWarehouse {
  warehouse_id: string
  user_id: string
  created_at?: string | number
  warehouse_name: string
  description?: string
  chunk_count?: number
}

export interface KnowledgeWarehouseEntry {
  knowledge_id?: string
  ingest_id?: string
  warehouse_id?: string
  warehouse_name?: string
  user_id?: string
  content?: string
  knowledge_name?: string
  source_name?: string
  filename?: string
  minio_url?: string
  created_at?: string
  chunk_count?: number
  chunks?: number
  char_count?: number
}

export interface KnowledgeIngestEntry {
  ingest_id: string
  knowledge_name?: string
  chunk_count: number
  created_at?: string
}

export interface KnowledgeWarehouseDetail extends KnowledgeWarehouse {
  items?: KnowledgeWarehouseEntry[]
  records?: KnowledgeWarehouseEntry[]
  knowledge_list?: KnowledgeWarehouseEntry[]
  ingests?: KnowledgeWarehouseEntry[]
  chunks?: KnowledgeWarehouseEntry[] | number
  data?: KnowledgeWarehouseEntry[]
}

export interface KnowledgeWarehouseListResponse {
  user_id: string
  total: number
  items: KnowledgeWarehouse[]
}

export interface KnowledgeIngestListResponse {
  status?: string
  warehouse_id: string
  page: number
  page_size: number
  total: number
  items: KnowledgeIngestEntry[]
}

export interface KnowledgeIngestResponse {
  status?: string
  warehouse_id?: string
  knowledge_name?: string
  ingest_id?: string
  chunks?: number
  knowledge_ids?: string[]
  minio_url?: string
  minio_object_key?: string
  filename?: string
  char_count?: number
  detail?: string
  message?: string
}

export interface KnowledgeQueryResult {
  knowledge_id: string
  ingest_id: string
  warehouse_id: string
  warehouse_name?: string
  user_id: string
  content: string
  knowledge_name?: string
  minio_url?: string
  created_at?: string
  score?: number
}

export interface KnowledgeQueryResponse {
  query: string
  total: number
  results: KnowledgeQueryResult[]
}

export interface KnowledgeChunkDetail {
  knowledge_id: string
  warehouse_id: string
  user_id: string
  content: string
  minio_url?: string
  minio_object_key?: string
  ingest_id: string
  knowledge_name?: string
  created_at?: string
}

export interface KnowledgeIngestChunksResponse {
  status?: string
  ingest_id: string
  warehouse_id: string
  chunk_count: number
  chunks: KnowledgeChunkDetail[]
}

export interface DeleteWarehouseResponse {
  status?: string
  deleted_warehouse_id?: string
}

export interface DeleteIngestResponse {
  status?: string
  ingest_id?: string
  deleted_chunks?: number
  removed_minio_objects?: number
}

export interface KnowledgeChatRequest {
  query: string
  session_id: string
  images?: string[]
  file_ids?: string[]
  source?: string
  user_id?: string
  warehouse_ids?: string[]
  kb_top_k?: number
}

export interface KnowledgeChatStreamEvent {
  type?: 'text' | 'chunk' | 'done' | 'error' | string
  text?: string
  content?: string
  delta?: string
  answer?: string
}

const KNOWLEDGE_API_BASE = import.meta.env.VITE_KNOWLEDGE_API_BASE || '/knowledgeApi'

const knowledgeApi = axios.create({
  baseURL: KNOWLEDGE_API_BASE,
  timeout: 60000,
})

knowledgeApi.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.token = token
    }
    return config
  },
  (error) => Promise.reject(error),
)

knowledgeApi.interceptors.response.use(
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

export const createWarehouse = (payload: {
  user_id: string
  warehouse_name: string
  description?: string
}) => {
  return knowledgeApi.post<KnowledgeWarehouse, KnowledgeWarehouse>('/knowledge/warehouse/create', {
    ...payload,
    description: payload.description || '',
  })
}

export const listWarehouses = (userId: string) => {
  return knowledgeApi.get<KnowledgeWarehouseListResponse, KnowledgeWarehouseListResponse>(
    '/knowledge/warehouse/list',
    {
      params: { user_id: userId },
    },
  )
}

export const getWarehouseDetail = (warehouseId: string, userId?: string) => {
  return knowledgeApi.get<KnowledgeWarehouseDetail, KnowledgeWarehouseDetail>(
    `/knowledge/warehouse/${encodeURIComponent(warehouseId)}`,
    {
      params: userId ? { user_id: userId } : undefined,
    },
  )
}

export const listWarehouseIngests = (
  warehouseId: string,
  payload: {
    user_id: string
    page?: number
    page_size?: number
  },
) => {
  return knowledgeApi.get<KnowledgeIngestListResponse, KnowledgeIngestListResponse>(
    `/knowledge/warehouse/${encodeURIComponent(warehouseId)}/ingests`,
    {
      params: {
        user_id: payload.user_id,
        page: payload.page ?? 1,
        page_size: payload.page_size ?? 20,
      },
    },
  )
}

export const deleteWarehouse = (warehouseId: string) => {
  return knowledgeApi.delete<DeleteWarehouseResponse, DeleteWarehouseResponse>(
    `/knowledge/warehouse/${encodeURIComponent(warehouseId)}`,
  )
}

export const storeTextKnowledge = (payload: {
  warehouse_id: string
  content: string
  source_name?: string
}) => {
  return knowledgeApi.post<KnowledgeIngestResponse, KnowledgeIngestResponse>(
    '/knowledge/store/text',
    {
      ...payload,
      source_name: payload.source_name || 'manual',
    },
  )
}

export const uploadKnowledgeFile = (warehouseId: string, file: File, knowledgeName: string) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('warehouse_id', warehouseId)
  formData.append('knowledge_name', knowledgeName)

  return knowledgeApi.post<KnowledgeIngestResponse, KnowledgeIngestResponse>(
    '/knowledge/store/file',
    formData,
  )
}

export const queryKnowledge = (payload: {
  query: string
  user_id?: string
  warehouse_id?: string | null
  top_k?: number
}) => {
  return knowledgeApi.post<KnowledgeQueryResponse, KnowledgeQueryResponse>('/knowledge/query', {
    ...payload,
    warehouse_id: payload.warehouse_id || null,
    top_k: payload.top_k ?? 5,
  })
}

export const getIngestChunks = (ingestId: string, userId: string, contentMaxLen?: number) => {
  return knowledgeApi.get<KnowledgeIngestChunksResponse, KnowledgeIngestChunksResponse>(
    `/knowledge/ingest/${encodeURIComponent(ingestId)}`,
    {
      params: {
        user_id: userId,
        ...(contentMaxLen ? { content_max_len: contentMaxLen } : {}),
      },
    },
  )
}

export const getChunkDetail = (knowledgeId: string, userId?: string) => {
  return knowledgeApi.get<KnowledgeChunkDetail, KnowledgeChunkDetail>(
    `/knowledge/chunk/${encodeURIComponent(knowledgeId)}`,
    {
      params: userId ? { user_id: userId } : undefined,
    },
  )
}

export const deleteIngest = (ingestId: string, userId?: string) => {
  return knowledgeApi.delete<DeleteIngestResponse, DeleteIngestResponse>(
    `/knowledge/ingest/${encodeURIComponent(ingestId)}`,
    {
      params: userId ? { user_id: userId } : undefined,
    },
  )
}

export const sendKnowledgeChatStream = async (
  payload: KnowledgeChatRequest,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
) => {
  let accumulatedContent = ''

  try {
    const response = await fetch(`${KNOWLEDGE_API_BASE}/knowledge_chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { token: getAuthToken() as string } : {}),
      },
      body: JSON.stringify({
        images: [],
        file_ids: [],
        source: 'api',
        warehouse_ids: [],
        kb_top_k: 5,
        ...payload,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (isAuthExpiredResponse(errorText, response.status)) {
        handleAuthExpired()
      }
      throw new Error(errorText || `HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取知识库对话响应流')
    }

    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let streamDone = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith(':')) continue
        if (!line.startsWith('data:')) continue

        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue

        const event = JSON.parse(data) as KnowledgeChatStreamEvent
        const type = event.type || 'text'

        if (type === 'done') {
          streamDone = true
          continue
        }

        if (type === 'error') {
          throw new Error(event.text || '知识库对话失败')
        }

        if (type === 'text' || type === 'chunk') {
          const delta = event.text ?? event.content ?? event.delta ?? event.answer ?? ''
          if (delta) {
            accumulatedContent += delta
            onChunk(delta)
          }
        }
      }
    }

    if (!streamDone && buffer.trim().startsWith('data:')) {
      const data = buffer.trim().slice(5).trim()
      if (data) {
        const event = JSON.parse(data) as KnowledgeChatStreamEvent
        if (event.type === 'error') {
          throw new Error(event.text || '知识库对话失败')
        }
      }
    }

    onComplete()
    return accumulatedContent
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return accumulatedContent
    }

    const normalizedError = error instanceof Error ? error : new Error('知识库对话失败')
    onError(normalizedError)
    throw normalizedError
  }
}
