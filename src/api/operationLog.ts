import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

export interface OperationLogItem {
  id: number
  user_id: number
  user_account: string
  user_name: string
  user_role: string
  operation_type: string
  operation_module: string
  operation_content: Record<string, unknown>
  request_ip: string
  request_url: string
  status: string
  create_time: string
}

export interface OperationLogQuery {
  user_id?: number
  user_account?: string
  operation_type?: string
  operation_module?: string
  start_time?: string
  end_time?: string
  page?: number
  limit?: number
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

export const operationLogApi = {
  /** 查询操作日志 (需安全审计员权限) */
  async query(params: OperationLogQuery = {}): Promise<OperationLogItem[]> {
    const response = await postApi<BaseResponse<OperationLogItem[]>>(
      '/dsjpt/jk/log/operation.xhtml',
      params,
    )
    return response.data || []
  },

  /** 导出操作日志为 Excel */
  async exportLog(params: OperationLogQuery = {}): Promise<void> {
    const token = getAuthToken()
    if (!token) {
      handleAuthExpired('登录状态已失效，请重新登录')
      throw new Error('登录状态已失效，请重新登录')
    }

    const response = await fetch(buildUrl('/dsjpt/jk/log/export.xhtml'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token,
      },
      body: JSON.stringify(enrichBody(params as Record<string, unknown>)),
    })

    if (!response.ok) {
      const text = await response.text()
      let errMsg = `导出失败: ${response.status}`
      try {
        const data = JSON.parse(text)
        errMsg = data.message || errMsg
      } catch {}
      throw new Error(errMsg)
    }

    // 下载 Excel 文件
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `操作日志_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}
