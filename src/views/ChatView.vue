<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useSidebarStore } from '@/stores/sidebar'
import {
  ElScrollbar,
  ElInput,
  ElButton,
  ElMessage,
  ElIcon,
  ElTooltip,
  ElPopover,
} from 'element-plus'
import {
  ArrowDown,
  Close,
  CopyDocument,
  Refresh,
  Check,
  Connection,
  ChatDotSquare,
  Delete,
  Edit,
  MoreFilled,
} from '@element-plus/icons-vue'
import type { HistoryItem, Message } from '@/types/chat'
import ActionDialog from '@/components/common/ActionDialog.vue'
import { skillManageApi, type SkillItem as SkillManageItem } from '@/api/skillManage'
import { getModelList, type ModelConfig } from '@/api/modelManagement'
import SmartMessageRenderer from '@/components/chat/SmartMessageRenderer.vue'
import ConversationToc from '@/components/chat/ConversationToc.vue'
import AppendixHistoryPanel from '@/components/chat/AppendixHistoryPanel.vue'
import SensitiveWordDialog from '@/components/chat/SensitiveWordDialog.vue'
import SkillsMarketView from '@/views/SkillsMarketView.vue'
import McpManagementView from '@/views/McpManagementView.vue'
import { listEnabledMcpServices, type McpServiceItem } from '@/api/mcpService'
import { officerApi, type OfficerItem } from '@/api/officer'
import { useScrollManager } from '@/composables/useScrollManager'
import { useLongPress } from '@/composables/useLongPress'
import { isAdminAccount } from '@/utils/auth'

import arrowBottomIcon from '@/assets/icons/chat/icon-chat-arrow-bottom.png'
import iconNavOpen from '@/assets/icons/nav/icon-nav-open.png'
import iconNavHistory from '@/assets/icons/nav/icon-nav-history.png'
import iconNewChat from '@/assets/icons/nav/icon-nav-chat.png'
import './styles/ChatView.css'
import '@/components/layout/GroupedSidebarNav.css'

// Store
const chatStore = useChatStore()
const sidebarStore = useSidebarStore()
const router = useRouter()
const route = useRoute()

// Sidebar — only show on chat (做一做) routes
const isChatView = computed(
  () => !['/skills-market', '/mcp-management'].includes(route.path),
)
const sidebarTooltipProps = {
  placement: 'right' as const,
  trigger: 'hover' as const,
  showArrow: false,
  persistent: false,
  enterable: false,
  hideAfter: 0,
  focusOnTarget: false,
  triggerKeys: [] as string[],
  popperClass: 'grouped-sidebar-tooltip',
} as const

// Sidebar delete dialog
const sidebarDeleteVisible = ref(false)
const sidebarDeleteTargetId = ref<string | null>(null)
const showSidebarDelete = (historyId: string) => {
  sidebarDeleteTargetId.value = historyId
  sidebarDeleteVisible.value = true
}
const handleSidebarDeleteConfirm = async () => {
  if (sidebarDeleteTargetId.value) {
    await chatStore.deleteHistory(sidebarDeleteTargetId.value)
  }
  sidebarDeleteVisible.value = false
  sidebarDeleteTargetId.value = null
}

// Sidebar rename dialog
const sidebarRenameVisible = ref(false)
const sidebarRenameTarget = ref<HistoryItem | null>(null)
const showSidebarRename = (history: HistoryItem) => {
  sidebarRenameTarget.value = history
  sidebarRenameVisible.value = true
}
const handleSidebarRenameConfirm = async (value?: string) => {
  if (
    value &&
    value.trim() &&
    sidebarRenameTarget.value &&
    value.trim() !== sidebarRenameTarget.value.title
  ) {
    await chatStore.renameHistory(sidebarRenameTarget.value.id, value.trim())
  }
  sidebarRenameVisible.value = false
  sidebarRenameTarget.value = null
}

// Sidebar collapsed history popover
const sidebarHistoryPopoverVisible = ref(false)
const handleSidebarHistoryClick = (history: HistoryItem) => {
  sidebarHistoryPopoverVisible.value = false
  handleHistoryClick(history)
}

// Composables
const {
  isUserScrolling,
  isAtBottom,
  checkIsAtBottom,
  handleScroll,
  smartScrollToBottom,
  pauseAutoScroll,
  scrollToBottom,
} = useScrollManager()
const { isLongPressing, longPressId, handleLongPressStart, handleLongPressEnd, showDeleteConfirm } =
  useLongPress({
    delay: 800,
    onDelete: (id) => chatStore.deleteHistory(id),
  })

// Refs
const chatContainer = ref<InstanceType<typeof ElScrollbar> | null>(null)
const inputTextarea = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const appendixHistoryPanelRef = ref<InstanceType<typeof AppendixHistoryPanel> | null>(null)
const currentInput = ref('')
const isInputMultiline = ref(false)
interface SelectedSkill {
  name: string
  description?: string
  category?: string
}
const selectedSkills = ref<SelectedSkill[]>([])
const skillSuggestions = ref<SelectedSkill[]>([])
const skillSuggestVisible = ref(false)
const skillSuggestLoading = ref(false)
const skillMentionQuery = ref('')
const modelPopoverVisible = ref(false)
const modelListLoading = ref(false)
const modelList = ref<ModelConfig[]>([])
const selectedModelName = ref('')
const SELECTED_MODEL_STORAGE_KEY = 'chat:selected_model_name'

// MCP 服务选择
const mcpPopoverVisible = ref(false)
const selectedMcps = ref<McpServiceItem[]>([])
const mcpList = ref<McpServiceItem[]>([])
const mcpListLoading = ref(false)

const loadMcpList = async () => {
  if (mcpList.value.length > 0 || mcpListLoading.value) return
  mcpListLoading.value = true
  try {
    mcpList.value = await listEnabledMcpServices(200)
  } catch {
    // 静默失败，MCP 选择器显示为空
  } finally {
    mcpListLoading.value = false
  }
}
const isMcpSelected = (mcp: McpServiceItem) => selectedMcps.value.some((m) => m.id === mcp.id)
const toggleMcp = (mcp: McpServiceItem) => {
  if (isMcpSelected(mcp)) {
    selectedMcps.value = selectedMcps.value.filter((m) => m.id !== mcp.id)
  } else {
    selectedMcps.value.push(mcp)
  }
}
const removeMcp = (id: number) => {
  selectedMcps.value = selectedMcps.value.filter((m) => m.id !== id)
}

// 数字警员选择
const officerPopoverVisible = ref(false)
const selectedOfficers = ref<OfficerItem[]>([])
const officerList = ref<OfficerItem[]>([])
const officerListLoading = ref(false)

const loadOfficerList = async () => {
  if (officerList.value.length > 0 || officerListLoading.value) return
  officerListLoading.value = true
  try {
    officerList.value = await officerApi.list()
  } catch {
    officerList.value = []
  } finally {
    officerListLoading.value = false
  }
}
const isOfficerSelected = (officer: OfficerItem) =>
  selectedOfficers.value.some((o) => o.id === officer.id)
