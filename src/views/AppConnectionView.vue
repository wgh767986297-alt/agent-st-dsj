<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  Clock,
  List,
  ArrowLeft,
  VideoPlay,
  View,
} from '@element-plus/icons-vue'
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  runTask,
  listRunLogs,
  deleteRunLog,
  getRunLog,
  type ScheduledTask,
  type ScheduledTaskListParams,
  type TaskRunLog,
  type CreateTaskPayload,
  type UpdateTaskPayload,
} from '@/api/scheduledTask'
import { getCachedSkillItems, preloadSkillsCache, type SkillApiItem } from '@/api/skillsMarket'

const router = useRouter()
const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const isEmbedded = computed(() => props.embedded)
const loading = ref(false)
const logLoading = ref(false)
const activeTab = ref<'tasks' | 'logs'>('tasks')

// ==================== 统计 ====================
const stats = reactive({
  totalTasks: 0,
  activeTasks: 0,
  totalLogs: 0,
})

// ==================== 任务列表 ====================
const taskList = ref<ScheduledTask[]>([])
const taskTotal = ref(0)
const taskPage = ref(1)
const taskPageSize = ref(10)

const taskFilters = reactive<ScheduledTaskListParams>({
  keyword: '',
  enabled: undefined,
  repeat: '',
  page: 1,
  page_size: 10,
})

// ==================== 日志列表 ====================
const logList = ref<TaskRunLog[]>([])
const logTotal = ref(0)
const logPage = ref(1)
const logPageSize = ref(10)
const logFilters = reactive({
  task_name: '',
  page: 1,
  page_size: 10,
})

// ==================== 创建/编辑弹窗 ====================
const modalVisible = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const modalLoading = ref(false)
const editingTaskName = ref('')
const formData = reactive<CreateTaskPayload>({
  name: '',
  prompt: '',
  description: '',
  enabled: true,
  repeat: 'daily',
  schedule: '09:00',
  max_delay_hours: 6,
})

// ==================== 间隔执行 ====================
const intervalMinutes = computed({
  get: () => {
    const n = parseInt(formData.schedule || '', 10)
    return Number.isFinite(n) && n > 0 ? n : 30
  },
  set: (val: number | undefined) => {
    formData.schedule = String(val ?? 30)
  },
})

watch(
  () => formData.repeat,
  (val) => {
    if (val === 'interval') {
      formData.schedule = '30'
    } else if (!formData.schedule?.includes(':')) {
      formData.schedule = '09:00'
    }
  },
)

// ==================== 技能选择 ====================
const skillPickerVisible = ref(false)
const selectedSkills = ref<SkillApiItem[]>([])
const skillSearchQuery = ref('')
const allSkills = ref<SkillApiItem[]>([])

const filteredSkillGroups = computed(() => {
  const query = skillSearchQuery.value.trim().toLowerCase()
  let filtered = allSkills.value
  if (query) {
    filtered = allSkills.value.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(query) ||
        (s.description || '').toLowerCase().includes(query) ||
        (s.category || '').toLowerCase().includes(query),
    )
  }
  const groups: Record<string, SkillApiItem[]> = {}
  for (const skill of filtered) {
    const cat = skill.category || '未分类'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(skill)
  }
  return Object.entries(groups).map(([category, skills]) => ({ category, skills }))
})

const isSkillSelected = (skill: SkillApiItem) =>
  selectedSkills.value.some((s) => s.name === skill.name)

const toggleSkill = (skill: SkillApiItem) => {
  if (isSkillSelected(skill)) {
    selectedSkills.value = selectedSkills.value.filter((s) => s.name !== skill.name)
  } else {
    selectedSkills.value.push(skill)
  }
}

const loadSkills = async () => {
  const cached = getCachedSkillItems()
  if (cached.length > 0) {
    allSkills.value = cached
    return
  }
  try {
    allSkills.value = await preloadSkillsCache()
  } catch {
    allSkills.value = []
  }
}

const openSkillPicker = async () => {
  skillSearchQuery.value = ''
  skillPickerVisible.value = true
  if (allSkills.value.length === 0) {
    await loadSkills()
  }
}

// ==================== 日志详情弹窗 ====================
const logDetailVisible = ref(false)
const logDetailContent = ref('')
const logDetailTitle = ref('')

// ==================== 执行确认弹窗 ====================
const runResultVisible = ref(false)
const runResultContent = ref('')
const runResultTitle = ref('')

// 当前正在执行的任务名称（用于按钮 loading 动画和互斥）
const runningTaskName = ref<string | null>(null)

// ==================== 数据加载 ====================
const fetchTasks = async () => {
  loading.value = true
  try {
    const params: ScheduledTaskListParams = {
      ...taskFilters,
      page: taskPage.value,
      page_size: taskPageSize.value,
    }
    const res = await listTasks(params)
    taskList.value = res.data.list || []
    taskTotal.value = res.data.total || 0
    stats.totalTasks = res.data.total || 0
    stats.activeTasks = (res.data.list || []).filter((t) => t.enabled).length
  } catch (err: any) {
    taskList.value = []
    taskTotal.value = 0
    ElMessage.error(err?.message || '获取任务列表失败')
  } finally {
    loading.value = false
  }
}

