<template>
  <div class="mcp-page" :class="{ 'mcp-page--embedded': isEmbedded }">
    <!-- ==================== 页面头部 ==================== -->
    <header class="mcp-header">
      <div class="mcp-title-group">
        <div class="mcp-title-row">
          <button v-if="!isInAdmin" class="mcp-back-btn" type="button" @click="goBack" aria-label="返回">
            <el-icon :size="18"><ArrowLeft /></el-icon>
          </button>
          <span class="mcp-title-icon">
            <el-icon :size="22"><Connection /></el-icon>
          </span>
          <div>
            <h1>MCP 专区</h1>
          </div>
        </div>
      </div>
      <div class="mcp-header-actions">
        <el-button class="mcp-btn-ghost" @click="refreshList" :loading="loading">
          <el-icon><Refresh /></el-icon>
          <span>刷新</span>
        </el-button>
        <el-button type="primary" class="mcp-btn-primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          <span>添加 MCP</span>
        </el-button>
      </div>
    </header>

    <!-- ==================== 主面板 ==================== -->
    <main class="mcp-panel">
      <!-- 统计卡片 -->
      <div class="mcp-summary">
        <div class="mcp-summary__item mcp-summary__item--total">
          <span>总计</span>
          <strong>{{ totalCount }}</strong>
        </div>
        <div class="mcp-summary__item mcp-summary__item--enabled">
          <span>已启用</span>
          <strong>{{ activeCount }}</strong>
        </div>
        <div class="mcp-summary__item mcp-summary__item--disabled">
          <span>已禁用</span>
          <strong>{{ inactiveCount }}</strong>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="mcp-toolbar">
        <el-input
          v-model="searchQuery"
          class="mcp-search"
          clearable
          :prefix-icon="Search"
          placeholder="搜索 MCP 名称、描述或标识符..."
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <div class="mcp-filter-group">
          <button
            v-for="filter in filters"
            :key="filter.key"
            class="mcp-filter-chip"
            :class="{ 'mcp-filter-chip--active': currentFilter === filter.key }"
            type="button"
            @click="setFilter(filter.key)"
          >
            {{ filter.label }}
          </button>
        </div>
        <div class="mcp-filter-group">
          <button
            v-for="cat in categoryFilters"
            :key="cat.key"
            class="mcp-filter-chip"
            :class="{ 'mcp-filter-chip--active': currentCategory === cat.key }"
            type="button"
            @click="setCategory(cat.key)"
          >
            {{ cat.label }}
          </button>
        </div>
        <div class="mcp-toolbar-right">
          <el-icon><Calendar /></el-icon>
          <span>最近更新：{{ lastUpdatedText }}</span>
        </div>
      </div>

    <!-- ==================== 加载状态 ==================== -->
    <div v-if="loading" class="mcp-grid-wrapper">
      <div class="mcp-grid">
        <div v-for="n in 6" :key="n" class="mcp-card mcp-card--skeleton">
          <div class="mcp-card-header">
            <div class="mcp-card-left">
              <div class="mcp-avatar mcp-avatar--skeleton"></div>
              <div class="mcp-card-info">
                <div class="skeleton-line skeleton-line--name"></div>
                <div class="skeleton-line skeleton-line--desc"></div>
              </div>
            </div>
          </div>
          <div class="mcp-card-body">
            <div class="skeleton-line skeleton-line--endpoint"></div>
          </div>
          <div class="mcp-card-footer">
            <div class="skeleton-line skeleton-line--short"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 错误状态 ==================== -->
    <div v-else-if="loadError" class="mcp-empty mcp-empty--error">
      <el-icon :size="48"><Warning /></el-icon>
      <p>加载失败：{{ loadError }}</p>
      <el-button class="mcp-retry-btn" @click="refreshList">重试</el-button>
    </div>

    <!-- ==================== 卡片网格 ==================== -->
    <div v-else class="mcp-grid-wrapper">
      <div v-if="paginatedData.length > 0" class="mcp-grid">
        <div
          v-for="item in paginatedData"
          :key="item.id"
          class="mcp-card"
          role="article"
          :aria-label="item.name"
          @click="openDetailDialog(item)"
        >
          <div class="mcp-card-header">
            <div class="mcp-card-left">
              <div class="mcp-avatar" :class="`mcp-avatar--${getAvatarColor(item.id)}`">
                {{ getInitial(item.name) }}
              </div>
              <div class="mcp-card-info">
                <div class="mcp-card-name">{{ item.name }}</div>
                <div class="mcp-card-desc">{{ item.description || '暂无描述' }}</div>
              </div>
            </div>
            <div class="mcp-card-status">
              <span class="mcp-category-badge" :style="categoryBadgeStyle(item.category)">
                {{ categoryLabel(item.category) }}
              </span>
            </div>
          </div>
          <div class="mcp-card-body">
            <div class="mcp-endpoint" :title="item.url">
              <el-icon><Link /></el-icon>
              <span>{{ item.url }}</span>
            </div>
            <div class="mcp-card-meta">
              <span class="mcp-card-identifier" :title="item.identifier">
                <el-icon><Document /></el-icon>
                {{ item.identifier }}
              </span>
              <span v-if="item.tools_count !== undefined" class="mcp-card-tools">
                <el-icon><Setting /></el-icon>
                {{ item.tools_count }} 个工具
              </span>
            </div>
          </div>
          <div class="mcp-card-footer">
            <div class="mcp-card-footer-left">
              <span
                class="mcp-status-badge"
                :class="item.enabled ? 'mcp-status-badge--active' : 'mcp-status-badge--inactive'"
              >
                <span class="mcp-status-dot"></span>
                {{ item.enabled ? '已启用' : '已禁用' }}
              </span>
            </div>
            <div class="mcp-card-footer-right">
              <el-switch
                :model-value="item.enabled"
                size="small"
                @click.stop
                @change="toggleStatus(item)"
              />
              <div class="mcp-card-actions">
                <el-button
                  class="mcp-action-btn"
                  size="small"
                  aria-label="编辑"
                  @click.stop="openEditDialog(item)"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button
                  class="mcp-action-btn mcp-action-btn--danger"
                  size="small"
                  aria-label="删除"
                  @click.stop="deleteMCP(item)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="mcp-empty">
        <el-icon :size="56"><Box /></el-icon>
        <p>
          {{
            searchQuery || currentFilter !== 'all' || currentCategory
              ? '没有找到匹配的 MCP 服务'
              : '暂无 MCP 服务，点击上方按钮添加'
          }}
        </p>
      </div>
    </div>

    <!-- ==================== 分页 ==================== -->
    <div v-if="!loading && !loadError && filteredTotal > 0" class="mcp-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredTotal"
        layout="total, prev, pager, next"
        background
        @current-change="goPage"
      />
    </div>
    </main>

    <!-- ==================== 创建/编辑对话框 ==================== -->
    <Teleport to="body">
      <transition name="mcp-dialog-fade">
        <div
          v-if="dialogVisible"
          class="mcp-dialog-overlay"
          @click.self="closeDialog"
          @keydown.escape="closeDialog"
        >
          <div class="mcp-dialog" role="dialog" aria-modal="true" :aria-label="dialogTitle">
            <div class="mcp-dialog-header">
              <h2 class="mcp-dialog-title">{{ dialogTitle }}</h2>
              <button class="mcp-dialog-close" type="button" aria-label="关闭" @click="closeDialog">
                <el-icon :size="20"><Close /></el-icon>
              </button>
            </div>

            <div class="mcp-dialog-body">
              <div class="mcp-form-group">
                <label class="mcp-form-label" for="mcp-name">
                  服务名称 <span class="mcp-form-required">*</span>
                </label>
                <el-input
                  id="mcp-name"
                  v-model="formData.name"
                  placeholder="例如：GitHub MCP"
                  maxlength="60"
                  show-word-limit
                />
              </div>

              <div class="mcp-form-group">
                <label class="mcp-form-label" for="mcp-identifier">
                  服务标识符 <span class="mcp-form-required">*</span>
                </label>
                <el-input
                  id="mcp-identifier"
                  v-model="formData.identifier"
                  placeholder="例如：github_mcp（仅支持英文、数字、下划线）"
                  maxlength="60"
                  :disabled="isEditing"
                />
                <p class="mcp-form-hint">唯一标识符，创建后不可修改</p>
              </div>

              <div class="mcp-form-group">
                <label class="mcp-form-label" for="mcp-url">
                  服务地址 <span class="mcp-form-required">*</span>
                </label>
                <el-input
                  id="mcp-url"
                  v-model="formData.url"
                  placeholder="例如：http://10.32.71.201:9702"
                />
              </div>

              <div class="mcp-form-group">
                <label class="mcp-form-label" for="mcp-description">服务描述</label>
                <el-input
                  id="mcp-description"
                  v-model="formData.description"
                  type="textarea"
                  placeholder="简要描述该 MCP 服务提供的功能..."
                  :rows="3"
                  maxlength="200"
                  show-word-limit
                />
              </div>

              <div class="mcp-form-row">
                <div class="mcp-form-group mcp-form-group--half">
                  <label class="mcp-form-label" for="mcp-category">服务分类</label>
                  <el-select
                    id="mcp-category"
                    v-model="formData.category"
                    placeholder="选择分类"
                    class="mcp-form-select"
                  >
                    <el-option
                      v-for="cat in categoryOptions"
                      :key="cat.value"
                      :label="cat.label"
                      :value="cat.value"
                    />
                  </el-select>
                </div>

                <div class="mcp-form-group mcp-form-group--half mcp-form-group--toggle">
                  <label class="mcp-form-label">启用状态</label>
                  <div class="mcp-form-toggle-row">
                    <el-switch v-model="formData.enabled" />
                    <span class="mcp-form-toggle-label">{{
                      formData.enabled ? '已启用' : '已禁用'
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mcp-dialog-footer">
              <el-button class="mcp-btn-ghost" @click="closeDialog">取消</el-button>
              <el-button
                type="primary"
                class="mcp-btn-primary"
                :loading="submitting"
                @click="submitForm"
              >
                {{ isEditing ? '保存修改' : '创建服务' }}
              </el-button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ==================== 详情对话框 ==================== -->
    <Teleport to="body">
      <transition name="mcp-dialog-fade">
        <div
          v-if="detailVisible"
          class="mcp-dialog-overlay"
          @click.self="detailVisible = false"
          @keydown.escape="detailVisible = false"
        >
          <div
            class="mcp-dialog mcp-dialog--detail"
            role="dialog"
            aria-modal="true"
            aria-label="MCP 服务详情"
          >
            <div class="mcp-dialog-header">
              <h2 class="mcp-dialog-title">{{ detailItem?.name }}</h2>
              <button
                class="mcp-dialog-close"
                type="button"
                aria-label="关闭"
                @click="detailVisible = false"
              >
                <el-icon :size="20"><Close /></el-icon>
              </button>
            </div>

            <div v-if="detailItem" class="mcp-dialog-body mcp-detail-body">
              <div class="mcp-detail-section">
                <div class="mcp-detail-row">
                  <span class="mcp-detail-label">标识符</span>
                  <span class="mcp-detail-value mcp-detail-mono">{{ detailItem.identifier }}</span>
                </div>
                <div class="mcp-detail-row">
                  <span class="mcp-detail-label">服务地址</span>
                  <span class="mcp-detail-value mcp-detail-mono">{{ detailItem.url }}</span>
                </div>
                <div class="mcp-detail-row">
                  <span class="mcp-detail-label">分类</span>
                  <span class="mcp-category-badge" :style="categoryBadgeStyle(detailItem.category)">
                    {{ categoryLabel(detailItem.category) }}
                  </span>
                </div>
                <div class="mcp-detail-row">
                  <span class="mcp-detail-label">状态</span>
                  <span
                    class="mcp-status-badge"
                    :class="
                      detailItem.enabled ? 'mcp-status-badge--active' : 'mcp-status-badge--inactive'
                    "
                  >
                    <span class="mcp-status-dot"></span>
                    {{ detailItem.enabled ? '已启用' : '已禁用' }}
                  </span>
                </div>
                <div class="mcp-detail-row">
                  <span class="mcp-detail-label">工具数量</span>
                  <span class="mcp-detail-value">{{ detailItem.tools_count ?? '—' }}</span>
                </div>
              </div>
              <div class="mcp-detail-section">
                <div class="mcp-detail-label mcp-detail-label--block">描述</div>
                <p class="mcp-detail-desc">{{ detailItem.description || '暂无描述' }}</p>
              </div>
            </div>

            <div class="mcp-dialog-footer">
              <el-button class="mcp-btn-ghost" @click="detailVisible = false">关闭</el-button>
              <el-button
                type="primary"
                class="mcp-btn-primary"
                @click="detailVisible = false; openEditDialog(detailItem!)"
              >
                <el-icon><Edit /></el-icon>
                <span>编辑</span>
              </el-button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Connection,
  Refresh,
  Plus,
  Clock,
  Search,
  Calendar,
  Link,
  Edit,
  Delete,
  Box,
  ArrowLeft,
  Close,
  Setting,
  Document,
  Warning,
} from '@element-plus/icons-vue'
import {
  listMcpServices,
  searchMcpServices,
  createMcpService,
  enableMcpService,
  disableMcpService,
  deleteMcpService,
  type McpServiceItem,
  type McpCreateParams,
} from '@/api/mcpService'

// ============ Props ============
const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

const router = useRouter()
const route = useRoute()
const goBack = () => {
  router.push('/')
}

const isEmbedded = computed(() => props.embedded)
const isInAdmin = computed(() => route.path === '/admin-management')

// ============ 数据状态 ============
const mcpItems = ref<McpServiceItem[]>([])
const loading = ref(false)
const loadError = ref('')

// ============ 搜索 & 筛选 ============
const searchQuery = ref('')
const currentFilter = ref('all')
const currentCategory = ref('')
const currentPage = ref(1)
const pageSize = 6

const filters = [
  { key: 'all', label: '全部' },
  { key: 'enabled', label: '已启用' },
  { key: 'disabled', label: '已禁用' },
]

// ============ 分类定义 ============
const categoryMap: Record<string, string> = {
  data: '数据服务',
  tool: '工具服务',
  communication: '通讯服务',
  file: '文件服务',
  ai: 'AI 服务',
  automation: '自动化',
  search: '搜索服务',
  other: '其他',
}

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  data: { bg: 'var(--app-primary-soft)', text: 'var(--app-primary)', dot: 'var(--app-primary)' },
  tool: { bg: 'rgba(139,92,246,0.12)', text: '#7c3aed', dot: '#8b5cf6' },
  communication: { bg: 'var(--app-danger-soft)', text: 'var(--app-danger)', dot: 'var(--app-danger)' },
  file: { bg: 'rgba(16,185,129,0.12)', text: 'var(--app-success)', dot: 'var(--app-success)' },
  ai: { bg: 'var(--tc-amber-bg)', text: 'var(--tc-amber)', dot: 'var(--tc-amber)' },
  automation: { bg: 'var(--tc-cyan-bg)', text: 'var(--tc-cyan)', dot: 'var(--tc-cyan)' },
  search: { bg: 'var(--app-primary-softer)', text: 'var(--app-primary-strong)', dot: 'var(--app-primary-strong)' },
  other: { bg: 'var(--app-hover)', text: 'var(--app-text-muted)', dot: 'var(--app-text-muted)' },
}

