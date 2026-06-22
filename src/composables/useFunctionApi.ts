// src/composables/useFunctionApi.ts

import { useChatStore } from '@/stores/chat'
import { chatServices } from '@/api/chat'
import { functionApiServices } from '@/api/functionApiServices'
import { extractDateRange } from '@/utils/dateParser'
import type { Message } from '@/types/chat'
import { ElMessage } from 'element-plus'

/**
 * 功能 API 处理组合式函数
 *
 * 提供值班要情和专题分析的专用处理逻辑，包括：
 * - 消息构建与状态管理
 * - 时间范围提取（本地解析 + AI 接口降级）
 * - API 调用与流式响应处理
 * - 错误处理与回退机制
 */
export function useFunctionApi() {
  const chatStore = useChatStore()

  /**
   * 构建用户消息对象
   */
  function buildUserMessage(query: string): Message {
    return {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
      files: chatStore.uploadedFiles
        .filter((f) => f.status === 'success')
        .map((f) => ({
          file_id: f.file_id,
          filename: f.filename,
          char_count: f.char_count,
          preview: f.preview,
          size: f.file?.size || 0,
        })),
    }
  }

  /**
   * 创建助手消息占位符并返回 ID
   */
  function createAssistantPlaceholder(): string {
    const assistantMessageId = (Date.now() + 1).toString()
    chatStore.messages.push({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    })
    return assistantMessageId
  }

  /**
   * 清理失败的消息
   */
  function cleanupFailedMessages(query: string): void {
    const lastUserIndex = chatStore.messages.findLastIndex(
      (m) => m.role === 'user' && m.content === query,
    )
    const lastAssistantIndex = chatStore.messages.findLastIndex((m) => m.role === 'assistant')

    if (lastUserIndex !== -1) {
      chatStore.messages.splice(lastUserIndex, 1)
    }
    if (lastAssistantIndex !== -1) {
      chatStore.messages.splice(lastAssistantIndex, 1)
    }
  }

  /**
   * 提取时间范围：优先本地解析，失败后调用 AI 接口
   */
  async function extractTimeWithFallback(query: string): Promise<{ start: string; end: string }> {
    // 先尝试本地解析
    let dateRange = extractDateRange(query)

    if (!dateRange) {

      const aiTimeResult = await chatServices.extractTimeByAPI(query)

      if (aiTimeResult) {
        dateRange = {
          start: aiTimeResult.startTime,
          end: aiTimeResult.endTime,
        }

      } else {
        throw new Error('无法提取时间信息，请使用明确的时间描述（如：本月、上周、2024年1月等）')
      }
    }

    return dateRange
  }

  /**
   * 将日期格式从 YYYY-MM-DD 转换为 YYYYMMDD
   * @param dateStr - 日期字符串，格式为 YYYY-MM-DD
   * @returns 转换后的日期字符串，格式为 YYYYMMDD
   */
  const formatDateToCompact = (dateStr: string): string => {
    return dateStr.replace(/-/g, '')
  }

  /**
   * 处理值班要情请求（zbyq）
   *
   * @param query - 用户查询内容
   */
  const handleZbyqRequest = async (query: string) => {
    try {
      // 构建并添加用户消息
      const userMessage = buildUserMessage(query)
      chatStore.messages.push(userMessage)
      chatStore.clearUploadedFiles()

      // 创建助手消息占位符
      const assistantMessageId = createAssistantPlaceholder()

      // ✅ 设置 isTyping 和 isStreaming 状态为 true
      chatStore.isTyping = true
      chatStore.isStreaming = true

      // ✅ 标记是否已收到第一条数据
      let hasReceivedFirstChunk = false

      // ✅ 创建中止控制器
      const controller = new AbortController()
      chatStore.abortController = controller
      chatStore.currentRequestType = 'function'
      // 提取时间范围
      const dateRange = await extractTimeWithFallback(query)

      // ✅ 将日期格式转换为 YYYYMMDD
      const formattedStartDate = formatDateToCompact(dateRange.start)


      // 调用值班要情 API
      await functionApiServices.callFunctionApi(
        'zbyq',
        formattedStartDate,  // ✅ 使用转换后的日期格式
        (delta: string) => {
          const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
          if (msgIndex !== -1) {
            chatStore.messages[msgIndex].content += delta

            // ✅ 收到可渲染数据后，隐藏 typing-indicator（但保持 isStreaming = true）
            if (!hasReceivedFirstChunk && delta.trim()) {
              hasReceivedFirstChunk = true
              chatStore.isTyping = false // 只隐藏三个点动画

            }
          }
        },
        () => {

          // ✅ 确保 isTyping 和 isStreaming 已重置（如果还没收到数据，这里也会重置）
          if (!hasReceivedFirstChunk) {
            chatStore.isTyping = false
          }
          chatStore.isStreaming = false // ✅ 重置流式传输状态
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal' // ✅ 重置请求类型
        },
        (error: Error) => {

          // ✅ 重置 isTyping 和 isStreaming 状态
          chatStore.isTyping = false
          chatStore.isStreaming = false // ✅ 重置流式传输状态
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal' // ✅ 重置请求类型

          // ✅ 在助手消息中显示错误提示（如果不是用户主动中止）
          if (error.name !== 'AbortError') {
            const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
            if (msgIndex !== -1) {
              const errorMsg = `抱歉，值班要情查询失败：${error.message || '未知错误'}`
              chatStore.messages[msgIndex].content = errorMsg

            }
          } else {
            throw error
          }
        },
        undefined,
        controller.signal,
      )
    } catch (err) {

      // ✅ 异常时也要重置 isTyping 和 isStreaming 状态
      chatStore.isTyping = false
      chatStore.isStreaming = false // ✅ 重置流式传输状态

      // ✅ 在助手消息中显示错误提示（如果不是用户主动中止）
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMsg = `抱歉，值班要情查询失败：${err.message || '未知错误'}`

        // 查找并更新助手消息
        const lastAssistantIndex = chatStore.messages.findLastIndex((m) => m.role === 'assistant')
        if (lastAssistantIndex !== -1) {
          chatStore.messages[lastAssistantIndex].content = errorMsg

        }

        ElMessage.error(err.message || '值班要情请求处理失败')
      }
    }
  }

  /**
   * 处理线索统计请求（xstj）
   *
   * @param query - 用户查询内容
   */
  const handleXstjRequest = async (query: string) => {
    try {
      // 构建并添加用户消息
      const userMessage = buildUserMessage(query)
      chatStore.messages.push(userMessage)
      chatStore.clearUploadedFiles()

      // 创建助手消息占位符
      const assistantMessageId = createAssistantPlaceholder()

      // ✅ 设置 isTyping 和 isStreaming 状态为 true
      chatStore.isTyping = true
      chatStore.isStreaming = true

      // ✅ 标记是否已收到第一条数据
      let hasReceivedFirstChunk = false

      // ✅ 创建中止控制器
      const controller = new AbortController()
      chatStore.abortController = controller
      chatStore.currentRequestType = 'function'



      await functionApiServices.callFunctionApi(
        'xstj',
        query,
        (delta: string) => {


          const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
          if (msgIndex !== -1) {
            chatStore.messages[msgIndex].content += delta

            // ✅ 收到可渲染数据后，隐藏 typing-indicator
            if (!hasReceivedFirstChunk && delta.trim()) {
              hasReceivedFirstChunk = true
              chatStore.isTyping = false

            }
          }
        },
        () => {

          if (!hasReceivedFirstChunk) {
            chatStore.isTyping = false
          }
          chatStore.isStreaming = false
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal'
        },
        (error: Error) => {

          chatStore.isTyping = false
          chatStore.isStreaming = false
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal'

          if (error.name !== 'AbortError') {
            const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
            if (msgIndex !== -1) {
              const errorMsg = `抱歉，线索统计分析查询失败：${error.message || '未知错误'}`
              chatStore.messages[msgIndex].content = errorMsg
            }
          } else {
            throw error
          }
        },
        undefined,
        controller.signal,
      )


    } catch (err) {

      chatStore.isTyping = false
      chatStore.isStreaming = false

      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMsg = `抱歉，线索统计分析查询失败：${err.message || '未知错误'}`
        const lastAssistantIndex = chatStore.messages.findLastIndex((m) => m.role === 'assistant')
        if (lastAssistantIndex !== -1) {
          chatStore.messages[lastAssistantIndex].content = errorMsg
        }
        ElMessage.error(err.message || '线索统计请求处理失败')
      }
    }
  }

  /**
   * 处理两欠/安全稳定专题分析请求（ztfx）
   *
   * @param query - 用户查询内容
   */
  const handleZtfxRequest = async (query: string) => {
    try {
      // 构建并添加用户消息
      const userMessage = buildUserMessage(query)
      chatStore.messages.push(userMessage)
      chatStore.clearUploadedFiles()

      // 创建助手消息占位符
      const assistantMessageId = createAssistantPlaceholder()

      // ✅ 设置 isTyping 和 isStreaming 状态为 true
      chatStore.isTyping = true
      chatStore.isStreaming = true

      // ✅ 标记是否已收到第一条数据
      let hasReceivedFirstChunk = false

      // ✅ 创建中止控制器
      const controller = new AbortController()
      chatStore.abortController = controller
      chatStore.currentRequestType = 'function'



      // 调用专题分析 API（ztfx）
      await functionApiServices.callFunctionApi(
        'ztfx',
        query,
        (delta: string) => {
          const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
          if (msgIndex !== -1) {
            chatStore.messages[msgIndex].content += delta

            if (!hasReceivedFirstChunk && delta.trim()) {
              hasReceivedFirstChunk = true
              chatStore.isTyping = false

            }
          }
        },
        () => {

          if (!hasReceivedFirstChunk) {
            chatStore.isTyping = false
          }
          chatStore.isStreaming = false
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal'
        },
        (error: Error) => {

          chatStore.isTyping = false
          chatStore.isStreaming = false
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal'

          if (error.name !== 'AbortError') {
            const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
            if (msgIndex !== -1) {
              const errorMsg = `抱歉，专题分析查询失败：${error.message || '未知错误'}`
              chatStore.messages[msgIndex].content = errorMsg
            }
          } else {
            throw error
          }
        },
        {
          keyword: query,  // ✅ ztfx 接口使用 keyword 参数
        },
        controller.signal,
      )
    } catch (err) {

      chatStore.isTyping = false
      chatStore.isStreaming = false

      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMsg = `抱歉，专题分析查询失败：${err.message || '未知错误'}`
        const lastAssistantIndex = chatStore.messages.findLastIndex((m) => m.role === 'assistant')
        if (lastAssistantIndex !== -1) {
          chatStore.messages[lastAssistantIndex].content = errorMsg
        }
        ElMessage.error(err.message || '专题分析请求处理失败')
      }
    }
  }

  /**
   * 处理群体聚集分析请求（qtjj）
   *
   * @param query - 用户查询内容
   */
  const handleQtjjRequest = async (query: string) => {
    try {
      // 构建并添加用户消息
      const userMessage = buildUserMessage(query)
      chatStore.messages.push(userMessage)
      chatStore.clearUploadedFiles()

      // 创建助手消息占位符
      const assistantMessageId = createAssistantPlaceholder()

      // ✅ 设置 isTyping 和 isStreaming 状态为 true
      chatStore.isTyping = true
      chatStore.isStreaming = true

      // ✅ 标记是否已收到第一条数据
      let hasReceivedFirstChunk = false

      // ✅ 创建中止控制器
      const controller = new AbortController()
      chatStore.abortController = controller
      chatStore.currentRequestType = 'function'



      // 调用群体聚集 API
      await functionApiServices.callFunctionApi(
        'qtjj',
        query,
        (delta: string) => {
          const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
          if (msgIndex !== -1) {
            chatStore.messages[msgIndex].content += delta

            if (!hasReceivedFirstChunk && delta.trim()) {
              hasReceivedFirstChunk = true
              chatStore.isTyping = false

            }
          }
        },
        () => {

          if (!hasReceivedFirstChunk) {
            chatStore.isTyping = false
          }
          chatStore.isStreaming = false
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal'
        },
        (error: Error) => {

          chatStore.isTyping = false
          chatStore.isStreaming = false
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal'

          if (error.name !== 'AbortError') {
            const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
            if (msgIndex !== -1) {
              const errorMsg = `抱歉，群体聚集分析查询失败：${error.message || '未知错误'}`
              chatStore.messages[msgIndex].content = errorMsg
            }
          } else {
            throw error
          }
        },
        {
          message: query,
        },
        controller.signal,
      )
    } catch (err) {

      chatStore.isTyping = false
      chatStore.isStreaming = false

      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMsg = `抱歉，群体聚集分析查询失败：${err.message || '未知错误'}`
        const lastAssistantIndex = chatStore.messages.findLastIndex((m) => m.role === 'assistant')
        if (lastAssistantIndex !== -1) {
          chatStore.messages[lastAssistantIndex].content = errorMsg
        }
        ElMessage.error(err.message || '群体聚集请求处理失败')
      }
    }
  }

  /**
   * 处理形势研判请求（xsyp - 通用形势研判）
   *
   * @param query - 用户查询内容
   */
  const handleXsypRequest = async (query: string) => {
    try {
      // 构建并添加用户消息
      const userMessage = buildUserMessage(query)
      chatStore.messages.push(userMessage)
      chatStore.clearUploadedFiles()

      // 创建助手消息占位符
      const assistantMessageId = createAssistantPlaceholder()

      // ✅ 设置 isTyping 和 isStreaming 状态为 true
      chatStore.isTyping = true
      chatStore.isStreaming = true

      // ✅ 标记是否已收到第一条数据
      let hasReceivedFirstChunk = false

      // ✅ 创建中止控制器
      const controller = new AbortController()
      chatStore.abortController = controller
      chatStore.currentRequestType = 'function'



      // 调用形势研判 API（xsyp）
      await functionApiServices.callFunctionApi(
        'xsyp',
        query,
        (delta: string) => {
          const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
          if (msgIndex !== -1) {
            chatStore.messages[msgIndex].content += delta

            if (!hasReceivedFirstChunk && delta.trim()) {
              hasReceivedFirstChunk = true
              chatStore.isTyping = false

            }
          }
        },
        () => {

          if (!hasReceivedFirstChunk) {
            chatStore.isTyping = false
          }
          chatStore.isStreaming = false
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal'
        },
        (error: Error) => {

          chatStore.isTyping = false
          chatStore.isStreaming = false
          chatStore.abortController = null
          chatStore.currentRequestType = 'normal'

          if (error.name !== 'AbortError') {
            const msgIndex = chatStore.messages.findIndex((m) => m.id === assistantMessageId)
            if (msgIndex !== -1) {
              const errorMsg = `抱歉，形势研判查询失败：${error.message || '未知错误'}`
              chatStore.messages[msgIndex].content = errorMsg
            }
          } else {
            throw error
          }
        },
        {
          keyword: query,  // ✅ xsyp 接口使用 keyword 参数
        },
        controller.signal,
      )
    } catch (err) {

      chatStore.isTyping = false
      chatStore.isStreaming = false

      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMsg = `抱歉，形势研判查询失败：${err.message || '未知错误'}`
        const lastAssistantIndex = chatStore.messages.findLastIndex((m) => m.role === 'assistant')
        if (lastAssistantIndex !== -1) {
          chatStore.messages[lastAssistantIndex].content = errorMsg
        }
        ElMessage.error(err.message || '形势研判请求处理失败')
      }
    }
  }

  return {
    handleZbyqRequest,
    handleZtfxRequest,
    handleQtjjRequest,
    handleXstjRequest,
    handleXsypRequest,
  }
}