const fetchLogs = async () => {
  logLoading.value = true
  try {
    const res = await listRunLogs({
      task_name: logFilters.task_name,
      page: logPage.value,
      page_size: logPageSize.value,
    })
    logList.value = res.data.list || []
    logTotal.value = res.data.total || 0
    stats.totalLogs = res.data.total || 0
  } catch (err: any) {
    logList.value = []
    logTotal.value = 0
    ElMessage.error(err?.message || '获取日志列表失败')
  } finally {
    logLoading.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([fetchTasks(), fetchLogs()])
}

// ==================== 任务操作 ====================
const handleCreate = () => {
  modalMode.value = 'create'
  editingTaskName.value = ''
  formData.name = ''
  formData.prompt = ''
  formData.description = ''
  formData.enabled = true
  formData.repeat = 'daily'
  formData.schedule = '09:00'
  formData.max_delay_hours = 6
  selectedSkills.value = []
  modalVisible.value = true
}

const handleEdit = (task: ScheduledTask) => {
  modalMode.value = 'edit'
  editingTaskName.value = task.name
  formData.name = task.name
  formData.prompt = task.prompt
  formData.description = task.description || ''
  formData.enabled = task.enabled
  formData.repeat = task.repeat
  formData.schedule = task.schedule
  formData.max_delay_hours = task.max_delay_hours

  // 从提示词中解析已选技能
  const skillRegex = /\[skill:([^\]]+)\]/g
  const parsedSkills: SkillApiItem[] = []
  let match: RegExpExecArray | null
  const availableSkills = getCachedSkillItems()
  while ((match = skillRegex.exec(task.prompt)) !== null) {
    const skillName = match[1].trim()
    const existing = availableSkills.find((s) => s.name === skillName)
    parsedSkills.push(existing || { name: skillName, description: '', category: '' })
  }
  selectedSkills.value = parsedSkills

  // 移除 prompt 中的技能标签后显示
  formData.prompt = task.prompt.replace(/\[skill:[^\]]+\]\n?/g, '').trim()

  modalVisible.value = true
}

const handleConfirmSave = async () => {
  if (!formData.name.trim()) {
    ElMessage.warning('请输入任务名称')
    return
  }

  // 构建最终提示词：用户输入 + 选中技能标签
  let finalPrompt = formData.prompt.trim()
  if (selectedSkills.value.length > 0) {
    const skillTags = selectedSkills.value.map((s) => `[skill:${s.name}]`).join('\n')
    finalPrompt = finalPrompt ? `${finalPrompt}\n${skillTags}` : skillTags
  }

  if (!finalPrompt) {
    ElMessage.warning('请输入提示词')
    return
  }

  modalLoading.value = true
  try {
    if (modalMode.value === 'create') {
      await createTask({ ...formData, prompt: finalPrompt })
      ElMessage.success('任务创建成功')
    } else {
      const payload: UpdateTaskPayload = {
        prompt: finalPrompt,
        description: formData.description,
        enabled: formData.enabled,
        repeat: formData.repeat,
        schedule: formData.schedule,
        max_delay_hours: formData.max_delay_hours,
      }
      await updateTask(editingTaskName.value, payload)
      ElMessage.success('任务更新成功')
    }
    modalVisible.value = false
    await fetchTasks()
  } catch (err: any) {
    ElMessage.error(err?.message || '操作失败')
  } finally {
    modalLoading.value = false
  }
}

const handleDelete = async (task: ScheduledTask) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务「${task.name}」吗？删除后不可恢复。`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteTask(task.name)
    ElMessage.success('任务已删除')
    await fetchTasks()
  } catch (err: any) {
    ElMessage.error(err?.message || '删除失败')
  }
}

const handleToggleEnabled = async (task: ScheduledTask) => {
  try {
    const payload: UpdateTaskPayload = { enabled: !task.enabled }
    await updateTask(task.name, payload)
    ElMessage.success(task.enabled ? '任务已暂停' : '任务已启用')
    await fetchTasks()
  } catch (err: any) {
    ElMessage.error(err?.message || '操作失败')
  }
}

const handleRun = async (task: ScheduledTask) => {
  // 互斥：不允许同时执行多个任务
  if (runningTaskName.value) {
    ElMessage.warning(`任务「${runningTaskName.value}」正在执行中，请稍后再试`)
    return
  }

  try {
    await ElMessageBox.confirm(`确定要立即执行任务「${task.name}」吗？`, '执行确认', {
      confirmButtonText: '立即执行',
      cancelButtonText: '取消',
      type: 'info',
    })
  } catch {
    return
  }

  runningTaskName.value = task.name
  try {
    const res = await runTask(task.name)
    runResultTitle.value = `执行结果：${task.name}`
    runResultContent.value = res.data.report || '任务已执行，无返回报告'
    runResultVisible.value = true
    await fetchLogs()
  } catch (err: any) {
    ElMessage.error(err?.message || '执行失败')
  } finally {
    runningTaskName.value = null
  }
}

// ==================== 日志操作 ====================
const handleViewLog = async (log: TaskRunLog) => {
  try {
    const res = await getRunLog(log.id)
    logDetailTitle.value = `日志详情：${log.task_name}`
    logDetailContent.value = res.data.report || '无日志内容'
    logDetailVisible.value = true
  } catch (err: any) {
    ElMessage.error(err?.message || '获取日志详情失败')
  }
}

const handleDeleteLog = async (log: TaskRunLog) => {
  try {
    await ElMessageBox.confirm(`确定要删除「${log.task_name}」的这条执行日志吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteRunLog(log.id)
    ElMessage.success('日志已删除')
    await fetchLogs()
  } catch (err: any) {
    ElMessage.error(err?.message || '删除失败')
  }
}

