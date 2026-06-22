// API相关类型定义
export interface FunctionApiConfig {
  id: string
  label: string
  url: string
  auth: string
  inputs: (message: string) => Record<string, any>
  description?: string
  hidden?: boolean // ✅ 是否在功能按钮栏隐藏
}

export interface ApiRequestBody {
  inputs: Record<string, any>
  response_mode: 'streaming'
  user: string
}

export interface ApiResponse {
  code: number
  data: any
  message: string
}
