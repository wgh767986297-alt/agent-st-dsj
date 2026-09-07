import { handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

export type UUID = string
export type OfficerId = string

export interface GroupMember {
  id: OfficerId
  name: string
  role_code?: string
  description: string
  model_name?: string | null
  enabled?: boolean
  created_at?: string
  updated_at?: string
  role_name?: string
  role_description?: string
  is_manager?: boolean
  skills?: unknown[]
  mcp_services?: unknown[]
}

export interface GroupSummary {
  id: UUID
  name: string
  purpose: string
  manager_employee_id: OfficerId
  manager_name: string
  max_rounds: number
  max_tasks_per_round: number
  created_by?: string | null
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
  employee_id: OfficerId
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
  sender_employee_id: OfficerId | null
  sender_name: string | null
  content: string
  message_type: string
  round_no: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface GroupChildRun {
  id: UUID
  employee_id: OfficerId
  employee_name: string
  [key: string]: unknown
}

export interface RunBundle {
  run: GroupRun
  tasks: GroupTask[]
  messages: GroupMessage[]
  child_runs?: GroupChildRun[]
  resume?: {
    token: string
    run_id?: UUID
    expires_at?: string | null
  } | null
}

export interface GroupSseEvent {
  type: string
  data?: RunBundle | Record<string, unknown>
  text?: string
  sentence?: string
  status_code?: number
  child_run_id?: UUID
  employee_id?: OfficerId
  employee_name?: string
  sender_type?: 'employee' | 'system'
  sender_employee_id?: OfficerId
  sender_name?: string
  assignee_employee_id?: OfficerId
  assignee_name?: string
  round_no?: number
  purpose?: string
  task_key?: string
  instruction?: string
  depends_on?: string[]
  model?: string
  model_name?: string
  [key: string]: unknown
}

interface ApiSuccess<T> {
  status: 'success'
  data: T
}

export class MultiAgentApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'MultiAgentApiError'
  }
}

const getBaseUrl = () =>
  String(
    import.meta.env.VITE_MULTI_AGENT_API_BASE || import.meta.env.VITE_CHAT_API_BASE || '/chatApi',
  ).replace(/\/$/, '')

const formatApiDetail = (detail: unknown, status: number): string => {
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail)) {
    return JSON.stringify(detail)
  }

  return `请求失败（HTTP ${status}）`
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const requestUrl = `${getBaseUrl()}${path}`
  const method = String(init?.method || 'GET').toUpperCase()
  const parsedUrl = new URL(requestUrl, window.location.origin)
  const response = await fetch(requestUrl, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)

  console.info('[multi-agent:HTTP] response', {
    method,
    pathname: parsedUrl.pathname,
    search: parsedUrl.search,
    status: response.status,
    ok: response.ok,
  })

  if (isAuthExpiredResponse(body, response.status)) {
    handleAuthExpired()
    throw new Error('登录状态已失效，请重新登录')
  }

  if (!response.ok) {
    throw new MultiAgentApiError(formatApiDetail(body?.detail, response.status), response.status)
  }

  if (!body || typeof body !== 'object' || body.status !== 'success' || !('data' in body)) {
    throw new Error('多智能体接口返回格式错误')
  }

  return (body as ApiSuccess<T>).data
}

const parseSsePayload = (block: string): GroupSseEvent | null => {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
  if (!data) return null
  try {
    return JSON.parse(data) as GroupSseEvent
  } catch {
    throw new Error('群聊流式事件格式错误')
  }
}

const logGroupSseEvent = (event: GroupSseEvent) => {
  const base = {
    type: event.type,
    child_run_id: event.child_run_id,
    sender_type: event.sender_type,
    sender_employee_id: event.sender_employee_id || event.employee_id,
    sender_name: event.sender_name || event.employee_name,
    assignee_employee_id: event.assignee_employee_id,
    assignee_name: event.assignee_name,
    round_no: event.round_no,
    task_key: event.task_key,
  }

  if (event.type === 'result' && event.data && 'run' in event.data) {
    const bundle = event.data as unknown as RunBundle
    console.info('[multi-agent:SSE] result', {
      ...base,
      run: {
        id: bundle.run.id,
        group_id: bundle.run.group_id,
        route_type: bundle.run.route_type,
        status: bundle.run.status,
        current_round: bundle.run.current_round,
        max_rounds: bundle.run.max_rounds,
        error: bundle.run.error,
      },
      tasks: bundle.tasks.map((task) => ({
        id: task.id,
        task_key: task.task_key,
        employee_id: task.employee_id,
        employee_name: task.employee_name,
        status: task.status,
        error: task.error,
      })),
      message_count: bundle.messages.length,
      has_resume: Boolean(bundle.resume?.token),
    })
    return
  }

  const detail = {
    ...base,
    text: event.text,
    sentence: event.sentence,
    status_code: event.status_code,
    purpose: event.purpose,
    instruction: event.instruction,
    depends_on: event.depends_on,
    model: event.model_name || event.model,
  }
  if (event.type === 'error' || event.type === 'task_error') {
    console.error(`[multi-agent:SSE] ${event.type}`, detail)
  } else {
    console.debug(`[multi-agent:SSE] ${event.type}`, detail)
  }
}