const handleLogReset = () => {
  logFilters.task_name = ''
  handleLogSearch()
}

// ==================== 筛选 & 分页 ====================
const handleTaskSearch = () => {
  taskPage.value = 1
  fetchTasks()
}

const handleTaskReset = () => {
  taskFilters.keyword = ''
  taskFilters.enabled = undefined
  taskFilters.repeat = ''
  taskPage.value = 1
  fetchTasks()
}

const handleAfterRun = () => {
  runResultVisible.value = false
  activeTab.value = 'logs'
  fetchLogs()
}

const handleLogSearch = () => {
  logPage.value = 1
  fetchLogs()
}

const handleTaskPageChange = (page: number) => {
  taskPage.value = page
  fetchTasks()
}

const handleTaskPageSizeChange = (size: number) => {
  taskPageSize.value = size
  taskPage.value = 1
  fetchTasks()
}

const handleLogPageChange = (page: number) => {
  logPage.value = page
  fetchLogs()
}

const handleLogPageSizeChange = (size: number) => {
  logPageSize.value = size
  logPage.value = 1
  fetchLogs()
}

const handleTabChange = () => {
  if (activeTab.value === 'tasks') {
    fetchTasks()
  } else {
    fetchLogs()
  }
}

// ==================== 导航 ====================
const goBack = () => {
  router.push('/')
}

// ==================== 格式化 ====================
const formatDateTime = (isoStr: string) => {
  if (!isoStr) return '--'
  try {
    const date = new Date(isoStr)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  } catch {
    return isoStr
  }
}

const repeatLabel = (repeat: string) => {
  const map: Record<string, string> = {
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    hourly: '每小时',
    interval: '间隔执行',
  }
  return map[repeat] || repeat
}

const scheduleDisplay = (repeat: string, schedule: string) => {
  if (repeat === 'interval') {
    return `每 ${schedule} 分钟`
  }
  return `${repeatLabel(repeat)} ${schedule}`
}

/** 推断日志执行状态：报告含错误关键词则为 failed，否则 success */
const getLogRunStatus = (report: string): 'success' | 'failed' => {
  if (!report) return 'success'
  const lower = report.toLowerCase()
  const errorKeywords = [
    'error',
    '错误',
    '失败',
    'exception',
    'timeout',
    '超时',
    '异常',
    'traceback',
  ]
  return errorKeywords.some((kw) => lower.includes(kw)) ? 'failed' : 'success'
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchTasks()
  fetchLogs()
  loadSkills()
})
</script>

