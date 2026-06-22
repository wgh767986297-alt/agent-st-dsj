<template>
  <div
    class="log-query-page"
    :class="{
      'log-query-page--detail-open': conversationDetailVisible,
      'log-query-page--embedded': props.embedded,
    }"
  >
    <header class="log-query-header">
      <div class="log-query-title-group">
        <button v-if="!props.embedded" class="log-query-back-link" type="button" @click="goBack" aria-label="返回">
          <el-icon :size="18"><ArrowLeft /></el-icon>
        </button>
        <div class="log-query-title-row">
          <span class="log-query-title-icon">
            <el-icon><Tickets /></el-icon>
          </span>
          <div>
            <h1>日志查询</h1>
          </div>
        </div>
      </div>
    </header>

    <div class="log-panel">
      <div class="log-query-toolbar">
      <div class="log-type-toggle" role="group" aria-label="日志类型">
        <button
          v-for="option in logTypeOptions"
          :key="option.value"
          class="log-type-toggle__button"
          :class="{ 'log-type-toggle__button--active': activeLogType === option.value }"
          type="button"
          @click="handleLogTypeChange(option.value)"
        >
          <el-icon><component :is="option.icon" /></el-icon>
          <span>{{ option.label }}</span>
        </button>
      </div>

      <div class="log-query-controls">
        <el-input
          v-model="searchKeyword"
          class="log-search-input"
          clearable
          :prefix-icon="Search"
          :placeholder="searchPlaceholder"
          @keyup.enter="handleQuerySubmit"
        />

        <el-date-picker
          v-model="dateRange"
          class="log-date-range"
          style="width: 16vw; max-width: 100%"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          range-separator="至"
          value-format="YYYYMMDD"
        />

        <div class="log-query-actions">
          <el-button type="primary" :icon="Search" :loading="loading" @click="handleQuerySubmit">
            查询
          </el-button>
          <el-button :icon="Refresh" @click="handleQueryReset">重置</el-button>
        </div>
      </div>
    </div>

    <section class="log-table-shell">
      <div v-if="loading" class="table-skeleton" aria-busy="true" aria-label="日志查询中">
        <div v-for="index in 8" :key="`log-loading-row-${index}`" class="table-skeleton__row">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <el-empty
        v-else-if="pagedRows.length === 0"
        class="log-table-empty"
        description="暂无匹配日志"
      />

      <el-table
        v-else-if="activeLogType === 'login'"
        :data="pagedRows"
        class="log-table"
        row-key="id"
        table-layout="fixed"
      >
        <el-table-column label="序号" type="index" width="76" align="center" />
        <el-table-column prop="account" label="账号" min-width="190" show-overflow-tooltip />
        <el-table-column prop="username" label="用户名" min-width="180" show-overflow-tooltip />
        <el-table-column prop="loginip" label="登录 IP" min-width="180" show-overflow-tooltip />
        <el-table-column
          prop="logindateText"
          label="登录时间"
          min-width="210"
          show-overflow-tooltip
        />
        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === '01' ? 'success' : 'danger'" size="small">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-table
        v-else
        :data="pagedRows"
        class="log-table conversation-log-table"
        row-key="id"
        table-layout="auto"
      >
        <el-table-column label="序号" type="index" width="76" align="center" />
        <el-table-column
          prop="account"
          label="账号/身份证号"
          min-width="190"
          show-overflow-tooltip
        />
        <el-table-column prop="title" label="对话标题" min-width="260" show-overflow-tooltip />
        <el-table-column
          prop="updateTimeText"
          label="更新时间"
          min-width="190"
          show-overflow-tooltip
        />
        <el-table-column label="内容预览" min-width="420">
          <template #default="{ row }">
            <div class="conversation-summary">
              <div class="conversation-summary__main">
                <span class="conversation-summary__count">{{ row.messages.length }} 条消息</span>
                <span class="conversation-summary__text">{{ row.contentPreview }}</span>
              </div>
              <el-button
                class="conversation-preview-button"
                :class="{
                  'conversation-preview-button--active': isConversationDetailActive(row),
                }"
                size="small"
                circle
                :icon="ArrowRight"
                aria-label="查看详情"
                :aria-pressed="isConversationDetailActive(row)"
                @click="openConversationDetail(row)"
              />
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <div class="log-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="filteredRows.length"
        layout="total, prev, pager, next"
        background
      />
    </div>
    </div>

    <el-drawer
      v-model="conversationDetailVisible"
      class="conversation-detail-drawer"
      direction="rtl"
      size="min(600px, 42vw)"
      :modal="false"
      modal-class="conversation-detail-overlay"
      :with-header="false"
      :lock-scroll="false"
      @closed="handleConversationDetailClosed"
    >
      <section class="conversation-detail">
        <header class="conversation-detail__header">
          <div>
            <h2>{{ selectedConversation?.title || '对话详情' }}</h2>
            <p>
              {{ selectedConversation?.account || '-' }}
              <span v-if="selectedConversation?.updateTimeText">
                · {{ selectedConversation.updateTimeText }}
              </span>
              <span v-if="selectedConversation?.ip"> · IP {{ selectedConversation.ip }} </span>
            </p>
          </div>
          <el-button
            class="conversation-detail__close"
            text
            circle
            :icon="Close"
            aria-label="关闭"
            @click="closeConversationDetail"
          />
        </header>

        <div class="conversation-detail__body">
          <div v-if="!selectedConversation?.messages.length" class="conversation-preview__empty">
            暂无可展示的对话内容
          </div>
          <template v-else>
            <div
              v-for="(message, index) in selectedConversation.messages"
              :key="`${selectedConversation.id}-${index}`"
              class="conversation-bubble-row"
              :class="{
                'conversation-bubble-row--user': message.role === 'user',
                'conversation-bubble-row--assistant': message.role !== 'user',
              }"
            >
              <div class="conversation-bubble">
                <div
                  v-if="message.thinkingBlocks.length || message.toolCallGroups.length"
                  class="conversation-insight-list"
                >
                  <details
                    v-for="(thinking, thinkingIndex) in message.thinkingBlocks"
                    :key="`thinking-${thinkingIndex}`"
                    class="conversation-insight conversation-insight--thinking"
                  >
                    <summary>
                      <span>思考过程</span>
                      <em>查看</em>
                    </summary>
                    <div
                      class="conversation-insight__body markdown-body"
                      v-html="renderConversationMarkdown(thinking.content)"
                    ></div>
                  </details>

                  <details
                    v-for="(group, toolIndex) in message.toolCallGroups"
                    :key="`tool-${toolIndex}`"
                    class="conversation-insight conversation-insight--tool"
                  >
                    <summary>
                      <span>{{ getToolDisplayName(group.toolCall.toolName) }}</span>
                      <em>{{ group.toolResult ? '已完成' : '执行中' }}</em>
                    </summary>
                    <div class="conversation-insight__body">
                      <div v-if="group.toolCall.toolArgs" class="conversation-tool-args">
                        <strong>调用参数</strong>
                        <pre>{{ formatToolArgs(group.toolCall.toolArgs) }}</pre>
                      </div>
                      <div
                        v-if="group.toolCall.content"
                        class="markdown-body"
                        v-html="renderConversationMarkdown(group.toolCall.content)"
                      ></div>
                      <div v-if="group.toolResult" class="conversation-tool-result">
                        <strong>返回结果</strong>
                        <div
                          class="markdown-body"
                          v-html="renderConversationMarkdown(group.toolResult.content)"
                        ></div>
                      </div>
                    </div>
                  </details>
                </div>

                <div
                  v-if="getMessageTextContent(message)"
                  class="conversation-bubble__content markdown-body"
                  v-html="renderConversationMarkdown(getMessageTextContent(message))"
                ></div>
                <div
                  v-else-if="!message.thinkingBlocks.length && !message.toolCallGroups.length"
                  class="conversation-bubble__content conversation-bubble__content--empty"
                >
                  -
                </div>
              </div>
            </div>
          </template>
        </div>
      </section>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  ChatLineRound,
  Close,
  Refresh,
  Search,
  Tickets,
  UserFilled,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { normalizeStreamingMarkdown } from '@/utils/markdownStream'