const categoryLabel = (cat: string) => categoryMap[cat] || cat || '其他'

const categoryBadgeStyle = (cat: string) => {
  const c = categoryColors[cat] || categoryColors.other
  return { backgroundColor: c.bg, color: c.text }
}

const categoryOptions = Object.entries(categoryMap).map(([value, label]) => ({ value, label }))

// 动态分类过滤器（基于已加载数据中的分类）
const categoryFilters = computed(() => {
  const seen = new Set<string>()
  mcpItems.value.forEach((item) => {
    if (item.category) seen.add(item.category)
  })
  const list = Array.from(seen).map((key) => ({
    key,
    label: categoryMap[key] || key,
  }))
  return list
})

// ============ 头像映射 ============
const avatarColors = ['blue', 'purple', 'green', 'orange', 'pink', 'teal', 'red', 'indigo']
const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length]
const getInitial = (name: string) => (name || 'M').charAt(0).toUpperCase()

// ============ 计算属性 ============
const totalCount = computed(() => mcpItems.value.length)
const activeCount = computed(() => mcpItems.value.filter((d) => d.enabled).length)
const inactiveCount = computed(() => mcpItems.value.filter((d) => !d.enabled).length)
const filteredData = computed(() => {
  let data = [...mcpItems.value]

  // 按启用状态筛选
  if (currentFilter.value === 'enabled') {
    data = data.filter((item) => item.enabled)
  } else if (currentFilter.value === 'disabled') {
    data = data.filter((item) => !item.enabled)
  }

  // 按分类筛选
  if (currentCategory.value) {
    data = data.filter((item) => item.category === currentCategory.value)
  }

  return data
})

