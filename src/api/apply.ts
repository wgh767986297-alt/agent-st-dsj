import { getAuthToken, getCurrentUserId, getCurrentDeptId, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

type ApiStatus = 'success' | 'succeed' | 'error' | string

interface BaseResponse<T = unknown> {
  message?: string
  status?: ApiStatus
  data?: T
}

export interface ApplyItem {
  id: number
  skill_id: number
  skill_name: string
  applicant_id: number
  applicant_name: string
  apply_type: 'publish' | 'cancel'
  apply_reason: string
  dept_id?: number
  status: '00' | '01' | '02'
  auditor_id?: number | null
  audit_remark?: string | null
  audit_time?: string | null
  create_time?: string
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

export const applyApi = {
  /** 提交 Skill 发布申请 apply_type: publish-发布上架 cancel-取消上架 */
  async submitSkill(
    skill_id: number,
    apply_type: 'publish' | 'cancel',
    apply_reason: string,
  ): Promise<void> {
    await postApi('/dsjpt/jk/apply/skill.xhtml', { skill_id, apply_type, apply_reason })
  },

  /** 审核 Skill 发布申请 status: 00-待审核 01-已通过 02-已拒绝 */
  async auditSkill(id: number, status: '00' | '01' | '02', audit_remark?: string): Promise<void> {
    await postApi('/dsjpt/jk/apply/skillAudit.xhtml', { id, status, audit_remark })
  },

  /** 查询 Skill 发布申请列表 */
  async listSkill(params: { status?: string; dept_id?: number } = {}): Promise<ApplyItem[]> {
    const response = await postApi<BaseResponse<ApplyItem[]>>(
      '/dsjpt/jk/apply/skillList.xhtml',
      params,
    )
    return response.data || []
  },
}
