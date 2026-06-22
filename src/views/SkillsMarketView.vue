<template>
  <div class="skills-market-page" :class="{ 'skills-market-page--embedded': isEmbedded }">
    <!-- 页面头部 -->
    <header class="skills-market-header">
      <div class="skills-market-title-group">
        <div class="skills-market-title-row">
          <button
            v-if="!isManageMode"
            class="skills-market-back-link"
            type="button"
            @click="goBack"
          >
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <span class="skills-market-title-icon">
            <el-icon><MagicStick /></el-icon>
          </span>
          <div>
            <h1>{{ pageTitle }}</h1>
          </div>
        </div>
      </div>
    </header>

    <!-- 主面板 -->
    <div class="skills-panel">
      <!-- 工具栏 -->
      <div class="skills-toolbar">
        <el-select
          v-model="selectedCategory"
          placeholder="全部分类"
          class="toolbar-category"
          clearable
        >
          <el-option label="全部分类" value="" />
          <el-option
            v-for="category in apiCategories"
            :key="category.value"
            :label="category.label"
            :value="category.value"
          />
        </el-select>

        <el-input
          v-model="searchKeyword"
          placeholder="搜索技能名称或描述..."
          class="toolbar-search"
          clearable
          :prefix-icon="Search"
          @keyup.enter="handleQuerySubmit"
        />

        <el-button type="primary" :icon="Search" :loading="listLoading" @click="handleQuerySubmit">
          查询
        </el-button>
        <el-button :icon="Refresh" @click="handleQueryReset">重置</el-button>

        <el-button v-if="showAddButton" type="primary" class="toolbar-add" @click="handleAddSkill">
          <el-icon><Plus /></el-icon>
          <span>新增技能</span>
        </el-button>
      </div>

      <!-- 技能卡片 -->
      <div class="skills-grid">
        <template v-if="listLoading">
          <div
            v-for="index in loadingCardCount"
            :key="`skill-loading-card-${index}`"
            class="skill-card skill-card--loading"
            aria-hidden="true"
          >
            <div class="skill-loading-card__header">
              <span class="skill-loading-card__title"></span>
            </div>
            <div class="skill-loading-card__line skill-loading-card__line--wide"></div>
            <div class="skill-loading-card__line"></div>
            <div class="skill-loading-card__tag"></div>
          </div>
        </template>

        <div
          v-for="skill in filteredSkills"
          :key="skill.id"
          class="skill-card"
          :class="{ 'skill-card--pinned': skill.isPinned }"
        >
          <!-- 顶部渐变装饰线 -->
          <div class="card-accent"></div>

          <!-- 图标区域 -->
          <div class="card-icon" :style="{ background: getCategoryGradient(skill.category) }">
            <el-icon :size="22"><component :is="getSkillIcon(skill.title)" /></el-icon>
          </div>

          <!-- 正文 -->
          <div class="card-body">
            <h3 class="card-title">{{ skill.title }}</h3>
            <el-tooltip
              :content="skill.description"
              placement="top"
              :disabled="!isSkillDescriptionOverflowing(skill.id)"
              popper-class="skill-description-tooltip"
            >
              <p
                :ref="(element) => setSkillDescriptionRef(skill.id, element)"
                class="card-description"
              >
                {{ skill.description }}
              </p>
            </el-tooltip>
          </div>

          <!-- 底部分类标签 -->
          <div class="card-footer">
            <span
              class="card-category-tag"
              :style="{
                color: getTagColor(skill.category),
                background: getTagColor(skill.category) + '18',
                borderColor: getTagColor(skill.category) + '30',
              }"
            >
              {{ getCategoryLabel(skill.category) }}
            </span>
          </div>
        </div>

        <div v-if="!listLoading && filteredSkills.length === 0" class="empty-state">
          <el-empty description="暂无匹配的技能" />
        </div>
      </div>

      <!-- 分页 -->
      <div class="skills-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="pageSizeOptions"
          :total="totalSkills"
          layout="total, prev, pager, next"
          background
          @current-change="loadSkills"
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 上传技能对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      width="520px"
      align-center
      destroy-on-close
      class="skill-upload-dialog"
      title="新增技能"
    >
      <div class="skill-upload">
        <input
          ref="skillUploadInput"
          class="skill-upload__input"
          type="file"
          accept=".zip"
          @change="handleSkillFileChange"
        />
        <button class="skill-upload__dropzone" type="button" @click="openSkillFilePicker">
          <el-icon class="skill-upload__dropzone-icon"><UploadFilled /></el-icon>
          <span class="skill-upload__title">
            {{ selectedSkillFile ? selectedSkillFile.name : '点击选择技能包文件' }}
          </span>
          <span class="skill-upload__desc">支持上传 .zip 格式的技能包</span>
        </button>
      </div>

      <template #footer>
        <div class="skill-upload__footer">
          <el-button :loading="templateDownloading" @click="downloadTemplate">下载模板</el-button>
          <div class="skill-upload__actions">
            <el-button @click="uploadDialogVisible = false">取消</el-button>
            <el-button
              type="primary"
              :disabled="!selectedSkillFile"
              :loading="skillUploading"
              @click="handleUploadSkill"
            >
              上传
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Document,
  EditPen,
  MagicStick,
  Plus,
  Refresh,
  Search,
  UploadFilled,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getSkillTemplate,
  getSkillsList,
  uploadSkill,
  type SkillApiItem,
  type SkillListResponse,
} from '@/api/skillsMarket'
import { isAdminAccount } from '@/utils/auth'

