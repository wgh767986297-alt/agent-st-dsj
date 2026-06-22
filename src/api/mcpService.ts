import { getAuthToken, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

// ============ 类型定义 ============

export interface McpCreateParams {
  name: string
  identifier: string
  url: string
  description: string
  category: string
  enabled: boolean
}

export interface McpServiceItem {
  id: number
  name: string
  identifier: string
  url: string
  description: string
  category: string
  enabled: boolean
  tools_count?: number
  created_at?: string
  updated_at?: string
}

export interface McpCreateResponse {
  status: string
  action: string
  message: string
  data?: McpServiceItem
  tools_count?: number
}

export interface McpListResponse {
  status: string
  total: number
  items: McpServiceItem[]
  created_at?: string
  updated_at?: string
}

export interface McpSearchResponse {
  status: string
  total: number
  items: McpServiceItem[]
}

export interface McpDetailResponse {
  status: string
  data: McpServiceItem
}

export interface McpEnableResponse {
  status: string
  message: string
}

export interface McpDeleteResponse {
  status: string
  message: string
}

// ============ 基础配置 ============

const getBaseUrl = () => import.meta.env.VITE_CHAT_API_BASE || '/chatApi'

/**
 * 通用请求方法 — 自动附加 auth token，处理认证过期
 */
async function mcpRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['token'] = token
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (isAuthExpiredResponse(errorText, response.status)) {
      handleAuthExpired()
    }
    // 尝试解析后端错误消息
    try {
      const errorData = JSON.parse(errorText)
      throw new Error(errorData.detail || errorData.message || `请求失败 (${response.status})`)
    } catch (e) {
      if (e instanceof Error && e.message !== errorText) throw e
      throw new Error(`请求失败 (${response.status}): ${errorText || '未知错误'}`)
    }
  }

  const data = await response.json()
  if (isAuthExpiredResponse(data, response.status)) {
    handleAuthExpired()
    throw new Error('token已过期')
  }
  return data as T
}

/**
 * 构建查询字符串
 */
function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

// ============ API 方法 ============

/**
 * 1. 新增 MCP 服务
 * POST /mcp/create
 */
export async function createMcpService(params: McpCreateParams): Promise<McpCreateResponse> {
  const baseUrl = getBaseUrl()
  return mcpRequest<McpCreateResponse>(`${baseUrl}/mcp/create`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * 2. 列出所有 MCP 服务
 * GET /mcp/list?limit=200&enabled_only=false
 */
export async function listMcpServices(
  limit = 200,
  enabledOnly?: boolean,
): Promise<McpListResponse> {
  const baseUrl = getBaseUrl()
  const params: Record<string, string | number | boolean | undefined> = { limit }
  if (enabledOnly !== undefined) {
    params.enabled_only = enabledOnly
  }
  return mcpRequest<McpListResponse>(
    `${baseUrl}/mcp/list${buildQuery(params)}`,
    { method: 'GET' },
  )
}

/**
 * 3. 搜索 MCP 服务
 * POST /mcp/search
 */
export async function searchMcpServices(
  keyword: string,
  limit = 50,
): Promise<McpSearchResponse> {
  const baseUrl = getBaseUrl()
  return mcpRequest<McpSearchResponse>(`${baseUrl}/mcp/search`, {
    method: 'POST',
    body: JSON.stringify({ keyword, limit }),
  })
}

/**
 * 4. 获取 MCP 服务详情
 * GET /mcp/get?identifier=xxx
 */
export async function getMcpServiceDetail(identifier: string): Promise<McpDetailResponse> {
  const baseUrl = getBaseUrl()
  return mcpRequest<McpDetailResponse>(
    `${baseUrl}/mcp/get${buildQuery({ identifier })}`,
    { method: 'GET' },
  )
}

/**
 * 5. 启用 MCP 服务
 * POST /mcp/enable
 */
export async function enableMcpService(identifier: string): Promise<McpEnableResponse> {
  const baseUrl = getBaseUrl()
  return mcpRequest<McpEnableResponse>(`${baseUrl}/mcp/enable`, {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  })
}

/**
 * 5. 停用 MCP 服务
 * POST /mcp/disable
 */
export async function disableMcpService(identifier: string): Promise<McpEnableResponse> {
  const baseUrl = getBaseUrl()
  return mcpRequest<McpEnableResponse>(`${baseUrl}/mcp/disable`, {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  })
}

/**
 * 6. 删除 MCP 服务
 * DELETE /mcp/{identifier}
 */
export async function deleteMcpService(identifier: string): Promise<McpDeleteResponse> {
  const baseUrl = getBaseUrl()
  return mcpRequest<McpDeleteResponse>(`${baseUrl}/mcp/${encodeURIComponent(identifier)}`, {
    method: 'DELETE',
  })
}