<template>
  <div class="sched-task-page" :class="{ 'sched-task-page--embedded': isEmbedded }">
    <!-- 页面头部 -->
    <header class="sched-header">
      <div class="sched-title-group">
        <div class="sched-title-row">
          <button class="back-btn" type="button" @click="goBack">
            <el-icon :size="18"><ArrowLeft /></el-icon>
          </button>
          <span class="sched-title-icon">
            <el-icon :size="22"><Clock /></el-icon>
          </span>
          <div>
            <h1>任务计划</h1>
          </div>
        </div>
      </div>
      <div class="sched-header-actions">
        <el-button
          class="sched-btn-ghost"
          :icon="Refresh"
          @click="refreshAll"
          :loading="loading && logLoading"
        >
          刷新
        </el-button>
        <el-button type="primary" class="sched-btn-primary" :icon="Plus" @click="handleCreate">
          创建任务
        </el-button>
      </div>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-row">
      <div class="stat-card">
        <div class="stat-icon tasks">
          <el-icon :size="24"><List /></el-icon>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.totalTasks }}</div>
          <div class="stat-label">任务总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon running">
          <el-icon :size="24"><VideoPlay /></el-icon>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.activeTasks }}</div>
          <div class="stat-label">运行中任务</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon logs">
          <el-icon :size="24"><View /></el-icon>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.totalLogs }}</div>
          <div class="stat-label">执行日志数</div>
        </div>
      </div>
    </section>

    <!-- Tab 切换 -->
    <section class="main-content">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="sched-tabs">
        <!-- ======================== 任务列表 Tab ======================== -->
        <el-tab-pane label="任务列表" name="tasks">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <el-input
              v-model="taskFilters.keyword"
              class="filter-input"
              clearable
              :prefix-icon="Search"
              placeholder="搜索任务名称或描述"
              @keyup.enter="handleTaskSearch"
            />
            <el-select
              v-model="taskFilters.enabled"
              class="filter-select"
              clearable
              placeholder="启用状态"
              @change="handleTaskSearch"
            >
              <el-option label="已启用" :value="true" />
              <el-option label="已停用" :value="false" />
            </el-select>
            <el-select
              v-model="taskFilters.repeat"
              class="filter-select"
              clearable
              placeholder="执行周期"
              @change="handleTaskSearch"
            >
              <el-option label="每天" value="daily" />
              <el-option label="每周" value="weekly" />
              <el-option label="每月" value="monthly" />
              <el-option label="每小时" value="hourly" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="handleTaskSearch">查询</el-button>
            <el-button :icon="Refresh" @click="handleTaskReset">重置</el-button>
          </div>

          <!-- 任务表格 -->
          <div class="table-wrapper">
            <div v-if="loading" class="table-skeleton" aria-busy="true">
              <div v-for="i in 6" :key="i" class="skeleton-card">
                <div class="skeleton-line skeleton-line--title"></div>
                <div class="skeleton-line skeleton-line--meta"></div>
              </div>
            </div>
            <el-table
              v-else
              :data="taskList"
              stripe
              style="width: 100%"
              empty-text="暂无任务，点击「创建任务」开始"
              :header-cell-style="{
                background: 'var(--app-panel-muted)',
                color: 'var(--app-text-muted)',
                fontWeight: 700,
                fontSize: '13px',
              }"
            >
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <span class="status-dot" :class="row.enabled ? 'running' : 'paused'"></span>
                  <span class="status-text" :class="row.enabled ? 'running' : 'paused'">{{
                    row.enabled ? '运行中' : '已停用'
                  }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="任务名称" min-width="150">
                <template #default="{ row }">
                  <span class="task-name-cell">{{ row.name }}</span>
                </template>
              </el-table-column>
              <el-table-column
                prop="description"
                label="描述"
                min-width="160"
                show-overflow-tooltip
              />
              <el-table-column label="执行时间 / 频率" width="170" align="center">
                <template #default="{ row }">
                  <span class="schedule-display">{{
                    scheduleDisplay(row.repeat, row.schedule)
                  }}</span>
                </template>
              </el-table-column>
              <el-table-column
                prop="max_delay_hours"
                label="最大延迟(h)"
                width="110"
                align="center"
              />
              <el-table-column prop="updated_at" label="更新时间" width="170" align="center">
                <template #default="{ row }">
                  {{ formatDateTime(row.updated_at) }}
                </template>
              </el-table-column>
              <el-table-column prop="enabled" label="开关" width="80" align="center">
                <template #default="{ row }">
                  <el-switch
                    :model-value="row.enabled"
                    size="small"
                    @change="handleToggleEnabled(row)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" align="center" fixed="right">
                <template #default="{ row }">
                  <div class="action-btns">
                    <el-tooltip
                      :content="
                        runningTaskName === row.name
                          ? '执行中...'
                          : runningTaskName
                            ? `请等待「${runningTaskName}」执行完成`
                            : '立即执行'
                      "
                    >
                      <button
                        class="act-btn play"
                        :class="{ 'act-btn--running': runningTaskName === row.name }"
                        :disabled="!!runningTaskName"
                        type="button"
                        @click="handleRun(row)"
                      >
                        <span v-if="runningTaskName === row.name" class="act-btn-spinner"></span>
                        <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    </el-tooltip>
                    <el-tooltip content="编辑">
                      <button class="act-btn edit" type="button" @click="handleEdit(row)">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    </el-tooltip>
                    <el-tooltip content="删除">
                      <button class="act-btn delete" type="button" @click="handleDelete(row)">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-wrap" v-if="taskTotal > 0">
              <el-pagination
                v-model:current-page="taskPage"
                v-model:page-size="taskPageSize"
                :page-sizes="[5, 10, 20, 50]"
                :total="taskTotal"
                layout="total, sizes, prev, pager, next, jumper"
                background
                @current-change="handleTaskPageChange"
                @size-change="handleTaskPageSizeChange"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- ======================== 执行日志 Tab ======================== -->
        <el-tab-pane label="执行日志" name="logs">
          <!-- 日志筛选 -->
          <div class="filter-bar">
            <el-input
              v-model="logFilters.task_name"
              class="filter-input"
              clearable
              :prefix-icon="Search"
              placeholder="按任务名称筛选"
              @keyup.enter="handleLogSearch"
            />
            <el-button type="primary" :icon="Search" @click="handleLogSearch">查询</el-button>
            <el-button :icon="Refresh" @click="handleLogReset">重置</el-button>
          </div>

          <!-- 日志表格 -->
          <div class="table-wrapper">
            <div v-if="logLoading" class="table-skeleton" aria-busy="true">
              <div v-for="i in 6" :key="i" class="skeleton-card">
                <div class="skeleton-line skeleton-line--title"></div>
                <div class="skeleton-line skeleton-line--meta"></div>
              </div>
            </div>
            <el-table
              v-else
              :data="logList"
              stripe
              style="width: 100%"
              empty-text="暂无执行日志"
              :header-cell-style="{
                background: 'var(--app-panel-muted)',
                color: 'var(--app-text-muted)',
                fontWeight: 700,
                fontSize: '13px',
              }"
            >
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <span class="status-dot" :class="getLogRunStatus(row.report || '')"></span>
                  <span class="status-text" :class="getLogRunStatus(row.report || '')">{{
                    getLogRunStatus(row.report || '') === 'success' ? '成功' : '失败'
                  }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="task_name" label="任务名称" min-width="140">
                <template #default="{ row }">
                  <span class="task-name-cell">{{ row.task_name }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="run_at" label="执行时间" width="170" align="center">
                <template #default="{ row }">
                  {{ formatDateTime(row.run_at) }}
                </template>
              </el-table-column>
              <el-table-column prop="report" label="执行报告" min-width="260" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="report-preview" :class="getLogRunStatus(row.report || '')"
                    >{{ row.report?.slice(0, 80) || '--'
                    }}{{ row.report?.length > 80 ? '...' : '' }}</span
                  >
                </template>
              </el-table-column>
              <el-table-column label="操作" width="110" align="center" fixed="right">
                <template #default="{ row }">
                  <div class="action-btns">
                    <el-tooltip content="查看详情">
                      <button class="act-btn view" type="button" @click="handleViewLog(row)">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                    </el-tooltip>
                    <el-tooltip content="删除日志">
                      <button class="act-btn delete" type="button" @click="handleDeleteLog(row)">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-wrap" v-if="logTotal > 0">
              <el-pagination
                v-model:current-page="logPage"
                v-model:page-size="logPageSize"
                :page-sizes="[5, 10, 20, 50]"
                :total="logTotal"
                layout="total, prev, pager, next, jumper"
                background
                @current-change="handleLogPageChange"
                @size-change="handleLogPageSizeChange"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <!-- ======================== 创建/编辑任务弹窗 ======================== -->
    <el-dialog
      v-model="modalVisible"
      :title="modalMode === 'create' ? '创建定时任务' : '编辑定时任务'"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form :model="formData" label-position="top" :disabled="modalLoading" class="task-form">
        <el-form-item label="任务名称" required>
          <el-input
            v-model="formData.name"
            placeholder="请输入任务名称（唯一标识）"
            :disabled="modalMode === 'edit'"
            maxlength="100"
            show-word-limit
          />
          <template v-if="modalMode === 'edit'" #extra>
            <span class="form-tip">任务名称创建后不可修改</span>
          </template>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="执行周期" required>
              <el-select v-model="formData.repeat" class="w-full">
                <el-option label="每天" value="daily" />
                <el-option label="每周" value="weekly" />
                <el-option label="每月" value="monthly" />
                <el-option label="每小时" value="hourly" />
                <el-option label="间隔执行" value="interval" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              :label="formData.repeat === 'interval' ? '间隔(分钟)' : '执行时间'"
              required
            >
              <el-input-number
                v-if="formData.repeat === 'interval'"
                v-model="intervalMinutes"
                :min="1"
                :max="10080"
                class="w-full"
              />
              <el-time-picker
                v-else
                v-model="formData.schedule"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="选择执行时间"
                class="w-full"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="最大延迟(小时)">
          <el-input-number
            v-model="formData.max_delay_hours"
            :min="0"
            :max="72"
            :step="1"
            class="w-full"
          />
          <template #extra>
            <span class="form-tip">任务允许的最大延迟执行时间，0 表示必须准时执行</span>
          </template>
        </el-form-item>

        <el-form-item label="提示词" required>
          <div class="prompt-textarea-wrap">
            <el-input
              v-model="formData.prompt"
              type="textarea"
              :rows="5"
              placeholder="请输入 AI 提示词，描述任务需要执行的内容"
              maxlength="5000"
              show-word-limit
              class="prompt-textarea"
            />
            <div class="prompt-footer">
              <div class="prompt-footer-tags">
                <el-tag
                  v-for="skill in selectedSkills"
                  :key="skill.name"
                  closable
                  size="small"
                  class="skill-tag-item"
                  @close="toggleSkill(skill)"
                >
                  {{ skill.name }}
                </el-tag>
              </div>
              <button type="button" class="add-skill-btn" @click="openSkillPicker">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>添加技能</span>
              </button>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="任务描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="启用任务">
          <el-switch v-model="formData.enabled" />
          <span class="switch-hint">{{
            formData.enabled ? '创建后立即启用' : '创建后暂不启用'
          }}</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="modalVisible = false" :disabled="modalLoading">取消</el-button>
        <el-button type="primary" @click="handleConfirmSave" :loading="modalLoading">
          {{ modalMode === 'create' ? '确认创建' : '保存修改' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ======================== 技能选择弹窗 ======================== -->
    <el-dialog
      v-model="skillPickerVisible"
      title="选择技能"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="skill-picker-body">
        <el-input
          v-model="skillSearchQuery"
          placeholder="搜索技能名称、描述或分类..."
          prefix-icon="Search"
          clearable
          class="skill-search-input"
        />
        <div class="skill-list-scroll">
          <template v-if="filteredSkillGroups.length === 0">
            <div class="skill-empty">暂无匹配的技能</div>
          </template>
          <div
            v-for="group in filteredSkillGroups"
            :key="group.category"
            class="skill-category-group"
          >
            <div class="skill-category-header">{{ group.category }}</div>
            <div
              v-for="skill in group.skills"
              :key="skill.name"
              class="skill-item"
              :class="{ selected: isSkillSelected(skill) }"
              @click="toggleSkill(skill)"
            >
              <div class="skill-item-left">
                <span class="skill-item-name">{{ skill.name }}</span>
                <span v-if="skill.description" class="skill-item-desc">{{
                  skill.description
                }}</span>
              </div>
              <svg
                v-if="isSkillSelected(skill)"
                class="skill-check-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="18"
                height="18"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="skillPickerVisible = false">完成</el-button>
      </template>
    </el-dialog>

    <!-- ======================== 日志详情弹窗 ======================== -->
    <el-dialog
      v-model="logDetailVisible"
      :title="logDetailTitle"
      width="680px"
      :close-on-click-modal="false"
    >
      <div class="log-detail-body">
        <pre class="log-detail-content">{{ logDetailContent }}</pre>
      </div>
      <template #footer>
        <el-button @click="logDetailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ======================== 执行结果弹窗 ======================== -->
    <el-dialog
      v-model="runResultVisible"
      :title="runResultTitle"
      width="680px"
      :close-on-click-modal="false"
    >
      <div class="log-detail-body">
        <pre class="log-detail-content">{{ runResultContent }}</pre>
      </div>
      <template #footer>
        <el-button @click="runResultVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleAfterRun">查看日志列表</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.sched-task-page {
  padding: 32px 40px 24px;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  color: var(--app-text);
  background: var(--app-bg);
}

.sched-task-page--embedded {
  padding: 28px 32px 0;
  height: 100%;
  background: transparent;
}

/* ==================== 页面头部 ==================== */
.sched-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40px;
  gap: 16px;
  flex: 0 0 auto;
}
.sched-title-group {
  min-width: 0;
}
.sched-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.sched-title-icon {
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
.sched-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 780;
  letter-spacing: -0.02em;
  color: var(--app-text);
  line-height: 1.25;
}
.sched-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sched-btn-ghost {
  --el-button-bg-color: var(--app-panel-muted);
  --el-button-border-color: var(--app-border);
  --el-button-text-color: var(--app-text-muted);
  --el-button-hover-bg-color: var(--app-hover);
  --el-button-hover-border-color: var(--app-border-hover);
  --el-button-hover-text-color: var(--app-text);
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.25s ease;
}
.sched-btn-primary {
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(79, 124, 255, 0.25);
  transition: all 0.25s ease;
}
.sched-btn-primary:hover {
  box-shadow: 0 8px 28px rgba(79, 124, 255, 0.35);
  transform: translateY(-1px);
}

.back-btn {
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
.back-btn:hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  transform: translateX(-2px);
}

/* ==================== 统计卡片 ==================== */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}
.stat-card {
  background: var(--app-panel);
  border-radius: 18px;
  padding: 24px;
  box-shadow: var(--app-shadow);
  border: 1px solid var(--app-border);
  display: flex;
  align-items: center;
  gap: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.stat-card:hover {
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.22);
  transform: translateY(-4px);
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-icon.tasks {
  background: linear-gradient(135deg, var(--app-primary-soft), rgba(0, 170, 255, 0.25));
  color: var(--app-primary);
}
.stat-icon.running {
  background: linear-gradient(135deg, var(--tc-green-bg), rgba(46, 213, 115, 0.25));
  color: var(--app-success);
}
.stat-icon.logs {
  background: linear-gradient(135deg, var(--tc-amber-bg), rgba(245, 166, 35, 0.25));
  color: var(--tc-amber);
}
.stat-body {
  flex: 1;
}
.stat-value {
  font-size: 42px;
  font-weight: 800;
  color: var(--app-text);
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.stat-label {
  font-size: 13px;
  color: var(--app-text-muted);
  margin-top: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ==================== 主内容区 ==================== */
.main-content {
  padding: 0;
}

.sched-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

/* ==================== 筛选栏 ==================== */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  padding: 16px 24px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.03),
    0 8px 24px rgba(24, 39, 75, 0.06);
  flex-wrap: wrap;
}
.filter-input {
  width: 260px;
}
.filter-select {
  width: 140px;
}

/* ==================== 表格 ==================== */
.table-wrapper {
  min-height: 200px;
}

/* 骨架屏 */
.table-skeleton {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-card {
  padding: 14px 18px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  background: var(--app-panel);
}
.skeleton-line {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--app-skeleton-line-bg);
  position: relative;
}
.skeleton-line::after {
  content: '';
  display: block;
  width: 45%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, var(--app-skeleton-shimmer), transparent);
  animation: tableShimmer 1.35s ease-in-out infinite;
}
.skeleton-line--title {
  width: 78%;
}
.skeleton-line--meta {
  width: 48%;
  height: 10px;
  margin-top: 10px;
}

@keyframes tableShimmer {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(260%);
  }
}
.task-name-cell {
  font-weight: 600;
  color: var(--app-text);
}
.schedule-display {
  font-weight: 500;
  color: var(--app-primary);
}
.report-preview {
  color: var(--app-text-muted);
  font-size: 12px;
}
.report-preview.failed {
  color: var(--app-danger);
}

/* 状态圆点 */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
  flex-shrink: 0;
}
.status-dot.running {
  background: var(--app-success);
  box-shadow: 0 0 8px rgba(46, 213, 115, 0.4);
  animation: dotPulse 2s infinite;
}
.status-dot.paused {
  background: var(--app-text-muted);
}
.status-dot.success {
  background: var(--app-success);
}
.status-dot.failed {
  background: var(--app-danger);
  box-shadow: 0 0 8px rgba(255, 71, 87, 0.3);
}
.status-text {
  font-size: 12px;
  font-weight: 500;
  vertical-align: middle;
}
.status-text.running {
  color: var(--app-success);
}
.status-text.paused {
  color: var(--app-text-subtle);
}
.status-text.success {
  color: var(--app-success);
}
.status-text.failed {
  color: var(--app-danger);
}