const router = useRouter()
const route = useRoute()
const props = withDefaults(defineProps<{ embedded?: boolean; manage?: boolean }>(), {
  embedded: false,
  manage: false,
})

interface SkillItem {
  id: string
  title: string
  description: string
  category: string
  isPinned: boolean
  createdAt: number
}

// 模拟数据：API 为空时用于演示展示
const MOCK_SKILLS: SkillApiItem[] = [
  {
    name: '习近平总书记重要论述知识库查询',
    description: '检索习近平总书记重要讲话、文章和重要论述，提供精准的知识库查询服务',
    category: '知识检索',
  },
  {
    name: '投资受损群体防控报告',
    description: '生成投资受损群体防控相关的公安公文报告，支持数据分析和风险评估',
    category: '办公',
  },
  {
    name: '公文规范表述核稿',
    description: '对公安公文材料进行规范表述审核，自动识别不规范之处并提出修改建议',
    category: '办公',
  },
]

// 状态管理
const selectedCategory = ref('')
const searchKeyword = ref('')
const descriptionKeyword = ref('')
const skillsList = ref<SkillItem[]>([])
const fullSkillItems = ref<SkillApiItem[]>([])
const fullSkillListLoaded = ref(false)
const categoryOptions = ref<string[]>([])
const listLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(12)
const totalSkills = ref(0)
const uploadDialogVisible = ref(false)
const selectedSkillFile = ref<File | null>(null)
const skillUploadInput = ref<HTMLInputElement | null>(null)
const templateDownloading = ref(false)
const skillUploading = ref(false)
const skillDescriptionElements = new Map<string, HTMLElement>()
const overflowingDescriptionIds = ref(new Set<string>())
const loadingCardCount = 12
const maxApiPageSize = 100
const isManageMode = computed(() => props.manage || route.query.mode === 'manage')
const isEmbedded = computed(() => props.embedded || window.self !== window.top)
const showAddButton = computed(() => isManageMode.value && isAdminAccount())
const pageTitle = computed(() => (isManageMode.value ? '技能管理' : '技能库'))
const pageDescription = computed(() =>
  isManageMode.value ? '管理技能配置和技能包上传' : '浏览并使用可用技能',
)

const apiCategories = computed(() =>
  categoryOptions.value.map((category) => ({ label: category, value: category })),
)
const pageSizeOptions = [8, 12, 16, 24]

let descriptionResizeObserver: ResizeObserver | null = null
let descriptionMeasureFrame = 0

const goBack = () => {
  router.push('/')
}

const normalizeSkill = (skill: SkillApiItem, index: number): SkillItem => ({
  id: `${currentPage.value}-${index}-${skill.name || 'skill'}`,
  title: skill.name || '未命名技能',
  description: skill.description?.trim() || '暂无描述',
  category: skill.category || '',
  isPinned: false,
  createdAt: Date.now() - index,
})

