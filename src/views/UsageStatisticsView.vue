<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import {
  usageStatisticsApi,
  type UsageFilters,
  type UsageLogItem,
  type UsageOptionsResponse,
  type UsageStatsResponse,
  type UsageToolLogItem,
} from '@/api/usageStatistics'

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

type RankingTab = 'model' | 'assistant' | 'user' | 'skill' | 'mcp' | 'tool'
type DetailTab = 'llm' | 'tool'

const pageLoading = ref(false)
const statsLoading = ref(false)
const llmLoading = ref(false)
const toolLoading = ref(false)
const stats = ref<UsageStatsResponse | null>(null)
const options = ref<UsageOptionsResponse>({
  status: 'success',
  sources: [],
  models: [],
  roles: [],
  tool_types: [],
  skills: [],
  mcps: [],
})

const rankingTab = ref<RankingTab>('model')
const detailTab = ref<DetailTab>('llm')
const llmLogs = ref<UsageLogItem[]>([])
const toolLogs = ref<UsageToolLogItem[]>([])
const llmTotal = ref(0)
const toolTotal = ref(0)

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultDateRange(): [string, string] {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - 6)
  return [formatDate(start), formatDate(end)]
}

const dateRange = ref<[string, string]>(defaultDateRange())
const filters = reactive({
  source: '',
  model_name: '',
  username: '',
  role_code: '',
})
const llmQuery = reactive({ page: 1, page_size: 20, status: '' })
const toolQuery = reactive({ page: 1, page_size: 20, status: '', tool_type: '' })

const overview = computed(() => stats.value?.overview)
const maxTrendCalls = computed(() =>
  Math.max(1, ...(stats.value?.trend.map((item) => Number(item.calls) || 0) || [1])),
)
const maxSourceCalls = computed(() =>
  Math.max(1, ...(stats.value?.source_dist.map((item) => Number(item.calls) || 0) || [1])),
)
const maxChannelCalls = computed(() =>
  Math.max(1, ...(stats.value?.channel_dist.map((item) => Number(item.calls) || 0) || [1])),
)

function globalFilters(): UsageFilters {
  return {
    start: dateRange.value?.[0],
    end: dateRange.value?.[1],
    source: filters.source,
    model_name: filters.model_name,
    username: filters.username.trim(),
    role_code: filters.role_code,
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error) {
    const response = (error as { response?: { data?: { message?: string; detail?: string } } })
      .response
    return response?.data?.message || response?.data?.detail || '请求失败'
  }
  return '请求失败'
}

async function loadOptions() {
  options.value = await usageStatisticsApi.options()
}

async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await usageStatisticsApi.stats(globalFilters())
  } finally {
    statsLoading.value = false
  }
}

async function loadLlmLogs() {
  llmLoading.value = true
  try {
    const response = await usageStatisticsApi.logs({
      ...globalFilters(),
      page: llmQuery.page,
      page_size: llmQuery.page_size,
      status: llmQuery.status,
    })
    llmLogs.value = response.data || []
    llmTotal.value = response.total || 0
  } finally {
    llmLoading.value = false
  }
}

async function loadToolLogs() {
  toolLoading.value = true
  try {
    const response = await usageStatisticsApi.toolLogs({
      ...globalFilters(),
      page: toolQuery.page,
      page_size: toolQuery.page_size,
      status: toolQuery.status,
      tool_type: toolQuery.tool_type,
    })
    toolLogs.value = response.data || []
    toolTotal.value = response.total || 0
  } finally {
    toolLoading.value = false
  }
}

async function runRequests(requests: Promise<unknown>[], failurePrefix: string) {
  const results = await Promise.allSettled(requests)
  const failure = results.find((result) => result.status === 'rejected')
  if (failure?.status === 'rejected') {
    ElMessage.error(`${failurePrefix}：${errorMessage(failure.reason)}`)
  }
}