@keyframes dotPulse {
  0%,
  100% {
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0.05);
  }
}

/* 操作按钮 */
.action-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.act-btn {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 9px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--app-panel);
  color: var(--app-text-muted);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  flex-shrink: 0;
}

.act-btn.play:hover {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: var(--app-success);
}
.act-btn.edit:hover {
  background: var(--app-primary-softer);
  border-color: var(--app-border-hover);
  color: var(--app-primary);
}
.act-btn.delete:hover {
  background: var(--app-danger-soft);
  border-color: rgba(255, 71, 87, 0.3);
  color: var(--app-danger);
}
.act-btn.view:hover {
  background: var(--app-primary-softer);
  border-color: var(--app-border-hover);
  color: var(--app-primary);
}
.act-btn svg {
  width: 16px;
  height: 16px;
}

/* 执行中旋转动画 */
.act-btn--running {
  border-color: rgba(16, 185, 129, 0.3) !important;
  color: var(--app-success) !important;
  pointer-events: none;
}

.act-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.act-btn-spinner {
  width: 16px;
  height: 16px;
  display: inline-block;
  border: 2px solid rgba(16, 185, 129, 0.2);
  border-top-color: var(--app-success);
  border-radius: 50%;
  animation: actSpin 0.7s linear infinite;
}

