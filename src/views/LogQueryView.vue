<template>
  <div
    class="ds-page-wrapper ds-page"
    :class="{ 'ds-page--embedded': props.embedded }"
  >
    <!-- 页面标题行 -->
    <div class="ds-page-title-row">
      <h1 class="ds-page-title">安全审计日志</h1>
      <!-- 安全审计智能体按钮暂时屏蔽 -->
      <!-- <button class="ds-agent-toggle" @click="toggleAgentPanel">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path></svg>
        安全审计智能体
      </button> -->
    </div>

    <!-- 左右布局 -->
    <div class="ds-layout-split">
      <!-- 左侧：审计表格 -->
      <div class="ds-layout-left">
        <!-- 数据源切换标签 -->
        <div class="ds-section-tabs">
          <button
            v-for="option in logTypeOptions"
            :key="option.value"
            class="ds-section-tab"
            :class="{ active: activeLogType === option.value }"
            @click="handleLogTypeChange(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <!-- 筛选行 -->
        <div class="ds-filter-row">
          <!-- 操作日志专用筛选 -->
          <template v-if="activeLogType === 'operation'">
            <input
              v-model="operationSearchAccount"
              class="ds-search-input"
              placeholder="用户账号"
              @keyup.enter="handleQuerySubmit"
            />
            <el-select v-model="operationSearchType" style="width: 160px" clearable placeholder="全部操作类型" @change="handleQuerySubmit">
              <el-option label="创建" value="CREATE" />
              <el-option label="更新" value="UPDATE" />
              <el-option label="删除" value="DELETE" />
              <el-option label="分配" value="ASSIGN" />
              <el-option label="授权" value="AUTH" />
              <el-option label="审核" value="AUDIT" />
              <el-option label="申请" value="APPLY" />
            </el-select>
            <el-select v-model="operationSearchModule" style="width: 160px" clearable placeholder="全部操作模块" @change="handleQuerySubmit">
              <el-option label="部门管理" value="DEPARTMENT" />
              <el-option label="技能管理" value="SKILL" />
              <el-option label="数字警员" value="OFFICER" />
              <el-option label="MCP服务" value="MCP" />
              <el-option label="授权管理" value="AUTH" />
              <el-option label="用户管理" value="USER" />
              <el-option label="角色管理" value="ROLE" />
            </el-select>
          </template>
          <!-- 登录/对话日志筛选 -->
          <template v-else>
            <input
              v-model="searchKeyword"
              class="ds-search-input"
              :placeholder="searchPlaceholder"
              @keyup.enter="handleQuerySubmit"
            />
            <el-select v-model="auditRoleFilter" style="width: 160px" clearable placeholder="全部角色">
              <el-option label="超级管理员" value="超级管理员" />
              <el-option label="部门管理员" value="部门管理员" />
              <el-option label="普通用户" value="普通用户" />
              <el-option label="安全审计员" value="安全审计员" />
            </el-select>
          </template>

          <el-date-picker
            v-model="dateRange"
            style="width:260px;flex-shrink:0;"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            range-separator="至"
            value-format="YYYYMMDD"
          />

          <button class="ds-btn-primary" :disabled="loading" @click="handleQuerySubmit">
            <el-icon><Search /></el-icon>
            查询
          </button>
          <button class="ds-btn-outline" @click="handleQueryReset">
            <el-icon><Refresh /></el-icon>
            重置
          </button>
          <button
            v-if="activeLogType === 'operation'"
            class="ds-btn-success"
            :disabled="operationExporting"
            @click="handleExportOperation"
          >
            <el-icon><Download /></el-icon>
            导出
          </button>
        </div>

        <!-- 统一审计表格 -->
        <div class="ds-table-wrap">
          <table class="ds-table">
            <thead>
              <tr>
                <th style="width:170px;">时间</th>
                <th style="width:110px;">用户</th>
                <th style="width:100px;">角色</th>
                <th style="width:100px;">操作类型</th>
                <th>操作内容</th>
                <th style="width:140px;">IP地址</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading" class="ds-loading-row">
                <td colspan="6" class="ds-empty-cell" style="padding:60px 20px;">
                  <span style="color:var(--ds-text-secondary);">日志查询中...</span>
                </td>
              </tr>
              <tr v-else-if="pagedUnifiedRows.length === 0">
                <td colspan="6" class="ds-empty-cell">暂无匹配日志</td>
              </tr>
              <tr
                v-for="row in pagedUnifiedRows"
                :key="row.id"
                @click="row.sourceType === 'conversation' ? openConversationDetailFromAudit(row) : undefined"
                :style="row.sourceType === 'conversation' ? 'cursor:pointer;' : ''"
              >
                <td>{{ row.time }}</td>
                <td>{{ row.user }}</td>
                <td>{{ row.role }}</td>
                <td>{{ row.operationType }}</td>
                <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ row.operationContent }}</td>
                <td style="font-family:var(--ds-font-mono);font-size:12px;">{{ row.ip }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div style="display:flex;justify-content:flex-end;margin-top:14px;">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="filteredUnifiedRows.length"
            layout="total, prev, pager, next"
            background
            small
          />
        </div>
      </div>

      <!-- 右侧：安全审计智能体面板 -->
      <div class="ds-layout-right" :class="{ collapsed: !agentPanelVisible }">
        <div class="ds-agent-header">
          <div class="ds-agent-avatar">审</div>
          <div>
            <div class="ds-agent-title">安全审计智能体</div>
            <div class="ds-agent-sub">7x24 审计日志分析助手</div>
          </div>
          <button class="ds-agent-close" @click="toggleAgentPanel">&times;</button>
        </div>
        <div class="ds-agent-messages">
          <div
            v-for="(msg, idx) in agentMessages"
            :key="idx"
            class="ds-agent-msg"
            :class="msg.role"
          >
            <div class="ds-agent-msg-avatar">{{ msg.role === 'ai' ? '审' : '我' }}</div>
            <div class="ds-agent-msg-bubble">
              {{ msg.text }}
              <div v-if="msg.suggestions && msg.suggestions.length" class="ds-sq-chips">
                <span
                  v-for="(s, si) in msg.suggestions"
                  :key="si"
                  class="ds-sq-chip"
                  @click="askAgent(s)"
                >{{ s }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="ds-agent-input">
          <input
            v-model="agentInput"
            type="text"
            placeholder="输入问题，按 Enter 发送..."
            @keydown.enter="sendAgentMessage"
          />
          <button @click="sendAgentMessage">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:#fff;"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 对话详情抽屉 -->
    <el-drawer
      v-model="conversationDetailVisible"
      direction="rtl"
      size="min(600px, 42vw)"
      :modal="false"
      :with-header="false"
      :lock-scroll="false"
      @closed="handleConversationDetailClosed"
    >
      <section class="conversation-detail" v-if="selectedConversation">
        <header class="conversation-detail__header">
          <div>
            <h2>{{ selectedConversation.title || '对话详情' }}</h2>
            <p>
              {{ selectedConversation.account || '-' }}
              <span v-if="selectedConversation.updateTimeText">
                &middot; {{ selectedConversation.updateTimeText }}
              </span>
              <span v-if="selectedConversation.ip"> &middot; IP {{ selectedConversation.ip }} </span>
            </p>
          </div>
          <button class="conversation-detail__close-btn" @click="closeConversationDetail" aria-label="关闭">&times;</button>
        </header>
        <div class="conversation-detail__body">
          <div v-if="!selectedConversation.messages.length" class="conversation-detail__empty">
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
  ChatLineRound,
  Download,
  Files,
  Refresh,
  Search,
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
import { operationLogApi, type OperationLogItem } from '@/api/operationLog'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

type LogType = 'login' | 'conversation' | 'operation'

// ==================== 统一审计行接口 ====================
interface AuditLogRow {
  id: string
  time: string
  timeRaw: string
  user: string
  account: string
  role: string
  operationType: string
  operationContent: string
  ip: string
  sourceType: LogType
  sourceData: any
}

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

// ========== Operation log state ==========
const operationRows = ref<OperationLogItem[]>([])
const operationSearchAccount = ref('')
const operationSearchType = ref('')
const operationSearchModule = ref('')
const operationExporting = ref(false)

// ========== 新增状态 ==========
const agentPanelVisible = ref(false)
const agentInput = ref('')
const auditRoleFilter = ref('')

interface AgentMessage {
  role: 'ai' | 'user'
  text: string
  suggestions?: string[]
}

const agentMessages = ref<AgentMessage[]>([
  {
    role: 'ai',
    text: '您好！我是安全审计智能体，可以帮您分析审计日志、排查异常操作、生成审计报告。请问有什么需要帮助的？',
    suggestions: [
      '今日是否有异常操作',
      '最近7天授权变更汇总',
      '哪些用户查询最频繁',
    ],
  },
])

function toggleAgentPanel() {
  agentPanelVisible.value = !agentPanelVisible.value
}

function askAgent(question: string) {
  agentMessages.value.push({ role: 'user', text: question })
  // 模拟回复
  setTimeout(() => {
    const replies: Record<string, string> = {
      '今日是否有异常操作': '经分析今日审计日志，发现1条高风险操作：用户 zhangsan 在凌晨02:13查询了重点人员前科记录，属于非工作时间敏感查询。另有2条中风险操作记录，其余均为正常操作。建议关注该用户后续操作行为。',
      '最近7天授权变更汇总': '最近7天共有5次授权变更：\n1. admin 为刑侦支队授权skill"人员信息核查"\n2. admin 为刑侦支队授权MCP服务"卡口数据服务"\n3. admin 取消了网安支队的skill"重点区域监控"\n4. lisi 为治安大队授权MCP服务"GIS地图服务"\n5. admin 审核通过"情报汇总分析员"上架申请',
      '哪些用户查询最频繁': '近7天查询频次统计：\n1. zhangsan - 38次（普通用户·刑侦支队）\n2. lisi - 22次（部门管理员·刑侦支队）\n3. wangwu - 15次（部门管理员·治安大队）\n4. admin - 12次（超级管理员）\n\n其中 zhangsan 有1次凌晨异常查询，建议关注。',
    }
    const reply = replies[question] || '已收到您的问题，正在分析相关审计数据，请稍候...'
    agentMessages.value.push({ role: 'ai', text: reply })
  }, 600)
}

function sendAgentMessage() {
  const text = agentInput.value.trim()
  if (!text) return
  agentInput.value = ''
  askAgent(text)
}

/** 获取近3天日期范围 (YYYYMMDD格式) */
function getDefaultThreeDayRange(): [string, string] {
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }
  return [fmt(threeDaysAgo), fmt(now)]
}

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
  { value: 'operation' as const, label: '操作日志', icon: Files },
]