const toggleOfficer = (officer: OfficerItem) => {
  if (isOfficerSelected(officer)) {
    selectedOfficers.value = selectedOfficers.value.filter((o) => o.id !== officer.id)
  } else {
    selectedOfficers.value.push(officer)
  }
}
const removeOfficer = (id: number) => {
  selectedOfficers.value = selectedOfficers.value.filter((o) => o.id !== id)
}
let skillSearchTimer: number | null = null
let skillSearchRequestId = 0
const messagesAreaRef = ref<HTMLDivElement | null>(null)
const activeMessageId = ref<string | null>(null)
const attachmentDialogVisible = ref(false)

// 发送按钮图标延迟切换
const showStopIcon = ref(false)
let stopIconTimer: number | null = null
watch(
  () => chatStore.isStreaming,
  (val) => {
    if (val) {
      if (stopIconTimer !== null) {
        clearTimeout(stopIconTimer)
        stopIconTimer = null
      }
      showStopIcon.value = true
    } else {
      stopIconTimer = window.setTimeout(() => {
        showStopIcon.value = false
        stopIconTimer = null
      }, 180)
    }
  },
)

// 打字机效果
const welcomeFullText = '今天，有什么新想法？'
const welcomeDisplayedText = ref('')
const welcomeTypingDone = ref(false)
let welcomeTypingTimer: number | null = null

const startWelcomeTyping = () => {
  if (welcomeTypingTimer !== null) {
    window.clearTimeout(welcomeTypingTimer)
  }
  welcomeDisplayedText.value = ''
  welcomeTypingDone.value = false
  let index = 0
  const typeNext = () => {
    if (index < welcomeFullText.length) {
      welcomeDisplayedText.value += welcomeFullText[index]
      index++
      welcomeTypingTimer = window.setTimeout(typeNext, 120)
    } else {
      welcomeTypingDone.value = true
      welcomeTypingTimer = null
    }
  }
  typeNext()
}

const stopWelcomeTyping = () => {
  if (welcomeTypingTimer !== null) {
    window.clearTimeout(welcomeTypingTimer)
    welcomeTypingTimer = null
  }
}

// 当欢迎页重新出现时（新建对话后）重新触发打字机
watch(
  () => chatStore.hasMessages,
  (hasMessages) => {
    if (!hasMessages) {
      startWelcomeTyping()
    } else {
      stopWelcomeTyping()
    }
  },
)

const refreshAppendixHistory = async () => {
  try {
    await appendixHistoryPanelRef.value?.loadAppendixList(1)
  } catch (error) {}
}

let scrollMessageRAF: number | null = null

// 响应式检测
const isMobile = ref(window.innerWidth <= 768)
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
  nextTick(() => requestAnimationFrame(updateChatScrollState))
}
let touchScrollStartY = 0
const markManualScrollIntent = () => {
  pauseAutoScroll()
}
const handleChatWheel = (event: WheelEvent) => {
  if (event.deltaY < 0) {
    markManualScrollIntent()
  }
}
const handleChatTouchStart = (event: TouchEvent) => {
  touchScrollStartY = event.touches[0]?.clientY ?? 0
}
const handleChatTouchMove = (event: TouchEvent) => {
  const currentY = event.touches[0]?.clientY ?? touchScrollStartY
  if (currentY > touchScrollStartY) {
    markManualScrollIntent()
  }
}
const handleChatScrollbarScroll = () => {
  updateChatScrollState()
  updateActiveMessageFromScroll()
}
onMounted(() => {
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const formatUserMessageTime = (timestamp: number) => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const hasInput = computed(() => currentInput.value.trim().length > 0)
const selectedModelLabel = computed(
  () => selectedModelName.value || modelList.value[0]?.name || '暂无模型',
)

const readStoredModelName = () => localStorage.getItem(SELECTED_MODEL_STORAGE_KEY) || ''

const writeStoredModelName = (modelName: string) => {
  if (modelName) {
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, modelName)
  } else {
    localStorage.removeItem(SELECTED_MODEL_STORAGE_KEY)
  }
}

const resolveSelectedModelName = () => {
  const storedModelName = readStoredModelName()
  if (
    storedModelName &&
    (modelList.value.length === 0 ||
      modelList.value.some((model) => model.name === storedModelName))
  ) {
    if (selectedModelName.value !== storedModelName) {
      selectedModelName.value = storedModelName
    }
    return storedModelName
  }
  if (selectedModelName.value) {
    return selectedModelName.value
  }
  const firstModelName = modelList.value[0]?.name || ''
  if (firstModelName) {
    selectedModelName.value = firstModelName
    writeStoredModelName(firstModelName)
  }
  return firstModelName
}

const normalizeSkillItem = (skill: SkillManageItem): SelectedSkill | null => {
  const name = skill.skill_name?.trim()
  if (!name) return null
  return {
    name,
    description: skill.description?.trim() || '',
    category: skill.skill_type || '',
  }
}

const getActiveSkillMention = (content: string) => {
  const match = content.match(/(^|\s)@([^\s@]*)$/)
  if (!match || match.index === undefined) return null
  const leading = match[1] || ''
  return {
    start: match.index + leading.length,
    end: content.length,
    query: match[2] || '',
  }
}

const removeActiveSkillMention = () => {
  const mention = getActiveSkillMention(currentInput.value)
  if (!mention) return
  const before = currentInput.value.slice(0, mention.start)
  const after = currentInput.value.slice(mention.end)
  currentInput.value = `${before}${after}`.replace(/[ \t]{2,}/g, ' ')
}

const applySelectedSkill = (skill: SelectedSkill) => {
  const exists = selectedSkills.value.some((item) => item.name === skill.name)
  if (!exists) {
    selectedSkills.value.push(skill)
  }
  removeActiveSkillMention()
  skillSuggestVisible.value = false
  skillMentionQuery.value = ''
  nextTick(() => {
    inputTextarea.value?.focus()
  })
}

const removeSelectedSkill = (skillName: string) => {
  selectedSkills.value = selectedSkills.value.filter((skill) => skill.name !== skillName)
}

const loadSkillSuggestions = async (query: string) => {
  const requestId = ++skillSearchRequestId
  skillSuggestLoading.value = true
  try {
    const { list } = await skillManageApi.list({ keyword: query || undefined, limit: 5, is_public: true })
    if (requestId !== skillSearchRequestId) return
    const nextSuggestions = list
      .map(normalizeSkillItem)
      .filter((skill): skill is SelectedSkill => !!skill)
      .slice(0, 5)
    skillSuggestions.value = nextSuggestions
    skillSuggestVisible.value = !!getActiveSkillMention(currentInput.value)
    if (query) {
      const exactMatch = nextSuggestions.find((skill) => skill.name === query)
      if (exactMatch) {
        applySelectedSkill(exactMatch)
      }
    }
  } catch (error) {
    if (requestId === skillSearchRequestId) {
      skillSuggestions.value = []
    }
  } finally {
    if (requestId === skillSearchRequestId) {
      skillSuggestLoading.value = false
    }
  }
}

const loadAnswerModels = async () => {
  modelListLoading.value = true
  try {
    modelList.value = await getModelList(isAdminAccount())
    const storedModelName = readStoredModelName()
    if (storedModelName && modelList.value.some((model) => model.name === storedModelName)) {
      selectedModelName.value = storedModelName
    } else if (modelList.value.length > 0) {
      selectedModelName.value = modelList.value[0].name
      writeStoredModelName(selectedModelName.value)
    } else {
      selectedModelName.value = ''
      writeStoredModelName('')
    }
  } catch (error) {
    modelList.value = []
  } finally {
    modelListLoading.value = false
  }
}

const selectAnswerModel = (modelName: string) => {
  selectedModelName.value = modelName
  writeStoredModelName(modelName)
  modelPopoverVisible.value = false
  nextTick(() => {
    inputTextarea.value?.focus()
  })
}

const scheduleSkillSuggestionSearch = (query: string) => {
  if (skillSearchTimer !== null) {
    window.clearTimeout(skillSearchTimer)
  }
  skillSearchTimer = window.setTimeout(
    () => {
      loadSkillSuggestions(query)
    },
    query ? 220 : 0,
  )
}

const syncSkillMentionState = (_value: string) => {
  // 暂时屏蔽 @技能 功能
  skillSuggestVisible.value = false
  skillMentionQuery.value = ''
}

const userMessages = computed(() => {
  return chatStore.messages.filter((msg) => msg.role === 'user')
})

const isChatScrollable = ref(false)
const chatScrollBottomDistance = ref(0)
const SCROLL_TO_BOTTOM_BUTTON_THRESHOLD = 4
const showScrollToBottomButton = computed(
  () =>
    isChatScrollable.value && chatScrollBottomDistance.value > SCROLL_TO_BOTTOM_BUTTON_THRESHOLD,
)

const updateChatScrollState = () => {
  const wrapRef = chatContainer.value?.wrapRef
  if (!wrapRef) {
    isChatScrollable.value = false
    chatScrollBottomDistance.value = 0
    return
  }
  const bottomDistance = Math.max(
    0,
    wrapRef.scrollHeight - wrapRef.scrollTop - wrapRef.clientHeight,
  )
  const atBottom = bottomDistance <= SCROLL_TO_BOTTOM_BUTTON_THRESHOLD
  chatScrollBottomDistance.value = bottomDistance
  isChatScrollable.value = wrapRef.scrollHeight > wrapRef.clientHeight + 1
  isAtBottom.value = atBottom
  isUserScrolling.value = !atBottom
}

const handleScrollToBottomClick = async () => {
  const wrapRef = chatContainer.value?.wrapRef
  if (!wrapRef) return
  wrapRef.scrollTo({
    top: wrapRef.scrollHeight,
    behavior: 'auto',
  })
  isUserScrolling.value = false
  isAtBottom.value = true
  chatScrollBottomDistance.value = 0
  await nextTick()
  requestAnimationFrame(updateChatScrollState)
}

const isLastAssistantMessage = (msg: Message): boolean => {
  if (msg.role !== 'assistant') return false
  const messages = chatStore.messages
  if (messages.length === 0) return false
  const lastAssistantIndex = messages.findLastIndex((m) => m.role === 'assistant')
  return lastAssistantIndex !== -1 && messages[lastAssistantIndex].id === msg.id
}

const scrollToMessage = (id: string) => {
  const element = document.getElementById(`msg-${id}`)
  if (element) {
    activeMessageId.value = id
    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'auto', block: 'start' })
      setTimeout(() => {
        const currentElement = document.getElementById(`msg-${id}`)
        if (currentElement) {
          const container = chatContainer.value?.wrapRef
          if (container) {
            const elementTop = currentElement.offsetTop
            const scrollTop = container.scrollTop
            if (Math.abs(elementTop - scrollTop) > 50) {
              currentElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }
        }
      }, 100)
    })
  }
}

