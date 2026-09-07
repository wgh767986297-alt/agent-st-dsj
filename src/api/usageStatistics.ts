import axios from 'axios'
import { getAuthToken, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

export interface UsageFilters {
  start?: string
  end?: string
  model_name?: string
  source?: string
  username?: string
  role_code?: string
}

export interface UsageOverview {
  total_calls: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  total_cost: number
  avg_latency_ms: number
  success_rate: number
  by_source_tokens: Array<{ source: string; label: string; tokens: number }>
}

export interface UsageTrendItem {
  date: string
  calls: number
  input_tokens: number
  output_tokens: number
}

export interface UsageSourceDistribution {
  source: string
  label: string
  calls: number
  tokens: number
}

export interface UsageChannelDistribution {
  channel: string
  calls: number
}

export interface UsageAssistantRank {
  role_code: string | null
  role_name: string | null
  calls: number
  input_tokens: number
  output_tokens: number
  cost: number
}

export interface UsageModelRank {
  model_name: string
  model: string | null
  channel: string | null
  calls: number
  input_tokens: number
  output_tokens: number
  cost: number
  avg_latency_ms: number
  success_rate: number
}

export interface UsageUserRank {
  username: string | null
  calls: number
  input_tokens: number
  output_tokens: number
  cost: number
}

export interface UsageSkillRank {
  skill: string
  calls: number
  success_rate: number
  avg_latency_ms: number
  last_used_at: string | null
}

export interface UsageMcpRank {
  mcp_identifier: string
  tool_name: string
  calls: number
  success_rate: number
  avg_latency_ms: number
  mcp_name: string | null
}

export interface UsageToolRank {
  tool: string
  calls: number
  success_rate: number
  avg_latency_ms: number
}

export interface UsageStatsResponse {
  status: string
  start: string
  end: string
  overview: UsageOverview
  trend: UsageTrendItem[]
  source_dist: UsageSourceDistribution[]
  channel_dist: UsageChannelDistribution[]
  assistant_rank: UsageAssistantRank[]
  model_rank: UsageModelRank[]
  user_rank: UsageUserRank[]
  skill_rank: UsageSkillRank[]
  mcp_rank: UsageMcpRank[]
  tool_rank: UsageToolRank[]
}

export interface UsageLogItem {
  id: number
  created_at: string
  source: string
  source_label: string
  call_type: string
  session_id: string
  username: string | null
  usr: string | null
  role_code: string | null
  model_name: string
  model: string | null
  channel: string | null
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  price_in: number
  price_out: number
  cost: number
  status: string
  error_msg: string | null
  latency_ms: number
  turn: number
}

export interface UsageToolLogItem {
  id: number
  created_at: string
  source: string
  source_label: string
  session_id: string
  username: string | null
  usr: string | null
  role_code: string | null
  tool_type: string
  action: string
  tool_name: string
  mcp_identifier: string | null
  mcp_tool_name: string | null
  status: string
  error_msg: string | null
  latency_ms: number
  turn: number
}

export interface UsageLogQuery extends UsageFilters {
  page?: number
  page_size?: number
  status?: string
}

export interface UsageToolLogQuery extends UsageFilters {
  page?: number
  page_size?: number
  tool_type?: string
  action?: string
  tool_name?: string
  mcp_identifier?: string
  status?: string
}

export interface UsagePageResponse<T> {
  status: string
  page: number
  page_size: number
  total: number
  total_pages: number
  data: T[]
}

export interface UsageOptionsResponse {
  status: string
  sources: Array<{ source: string; label: string }>
  models: Array<{ name: string; model: string | null; channel: string | null; calls: number }>
  roles: Array<{ code: string; name: string }>
  tool_types: string[]
  skills: string[]
  mcps: Array<{ identifier: string; service_name: string }>
}

const usageClient = axios.create({
  baseURL: import.meta.env.VITE_CHAT_API_BASE || '/chatApi',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

usageClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.token = token
  return config
})

usageClient.interceptors.response.use(
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

function compactParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null,
    ),
  ) as Partial<T>
}

export const usageStatisticsApi = {
  stats(params: UsageFilters) {
    return usageClient.get<UsageStatsResponse, UsageStatsResponse>('/usage/stats', {
      params: compactParams(params),
    })
  },

  logs(params: UsageLogQuery) {
    return usageClient.get<UsagePageResponse<UsageLogItem>, UsagePageResponse<UsageLogItem>>(
      '/usage/logs',
      { params: compactParams(params) },
    )
  },

  toolLogs(params: UsageToolLogQuery) {
    return usageClient.get<
      UsagePageResponse<UsageToolLogItem>,
      UsagePageResponse<UsageToolLogItem>
    >('/usage/tool_logs', { params: compactParams(params) })
  },

  options() {
    return usageClient.get<UsageOptionsResponse, UsageOptionsResponse>('/usage/options')
  },
}
