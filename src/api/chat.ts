import { getCurrentAccount, getStoredUserProfile, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

interface BehaviorCheckResult {
  is_sensitive: boolean
  message: string
  keywords_found?: string[]
  behavior_id?: number | null
}

/**
 * 解析流式响应的 SSE 数据行
 */
function parseStreamLine(
  trimmedLine: string,
): { delta: string; type: string; metadata: any } | null {
  if (!trimmedLine.startsWith('data: ')) return null
  const data = trimmedLine.slice(6).trim()
  if (data === '[DONE]') return null

  try {
    const parsed = JSON.parse(data)
    const type = parsed.type ?? parsed.event ?? 'text'
    // 过滤 model_text 类型，不在界面上展示模型信息
    if (type === 'model_text') return null
    const delta = parsed.text ?? parsed.content ?? parsed.delta ?? parsed.answer ?? ''

    let toolName = parsed.tool_name || parsed.toolName
    const toolArgs = parsed.tool_args || parsed.toolArgs

    if (!toolName && delta) {
      const match = delta.match(/正在调用工具:[\s\S]*?`(\w+)`/)
      if (match) toolName = match[1]
    }

    return {
      delta,
      type,
      metadata: { toolName, toolArgs, toolId: parsed.tool_id || parsed.toolId },
    }
  } catch {
    return null
  }
}

/**
 * 内部通用流式请求方法
 */
async function streamRequest(
  url: string,
  body: Record<string, unknown>,
  onChunk: (
    text: string,
    type?: 'text' | 'thinking' | 'tool_call' | 'tool_result',
    metadata?: any,
  ) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
): Promise<{ content: string; controller: AbortController }> {
  const controller = new AbortController()
  let accumulatedContent = ''

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, stream: true }),
      signal: signal || controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (isAuthExpiredResponse(errorText, response.status)) {
        handleAuthExpired()
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法获取响应流')

    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const textChunk = decoder.decode(value, { stream: true })
      buffer += textChunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        const result = parseStreamLine(trimmedLine)
        if (!result) continue
        if (!result.delta) continue

        accumulatedContent += result.delta
        onChunk(
          result.delta,
          result.type as 'text' | 'thinking' | 'tool_call' | 'tool_result',
          result.metadata,
        )
      }
    }

    onComplete()
    return { content: accumulatedContent, controller }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { content: accumulatedContent, controller }
    }
    onError(error as Error)
    throw error
  }
}

export const chatServices = {
  _buildRequestBody(
    content: string,
    user: string,
    fileIds: string[],
    modelName: string | null | undefined,
  ): Record<string, unknown> {
    const usr = getCurrentAccount()
    const userProfile = getStoredUserProfile()
    const username = userProfile?.name || ''
    return {
      query: content,
      usr,
      username,
      session_id: user,
      ...(modelName ? { model_name: modelName } : {}),
      file_ids: fileIds,
    }
  },

  sendMessageStream: async (
    content: string,
    user: string,
    fileIds: string[],
    modelName: string | null | undefined,
    onChunk: (
      text: string,
      type?: 'text' | 'thinking' | 'tool_call' | 'tool_result',
      metadata?: any,
    ) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    onBehaviorSensitive?: (message: string, result: BehaviorCheckResult) => void,
    signal?: AbortSignal,
    extraBody?: Record<string, unknown>,
  ) => {
    const controller = new AbortController()

    try {
      const baseURL = import.meta.env.VITE_CHAT_API_BASE || '/chatApi'
      const usr = getCurrentAccount()
      const userProfile = getStoredUserProfile()
      const username = userProfile?.name || ''

      const behaviorResponse = await fetch(`${baseURL}/check_behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id_no: userProfile?.idCard || usr,
          user_name: username,
          behavior_content: content,
        }),
        signal: signal || controller.signal,
      })

      if (!behaviorResponse.ok) {
        const errorText = await behaviorResponse.text()
        if (isAuthExpiredResponse(errorText, behaviorResponse.status)) handleAuthExpired()
        throw new Error(`HTTP error! status: ${behaviorResponse.status}`)
      }

      const behaviorData = await behaviorResponse.json()
      const behaviorResult = (
        behaviorData && typeof behaviorData === 'object' && 'data' in behaviorData
          ? (behaviorData as { data?: BehaviorCheckResult }).data
          : behaviorData
      ) as BehaviorCheckResult

      if (isAuthExpiredResponse(behaviorData, behaviorResponse.status)) {
        handleAuthExpired()
        throw new Error('token已过期')
      }

      if (behaviorResult?.is_sensitive) {
        onBehaviorSensitive?.(behaviorResult.message || '消息包含敏感词', behaviorResult)
      }

      const body = {
        ...chatServices._buildRequestBody(content, user, fileIds, modelName),
        ...(extraBody || {}),
      }
      return await streamRequest(
        `${baseURL}/chat`,
        body,
        onChunk,
        onComplete,
        onError,
        signal || controller.signal,
      )
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { content: '', controller }
      }
      onError(error as Error)
      throw error
    }
  },

  abortSession: (sessionId: string) => {
    const baseURL = import.meta.env.VITE_CHAT_API_BASE || '/chatApi'
    return fetch(`${baseURL}/abort?session_id=${sessionId}`, {
      method: 'POST',
    })
  },

  uploadFile: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('usr', getCurrentAccount())

    const baseURL = import.meta.env.VITE_CHAT_API_BASE || '/chatApi'
    return fetch(`${baseURL}/upload`, {
      method: 'POST',
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text()
        if (isAuthExpiredResponse(errorText, response.status)) {
          handleAuthExpired()
        }
        throw new Error(`上传失败: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      if (isAuthExpiredResponse(data, response.status)) {
        handleAuthExpired()
        throw new Error('token已过期')
      }
      return data
    })
  },

  extractTimeByAPI: async (
    keyword: string,
  ): Promise<{ startTime: string; endTime: string } | null> => {
    try {
      const url = import.meta.env.VITE_API_URL + '/qbpt/znt/getFxsj.xhtml'
      const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          AuthToken: 'ff6aec06f3c7436f8210efa76b38798b',
        },
        body: JSON.stringify({
          keyword: keyword,
          requestId: requestId,
        }),
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()

      if (data.code === 200) {
        return {
          startTime: data.data.startTime,
          endTime: data.data.endTime,
        }
      }
      return null
    } catch {
      return null
    }
  },
}