@keyframes actSpin {
  to {
    transform: rotate(360deg);
  }
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

/* ==================== 表单 ==================== */
.task-form {
  padding: 4px 0;
}
.w-full {
  width: 100%;
}
.form-tip {
  font-size: 11px;
  color: var(--app-text-subtle);
  margin-left: 4px;
}
.switch-hint {
  margin-left: 10px;
  font-size: 13px;
  color: var(--app-text-muted);
}

/* ==================== 技能选择 ==================== */
.prompt-textarea-wrap {
  width: 100%;
}
.prompt-textarea :deep(.el-textarea__inner) {
  border-radius: 8px 8px 0 0;
}
.prompt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  min-height: 40px;
  background: var(--app-panel-muted);
  border: 1px solid var(--app-border);
  border-top: 1px dashed var(--app-border);
  border-radius: 0 0 8px 8px;
}
.prompt-footer-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.add-skill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 5px 12px;
  border: 1px dashed rgba(59, 130, 246, 0.4);
  border-radius: 6px;
  background: transparent;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.add-skill-btn:hover {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.65);
  border-style: solid;
}
.skill-tag-item {
  display: inline-flex;
  align-items: center;
  height: 24px;
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  color: var(--app-primary);
  font-weight: 500;
}
.skill-tag-item :deep(.el-tag__close) {
  color: var(--app-primary);
}
.skill-tag-item :deep(.el-tag__close:hover) {
  background: rgba(59, 130, 246, 0.18);
  color: var(--app-primary-strong);
}