const searchPlaceholder = computed(() => {
  if (activeLogType.value === 'login') return '输入账号、姓名或登录 IP'
  if (activeLogType.value === 'operation') return '输入用户账号'
  return '输入账号、身份证号或对话标题'
})

const currentRows = computed(() => {
  if (activeLogType.value === 'login') return loginRows.value
  if (activeLogType.value === 'operation') return operationRows.value
  return conversationRows.value
})

// ==================== 角色推导 ====================
function deriveRole(account: string, sourceType: LogType, sourceData: any): string {
  if (sourceType === 'operation' && (sourceData as OperationLogItem)?.user_role) {
    return (sourceData as OperationLogItem).user_role
  }
  const acc = (account || '').toLowerCase()
  if (acc === 'admin') return '超级管理员'
  if (acc === 'auditor') return '安全审计员'
  if (acc === 'lisi' || acc === 'wangwu' || acc === 'zhaoliu') return '部门管理员'
  return '普通用户'
}


function normalizeLoginToAudit(row: NormalizedLoginLog): AuditLogRow {
  return {
    id: row.id || `login-${row.logindate}`,
    time: row.logindateText,
    timeRaw: row.logindate || '',
    user: row.username || row.account || '-',
    account: row.account || '-',
    role: deriveRole(row.account || '', 'login', row),
    operationType: row.status === '01' ? '登录成功' : '登录失败',
    operationContent: `${row.username || row.account} 于 ${row.logindateText} 从 ${row.loginip || '未知IP'} 登录${row.status === '01' ? '成功' : '失败'}`,
    ip: row.loginip || '-',
    sourceType: 'login',
    sourceData: row,
  }
}

