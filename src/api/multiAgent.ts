import {
  getCurrentAccount,
  getStoredUserProfile,
  handleAuthExpired,
  isAuthExpiredResponse,
} from '@/utils/auth'

export type UUID = string

export interface GroupMember {
  id: UUID
  name: string
  role_code: string
  description: string
  model_name: string | null
  manager_eligible: boolean
  enabled: boolean
  usr: string | null
  created_at: string
  updated_at: string
  role_name?: string
  role_description?: string
  role_enabled?: boolean
  is_manager?: boolean
}

export interface GroupSummary {
  id: UUID
  name: string
  purpose: string
  manager_employee_id: UUID
  manager_name: string
  max_rounds: number
  max_tasks_per_round: number
  created_by: string | null
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
  member_count?: number
}

export interface GroupDetail extends GroupSummary {
  members: GroupMember[]
}

export type RunStatus = 'running' | 'waiting_user' | 'completed' | 'failed'

export interface GroupRun {
  id: UUID
  group_id: UUID
  user_message_id: UUID | null
  result_message_id: UUID | null
  route_type: 'managed' | 'direct'
  status: RunStatus
  current_round: number
  max_rounds: number
  error: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface GroupTask {
  id: UUID
  run_id: UUID
  round_no: number
  task_key: string
  employee_id: UUID
  employee_name: string
  instruction: string
  depends_on: string[]
  status: TaskStatus
  result: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface GroupMessage {
  id: UUID
  group_id: UUID
  run_id: UUID | null
  sender_type: 'user' | 'employee' | 'system'
  sender_employee_id: UUID | null
  sender_name: string | null
  content: string
  message_type: string
  round_no: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface RunBundle {
  run: GroupRun
  tasks: GroupTask[]
  messages: GroupMessage[]
}

interface ApiSuccess<T> {
  status: 'success'
  data: T
}

const getBaseUrl = () =>
  String(
    import.meta.env.VITE_MULTI_AGENT_API_BASE ||
      import.meta.env.VITE_CHAT_API_BASE ||
      '/chatApi',
  ).replace(/\/$/, '')

const formatApiDetail = (detail: unknown, status: number): string => {
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === 'object' && typeof item.msg === 'string' ? item.msg : '',
      )
      .filter(Boolean)
    if (messages.length > 0) {
      return messages.join('；')
    }
  }

  return `请求失败（HTTP ${status}）`
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)

  if (isAuthExpiredResponse(body, response.status)) {
    handleAuthExpired()
    throw new Error('登录状态已失效，请重新登录')
  }

  if (!response.ok) {
    throw new Error(formatApiDetail(body?.detail, response.status))
  }

  if (!body || typeof body !== 'object' || body.status !== 'success' || !('data' in body)) {
    throw new Error('多智能体接口返回格式错误')
  }

  return (body as ApiSuccess<T>).data
}

const getUserContext = () => {
  const profile = getStoredUserProfile()
  return {
    usr: getCurrentAccount(),
    username: profile?.name || '',
  }
}

export const multiAgentApi = {
  async createAutoGroup(payload: {
    description: string
    candidate_employee_ids: Array<string | number>
    max_rounds?: number
    max_tasks_per_round?: number
  }): Promise<GroupDetail> {
    const user = getUserContext()
    const created = await apiRequest<GroupDetail>('/multi-agent/groups/auto', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        created_by: user.usr,
        username: user.username,
      }),
    })

    try {
      return await this.getGroup(created.id)
    } catch {
      return created
    }
  },

  getGroup(groupId: UUID): Promise<GroupDetail> {
    return apiRequest<GroupDetail>(`/multi-agent/groups/${encodeURIComponent(groupId)}`)
  },

  sendGroupMessage(groupId: UUID, content: string): Promise<RunBundle> {
    const user = getUserContext()
    return apiRequest<RunBundle>(
      `/multi-agent/groups/${encodeURIComponent(groupId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          content,
          mention_employee_ids: [],
          usr: user.usr,
          username: user.username,
          timeout_seconds: 1800,
        }),
      },
    )
  },

  getGroupMessages(groupId: UUID, limit = 100): Promise<GroupMessage[]> {
    const search = new URLSearchParams({ limit: String(limit) })
    return apiRequest<GroupMessage[]>(
      `/multi-agent/groups/${encodeURIComponent(groupId)}/messages?${search.toString()}`,
    )
  },
}