async function queryAll() {
  llmQuery.page = 1
  toolQuery.page = 1
  await runRequests([loadStats(), loadLlmLogs(), loadToolLogs()], '用量数据加载失败')
}

async function handleReset() {
  dateRange.value = defaultDateRange()
  filters.source = ''
  filters.model_name = ''
  filters.username = ''
  filters.role_code = ''
  llmQuery.status = ''
  toolQuery.status = ''
  toolQuery.tool_type = ''
  await queryAll()
}

async function handleLlmPageChange(page: number) {
  llmQuery.page = page
  await runRequests([loadLlmLogs()], 'LLM 明细加载失败')
}

async function handleLlmSizeChange(size: number) {
  llmQuery.page_size = size
  llmQuery.page = 1
  await runRequests([loadLlmLogs()], 'LLM 明细加载失败')
}

async function handleToolPageChange(page: number) {
  toolQuery.page = page
  await runRequests([loadToolLogs()], '工具明细加载失败')
}

async function handleToolSizeChange(size: number) {
  toolQuery.page_size = size
  toolQuery.page = 1
  await runRequests([loadToolLogs()], '工具明细加载失败')
}

function formatNumber(value: number | null | undefined): string {
  return Number(value || 0).toLocaleString('zh-CN')
}

function formatCompact(value: number | null | undefined): string {
  const number = Number(value || 0)
  if (number >= 100_000_000) return `${(number / 100_000_000).toFixed(2)}亿`
  if (number >= 10_000) return `${(number / 10_000).toFixed(2)}万`
  return formatNumber(number)
}

function formatCost(value: number | null | undefined): string {
  return `¥${Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`
}

function formatPercent(value: number | null | undefined): string {
  return `${(Number(value || 0) * 100).toFixed(1)}%`
}

function formatLatency(value: number | null | undefined): string {
  const milliseconds = Number(value || 0)
  return milliseconds >= 1000
    ? `${(milliseconds / 1000).toFixed(2)} 秒`
    : `${formatNumber(milliseconds)} ms`
}

function shortDate(value: string): string {
  return value.length >= 10 ? value.slice(5, 10) : value
}

function safeBarPercent(value: number, max: number, minimum = 4): string {
  if (!value) return '0%'
  return `${Math.max(minimum, Math.min(100, (value / max) * 100))}%`
}

function statusTagType(status: string): 'success' | 'danger' | 'info' {
  if (status === 'success') return 'success'
  if (status === 'error') return 'danger'
  return 'info'
}

function statusLabel(status: string): string {
  return status === 'success' ? '成功' : status === 'error' ? '失败' : status || '-'
}

const sourceLabel = (source: string, label?: string | null) =>
  label || options.value.sources.find((item) => item.source === source)?.label || source || '-'

onMounted(async () => {
  pageLoading.value = true
  await runRequests(
    [loadOptions(), loadStats(), loadLlmLogs(), loadToolLogs()],
    '用量统计初始化失败',
  )
  pageLoading.value = false
})
</script>

