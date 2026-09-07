import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GroupChatContext,
  GroupChatRunStatus,
  HistoryItem,
  Message,
  PersonProfile,
} from '@/types/chat'
import { chatServices } from '@/api/chat'
import {
  MultiAgentApiError,
  multiAgentApi,
  type GroupMessage,
  type GroupSseEvent,
  type GroupTask,
  type RunBundle,
} from '@/api/multiAgent'
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
import { groupChatHistoryApi } from '@/api/groupChatHistory'

interface GroupLiveTask extends GroupTask {
  streamText: string
  modelName?: string
  toolCount: number
  purpose?: string
}

const GROUP_TASK_HISTORY_PREFIX = '__GROUP_TASK_META__:'

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
  const currentRequestType = ref<'normal' | 'function' | 'group'>('normal')
  // 恢复令牌只保存在当前页面内存中，避免进入历史消息或浏览器持久化。
  const groupResumeStates = new Map<string, { runId: string; token: string }>()
  const groupLiveTasks = ref<GroupLiveTask[]>([])

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
      currentRequestType: 'normal' | 'function' | 'group'
      inputContent?: string
    }
  >()
  const chatStateVersion = ref(0)
  const unreadHistoryIds = ref(new Set<string>())

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

  const isHistoryUnread = (historyId: string) => unreadHistoryIds.value.has(historyId)

  const markHistoryUnreadIfInactive = (historyId: string) => {
    if (!isActiveHistory(historyId)) {
      unreadHistoryIds.value = new Set(unreadHistoryIds.value).add(historyId)
    }
  }

  const clearHistoryUnread = (historyId: string) => {
    if (!unreadHistoryIds.value.has(historyId)) return
    const nextUnreadHistoryIds = new Set(unreadHistoryIds.value)
    nextUnreadHistoryIds.delete(historyId)
    unreadHistoryIds.value = nextUnreadHistoryIds
  }

  const isHistoryProcessing = (historyId: string) => {
    // 让缓存会话状态变更也能触发历史列表的提示动画更新。
    chatStateVersion.value
    if (isActiveHistory(historyId)) {
      return isTyping.value || isStreaming.value
    }
    const cached = chatCache.get(historyId)
    return Boolean(cached?.isTyping || cached?.isStreaming)
  }

  const updateCachedChatState = (
    historyId: string,
    partial: Partial<{
      messages: Message[]
      currentUser: string
      isTyping: boolean
      isStreaming: boolean
      isCompleteChat: boolean
      abortController: AbortController | null
      currentRequestType: 'normal' | 'function' | 'group'
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
    chatStateVersion.value++
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
      if (firstUserMsg.groupChat?.name) {
        return `群聊·${firstUserMsg.groupChat.name}`
      }
      return firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
    }
    return '新对话'
  }

  // 计算属性
  const generateTitleFromMessages = (messageList: Message[]) => {
    const firstUserMsg = messageList.find((m) => m.role === 'user')
    if (firstUserMsg) {
      if (firstUserMsg.groupChat?.name) {
        return `群聊·${firstUserMsg.groupChat.name}`
      }
      return firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
    }
    return '新对话'
  }

  const createHistoryId = () => {
    return getUser()
  }

  const saveConversationSnapshot = async (
    historyId: string,
    user: string,
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

  const isVisibleGroupMessage = (message: GroupMessage) =>
    message.message_type !== 'manager_plan' && message.metadata?.visible !== false

  const isConversationGroupMessage = (message: GroupMessage) =>
    isVisibleGroupMessage(message) &&
    !['task_result', 'task_error'].includes(message.message_type)

  const mapGroupMessage = (
    message: GroupMessage,
    groupChat: GroupChatContext,
    runStatus?: GroupChatRunStatus,
  ): Message => ({
    id: message.id,
    role: message.sender_type === 'user' ? 'user' : 'assistant',
    content: message.content,
    timestamp: Number.isNaN(Date.parse(message.created_at))
      ? Date.now()
      : Date.parse(message.created_at),
    groupChat,
    senderName: message.sender_name || undefined,
    groupMessageType: message.message_type,
    groupRunStatus: runStatus,
    groupRunId: message.run_id || undefined,
  })

  const mergeGroupMessages = (
    targetMessages: Message[],
    groupMessages: GroupMessage[],
    groupChat: GroupChatContext,
    runStatus?: GroupChatRunStatus,
  ) => {
    const existingIds = new Set(targetMessages.map((message) => message.id))
    groupMessages
      .filter(isConversationGroupMessage)
      .map((message) => mapGroupMessage(message, groupChat, runStatus))
      .forEach((message) => {
        if (!existingIds.has(message.id)) {
          targetMessages.push(message)
          existingIds.add(message.id)
        }
      })
  }

  const resolveGroupResumeState = async (
    groupId: string,
    targetMessages: Message[],
  ): Promise<{ runId: string; token: string } | undefined> => {
    const cached = groupResumeStates.get(groupId)
    if (cached) return cached

    let waitingRunId: string | undefined
    for (let index = targetMessages.length - 1; index >= 0; index--) {
      const message = targetMessages[index]
      if (
        message?.groupChat?.id === groupId &&
        message.groupRunStatus === 'waiting_user' &&
        message.groupRunId
      ) {
        waitingRunId = message.groupRunId
        break
      }
    }

    if (!waitingRunId) return undefined

    const bundle = await multiAgentApi.getRun(waitingRunId)
    if (bundle.run.status !== 'waiting_user' || !bundle.resume?.token) return undefined

    const resumeState = { runId: bundle.run.id, token: bundle.resume.token }
    groupResumeStates.set(groupId, resumeState)
    return resumeState
  }

  const syncGroupResumeState = (groupId: string, bundle: RunBundle) => {
    if (bundle.run.status === 'waiting_user' && bundle.resume?.token) {
      groupResumeStates.set(groupId, {
        runId: bundle.run.id,
        token: bundle.resume.token,
      })
    } else {
      groupResumeStates.delete(groupId)
    }
  }

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
      officers?: Message['officers']
      mcps?: Message['mcps']
      skill_key?: string[]
      mcp_identifiers?: string[]
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
      officers: options.officers,
      mcps: options.mcps,
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
        // skill_key & mcp_identifiers 附加数据
        {
          ...(options.skill_key?.length ? { skill_key: options.skill_key } : {}),
          ...(options.mcp_identifiers?.length ? { mcp_identifiers: options.mcp_identifiers } : {}),
        },
      )

      // 流式完成后的清理
      updateCachedChatState(requestHistoryId, {
        isTyping: false,
        isStreaming: false,
        isCompleteChat: true,
        abortController: null,
        currentRequestType: 'normal',
      })
      markHistoryUnreadIfInactive(requestHistoryId)
      // 仅在该请求仍是当前会话时更新视图状态，避免覆盖用户切换后的会话状态。
      if (isActiveHistory(requestHistoryId)) {
        isTyping.value = false
        isStreaming.value = false
        isCompleteChat.value = true
      }
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
        markHistoryUnreadIfInactive(requestHistoryId)
        if (isActiveHistory(requestHistoryId)) {
          isTyping.value = false
          isStreaming.value = false
          isCompleteChat.value = true
        }
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
      markHistoryUnreadIfInactive(requestHistoryId)
      if (isActiveHistory(requestHistoryId)) {
        isTyping.value = false
        isStreaming.value = false
        isCompleteChat.value = true
      }
    }
  }

  const sendGroupMessage = async (groupChat: GroupChatContext, content: string) => {
    const normalizedContent = content.trim()
    if (!normalizedContent || isTyping.value || isStreaming.value) return

    isCompleteChat.value = false
    isTyping.value = true
    isStreaming.value = true
    currentRequestType.value = 'group'
    error.value = null
    abortController.value = new AbortController()
    groupLiveTasks.value = []

    const user = getUser()
    if (!currentHistoryId.value) {
      currentHistoryId.value = createHistoryId()
    }

    const requestHistoryId = currentHistoryId.value as string
    const targetMessages = messages.value
    const requestController = abortController.value
    const localMessageId = `group-user-${Date.now()}`
    const pendingMessageId = `group-pending-${Date.now()}`
    const localInsertionIndex = targetMessages.length
    const groupStreamMessageIds = new Map<string, string>()

    if (targetMessages.length === 0 && !groupChat.recordId) {
      try {
        const now = Date.now()
        await saveConversation({
          id: requestHistoryId,
          user,
          title: `群聊·${groupChat.name}`,
          messages: [],
          createdAt: now,
          updatedAt: now,
        })
        await refreshHistoryList()
      } catch {
        // 历史记录保存失败不阻断群聊接口。
      }
    }

    targetMessages.push(
      {
        id: localMessageId,
        role: 'user',
        content: normalizedContent,
        timestamp: Date.now(),
        groupChat,
        groupRunStatus: 'running',
      },
      {
        id: pendingMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        groupChat,
        senderName: groupChat.managerName,
        groupRunStatus: 'running',
      },
    )
    saveCurrentChatToCache()

    const removeLocalMessages = () => {
      for (const id of [localMessageId, pendingMessageId, ...groupStreamMessageIds.values()]) {
        const index = targetMessages.findIndex((message) => message.id === id)
        if (index >= 0) targetMessages.splice(index, 1)
      }
    }

    const finishGroupRequest = () => {
      updateCachedChatState(requestHistoryId, {
        isTyping: false,
        isStreaming: false,
        isCompleteChat: true,
        abortController: null,
        currentRequestType: 'normal',
      })
      markHistoryUnreadIfInactive(requestHistoryId)
      if (isActiveHistory(requestHistoryId)) {
        isTyping.value = false
        isStreaming.value = false
        isCompleteChat.value = true
        abortController.value = null
        currentRequestType.value = 'normal'
      }
    }

    try {
      const resumeState = await resolveGroupResumeState(groupChat.id, targetMessages)
      const handleGroupSseEvent = (event: GroupSseEvent) => {
        const payload =
          event.data && !('run' in event.data)
            ? (event.data as Record<string, unknown>)
            : ({} as Record<string, unknown>)
        const read = <T>(key: string, fallback?: T): T | undefined =>
          (event[key] as T | undefined) ?? (payload[key] as T | undefined) ?? fallback
        const purpose = read<string>('purpose')
        const senderName =
          read<string>('sender_name', read<string>('employee_name', groupChat.managerName)) ||
          groupChat.managerName
        const appendVisibleText = (
          key: string,
          fragment: string,
          messageType: string,
          usePendingMessage = false,
        ) => {
          if (!fragment) return
          let streamMessageId = groupStreamMessageIds.get(key)
          if (!streamMessageId) {
            streamMessageId = usePendingMessage
              ? pendingMessageId
              : `group-stream-${messageType}-${read<string>('task_key', 'message')}-${Date.now()}`
            groupStreamMessageIds.set(key, streamMessageId)
            if (!usePendingMessage) {
              const visibleMessage: Message = {
                id: streamMessageId,
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                groupChat,
                senderName,
                groupMessageType: messageType,
                groupRunStatus: 'running',
              }
              const pendingIndex = targetMessages.findIndex(
                (message) => message.id === pendingMessageId,
              )
              if (messageType === 'task_assignment' && pendingIndex >= 0) {
                targetMessages.splice(pendingIndex, 0, visibleMessage)
              } else {
                targetMessages.push(visibleMessage)
              }
            }
          }
          const streamMessage = targetMessages.find((message) => message.id === streamMessageId)
          if (streamMessage) {
            streamMessage.content += fragment
            streamMessage.senderName = senderName
            streamMessage.groupMessageType = messageType
          }
          streamTick.value++
        }
        if (event.type === 'final') return
        if ((event.type === 'text' || event.type === 'process_text') && purpose === 'final_summary') {
          const fragment = read<string>('sentence', read<string>('text', '')) || ''
          appendVisibleText('final_summary', fragment, 'final', true)
          return
        }
        if (event.type === 'text' && purpose === 'task_assignment') {
          const fragment = read<string>('sentence', read<string>('text', '')) || ''
          const assignmentKey =
            read<string>('task_key') ||
            read<string>('assignee_employee_id', read<string>('assignee_name', 'assignment')) ||
            'assignment'
          appendVisibleText(`task_assignment:${assignmentKey}`, fragment, 'task_assignment')
          return
        }
        const taskKey = read<string>('task_key')
        const compatibilityEmployeeId = read<string>('employee_id')
        const senderEmployeeId = read<string>('sender_employee_id', compatibilityEmployeeId)
        const eventEmployeeName =
          read<string>('sender_name', read<string>('employee_name', '数字警员')) || '数字警员'
        const employeeId =
          event.type === 'task_assignment'
            ? read<string>('assignee_employee_id', compatibilityEmployeeId || senderEmployeeId)
            : senderEmployeeId
        const employeeName =
          event.type === 'task_assignment'
            ? read<string>(
                'assignee_name',
                read<string>('employee_name', eventEmployeeName),
              ) || eventEmployeeName
            : eventEmployeeName
        if (event.type === 'run_started') return
        if (!taskKey && !employeeId) return

        const key = taskKey || `${employeeId}-${read<number>('round_no', 0)}`
        let task = groupLiveTasks.value.find((item) => item.task_key === key)
        if (!task) {
          task = {
            id: read<string>('child_run_id', key) || key,
            run_id: '',
            round_no: read<number>('round_no', 0) || 0,
            task_key: key,
            employee_id: employeeId || '',
            employee_name: employeeName,
            instruction: read<string>('instruction', read<string>('purpose', '执行任务')) || '执行任务',
            depends_on: read<string[]>('depends_on', []) || [],
            status: 'queued',
            result: null,
            error: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            streamText: '',
            toolCount: 0,
            purpose: read<string>('purpose'),
          }
          groupLiveTasks.value.push(task)
          task = groupLiveTasks.value[groupLiveTasks.value.length - 1]
        }

        if (employeeId) task.employee_id = employeeId
        if (employeeName) task.employee_name = employeeName
        const instruction = read<string>('instruction')
        if (instruction) task.instruction = instruction
        const dependsOn = read<string[]>('depends_on')
        if (dependsOn) task.depends_on = dependsOn

        if (event.type === 'task_assignment') task.status = 'queued'
        if (event.type === 'model_text') {
          task.status = 'running'
          task.modelName = read<string>('model_name', read<string>('model'))
        }
        if (event.type === 'text' || event.type === 'process_text') {
          task.status = 'running'
          const fragment = read<string>('sentence', read<string>('text', '')) || ''
          task.streamText = `${task.streamText}${fragment}`
            .replace(/\r\n/g, '\n')
            .replace(/\n[\t ]*\n+/g, '\n')
          if (fragment) streamTick.value++
        }
        if (event.type === 'tool_call') {
          task.status = 'running'
          task.toolCount += 1
        }
        if (event.type === 'task_result') {
          task.status = 'completed'
          task.result = read<string>('text', read<string>('content', task.streamText)) || task.streamText
        }
        if (event.type === 'task_error') {
          task.status = 'failed'
          task.error = read<string>('text', '任务执行失败') || '任务执行失败'
        }
      }
      const bundle: RunBundle = await multiAgentApi.sendGroupMessage(
        groupChat.id,
        normalizedContent,
        {
          resumeToken: resumeState?.token,
          signal: requestController.signal,
          onEvent: handleGroupSseEvent,
        },
      )
      if (requestController.signal.aborted) return

      removeLocalMessages()
      mergeGroupMessages(targetMessages, bundle.messages, groupChat, bundle.run.status)

      syncGroupResumeState(groupChat.id, bundle)
      groupLiveTasks.value = bundle.tasks.map((task) => {
        const live = groupLiveTasks.value.find((item) => item.task_key === task.task_key)
        return {
          ...task,
          streamText: live?.streamText || task.result || '',
          modelName: live?.modelName,
          toolCount: live?.toolCount || 0,
          purpose: live?.purpose,
        }
      })

      if (groupChat.recordId) {
        const managerUid = Number(groupChat.managerEmployeeId)
        const messageWrites = bundle.messages
            .filter(
              (message) =>
                isConversationGroupMessage(message) &&
                (message.sender_employee_id || Number.isFinite(managerUid)),
            )
            .map((message) =>
              groupChatHistoryApi.addChatLog({
                group_id: groupChat.recordId!,
                member_uid: message.sender_employee_id
                  ? Number(message.sender_employee_id)
                  : managerUid,
                member_name:
                  message.sender_type === 'user' ? '用户' : message.sender_name || undefined,
                content: message.content,
                chat_time: message.created_at,
              }),
            )
        const taskWrites = groupLiveTasks.value.flatMap((task) => {
          const employeeUid = Number(task.employee_id)
          const memberUid = Number.isFinite(employeeUid) ? employeeUid : managerUid
          if (!Number.isFinite(memberUid)) return []
          return [
            groupChatHistoryApi.addChatLog({
              group_id: groupChat.recordId!,
              member_uid: memberUid,
              member_name: task.employee_name,
              content: `${GROUP_TASK_HISTORY_PREFIX}${JSON.stringify({
                ...task,
                run_id: bundle.run.id,
              })}`,
            }),
          ]
        })
        await Promise.allSettled(
          [...messageWrites, ...taskWrites],
        )
      }

      const hasUserMessage = bundle.messages.some(
        (message) => isVisibleGroupMessage(message) && message.sender_type === 'user',
      )
      if (!hasUserMessage) {
        targetMessages.splice(localInsertionIndex, 0, {
          id: localMessageId,
          role: 'user',
          content: normalizedContent,
          timestamp: Date.now(),
          groupChat,
          groupRunStatus: bundle.run.status,
          groupRunId: bundle.run.id,
        })
      }

      if (bundle.run.status === 'failed') {
        const hasRunErrorMessage = bundle.messages.some(
          (message) =>
            isVisibleGroupMessage(message) &&
            (message.message_type === 'task_error' || message.content === bundle.run.error),
        )
        if (!hasRunErrorMessage) {
          targetMessages.push({
            id: `group-error-${Date.now()}`,
            role: 'assistant',
            content: bundle.run.error || '本轮群聊执行失败',
            timestamp: Date.now(),
            groupChat,
            senderName: groupChat.managerName,
            groupMessageType: 'task_error',
            groupRunStatus: 'failed',
            groupRunId: bundle.run.id,
          })
        }
        ElMessage.error(bundle.run.error || '本轮群聊执行失败')
      }

      if (!groupChat.recordId) {
        await saveConversationSnapshot(requestHistoryId, user, targetMessages).catch(() => {})
      }
      finishGroupRequest()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        finishGroupRequest()
        return
      }

      removeLocalMessages()
      let recoveredRun: RunBundle | null = null
      try {
        const latestMessages = await multiAgentApi.getGroupMessages(groupChat.id)
        if (err instanceof MultiAgentApiError && err.status === 409) {
          let latestRunId: string | undefined
          for (let index = latestMessages.length - 1; index >= 0; index--) {
            const message = latestMessages[index]
            if (message?.run_id) {
              latestRunId = message.run_id
              break
            }
          }
          if (latestRunId) {
            recoveredRun = await multiAgentApi.getRun(latestRunId)
            syncGroupResumeState(groupChat.id, recoveredRun)
          }
        }
        mergeGroupMessages(
          targetMessages,
          latestMessages,
          groupChat,
          recoveredRun?.run.status,
        )
        if (recoveredRun) {
          mergeGroupMessages(
            targetMessages,
            recoveredRun.messages,
            groupChat,
            recoveredRun.run.status,
          )
        }
      } catch {
        targetMessages.push({
          id: localMessageId,
          role: 'user',
          content: normalizedContent,
          timestamp: Date.now(),
          groupChat,
          groupRunStatus: 'failed',
        })
      }

      const errorMessage = err instanceof Error ? err.message : '群聊请求失败'
      const recoveredStatus = recoveredRun?.run.status
      targetMessages.push({
        id: `group-error-${Date.now()}`,
        role: 'assistant',
        content: `群聊请求失败：${errorMessage}`,
        timestamp: Date.now(),
        groupChat,
        senderName: groupChat.managerName,
        groupMessageType: 'task_error',
        groupRunStatus: recoveredStatus || 'failed',
        groupRunId: recoveredRun?.run.id,
      })
      error.value = errorMessage
      if (!groupChat.recordId) {
        await saveConversationSnapshot(requestHistoryId, user, targetMessages).catch(() => {})
      }
      finishGroupRequest()
      ElMessage.error(errorMessage)
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

  const loadRecordedGroupHistory = async (groupId: number) => {
    isLoading.value = true
    groupLiveTasks.value = []
    try {
      const [detail, logs] = await Promise.all([
        groupChatHistoryApi.detail(groupId),
        groupChatHistoryApi.chatLog(groupId),
      ])
      const roomIdPrefix = 'multi-agent-group-id:'
      const roomId = detail.announcement?.startsWith(roomIdPrefix)
        ? detail.announcement.slice(roomIdPrefix.length).trim()
        : ''
      const fallbackManager = detail.members?.[0]
      const groupChat: GroupChatContext = {
        id: roomId || `record-${groupId}`,
        recordId: groupId,
        name: detail.group_name,
        purpose: detail.remark || detail.announcement || '群聊历史',
        managerEmployeeId: fallbackManager ? String(fallbackManager.member_uid) : '',
        managerName: fallbackManager?.member_nickname || fallbackManager?.member_name || '群成员',
        members: (detail.members || []).map((member) => ({
          id: String(member.member_uid),
          name: member.member_nickname || member.member_name,
          description: member.member_remark,
          isManager: false,
        })),
      }
      const restoredTasks = new Map<string, GroupLiveTask>()
      logs.forEach((log) => {
        if (!log.content.startsWith(GROUP_TASK_HISTORY_PREFIX)) return
        try {
          const task = JSON.parse(log.content.slice(GROUP_TASK_HISTORY_PREFIX.length)) as GroupLiveTask
          if (task.id && task.task_key) restoredTasks.set(task.id, task)
        } catch {
          // 忽略无法解析的旧任务元数据，不影响群聊消息恢复。
        }
      })
      groupLiveTasks.value = Array.from(restoredTasks.values())
      messages.value = logs
        .filter((log) => !log.content.startsWith(GROUP_TASK_HISTORY_PREFIX))
        .map((log) => ({
        id: `group-log-${log.id}`,
        role: log.member_name === '用户' ? ('user' as const) : ('assistant' as const),
        content: log.content,
        timestamp: Number.isNaN(Date.parse(log.chat_time)) ? Date.now() : Date.parse(log.chat_time),
        groupChat,
        senderName: log.member_name,
        groupMessageType: 'history',
        groupRunStatus: 'completed' as const,
        }))
      currentHistoryId.value = `group:${groupId}`
      isTyping.value = false
      isStreaming.value = false
      isCompleteChat.value = true
    } finally {
      isLoading.value = false
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

  // ✅ 完全重置 store（退出登录时调用，防止切换用户后残留上一个用户的数据）
  const resetAll = () => {
    // 中止进行中的请求
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }

    // 清空缓存池和输入缓存
    chatCache.clear()
    groupResumeStates.clear()
    unreadHistoryIds.value = new Set()
    tempInputs.clear()

    // 重置所有 ref 到初始值
    messages.value = []
    historyList.value = []
    isTyping.value = false
    isStreaming.value = false
    streamTick.value = 0
    isCompleteChat.value = true
    currentHistoryId.value = null
    isLoading.value = false
    isHistoryRefreshing.value = false
    error.value = null
    abortController.value = null
    currentRequestType.value = 'normal'
    currentUser.value = ''
    uploadedFiles.value = []
    personProfile.value = null
    isPersonProfileActive.value = false
    sensitiveWarning.value = { visible: false, message: '', keywords: [] }
    historyTotalLoaded.value = 0
    historyHasMore.value = false

    // 重置外部工具状态
    resetToolCallId()
    resetPersonProfileParser()
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

  // 历史列表加载追踪
  const historyTotalLoaded = ref(0)
  const historyHasMore = ref(false)

  // 刷新历史列表（默认加载10条）
  const refreshHistoryList = async (limit = 10) => {
    isLoading.value = true
    isHistoryRefreshing.value = true
    try {
      const list = await getConversationList({ limit })
      historyList.value = list
        .filter((item: any) => !String(item.title || '').startsWith('群聊·'))
        .map((item: any) => {
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
      historyTotalLoaded.value = list.length
      // 返回数量等于请求 limit，说明可能还有更多
      historyHasMore.value = list.length >= limit
    } catch (err) {
      historyList.value = []
      historyTotalLoaded.value = 0
      historyHasMore.value = false
    } finally {
      isLoading.value = false
      isHistoryRefreshing.value = false
    }
  }

  // 加载更多历史记录（在当前基础上多加载20条）
  const loadMoreHistory = async () => {
    const prevCount = historyList.value.length
    const newLimit = prevCount + 20
    isLoading.value = true
    try {
      const list = await getConversationList({ limit: newLimit })
      historyList.value = list
        .filter((item: any) => !String(item.title || '').startsWith('群聊·'))
        .map((item: any) => {
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
      historyTotalLoaded.value = list.length
      // 只要返回数量比之前多了，说明可能还有更多
      historyHasMore.value = list.length > prevCount
    } catch (err) {
      // 加载更多失败时保持现有列表
    } finally {
      isLoading.value = false
    }
  }

  // 收起历史记录（本地裁剪，不重新请求接口，避免刷新闪烁）
  const collapseHistoryList = () => {
    if (historyList.value.length <= 10) return
    historyList.value = historyList.value.slice(0, 10)
    historyTotalLoaded.value = 10
    historyHasMore.value = true
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

        clearHistoryUnread(history.id)
        return
      }

      // 3. 从后端 API 加载
      const data = await getConversation(history.id)
      if (data) {
        messages.value = data.messages || []
        currentHistoryId.value = history.id
        // ✅ 切换对话时重置流式状态，防止上一个对话的流式状态泄漏到当前历史记录
        isTyping.value = false
        isStreaming.value = false
        isCompleteChat.value = true
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
        clearHistoryUnread(history.id)
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
      clearHistoryUnread(historyId)
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
    groupLiveTasks,
    sendMessage,
    sendGroupMessage,
    saveAndClearMessages,
    autoSaveConversation,
    historyTotalLoaded,
    historyHasMore,
    refreshHistoryList,
    loadMoreHistory,
    collapseHistoryList,
    loadHistory,
    loadRecordedGroupHistory,
    createNewChat,
    resetAll,
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
    isHistoryProcessing,
    isHistoryUnread,
  }
})
