import axios from 'axios'
import { getAuthToken, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

// ==================== 类型定义 ====================

export interface ScheduledTask {
  id: number
  name: string
  description: string
  enabled: boolean
  repeat: string
  schedule: string
  prompt: string
  max_delay_hours: number
  created_at: string
  updated_at: string
}

export interface ScheduledTaskListResponse {
  list: ScheduledTask[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface ScheduledTaskListParams {
  enabled?: boolean
  repeat?: string
  keyword?: string
  page?: number
  page_size?: number
}

export interface CreateTaskPayload {
  name: string
  prompt: string
  description?: string
  enabled?: boolean
  repeat?: string
  schedule?: string
  max_delay_hours?: number
}

export interface UpdateTaskPayload {
  prompt?: string
  description?: string
  enabled?: boolean
  repeat?: string
  schedule?: string
  max_delay_hours?: number
}

export interface TaskRunResult {
  log_id: number
  task_name: string
  report: string
  run_at: string
}

export interface TaskRunLog {
  id: number
  task_id: number
  task_name: string
  run_at: string
  report: string
}

export interface TaskRunLogListResponse {
  list: TaskRunLog[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface TaskRunLogListParams {
  task_name?: string
  page?: number
  page_size?: number
}

interface ApiResponse<T> {
  status: string
  message?: string
  data: T
}

// ==================== API 实例 ====================

const SCHED_API_BASE = import.meta.env.VITE_CHAT_API_BASE || '/chatApi'

const schedApi = axios.create({
  baseURL: SCHED_API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

schedApi.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.token = token
    }
    return config
  },
  (error) => Promise.reject(error),
)

schedApi.interceptors.response.use(
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

// ==================== API 方法 ====================

/** 1. 查看定时任务列表 */
export const listTasks = (params: ScheduledTaskListParams = {}) => {
  return schedApi.get<
    ApiResponse<ScheduledTaskListResponse>,
    ApiResponse<ScheduledTaskListResponse>
  >('/sched_task/list', { params })
}

/** 2. 创建定时任务 */
export const createTask = (payload: CreateTaskPayload) => {
  return schedApi.post<ApiResponse<ScheduledTask>, ApiResponse<ScheduledTask>>(
    '/sched_task/create',
    payload,
  )
}

/** 3. 查看定时任务详情 */
export const getTask = (name: string) => {
  return schedApi.get<ApiResponse<ScheduledTask>, ApiResponse<ScheduledTask>>(
    `/sched_task/get/${encodeURIComponent(name)}`,
  )
}

/** 4. 删除定时任务 */
export const deleteTask = (name: string) => {
  return schedApi.delete<ApiResponse<null>, ApiResponse<null>>(
    `/sched_task/delete/${encodeURIComponent(name)}`,
  )
}

/** 5. 更新定时任务（name 不可编辑） */
export const updateTask = (name: string, payload: UpdateTaskPayload) => {
  return schedApi.put<ApiResponse<ScheduledTask>, ApiResponse<ScheduledTask>>(
    `/sched_task/update/${encodeURIComponent(name)}`,
    payload,
  )
}

/** 6. 定时任务立刻执行 */
export const runTask = (name: string) => {
  return schedApi.post<ApiResponse<TaskRunResult>, ApiResponse<TaskRunResult>>(
    `/sched_task/run/${encodeURIComponent(name)}`,
  )
}

/** 7. 查看定时任务日志列表 */
export const listRunLogs = (params: TaskRunLogListParams = {}) => {
  return schedApi.get<ApiResponse<TaskRunLogListResponse>, ApiResponse<TaskRunLogListResponse>>(
    '/sched_runlog/list',
    { params },
  )
}

/** 8. 删除定时任务日志 */
export const deleteRunLog = (id: number) => {
  return schedApi.delete<ApiResponse<null>, ApiResponse<null>>(`/sched_runlog/delete/${id}`)
}

/** 9. 查看日志详情 */
export const getRunLog = (id: number) => {
  return schedApi.get<ApiResponse<TaskRunLog>, ApiResponse<TaskRunLog>>(`/sched_runlog/get/${id}`)
}
