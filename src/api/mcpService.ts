import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

// ============ 类型定义 ============

/** 单个 MCP 工具 */
export interface McpToolItem {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

/** MCP 服务完整数据模型（对齐 t_mcp_service 表 + API 响应） */
export interface McpServiceItem {
  id: number
  service_code: string
  service_name: string
  description?: string
  service_url: string
  api_key?: string
  service_type?: string
  protocol_type?: string
  config?: Record<string, unknown>
  tools?: McpToolItem[]
  tools_count?: number
  creator_id?: number
  dept_id?: number
  /** 统一上架状态：01-上架审核中 02-已上架 03-审核失败 04-下架审核中 05-已下架 06-下架失败 */
  status?: string
  dept_audit_status?: string   // 00-待审核 02-通过 03-驳回
  super_audit_status?: string  // 00-待审核 02-通过 03-驳回
  dept_delete_audit_status?: string  // 00-待审核 02-通过 03-驳回
  super_delete_audit_status?: string // 00-待审核 02-通过 03-驳回
  delete_reason?: string
  is_public?: boolean
  is_deleted?: boolean
  create_time?: string
  update_time?: string
  creator_name?: string
  dept_name?: string
}

/** createOrUpdate 请求参数 */
export interface McpCreateOrUpdateParams {
  id?: number | null
  service_code: string
  service_name: string
  description?: string
  service_url: string
  api_key?: string
  service_type?: string
  protocol_type?: string
  config?: Record<string, unknown>
  tools?: McpToolItem[]
}

/** 列表查询请求参数 */
export interface McpListParams {
  page?: number
  page_size?: number
  enabled_only?: boolean
  protocol_type?: string
  category?: string
  keyword?: string
  creatorid?: number
  dept_id?: number
  is_public?: boolean
}

/** 列表查询响应（API 返回扁平结构，无 data 包裹） */
export interface McpListResponse {
  status: string
  message?: string
  total: number
  items: McpServiceItem[]
  page: number
  page_size: number
  total_pages: number
}

/** 详情查询响应 */
export interface McpDetailResponse {
  status: string
  message: string
  data: McpServiceItem
}

/** 通用操作响应 */
export interface McpBaseResponse {
  status: string
  message: string
  data?: { id?: number }
}

// ============ 基础请求封装 ============

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

const BASE_URL =
  import.meta.env.VITE_PARSE_API_URL || import.meta.env.VITE_API_URL || 'http://10.32.71.224:8080'

const buildUrl = (path: string) => `${BASE_URL}${path}`

function enrichBody(body: Record<string, unknown>): Record<string, unknown> {
  const userId = getCurrentUserId()
  const deptId = getCurrentDeptId()
  const enriched = { ...body }
  if (userId != null && !('user_id' in enriched)) {
    enriched.user_id = userId
  }
  if (deptId != null && !('dept_id' in enriched)) {
    enriched.dept_id = deptId
  }
  return enriched
}

async function postApi<T extends BaseResponse>(path: string, body: object): Promise<T> {
  const token = getAuthToken()

  if (!token) {
    handleAuthExpired('登录状态已失效，请重新登录')
    throw new Error('登录状态已失效，请重新登录')
  }

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify(enrichBody(body as Record<string, unknown>)),
  })

  const text = await response.text()
  let data: T

  try {
    data = text ? (JSON.parse(text) as T) : ({} as T)
  } catch {
    throw new Error(text || '接口返回格式错误')
  }

  if (isAuthExpiredResponse(data, response.status)) {
    handleAuthExpired()
    throw new Error(data.message || 'token已过期')
  }

  if (!response.ok) {
    throw new Error(data.message || `请求失败: ${response.status}`)
  }

  if (data.status && !['success', 'succeed'].includes(data.status)) {
    throw new Error(data.message || '操作失败')
  }

  return data
}

// ============ API 方法 ============

/**
 * 1. 创建或更新 MCP 服务
 * POST /dsjpt/jk/mcp/createOrUpdate.xhtml
 * 传 id 为更新，不传或传 null 为创建
 */
export async function createOrUpdateMcp(
  params: McpCreateOrUpdateParams,
): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/createOrUpdate.xhtml', params)
}

/**
 * 2. 获取 MCP 服务详情
 * POST /dsjpt/jk/mcp/get.xhtml
 */
export async function getMcpDetail(id: number): Promise<McpDetailResponse> {
  return postApi<McpDetailResponse>('/dsjpt/jk/mcp/get.xhtml', { id })
}

/**
 * 3. MCP 列表查询（增强版，支持分页 + 筛选）
 * POST /dsjpt/jk/mcp/listEnhanced.xhtml
 */
export async function listEnhancedMcp(
  params: McpListParams = {},
): Promise<McpListResponse> {
  return postApi<McpListResponse>('/dsjpt/jk/mcp/listEnhanced.xhtml', params)
}

/**
 * 3b. 便捷方法：获取启用的 MCP 列表（用于选择器）
 */
export async function listEnabledMcpServices(
  page_size = 200,
): Promise<McpServiceItem[]> {
  const res = await listEnhancedMcp({ page: 1, page_size, enabled_only: true })
  return res.items || []
}

/**
 * 3c. 便捷方法：获取所有 MCP 列表（用于管理页面）
 */
export async function listAllMcpServices(
  page_size = 200,
): Promise<McpServiceItem[]> {
  const res = await listEnhancedMcp({ page: 1, page_size })
  return res.items || []
}