function normalizeConversationToAudit(row: NormalizedConversationLog): AuditLogRow {
  const preview = row.contentPreview || '-'
  return {
    id: row.id || `conv-${row.sessionId}`,
    time: row.updateTimeText || row.createTimeText,
    timeRaw: row.updateTimeRaw || row.createTimeRaw,
    user: row.account || '-',
    account: row.account || '-',
    role: deriveRole(row.account || '', 'conversation', row),
    operationType: '对话',
    operationContent: `对话"${row.title}": ${preview}`,
    ip: row.ip || '-',
    sourceType: 'conversation',
    sourceData: row,
  }
}

function normalizeOperationToAudit(row: OperationLogItem): AuditLogRow {
  const typeMap: Record<string, string> = {
    CREATE: '创建', UPDATE: '更新', DELETE: '删除',
    ASSIGN: '分配', AUTH: '授权', AUDIT: '审核', APPLY: '申请',
  }
  const moduleMap: Record<string, string> = {
    DEPARTMENT: '部门管理', SKILL: '技能管理', OFFICER: '数字警员',
    MCP: 'MCP服务', AUTH: '授权管理', USER: '用户管理', ROLE: '角色管理',
  }
  const opType = typeMap[row.operation_type] || row.operation_type
  const opModule = moduleMap[row.operation_module] || row.operation_module
  let content = ''
  try {
    content = typeof row.operation_content === 'string'
      ? row.operation_content
      : JSON.stringify(row.operation_content)
  } catch {
    content = String(row.operation_content || '')
  }
  if (content.length > 100) content = content.slice(0, 100) + '...'

  return {
    id: `op-${row.id}`,
    time: formatBackendTime(row.create_time),
    timeRaw: row.create_time || '',
    user: row.user_name || row.user_account || '-',
    account: row.user_account || '-',
    role: row.user_role || deriveRole(row.user_account || '', 'operation', row),
    operationType: `${opType}·${opModule}`,
    operationContent: content,
    ip: row.request_ip || '-',
    sourceType: 'operation',
    sourceData: row,
  }
}

