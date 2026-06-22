import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, HistoryItem, PersonProfile } from '@/types/chat'
import { chatServices } from '@/api/chat'
import { applyStreamChunk, resetToolCallId } from '@/utils/streamChunkProcessor'
import { getPersonProfileParser, resetPersonProfileParser } from '@/utils/personProfileParser'
import { ElMessage } from 'element-plus'
import {
  saveConversation,
  getConversationList,
  getConversation,
  deleteConversation,
  updateConversation,
} from '@/utils/historyChatList'

export const useChatStore = defineStore('chat', () => {
  // 状态
  const messages = ref<Message[]>([])
  const isTyping = ref(false)
  const isStreaming = ref(false) // ✅ 新增：是否正在进行流式传输（控制发送按钮图标）
  const streamTick = ref(0) // 每收到一个 chunk 就 +1，供组件 watch 触发动画
  const isCompleteChat = ref(true)
  const currentHistoryId = ref<string | null>(null)
  const historyList = ref<HistoryItem[]>([])
  const isLoading = ref(false)
  const isHistoryRefreshing = ref(false)
  const error = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)
  // ✅ 记录当前请求类型：'normal' 为普通问答，'function' 为功能 API
  const currentRequestType = ref<'normal' | 'function'>('normal')

  // 敏感词警告弹窗状态
  const sensitiveWarning = ref<{
    visible: boolean
    message: string
    keywords: string[]
  }>({
    visible: false,
    message: '',
    keywords: [],
  })

  // ✅ 人员档案状态（从流式响应中实时解析）
  const personProfile = ref<PersonProfile | null>(null)
  const isPersonProfileActive = ref(false)

  // ✅ 新增：上传的文件列表
  const uploadedFiles = ref<
    Array<{
      file_id: string
      filename: string
      char_count: number
      preview: string
      status: 'uploading' | 'success' | 'error'

      file?: File // 保存原始文件用于重试
    }>
  >([])

  // ✅ 上传文件
  const uploadFile = async (file: File) => {
    // 检查文件类型
    const allowedExtensions = [
      '.pdf',
      '.docx',
      '.doc',
      '.xlsx',
      '.xls',
      '.csv',
      '.txt',
      '.md',
      '.jpg',
      '.png',
    ]
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

    if (!allowedExtensions.includes(fileExtension)) {
      ElMessage.error('不支持的文件格式，请上传 图片、PDF、Word、Excel、CSV、TXT 或 MD 文件')
      return
    }

    // 先添加到列表，状态为上传中
    const tempFile = {
      file_id: '',
      filename: file.name,
      char_count: 0,
      preview: '',
      status: 'uploading' as const,
      file: file,
    }
    uploadedFiles.value.push(tempFile)

    try {
      const result = await chatServices.uploadFile(file)

      // 更新文件信息
      const index = uploadedFiles.value.findIndex(
        (f) => f.filename === file.name && f.status === 'uploading',
      )
      if (index > -1) {
        uploadedFiles.value[index] = {
          ...result,
          status: 'success',
          file: file,
        }
      }

      ElMessage.success(`文件 "${result.filename}" 上传成功`)
    } catch (error) {
      // 更新状态为错误
      const index = uploadedFiles.value.findIndex(
        (f) => f.filename === file.name && f.status === 'uploading',
      )
      if (index > -1) {
        uploadedFiles.value[index].status = 'error'
      }

      ElMessage.error('文件上传失败，请重试')
    }
  }

  // ✅ 删除上传的文件
  const removeFile = (filename: string) => {
    const index = uploadedFiles.value.findIndex((f) => f.filename === filename)
    if (index === -1) return

    // 仅从本地列表移除，后续问答接口 file_ids 会基于当前列表生成。
    uploadedFiles.value.splice(index, 1)
  }

  // ✅ 重试上传文件
  const retryUploadFile = async (filename: string) => {
    const fileItem = uploadedFiles.value.find(
      (f) => f.filename === filename && f.status === 'error',
    )
    if (!fileItem || !fileItem.file) return

    // 更新状态为上传中
    fileItem.status = 'uploading'

    try {
      const result = await chatServices.uploadFile(fileItem.file)

      // 更新文件信息
      const index = uploadedFiles.value.findIndex((f) => f.filename === filename)
      if (index > -1) {
        uploadedFiles.value[index] = {
          ...result,
          status: 'success',
          file: fileItem.file,
        }
      }
    } catch (error) {
      fileItem.status = 'error'
      ElMessage.error('文件重试上传失败，请检查网络连接')
    }
  }

  // ✅ 新增：添加引用文件（不调用上传接口，直接添加到文件列表）
  const addReferencedFile = (fileInfo: {
    file_id: string
    file_name: string
    file_url: string
  }) => {
    // 检查是否已存在
    const exists = uploadedFiles.value.some((f) => f.file_id === fileInfo.file_id)
    if (exists) {
      ElMessage.warning('该文件已在文件列表中')
      return
    }

    // 生成预览文本（取文件名前20个字符）
    const preview =
      fileInfo.file_name.length > 20
        ? fileInfo.file_name.substring(0, 20) + '...'
        : fileInfo.file_name

    // 添加到文件列表
    uploadedFiles.value.push({
      file_id: fileInfo.file_id,
      filename: fileInfo.file_name,
      char_count: 0, // 引用文件没有字符数统计
      preview: preview,
      status: 'success', // 直接标记为成功
    })

    ElMessage.success(`已添加引用文件: ${fileInfo.file_name}`)
  }

  // ✅ 清空上传的文件列表
  const clearUploadedFiles = () => {
    uploadedFiles.value = []
  }

  // ✅ 设置人员档案数据
  const setPersonProfile = (profile: PersonProfile) => {
    personProfile.value = profile
  }

  // ✅ 清除人员档案
  const clearPersonProfile = () => {
    personProfile.value = null
    isPersonProfileActive.value = false
    resetPersonProfileParser()
  }

  // ✅ 激活/停用人员档案检测
  const setPersonProfileActive = (active: boolean) => {
    isPersonProfileActive.value = active
  }

  // ✅ 新增：对话缓存池 - 存储所有对话状态
  const chatCache = new Map<
    string,
    {
      messages: Message[]
      currentUser: string
      isTyping: boolean
      isStreaming: boolean
      isCompleteChat: boolean
      abortController: AbortController | null
      currentRequestType: 'normal' | 'function'
      inputContent?: string
    }
  >()

  // ✅ 新增：临时输入内容缓存（按对话 ID）
  const tempInputs = new Map<string, string>()

  // ✅ 获取当前对话的缓存数据
  const getCurrentChatState = () => {
    if (!currentHistoryId.value) return null

    return {
      messages: messages.value,
      currentUser: currentUser.value,
      isTyping: isTyping.value,
      isStreaming: isStreaming.value,
      isCompleteChat: isCompleteChat.value,
      abortController: abortController.value,
      currentRequestType: currentRequestType.value,
    }
  }

  const isActiveHistory = (historyId: string) => currentHistoryId.value === historyId

  const updateCachedChatState = (
    historyId: string,
    partial: Partial<{
      messages: Message[]
      currentUser: string
      isTyping: boolean
      isStreaming: boolean
      isCompleteChat: boolean
      abortController: AbortController | null
      currentRequestType: 'normal' | 'function'
    }>,
  ) => {
    const cached = chatCache.get(historyId)
    if (cached) {
      Object.assign(cached, partial)
    }

    if (isActiveHistory(historyId)) {
      if (partial.messages) messages.value = partial.messages
      if (partial.currentUser !== undefined) currentUser.value = partial.currentUser
      if (partial.isTyping !== undefined) isTyping.value = partial.isTyping
      if (partial.isStreaming !== undefined) isStreaming.value = partial.isStreaming
      if (partial.isCompleteChat !== undefined) isCompleteChat.value = partial.isCompleteChat
      if (partial.abortController !== undefined) abortController.value = partial.abortController
      if (partial.currentRequestType !== undefined)
        currentRequestType.value = partial.currentRequestType
    }
  }

  // ✅ 保存当前对话到缓存池
  const saveCurrentChatToCache = () => {
    if (!currentHistoryId.value) return

    const state = getCurrentChatState()
    if (state) {
      chatCache.set(currentHistoryId.value, state)
    }
  }

  // ✅ 从缓存池恢复对话
  const restoreChatFromCache = (historyId: string): boolean => {
    const cached = chatCache.get(historyId)
    if (cached) {
      messages.value = cached.messages
      currentUser.value = cached.currentUser
      isTyping.value = cached.isTyping
      isStreaming.value = cached.isStreaming
      isCompleteChat.value = cached.isCompleteChat
      abortController.value = cached.abortController
      currentRequestType.value = cached.currentRequestType
      currentHistoryId.value = historyId
      return true
    }
    return false
  }

  // ✅ 从缓存池移除对话
  const removeChatFromCache = (historyId: string) => {
    chatCache.delete(historyId)
  }

  // ✅ 动态 user 标识
  const currentUser = ref<string>('')

  // ✅ 生成 user 标识
  const generateUser = () => {
    currentUser.value = `user-${Date.now()}`
    return currentUser.value
  }

  // ✅ 获取 user（为空时自动生成）
  const getUser = () => {
    if (!currentUser.value) {
      return generateUser()
    }
    return currentUser.value
  }

  // ✅ 生成对话标题
  const generateTitle = () => {
    const firstUserMsg = messages.value.find((m) => m.role === 'user')
    if (firstUserMsg) {
      return firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
    }
    return '新对话'
  }

  // 计算属性
  const generateTitleFromMessages = (messageList: Message[]) => {
    const firstUserMsg = messageList.find((m) => m.role === 'user')
    if (firstUserMsg) {
      return firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
    }
    return '新对话'
  }

  const createHistoryId = () => {
    return getUser()
  }

  const saveConversationSnapshot = async (
    _historyId: string,
    _user: string,
    messageList: Message[],
  ) => {
    if (messageList.length === 0) return
    const now = Date.now()
    await saveConversation({
      id: historyId,
      user,
      title: generateTitleFromMessages(messageList),
      messages: messageList,
      createdAt: now,
      updatedAt: now,
    })
    await refreshHistoryList()
  }

  const hasMessages = computed(() => messages.value.length > 0)

  // ✅ 停止流式传输
  const stopStreaming = () => {
    try {
      if (abortController.value) {
        const stoppedHistoryId = currentHistoryId.value
        abortController.value.abort()
        abortController.value = null
        isTyping.value = false
        isStreaming.value = false
        isCompleteChat.value = true

        // ✅ 停止流式传输时清除人员档案激活状态
        isPersonProfileActive.value = false

        // 仅普通问答需要通知后端停止流式传输
        if (currentRequestType.value === 'normal' && stoppedHistoryId) {
          chatServices.abortSession(stoppedHistoryId).catch(() => {})
        }

        // 重置请求类型
        currentRequestType.value = 'normal'
        if (stoppedHistoryId) {
          updateCachedChatState(stoppedHistoryId, {
            isTyping: false,
            isStreaming: false,
            isCompleteChat: true,
            abortController: null,
            currentRequestType: 'normal',
          })
        }
      }
    } catch {
      // 即使出错也要重置状态
      isTyping.value = false
      isStreaming.value = false // ✅ 重置流式传输状态
      isCompleteChat.value = true
      abortController.value = null
      currentRequestType.value = 'normal'
    }
  }

  // ✅ 发送消息 - 智能处理不同类型
  const sendMessage = async (
    content: string,
    onContentUpdate?: () => void,
    options: {
      apiContent?: string
      skill?: Message['skill']
      skills?: Message['skills']
      modelName?: string | null
    } = {},
  ) => {

    if (!content.trim()) return
    isCompleteChat.value = false

    // ✅ 每次发消息都初始化解析器，由解析器通过内容模式匹配判断是否为人员档案
    resetPersonProfileParser()
    clearPersonProfile()

    // ✅ 标记为普通问答
    currentRequestType.value = 'normal'

    // ✅ 创建中止控制器
    abortController.value = new AbortController()

    const user = getUser()

    // ✅ 关键修复：确保有 currentHistoryId
    if (!currentHistoryId.value) {
      currentHistoryId.value = createHistoryId()
    }

    // ✅ 如果是新对话的第一条消息，先保存到数据库并刷新历史列表
    const requestHistoryId = currentHistoryId.value as string
    const targetMessages = messages.value
    const requestController = abortController.value

    if (messages.value.length === 0) {
      try {
        const now = Date.now()
        await saveConversation({
          id: currentHistoryId.value,
          user,
          title: content,
          messages: [],
          createdAt: now,
          updatedAt: now,
        })
        // 立即刷新历史列表，让新对话出现在右侧
        await refreshHistoryList()
      } catch (err) {
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      skill: options.skill,
      skills: options.skills,
      files: uploadedFiles.value
        .filter((f) => f.status === 'success')
        .map((f) => ({
          file_id: f.file_id,
          filename: f.filename,
          char_count: f.char_count,
          preview: f.preview,
          size: f.file?.size || 0,
        })),
    }

    messages.value.push(userMessage)
    isTyping.value = true
    isStreaming.value = true // ✅ 标记为正在流式传输
    error.value = null

    // ✅ 在调用API前保存文件ID列表（仅包含成功上传的文件）
    const fileIds = uploadedFiles.value
      .filter((f) => f.status === 'success' && f.file_id)
      .map((f) => f.file_id)

    const assistantMessageId = (Date.now() + 1).toString()
    let isFirstChunk = true

    // ✅ 初始化消息结构
    messages.value.push({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      contentBlocks: [],
      toolCallGroups: [],
      thinkingBlocks: [],
      processTextBlocks: [],
      timestamp: Date.now(),
    })

    saveCurrentChatToCache()

    try {
      await chatServices.sendMessageStream(
        options.apiContent || content,
        requestHistoryId,
        fileIds,
        options.modelName ?? null,
        (text, type, metadata) => {
          // 支持中止
          if (requestController?.signal?.aborted) return

          const msgIndex = targetMessages.findIndex((m) => m.id === assistantMessageId)
          if (msgIndex === -1) return

          const msg = targetMessages[msgIndex]
          applyStreamChunk(msg, text, type || 'text', metadata)
          streamTick.value++

          if (isActiveHistory(requestHistoryId)) {
            onContentUpdate?.()
          }

          // 检查人员档案
          if (!isPersonProfileActive.value) {
            const parser = getPersonProfileParser()
            const profile = parser.feed(text)
            if (profile) {
              setPersonProfile(profile)
              setPersonProfileActive(true)
            }
          }
        },
        () => {
          // onComplete - 保存对话快照
          isPersonProfileActive.value = false
          saveConversationSnapshot(requestHistoryId, user, targetMessages).catch((err) => {})
        },
        (err) => {
          // 流式过程中的错误（非 AbortError）会在外层 catch 处理
          throw err
        },
        undefined, // onBehaviorSensitive
        requestController?.signal,
      )

      // 流式完成后的清理
      updateCachedChatState(requestHistoryId, {
        isTyping: false,
        isStreaming: false,
        isCompleteChat: true,
        abortController: null,
        currentRequestType: 'normal',
      })
    } catch (err) {
      // ✅ 检查是否是用户主动中止的请求
      if (err instanceof Error && err.name === 'AbortError') {
        updateCachedChatState(requestHistoryId, {
          isTyping: false,
          isStreaming: false,
          isCompleteChat: true,
          abortController: null,
          currentRequestType: 'normal',
        })
        return
      }

      // ✅ 在助手消息中显示错误提示
      const msgIndex = targetMessages.findIndex((m) => m.id === assistantMessageId)
      if (msgIndex !== -1) {
        const errorMsg = `抱歉，请求失败：${err instanceof Error ? err.message : '未知错误'}`
        targetMessages[msgIndex].content = errorMsg
      }

      error.value = err instanceof Error ? err.message : '请求失败'
      updateCachedChatState(requestHistoryId, {
        isTyping: false,
        isStreaming: false,
        isCompleteChat: true,
        abortController: null,
        currentRequestType: 'normal',
      })
    }
  }
  const autoSaveConversation = async () => {
    // ✅ 修改条件：只要有消息就保存，不强制要求 currentHistoryId
    if (messages.value.length === 0) {
      return
    }

    // ✅ 如果没有 currentHistoryId，先生成一个
    if (!currentHistoryId.value) {
      currentHistoryId.value = createHistoryId()
    }

    try {
      const title = generateTitle()
      const user = getUser()
      const now = Date.now()
      await saveConversation({
        id: currentHistoryId.value,
        user,
        title,
        messages: messages.value,
        createdAt: now,
        updatedAt: now,
      })
      await refreshHistoryList()
    } catch (err) {
    }
  }
  const saveAndClearMessages = async () => {
    if (messages.value.length > 0) {
      isLoading.value = true
      try {
        const title = generateTitle()
        const user = getUser()
        const now = Date.now()
        await saveConversation({
          id: currentHistoryId.value || createHistoryId(),
          user,
          title,
          messages: messages.value,
          createdAt: now,
          updatedAt: now,
        })
        ElMessage.success('对话已保存')
        if (currentHistoryId.value && !isStreaming.value) {
          removeChatFromCache(currentHistoryId.value)
        }
      } catch (err) {
        ElMessage.error('保存失败')
      } finally {
        isLoading.value = false
      }
    }

    clearMessages()
  }

  // 清空当前对话
  const clearMessages = () => {
    messages.value = []
    isTyping.value = false
    isCompleteChat.value = true
    currentHistoryId.value = null
    error.value = null
    generateUser()
    currentHistoryId.value = createHistoryId()
    clearUploadedFiles() // 清空上传的文件列表
    clearPersonProfile() // 清空人员档案

    // ✅ 清理流式请求状态
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    currentRequestType.value = 'normal'
  }

  // 刷新历史列表
  const refreshHistoryList = async () => {
    isLoading.value = true
    isHistoryRefreshing.value = true
    try {
      const list = await getConversationList({ limit: 20 })
      historyList.value = list.map((item: any) => {
        const ts = item.updatedAt ? new Date(item.updatedAt) : new Date()
        const month = String(ts.getMonth() + 1).padStart(2, '0')
        const day = String(ts.getDate()).padStart(2, '0')
        const hours = String(ts.getHours()).padStart(2, '0')
        const minutes = String(ts.getMinutes()).padStart(2, '0')
        const formattedDate = `${month}月${day}日 ${hours}:${minutes}`
        return {
          id: item.id,
          title: item.title,
          date: item.displayTime || formattedDate,
          user: item.user,
          messageCount: item.messages?.length || 0,
        }
      })
    } catch (err) {
      historyList.value = []
    } finally {
      isLoading.value = false
      isHistoryRefreshing.value = false
    }
  }

  // ✅ 加载历史对话 - 支持随意切换
  const loadHistory = async (history: HistoryItem) => {
    if (!history?.id) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      // ✅ 关键修复：先停止当前正在进行的流式请求
      if (isTyping.value || isStreaming.value) {

        // ✅ 保存当前进行中的对话到缓存和数据库
        if (messages.value.length > 0 && currentHistoryId.value) {
          saveCurrentChatToCache()
        }
      }

      // ✅ 1. 先保存当前对话到缓存池
      if (currentHistoryId.value && messages.value.length > 0) {
        saveCurrentChatToCache()
      }

      // ✅ 2. 尝试从缓存池恢复目标对话
      const restoredFromCache = restoreChatFromCache(history.id)

      if (restoredFromCache) {

        // ✅ 检查是否有被中断的消息，给予提示
        const targetMessages = chatCache.get(history.id)?.messages || []
        const interruptedMsg = targetMessages.find((m: any) => m.isInterrupted)
        if (interruptedMsg) {
          ElMessage.info({
            message: '此对话之前被中断，您可以点击"重新生成"继续',
            duration: 3000,
          })
        }

        return
      }

      // 3. 从后端 API 加载
      const data = await getConversation(history.id)
      if (data) {
        messages.value = data.messages || []
        currentHistoryId.value = history.id
        // 同步到缓存
        chatCache.set(history.id, {
          messages: data.messages || [],
          currentUser: currentUser.value,
          isTyping: false,
          isStreaming: false,
          isCompleteChat: true,
          abortController: null,
          currentRequestType: 'normal',
        })
        return
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载失败'
      error.value = errorMessage

      ElMessage.error(errorMessage)
    } finally {
      isLoading.value = false

    }
  }
  // 创建新对话
  const createNewChat = async () => {
    if (
      messages.value.length === 0 &&
      uploadedFiles.value.length === 0 &&
      !isTyping.value &&
      !isStreaming.value
    ) {
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      // ✅ 如果当前有消息，先保存到数据库
      if (messages.value.length > 0) {


        // ✅ 确保有 currentHistoryId
        if (!currentHistoryId.value) {
          currentHistoryId.value = createHistoryId()
        }

        saveCurrentChatToCache()
        await autoSaveConversation()



        // ✅ 从缓存池移除已保存的对话
        if (currentHistoryId.value && !isStreaming.value) {
          removeChatFromCache(currentHistoryId.value)
        }
      }

      // ✅ 创建新的对话 ID
      generateUser()
      const newHistoryId = createHistoryId()
      currentHistoryId.value = newHistoryId
      messages.value = []
      isTyping.value = false
      isStreaming.value = false
      isCompleteChat.value = true
      abortController.value = null
      currentRequestType.value = 'normal'
      clearUploadedFiles() // 清空上传的文件列表

      // ✅ 刷新历史列表（确保显示最新保存的对话）
      await refreshHistoryList()


      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建新对话失败'
      error.value = errorMessage

      return false
    } finally {
      isLoading.value = false
    }
  }

  // 删除历史对话
  const deleteHistory = async (historyId: string) => {
    isLoading.value = true
    try {
      await deleteConversation(historyId)
      await refreshHistoryList()
      if (currentHistoryId.value === historyId) {
        clearMessages()
      }
      removeChatFromCache(historyId)
      ElMessage.success('删除成功')
    } catch (err) {
      ElMessage.error('删除失败')
    } finally {
      isLoading.value = false
    }
  }

  // 重命名历史对话
  const renameHistory = async (historyId: string, newTitle: string) => {
    try {
      await updateConversation({ id: historyId, title: newTitle })
      await refreshHistoryList()
      ElMessage.success('重命名成功')
    } catch (err) {
      ElMessage.error('重命名失败')
    }
  }

  return {
    messages,
    isTyping,
    isStreaming,
    streamTick,
    isCompleteChat,
    currentHistoryId,
    historyList,
    isLoading,
    isHistoryRefreshing,
    error,
    currentUser,
    hasMessages,
    chatCache,
    tempInputs,
    uploadedFiles,
    abortController,
    currentRequestType,
    sendMessage,
    saveAndClearMessages,
    autoSaveConversation,
    refreshHistoryList,
    loadHistory,
    createNewChat,
    clearMessages,
    deleteHistory,
    renameHistory,
    generateUser,
    getUser,
    saveCurrentChatToCache,
    restoreChatFromCache,
    stopStreaming,
    uploadFile,
    removeFile,
    retryUploadFile,
    addReferencedFile, // ✅ 新增：添加引用文件方法
    clearUploadedFiles,
    sensitiveWarning,
    personProfile,
    isPersonProfileActive,
    setPersonProfile,
    clearPersonProfile,
    setPersonProfileActive,
  }
})