const measureSkillDescriptionOverflow = () => {
  const nextOverflowingIds = new Set<string>()
  skillDescriptionElements.forEach((element, skillId) => {
    if (
      element.scrollHeight > element.clientHeight + 1 ||
      element.scrollWidth > element.clientWidth + 1
    ) {
      nextOverflowingIds.add(skillId)
    }
  })
  overflowingDescriptionIds.value = nextOverflowingIds
}

const scheduleSkillDescriptionMeasure = () => {
  if (typeof window === 'undefined') return
  if (descriptionMeasureFrame) {
    window.cancelAnimationFrame(descriptionMeasureFrame)
  }
  descriptionMeasureFrame = window.requestAnimationFrame(() => {
    descriptionMeasureFrame = 0
    measureSkillDescriptionOverflow()
  })
}

const setSkillDescriptionRef = (skillId: string, element: unknown) => {
  const previousElement = skillDescriptionElements.get(skillId)
  if (previousElement && previousElement !== element) {
    descriptionResizeObserver?.unobserve(previousElement)
  }
  if (element instanceof HTMLElement) {
    skillDescriptionElements.set(skillId, element)
    descriptionResizeObserver?.observe(element)
  } else {
    skillDescriptionElements.delete(skillId)
    overflowingDescriptionIds.value.delete(skillId)
  }
  scheduleSkillDescriptionMeasure()
}

const isSkillDescriptionOverflowing = (skillId: string) =>
  overflowingDescriptionIds.value.has(skillId)

const resolveSkillItems = (response: SkillListResponse): SkillApiItem[] => {
  if (response.skills?.length) return response.skills
  if (response.categories?.length) {
    return response.categories.flatMap((group) =>
      (group.skills || []).map((skill) => ({
        ...skill,
        category: skill.category || group.category || '',
      })),
    )
  }
  return (response.skilllist || []).map((name) => ({
    name,
    description: '',
    category: '',
  }))
}

const resolveFullSkillItems = (response: SkillListResponse): SkillApiItem[] => {
  const detailedItems = resolveSkillItems({ ...response, skilllist: undefined })
  if (detailedItems.length) return detailedItems
  return resolveSkillItems(response)
}

const resolveTotalCount = (
  response: SkillListResponse,
  requestedPageSize: number,
  currentItemCount: number,
) => {
  const total = Number(response.total || 0)
  if (Number.isFinite(total) && total > 0) return total
  const totalPages = Number(response.total_pages || 0)
  if (Number.isFinite(totalPages) && totalPages > 0) {
    return Math.max(currentItemCount, totalPages * requestedPageSize)
  }
  return currentItemCount
}

const hasPaginationTotal = (response: SkillListResponse) =>
  Number(response.total || 0) > 0 || Number(response.total_pages || 0) > 0

const resolveTotalPages = (response: SkillListResponse, requestedPageSize: number) => {
  const totalPages = Number(response.total_pages || 0)
  if (Number.isFinite(totalPages) && totalPages > 0) return totalPages
  const total = Number(response.total || 0)
  if (Number.isFinite(total) && total > 0) return Math.ceil(total / requestedPageSize)
  return 1
}

const updatePagedFullSkills = () => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  skillsList.value = fullSkillItems.value.slice(start, end).map(normalizeSkill)
  totalSkills.value = fullSkillItems.value.length
}

