import type { FunctionApiConfig, ApiRequestBody } from '@/types/api'
import { getApiConfig, functionApiConfigs } from './functionApis'
import { handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

// 功能API服务
export const functionApiServices = {
  // 调用功能API（流式响应）
  async callFunctionApi(
    functionId: string,
    query: string,
    onChunk: (delta: string, type?: string, metadata?: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    extraInputs?: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<void> {
    const config = getApiConfig(functionId)
    if (!config) {
      throw new Error(`未找到功能ID: ${functionId} 的API配置`)
    }

    try {
      const inputs = {
        ...config.inputs(query),
        ...extraInputs,
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          Authorization: config.auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs,
          response_mode: 'streaming',
          user: 'abc-123',
        } as ApiRequestBody),
        signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        if (isAuthExpiredResponse(errorText, response.status)) {
          handleAuthExpired()
        }
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          // 处理标准 SSE 格式 (data: {...})
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()

            if (data === '[DONE]') {
              onComplete()
              return
            }

            try {
              const parsed = JSON.parse(data)

              // 尝试多种可能的字段路径，包括直接访问 cut
              const delta =
                parsed.event?.text ??
                parsed.answer ??
                parsed.data?.cut ??
                parsed.cut ??
                parsed.data?.text ??
                parsed.text ??
                parsed.result ??
                ''
              const eventType = parsed.event?.type ?? 'message'

              if (delta) {
                onChunk(delta, eventType, parsed)
              }
            } catch {
              // 解析失败，跳过
            }
          } else {
            // 处理非标准格式：直接解析整行为 JSON
            try {
              const parsed = JSON.parse(line)

              // 尝试从根对象直接获取 cut 字段
              const delta = parsed.cut ?? parsed.text ?? parsed.content ?? parsed.answer ?? ''

              if (delta) {
                onChunk(delta, 'message', parsed)
              }
            } catch {
              // 不是 JSON，跳过
            }
          }
        }
      }

      onComplete()
    } catch (error) {
      onError(error as Error)
      throw error
    }
  },

  // 获取所有可用的功能API列表
  getAvailableFunctions(): Array<{ id: string; label: string }> {
    return Object.values(functionApiConfigs)
      .filter((config) => !config.hidden)
      .map((config) => ({
        id: config.id,
        label: config.label,
      }))
  },
}