const handleExpandChange = () => {
  const wrapRef = chatContainer.value?.wrapRef
  const shouldKeepBottom = checkIsAtBottom(wrapRef)
  requestAnimationFrame(() => {
    if (shouldKeepBottom) {
      smartScrollToBottom(wrapRef, true)
    }
    updateActiveMessageFromScroll()
  })
}

const getMessageIdFromElement = (element: Element): string | null => {
  return element.id.startsWith('msg-') ? element.id.slice(4) : null
}

const updateActiveMessageFromScroll = () => {
  const wrapRef = chatContainer.value?.wrapRef
  const messagesArea = messagesAreaRef.value
  if (!wrapRef || !messagesArea) return
  const userMsgElements = Array.from(
    messagesArea.querySelectorAll<HTMLElement>('.message-wrapper.user-message'),
  )
  if (userMsgElements.length === 0) {
    activeMessageId.value = null
    return
  }
  const containerRect = wrapRef.getBoundingClientRect()
  const activationLine = containerRect.top + Math.min(wrapRef.clientHeight * 0.35, 180)
  let activeElement = userMsgElements[0]
  for (const element of userMsgElements) {
    if (element.getBoundingClientRect().top <= activationLine) {
      activeElement = element
    } else {
      break
    }
  }
  const id = getMessageIdFromElement(activeElement)
  if (id && activeMessageId.value !== id) {
    activeMessageId.value = id
  }
}

watch(currentInput, (newVal) => {
  syncSkillMentionState(newVal)
  nextTick(() => {
    const el =
      (inputTextarea.value as any)?.textarea ||
      (inputTextarea.value as any)?.$el?.querySelector('textarea')
    if (el) {
      // 用 rAF 确保浏览器完成布局重算，避免 scrollHeight 是旧值
      requestAnimationFrame(() => {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 21
        const paddingTop = parseFloat(getComputedStyle(el).paddingTop) || 10
        const paddingBottom = parseFloat(getComputedStyle(el).paddingBottom) || 10
        const singleLineHeight = lineHeight + paddingTop + paddingBottom
        isInputMultiline.value = el.scrollHeight > singleLineHeight + 2
      })
    }
  })
})