const loadFullSkills = async () => {
  if (!fullSkillListLoaded.value) {
    try {
      const firstResponse = await getSkillsList({ page: 1, page_size: maxApiPageSize })
      if (firstResponse.categorylist) {
        categoryOptions.value = firstResponse.categorylist
      }
      const firstItems = resolveFullSkillItems(firstResponse)
      if (firstResponse.skilllist?.length) {
        fullSkillItems.value = firstItems
      } else if (hasPaginationTotal(firstResponse)) {
        const totalPages = resolveTotalPages(firstResponse, maxApiPageSize)
        const remainingRequests = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
          getSkillsList({ page: index + 2, page_size: maxApiPageSize }),
        )
        const remainingResponses = await Promise.all(remainingRequests)
        fullSkillItems.value = [
          ...firstItems,
          ...remainingResponses.flatMap((response) => resolveFullSkillItems(response)),
        ]
      } else {
        const items = [...firstItems]
        let nextPage = 2
        let lastPageCount = firstItems.length
        const maxFallbackPages = 200
        while (lastPageCount >= maxApiPageSize && nextPage <= maxFallbackPages) {
          const response = await getSkillsList({ page: nextPage, page_size: maxApiPageSize })
          const pageItems = resolveFullSkillItems(response)
          items.push(...pageItems)
          lastPageCount = pageItems.length
          nextPage += 1
        }
        fullSkillItems.value = items
      }
    } catch {
      fullSkillItems.value = []
    }

    // API 返回空数据或加载失败时使用模拟数据
    if (fullSkillItems.value.length === 0) {
      fullSkillItems.value = [...MOCK_SKILLS]
      if (categoryOptions.value.length === 0) {
        const mockCategories = [...new Set(MOCK_SKILLS.map((s) => s.category || '未分类'))]
        categoryOptions.value = mockCategories
      }
    }
    fullSkillListLoaded.value = true
  }
  updatePagedFullSkills()
}

const loadSkills = async () => {
  listLoading.value = true
  try {
    const keyword = searchKeyword.value.trim()
    const description = descriptionKeyword.value.trim()
    const isFullQuery = !selectedCategory.value && !keyword && !description

    if (isFullQuery) {
      await loadFullSkills()
      return
    }

    const response = await getSkillsList({
      page: currentPage.value,
      page_size: pageSize.value,
      category: selectedCategory.value || undefined,
      name: keyword || undefined,
      description: description || undefined,
    })
    skillsList.value = resolveSkillItems(response).map(normalizeSkill)
    totalSkills.value = resolveTotalCount(response, pageSize.value, skillsList.value.length)

    // API 返回空数据时使用模拟数据（根据筛选条件过滤）
    if (skillsList.value.length === 0) {
      let filtered = [...MOCK_SKILLS]
      if (selectedCategory.value) {
        filtered = filtered.filter((s) => (s.category || '') === selectedCategory.value)
      }
      if (keyword) {
        const kw = keyword.toLowerCase()
        filtered = filtered.filter((s) => (s.name || '').toLowerCase().includes(kw))
      }
      if (description) {
        const desc = description.toLowerCase()
        filtered = filtered.filter((s) => (s.description || '').toLowerCase().includes(desc))
      }
      skillsList.value = filtered.map((s, i) => normalizeSkill(s, i))
      totalSkills.value = skillsList.value.length
    }
  } catch (error) {
    // API 失败时使用模拟数据
    skillsList.value = MOCK_SKILLS.map((s, i) => normalizeSkill(s, i))
    totalSkills.value = MOCK_SKILLS.length
    if (categoryOptions.value.length === 0) {
      categoryOptions.value = [...new Set(MOCK_SKILLS.map((s) => s.category || '未分类'))]
    }
  } finally {
    listLoading.value = false
  }
}

const handlePageSizeChange = () => {
  currentPage.value = 1
  refreshCurrentSkills()
}

const refreshCurrentSkills = () => {
  if (!selectedCategory.value && !searchKeyword.value.trim() && !descriptionKeyword.value.trim()) {
    updatePagedFullSkills()
    return
  }
  loadSkills()
}

const openSkillFilePicker = () => {
  skillUploadInput.value?.click()
}

const handleSkillFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedSkillFile.value = input.files?.[0] || null
}

const downloadTemplate = async () => {
  templateDownloading.value = true
  try {
    const response = await getSkillTemplate()
    if (!response.download_url) {
      throw new Error('模板下载地址为空')
    }
    const link = document.createElement('a')
    link.href = response.download_url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    if (response.filename) {
      link.download = response.filename
    }
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '模板下载失败')
  } finally {
    templateDownloading.value = false
  }
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { detail?: string; message?: string } } }).response
      ?.data
    return data?.detail || data?.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