<template>
  <section class="usage-statistics" :class="{ 'usage-statistics--embedded': embedded }">
    <div class="usage-toolbar" aria-label="用量统计筛选条件">
      <div class="usage-toolbar__filters">
        <el-date-picker
          v-model="dateRange"
          class="usage-date-range"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          :clearable="false"
        />
        <el-select v-model="filters.source" class="usage-filter" placeholder="全部来源" clearable>
          <el-option
            v-for="item in options.sources"
            :key="item.source"
            :label="item.label"
            :value="item.source"
          />
        </el-select>
        <el-select
          v-model="filters.model_name"
          class="usage-filter usage-filter--model"
          placeholder="全部模型"
          clearable
          filterable
        >
          <el-option
            v-for="item in options.models"
            :key="item.name"
            :label="item.channel ? `${item.name} · ${item.channel}` : item.name"
            :value="item.name"
          />
        </el-select>
        <el-select
          v-model="filters.role_code"
          class="usage-filter"
          placeholder="全部智能体"
          clearable
          filterable
        >
          <el-option
            v-for="item in options.roles"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
        <el-input
          v-model="filters.username"
          class="usage-filter usage-filter--username"
          placeholder="用户名称"
          clearable
          @keyup.enter="queryAll"
        />
      </div>
      <div class="usage-toolbar__actions">
        <el-button type="primary" :icon="Search" :loading="pageLoading" @click="queryAll"
          >查询</el-button
        >
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </div>
    </div>

    <div v-loading="statsLoading || pageLoading" class="usage-dashboard">
      <div class="usage-kpis">
        <article class="usage-kpi">
          <span class="usage-kpi__label">总调用次数</span>
          <strong>{{ formatNumber(overview?.total_calls) }}</strong>
          <span class="usage-kpi__hint">所选周期内 LLM 调用</span>
        </article>
        <article class="usage-kpi usage-kpi--primary">
          <span class="usage-kpi__label">总 Token</span>
          <strong>{{ formatCompact(overview?.total_tokens) }}</strong>
          <span class="usage-kpi__hint">
            输入 {{ formatCompact(overview?.input_tokens) }} / 输出
            {{ formatCompact(overview?.output_tokens) }}
          </span>
        </article>
        <!-- 总费用暂不展示
        <article class="usage-kpi usage-kpi--cost">
          <span class="usage-kpi__label">总费用</span>
          <strong>{{ formatCost(overview?.total_cost) }}</strong>
          <span class="usage-kpi__hint">按调用时模型单价快照计算</span>
        </article>
        -->
        <article class="usage-kpi usage-kpi--latency">
          <span class="usage-kpi__label">平均延迟</span>
          <strong>{{ formatLatency(overview?.avg_latency_ms) }}</strong>
          <span class="usage-kpi__hint">单次 LLM 请求平均耗时</span>
        </article>
        <article class="usage-kpi usage-kpi--success">
          <span class="usage-kpi__label">成功率</span>
          <strong>{{ formatPercent(overview?.success_rate) }}</strong>
          <span class="usage-kpi__hint">成功调用占总调用比例</span>
        </article>
      </div>

      <div class="usage-overview-grid">
        <article class="usage-card usage-card--trend">
          <header class="usage-card__header">
            <div>
              <h2>调用趋势</h2>
              <p>{{ stats?.start || dateRange[0] }} 至 {{ stats?.end || dateRange[1] }}</p>
            </div>
            <span class="usage-card__unit">调用次数 / 日</span>
          </header>
          <div
            v-if="stats?.trend.length"
            class="usage-trend"
            role="img"
            aria-label="每日调用次数柱状图"
          >
            <div v-for="item in stats.trend" :key="item.date" class="usage-trend__item">
              <span class="usage-trend__value">{{ formatCompact(item.calls) }}</span>
              <div class="usage-trend__track">
                <div
                  class="usage-trend__bar"
                  :style="{ height: safeBarPercent(item.calls, maxTrendCalls, 3) }"
                  :title="`${item.date}：${formatNumber(item.calls)} 次，${formatNumber(item.input_tokens + item.output_tokens)} Token`"
                ></div>
              </div>
              <span class="usage-trend__date">{{ shortDate(item.date) }}</span>
            </div>
          </div>
          <el-empty v-else description="暂无趋势数据" :image-size="72" />
        </article>

        <div class="usage-distribution-grid">
          <article class="usage-card usage-distribution">
            <header class="usage-card__header"><h2>来源分布</h2></header>
            <div v-if="stats?.source_dist.length" class="usage-progress-list">
              <div v-for="item in stats.source_dist" :key="item.source" class="usage-progress-item">
                <div class="usage-progress-item__meta">
                  <span>{{ sourceLabel(item.source, item.label) }}</span>
                  <strong>{{ formatNumber(item.calls) }} 次</strong>
                </div>
                <div class="usage-progress-item__track">
                  <span :style="{ width: safeBarPercent(item.calls, maxSourceCalls, 2) }"></span>
                </div>
                <small>{{ formatCompact(item.tokens) }} Token</small>
              </div>
            </div>
            <el-empty v-else description="暂无来源数据" :image-size="56" />
          </article>
          <article class="usage-card usage-distribution">
            <header class="usage-card__header"><h2>服务商渠道</h2></header>
            <div v-if="stats?.channel_dist.length" class="usage-progress-list">
              <div
                v-for="item in stats.channel_dist"
                :key="item.channel"
                class="usage-progress-item"
              >
                <div class="usage-progress-item__meta">
                  <span>{{ item.channel || '未标记渠道' }}</span>
                  <strong>{{ formatNumber(item.calls) }} 次</strong>
                </div>
                <div class="usage-progress-item__track usage-progress-item__track--channel">
                  <span :style="{ width: safeBarPercent(item.calls, maxChannelCalls, 2) }"></span>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无渠道数据" :image-size="56" />
          </article>
        </div>
      </div>

      <article class="usage-card usage-ranking">
        <header class="usage-card__header usage-card__header--ranking">
          <div>
            <h2>用量排行</h2>
            <p>按当前筛选条件汇总</p>
          </div>
        </header>
        <el-tabs v-model="rankingTab" class="usage-tabs">
          <el-tab-pane label="模型" name="model">
            <el-table :data="stats?.model_rank || []" stripe empty-text="暂无模型排行数据">
              <el-table-column type="index" label="排名" width="70" />
              <el-table-column prop="model_name" label="模型" min-width="180" />
              <el-table-column prop="channel" label="渠道" min-width="120" />
              <el-table-column label="调用次数" min-width="110" align="right">
                <template #default="{ row }">{{ formatNumber(row.calls) }}</template>
              </el-table-column>
              <el-table-column label="总 Token" min-width="120" align="right">
                <template #default="{ row }">{{
                  formatCompact(row.input_tokens + row.output_tokens)
                }}</template>
              </el-table-column>
              <el-table-column label="费用" min-width="110" align="right">
                <template #default="{ row }">{{ formatCost(row.cost) }}</template>
              </el-table-column>
              <el-table-column label="平均延迟" min-width="110" align="right">
                <template #default="{ row }">{{ formatLatency(row.avg_latency_ms) }}</template>
              </el-table-column>
              <el-table-column label="成功率" min-width="100" align="right">
                <template #default="{ row }">{{ formatPercent(row.success_rate) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="智能体" name="assistant">
            <el-table :data="stats?.assistant_rank || []" stripe empty-text="暂无智能体排行数据">
              <el-table-column type="index" label="排名" width="70" />
              <el-table-column prop="role_name" label="智能体" min-width="180" />
              <el-table-column prop="role_code" label="角色编码" min-width="140" />
              <el-table-column label="任务数" min-width="100" align="right"
                ><template #default="{ row }">{{
                  formatNumber(row.calls)
                }}</template></el-table-column
              >
              <el-table-column label="总 Token" min-width="120" align="right"
                ><template #default="{ row }">{{
                  formatCompact(row.input_tokens + row.output_tokens)
                }}</template></el-table-column
              >
              <el-table-column label="费用" min-width="110" align="right"
                ><template #default="{ row }">{{ formatCost(row.cost) }}</template></el-table-column
              >
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="用户" name="user">
            <el-table :data="stats?.user_rank || []" stripe empty-text="暂无用户排行数据">
              <el-table-column type="index" label="排名" width="70" />
              <el-table-column prop="username" label="用户" min-width="180" />
              <el-table-column label="调用次数" min-width="110" align="right"
                ><template #default="{ row }">{{
                  formatNumber(row.calls)
                }}</template></el-table-column
              >
              <el-table-column label="输入 Token" min-width="120" align="right"
                ><template #default="{ row }">{{
                  formatCompact(row.input_tokens)
                }}</template></el-table-column
              >
              <el-table-column label="输出 Token" min-width="120" align="right"
                ><template #default="{ row }">{{
                  formatCompact(row.output_tokens)
                }}</template></el-table-column
              >
              <el-table-column label="费用" min-width="110" align="right"
                ><template #default="{ row }">{{ formatCost(row.cost) }}</template></el-table-column
              >
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="技能" name="skill">
            <el-table :data="stats?.skill_rank || []" stripe empty-text="暂无技能排行数据">
              <el-table-column type="index" label="排名" width="70" />
              <el-table-column prop="skill" label="技能" min-width="220" />
              <el-table-column label="调用次数" min-width="110" align="right"
                ><template #default="{ row }">{{
                  formatNumber(row.calls)
                }}</template></el-table-column
              >
              <el-table-column label="成功率" min-width="100" align="right"
                ><template #default="{ row }">{{
                  formatPercent(row.success_rate)
                }}</template></el-table-column
              >
              <el-table-column label="平均耗时" min-width="110" align="right"
                ><template #default="{ row }">{{
                  formatLatency(row.avg_latency_ms)
                }}</template></el-table-column
              >
              <el-table-column prop="last_used_at" label="最近使用" min-width="180" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="MCP" name="mcp">
            <el-table :data="stats?.mcp_rank || []" stripe empty-text="暂无 MCP 排行数据">
              <el-table-column type="index" label="排名" width="70" />
              <el-table-column prop="mcp_name" label="MCP 服务" min-width="160" />
              <el-table-column prop="tool_name" label="工具" min-width="160" />
              <el-table-column label="调用次数" min-width="110" align="right"
                ><template #default="{ row }">{{
                  formatNumber(row.calls)
                }}</template></el-table-column
              >
              <el-table-column label="成功率" min-width="100" align="right"
                ><template #default="{ row }">{{
                  formatPercent(row.success_rate)
                }}</template></el-table-column
              >
              <el-table-column label="平均耗时" min-width="110" align="right"
                ><template #default="{ row }">{{
                  formatLatency(row.avg_latency_ms)
                }}</template></el-table-column
              >
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="内置工具" name="tool">
            <el-table :data="stats?.tool_rank || []" stripe empty-text="暂无内置工具排行数据">
              <el-table-column type="index" label="排名" width="70" />
              <el-table-column prop="tool" label="工具" min-width="220" />
              <el-table-column label="调用次数" min-width="110" align="right"
                ><template #default="{ row }">{{
                  formatNumber(row.calls)
                }}</template></el-table-column
              >
              <el-table-column label="成功率" min-width="100" align="right"
                ><template #default="{ row }">{{
                  formatPercent(row.success_rate)
                }}</template></el-table-column
              >
              <el-table-column label="平均耗时" min-width="110" align="right"
                ><template #default="{ row }">{{
                  formatLatency(row.avg_latency_ms)
                }}</template></el-table-column
              >
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </article>

      <article class="usage-card usage-details">
        <el-tabs v-model="detailTab" class="usage-tabs usage-detail-tabs">
          <el-tab-pane label="LLM 调用明细" name="llm">
            <div class="usage-detail-toolbar">
              <el-select
                v-model="llmQuery.status"
                class="usage-detail-filter"
                placeholder="全部状态"
                clearable
              >
                <el-option label="成功" value="success" />
                <el-option label="失败" value="error" />
              </el-select>
              <el-button
                type="primary"
                :icon="Search"
                :loading="llmLoading"
                @click="handleLlmPageChange(1)"
                >筛选明细</el-button
              >
              <span class="usage-detail-count">共 {{ formatNumber(llmTotal) }} 条</span>
            </div>
            <el-table v-loading="llmLoading" :data="llmLogs" stripe empty-text="暂无 LLM 调用明细">
              <el-table-column prop="created_at" label="调用时间" width="168" />
              <el-table-column label="来源" width="110"
                ><template #default="{ row }">{{
                  sourceLabel(row.source, row.source_label)
                }}</template></el-table-column
              >
              <el-table-column prop="username" label="用户" min-width="110" show-overflow-tooltip />
              <el-table-column
                prop="model_name"
                label="模型"
                min-width="170"
                show-overflow-tooltip
              />
              <el-table-column prop="channel" label="渠道" min-width="110" show-overflow-tooltip />
              <el-table-column prop="call_type" label="类型" width="90" />
              <el-table-column label="输入/输出 Token" width="150" align="right"
                ><template #default="{ row }"
                  >{{ formatNumber(row.input_tokens) }} /
                  {{ formatNumber(row.output_tokens) }}</template
                ></el-table-column
              >
              <el-table-column label="费用" width="105" align="right"
                ><template #default="{ row }">{{ formatCost(row.cost) }}</template></el-table-column
              >
              <el-table-column label="耗时" width="105" align="right"
                ><template #default="{ row }">{{
                  formatLatency(row.latency_ms)
                }}</template></el-table-column
              >
              <el-table-column label="状态" width="90" align="center"
                ><template #default="{ row }"
                  ><el-tag size="small" :type="statusTagType(row.status)">{{
                    statusLabel(row.status)
                  }}</el-tag></template
                ></el-table-column
              >
              <el-table-column
                prop="error_msg"
                label="错误信息"
                min-width="160"
                show-overflow-tooltip
              />
            </el-table>
            <el-pagination
              v-if="llmTotal > 0"
              class="usage-pagination"
              :current-page="llmQuery.page"
              :page-size="llmQuery.page_size"
              :page-sizes="[10, 20, 50, 100]"
              :total="llmTotal"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="handleLlmPageChange"
              @size-change="handleLlmSizeChange"
            />
          </el-tab-pane>
          <el-tab-pane label="工具调用明细" name="tool">
            <div class="usage-detail-toolbar">
              <el-select
                v-model="toolQuery.tool_type"
                class="usage-detail-filter"
                placeholder="全部工具类型"
                clearable
              >
                <el-option
                  v-for="item in options.tool_types"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
              <el-select
                v-model="toolQuery.status"
                class="usage-detail-filter"
                placeholder="全部状态"
                clearable
              >
                <el-option label="成功" value="success" />
                <el-option label="失败" value="error" />
              </el-select>
              <el-button
                type="primary"
                :icon="Search"
                :loading="toolLoading"
                @click="handleToolPageChange(1)"
                >筛选明细</el-button
              >
              <span class="usage-detail-count">共 {{ formatNumber(toolTotal) }} 条</span>
            </div>
            <el-table v-loading="toolLoading" :data="toolLogs" stripe empty-text="暂无工具调用明细">
              <el-table-column prop="created_at" label="调用时间" width="168" />
              <el-table-column label="来源" width="110"
                ><template #default="{ row }">{{
                  sourceLabel(row.source, row.source_label)
                }}</template></el-table-column
              >
              <el-table-column prop="username" label="用户" min-width="110" show-overflow-tooltip />
              <el-table-column prop="tool_type" label="工具类型" width="105" />
              <el-table-column prop="action" label="动作" min-width="130" show-overflow-tooltip />
              <el-table-column
                prop="tool_name"
                label="工具名称"
                min-width="180"
                show-overflow-tooltip
              />
              <el-table-column
                prop="mcp_identifier"
                label="MCP 标识"
                min-width="120"
                show-overflow-tooltip
              />
              <el-table-column label="耗时" width="105" align="right"
                ><template #default="{ row }">{{
                  formatLatency(row.latency_ms)
                }}</template></el-table-column
              >
              <el-table-column label="状态" width="90" align="center"
                ><template #default="{ row }"
                  ><el-tag size="small" :type="statusTagType(row.status)">{{
                    statusLabel(row.status)
                  }}</el-tag></template
                ></el-table-column
              >
              <el-table-column
                prop="error_msg"
                label="错误信息"
                min-width="160"
                show-overflow-tooltip
              />
            </el-table>
            <el-pagination
              v-if="toolTotal > 0"
              class="usage-pagination"
              :current-page="toolQuery.page"
              :page-size="toolQuery.page_size"
              :page-sizes="[10, 20, 50, 100]"
              :total="toolTotal"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="handleToolPageChange"
              @size-change="handleToolSizeChange"
            />
          </el-tab-pane>
        </el-tabs>
      </article>
    </div>
  </section>