const sendCurrentMessage = async () => {
  const message = currentInput.value.trim()
  const skillsForMessage = selectedSkills.value.map((skill) => ({ ...skill }))
  let apiMessage = message

  // 静默拼接数字警员系统提示词到 query 前面（不展示在用户消息中）
  const officerPrompts = selectedOfficers.value
    .map((o) => {
      const cfg = o.config as Record<string, unknown> | undefined
      return (typeof cfg?.systemPrompt === 'string' && cfg.systemPrompt)
        || (typeof cfg?.prompt === 'string' && cfg.prompt)
        || ''
    })
    .filter(Boolean)
  if (officerPrompts.length > 0) {
    apiMessage = `${officerPrompts.join('\n')}\n${apiMessage}`
  }

  if (message) {
    const uploadingFiles = chatStore.uploadedFiles.filter((f) => f.status === 'uploading')
    if (uploadingFiles.length > 0) {
      ElMessage.warning('请等待文件上传完成后再发送消息')
      return
    }
    const hasSuccessfulAttachments = chatStore.uploadedFiles.some(
      (f) => f.status === 'success' && f.file_id,
    )

    // 收集选中警员的关联技能 + MCP，同时构建展示用数据
    const officersForMessage: Message['officers'] = []
    const skillKeys: string[] = []
    const mcpIdentifiers: string[] = []

    if (selectedOfficers.value.length > 0) {
      const officerResources = await Promise.allSettled(
        selectedOfficers.value.map(o => officerApi.getResources(o.id))
      )
      selectedOfficers.value.forEach((o, i) => {
        const result = officerResources[i]
        const resources = (result?.status === 'fulfilled' ? result.value : []) as any[]
        const skills = resources
          .filter((r: any) => r.resource_type === 'skill')
          .map((r: any) => ({ id: r.resource_id, name: r.resource_name || '' }))
        officersForMessage.push({
          id: o.id,
          officer_name: o.officer_name,
          skills,
        })
        // 从警员资源中收集 skill_key 和 mcp_identifiers
        resources.forEach((r: any) => {
          if (r.resource_type === 'skill') {
            skillKeys.push(String(r.resource_id))
          } else if (r.resource_type === 'mcp') {
            mcpIdentifiers.push(String(r.resource_id))
          }
        })
      })
    }

    // 收集直接选中的 MCP（展示用 + 标识符）
    const mcpsForMessage: Message['mcps'] = selectedMcps.value.map(m => {
      mcpIdentifiers.push(String(m.id))
      return {
        id: m.id,
        service_name: m.service_name,
      }
    })

    currentInput.value = ''
    selectedSkills.value = []
    selectedOfficers.value = []
    selectedMcps.value = []
    skillSuggestVisible.value = false
    await nextTick()

    // 发送新消息时重置滚动状态，确保流式输出能正常自动滚动
    isUserScrolling.value = false
    isAtBottom.value = true
    scrollToBottom(chatContainer.value?.wrapRef)

    await chatStore.sendMessage(message, undefined, {
      apiContent: apiMessage,
      skills: skillsForMessage,
      officers: officersForMessage.length > 0 ? officersForMessage : undefined,
      mcps: mcpsForMessage.length > 0 ? mcpsForMessage : undefined,
      skill_key: [...new Set(skillKeys)],
      mcp_identifiers: [...new Set(mcpIdentifiers)],
      modelName: resolveSelectedModelName() || null,
    })
    await nextTick()
    // 仅在用户未手动向上滚动时才滚动到底部
    if (!isUserScrolling.value) {
      scrollToBottom(chatContainer.value?.wrapRef)
    }

    if (hasSuccessfulAttachments) {
      await refreshAppendixHistory()
    }
  }
}

const handleQuickStart = async (question: string) => {
  // 发送新消息时重置滚动状态，确保流式输出能正常自动滚动
  isUserScrolling.value = false
  isAtBottom.value = true
  scrollToBottom(chatContainer.value?.wrapRef)

  await chatStore.sendMessage(question, undefined, {
    modelName: resolveSelectedModelName() || null,
  })
  await nextTick()
  // 仅在用户未手动向上滚动时才滚动到底部
  if (!isUserScrolling.value) {
    scrollToBottom(chatContainer.value?.wrapRef)
  }
}

const copyMessage = async (msg: any) => {
  try {
    if (!navigator.clipboard) {
      throw new Error('当前浏览器不支持剪贴板 API')
    }
    const textToCopy = String(msg?.content || '')
    await navigator.clipboard.writeText(textToCopy)
    ElMessage.success('已复制到剪贴板')
  } catch (err) {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = String(msg?.content || '')
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success('已复制到剪贴板')
    } catch (fallbackErr) {
      ElMessage.error('复制失败，请手动复制')
    }
  }
}

const regenerateResponse = async (msg: any) => {
  if (msg.role !== 'assistant') return
  const messageIndex = chatStore.messages.findIndex((m) => m.id === msg.id)
  if (messageIndex === -1) return
  let userMessage = null
  for (let i = messageIndex - 1; i >= 0; i--) {
    if (chatStore.messages[i].role === 'user') {
      userMessage = chatStore.messages[i]
      break
    }
  }
  if (userMessage) {
    currentInput.value = userMessage.content
    selectedSkills.value = userMessage.skills?.length
      ? userMessage.skills.map((skill) => ({ ...skill }))
      : userMessage.skill
        ? [{ ...userMessage.skill }]
        : []
    if (userMessage.files && userMessage.files.length > 0) {
    }
    await sendCurrentMessage()
  }
}

// 文件上传
const handleFileUpload = () => {
  fileInput.value?.click()
}

const onFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    await uploadFiles(Array.from(files))
  }
  target.value = ''
}

const getExtensionFromMime = (type: string) => {
  const mimeMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'text/markdown': '.md',
    'text/csv': '.csv',
  }
  return mimeMap[type] || ''
}

/** 格式化文件大小为可读字符串 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 根据文件名获取类型标签 */
const getFileTypeLabel = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    pdf: 'PDF',
    doc: 'DOC',
    docx: 'DOCX',
    xls: 'XLS',
    xlsx: 'XLSX',
    csv: 'CSV',
    txt: 'TXT',
    md: 'MD',
    png: 'IMG',
    jpg: 'IMG',
    jpeg: 'IMG',
    gif: 'IMG',
    webp: 'IMG',
  }
  return map[ext] || ext.toUpperCase() || 'FILE'
}

const normalizePastedFile = (file: File, index: number) => {
  if (file.name && file.name.trim()) {
    return file
  }
  const extension = getExtensionFromMime(file.type) || '.png'
  return new File([file], `pasted-file-${Date.now()}-${index + 1}${extension}`, {
    type: file.type,
    lastModified: file.lastModified,
  })
}

const uploadFiles = async (files: File[]) => {
  if (files.length === 0) return
  const uploadPromises = files.map((file) => chatStore.uploadFile(file))
  await Promise.all(uploadPromises)
}

const handleInputPaste = async (event: ClipboardEvent) => {
  const clipboardItems = Array.from(event.clipboardData?.items || [])
  const pastedFiles = clipboardItems
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file))
    .map(normalizePastedFile)
  if (pastedFiles.length === 0) {
    return
  }
  event.preventDefault()
  await uploadFiles(pastedFiles)
}

const removeFile = async (filename: string) => {
  await chatStore.removeFile(filename)
}

const retryUploadFile = async (filename: string) => {
  await chatStore.retryUploadFile(filename)
}

const handleQuoteAppendix = (item: { file_id: string; file_name: string; file_url: string }) => {
  chatStore.addReferencedFile({
    file_id: item.file_id,
    file_name: item.file_name,
    file_url: item.file_url,
  })
}

const handleHistoryClick = (history: HistoryItem, event?: MouseEvent | TouchEvent) => {
  if (isLongPressing.value || longPressId.value === history.id) {
    longPressId.value = null
    return
  }
  try {
    chatStore
      .loadHistory(history)
      .then(async () => {
        await nextTick()
        if (messageObserver) {
          messageObserver.disconnect()
        }
        const userMessages = chatStore.messages.filter((msg) => msg.role === 'user')
        if (userMessages.length > 0) {
          const lastUserMessage = userMessages[userMessages.length - 1]
          activeMessageId.value = lastUserMessage.id
        } else {
          activeMessageId.value = null
        }
        scrollToBottom(chatContainer.value?.wrapRef)
        await nextTick()
        setTimeout(() => {
          observeMessages()
        }, 300)
      })
      .catch((err: any) => {
        ElMessage.error('切换对话失败')
      })
  } catch (err) {
    ElMessage.error('切换对话失败')
  }
}