import { normalizeStreamingUrls } from '@/utils/markdownUrl'
import {
  getConversationLogs,
  getLoginLogs,
  type ConversationLogItem,
  type LoginLogItem,
} from '@/api/logQuery'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

type LogType = 'login' | 'conversation'

interface NormalizedLoginLog extends LoginLogItem {
  logindateText: string
}

interface NormalizedConversationLog {
  id: string
  sessionId: string
  account: string
  title: string
  ip: string
  content: string
  contentPreview: string
  messages: ConversationMessage[]
  updateTimeRaw: string
  createTimeRaw: string
  updateTimeText: string
  createTimeText: string
}

interface ConversationMessage {
  role: string
  content: string
  contentBlocks: ConversationContentBlock[]
  thinkingBlocks: ConversationThinkingBlock[]
  toolCallGroups: ConversationToolCallGroup[]
}

interface ConversationContentBlock {
  type: 'text' | 'thinking' | 'tool_call' | 'tool_result'
  content: string
  toolName?: string
  toolArgs?: unknown
}

interface ConversationThinkingBlock {
  content: string
}

interface ConversationToolCallGroup {
  toolCall: ConversationContentBlock
  toolResult?: ConversationContentBlock
}

const router = useRouter()
const activeLogType = ref<LogType>('login')
const searchKeyword = ref('')
const loading = ref(false)
const loginRows = ref<NormalizedLoginLog[]>([])
const conversationRows = ref<NormalizedConversationLog[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const conversationDetailVisible = ref(false)
const selectedConversation = ref<NormalizedConversationLog | null>(null)

const conversationMarkdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
})