const handleUploadSkill = async () => {
  if (!selectedSkillFile.value) {
    ElMessage.warning('请先选择技能包文件')
    return
  }
  skillUploading.value = true
  try {
    const response = await uploadSkill(selectedSkillFile.value)
    ElMessage.success(response.message || '技能上传成功')
    uploadDialogVisible.value = false
    selectedSkillFile.value = null
    if (skillUploadInput.value) {
      skillUploadInput.value.value = ''
    }
    fullSkillItems.value = []
    fullSkillListLoaded.value = false
    currentPage.value = 1
    await loadSkills()
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error, '技能上传失败'))
  } finally {
    skillUploading.value = false
  }
}

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    descriptionResizeObserver = new ResizeObserver(scheduleSkillDescriptionMeasure)
  }
  loadSkills()
})

onBeforeUnmount(() => {
  if (descriptionMeasureFrame) {
    window.cancelAnimationFrame(descriptionMeasureFrame)
  }
  descriptionResizeObserver?.disconnect()
})

const filteredSkills = computed(() => {
  const result = [...skillsList.value]
  result.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return b.createdAt - a.createdAt
  })
  return result
})

watch([filteredSkills, listLoading], async () => {
  await nextTick()
  scheduleSkillDescriptionMeasure()
})

const getCategoryLabel = (categoryValue: string): string => categoryValue || '未分类'

// 技能图标映射：根据技能名称返回对应的 Element Plus 图标组件
const SKILL_ICON_MAP: Record<string, typeof MagicStick> = {
  投资受损群体防控报告: Document,
  公文规范表述核稿: EditPen,
  习近平总书记重要论述知识库查询: Search,
}
const getSkillIcon = (title: string) => SKILL_ICON_MAP[title] || MagicStick

// 分类渐变色映射：每个分类对应不同的图标背景渐变
const CATEGORY_GRADIENTS: Record<string, string> = {
  办公: 'linear-gradient(135deg, #4f7cff, #7b9fff)',
  知识检索: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
}
const DEFAULT_CATEGORY_GRADIENT = 'linear-gradient(135deg, #64748b, #94a3b8)'
const getCategoryGradient = (category: string) =>
  CATEGORY_GRADIENTS[category] || DEFAULT_CATEGORY_GRADIENT

const TAG_PALETTE = [
  '#4f7cff',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#14b8a6',
]
const tagColorCache = new Map<string, string>()

const getTagColor = (categoryValue: string): string => {
  if (!categoryValue) return TAG_PALETTE[0]
  const cached = tagColorCache.get(categoryValue)
  if (cached) return cached
  let hash = 0
  for (let i = 0; i < categoryValue.length; i++) {
    hash = (hash << 5) - hash + categoryValue.charCodeAt(i)
    hash |= 0
  }
  const color = TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length]
  tagColorCache.set(categoryValue, color)
  return color
}

const handleQuerySubmit = () => {
  currentPage.value = 1
  loadSkills()
}

const handleQueryReset = () => {
  selectedCategory.value = ''
  searchKeyword.value = ''
  descriptionKeyword.value = ''
  currentPage.value = 1
  loadSkills()
}

const handleAddSkill = () => {
  selectedSkillFile.value = null
  if (skillUploadInput.value) {
    skillUploadInput.value.value = ''
  }
  uploadDialogVisible.value = true
}
</script>

<style scoped>
/* ================================================================
   SkillsMarketView — 技能库 / 技能管理
   完全使用项目语义令牌，支持浅色 / 深色双主题
   ================================================================ */

/* ==================== 页面容器 ==================== */
.skills-market-page {
  --skills-card-radius: 16px;
  --skills-gap: 20px;

  padding: 28px 36px 20px;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  color: var(--app-text);
  background: var(--app-bg);
}

.skills-market-page--embedded {
  padding: 24px 28px 0;
  height: 100%;
  background: transparent;
}

/* ==================== 页面头部 ==================== */
.skills-market-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 36px;
  gap: 16px;
  flex: 0 0 auto;
}

.skills-market-title-group {
  min-width: 0;
}

.skills-market-back-link {
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

.skills-market-back-link:hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  transform: translateX(-2px);
}

.skills-market-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.skills-market-title-icon {
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

.skills-market-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 780;
  letter-spacing: -0.02em;
  color: var(--app-text);
  line-height: 1.25;
}