</template>

<style scoped>
.usage-statistics {
  --usage-blue: var(--app-primary, #4f7cff);
  --usage-blue-soft: var(--app-primary-soft, rgba(79, 124, 255, 0.1));
  color: var(--app-text, #1f2937);
}

.usage-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 14px;
  background: var(--app-panel, #fff);
}

.usage-toolbar__filters,
.usage-toolbar__actions,
.usage-detail-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.usage-toolbar__filters {
  flex: 1;
  min-width: 0;
  gap: 8px;
  flex-wrap: nowrap;
}
.usage-toolbar__actions {
  flex-shrink: 0;
}
.usage-date-range {
  width: 200px;
  flex: 0 0 200px;
}
.usage-filter {
  width: 116px;
  flex: 0 1 116px;
}
.usage-filter--model {
  width: 150px;
  flex-basis: 150px;
}
.usage-filter--username {
  width: 125px;
  flex-basis: 125px;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  min-height: 38px;
  border-radius: 9px;
  background: var(--app-panel-muted, #f7f8fa);
  box-shadow: 0 0 0 1px var(--app-border, #e5e7eb) inset;
}

:deep(.el-input__wrapper:hover),
:deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--app-border-hover, #cbd5e1) inset;
}

:deep(.el-button) {
  min-height: 38px;
  border-radius: 9px;
  font-weight: 600;
}

.usage-dashboard {
  min-height: 360px;
}
.usage-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.usage-kpi {
  position: relative;
  min-width: 0;
  padding: 18px;
  overflow: hidden;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 14px;
  background: var(--app-panel, #fff);
  box-shadow: 0 4px 16px rgba(24, 39, 75, 0.04);
}

.usage-kpi::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  content: '';
  background: #77849a;
}

.usage-kpi--primary::before {
  background: var(--usage-blue);
}
.usage-kpi--cost::before {
  background: #8b5cf6;
}
.usage-kpi--latency::before {
  background: #f59e0b;
}
.usage-kpi--success::before {
  background: #10b981;
}
.usage-kpi__label,
.usage-kpi__hint {
  display: block;
  color: var(--app-text-muted, #64748b);
}
.usage-kpi__label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}
.usage-kpi strong {
  display: block;
  overflow: hidden;
  color: var(--app-text, #1f2937);
  font-size: 25px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.usage-kpi__hint {
  margin-top: 7px;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.usage-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.usage-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 14px;
  background: var(--app-panel, #fff);
  box-shadow: 0 4px 16px rgba(24, 39, 75, 0.04);
}

.usage-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.usage-card__header h2 {
  margin: 0;
  color: var(--app-text, #1f2937);
  font-size: 16px;
  font-weight: 700;
}
.usage-card__header p {
  margin: 5px 0 0;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
}
.usage-card__unit {
  color: var(--app-text-subtle, #94a3b8);
  font-size: 11px;
}
.usage-trend {
  display: flex;
  gap: 8px;
  height: 210px;
  min-width: 0;
  overflow-x: auto;
  padding: 4px 2px 0;
}
.usage-trend__item {
  display: flex;
  flex: 1 0 42px;
  min-width: 42px;
  flex-direction: column;
  align-items: center;
}
.usage-trend__value {
  height: 22px;
  color: var(--app-text-muted, #64748b);
  font-size: 10px;
}
.usage-trend__track {
  display: flex;
  flex: 1;
  width: min(28px, 70%);
  align-items: flex-end;
  border-radius: 7px 7px 3px 3px;
  background: var(--app-panel-muted, #f7f8fa);
}
.usage-trend__bar {
  width: 100%;
  min-height: 3px;
  border-radius: 7px 7px 3px 3px;
  background: linear-gradient(180deg, #6a91ff 0%, var(--usage-blue) 100%);
  transition: opacity 0.2s ease;
}
.usage-trend__bar:hover {
  opacity: 0.78;
}
.usage-trend__date {
  margin-top: 8px;
  color: var(--app-text-subtle, #94a3b8);
  font-size: 10px;
  white-space: nowrap;
}
.usage-distribution-grid {
  display: grid;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.usage-distribution {
  padding: 15px 16px;
}
.usage-distribution .usage-card__header {
  margin-bottom: 10px;
}
.usage-progress-list {
  display: grid;
  gap: 9px;
  max-height: 134px;
  overflow-y: auto;
  padding-right: 3px;
}
.usage-progress-item__meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
}
.usage-progress-item__meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.usage-progress-item__meta strong {
  color: var(--app-text, #1f2937);
  font-weight: 650;
  white-space: nowrap;
}
.usage-progress-item__track {
  height: 6px;
  margin-top: 5px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--app-panel-muted, #f1f5f9);
}
.usage-progress-item__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--usage-blue);
}
.usage-progress-item__track--channel span {
  background: #8b5cf6;
}
.usage-progress-item small {
  display: block;
  margin-top: 3px;
  color: var(--app-text-subtle, #94a3b8);
  font-size: 10px;
}
.usage-ranking {
  margin-bottom: 16px;
}
.usage-card__header--ranking {
  margin-bottom: 0;
}
.usage-tabs :deep(.el-tabs__header) {
  margin-bottom: 14px;
}
.usage-tabs :deep(.el-tabs__item) {
  height: 38px;
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
}
.usage-tabs :deep(.el-tabs__item.is-active) {
  color: var(--usage-blue);
  font-weight: 650;
}
.usage-tabs :deep(.el-tabs__active-bar) {
  background: var(--usage-blue);
}
.usage-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: var(--app-border, #e5e7eb);
}
.usage-tabs :deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: var(--app-panel-muted, #f7f8fa);
  --el-table-border-color: var(--app-border, #e5e7eb);
  --el-table-text-color: var(--app-text, #1f2937);
  --el-table-header-text-color: var(--app-text-muted, #64748b);
}
.usage-tabs :deep(.el-table th.el-table__cell) {
  font-size: 12px;
  font-weight: 650;
}
.usage-tabs :deep(.el-table td.el-table__cell) {
  font-size: 12px;
}
.usage-detail-toolbar {
  margin-bottom: 14px;
}
.usage-detail-filter {
  width: 145px;
}
.usage-detail-count {
  margin-left: auto;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
}
.usage-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 1280px) {
  .usage-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .usage-overview-grid {
    grid-template-columns: 1fr;
  }
  .usage-distribution-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
  }
}

@media (max-width: 768px) {
  .usage-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .usage-toolbar__filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .usage-date-range,
  .usage-filter,
  .usage-filter--model,
  .usage-filter--username {
    width: 100%;
  }
  .usage-date-range {
    grid-column: 1 / -1;
  }
  .usage-toolbar__actions :deep(.el-button) {
    flex: 1;
  }
  .usage-kpis {
    grid-template-columns: 1fr 1fr;
  }
  .usage-distribution-grid {
    grid-template-columns: 1fr;
  }
  .usage-pagination {
    justify-content: flex-start;
    overflow-x: auto;
  }
}

@media (max-width: 480px) {
  .usage-toolbar__filters,
  .usage-kpis {
    grid-template-columns: 1fr;
  }
  .usage-date-range {
    grid-column: auto;
  }
  .usage-card,
  .usage-kpi,
  .usage-toolbar {
    padding: 14px;
  }
  .usage-kpi strong {
    font-size: 22px;
  }
  .usage-detail-count {
    width: 100%;
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .usage-trend__bar {
    transition: none;
  }
}
</style>