const filteredTotal = computed(() => filteredData.value.length)
const totalPages = computed(() => Math.ceil(filteredTotal.value / pageSize) || 1)

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredData.value.slice(start, start + pageSize)
})

const lastUpdatedText = computed(() => {
  if (mcpItems.value.length === 0) return '暂无数据'
  const timestamps = mcpItems.value.map((item) => item.updated_at).filter(Boolean) as string[]
  if (timestamps.length === 0) return '未知'
  const latest = timestamps.sort().reverse()[0]
  return formatRelativeTime(latest)
})

// ============ 时间格式化 ============
function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} 天前`
    return date.toLocaleDateString('zh-CN')
  } catch {
    return '未知'
  }
}

// ============ API 方法 ============
async function loadData(filter?: string) {
  loading.value = true
  loadError.value = ''
  try {
    const f = filter ?? currentFilter.value
    // "全部" 不传参，"已启用" 传 true，"已禁用" 传 false
    const enabledOnly = f === 'all' ? undefined : f === 'enabled'
    const response = await listMcpServices(200, enabledOnly)
    mcpItems.value = response.items || []
    currentPage.value = 1
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

async function doSearch() {
  const keyword = searchQuery.value.trim()
  if (!keyword) {
    await loadData()
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const response = await searchMcpServices(keyword, 200)
    mcpItems.value = response.items || []
    currentPage.value = 1
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '搜索失败'
  } finally {
    loading.value = false
  }
}

// ============ 事件处理 ============
const handleSearch = () => {
  currentPage.value = 1
  doSearch()
}

const setFilter = (filter: string) => {
  currentFilter.value = filter
  currentPage.value = 1
  loadData(filter)
}

const setCategory = (cat: string) => {
  currentCategory.value = currentCategory.value === cat ? '' : cat
  currentPage.value = 1
}

const goPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

const refreshList = () => {
  searchQuery.value = ''
  currentFilter.value = 'all'
  currentCategory.value = ''
  currentPage.value = 1
  loadData()
}

async function toggleStatus(item: McpServiceItem) {
  const newEnabled = !item.enabled
  const actionLabel = newEnabled ? '启用' : '停用'
  try {
    if (newEnabled) {
      await enableMcpService(item.identifier)
    } else {
      await disableMcpService(item.identifier)
    }
    item.enabled = newEnabled
    ElMessage.success(`「${item.name}」已${actionLabel}`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : `${actionLabel}失败`)
  }
}

async function deleteMCP(item: McpServiceItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除 MCP 服务「${item.name}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    try {
      await deleteMcpService(item.identifier)
      const idx = mcpItems.value.findIndex((d) => d.id === item.id)
      if (idx !== -1) mcpItems.value.splice(idx, 1)
      if (paginatedData.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
      }
      ElMessage.success(`已删除「${item.name}」`)
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '删除失败')
    }
  } catch {
    // 取消删除
  }
}

// ============ 对话框 ============
const dialogVisible = ref(false)
const dialogTitle = computed(() => (isEditing.value ? '编辑 MCP 服务' : '添加 MCP 服务'))
const isEditing = ref(false)
const editingIdentifier = ref('')
const submitting = ref(false)

const defaultFormData = (): McpCreateParams => ({
  name: '',
  identifier: '',
  url: '',
  description: '',
  category: 'data',
  enabled: true,
})

const formData = ref<McpCreateParams>(defaultFormData())

function openCreateDialog() {
  isEditing.value = false
  editingIdentifier.value = ''
  formData.value = defaultFormData()
  dialogVisible.value = true
}

function openEditDialog(item: McpServiceItem) {
  isEditing.value = true
  editingIdentifier.value = item.identifier
  formData.value = {
    name: item.name,
    identifier: item.identifier,
    url: item.url,
    description: item.description || '',
    category: item.category || 'data',
    enabled: item.enabled,
  }
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
}

async function submitForm() {
  if (!formData.value.name.trim()) {
    ElMessage.warning('请输入服务名称')
    return
  }
  if (!formData.value.identifier.trim()) {
    ElMessage.warning('请输入服务标识符')
    return
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.value.identifier.trim())) {
    ElMessage.warning('标识符仅支持英文、数字、下划线，且必须以英文或下划线开头')
    return
  }
  if (!formData.value.url.trim()) {
    ElMessage.warning('请输入服务地址')
    return
  }

  submitting.value = true
  try {
    if (isEditing.value) {
      // 编辑：先删除再创建（API 不支持直接编辑，但 identifier 不可改）
      await deleteMcpService(editingIdentifier.value)
    }
    const result = await createMcpService({
      name: formData.value.name.trim(),
      identifier: formData.value.identifier.trim(),
      url: formData.value.url.trim(),
      description: formData.value.description.trim(),
      category: formData.value.category,
      enabled: formData.value.enabled,
    })
    ElMessage.success(
      result.message ||
        (isEditing.value
          ? `MCP 服务「${result.data?.name || formData.value.name.trim()}」已更新`
          : `MCP 服务创建成功，共获取 ${result.tools_count ?? '?'} 个工具`),
    )
    closeDialog()
    // 刷新列表
    await loadData()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败，请检查服务地址是否可访问')
  } finally {
    submitting.value = false
  }
}

// ============ 详情对话框 ============
const detailVisible = ref(false)
const detailItem = ref<McpServiceItem | null>(null)

function openDetailDialog(item: McpServiceItem) {
  detailItem.value = item
  detailVisible.value = true
}

// ============ 生命周期 ============
onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* ================================================================
   McpManagementView — MCP 专区面板
   完全使用项目语义令牌，支持浅色 / 深色双主题
   ================================================================ */

/* ==================== 页面容器 ==================== */
.mcp-page {
  --mcp-card-radius: 18px;
  --mcp-gap: 28px;

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

.mcp-page--embedded {
  padding: 24px 28px 0;
  height: 100%;
  background: transparent;
}

/* ==================== 头部 ==================== */
.mcp-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40px;
  gap: 16px;
  flex: 0 0 auto;
}

.mcp-title-group {
  min-width: 0;
}

.mcp-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mcp-back-btn {
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

.mcp-back-btn:hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  transform: translateX(-2px);
}

.mcp-title-icon {
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

.mcp-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 780;
  letter-spacing: -0.02em;
  color: var(--app-text);
  line-height: 1.25;
}

.mcp-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 按钮基础 */
.mcp-btn-ghost {
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

.mcp-btn-primary {
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(79, 124, 255, 0.25);
  transition: all 0.25s ease;
}

.mcp-btn-primary:hover {
  box-shadow: 0 8px 28px rgba(79, 124, 255, 0.35);
  transform: translateY(-1px);
}

.mcp-retry-btn {
  --el-button-bg-color: var(--app-primary-soft);
  --el-button-border-color: transparent;
  --el-button-text-color: var(--app-primary);
  --el-button-hover-bg-color: var(--app-primary);
  --el-button-hover-border-color: var(--app-primary);
  --el-button-hover-text-color: #fff;
  border-radius: 12px;
  font-weight: 600;
  margin-top: 16px;
  height: 42px;
  padding: 0 24px;
}

/* ==================== 统计卡片 ==================== */
/* ==================== 主面板 ==================== */
.mcp-panel {
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.03),
    0 8px 24px rgba(24, 39, 75, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  flex: 1;
}

/* ==================== 统计卡片 ==================== */
.mcp-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin-bottom: 20px;
}

.mcp-summary__item {
  position: relative;
  min-width: 0;
  padding: 20px 24px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  transition: all 0.3s ease;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 4px 12px rgba(0, 0, 0, 0.04);
}

.mcp-summary__item:hover {
  transform: translateY(-2px);
  border-color: var(--app-border-hover);
  box-shadow:
    0 4px 8px rgba(79, 124, 255, 0.06),
    0 8px 24px rgba(0, 0, 0, 0.08);
}

.mcp-summary__item::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 16px;
  bottom: 16px;
  width: 4px;
  border-radius: 99px;
  background: var(--summary-color, var(--app-primary));
}

.mcp-summary__item--total {
  --summary-color: var(--app-primary);
}
.mcp-summary__item--enabled {
  --summary-color: var(--app-success);
}
.mcp-summary__item--disabled {
  --summary-color: var(--tc-amber);
}

.mcp-summary__item span,
.mcp-summary__item strong {
  margin-left: 8px;
  display: block;
}

.mcp-summary__item span {
  color: var(--app-text-muted);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.mcp-summary__item strong {
  margin-top: 6px;
  color: var(--app-text);
  font-size: 36px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
}

/* ==================== 工具栏 ==================== */
.mcp-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.mcp-search {
  width: min(360px, 100%);
  flex: 0 1 360px;
}

.mcp-toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: var(--app-text-muted);
  font-size: 12px;
  flex-shrink: 0;
}

.mcp-toolbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1 1 300px;
  min-width: 0;
  flex-wrap: wrap;
}

.mcp-search-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mcp-search-input {
  flex: 1;
  min-width: 260px;
  max-width: 480px;
}

.mcp-search-btn {
  --el-button-bg-color: var(--app-primary);
  --el-button-border-color: var(--app-primary);
  --el-button-text-color: #fff;
  --el-button-hover-bg-color: var(--app-primary);
  --el-button-hover-border-color: var(--app-primary);
  --el-button-hover-text-color: #fff;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  padding: 0;
  flex-shrink: 0;
}

.mcp-search-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  height: 42px;
  padding: 0 12px;
  box-shadow: none;
  transition: all 0.22s ease;
  background: var(--app-panel-muted);
  border: 1.5px solid var(--app-border);
}

.mcp-search-input :deep(.el-input__wrapper:hover) {
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-panel-muted) 96%, var(--app-primary) 4%);
}

.mcp-search-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--app-primary);
  background: var(--app-panel);
  box-shadow: 0 0 0 3px var(--app-primary-softer);
}

.mcp-search-input :deep(.el-input__inner) {
  font-size: 14px;
  color: var(--app-text);
}

.mcp-search-input :deep(.el-input__inner::placeholder) {
  color: var(--app-text-subtle);
}

.mcp-search-clear-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: var(--app-text-subtle);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.mcp-search-clear-btn:hover {
  background: var(--app-text-muted);
}

/* 筛选 chips */
.mcp-filter-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.mcp-filter-group--category {
  border-left: 1px solid var(--app-border);
  padding-left: 14px;
}

.mcp-filter-chip {
  padding: 8px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--app-border);
  background: var(--app-panel-muted);
  color: var(--app-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  min-height: 36px;
}

.mcp-filter-chip:hover {
  background: var(--app-primary-softer);
  color: var(--app-primary);
  border-color: var(--app-primary-soft);
}

.mcp-filter-chip--active {
  background: var(--app-primary);
  color: #fff;
  border-color: var(--app-primary);
  box-shadow: 0 2px 8px rgba(79, 124, 255, 0.25);
}

.mcp-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--app-text-muted);
  font-size: 13px;
  flex-shrink: 0;
}

/* ==================== 卡片网格 ==================== */
.mcp-grid-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.mcp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--mcp-gap);
  padding-top: 4px;
  padding-bottom: 8px;
}

/* ==================== 骨架加载 ==================== */
.mcp-card--skeleton {
  pointer-events: none;
  opacity: 0.6;
}

.mcp-avatar--skeleton {
  background: var(--app-border);
  animation: mcp-skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes mcp-skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.skeleton-line {
  height: 14px;
  background: var(--app-border);
  border-radius: 8px;
  animation: mcp-skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-line--name {
  width: 140px;
  height: 17px;
  margin-bottom: 6px;
}

.skeleton-line--desc {
  width: 200px;
  height: 13px;
}

.skeleton-line--endpoint {
  width: 100%;
  height: 36px;
  margin-bottom: 8px;
}

.skeleton-line--short {
  width: 80px;
  height: 13px;
}

/* ==================== MCP 卡片 ==================== */
.mcp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 28px 28px 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--mcp-card-radius);
  background: var(--app-panel);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 16px rgba(0, 0, 0, 0.06);
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease,
    border-color 0.22s ease;
  overflow: hidden;
  cursor: pointer;
  min-height: 280px;
}

.mcp-card:hover {
  transform: translateY(-4px);
  border-color: var(--app-border-hover);
  box-shadow:
    0 4px 8px rgba(79, 124, 255, 0.06),
    0 12px 32px rgba(79, 124, 255, 0.1);
}

.mcp-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: var(--mcp-card-radius);
  background: linear-gradient(135deg, var(--app-primary-softer), transparent);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.mcp-card:hover::before {
  opacity: 1;
}

/* 卡片头部 */
.mcp-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.mcp-card-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

/* 头像 */
.mcp-avatar {
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  font-weight: 700;
  font-size: 20px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.mcp-avatar--blue {
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
}
.mcp-avatar--purple {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}
.mcp-avatar--green {
  background: linear-gradient(135deg, var(--app-success), #059669);
}
.mcp-avatar--orange {
  background: linear-gradient(135deg, var(--tc-amber), #b45309);
}
.mcp-avatar--pink {
  background: linear-gradient(135deg, #ec4899, #be185d);
}
.mcp-avatar--teal {
  background: linear-gradient(135deg, var(--tc-cyan), #0f766e);
}
.mcp-avatar--red {
  background: linear-gradient(135deg, var(--app-danger), #b91c1c);
}
.mcp-avatar--indigo {
  background: linear-gradient(135deg, #6366f1, #4338ca);
}

.mcp-card-info {
  min-width: 0;
}

.mcp-card-name {
  font-weight: 700;
  font-size: 17px;
  color: var(--app-text);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.mcp-card-desc {
  font-size: 13px;
  color: var(--app-text-muted);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 分类徽章 */
.mcp-category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  margin-left: 8px;
}

/* 状态徽章 */
.mcp-card-status {
  flex-shrink: 0;
  margin-left: 8px;
}

.mcp-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.mcp-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.mcp-status-badge--active {
  background: var(--tc-green-bg);
  color: var(--app-success);
}
.mcp-status-badge--active .mcp-status-dot {
  background: var(--app-success);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
}

.mcp-status-badge--inactive {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}
.mcp-status-badge--inactive .mcp-status-dot {
  background: var(--app-danger);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
}

/* 卡片内容 */
.mcp-card-body {
  flex: 1;
  position: relative;
  z-index: 1;
  margin-bottom: 20px;
  padding: 0 2px;
}

.mcp-endpoint {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-panel-muted);
  font-size: 13px;
  color: var(--app-text-muted);
  font-family: 'Inter', monospace;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}

.mcp-endpoint .el-icon {
  color: var(--app-text-subtle);
  flex-shrink: 0;
  font-size: 13px;
}

.mcp-endpoint span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.mcp-card-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.mcp-card-identifier,
.mcp-card-tools {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--app-text-subtle);
}

.mcp-card-identifier {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mcp-card-identifier .el-icon,
.mcp-card-tools .el-icon {
  font-size: 13px;
  flex-shrink: 0;
}

/* 卡片底部 */
.mcp-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--app-border);
  position: relative;
  z-index: 1;
}

.mcp-card-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mcp-card-footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 切换开关 */
.mcp-toggle {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--app-border);
  border-radius: 40px;
  cursor: pointer;
  transition: background 0.3s ease;
  flex-shrink: 0;
  border: none;
  padding: 0;
}

.mcp-toggle::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.mcp-toggle--active {
  background: var(--app-primary);
}

.mcp-toggle--active::after {
  transform: translateX(20px);
}

/* 卡片操作按钮 */
.mcp-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mcp-action-btn {
  --el-button-bg-color: transparent;
  --el-button-border-color: transparent;
  --el-button-text-color: var(--app-text-muted);
  --el-button-hover-bg-color: var(--app-hover);
  --el-button-hover-border-color: var(--app-border);
  --el-button-hover-text-color: var(--app-text);
  min-width: 36px;
  min-height: 36px;
  padding: 6px;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.mcp-action-btn--danger {
  --el-button-text-color: var(--app-text-muted);
  --el-button-hover-text-color: var(--app-danger);
  --el-button-hover-bg-color: var(--app-danger-soft);
}

/* ==================== 空状态 & 错误 ==================== */
.mcp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--app-text-subtle);
  text-align: center;
  border: 1px dashed var(--app-border);
  border-radius: 24px;
  background: var(--app-panel-muted);
}

.mcp-empty .el-icon {
  color: var(--app-border);
  margin-bottom: 20px;
}

.mcp-empty p {
  font-size: 16px;
  max-width: 320px;
  color: var(--app-text-muted);
}

.mcp-empty--error .el-icon {
  color: var(--app-text-muted);
}

.mcp-empty--error p {
  color: var(--app-text-muted);
}

/* ==================== 分页 ==================== */
.mcp-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid var(--app-border);
  flex: 0 0 auto;
}

.mcp-pagination-info {
  font-size: 14px;
  color: var(--app-text-muted);
}

.mcp-pagination-info strong {
  color: var(--app-text);
  font-weight: 600;
}

.mcp-pagination-btns {
  display: flex;
  gap: 4px;
}

.mcp-page-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  font-weight: 500;
  font-size: 14px;
  color: var(--app-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.mcp-page-btn:hover:not(:disabled) {
  background: var(--app-hover);
  color: var(--app-text);
}

.mcp-page-btn--active {
  background: var(--app-primary-soft);
  color: var(--app-primary);
  border-color: var(--app-primary-soft);
}

.mcp-page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* ==================== 对话框 ==================== */
.mcp-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  padding: 24px;
}

.mcp-dialog {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
  border-radius: 24px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.12),
    0 24px 64px rgba(0, 0, 0, 0.18);
}

.mcp-dialog--detail {
  max-width: 520px;
}

.mcp-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px 0;
}

.mcp-dialog-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--app-text);
  letter-spacing: -0.01em;
}

.mcp-dialog-close {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  color: var(--app-text-muted);
  background: var(--app-panel-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.mcp-dialog-close:hover {
  color: var(--app-text);
  background: var(--app-hover);
  border-color: var(--app-border-hover);
}

.mcp-dialog-body {
  padding: 24px 28px;
}

.mcp-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 28px 24px;
}

/* 表单 */
.mcp-form-group {
  margin-bottom: 20px;
}

.mcp-form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
}

.mcp-form-required {
  color: var(--app-danger);
}

.mcp-form-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--app-text-subtle);
}

.mcp-form-row {
  display: flex;
  gap: 20px;
}

.mcp-form-group--half {
  flex: 1;
  min-width: 0;
}

.mcp-form-group--toggle {
  display: flex;
  flex-direction: column;
}

.mcp-form-toggle-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
}

.mcp-toggle--form {
  width: 48px;
  height: 28px;
}

.mcp-toggle--form::after {
  width: 22px;
  height: 22px;
  top: 3px;
  left: 3px;
}

.mcp-toggle--form.mcp-toggle--active::after {
  transform: translateX(20px);
}

.mcp-form-toggle-label {
  font-size: 14px;
  color: var(--app-text-muted);
  font-weight: 500;
}

.mcp-form-select {
  width: 100%;
}

.mcp-form-select :deep(.el-input__wrapper) {
  border-radius: 12px;
}

.mcp-form-group :deep(.el-input__wrapper),
.mcp-form-group :deep(.el-textarea__inner) {
  border-radius: 12px;
  background: var(--app-panel-muted);
  border-color: var(--app-border);
}

.mcp-form-group :deep(.el-input__wrapper:hover),
.mcp-form-group :deep(.el-textarea__inner:hover) {
  border-color: var(--app-primary);
}

.mcp-form-group :deep(.el-input__wrapper.is-focus),
.mcp-form-group :deep(.el-textarea__inner:focus) {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-softer);
}

/* 详情 */
.mcp-detail-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.mcp-detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mcp-detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mcp-detail-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text-muted);
  min-width: 72px;
  flex-shrink: 0;
}

.mcp-detail-label--block {
  margin-bottom: 2px;
}

.mcp-detail-value {
  font-size: 14px;
  color: var(--app-text);
  font-weight: 500;
}

.mcp-detail-mono {
  font-family: 'Inter', monospace;
  font-size: 13px;
  word-break: break-all;
}

.mcp-detail-desc {
  margin: 0;
  font-size: 14px;
  color: var(--app-text);
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 对话框过渡动画 */
.mcp-dialog-fade-enter-active,
.mcp-dialog-fade-leave-active {
  transition: opacity 0.25s ease;
}

.mcp-dialog-fade-enter-active .mcp-dialog,
.mcp-dialog-fade-leave-active .mcp-dialog {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.mcp-dialog-fade-enter-from,
.mcp-dialog-fade-leave-to {
  opacity: 0;
}

.mcp-dialog-fade-enter-from .mcp-dialog {
  transform: scale(0.94) translateY(12px);
}

.mcp-dialog-fade-leave-to .mcp-dialog {
  transform: scale(0.96) translateY(4px);
}

/* ==================== 响应式 ==================== */
@media (max-width: 1200px) {
  .mcp-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .mcp-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .mcp-page {
    padding: 20px 16px;
  }

  .mcp-page--embedded {
    padding: 12px 14px 0;
  }

  .mcp-header {
    flex-direction: column;
    align-items: stretch;
  }

  .mcp-header-actions {
    flex-wrap: wrap;
  }

  .mcp-stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .mcp-stat-card {
    padding: 16px 18px;
  }

  .mcp-stat-value {
    font-size: 26px;
  }

  .mcp-toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 14px 16px;
  }

  .mcp-toolbar-left {
    flex-wrap: wrap;
  }

  .mcp-search-input {
    min-width: 100%;
    max-width: 100%;
  }

  .mcp-filter-group--category {
    border-left: none;
    padding-left: 0;
  }

  .mcp-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .mcp-card {
    padding: 20px;
  }

  .mcp-pagination {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .mcp-card-footer {
    flex-wrap: wrap;
    gap: 10px;
  }

  .mcp-header h1 {
    font-size: 22px;
  }

  .mcp-form-row {
    flex-direction: column;
    gap: 0;
  }

  .mcp-dialog {
    max-width: 100%;
    margin: 0;
    border-radius: 20px;
  }

  .mcp-dialog-header,
  .mcp-dialog-body {
    padding-left: 20px;
    padding-right: 20px;
  }

  .mcp-dialog-footer {
    padding: 0 20px 20px;
  }
}

@media (max-width: 640px) {
  .mcp-stats-grid {
    gap: 8px;
  }

  .mcp-stat-card {
    padding: 14px 16px;
  }

  .mcp-stat-value {
    font-size: 22px;
  }

  .mcp-stat-label {
    font-size: 11px;
  }

  .mcp-title-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .mcp-card-name {
    font-size: 15px;
  }

  .mcp-card-desc {
    font-size: 12px;
  }
}

/* ==================== 深色模式微调 ==================== */
:root[data-theme='dark'] .mcp-page {
  background:
    radial-gradient(ellipse 80% 50% at 10% 0%, rgba(0, 170, 255, 0.06), transparent 38%),
    radial-gradient(ellipse 60% 40% at 92% 94%, rgba(0, 170, 255, 0.04), transparent 32%),
    radial-gradient(ellipse 50% 30% at 50% 50%, rgba(0, 170, 255, 0.025), transparent 40%),
    var(--app-bg-gradient);
}

:root[data-theme='dark'] .mcp-page--embedded {
  background: transparent;
}

:root[data-theme='dark'] .mcp-title-icon {
  background: linear-gradient(135deg, var(--app-primary), #0070c0);
  box-shadow: 0 8px 24px rgba(0, 170, 255, 0.25);
}

:root[data-theme='dark'] .mcp-summary__item {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 4px 12px rgba(0, 0, 0, 0.12);
}

:root[data-theme='dark'] .mcp-card {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 4px 12px rgba(0, 0, 0, 0.12);
}

:root[data-theme='dark'] .mcp-card:hover {
  box-shadow:
    0 2px 4px rgba(0, 170, 255, 0.08),
    0 16px 36px rgba(0, 0, 0, 0.22);
  border-color: color-mix(in srgb, var(--app-primary) 40%, var(--app-border));
}

:root[data-theme='dark'] .mcp-card::before {
  background: linear-gradient(135deg, rgba(0, 170, 255, 0.04), transparent);
}

:root[data-theme='dark'] .mcp-status-badge--active {
  background: var(--tc-green-bg);
  color: var(--app-success);
}
:root[data-theme='dark'] .mcp-status-badge--active .mcp-status-dot {
  background: var(--app-success);
}

:root[data-theme='dark'] .mcp-status-badge--inactive {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}
:root[data-theme='dark'] .mcp-status-badge--inactive .mcp-status-dot {
  background: var(--app-danger);
}

:root[data-theme='dark'] .mcp-toolbar {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.2);
}

:root[data-theme='dark'] .mcp-empty {
  background: var(--app-panel-muted);
  border-color: var(--app-border);
}

:root[data-theme='dark'] .mcp-dialog-overlay {
  background: rgba(0, 0, 0, 0.6);
}

:root[data-theme='dark'] .mcp-dialog {
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 24px 64px rgba(0, 0, 0, 0.4);
}
</style>