/* 技能弹窗 */
.skill-picker-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.skill-list-scroll {
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 10px;
  padding: 4px 0;
  background: var(--app-panel-muted);
}
.skill-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--app-text-subtle);
  font-size: 13px;
}
.skill-category-header {
  padding: 10px 14px 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--app-text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.skill-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 10px;
}
.skill-item:hover {
  background: rgba(59, 130, 246, 0.06);
}
.skill-item.selected {
  background: rgba(59, 130, 246, 0.09);
}
.skill-item-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.skill-item-name,
.skill-item-desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.skill-item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-muted);
}
.skill-item-desc {
  font-size: 11px;
  color: var(--app-text-subtle);
}
.skill-check-icon {
  flex-shrink: 0;
  color: var(--app-primary);
}

/* ==================== 日志详情 ==================== */
.log-detail-body {
  max-height: 50vh;
  overflow-y: auto;
}
.log-detail-content {
  margin: 0;
  padding: 16px;
  background: var(--app-panel-muted);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--app-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
}

/* ==================== 响应式 ==================== */
@media (max-width: 1200px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .sched-task-page {
    padding: 20px 16px;
  }
  .stats-row {
    grid-template-columns: 1fr;
  }
  .sched-header {
    flex-direction: column;
  }
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-input,
  .filter-select {
    width: 100%;
  }
}
</style>

<style>
/* ==================== 深色模式适配 ==================== */
:root[data-theme='dark'] .sched-task-page {
  background:
    radial-gradient(ellipse 80% 50% at 10% 0%, rgba(0, 170, 255, 0.06), transparent 38%),
    radial-gradient(ellipse 60% 40% at 92% 94%, rgba(0, 170, 255, 0.04), transparent 32%),
    radial-gradient(ellipse 50% 30% at 50% 50%, rgba(0, 170, 255, 0.025), transparent 40%),
    var(--app-bg-gradient);
}

:root[data-theme='dark'] .sched-task-page--embedded {
  background: transparent;
}