async function streamGroupMessage(
  path: string,
  init: RequestInit,
  onEvent?: (event: GroupSseEvent) => void,
): Promise<RunBundle> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...init.headers,
    },
  })

  console.info('[multi-agent:SSE] response', {
    path,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type'),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    if (isAuthExpiredResponse(body, response.status)) {
      handleAuthExpired()
      throw new Error('登录状态已失效，请重新登录')
    }
    throw new MultiAgentApiError(formatApiDetail(body?.detail, response.status), response.status)
  }
  if (!response.body) throw new Error('群聊流式响应不可读取')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: RunBundle | null = null
  let streamDone = false
  let chunkIndex = 0
  const streamStartedAt = performance.now()

  const consume = async (event: GroupSseEvent) => {
    logGroupSseEvent(event)
    onEvent?.(event)
    if (event.type === 'error') {
      throw new MultiAgentApiError(event.text || '群聊执行失败', event.status_code || 500)
    }
    if (event.type === 'result' && event.data) result = event.data as unknown as RunBundle
    if (event.type === 'done') streamDone = true
    if (
      ['task_assignment', 'model_text', 'text', 'process_text', 'tool_call', 'tool_result'].includes(
        event.type,
      )
    ) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (value?.byteLength) {
      chunkIndex += 1
      console.info('[multi-agent:SSE] chunk', {
        index: chunkIndex,
        bytes: value.byteLength,
        elapsedMs: Math.round(performance.now() - streamStartedAt),
      })
      if (chunkIndex === 1 && performance.now() - streamStartedAt > 5000) {
        console.warn(
          '[multi-agent:SSE] 首个响应分块超过 5 秒才到达，可能存在后端或代理缓冲',
        )
      }
    }
    buffer += decoder.decode(value, { stream: !done })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''
    for (const block of blocks) {
      const event = parseSsePayload(block)
      if (event) await consume(event)
    }
    if (streamDone) {
      await reader.cancel().catch(() => undefined)
      buffer = ''
      break
    }
    if (done) break
  }
  const trailingEvent = parseSsePayload(buffer)
  if (trailingEvent) await consume(trailingEvent)
  console.info('[multi-agent:SSE] stream summary', {
    chunks: chunkIndex,
    elapsedMs: Math.round(performance.now() - streamStartedAt),
  })
  if (chunkIndex <= 1) {
    console.warn(
      '[multi-agent:SSE] 整次响应仅收到一个网络分块，页面无法实现真实流式展示，请检查后端 flush、压缩和代理缓冲',
    )
  }
  if (!streamDone) {
    console.warn('[multi-agent:SSE] 连接已结束，但未收到 done 事件')
  }
  if (!result) throw new Error('群聊流式响应缺少 result 事件')
  return result
}

export const multiAgentApi = {
  getEmployees(): Promise<GroupMember[]> {
    return apiRequest<GroupMember[]>('/multi-agent/employees')
  },

  async createAutoGroup(payload: {
    description: string
    manager_employee_id: OfficerId
    candidate_employee_ids: OfficerId[]
    max_rounds?: number
    max_tasks_per_round?: number
  }): Promise<GroupDetail> {
    const created = await apiRequest<GroupDetail>('/multi-agent/groups/auto', {
      method: 'POST',
      body: JSON.stringify(payload),
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

  sendGroupMessage(
    groupId: UUID,
    content: string,
    options: {
      mentionEmployeeIds?: OfficerId[]
      resumeToken?: string
      signal?: AbortSignal
      onEvent?: (event: GroupSseEvent) => void
    } = {},
  ): Promise<RunBundle> {
    return streamGroupMessage(
      `/multi-agent/groups/${encodeURIComponent(groupId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          content,
          mention_employee_ids: options.mentionEmployeeIds || [],
          ...(options.resumeToken ? { resume_token: options.resumeToken } : {}),
          timeout_seconds: 1800,
        }),
        signal: options.signal,
      },
      options.onEvent,
    )
  },

  getGroupMessages(groupId: UUID, limit?: number): Promise<GroupMessage[]> {
    const path = `/multi-agent/groups/${encodeURIComponent(groupId)}/messages`
    if (limit === undefined) return apiRequest<GroupMessage[]>(path)

    const search = new URLSearchParams({ limit: String(limit) })
    return apiRequest<GroupMessage[]>(`${path}?${search.toString()}`)
  },

  getRun(runId: UUID): Promise<RunBundle> {
    return apiRequest<RunBundle>(`/multi-agent/runs/${encodeURIComponent(runId)}`)
  },
}