// ==================== 统一审计行计算属性 ====================
const unifiedRows = computed<AuditLogRow[]>(() => {
  if (activeLogType.value === 'login') {
    return loginRows.value.map(normalizeLoginToAudit)
  }
  if (activeLogType.value === 'conversation') {
    return conversationRows.value.map(normalizeConversationToAudit)
  }
  // operation
  return operationRows.value.map(normalizeOperationToAudit)
})

const filteredUnifiedRows = computed(() => {
  let rows = unifiedRows.value

  // 按角色筛选
  if (auditRoleFilter.value && activeLogType.value !== 'operation') {
    rows = rows.filter((r) => r.role === auditRoleFilter.value)
  }

  // 登录/对话日志的客户端关键词过滤
  if (activeLogType.value === 'login') {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (keyword) {
      rows = rows.filter((r) =>
        [r.account, r.user, r.ip].some((v) =>
          String(v || '').toLowerCase().includes(keyword),
        ),
      )
    }
  } else if (activeLogType.value === 'conversation') {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (keyword) {
      rows = rows.filter((r) =>
        [r.account, r.operationContent].some((v) =>
          String(v || '').toLowerCase().includes(keyword),
        ),
      )
    }
  }
  // operation 行的筛选已在服务端完成（通过 loadOperationLogs 参数）

  return rows
})

const pagedUnifiedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredUnifiedRows.value.slice(start, start + pageSize.value)
})

