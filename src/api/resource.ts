import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'
import type { McpServiceItem } from '@/api/mcpService'
import type { SkillItem } from '@/api/skillManage'
import type { OfficerItem } from '@/api/officer'

// ============ 类型定义 ============

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

// ============ 接口一：我的资源 ============

/** 授权信息 */
export interface AuthInfo {
  auth_id: number
  auth_type: 'read' | 'write'
  expire_time: string | null
  auth_time: string
}

/** 我的资源 - Skill（含 _source / _auth_info） */
export interface MySkillItem extends SkillItem {
  _source: 'created' | 'authorized'
  _auth_info?: AuthInfo
}

/** 我的资源 - MCP（含 _source / _auth_info） */
export interface MyMcpItem extends McpServiceItem {
  _source: 'created' | 'authorized'
  _auth_info?: AuthInfo
}

/** 我的资源 - 数字警员（含 _source / _auth_info） */
export interface MyOfficerItem extends OfficerItem {
  _source: 'created' | 'authorized'
  _auth_info?: AuthInfo
}

/** 我的资源统计 */
export interface MyResourceStatistics {
  total: number
  skills: number
  mcps: number
  officers: number
  created: {
    skills: number
    mcps: number
    officers: number
  }
  authorized: {
    skills: number
    mcps: number
    officers: number
  }
}

/** 接口一返回的 data */
export interface MyResourceData {
  list: {
    skills: MySkillItem[]
    mcps: MyMcpItem[]
    officers: MyOfficerItem[]
  }
  statistics: MyResourceStatistics
}

// ============ 接口二：公开/上架资源 ============

/** 公开资源列表项（统一格式） */
export interface PublicResourceItem {
  resource_type: 'skill' | 'mcp' | 'officer'
  resource_id: number
  resource_name: string
  resource_code: string
  description: string
  is_public: boolean
  dept_audit_status: string
  super_audit_status: string
  creator_id: number
  creator_name: string
  dept_id: number
  dept_name: string
  create_time: string
}

/** 接口二请求参数 */
export interface PublicResourceParams {
  resource_type?: 'skill' | 'mcp' | 'officer'
  is_public?: boolean
  dept_id?: number
  creator_id?: number
  keyword?: string
  page?: number
  limit?: number
}

/** 接口二返回的 data */
export interface PublicResourceData {
  list: PublicResourceItem[]
  total: number
  page: number
  limit: number
}

// ============ 基础请求封装 ============

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
 * 查询我的所有资源（我创建的 + 授权给我的）
 * POST /dsjpt/jk/resource/my/list.xhtml
 *
 * @param resourceType 可选，筛选资源类型：'skill' | 'mcp' | 'officer'，不传则查询所有
 * @returns 我的资源列表 + 统计信息
 */
export async function getMyResources(
  resourceType?: 'skill' | 'mcp' | 'officer',
  userId?: number,
  deptId?: number,
): Promise<MyResourceData> {
  const body: Record<string, unknown> = {}
  if (resourceType) {
    body.resource_type = resourceType
  }
  if (userId !== undefined) {
    body.user_id = userId
  }
  if (deptId !== undefined) {
    body.dept_id = deptId
  }
  const response = await postApi<BaseResponse<MyResourceData>>(
    '/dsjpt/jk/resource/my/list.xhtml',
    body,
  )
  const data = response.data
  if (!data || !data.list) {
    return {
      list: { skills: [], mcps: [], officers: [] },
      statistics: {
        total: 0, skills: 0, mcps: 0, officers: 0,
        created: { skills: 0, mcps: 0, officers: 0 },
        authorized: { skills: 0, mcps: 0, officers: 0 },
      },
    }
  }
  // 防御性空值保护：确保每个数组字段不为 null/undefined
  return {
    list: {
      skills: data.list.skills || [],
      mcps: data.list.mcps || [],
      officers: data.list.officers || [],
    },
    statistics: data.statistics || {
      total: 0, skills: 0, mcps: 0, officers: 0,
      created: { skills: 0, mcps: 0, officers: 0 },
      authorized: { skills: 0, mcps: 0, officers: 0 },
    },
  }
}

/**
 * 查询所有公开/上架资源（通用资源）
 * POST /dsjpt/jk/auth/resources.xhtml
 *
 * @param params 筛选参数：resource_type, is_public, dept_id, creator_id, keyword, page, limit
 * @returns 分页的公开资源列表
 */
export async function getPublicResources(
  params: PublicResourceParams = {},
): Promise<PublicResourceData> {
  // 过滤掉 undefined 值（但显式声明 user_id/dept_id/creator_id 阻止 enrichBody 自动注入）
  const body: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      body[key] = value
    }
  }
  // 显式声明外置筛选 key（undefined 值会被 JSON.stringify 自动丢弃）
  if (!('creator_id' in body)) body.creator_id = undefined
  if (!('dept_id' in body)) body.dept_id = undefined
  if (!('user_id' in body)) body.user_id = undefined
  const response = await postApi<BaseResponse<PublicResourceItem[]>>(
    '/dsjpt/jk/auth/resources.xhtml',
    body,
  )
  // 实际 API 返回 data 为扁平数组，非 { list, total, page, limit } 对象
  const list = Array.isArray(response.data) ? response.data : []
  return {
    list,
    total: list.length,
    page: params.page || 1,
    limit: params.limit || 20,
  }
}

/**
 * 便捷方法：获取所有公开资源（不分页，用于选择器等场景）
 */
export async function getAllPublicResources(
  resourceType?: 'skill' | 'mcp' | 'officer',
): Promise<PublicResourceItem[]> {
  const result = await getPublicResources({
    resource_type: resourceType,
    is_public: true,
    limit: 500,
  })
  return result.list
}