/* 统计卡片 */
:root[data-theme='dark'] .stat-card {
  background: var(--app-panel);
  border-color: var(--app-border);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
:root[data-theme='dark'] .stat-value {
  color: var(--app-text);
}
:root[data-theme='dark'] .stat-label {
  color: var(--app-text-muted);
}

/* 主内容区 — 透明，与 MCP 管理保持一致 */

/* 页面标题 */
:root[data-theme='dark'] .sched-title-icon {
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
  box-shadow: 0 8px 24px rgba(0, 170, 255, 0.25);
}

/* 返回按钮 */
:root[data-theme='dark'] .back-btn {
  background: var(--app-panel);
  border-color: var(--app-border);
  color: var(--app-text-muted);
}
:root[data-theme='dark'] .back-btn:hover {
  background: var(--app-primary-soft);
  border-color: var(--app-border-hover);
  color: var(--app-primary);
}

/* 筛选栏 */
:root[data-theme='dark'] .filter-bar .el-input__wrapper {
  background: var(--app-panel-muted);
  border-color: var(--app-border);
}
:root[data-theme='dark'] .filter-bar .el-input__inner {
  color: var(--app-text);
}
:root[data-theme='dark'] .filter-bar {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.2);
}

/* 表格 */
:root[data-theme='dark'] .el-table {
  --el-table-bg-color: var(--app-panel);
  --el-table-tr-bg-color: var(--app-panel);
  --el-table-header-bg-color: var(--app-panel-muted);
  --el-table-row-hover-bg-color: var(--app-primary-softer);
  --el-table-border-color: var(--app-border);
  --el-table-text-color: var(--app-text);
  --el-table-header-text-color: var(--app-text-muted);
}
:root[data-theme='dark'] .el-table__body tr.el-table__row--striped td {
  background: var(--app-panel-elevated);
}
:root[data-theme='dark'] .task-name-cell {
  color: var(--app-text);
}
:root[data-theme='dark'] .schedule-display {
  color: var(--app-primary);
}

/* 表格标题栏 */
:root[data-theme='dark'] .el-table__header th {
  background: var(--app-panel-muted) !important;
  color: var(--app-text-muted) !important;
}

/* 操作按钮 */
:root[data-theme='dark'] .act-btn {
  background: var(--app-panel-muted);
  border-color: var(--app-border);
  color: var(--app-text-muted);
}

:root[data-theme='dark'] .act-btn--running {
  border-color: rgba(46, 213, 115, 0.35) !important;
  color: var(--app-success) !important;
}

:root[data-theme='dark'] .act-btn-spinner {
  border-color: rgba(46, 213, 115, 0.15);
  border-top-color: var(--app-success);
}

/* 弹窗 */
:root[data-theme='dark'] .el-dialog {
  --el-dialog-bg-color: var(--app-panel);
  --el-dialog-title-font-color: var(--app-text);
  background: var(--app-panel);
}
:root[data-theme='dark'] .el-dialog__header {
  border-bottom-color: var(--app-border);
}
:root[data-theme='dark'] .el-dialog__footer {
  border-top-color: var(--app-border);
}

/* 表单 */
:root[data-theme='dark'] .form-tip {
  color: var(--app-text-subtle);
}
:root[data-theme='dark'] .switch-hint {
  color: var(--app-text-muted);
}

/* 技能选择 */
:root[data-theme='dark'] .prompt-footer {
  background: var(--app-panel-muted);
  border-color: var(--app-border);
  border-top-color: var(--app-border);
}
:root[data-theme='dark'] .add-skill-btn {
  border-color: var(--app-border-hover);
  color: var(--app-primary);
}
:root[data-theme='dark'] .add-skill-btn:hover {
  background: var(--app-primary-soft);
  border-color: var(--app-primary);
  border-style: solid;
}
:root[data-theme='dark'] .skill-list-scroll {
  background: var(--app-panel-muted);
  border-color: var(--app-border);
}
:root[data-theme='dark'] .skill-item:hover {
  background: var(--app-primary-softer);
}
:root[data-theme='dark'] .skill-item.selected {
  background: var(--app-primary-soft);
}
:root[data-theme='dark'] .skill-item-name {
  color: var(--app-text);
}
:root[data-theme='dark'] .skill-item-desc,
:root[data-theme='dark'] .skill-empty,
:root[data-theme='dark'] .skill-category-header {
  color: var(--app-text-subtle);
}
:root[data-theme='dark'] .skill-check-icon {
  color: var(--app-primary);
}
:root[data-theme='dark'] .skill-tag-item {
  background: var(--app-primary-soft);
  border-color: var(--app-border-hover);
  color: var(--app-primary);
}
:root[data-theme='dark'] .skill-tag-item .el-tag__close {
  color: var(--app-primary);
}
:root[data-theme='dark'] .skill-tag-item .el-tag__close:hover {
  background: rgba(79, 124, 255, 0.25);
  color: var(--app-text);
}

/* 日志详情 */
:root[data-theme='dark'] .log-detail-content {
  background: var(--app-panel-muted);
  border-color: var(--app-border);
  color: var(--app-text-muted);
}

/* 分页 */
:root[data-theme='dark'] .pagination-wrap {
  border-top-color: var(--app-border);
}

/* 骨架屏深色模式 */
:root[data-theme='dark'] .skeleton-card {
  background: var(--app-panel-muted);
  border-color: var(--app-border);
}

/* el-tooltip 箭头修复：深色下隐藏箭头避免变白 */
:root[data-theme='dark'] .el-popper__arrow::before {
  display: none !important;
}
:root[data-theme='dark'] .el-popper__arrow {
  display: none !important;
}
</style>
