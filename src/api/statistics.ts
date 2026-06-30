import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

export interface WdtxffData {
  wdTotal: number
  fjxx: string
  zzl: string
  top5: Array<{
    name: string
    department: string
    company: string
    value: number
  }>
}

export type HhxxData = Record<string, number>

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

export const statisticsApi = {
  /** 获取问答统计信息 type: 0-今日 1-近7天 2-近30天 */
  async getWdtxff(type: '0' | '1' | '2' = '0'): Promise<WdtxffData> {
    const response = await postApi<BaseResponse<WdtxffData>>('/dsjpt/jk/getWdtxff.xhtml', { type })
    return response.data || { wdTotal: 0, fjxx: '{}', zzl: '0%', top5: [] }
  },

  /** 获取会话统计 */
  async getHhxx(
    params: { start_time?: string; end_time?: string; name?: string } = {},
  ): Promise<HhxxData> {
    const response = await postApi<BaseResponse<HhxxData>>('/dsjpt/jk/getHhxx.xhtml', params)
    return response.data || {}
  },
}