/* ==================== 工具栏 ==================== */
/* ==================== 主面板 ==================== */
.skills-panel {
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

/* ==================== 工具栏 ==================== */
.skills-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex: 0 0 auto;
  flex-wrap: wrap;
}

.toolbar-category {
  width: 140px;
  flex-shrink: 0;
}

.toolbar-search {
  width: 320px;
  flex: 0 0 auto;
}

.toolbar-category :deep(.el-input__wrapper),
.toolbar-search :deep(.el-input__wrapper) {
  border-radius: 10px;
  height: 40px;
  box-shadow: none;
  background: var(--app-panel-muted);
  border: 1.5px solid var(--app-border);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.toolbar-category :deep(.el-input__wrapper:hover),
.toolbar-search :deep(.el-input__wrapper:hover) {
  border-color: var(--app-border-hover);
}

.toolbar-category :deep(.el-input__wrapper.is-focus),
.toolbar-search :deep(.el-input__wrapper.is-focus) {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-softer);
}

.toolbar-category :deep(.el-input__inner),
.toolbar-search :deep(.el-input__inner) {
  font-size: 14px;
  color: var(--app-text);
}

.toolbar-category :deep(.el-input__inner::placeholder),
.toolbar-search :deep(.el-input__inner::placeholder) {
  color: var(--app-text-subtle);
}

.toolbar-add {
  flex-shrink: 0;
  margin-left: auto;
}

/* ==================== 卡片网格 ==================== */
.skills-grid {
  flex: 1;
  min-height: 0;
  margin: 0 0 24px;
  padding: 4px 4px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: auto;
  gap: 24px;
  align-content: start;
}

/* ==================== 卡片样式 ==================== */
.skill-card {
  position: relative;
  background: var(--app-panel);
  border-radius: 18px;
  border: 1px solid var(--app-border);
  padding: 0;
  transition:
    transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.25s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 252px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 4px 16px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* 顶部渐变装饰线 */
.card-accent {
  position: absolute;
  top: 0;
  left: 50%;
  translate: -50% 0;
  width: 50%;
  height: 3px;
  border-radius: 0 0 999px 999px;
  background: linear-gradient(90deg, transparent, var(--app-primary), transparent);
  opacity: 0;
  transition:
    opacity 0.3s ease,
    width 0.3s ease;
  z-index: 2;
  pointer-events: none;
}

.skill-card:hover .card-accent {
  opacity: 1;
  width: 75%;
}

/* 斜向流光 */
.skill-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    120deg,
    transparent 38%,
    rgba(79, 124, 255, 0.02) 43%,
    rgba(79, 124, 255, 0.06) 47%,
    rgba(79, 124, 255, 0.08) 50%,
    rgba(79, 124, 255, 0.06) 53%,
    rgba(79, 124, 255, 0.02) 57%,
    transparent 62%
  );
  transform: translateX(-100%) skewX(-14deg);
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
  pointer-events: none;
}

.skill-card:hover::before {
  transform: translateX(0%) skewX(-14deg);
}

.skill-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow:
    0 2px 4px rgba(79, 124, 255, 0.06),
    0 14px 32px rgba(79, 124, 255, 0.14),
    0 28px 56px rgba(79, 124, 255, 0.08);
  border-color: color-mix(in srgb, var(--app-primary) 45%, var(--app-border));
}

.skill-card--pinned {
  border-color: color-mix(in srgb, var(--app-primary) 22%, var(--app-border));
  background: linear-gradient(160deg, var(--app-panel) 0%, var(--app-primary-softer) 100%);
  box-shadow:
    0 1px 2px rgba(79, 124, 255, 0.04),
    0 6px 16px rgba(79, 124, 255, 0.1);
}

.skill-card--pinned::before {
  display: none;
}

.skill-card--loading {
  cursor: default;
  padding: 28px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 12px rgba(0, 0, 0, 0.03);
}
.skill-card--loading::before {
  display: none;
}

.skill-card--loading:hover {
  transform: none;
  border-color: var(--app-border);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 12px rgba(0, 0, 0, 0.03);
}

/* ==================== 卡片内容 ==================== */