conversationMarkdown.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  return self.renderToken(tokens, idx, options)
}

const getTodayDateValue = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const getDefaultLoginDateRange = (): [string, string] => {
  const today = getTodayDateValue()
  return [today, today]
}

const dateRange = ref<[string, string] | null>(null)

const logTypeOptions = [
  { value: 'login' as const, label: '登录日志', icon: UserFilled },
  { value: 'conversation' as const, label: '对话日志', icon: ChatLineRound },
]

const searchPlaceholder = computed(() =>
  activeLogType.value === 'login' ? '输入账号、姓名或登录 IP' : '输入账号、身份证号或对话标题',
)

const currentRows = computed(() =>
  activeLogType.value === 'login' ? loginRows.value : conversationRows.value,
)

const filteredRows = computed(() => {
  if (activeLogType.value === 'login') {
    return filterLoginRows(loginRows.value)
  }

  const keyword = searchKeyword.value.trim().toLowerCase()
  return conversationRows.value.filter((row) => {
    if (!isConversationTimeInRange(row)) {
      return false
    }

    if (!keyword) {
      return true
    }

    return [row.account, row.title, row.contentPreview].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(keyword),
    )
  })
})

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const goBack = () => {
  router.push('/')
}

const formatBackendTime = (value?: string) => {
  if (!value) return ''

  const text = String(value)
  if (/^\d{14}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)} ${text.slice(
      8,
      10,
    )}:${text.slice(10, 12)}:${text.slice(12, 14)}`
  }

  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
  }

  return text
}

const formatStatus = (status?: string) => {
  const statusMap: Record<string, string> = {
    '01': '成功',
    '02': '失败',
  }
  return statusMap[status || ''] || status || '-'
}

const isTimeInRange = (value?: string) => {
  if (!dateRange.value || dateRange.value.length !== 2) {
    return true
  }

  const time = String(value || '')
  if (!/^\d{14}$/.test(time)) {
    return false
  }

  const [startTime, endTime] = dateRange.value
  const startDateTime = startTime ? `${startTime}000000` : ''
  const endDateTime = endTime ? `${endTime}235959` : ''
  return (!startDateTime || time >= startDateTime) && (!endDateTime || time <= endDateTime)
}

const filterLoginRows = (rows: NormalizedLoginLog[]) => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return rows.filter((row) => {
    const matchedKeyword =
      !keyword ||
      [row.account, row.username, row.loginip].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword),
      )
    return matchedKeyword && isTimeInRange(row.logindate)
  })
}

const isConversationTimeInRange = (row: NormalizedConversationLog) => {
  if (!dateRange.value || dateRange.value.length !== 2) {
    return true
  }

  const time = row.updateTimeRaw || row.createTimeRaw
  if (!/^\d{14}$/.test(time)) {
    return false
  }

  const [startDate, endDate] = dateRange.value
  const startDateTime = startDate ? `${startDate}000000` : ''
  const endDateTime = endDate ? `${endDate}235959` : ''
  return (!startDateTime || time >= startDateTime) && (!endDateTime || time <= endDateTime)
}

const normalizeLoginRows = (items: LoginLogItem[]): NormalizedLoginLog[] => {
  return items.map((item, index) => ({
    ...item,
    id: item.id || `${item.account || 'login'}-${item.logindate || index}`,
    account: item.account || '',
    username: item.username || '',
    loginip: item.loginip || '',
    logindateText: formatBackendTime(item.logindate),
  }))
}

const normalizeMessageRole = (role?: string) => {
  return role === 'user' ? 'user' : 'assistant'
}

const normalizeContentBlock = (block: unknown): ConversationContentBlock | null => {
  if (!block || typeof block !== 'object') {
    return null
  }

  const record = block as Record<string, unknown>
  const type = record.type
  if (type !== 'text' && type !== 'thinking' && type !== 'tool_call' && type !== 'tool_result') {
    return null
  }

  return {
    type,
    content: String(record.content || '').trim(),
    toolName: typeof record.toolName === 'string' ? record.toolName : undefined,
    toolArgs: record.toolArgs,
  }
}

const normalizeThinkingBlocks = (
  message: Record<string, unknown>,
  contentBlocks: ConversationContentBlock[],
): ConversationThinkingBlock[] => {
  const fromThinkingBlocks = Array.isArray(message.thinkingBlocks)
    ? message.thinkingBlocks
        .map((block) => {
          if (!block || typeof block !== 'object') return null
          const content = String((block as Record<string, unknown>).content || '').trim()
          return content ? { content } : null
        })
        .filter((block): block is ConversationThinkingBlock => !!block)
    : []

  const fromContentBlocks = contentBlocks
    .filter((block) => block.type === 'thinking' && block.content)
    .map((block) => ({ content: block.content }))

  return [...fromThinkingBlocks, ...fromContentBlocks]
}

const normalizeToolCallGroups = (
  message: Record<string, unknown>,
  contentBlocks: ConversationContentBlock[],
): ConversationToolCallGroup[] => {
  if (Array.isArray(message.toolCallGroups)) {
    return message.toolCallGroups
      .map((group): ConversationToolCallGroup | null => {
        if (!group || typeof group !== 'object') return null
        const record = group as Record<string, unknown>
        const toolCall = normalizeContentBlock(record.toolCall)
        if (!toolCall) return null
        const toolResult = normalizeContentBlock(record.toolResult)
        const normalizedGroup: ConversationToolCallGroup = { toolCall }
        if (toolResult) {
          normalizedGroup.toolResult = toolResult
        }
        return normalizedGroup
      })
      .filter((group): group is ConversationToolCallGroup => !!group)
  }

  const groups: ConversationToolCallGroup[] = []
  for (const block of contentBlocks) {
    if (block.type === 'tool_call') {
      groups.push({ toolCall: block })
    } else if (block.type === 'tool_result' && groups.length) {
      groups[groups.length - 1].toolResult = block
    }
  }
  return groups
}

const parseConversationMessages = (content?: string): ConversationMessage[] => {
  if (!content) {
    return []
  }

  try {
    const parsed = JSON.parse(content) as Array<{ role?: string; content?: string }>
    if (Array.isArray(parsed)) {
      return parsed
        .map((message) => {
          const record = (message || {}) as Record<string, unknown>
          const contentBlocks = Array.isArray(record.contentBlocks)
            ? record.contentBlocks
                .map(normalizeContentBlock)
                .filter((block): block is ConversationContentBlock => !!block)
            : []
          const textFromBlocks = contentBlocks
            .filter((block) => block.type === 'text')
            .map((block) => block.content)
            .join('\n\n')
            .trim()

          return {
            role: normalizeMessageRole(String(record.role || '')),
            content: textFromBlocks || String(record.content || '').trim(),
            contentBlocks,
            thinkingBlocks: normalizeThinkingBlocks(record, contentBlocks),
            toolCallGroups: normalizeToolCallGroups(record, contentBlocks),
          }
        })
        .filter(
          (message) =>
            message.content || message.thinkingBlocks.length || message.toolCallGroups.length,
        )
    }
  } catch {
    return [
      {
        role: 'assistant',
        content,
        contentBlocks: [],
        thinkingBlocks: [],
        toolCallGroups: [],
      },
    ]
  }

  return []
}

const buildConversationPreview = (messages: ConversationMessage[]) => {
  const firstUserMessage = messages.find((message) => message.role === 'user')?.content
  const firstAssistantMessage = messages.find((message) => message.role !== 'user')?.content
  const preview = firstUserMessage || firstAssistantMessage || ''
  return preview.length > 80 ? `${preview.slice(0, 80)}...` : preview || '-'
}

const renderConversationMarkdown = (content: string) => {
  const rendered = conversationMarkdown.render(
    normalizeStreamingUrls(normalizeStreamingMarkdown(content || '')),
  )

  return DOMPurify.sanitize(rendered, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'code',
      'pre',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'a',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'title', 'class', 'target', 'rel'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onload', 'onclick', 'onmouseover'],
  })
}

const getMessageTextContent = (message: ConversationMessage) => {
  const textFromBlocks = message.contentBlocks
    .filter((block) => block.type === 'text')
    .map((block) => block.content)
    .join('\n\n')
    .trim()

  return textFromBlocks || message.content.trim()
}

const getToolDisplayName = (toolName?: string) => {
  if (!toolName) return '工具调用'
  if (toolName.includes('skill_list')) return '技能查找'
  if (toolName.includes('skill_run')) return '技能使用'
  if (toolName.includes('code_run')) return '后台命令'
  if (toolName.includes('file_read')) return '文件读取'
  return toolName
}

const formatToolArgs = (value: unknown) => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value ?? '')
  }
}

const normalizeConversationRows = (items: ConversationLogItem[]): NormalizedConversationLog[] => {
  return items.map((item, index) => {
    const sessionId = item.session_id || item.sessionId || item.id || ''
    const messages = parseConversationMessages(item.content)
    const content = messages.map((message) => message.content).join(' ')
    const createTimeRaw = item.create_time || item.createTime || ''
    const updateTimeRaw = item.update_time || item.updateTime || createTimeRaw
    return {
      id: sessionId || `${item.account || 'conversation'}-${index}`,
      sessionId,
      account: item.account || item.user_account || '',
      title: item.title || '未知对话',
      ip: item.ip || '',
      content,
      contentPreview: buildConversationPreview(messages),
      messages,
      createTimeRaw,
      updateTimeRaw,
      createTimeText: formatBackendTime(createTimeRaw),
      updateTimeText: formatBackendTime(updateTimeRaw),
    }
  })
}

const buildLoginQueryParams = () => {
  const keyword = searchKeyword.value.trim()
  const isIp = /^\d{1,3}(?:\.\d{1,3}){1,3}$/.test(keyword)
  const startDate = dateRange.value?.[0]
  const endDate = dateRange.value?.[1]

  return {
    account: isIp ? undefined : keyword,
    loginip: isIp ? keyword : undefined,
    startTime: startDate ? `${startDate}000000` : undefined,
    endTime: endDate ? `${endDate}235959` : undefined,
  }
}

const buildConversationQueryParams = () => {
  const keyword = searchKeyword.value.trim()
  const isAccountLike = /^[\dA-Za-z_-]{6,}$/.test(keyword)
  const startDate = dateRange.value?.[0]
  const endDate = dateRange.value?.[1]

  return {
    account: isAccountLike ? keyword : undefined,
    title: keyword && !isAccountLike ? keyword : undefined,
    startTime: startDate ? `${startDate}000000` : undefined,
    endTime: endDate ? `${endDate}235959` : undefined,
  }
}

const loadLogs = async () => {
  loading.value = true
  try {
    if (activeLogType.value === 'login') {
      const rows = await getLoginLogs(buildLoginQueryParams())
      loginRows.value = normalizeLoginRows(rows)
    } else {
      const rows = await getConversationLogs(buildConversationQueryParams())
      conversationRows.value = normalizeConversationRows(rows)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '日志查询失败')
    if (activeLogType.value === 'login') {
      loginRows.value = []
    } else {
      conversationRows.value = []
    }
  } finally {
    loading.value = false
  }
}

const handleLogTypeChange = (type: LogType) => {
  if (activeLogType.value === type) {
    return
  }

  closeConversationDetail()
  activeLogType.value = type
  searchKeyword.value = ''
  dateRange.value = null
  currentPage.value = 1
  loadLogs()
}

const handleQuerySubmit = () => {
  closeConversationDetail()
  currentPage.value = 1
  loadLogs()
}

const handleQueryReset = () => {
  closeConversationDetail()
  searchKeyword.value = ''
  dateRange.value = null
  currentPage.value = 1
  loadLogs()
}

const openConversationDetail = (row: NormalizedConversationLog) => {
  selectedConversation.value = row
  conversationDetailVisible.value = true
}

const closeConversationDetail = () => {
  conversationDetailVisible.value = false
}

const handleConversationDetailClosed = () => {
  selectedConversation.value = null
}

const isConversationDetailActive = (row: NormalizedConversationLog) => {
  return conversationDetailVisible.value && selectedConversation.value?.id === row.id
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.log-query-page {
  --detail-panel-width: min(600px, 42vw);
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 32px 40px 24px;
  color: var(--app-text);
  background: var(--app-bg-gradient);
  overflow: hidden;
}

.log-query-page--embedded {
  padding: 28px 32px 0;
  height: 100%;
  background: transparent;
}

.log-query-page--detail-open .log-query-header,
.log-query-page--detail-open .log-query-toolbar,
.log-query-page--detail-open .log-table-shell,
.log-query-page--detail-open .log-pagination {
  width: calc(100% - var(--detail-panel-width));
  max-width: none;
  margin-left: 0;
  margin-right: 0;
}

.log-query-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 40px;
  flex: 0 0 auto;
}

.log-query-title-group {
  min-width: 0;
}

.log-query-back-link {
  width: 40px;
  height: 40px;
  display: grid;
  flex: 0 0 40px;
  place-items: center;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  color: var(--app-text-muted);
  background: var(--app-panel);
  cursor: pointer;
  transition: all 0.2s ease;
}

.log-query-back-link:hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  transform: translateX(-2px);
}

.log-query-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.log-query-title-icon {
  width: 52px;
  height: 52px;
  display: grid;
  flex: 0 0 52px;
  place-items: center;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
  font-size: 24px;
  box-shadow: 0 8px 24px rgba(79, 124, 255, 0.22);
}

.log-query-header h1 {
  margin: 0;
  color: var(--app-text);
  font-size: 28px;
  font-weight: 780;
  letter-spacing: -0.02em;
  line-height: 1.25;
}


/* ==================== 主面板 ==================== */
.log-panel {
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.03),
    0 8px 24px rgba(24, 39, 75, 0.06);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.log-query-toolbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.log-type-toggle {
  display: inline-flex;
  padding: 4px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-panel-muted);
}

.log-type-toggle__button {
  min-width: 108px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 9px;
  color: var(--app-text-muted);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
}

.log-type-toggle__button--active {
  color: var(--app-primary);
  background: var(--app-panel);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.log-query-controls {
  min-width: 0;
  display: grid;
  grid-template-columns: 320px 280px auto;
  align-items: center;
  gap: 10px;
}

.log-search-input {
  width: 320px;
  flex: 0 0 auto;
}

.log-date-range {
  width: 100%;
  min-width: 0;
}

.log-date-range :deep(.el-range-input) {
  min-width: 0;
}

.log-date-range :deep(.el-range__close-icon) {
  flex: 0 0 auto;
}

.log-query-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.log-query-actions :deep(.el-button) {
  border-radius: 8px;
  font-weight: 650;
}
.log-table-shell {
  min-height: 0;
  flex: 0 1 auto;
  margin-top: 24px;
  overflow-x: hidden;
  overflow-y: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  box-shadow: var(--app-shadow);
}

.log-table {
  min-width: 0;
  width: 100%;
}

.log-query-page--detail-open .log-table {
  min-width: 0;
}

.log-table :deep(.el-table__inner-wrapper),
.log-table :deep(.el-table__body-wrapper),
.log-table :deep(.el-scrollbar__wrap) {
  overflow-x: hidden !important;
}

.log-table :deep(.el-scrollbar__bar.is-horizontal) {
  display: none !important;
}

.log-table :deep(.el-table__header th) {
  color: var(--app-text);
  background: var(--app-panel-muted);
  font-weight: 760;
}

.log-table :deep(.el-table__body td) {
  color: var(--app-text);
}

.log-table :deep(.cell) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-table :deep(.el-table__body tr:hover > td.el-table__cell) {
  background: var(--app-primary-softer);
}

.conversation-summary {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.conversation-summary__main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.conversation-summary__count {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--app-primary);
  background: var(--app-primary-soft);
  font-size: 12px;
  font-weight: 700;
}

.conversation-summary__text {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  color: var(--app-text-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.conversation-summary :deep(.conversation-preview-button.el-button) {
  --el-button-bg-color: var(--app-primary);
  --el-button-border-color: var(--app-primary);
  --el-button-hover-bg-color: var(--app-primary-strong);
  --el-button-hover-border-color: var(--app-primary-strong);
  --el-button-active-bg-color: var(--app-primary-strong);
  --el-button-active-border-color: var(--app-primary-strong);
  --el-button-text-color: #ffffff;
  --el-button-hover-text-color: #ffffff;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  padding: 0;
  overflow: visible;
  color: #ffffff !important;
  border-color: var(--app-primary) !important;
  background: var(--app-primary) !important;
  box-shadow: none !important;
  font-weight: 650;
  transition: none;
}

.conversation-summary :deep(.conversation-preview-button.el-button .el-icon) {
  transform-origin: center;
  transition: transform 0.18s ease;
}

.conversation-summary :deep(.conversation-preview-button.el-button:hover),
.conversation-summary :deep(.conversation-preview-button.el-button:focus) {
  color: #ffffff !important;
  border-color: var(--app-primary-strong) !important;
  background: var(--app-primary-strong) !important;
  box-shadow: none !important;
}

.conversation-summary :deep(.conversation-preview-button--active.el-button) {
  --el-button-bg-color: var(--app-success);
  --el-button-border-color: var(--app-success);
  --el-button-hover-bg-color: var(--app-success);
  --el-button-hover-border-color: var(--app-success);
  --el-button-active-bg-color: var(--app-success);
  --el-button-active-border-color: var(--app-success);
  --el-button-text-color: #ffffff;
  --el-button-hover-text-color: #ffffff;
  color: #ffffff !important;
  border-color: var(--app-success) !important;
  background: var(--app-success) !important;
  box-shadow: none !important;
}

.conversation-summary :deep(.conversation-preview-button--active.el-button:hover),
.conversation-summary :deep(.conversation-preview-button--active.el-button:focus) {
  color: #ffffff !important;
  border-color: var(--app-success) !important;
  background: var(--app-success) !important;
  box-shadow: none !important;
}

.conversation-summary :deep(.conversation-preview-button--active.el-button .el-icon) {
  transform: rotate(180deg);
}

.conversation-preview {
  max-height: 520px;
  display: grid;
  gap: 16px;
  padding: 20px 28px 24px;
  overflow: auto;
  background: var(--app-panel-muted);
}

.conversation-preview__empty {
  padding: 18px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  color: var(--app-text-muted);
  background: var(--app-panel);
  text-align: center;
}

.conversation-bubble-row {
  display: flex;
}

.conversation-bubble {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 11px 14px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  color: var(--app-text);
  background: var(--app-panel);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.conversation-bubble-row--user .conversation-bubble {
  border-color: color-mix(in srgb, var(--app-primary) 28%, var(--app-border));
  background: color-mix(in srgb, var(--app-primary) 9%, var(--app-panel));
}

.conversation-bubble__content {
  min-width: 0;
  max-width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.65;
  font-size: 14px;
}

.conversation-insight-list + .conversation-bubble__content {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
}

.conversation-bubble__content.markdown-body {
  white-space: normal;
}

.conversation-bubble__content :deep(p) {
  margin: 0 0 10px;
}

.conversation-bubble__content :deep(p:last-child) {
  margin-bottom: 0;
}

.conversation-bubble__content :deep(pre) {
  max-width: 100%;
  overflow-x: hidden;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--app-panel-muted);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.conversation-bubble__content :deep(code) {
  word-break: break-word;
  overflow-wrap: anywhere;
}

.conversation-bubble__content :deep(table) {
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  overflow: hidden;
}

.conversation-bubble__content :deep(th),
.conversation-bubble__content :deep(td) {
  padding: 6px 8px;
  border: 1px solid var(--app-border);
  word-break: break-word;
  overflow-wrap: anywhere;
}

:global(.conversation-detail-drawer) {
  height: 100vh;
  height: 100dvh;
  max-width: 100vw;
  pointer-events: auto;
}

:global(.conversation-detail-overlay) {
  pointer-events: none;
}

:global(.conversation-detail-drawer .el-drawer__body) {
  height: 100%;
  padding: 0;
  background: var(--app-panel);
  overflow: hidden;
}

.conversation-detail {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  color: var(--app-text);
}

.conversation-detail__header {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-panel);
}

.conversation-detail__header > div {
  min-width: 0;
}

.conversation-detail__header h2 {
  margin: 0;
  overflow: hidden;
  color: var(--app-text);
  font-size: 18px;
  font-weight: 780;
  letter-spacing: 0;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-detail__header p {
  margin: 6px 0 0;
  overflow: hidden;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-detail__close {
  flex: 0 0 auto;
  color: var(--app-text-muted);
}

.conversation-detail__body {
  min-height: 0;
  min-width: 0;
  flex: 1 1 auto;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 18px 20px 24px;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--app-panel-muted);
}

.conversation-insight-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.conversation-insight {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--app-panel) 82%, transparent);
}

.conversation-insight summary {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 11px;
  cursor: pointer;
  list-style: none;
  color: var(--app-text);
  font-size: 13px;
  font-weight: 720;
}

.conversation-insight summary::-webkit-details-marker {
  display: none;
}

.conversation-insight summary::before {
  content: '';
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.18s ease;
  opacity: 0.55;
}

.conversation-insight[open] summary::before {
  transform: rotate(45deg);
}

.conversation-insight summary span {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-insight summary em {
  flex: 0 0 auto;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--app-text-muted);
  background: var(--app-panel-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 650;
}

.conversation-insight--thinking summary {
  color: var(--app-primary);
  background: var(--app-primary-softer);
}

.conversation-insight--tool summary {
  color: var(--app-success);
  background: var(--tc-green-bg);
}

.conversation-insight__body {
  min-width: 0;
  max-width: 100%;
  padding: 11px;
  border-top: 1px solid var(--app-border);
  color: var(--app-text);
  background: var(--app-panel);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.conversation-insight__body :deep(pre),
.conversation-tool-args pre {
  max-width: 100%;
  margin: 8px 0 0;
  overflow-x: hidden;
  padding: 10px;
  border-radius: 8px;
  color: var(--app-text);
  background: var(--app-panel-muted);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.conversation-tool-args,
.conversation-tool-result {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.conversation-tool-result {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--app-border);
}

.conversation-tool-args strong,
.conversation-tool-result strong {
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 760;
}

.log-table-empty {
  min-height: 320px;
  display: grid;
  place-items: center;
}

.table-skeleton {
  display: grid;
}

.table-skeleton__row {
  height: 52px;
  display: grid;
  grid-template-columns: 70px 1fr 1.2fr 0.9fr 0.7fr;
  align-items: center;
  gap: 18px;
  padding: 0 18px;
  border-bottom: 1px solid var(--app-border);
}

.table-skeleton__row span {
  height: 13px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--app-skeleton-line-bg);
  position: relative;
}

.table-skeleton__row span::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--app-skeleton-shimmer), transparent);
  animation: table-loading-shimmer 1.15s infinite;
}

.log-pagination {
  display: flex;
  justify-content: flex-end;
  margin: 12px 0 22px;
  flex: 0 0 auto;
}

@keyframes table-loading-shimmer {
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 768px) {
  .log-query-toolbar {
    grid-template-columns: 1fr;
  }

  .log-query-controls {
    grid-template-columns: 1fr;
  }

  .log-query-actions {
    justify-content: flex-end;
  }

  .log-query-page {
    padding: 20px 16px;
  }

  .log-query-page--embedded {
    padding: 12px 14px 0;
  }
}

@media (max-width: 640px) {
  .log-query-header,
  .log-type-toggle {
    width: 100%;
  }

  .log-type-toggle__button {
    flex: 1;
    min-width: 0;
  }
}
</style>