const handleNewChat = async () => {
  // 如果当前在嵌入式页面（定时任务/技能库/MCP管理），先回到聊天视图
  if (['/skills-market', '/mcp-management'].includes(route.path)) {
    await router.replace('/')
    await nextTick()
  }
  const created = await chatStore.createNewChat()
  if (!created) return
  currentInput.value = ''
  activeMessageId.value = null
  await nextTick()
  scrollToBottom(chatContainer.value?.wrapRef)
}

onMounted(async () => {
  // 嵌入式页面（技能库/MCP专区/数字警员库）不需要聊天相关初始化
  if (!isChatView.value) return

  inputTextarea.value?.focus()
  loadAnswerModels()
  loadOfficerList()
  loadMcpList()
  // 打字机效果：立即触发，不等待历史列表加载
  if (!chatStore.hasMessages) {
    startWelcomeTyping()
  }

  await chatStore.refreshHistoryList()
  chatStore.generateUser()

  isUserScrolling.value = false
  isAtBottom.value = true

  const wrapRef = chatContainer.value?.wrapRef
  if (wrapRef) {
    const scrollHandler = () => {
      handleScroll(wrapRef)
      updateChatScrollState()
      updateActiveMessageFromScroll()
    }
    wrapRef.addEventListener('scroll', scrollHandler)
    ;(wrapRef as any)._scrollHandler = scrollHandler

    await nextTick()
    scrollToBottom(wrapRef)
    requestAnimationFrame(updateChatScrollState)
    requestAnimationFrame(updateActiveMessageFromScroll)
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  initMessageObserver()
})

let messageObserver: IntersectionObserver | null = null
const initMessageObserver = () => {
  if (!messagesAreaRef.value) return
  const options = {
    root: chatContainer.value?.wrapRef || null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0,
  }
  messageObserver = new IntersectionObserver((entries) => {
    const visibleEntries = entries.filter((entry) => entry.isIntersecting)
    if (visibleEntries.length > 0) {
      const topMostEntry = visibleEntries.reduce((prev, current) => {
        return prev.boundingClientRect.top < current.boundingClientRect.top ? prev : current
      })
      const id = topMostEntry.target.id.replace('msg-', '')
      activeMessageId.value = id
    }
  }, options)
  observeMessages()
}

const observeMessages = () => {
  if (!messageObserver) return
  messageObserver.disconnect()
  const userMsgElements =
    messagesAreaRef.value?.querySelectorAll('.message-wrapper.user-message') || []
  userMsgElements.forEach((el) => {
    messageObserver?.observe(el)
  })
}

watch(
  () => chatStore.messages.length,
  (newLength, oldLength) => {
    nextTick(() => {
      observeMessages()
      const lastUserMessage = userMessages.value[userMessages.value.length - 1]
      if (newLength > oldLength && lastUserMessage) {
        activeMessageId.value = lastUserMessage.id
      } else {
        updateActiveMessageFromScroll()
      }
    })
  },
)

watch(
  () => chatStore.messages,
  (newMessages) => {
    if (newMessages.length > 0) {
      if (scrollMessageRAF) {
        cancelAnimationFrame(scrollMessageRAF)
      }
      scrollMessageRAF = requestAnimationFrame(() => {
        smartScrollToBottom(chatContainer.value?.wrapRef, chatStore.isStreaming)
        requestAnimationFrame(updateChatScrollState)
        requestAnimationFrame(updateActiveMessageFromScroll)
      })
    }
  },
  { deep: true },
)

watch(
  () => chatStore.currentHistoryId,
  (newId, oldId) => {
    if (oldId) {
      chatStore.tempInputs.set(oldId, currentInput.value)
    }
    if (newId) {
      const saved = chatStore.tempInputs.get(newId)
      currentInput.value = saved || ''
    }
  },
)

const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
  if (chatStore.messages.length > 0 && chatStore.currentHistoryId) {
    try {
      await chatStore.autoSaveConversation()
    } catch (err) {}
  }
}

onUnmounted(() => {
  if (skillSearchTimer !== null) {
    window.clearTimeout(skillSearchTimer)
    skillSearchTimer = null
  }
  if (stopIconTimer !== null) {
    clearTimeout(stopIconTimer)
    stopIconTimer = null
  }
  if (welcomeTypingTimer !== null) {
    window.clearTimeout(welcomeTypingTimer)
    welcomeTypingTimer = null
  }
  const wrapRef = chatContainer.value?.wrapRef
  if (wrapRef) {
    const scrollHandler = (wrapRef as any)._scrollHandler
    if (scrollHandler) {
      wrapRef.removeEventListener('scroll', scrollHandler)
      delete (wrapRef as any)._scrollHandler
    }
  }
  if (messageObserver) {
    messageObserver.disconnect()
    messageObserver = null
  }
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (chatStore.messages.length > 0 && chatStore.currentHistoryId) {
    chatStore.autoSaveConversation().catch((err: any) => {})
  }
})
</script>