/* 图标 */
.card-icon {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #fff;
  margin: 28px 28px 0;
  font-size: 18px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.skill-card:hover .card-icon {
  transform: scale(1.08);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

/* 正文区域 */
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 28px 0;
  position: relative;
  z-index: 1;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
  margin: 0;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.card-description {
  font-size: 13px;
  color: var(--app-text-muted);
  line-height: 1.65;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 底部分类标签 */
.card-footer {
  padding: 18px 28px 24px;
  position: relative;
  z-index: 1;
}

.card-category-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid;
  line-height: 1.4;
}

/* 表格视图分类标签 */
.skill-category-tag {
  --el-tag-border-radius: 6px;
  border-radius: 6px;
  font-weight: 620;
  font-size: 11px;
  letter-spacing: 0.02em;
  border: none;
  padding: 2px 10px;
  line-height: 20px;
}

/* ==================== 加载骨架 ==================== */
.skill-loading-card__header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.skill-loading-card__title {
  width: 56%;
  height: 16px;
  border-radius: 999px;
}

.skill-loading-card__line {
  width: 66%;
  height: 12px;
  margin-top: 12px;
  border-radius: 999px;
}

.skill-loading-card__line--wide {
  width: 90%;
}

.skill-loading-card__tag {
  width: 80px;
  height: 24px;
  margin-top: auto;
  border-radius: 6px;
}

.skill-loading-card__title,
.skill-loading-card__line,
.skill-loading-card__tag {
  position: relative;
  display: block;
  overflow: hidden;
  background: var(--app-skeleton-line-bg);
}

.skill-loading-card__title::after,
.skill-loading-card__line::after,
.skill-loading-card__tag::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 44%;
  border-radius: inherit;
  background: linear-gradient(96deg, transparent, var(--app-skeleton-shimmer), transparent);
  animation: skillsLoadingSweep 1.5s ease-in-out infinite;
}

@keyframes skillsLoadingSweep {
  0% {
    transform: translateX(-130%);
  }
  100% {
    transform: translateX(260%);
  }
}

/* ==================== 分页 ==================== */
.skills-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--app-border);
  flex: 0 0 auto;
}

.skills-pagination :deep(.el-pagination) {
  --el-pagination-bg-color: var(--app-panel-muted);
  --el-pagination-button-bg-color: var(--app-panel-muted);
  --el-pagination-hover-color: var(--app-primary);
}

/* ==================== 空状态 ==================== */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 420px;
}

/* ==================== 上传对话框 ==================== */
:global(.skill-upload-dialog.el-dialog) {
  --el-dialog-bg-color: var(--app-panel);
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: var(--app-panel);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 20px 56px rgba(24, 39, 75, 0.18);
}

:global(.skill-upload-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 22px 24px 14px;
  border-bottom: 1px solid var(--app-border);
}

:global(.skill-upload-dialog .el-dialog__title) {
  color: var(--app-text);
  font-size: 17px;
  font-weight: 760;
}

:global(.skill-upload-dialog .el-dialog__body) {
  padding: 24px;
}

:global(.skill-upload-dialog .el-dialog__footer) {
  padding: 0 24px 24px;
}

.skill-upload__input {
  display: none;
}

.skill-upload__dropzone {
  width: 100%;
  min-height: 152px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 28px 24px;
  border: 2px dashed var(--app-border);
  border-radius: 14px;
  color: var(--app-text);
  background: var(--app-panel-muted);
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.22s ease,
    background 0.22s ease,
    transform 0.15s ease;
}

.skill-upload__dropzone:hover {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  transform: scale(1.008);
}

.skill-upload__dropzone:active {
  transform: scale(0.995);
}

.skill-upload__dropzone-icon {
  font-size: 36px;
  color: var(--app-primary);
  opacity: 0.8;
}