/**
 * 4. 删除 MCP 服务
 * POST /dsjpt/jk/mcp/delete.xhtml
 */
export async function deleteMcpService(id: number): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/delete.xhtml', { id })
}

/**
 * 5. 部门审核 MCP
 * POST /dsjpt/jk/mcp/deptAudit.xhtml
 */
export async function deptAuditMcp(
  id: number,
  dept_audit_status: '02' | '03',
  dept_audit_remark?: string,
): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/deptAudit.xhtml', {
    id,
    dept_audit_status,
    dept_audit_remark,
  })
}

/**
 * 6. 超级管理员审核 MCP
 * POST /dsjpt/jk/mcp/superAudit.xhtml
 */
export async function superAuditMcp(
  id: number,
  super_audit_status: '02' | '03',
  super_audit_remark?: string,
): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/superAudit.xhtml', {
    id,
    super_audit_status,
    super_audit_remark,
  })
}

/**
 * 7. 申请删除 MCP
 * POST /dsjpt/jk/mcp/applyDelete.xhtml
 */
export async function applyDeleteMcp(
  id: number,
  delete_reason: string,
): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/applyDelete.xhtml', {
    id,
    delete_reason,
  })
}

/**
 * 8. 部门审核删除 MCP
 * POST /dsjpt/jk/mcp/deptAuditDelete.xhtml
 */
export async function deptAuditDeleteMcp(
  id: number,
  dept_delete_audit_status: '02' | '03',
  dept_delete_remark?: string,
): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/deptAuditDelete.xhtml', {
    id,
    dept_delete_audit_status,
    dept_delete_remark,
  })
}

/**
 * 9. 超级管理员审核删除 MCP
 * POST /dsjpt/jk/mcp/superAuditDelete.xhtml
 */
export async function superAuditDeleteMcp(
  id: number,
  super_delete_audit_status: '02' | '03',
  super_delete_remark?: string,
): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/superAuditDelete.xhtml', {
    id,
    super_delete_audit_status,
    super_delete_remark,
  })
}

/**
 * 10. 申请下架 MCP
 * POST /dsjpt/jk/mcp/applyRemove.xhtml
 */
export async function applyRemoveMcp(id: number): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/applyRemove.xhtml', { id })
}

/**
 * 11. 部门管理员审核下架 MCP dept_audit_status: '05'-通过 '06'-拒绝
 * POST /dsjpt/jk/mcp/deptAuditRemove.xhtml
 */
export async function deptAuditRemoveMcp(
  id: number,
  dept_audit_status: '05' | '06',
  dept_audit_remark?: string,
): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/deptAuditRemove.xhtml', { id, dept_audit_status, dept_audit_remark })
}

/**
 * 12. 超级管理员审核下架 MCP
 * POST /dsjpt/jk/mcp/superAuditRemove.xhtml
 */
export async function superAuditRemoveMcp(
  id: number,
  super_delete_audit_status: '05' | '06',
  super_delete_remark?: string,
): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/superAuditRemove.xhtml', {
    id,
    super_delete_audit_status,
    super_delete_remark,
  })
}

/**
 * 12. 设置 MCP 上架/下架
 * POST /dsjpt/jk/mcp/setPublic.xhtml
 */
export async function setMcpPublic(
  id: number,
  is_public: boolean,
): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/setPublic.xhtml', {
    id,
    is_public,
  })
}

// ========== MCP 上架申请 ==========

/**
 * 申请上架 MCP 服务
 * POST /dsjpt/jk/mcp/applyPublish.xhtml
 */
export async function applyPublishMcp(id: number): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/applyPublish.xhtml', { id })
}

// ========== MCP 授权管理 ==========

/**
 * 授权 MCP
 * POST /dsjpt/jk/mcp/auth.xhtml
 */
export async function grantMcpAuth(payload: {
  mcp_id: number
  auth_target_type: 'dept' | 'user'
  dept_id?: number
  user_id?: number
  auth_type?: 'read' | 'write'
  status?: string
  expire_time?: string
}): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/auth.xhtml', payload)
}

/**
 * 取消 MCP 授权
 * POST /dsjpt/jk/mcp/cancelAuth.xhtml
 */
export async function cancelMcpAuth(payload: {
  mcp_id: number
  dept_id?: number
  user_id?: number
}): Promise<McpBaseResponse> {
  return postApi<McpBaseResponse>('/dsjpt/jk/mcp/cancelAuth.xhtml', payload)
}

/**
 * 查询 MCP 授权列表（通用MCP服务 — 已授权给用户的上架服务）
 * POST /dsjpt/jk/mcp/authList.xhtml
 */
export async function getMcpAuthList(params: {
  mcp_id?: number
  dept_id?: number
  user_id?: number
  auth_target_type?: 'dept' | 'user'
  status?: string
  page?: number
  page_size?: number
  keyword?: string
  category?: string
}): Promise<McpListResponse> {
  const res = await postApi<McpListResponse & BaseResponse>('/dsjpt/jk/mcp/authList.xhtml', params)
  return {
    status: res.status || 'success',
    total: res.total || 0,
    items: res.items || (res as unknown as { list: McpServiceItem[] }).list || [],
    page: res.page || 1,
    page_size: res.page_size || 20,
    total_pages: res.total_pages || 0,
  }
}