<template>
  <div class="ai-assistant-app">
    <!-- 侧边栏：仅在做一做（问答）页面显示 -->
    <aside
      v-if="isChatView"
      class="grouped-sidebar"
      :class="{ 'grouped-sidebar--collapsed': sidebarStore.collapsed }"
    >
      <div class="grouped-sidebar__brand">
        <div v-if="!sidebarStore.collapsed" class="grouped-sidebar__brand-copy">
          <div class="grouped-sidebar__title">历史对话</div>
        </div>
        <el-tooltip
          :content="sidebarStore.collapsed ? '展开导航栏' : '收起导航栏'"
          v-bind="sidebarTooltipProps"
        >
          <button
            class="grouped-sidebar__collapse-button"
            type="button"
            :aria-label="sidebarStore.collapsed ? '展开导航栏' : '收起导航栏'"
            @click="sidebarStore.toggleCollapse()"
          >
            <span
              class="grouped-sidebar__collapse-icon"
              :style="{ '--collapse-icon': `url(${iconNavOpen})` }"
              aria-hidden="true"
            ></span>
          </button>
        </el-tooltip>
      </div>

      <div class="grouped-sidebar__qa">
        <!-- 新建对话 -->
        <el-tooltip
          content="新建对话"
          v-bind="sidebarTooltipProps"
          :disabled="!sidebarStore.collapsed"
        >
          <button
            v-if="!chatStore.isHistoryRefreshing"
            class="grouped-sidebar__nav-btn grouped-sidebar__nav-btn--active"
            type="button"
            @click="handleNewChat"
          >
            <span
              class="grouped-sidebar__nav-btn-icon"
              :style="{ '--nav-btn-icon': `url(${iconNewChat})` }"
              aria-hidden="true"
            ></span>
            <span v-if="!sidebarStore.collapsed">新建对话</span>
          </button>
        </el-tooltip>

        <!-- 收起时的历史记录弹窗 -->
        <el-popover
          v-if="sidebarStore.collapsed"
          v-model:visible="sidebarHistoryPopoverVisible"
          placement="right-start"
          trigger="click"
          :width="286"
          :show-arrow="false"
          popper-class="grouped-sidebar-history-popover"
        >
          <div class="grouped-sidebar__history-popover">
            <div class="grouped-sidebar__history-popover-title">对话历史</div>
            <div
              v-if="chatStore.isHistoryRefreshing"
              class="grouped-sidebar__history-popover-empty"
            >
              正在加载...
            </div>
            <el-scrollbar v-else class="grouped-sidebar__history-popover-list">
              <div
                v-for="history in chatStore.historyList"
                :key="history.id"
                class="grouped-sidebar__history-popover-item"
                :class="{
                  'grouped-sidebar__history-popover-item--active':
                    history.id === chatStore.currentHistoryId,
                }"
                @click="handleSidebarHistoryClick(history)"
              >
                <span class="grouped-sidebar__history-icon-circle">
                  <el-icon :size="14"><ChatDotSquare /></el-icon>
                </span>
                <div class="grouped-sidebar__history-popover-copy">
                  <span class="grouped-sidebar__history-popover-name">{{ history.title }}</span>
                </div>
                <el-popover
                  placement="bottom-end"
                  trigger="click"
                  :width="140"
                  :show-arrow="false"
                  popper-class="grouped-sidebar-history-action-popover"
                >
                  <div class="grouped-sidebar__history-action-menu">
                    <button
                      class="grouped-sidebar__history-action-item"
                      type="button"
                      @click.stop="showSidebarRename(history)"
                    >
                      <el-icon><Edit /></el-icon>
                      <span>重命名</span>
                    </button>
                    <button
                      class="grouped-sidebar__history-action-item grouped-sidebar__history-action-item--danger"
                      type="button"
                      @click.stop="showSidebarDelete(history.id)"
                    >
                      <el-icon><Delete /></el-icon>
                      <span>删除</span>
                    </button>
                  </div>
                  <template #reference>
                    <button
                      class="grouped-sidebar__history-popover-more"
                      type="button"
                      aria-label="更多操作"
                      @click.stop
                    >
                      <el-icon><MoreFilled /></el-icon>
                    </button>
                  </template>
                </el-popover>
              </div>
              <div
                v-if="chatStore.historyList.length === 0"
                class="grouped-sidebar__history-popover-empty"
              >
                暂无历史记录
              </div>
            </el-scrollbar>
          </div>
          <template #reference>
            <span class="grouped-sidebar__popover-reference">
              <el-tooltip content="对话历史" v-bind="sidebarTooltipProps">
                <button class="grouped-sidebar__history-trigger" type="button">
                  <span
                    class="grouped-sidebar__history-icon"
                    :style="{ '--history-icon': `url(${iconNavHistory})` }"
                    aria-hidden="true"
                  ></span>
                </button>
              </el-tooltip>
            </span>
          </template>
        </el-popover>

        <!-- 展开时的历史记录列表 -->
        <div
          v-if="!sidebarStore.collapsed && chatStore.isHistoryRefreshing"
          class="grouped-sidebar__history-loading"
          aria-busy="true"
        >
          <div class="grouped-sidebar__history-loading-skeleton">
            <div v-for="index in 4" :key="index" class="grouped-sidebar__history-loading-card">
              <div
                class="grouped-sidebar__history-loading-line grouped-sidebar__history-loading-line--title"
              ></div>
              <div
                class="grouped-sidebar__history-loading-line grouped-sidebar__history-loading-line--meta"
              ></div>
            </div>
          </div>
        </div>
        <el-scrollbar
          v-if="!sidebarStore.collapsed && !chatStore.isHistoryRefreshing"
          class="grouped-sidebar__history"
        >
          <div
            v-for="history in chatStore.historyList"
            :key="history.id"
            class="grouped-sidebar__history-item"
            :class="{
              'grouped-sidebar__history-item--active': history.id === chatStore.currentHistoryId,
            }"
            @click="handleHistoryClick(history)"
          >
            <span class="grouped-sidebar__history-icon-circle">
              <el-icon :size="14"><ChatDotSquare /></el-icon>
            </span>
            <div class="grouped-sidebar__history-copy">
              <div class="grouped-sidebar__history-name">{{ history.title }}</div>
            </div>
            <el-popover
              placement="bottom-end"
              trigger="click"
              :width="140"
              :show-arrow="false"
              popper-class="grouped-sidebar-history-action-popover"
            >
              <div class="grouped-sidebar__history-action-menu">
                <button
                  class="grouped-sidebar__history-action-item"
                  type="button"
                  @click.stop="showSidebarRename(history)"
                >
                  <el-icon><Edit /></el-icon>
                  <span>重命名</span>
                </button>
                <button
                  class="grouped-sidebar__history-action-item grouped-sidebar__history-action-item--danger"
                  type="button"
                  @click.stop="showSidebarDelete(history.id)"
                >
                  <el-icon><Delete /></el-icon>
                  <span>删除</span>
                </button>
              </div>
              <template #reference>
                <button
                  class="grouped-sidebar__history-more"
                  type="button"
                  aria-label="更多操作"
                  @click.stop
                >
                  <el-icon><MoreFilled /></el-icon>
                </button>
              </template>
            </el-popover>
          </div>
        </el-scrollbar>
      </div>
    </aside>

    <!-- 侧边栏删除/重命名弹窗 -->
    <ActionDialog
      v-model:visible="sidebarDeleteVisible"
      type="confirm"
      title="确定要删除这条对话记录吗？"
      description="删除后将无法恢复，请谨慎操作。"
      confirm-text="确认删除"
      cancel-text="取消"
      :danger="true"
      @confirm="handleSidebarDeleteConfirm"
    />
    <ActionDialog
      v-model:visible="sidebarRenameVisible"
      type="prompt"
      title="重命名对话"
      :input-value="sidebarRenameTarget?.title || ''"
      input-placeholder="请输入新的对话标题"
      confirm-text="确认修改"
      cancel-text="取消"
      @confirm="handleSidebarRenameConfirm"
    />

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 技能库视图（嵌入 main-content） -->
      <div
        v-if="route.path === '/skills-market'"
        class="sched-embedded skills-market-embedded"
      >
        <SkillsMarketView embedded />
      </div>

      <!-- MCP 专区视图（嵌入 main-content） -->
      <div
        v-else-if="route.path === '/mcp-management'"
        class="sched-embedded mcp-management-embedded"
      >
        <McpManagementView embedded />
      </div>

      <!-- 聊天视图 -->
      <template v-else>
        <!-- 附件中心弹窗 -->
        <AppendixHistoryPanel
          ref="appendixHistoryPanelRef"
          v-model:visible="attachmentDialogVisible"
          mode="dialog"
          @quote="handleQuoteAppendix"
        />

        <!-- 聊天区域 -->
        <el-scrollbar
          ref="chatContainer"
          class="chat-container"
          :class="{ 'chat-container--hidden': !chatStore.hasMessages }"
          always
          @wheel.passive="handleChatWheel"
          @touchstart.passive="handleChatTouchStart"
          @touchmove.passive="handleChatTouchMove"
          @scroll="handleChatScrollbarScroll"
        >
          <div v-if="chatStore.hasMessages" class="messages-container-wrapper">
            <ConversationToc
              v-show="userMessages.length >= 2"
              :messages="userMessages"
              :active-id="activeMessageId"
              @scroll-to="scrollToMessage"
            />

            <div class="messages-area" ref="messagesAreaRef">
              <div
                v-for="msg in chatStore.messages"
                :key="msg.id"
                class="message-wrapper"
                :id="`msg-${msg.id}`"
                :class="{ 'user-message': msg.role === 'user' }"
              >
                <!-- 数字警员 & MCP 标签（消息框外上方） -->
                <div
                  v-if="msg.role === 'user' && (msg.officers?.length || msg.mcps?.length)"
                  class="message-resource-tags-outside"
                >
                  <div
                    v-for="officer in msg.officers"
                    :key="'officer-' + officer.id"
                    class="message-resource-tag message-resource-tag--officer"
                  >
                    <span class="message-resource-tag__icon">👮</span>
                    <span class="message-resource-tag__name">{{ officer.officer_name }}</span>
                    <span v-if="officer.skills?.length" class="message-resource-tag__skills">
                      ({{ officer.skills.map((s) => s.name).join('、') }})
                    </span>
                  </div>
                  <div
                    v-for="mcp in msg.mcps"
                    :key="'mcp-' + mcp.id"
                    class="message-resource-tag message-resource-tag--mcp"
                  >
                    <span class="message-resource-tag__icon">🔗</span>
                    <span class="message-resource-tag__name">MCP·{{ mcp.service_name }}</span>
                  </div>
                </div>

                <div class="message" :class="msg.role">
                  <div class="message-avatar">
                    <img
                      v-if="msg.role === 'assistant'"
                      src="@/assets/icons/chat/icon-chat-assistant.png"
                      alt="用户"
                      class="avatar-img"
                    />
                    <img
                      v-else
                      src="@/assets/icons/chat/icon-chat-assistant7.png"
                      alt="AI助手"
                      class="avatar-img"
                    />
                  </div>
                  <div class="message-content">
                    <div v-if="msg.role === 'user'" class="message-text user-text">
                      <SmartMessageRenderer
                        :message="msg"
                        @expand-change="handleExpandChange"
                        @send-message="handleQuickStart"
                      />
                    </div>

                    <div v-else class="message-text">
                      <SmartMessageRenderer
                        :message="msg"
                        @expand-change="handleExpandChange"
                        @send-message="handleQuickStart"
                      />
                      <div
                        v-if="
                          (chatStore.isStreaming || chatStore.isTyping) &&
                          isLastAssistantMessage(msg)
                        "
                        class="thinking-container"
                      >
                        <span class="thinking-label">正在思考</span>
                        <div class="thinking-dots"><span></span><span></span><span></span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  class="message-actions-container"
                  :class="{ 'message-actions-user': msg.role === 'user' }"
                  v-if="msg.content && (!chatStore.isStreaming || !isLastAssistantMessage(msg))"
                >
                  <div class="message-actions">
                    <el-tooltip
                      :content="msg.role === 'user' ? '复制消息' : '复制回答'"
                      placement="top"
                    >
                      <el-button
                        size="small"
                        link
                        @click="copyMessage(msg)"
                        class="action-btn"
                      >
                        <el-icon size="16"><CopyDocument /></el-icon>
                      </el-button>
                    </el-tooltip>

                    <span v-if="msg.role === 'user'" class="message-time message-time--user">
                      {{ formatUserMessageTime(msg.timestamp) }}
                    </span>

                    <el-tooltip
                      content="重新生成回答"
                      placement="top"
                      v-if="msg.role === 'assistant'"
                    >
                      <el-button
                        size="small"
                        link
                        @click="regenerateResponse(msg)"
                        class="action-btn"
                      >
                        <el-icon size="16"><Refresh /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-scrollbar>

        <!-- 欢迎语（在聊天区域居中） -->
        <div v-if="!chatStore.hasMessages" class="welcome-screen">
          <h1>
            <span class="typewriter-text">{{ welcomeDisplayedText }}</span>
          </h1>
        </div>

        <div v-if="showScrollToBottomButton" class="scroll-to-bottom-action">
          <button
            type="button"
            class="scroll-to-bottom-button"
            aria-label="滚动到底部"
            title="滚动到底部"
            @click="handleScrollToBottomClick"
          >
            <span v-if="chatStore.isStreaming" class="scroll-to-bottom-loading" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <img v-else :src="arrowBottomIcon" alt="" class="scroll-to-bottom-icon" />
          </button>
        </div>

        <!-- 底部区域：选择区 + 输入框 -->
        <div class="bottom-section">

          <!-- 警员 / MCP 选择区 -->
          <div class="resource-select-bar">
            <!-- 左侧：数字警员 -->
            <div class="resource-select-half">
              <div class="resource-select-label">数字警员</div>
              <div class="resource-chips">
                <template v-if="officerList.length > 0">
                  <span
                    v-for="officer in officerList"
                    :key="'ro-' + officer.id"
                    class="resource-chip resource-chip--officer"
                    :class="{ 'resource-chip--active': isOfficerSelected(officer) }"
                    @click="toggleOfficer(officer)"
                  >
                    <span>{{ officer.officer_name }}</span>
                  </span>
                </template>
                <span v-else class="resource-chip--empty">暂无可选警员</span>
              </div>
            </div>

            <!-- 分隔线 -->
            <div class="resource-select-divider"></div>

            <!-- 右侧：MCP 服务 -->
            <div class="resource-select-half">
              <div class="resource-select-label">MCP 服务</div>
              <div class="resource-chips">
                <template v-if="mcpList.length > 0">
                  <span
                    v-for="mcp in mcpList"
                    :key="'rm-' + mcp.id"
                    class="resource-chip resource-chip--mcp"
                    :class="{ 'resource-chip--active': isMcpSelected(mcp) }"
                    @click="toggleMcp(mcp)"
                  >
                    <span>{{ mcp.service_name }}</span>
                  </span>
                </template>
                <span v-else class="resource-chip--empty">暂无可选MCP</span>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="input-area">
            <div
              class="input-wrapper style-comet"
              :class="{ 'neon-active': chatStore.isStreaming || chatStore.isTyping }"
            >
              <div v-if="selectedSkills.length" class="skill-mention-chips">
                <div v-for="skill in selectedSkills" :key="skill.name" class="skill-mention-chip">
                  <span class="skill-mention-chip__mark">@</span>
                  <span class="skill-mention-chip__name">{{ skill.name }}</span>
                  <span v-if="skill.category" class="skill-mention-chip__category">
                    {{ skill.category }}
                  </span>
                  <button
                    type="button"
                    class="skill-mention-chip__remove"
                    @click="removeSelectedSkill(skill.name)"
                  >
                    <el-icon size="12"><Close /></el-icon>
                  </button>
                </div>
              </div>

              <div v-if="skillSuggestVisible" class="skill-mention-panel">
                <div class="skill-mention-panel__header">
                  <span>
                    {{ skillMentionQuery ? `匹配"${skillMentionQuery}"` : '选择技能' }}
                  </span>
                  <span v-if="skillSuggestLoading">查询中...</span>
                </div>
                <button
                  v-for="skill in skillSuggestions"
                  :key="skill.name"
                  class="skill-mention-option"
                  type="button"
                  @mousedown.prevent="applySelectedSkill(skill)"
                >
                  <span class="skill-mention-option__name">@{{ skill.name }}</span>
                  <span class="skill-mention-option__desc">
                    {{ skill.description || skill.category || '暂无描述' }}
                  </span>
                </button>
                <div
                  v-if="!skillSuggestLoading && skillSuggestions.length === 0"
                  class="skill-mention-panel__empty"
                >
                  未找到匹配技能
                </div>
              </div>

              <!-- 文件展示区域 -->
              <div v-if="chatStore.uploadedFiles.length > 0" class="file-display">
                <div
                  v-for="file in chatStore.uploadedFiles"
                  :key="file.filename"
                  class="file-card"
                  :class="{
                    'file-card--uploading': file.status === 'uploading',
                    'file-card--error': file.status === 'error',
                  }"
                >
                  <!-- 关闭按钮（左上角） -->
                  <button class="file-card__close" type="button" @click="removeFile(file.filename)">
                    <el-icon :size="12"><Close /></el-icon>
                  </button>

                  <!-- 上传中：骨架动画 -->
                  <template v-if="file.status === 'uploading'">
                    <span class="file-card__skeleton file-card__skeleton--name"></span>
                    <span class="file-card__skeleton file-card__skeleton--size"></span>
                    <span class="file-card__skeleton file-card__skeleton--tag"></span>
                  </template>

                  <!-- 上传成功：文件信息 -->
                  <template v-else-if="file.status === 'success'">
                    <p class="file-card__name">{{ file.filename }}</p>
                    <p class="file-card__size">
                      {{ file.file ? formatFileSize(file.file.size) : '' }}
                    </p>
                    <span class="file-card__tag">{{ getFileTypeLabel(file.filename) }}</span>
                  </template>

                  <!-- 上传失败 -->
                  <template v-else-if="file.status === 'error'">
                    <p class="file-card__name">{{ file.filename }}</p>
                    <p
                      class="file-card__size file-card__size--error"
                      @click="retryUploadFile(file.filename)"
                    >
                      上传失败，点击重试
                    </p>
                  </template>
                </div>
              </div>

              <div class="input-row">
                <!-- 文本输入 - 独立一行 -->
                <div class="input-text-row">
                  <el-input
                    ref="inputTextarea"
                    v-model="currentInput"
                    type="textarea"
                    :rows="1"
                    :autosize="{ minRows: 1, maxRows: 4 }"
                    placeholder="Enter 发送，Shift+Enter 换行"
                    @keydown.enter.exact.prevent="sendCurrentMessage"
                    @paste="handleInputPaste"
                    class="message-input"
                  />
                </div>

                <!-- 按钮行 -->
                <div class="input-actions-row">
                  <!-- 上传按钮 - 最左侧 -->
                  <el-tooltip
                    content="支持 图片、PDF、Word、Excel、CSV、TXT、MD 格式文件"
                    placement="top"
                    :show-after="300"
                  >
                    <el-button class="upload-btn" link @click="handleFileUpload">
                      <img
                        src="@/assets/icons/chat/icon-chat-uploadfile.png"
                        alt="上传文件"
                        style="width: 20px; height: 20px"
                      />
                    </el-button>
                  </el-tooltip>

                  <div class="input-actions-right">
                    <!-- 模型切换按钮 -->
                    <el-popover
                      v-model:visible="modelPopoverVisible"
                      placement="top-start"
                      trigger="click"
                      :width="240"
                      :show-arrow="false"
                      popper-class="model-select-popover"
                    >
                      <div class="model-select-panel">
                        <div class="model-select-panel__header">
                          <span>选择模型</span>
                        </div>
                        <div v-if="modelListLoading" class="model-select-empty">加载中...</div>
                        <template v-else>
                          <button
                            v-for="model in modelList"
                            :key="model.name"
                            class="model-select-option"
                            :class="{
                              'model-select-option--active': selectedModelName === model.name,
                            }"
                            type="button"
                            @click="selectAnswerModel(model.name)"
                          >
                            <span class="model-select-option__main">
                              <span class="model-select-option__name">{{ model.name }}</span>
                            </span>
                            <el-icon v-if="selectedModelName === model.name"><Check /></el-icon>
                          </button>
                          <div v-if="modelList.length === 0" class="model-select-empty">
                            暂无可用模型
                          </div>
                        </template>
                      </div>
                      <template #reference>
                        <button
                          class="input-model-trigger"
                          type="button"
                          :title="selectedModelLabel"
                        >
                          <span>{{ selectedModelLabel }}</span>
                          <el-icon
                            :size="12"
                            class="model-trigger-arrow"
                            :class="{ 'model-trigger-arrow--open': modelPopoverVisible }"
                            ><ArrowDown
                          /></el-icon>
                        </button>
                      </template>
                    </el-popover>

                    <!-- 发送按钮 -->
                    <el-button
                      class="send-btn"
                      :class="{ 'send-btn--active': hasInput }"
                      type="primary"
                      @click="
                        chatStore.isStreaming ? chatStore.stopStreaming() : sendCurrentMessage()
                      "
                    >
                      <img
                        v-if="showStopIcon"
                        src="@/assets/icons/chat/icon-chat-stop.png"
                        alt="停止"
                        style="width: 18px; height: 18px"
                      />
                      <img
                        v-else
                        src="@/assets/icons/chat/icon-chat-send.png"
                        alt="发送"
                        style="width: 18px; height: 18px"
                      />
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
            <!-- 隐藏的文件输入 -->
            <input
              ref="fileInput"
              type="file"
              multiple
              style="display: none"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.png,.jpg"
              @change="onFileSelected"
            />
          </div>
          <!-- <div class="input-tips">AI也会犯错，请仔细甄别</div> -->
        </div>

        <div class="footer-support">
          技术支持：省厅大数据实战总队
          支撑公司：南京浩树科技有限公司、中电鸿信信息科技有限公司、中国电信集团江苏省电信公司，联系人：杨汝乾
          联系方式：13951626907
        </div>
      </template>
    </main>

    <!-- 敏感词警告弹窗 -->
    <SensitiveWordDialog
      :visible="chatStore.sensitiveWarning.visible"
      :message="chatStore.sensitiveWarning.message"
      :keywords="chatStore.sensitiveWarning.keywords"
      @close="chatStore.sensitiveWarning.visible = false"
    />
  </div>
</template>

<style>
.skills-market-embedded,
.mcp-management-embedded {
  height: 100%;
  overflow: hidden;
}
</style>