.skill-upload__title {
  max-width: 100%;
  overflow: hidden;
  font-size: 15px;
  font-weight: 660;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-upload__desc {
  color: var(--app-text-muted);
  font-size: 13px;
}

.skill-upload__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.skill-upload__actions {
  display: inline-flex;
  gap: 10px;
}

/* ==================== 滚动条 ==================== */
.skills-grid::-webkit-scrollbar {
  width: 6px;
}

.skills-grid::-webkit-scrollbar-track {
  background: transparent;
}

.skills-grid::-webkit-scrollbar-thumb {
  background: var(--app-scrollbar);
  border-radius: 999px;
}

.skills-grid::-webkit-scrollbar-thumb:hover {
  background: var(--app-scrollbar-hover);
}

/* ==================== 响应式 ==================== */
@media (max-width: 1200px) {
  .skills-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1100px) {
  .skills-toolbar {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .skills-market-page {
    padding: 20px 16px;
  }

  .skills-market-page--embedded {
    padding: 12px 14px 0;
  }

  .skills-grid {
    gap: 18px;
  }

  .skill-card {
    min-height: 220px;
  }

  .card-icon {
    width: 44px;
    height: 44px;
    margin: 22px 22px 0;
  }

  .card-body {
    padding: 14px 22px 0;
  }

  .card-footer {
    padding: 14px 22px 20px;
  }

  .skills-toolbar {
    flex-direction: column;
    gap: 12px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
  }

  .skills-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-category {
    width: 100%;
  }

  .toolbar-add {
    margin-left: 0;
  }

  .skills-market-header h1 {
    font-size: 20px;
  }
}

@media (max-width: 640px) {
  .skills-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .skill-card {
    min-height: 200px;
  }

  .card-icon {
    width: 40px;
    height: 40px;
    margin: 20px 20px 0;
  }

  .card-body {
    padding: 12px 20px 0;
  }

  .card-title {
    font-size: 15px;
  }

  .card-footer {
    padding: 12px 20px 18px;
  }

  .skill-upload__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .skill-upload__actions {
    justify-content: flex-end;
  }
}

/* ==================== 深色模式适配 ==================== */
:root[data-theme='dark'] .skills-market-page {
  background:
    radial-gradient(ellipse 80% 50% at 10% 0%, rgba(0, 170, 255, 0.06), transparent 38%),
    radial-gradient(ellipse 60% 40% at 92% 94%, rgba(0, 170, 255, 0.04), transparent 32%),
    radial-gradient(ellipse 50% 30% at 50% 50%, rgba(0, 170, 255, 0.025), transparent 40%),
    var(--app-bg-gradient);
}

:root[data-theme='dark'] .skills-market-page--embedded {
  background: transparent;
}

:root[data-theme='dark'] .skills-market-title-icon {
  background: linear-gradient(135deg, var(--app-primary), #0070c0);
  box-shadow: 0 8px 24px rgba(0, 170, 255, 0.25);
}

:root[data-theme='dark'] .skills-toolbar {
  background: var(--app-panel);
  border-color: var(--app-border);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.2);
}

:root[data-theme='dark'] .skill-card {
  background: var(--app-panel);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.16);
}

:root[data-theme='dark'] .skill-card::before {
  background: linear-gradient(
    120deg,
    transparent 38%,
    rgba(0, 170, 255, 0.015) 43%,
    rgba(0, 170, 255, 0.04) 47%,
    rgba(0, 170, 255, 0.055) 50%,
    rgba(0, 170, 255, 0.04) 53%,
    rgba(0, 170, 255, 0.015) 57%,
    transparent 62%
  );
}

:root[data-theme='dark'] .card-accent {
  background: linear-gradient(90deg, transparent, var(--app-primary), transparent);
}

:root[data-theme='dark'] .skill-card:hover {
  box-shadow:
    0 2px 4px rgba(0, 170, 255, 0.1),
    0 14px 32px rgba(0, 170, 255, 0.18),
    0 28px 56px rgba(0, 0, 0, 0.28);
  border-color: color-mix(in srgb, var(--app-primary) 40%, var(--app-border));
}

:root[data-theme='dark'] .skill-card--pinned {
  background: linear-gradient(160deg, var(--app-panel) 0%, rgba(0, 170, 255, 0.1) 100%);
}

:root[data-theme='dark'] .card-icon {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

:root[data-theme='dark'] .skill-card:hover .card-icon {
  box-shadow: 0 8px 28px rgba(0, 170, 255, 0.25);
}

:root[data-theme='dark'] .skill-upload__dropzone:hover {
  border-color: var(--app-primary);
  background: rgba(0, 170, 255, 0.08);
}
</style>