// 保留 filteredRows 和 pagedRows 用于向后兼容（原代码中引用的地方）
const filteredRows = computed(() => {
  if (activeLogType.value === 'login') {
    return filterLoginRows(loginRows.value)
  }
  if (activeLogType.value === 'operation') {
    return operationRows.value
  }
  const keyword = searchKeyword.value.trim().toLowerCase()
  return conversationRows.value.filter((row) => {
    if (!isConversationTimeInRange(row)) return false
    if (!keyword) return true
    return [row.account, row.title, row.contentPreview].some((value) =>
      String(value || '').toLowerCase().includes(keyword),
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
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)} ${text.slice(8, 10)}:${text.slice(10, 12)}:${text.slice(12, 14)}`
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
  if (!dateRange.value || dateRange.value.length !== 2) return true
  const time = String(value || '')
  if (!/^\d{14}$/.test(time)) return false
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
        String(value || '').toLowerCase().includes(keyword),
      )
    return matchedKeyword && isTimeInRange(row.logindate)
  })
}

const isConversationTimeInRange = (row: NormalizedConversationLog) => {
  if (!dateRange.value || dateRange.value.length !== 2) return true
  const time = row.updateTimeRaw || row.createTimeRaw
  if (!/^\d{14}$/.test(time)) return false
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
  if (!block || typeof block !== 'object') return null
  const record = block as Record<string, unknown>
  const type = record.type
  if (type !== 'text' && type !== 'thinking' && type !== 'tool_call' && type !== 'tool_result') return null
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
        if (toolResult) normalizedGroup.toolResult = toolResult
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
  if (!content) return []
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
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'span',
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
  if (activeLogType.value === type) return
  closeConversationDetail()
  activeLogType.value = type
  searchKeyword.value = ''
  currentPage.value = 1
  auditRoleFilter.value = ''

  if (type === 'operation') {
    operationSearchAccount.value = ''
    operationSearchType.value = ''
    operationSearchModule.value = ''
    dateRange.value = getDefaultOperationDateRange()
    operationRows.value = []
    loadOperationLogs()
  } else {
    dateRange.value = null
    loadLogs()
  }
}

const handleQuerySubmit = () => {
  closeConversationDetail()
  currentPage.value = 1
  if (activeLogType.value === 'operation') {
    loadOperationLogs()
  } else {
    loadLogs()
  }
}

const handleQueryReset = () => {
  closeConversationDetail()
  searchKeyword.value = ''
  currentPage.value = 1
  auditRoleFilter.value = ''
  if (activeLogType.value === 'operation') {
    operationSearchAccount.value = ''
    operationSearchType.value = ''
    operationSearchModule.value = ''
    dateRange.value = getDefaultOperationDateRange()
    loadOperationLogs()
  } else {
    dateRange.value = null
    loadLogs()
  }
}

const openConversationDetail = (row: NormalizedConversationLog) => {
  selectedConversation.value = row
  conversationDetailVisible.value = true
}

const openConversationDetailFromAudit = (auditRow: AuditLogRow) => {
  if (auditRow.sourceType === 'conversation' && auditRow.sourceData) {
    openConversationDetail(auditRow.sourceData as NormalizedConversationLog)
  }
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

// ========== Operation log helpers ==========
function getOpTypeColor(type: string) {
  const map: Record<string, string> = {
    CREATE: 'primary', UPDATE: 'warning', DELETE: 'danger',
    ASSIGN: 'success', AUTH: 'primary', AUDIT: 'info', APPLY: '',
  }
  return map[type] || 'info'
}

function getDefaultOperationDateRange(): [string, string] {
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }
  return [fmt(threeDaysAgo), fmt(now)]
}

async function loadOperationLogs() {
  loading.value = true
  try {
    const params: any = { limit: 100 }
    if (operationSearchAccount.value) params.user_account = operationSearchAccount.value
    if (operationSearchType.value) params.operation_type = operationSearchType.value
    if (operationSearchModule.value) params.operation_module = operationSearchModule.value
    if (dateRange.value?.[0]) params.start_time = dateRange.value[0] + '000000'
    if (dateRange.value?.[1]) params.end_time = dateRange.value[1] + '235959'
    operationRows.value = await operationLogApi.query(params)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作日志查询失败')
    operationRows.value = []
  } finally {
    loading.value = false
  }
}

async function handleExportOperation() {
  operationExporting.value = true
  try {
    const params: any = { limit: 10000 }
    if (operationSearchAccount.value) params.user_account = operationSearchAccount.value
    if (operationSearchType.value) params.operation_type = operationSearchType.value
    if (operationSearchModule.value) params.operation_module = operationSearchModule.value
    if (dateRange.value?.[0]) params.start_time = dateRange.value[0] + '000000'
    if (dateRange.value?.[1]) params.end_time = dateRange.value[1] + '235959'
    await operationLogApi.exportLog(params)
    ElMessage.success('导出成功')
  } catch (e: any) {
    ElMessage.error(e.message || '导出失败')
  } finally {
    operationExporting.value = false
  }
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
/* ==================== 页面级微调（大部分样式由 design-tokens.css 提供） ==================== */

.ds-page-wrapper {
  height: 100%;
  overflow-y: auto;
}

/* 修复 Element Plus date-picker 在 ds-filter-row 中的对齐 */
.ds-filter-row :deep(.el-date-editor) {
  flex-shrink: 0;
}

.ds-filter-row :deep(.el-input__wrapper) {
  border-radius: var(--ds-radius-input);
  box-shadow: none;
  border: 1px solid var(--ds-border);
  background: var(--ds-card);
  transition: border-color 0.2s;
}

.ds-filter-row :deep(.el-input__wrapper:hover) {
  border-color: var(--ds-border-hover);
}

.ds-filter-row :deep(.el-input__wrapper.is-focus) {
  border-color: var(--ds-primary-light);
  box-shadow: 0 0 0 3px var(--ds-primary-softer);
}

.ds-filter-row :deep(.el-range-input) {
  font-size: 13px;
  color: var(--ds-text);
}

.ds-filter-row :deep(.el-range-input::placeholder) {
  color: var(--ds-text-subtle);
}

.ds-filter-row :deep(.el-range-separator) {
  color: var(--ds-text-secondary);
  font-size: 12px;
  padding: 0 4px;
}

.ds-filter-row :deep(.el-range__icon),
.ds-filter-row :deep(.el-range__close-icon) {
  color: var(--ds-text-secondary);
}

/* 分页微调 */
:deep(.el-pagination.is-background .el-pager li:not(.is-disabled).is-active) {
  background-color: var(--ds-primary);
}

:deep(.el-pagination.is-background .el-pager li:not(.is-disabled):hover) {
  color: var(--ds-primary);
}

/* ==================== 对话详情抽屉 ==================== */
.conversation-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--ds-text);
  background: var(--ds-panel);
}

.conversation-detail__header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--ds-border);
  background: var(--ds-card);
}

.conversation-detail__header > div {
  min-width: 0;
}

.conversation-detail__header h2 {
  margin: 0;
  overflow: hidden;
  color: var(--ds-text);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-detail__header p {
  margin: 4px 0 0;
  overflow: hidden;
  color: var(--ds-text-secondary);
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-detail__close-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid var(--ds-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--ds-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.conversation-detail__close-btn:hover {
  background: var(--ds-bg);
  color: var(--ds-text);
}

.conversation-detail__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--ds-bg);
}

.conversation-detail__empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--ds-text-secondary);
  font-size: 14px;
}

/* 对话气泡 */
.conversation-bubble-row {
  display: flex;
}

.conversation-bubble {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 11px 14px;
  overflow: hidden;
  border: 1px solid var(--ds-border);
  border-radius: 14px;
  color: var(--ds-text);
  background: var(--ds-card);
}

.conversation-bubble-row--user .conversation-bubble {
  border-color: color-mix(in srgb, var(--ds-primary) 28%, var(--ds-border));
  background: color-mix(in srgb, var(--ds-primary) 9%, var(--ds-card));
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

.conversation-bubble__content--empty {
  color: var(--ds-text-subtle);
}

.conversation-insight-list + .conversation-bubble__content {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ds-border);
}

/* 思考/工具 details */
.conversation-insight-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-insight {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--ds-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--ds-card) 82%, transparent);
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
  color: var(--ds-text);
  font-size: 13px;
  font-weight: 700;
}

.conversation-insight summary::-webkit-details-marker {
  display: none;
}

.conversation-insight summary::before {
  content: '';
  width: 7px;
  height: 7px;
  flex-shrink: 0;
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
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-insight summary em {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--ds-text-secondary);
  background: var(--ds-panel-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 650;
}

.conversation-insight--thinking summary {
  color: var(--ds-primary);
  background: var(--ds-primary-softer);
}

.conversation-insight--tool summary {
  color: var(--ds-success);
  background: var(--ds-success-soft);
}

.conversation-insight__body {
  min-width: 0;
  max-width: 100%;
  padding: 11px;
  border-top: 1px solid var(--ds-border);
  color: var(--ds-text);
  background: var(--ds-card);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.conversation-insight__body :deep(pre),
.conversation-tool-args pre {
  max-width: 100%;
  margin: 8px 0 0;
  overflow-x: auto;
  padding: 10px;
  border-radius: 8px;
  color: var(--ds-text);
  background: var(--ds-panel-muted);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.conversation-tool-args,
.conversation-tool-result {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-tool-result {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--ds-border);
}

.conversation-tool-args strong,
.conversation-tool-result strong {
  color: var(--ds-text-secondary);
  font-size: 12px;
  font-weight: 760;
}

/* ==================== 全局 drawer 样式覆盖 ==================== */
:deep(.el-drawer) {
  height: 100vh;
  height: 100dvh;
  max-width: 100vw;
  pointer-events: auto;
}

:deep(.el-drawer__body) {
  height: 100%;
  padding: 0;
  background: var(--ds-card);
  overflow: hidden;
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .ds-filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .ds-filter-row .ds-search-input,
  .ds-filter-row .ds-select {
    width: 100%;
  }

  .ds-filter-row :deep(.el-date-editor) {
    width: 100% !important;
  }

  .ds-table-wrap {
    overflow-x: auto;
  }
}
</style>
