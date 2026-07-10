<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox, ElScrollbar } from 'element-plus'
import {
  View,
  Link,
  Delete,
  Loading,
  Document,
  Download,
  WarningFilled,
  Search,
} from '@element-plus/icons-vue'
import {
  getAppendixList,
  deleteAppendix,
  getGeneratedHistoryList,
  deleteGeneratedHistory,
} from '@/api/appendixHistory'
import { getFileIcon } from '@/utils/fileUtils'

// 定义接口类型
interface AppendixItem {
  file_id: string
  file_name: string
  file_url: string
  create_time?: string
}

interface AppendixListResponse {
  items: AppendixItem[]
  page: number
  total: number
  total_pages?: number
  totalPages?: number
}

// ✅ 使用defineModel实现双向绑定
const visible = defineModel<boolean>('visible', { required: true })

const props = withDefaults(defineProps<{ mode?: 'panel' | 'dialog' }>(), { mode: 'panel' })

// Emits
const emit = defineEmits<{
  (e: 'quote', item: AppendixItem): void // ✅ 修改：传递整个文件对象，而不是URL
}>()

// 状态
const loading = ref(false)
const appendixList = ref<AppendixItem[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = ref(0)

// ✅ Tab切换状态：'appendix' - 历史附件, 'generated' - 生成历史
const activeTab = ref<'appendix' | 'generated'>('appendix')

// ✅ 搜索关键词
const searchKeyword = ref('')

// 计算属性：是否有数据
const hasData = computed(() => appendixList.value.length > 0)
const showPagination = computed(() => total.value > pageSize.value)

// ✅ 过滤后的列表（根据搜索关键词）
const filteredList = computed(() => {
  if (!searchKeyword.value.trim()) {
    return appendixList.value
  }
  const keyword = searchKeyword.value.toLowerCase().trim()
  return appendixList.value.filter((item) => item.file_name.toLowerCase().includes(keyword))
})

const normalizeListResponse = (response: any): AppendixListResponse => {
  const source = response?.data ?? response
  const rawItems = Array.isArray(source?.items)
    ? source.items
    : Array.isArray(source?.data)
      ? source.data
      : Array.isArray(source)
        ? source
        : []

  return {
    items: rawItems.map((item: any) => ({
      file_id: item.file_id || item.fileId || item.id,
      file_name: item.file_name || item.fileName || item.name || item.title || '',
      file_url: item.file_url || item.fileUrl || item.url || item.download_url || '',
      create_time: item.create_time || item.upload_time || item.createTime || item.uploadTime || '',
    })),
    page: source?.page ?? currentPage.value,
    total: source?.total ?? rawItems.length,
    total_pages: source?.total_pages ?? source?.totalPages,
  }
}

const applyListResponse = (response: AppendixListResponse) => {
  appendixList.value = response.items
  currentPage.value = response.page
  total.value = response.total
  totalPages.value =
    response.total_pages ?? response.totalPages ?? Math.ceil(response.total / pageSize.value)
}

const formatCreateTime = (value?: string): string => {
  return String(value || '').trim()
}

/**
 * 加载附件列表
 */
const loadAppendixList = async (page: number = 1) => {
  try {
    loading.value = true
    const response = normalizeListResponse(await getAppendixList(page, pageSize.value))

    if (response && response.items) {
      applyListResponse(response)
    }
  } catch (error) {

    ElMessage.error('加载附件列表失败')
    applyListResponse({
      items: [],
      page: 1,
      total: 0,
      total_pages: 1,
    })
  } finally {
    loading.value = false
  }
}

const loadGeneratedHistoryList = async (page: number = 1) => {
  try {
    loading.value = true
    const response = normalizeListResponse(await getGeneratedHistoryList(page, pageSize.value))

    if (response && response.items) {
      applyListResponse(response)
    }
  } catch (error) {

    ElMessage.error('加载生成历史列表失败')
    applyListResponse({
      items: [],
      page: 1,
      total: 0,
      total_pages: 1,
    })
  } finally {
    loading.value = false
  }
}

const loadCurrentList = (page: number = 1) => {
  if (activeTab.value === 'appendix') {
    loadAppendixList(page)
  } else {
    loadGeneratedHistoryList(page)
  }
}

/**
 * 切换附件分页
 */
const handlePageChange = (page: number) => {
  if (page === currentPage.value || loading.value) return
  loadCurrentList(page)
}

/**
 * 查看文件（新标签页打开）
 */
const handleView = (item: AppendixItem) => {
  window.open(item.file_url, '_blank')
}

/**
 * 预览文件（在当前页面弹出窗口）
 */
const previewVisible = ref(false)
const previewItem = ref<AppendixItem | null>(null)

const handlePreview = (item: AppendixItem) => {
  previewItem.value = item
  previewVisible.value = true
}

const closePreview = () => {
  previewVisible.value = false
  previewItem.value = null
}

/**
 * 获取文件类型
 */
const getFileType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
  const pdfTypes = ['pdf']
  const videoTypes = ['mp4', 'webm', 'ogg']
  const audioTypes = ['mp3', 'wav', 'ogg']
  const markdownTypes = ['txt', 'md', 'markdown', 'html', 'htm', 'xhtml']
  const officeTypes = ['doc', 'docx', 'xls', 'xlsx', 'csv']

  if (imageTypes.includes(ext)) return 'image'
  if (pdfTypes.includes(ext)) return 'pdf'
  if (videoTypes.includes(ext)) return 'video'
  if (audioTypes.includes(ext)) return 'audio'
  if (markdownTypes.includes(ext)) return 'markdown'
  if (officeTypes.includes(ext)) return 'office'
  return 'other'
}

/**
 * 加载并渲染 Markdown 内容
 */
const markdownContent = ref('')
const markdownLoading = ref(false)
const markdownError = ref('')

const countTextDecodeIssues = (text: string) => {
  const replacementCount = (text.match(/\uFFFD/g) || []).length
  const mojibakeCount = (text.match(/[ÃÂ�]|锟斤拷|æ|è|é|å|ç|œ|€|™/g) || []).length
  return replacementCount * 8 + mojibakeCount * 2
}

const decodePreviewText = (buffer: ArrayBuffer, contentType: string | null) => {
  const charset = contentType?.match(/charset=([^;]+)/i)?.[1]?.trim()
  const labels = [charset, 'utf-8', 'gb18030', 'gbk', 'gb2312']
    .filter((label): label is string => Boolean(label))
    .map((label) => label.toLowerCase())
  const uniqueLabels = Array.from(new Set(labels))

  const candidates = uniqueLabels.flatMap((label) => {
    try {
      return [{ label, text: new TextDecoder(label).decode(buffer) }]
    } catch {
      return []
    }
  })

  if (candidates.length === 0) {
    return new TextDecoder().decode(buffer)
  }

  return candidates.sort(
    (left, right) => countTextDecodeIssues(left.text) - countTextDecodeIssues(right.text),
  )[0].text
}

const loadMarkdownContent = async (url: string) => {
  try {
    markdownLoading.value = true
    markdownError.value = ''

    // ✅ 使用 fetch 获取 Markdown 内容，指定 UTF-8 编码
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const text = decodePreviewText(buffer, response.headers.get('content-type'))

    // ✅ 动态导入 marked 库
    const { marked } = await import('marked')

    // ✅ 配置 marked 选项
    marked.setOptions({
      breaks: true, // 支持 GitHub 风格的换行
      gfm: true, // 启用 GitHub Flavored Markdown
    })

    // ✅ 渲染 Markdown 为 HTML
    markdownContent.value = marked.parse(text) as string
  } catch (error: any) {

    markdownError.value = error.message || '加载失败'
    markdownContent.value = ''
  } finally {
    markdownLoading.value = false
  }
}

/**
 * 引用文件（将文件添加到文件展示区）
 */
const handleQuote = (item: AppendixItem) => {
  emit('quote', item) // ✅ 传递整个文件对象
  visible.value = false
}

/**
 * 删除文件
 */
const handleDelete = async (item: AppendixItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除文件 "${item.file_name}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response: any =
      activeTab.value === 'appendix'
        ? await deleteAppendix(item.file_id)
        : await deleteGeneratedHistory(item.file_id)

    if (
      response &&
      (response.status === 'deleted' || response.code === '200' || response.success)
    ) {
      // 重新加载列表
      const nextPage =
        appendixList.value.length === 1 && currentPage.value > 1
          ? currentPage.value - 1
          : currentPage.value
      await loadCurrentList(nextPage)
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {


      // 检查是否是"未找到"的错误
      if (
        error.response?.data?.detail === 'appendix not found' ||
        error.response?.data?.detail === 'file not found' ||
        error.response?.data?.detail === 'generate not found'
      ) {
        ElMessage.warning('文件不存在或已被删除')
        // 刷新列表以移除不存在的项目
        await loadCurrentList(currentPage.value)
      } else {
        ElMessage.error('删除失败')
      }
    }
  }
}

/**
 * 切换Tab
 */
const handleTabChange = (tab: 'appendix' | 'generated') => {
  activeTab.value = tab
  searchKeyword.value = ''
  currentPage.value = 1
  loadCurrentList(1)
}

/**
 * ✅ 监听预览弹窗状态，当打开且是 Markdown 文件时自动加载内容
 */
watch([previewVisible, previewItem], ([isVisible, item]) => {
  if (isVisible && item && getFileType(item.file_name) === 'markdown') {
    loadMarkdownContent(item.file_url)
  } else if (!isVisible) {
    // 关闭弹窗时清空内容
    markdownContent.value = ''
    markdownError.value = ''
  }
})

/**
 * 关闭面板
 */
const handleClose = () => {
  visible.value = false
}

/**
 * 切换面板显示状态
 */
const handleToggle = () => {
  if (visible.value) {
    handleClose()
  } else {
    // 打开面板
    visible.value = true
    // 加载数据
    loadAppendixList()
    activeTab.value = 'appendix'
  }
}

// 监听visible变化，当面板显示时加载数据
watch(
  () => visible.value,
  (newVal, oldVal) => {
    if (newVal && !oldVal) {
      loadAppendixList()
      activeTab.value = 'appendix' // 重置为默认Tab
    }
  },
)

defineExpose({
  loadAppendixList,
})
</script>

<template>
  <!-- ===== 面板模式（ChatView 右侧滑出） ===== -->
  <div
    v-if="mode === 'panel'"
    class="appendix-panel-container"
    :class="{ 'appendix-panel-container--expanded': visible }"
  >
    <!-- ✅ 触发按钮（在容器内，跟随面板移动） -->

    <button
      class="appendix-toggle-btn"
      :class="{ 'appendix-toggle-btn--active': visible }"
      type="button"
      aria-label="历史附件"
      @click="handleToggle"
    >
      <span class="toggle-icon-shell">
        <img src="@/assets/icons/files/icon-file-opencard.png" alt="" class="toggle-icon" />
      </span>
      <span class="toggle-text"></span>
    </button>
    <!-- ✅ 面板（条件渲染） -->
    <Transition name="slide-right">
      <div v-if="visible" class="appendix-panel">
        <!-- 头部：Tab切换 -->
        <div class="panel-header">
          <div class="panel-title-block">
            <div class="panel-title">附件中心</div>
            <div class="panel-subtitle">引用、预览与管理历史文件</div>
          </div>
          <div class="tab-container">
            <button
              class="tab-btn"
              :class="{ 'tab-btn--active': activeTab === 'appendix' }"
              @click="handleTabChange('appendix')"
            >
              上传附件
            </button>
            <button
              class="tab-btn"
              :class="{ 'tab-btn--active': activeTab === 'generated' }"
              @click="handleTabChange('generated')"
            >
              生成附件
            </button>
          </div>
        </div>

        <!-- ✅ 搜索框 -->
        <div class="search-container">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索文件名..."
            clearable
            prefix-icon="Search"
            class="search-input"
          />
        </div>

        <!-- 内容区域 -->
        <div class="panel-content">
          <el-scrollbar class="appendix-scroll">
            <!-- 加载中状态 -->
            <div v-if="loading" class="appendix-loading-shell" aria-busy="true">
              <div class="appendix-loading-skeleton">
                <div v-for="index in 5" :key="index" class="appendix-loading-card">
                  <div class="appendix-loading-icon"></div>
                  <div class="appendix-loading-copy">
                    <div class="appendix-loading-line appendix-loading-line--title"></div>
                    <div class="appendix-loading-actions">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else-if="!hasData" class="empty-state">
              <el-icon :size="48" color="#d0d7e2"><Document /></el-icon>
              <p>{{ activeTab === 'appendix' ? '暂无历史附件' : '暂无生成历史' }}</p>
            </div>

            <!-- ✅ 无搜索结果 -->
            <div v-else-if="filteredList.length === 0 && searchKeyword" class="empty-state">
              <el-icon :size="48" color="#d0d7e2"><Document /></el-icon>
              <p>未找到匹配的文件</p>
            </div>

            <!-- 附件列表 -->
            <div v-else class="appendix-list">
              <div v-for="item in filteredList" :key="item.file_id" class="appendix-item">
                <!-- 左侧：文件图标 -->
                <div class="item-icon">
                  <img
                    :src="getFileIcon(item.file_name)"
                    :alt="item.file_name"
                    class="file-type-icon"
                  />
                </div>

                <!-- 右侧：信息和操作 -->
                <div class="item-content">
                  <!-- 上方：文件名 -->
                  <div class="item-title" :title="item.file_name">
                    {{ item.file_name }}
                  </div>
                  <div v-if="formatCreateTime(item.create_time)" class="item-create-time">
                    {{ formatCreateTime(item.create_time) }}
                  </div>

                  <!-- 下方：操作按钮 -->
                  <div class="item-actions">
                    <el-tooltip content="查看" placement="top">
                      <el-button
                        size="small"
                        link
                        class="action-btn view-btn"
                        @click="handlePreview(item)"
                      >
                        <el-icon><View /></el-icon>
                      </el-button>
                    </el-tooltip>

                    <el-tooltip content="引用" placement="top">
                      <el-button
                        size="small"
                        link
                        class="action-btn quote-btn"
                        @click="handleQuote(item)"
                      >
                        <el-icon><Link /></el-icon>
                      </el-button>
                    </el-tooltip>

                    <el-tooltip content="删除" placement="top">
                      <el-button
                        size="small"
                        link
                        class="action-btn delete-btn"
                        @click="handleDelete(item)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </div>
          </el-scrollbar>

          <div v-if="showPagination" class="pagination-footer">
            <el-pagination
              :current-page="currentPage"
              :page-size="pageSize"
              :total="total"
              :pager-count="5"
              :disabled="loading"
              small
              layout="prev, pager, next"
              @current-change="handlePageChange"
            />
            <div class="pagination-total">共 {{ total }} 条</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <!-- ===== 弹窗模式（侧边栏触发，居中弹窗） ===== -->
  <el-dialog
    v-if="mode === 'dialog'"
    v-model="visible"
    title="附件中心"
    width="720px"
    align-center
    class="appendix-center-dialog"
    :close-on-click-modal="false"
    @open="loadAppendixList()"
  >
    <div class="appendix-dialog-body">
      <!-- Tab 切换 -->
      <div class="dialog-tabs">
        <button
          class="dialog-tab"
          :class="{ 'dialog-tab--active': activeTab === 'appendix' }"
          @click="handleTabChange('appendix')"
        >
          上传附件
        </button>
        <button
          class="dialog-tab"
          :class="{ 'dialog-tab--active': activeTab === 'generated' }"
          @click="handleTabChange('generated')"
        >
          生成附件
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="dialog-search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文件名..."
          clearable
          :prefix-icon="Search"
        />
      </div>

      <!-- 内容区域 -->
      <div class="dialog-content-area">
        <el-scrollbar class="dialog-scroll">
          <!-- 加载中 -->
          <div v-if="loading" class="appendix-loading-shell" aria-busy="true">
            <div class="appendix-loading-skeleton">
              <div v-for="index in 5" :key="index" class="appendix-loading-card">
                <div class="appendix-loading-icon"></div>
                <div class="appendix-loading-copy">
                  <div class="appendix-loading-line appendix-loading-line--title"></div>
                  <div class="appendix-loading-actions">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="!hasData" class="empty-state">
            <el-icon :size="48" color="var(--app-text-muted, #94a3b8)"><Document /></el-icon>
            <p>{{ activeTab === 'appendix' ? '暂无历史附件' : '暂无生成历史' }}</p>
          </div>

          <!-- 无搜索结果 -->
          <div v-else-if="filteredList.length === 0 && searchKeyword" class="empty-state">
            <el-icon :size="48" color="var(--app-text-muted, #94a3b8)"><Document /></el-icon>
            <p>未找到匹配的文件</p>
          </div>

          <!-- 文件列表 -->
          <div v-else class="appendix-list">
            <div v-for="item in filteredList" :key="item.file_id" class="appendix-item">
              <div class="item-icon">
                <img
                  :src="getFileIcon(item.file_name)"
                  :alt="item.file_name"
                  class="file-type-icon"
                />
              </div>
              <div class="item-content">
                <div class="item-title" :title="item.file_name">{{ item.file_name }}</div>
                <div v-if="formatCreateTime(item.create_time)" class="item-create-time">
                  {{ formatCreateTime(item.create_time) }}
                </div>
                <div class="item-actions">
                  <el-tooltip content="查看" placement="top">
                    <el-button
                      size="small"
                      class="action-btn view-btn"
                      @click="handlePreview(item)"
                    >
                      <el-icon><View /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="引用" placement="top">
                    <el-button size="small" class="action-btn quote-btn" @click="handleQuote(item)">
                      <el-icon><Link /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="删除" placement="top">
                    <el-button
                      size="small"
                      class="action-btn delete-btn"
                      @click="handleDelete(item)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </el-scrollbar>

        <div v-if="showPagination" class="pagination-footer">
          <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            :pager-count="5"
            :disabled="loading"
            small
            layout="prev, pager, next"
            @current-change="handlePageChange"
          />
          <div class="pagination-total">共 {{ total }} 条</div>
        </div>
      </div>
    </div>
  </el-dialog>

  <!-- ✅ 文件预览弹窗（两种模式共享） -->
  <el-dialog
    v-model="previewVisible"
    :title="previewItem?.file_name || '文件预览'"
    width="80%"
    align-center
    class="appendix-preview-dialog"
    :close-on-click-modal="true"
    @close="closePreview"
  >
    <div class="preview-container">
      <!-- 图片预览 -->
      <div
        v-if="previewItem && getFileType(previewItem.file_name) === 'image'"
        class="image-preview"
      >
        <img :src="previewItem.file_url" :alt="previewItem.file_name" class="preview-image" />
      </div>

      <!-- PDF预览 -->
      <div
        v-else-if="previewItem && getFileType(previewItem.file_name) === 'pdf'"
        class="pdf-preview"
      >
        <iframe :src="previewItem.file_url" class="preview-iframe" frameborder="0"></iframe>
      </div>

      <!-- 视频预览 -->
      <div
        v-else-if="previewItem && getFileType(previewItem.file_name) === 'video'"
        class="video-preview"
      >
        <video :src="previewItem.file_url" controls class="preview-video">
          您的浏览器不支持视频播放
        </video>
      </div>

      <!-- 音频预览 -->
      <div
        v-else-if="previewItem && getFileType(previewItem.file_name) === 'audio'"
        class="audio-preview"
      >
        <audio :src="previewItem.file_url" controls class="preview-audio">
          您的浏览器不支持音频播放
        </audio>
      </div>

      <!-- Markdown 预览 -->
      <div
        v-else-if="previewItem && getFileType(previewItem.file_name) === 'markdown'"
        class="other-preview markdown-preview-wrapper"
      >
        <div v-if="markdownLoading" class="loading-state">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载 Markdown 内容...</span>
        </div>
        <div v-else-if="markdownError" class="error-state">
          <el-icon :size="48" color="#f56c6c"><WarningFilled /></el-icon>
          <p class="error-message">{{ markdownError }}</p>
          <el-button type="primary" @click="handleView(previewItem!)">
            <el-icon><Download /></el-icon>
            下载文件
          </el-button>
        </div>
        <div v-else class="markdown-content" v-html="markdownContent"></div>
      </div>

      <!-- 其他类型 -->
      <div v-else class="other-preview">
        <el-icon :size="64" color="#909399"><Document /></el-icon>
        <p class="preview-tip">该文件类型暂不支持在线预览</p>
        <el-button type="primary" @click="handleView(previewItem!)">
          <el-icon><Download /></el-icon>
          下载文件
        </el-button>
      </div>
    </div>

    <template #footer>
      <el-button @click="closePreview">关闭</el-button>
      <el-button type="primary" @click="handleView(previewItem!)">
        <el-icon><Link /></el-icon>
        在新窗口打开
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
/* ==================== 容器（绝对定位，不占用文档流空间） ==================== */
.appendix-panel-container {
  position: absolute; /* ✅ 绝对定位，完全脱离文档流 */
  top: 0;
  right: 0;
  width: 0; /* ✅ 默认宽度为0 */
  height: 100%;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* ✅ 平滑过渡 */
  pointer-events: none; /* ✅ 默认不拦截鼠标事件 */
}

/* 当面板展开时，容器宽度变为300px */
.appendix-panel-container--expanded {
  width: 365px; /* ✅ 展开时占据420px宽度 */
  pointer-events: auto; /* ✅ 展开时恢复交互 */
}

/* ==================== 触发按钮（绝对定位，跟随容器移动） ==================== */
.appendix-toggle-btn {
  position: absolute; /* ✅ 相对于容器定位 */
  right: 2px; /* ✅ 默认贴在容器右侧 */
  top: 18px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px solid rgba(79, 124, 255, 0.18);
  border-radius: 16px;
  color: var(--app-text);
  /* background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92)),
    var(--app-panel); */
  box-shadow:
    0 10px 28px rgba(24, 39, 75, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.52) inset;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0;
  z-index: 100;
  pointer-events: auto; /* ✅ 按钮始终可以交互 */
  font: inherit;
}

.appendix-toggle-btn:hover {
  border-color: rgba(79, 124, 255, 0.4);
  color: var(--app-primary-strong, #2563eb);
  background:
    linear-gradient(135deg, rgba(235, 245, 255, 0.98), rgba(255, 255, 255, 0.96)), var(--app-panel);
  box-shadow:
    0 14px 32px rgba(37, 99, 235, 0.16),
    0 0 0 3px var(--app-primary-softer, rgba(79, 124, 255, 0.08));
  transform: translateX(-2px);
}

.appendix-toggle-btn--active {
  right: 365px; /* ✅ 面板展开时，按钮移动到左侧（相对于容器） */
  color: #ffffff;
  border-color: transparent;
  background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
  box-shadow: 0 14px 32px rgba(37, 99, 235, 0.22);
}

.appendix-toggle-btn--active:hover {
  color: #ffffff;
  border-color: transparent;
  background: linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%);
  box-shadow: 0 18px 38px rgba(37, 99, 235, 0.26);
}

.toggle-icon-shell {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--app-primary-soft, rgba(79, 124, 255, 0.12));
}

.toggle-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  transform: rotate(180deg); /* ✅ 默认折叠状态旋转180度 */
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* ✅ 平滑旋转过渡 */
}

/* ✅ 面板展开时，图标转回正常方向 */
.appendix-toggle-btn--active .toggle-icon {
  filter: brightness(0) invert(1);
  transform: rotate(0deg);
}

.appendix-toggle-btn--active .toggle-icon-shell {
  background: rgba(255, 255, 255, 0.18);
}

:global(:root[data-theme='dark']) .appendix-toggle-btn {
  color: var(--app-text);
  border-color: var(--app-border-hover);
  background: var(--app-panel-elevated);
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.28),
    0 0 0 1px var(--app-border) inset;
}

:global(:root[data-theme='dark']) .appendix-toggle-btn:hover {
  color: var(--app-accent);
  border-color: var(--app-border-hover);
  background: var(--app-panel);
  box-shadow:
    0 16px 34px rgba(0, 0, 0, 0.34),
    0 0 0 3px var(--app-primary-softer);
}

:global(:root[data-theme='dark']) .appendix-toggle-btn--active,
:global(:root[data-theme='dark']) .appendix-toggle-btn--active:hover {
  color: #ffffff;
  border-color: transparent;
  background: linear-gradient(135deg, #0088dd 0%, #00aaff 100%);
  box-shadow: 0 18px 38px rgba(0, 170, 255, 0.22);
}

:global(:root[data-theme='dark'] .appendix-toggle-btn.appendix-toggle-btn--active),
:global(:root[data-theme='dark'] .appendix-toggle-btn.appendix-toggle-btn--active:hover) {
  color: #ffffff !important;
  border-color: transparent !important;
  background: linear-gradient(135deg, #0088dd 0%, #00aaff 100%) !important;
  box-shadow: 0 18px 38px rgba(0, 170, 255, 0.22) !important;
}

.appendix-toggle-btn--active .toggle-icon-shell,
:global(:root[data-theme='dark']) .appendix-toggle-btn--active .toggle-icon-shell {
  background: rgba(255, 255, 255, 0.18);
}

:global(
  :root[data-theme='dark'] .appendix-toggle-btn.appendix-toggle-btn--active .toggle-icon-shell
) {
  background: rgba(255, 255, 255, 0.18) !important;
}

.toggle-text {
  color: currentColor;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  letter-spacing: 0;
}

/* ==================== 文件预览弹窗样式 ==================== */
:global(.appendix-preview-dialog.el-dialog) {
  height: 90vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:global(.appendix-preview-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  padding: 16px 20px;
  overflow: auto !important;
}

:global(.appendix-preview-dialog .el-dialog__footer) {
  flex: 0 0 auto;
}

.preview-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  background: var(--app-panel-muted, #f5f7fa);
  border-radius: 8px;
  overflow: auto;
  overscroll-behavior: contain;
}

.image-preview {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.preview-image {
  max-width: 100%;
  max-height: none;
  object-fit: contain;
  border-radius: 4px;
}

.pdf-preview {
  width: 100%;
  min-height: 520px;
  height: 100%;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.video-preview {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.preview-video {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 4px;
}

.audio-preview {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.preview-audio {
  width: 80%;
  max-width: 600px;
}

.other-preview {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 60px 20px;
}

.markdown-preview-wrapper {
  width: 100%;
  min-height: 100%;
  display: block;
  align-items: stretch;
  justify-content: flex-start;
  padding: 24px;
  overflow: visible;
}

.preview-tip {
  font-size: 16px;
  color: #909399;
  margin: 0;
}

/* ==================== Markdown 预览样式 ==================== */
.markdown-preview {
  width: 100%;
  height: 70vh;
  overflow-y: auto;
  padding: 24px;
  background: var(--app-panel, #ffffff);
  border-radius: 8px;
}

.markdown-content {
  width: 100%;
  max-width: 100%;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.8;
  color: var(--app-text, #303133);
  font-size: 15px;
  overflow-wrap: anywhere;
}

/* Markdown 标题样式 */
.markdown-content :deep(h1) {
  font-size: 2em;
  margin: 0.67em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
  color: #24292e;
}

.markdown-content :deep(h2) {
  font-size: 1.5em;
  margin: 0.83em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
  color: #24292e;
}

.markdown-content :deep(h3) {
  font-size: 1.25em;
  margin: 1em 0;
  color: #24292e;
}

.markdown-content :deep(h4) {
  font-size: 1em;
  margin: 1.33em 0;
  color: #24292e;
}

/* 段落和文本 */
.markdown-content :deep(p) {
  margin: 1em 0;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: #24292e;
}

.markdown-content :deep(em) {
  font-style: italic;
}

/* 链接 */
.markdown-content :deep(a) {
  color: #0366d6;
  text-decoration: none;
  transition: color 0.2s;
}

.markdown-content :deep(a:hover) {
  color: #0056b3;
  text-decoration: underline;
}

/* 代码块 */
.markdown-content :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.markdown-content :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin: 1em 0;
}

.markdown-content :deep(pre code) {
  padding: 0;
  margin: 0;
  font-size: 100%;
  background-color: transparent;
  border: 0;
}

/* 引用块 */
.markdown-content :deep(blockquote) {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin: 1em 0;
}

/* 列表 */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 2em;
  margin: 1em 0;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

/* 表格 */
.markdown-content :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
  display: block;
  overflow-x: auto;
}

.markdown-content :deep(table th),
.markdown-content :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-content :deep(table tr) {
  background-color: var(--app-panel, #fff);
  border-top: 1px solid var(--app-border, #c6cbd1);
}

.markdown-content :deep(table tr:nth-child(2n)) {
  background-color: var(--app-panel-muted, #f6f8fa);
}

.markdown-content :deep(table th) {
  font-weight: 600;
  background-color: var(--app-panel-muted, #f6f8fa);
}

/* 图片 */
.markdown-content :deep(img) {
  max-width: 100%;
  box-sizing: border-box;
  margin: 1em 0;
  border-radius: 4px;
}

/* 水平线 */
.markdown-content :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

/* 任务列表 */
.markdown-content :deep(input[type='checkbox']) {
  margin-right: 0.5em;
}

/* ==================== 面板容器 ==================== */
.appendix-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 365px;
  height: 100%;
  background: linear-gradient(180deg, var(--app-panel, #ffffff), var(--app-panel-muted, #f8fafc));
  border-left: 1px solid var(--app-border, #e8e8e8);
  box-shadow: -7px 0 10px rgba(24, 39, 75, 0.08);
  z-index: 99;
  display: flex;
  flex-direction: column;
}

/* ==================== 过渡动画 ==================== */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* ==================== 头部：Tab切换 ==================== */
.panel-header {
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--app-border, #e5e7eb);
  background:
    linear-gradient(135deg, rgba(79, 124, 255, 0.08), transparent 42%), var(--app-panel, #ffffff);
}

.panel-title-block {
  margin-bottom: 14px;
}

.panel-title {
  color: var(--app-text, #1f2937);
  font-size: 18px;
  font-weight: 780;
  line-height: 1.2;
  letter-spacing: 0;
}

.panel-subtitle {
  margin-top: 5px;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
  line-height: 1.35;
}

.tab-container {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 12px;
  background: var(--app-panel-muted, #f8fafc);
}

.tab-btn {
  flex: 1;
  min-width: 0;
  min-height: 32px;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text-muted, #64748b);
  background: transparent;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--app-text, #1e293b);
  background: var(--app-primary-softer, rgba(79, 124, 255, 0.08));
}

.tab-btn--active {
  color: var(--app-primary-strong, #2563eb);
  border-bottom-color: transparent;
  background: var(--app-panel, #ffffff);
  box-shadow:
    0 6px 16px rgba(24, 39, 75, 0.08),
    0 0 0 1px var(--app-primary-soft, rgba(79, 124, 255, 0.12));
}

.tab-btn--active:hover {
  background: var(--app-panel, #ffffff);
}

/* ==================== 搜索框 ==================== */
.search-container {
  padding: 14px 16px 12px;
}

.search-input {
  width: 100%;
}

.search-input :deep(.el-input__wrapper) {
  min-height: 38px;
  border-radius: 12px;
  background: var(--app-panel-muted, #f8fafc);
  box-shadow: 0 0 0 1px var(--app-border, #e2e8f0) inset;
  transition: all 0.2s ease;
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.search-input :deep(.el-input__wrapper.is-focus) {
  background: var(--app-panel, #ffffff);
  box-shadow:
    0 0 0 1px var(--app-primary, #4f7cff) inset,
    0 0 0 3px var(--app-primary-softer, rgba(79, 124, 255, 0.08));
}

.search-input :deep(.el-input__inner) {
  color: var(--app-text, #1f2937);
  font-size: 13px;
}

/* ==================== 内容区域 ==================== */
.panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.appendix-scroll {
  flex: 1;
  min-height: 0;
}

.pagination-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 12px 12px;
  border-top: 1px solid var(--app-border, #e5e7eb);
  background: var(--app-panel, #ffffff);
}

.pagination-footer :deep(.el-pagination) {
  --el-pagination-button-width: 26px;
  --el-pagination-button-height: 26px;
  justify-content: center;
}

.pagination-total {
  font-size: 12px;
  line-height: 1;
  color: #94a3b8;
}

/* ==================== 加载和空状态 ==================== */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  gap: 12px;
  color: #94a3b8;
}

.loading-state .el-icon {
  font-size: 32px;
  color: #3b82f6;
}

.appendix-loading-shell {
  min-height: 260px;
  padding: 12px;
}

.appendix-loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.appendix-loading-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--app-border, #e8ecf1);
  border-radius: 8px;
  background: var(--app-panel, #ffffff);
}

.appendix-loading-icon,
.appendix-loading-line,
.appendix-loading-actions span {
  position: relative;
  overflow: hidden;
  background: var(--app-skeleton-line-bg);
}

.appendix-loading-icon::after,
.appendix-loading-line::after,
.appendix-loading-actions span::after {
  content: '';
  display: block;
  width: 45%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, var(--app-skeleton-shimmer), transparent);
  animation: appendixShimmer 1.35s ease-in-out infinite;
}

.appendix-loading-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 10px;
}

.appendix-loading-copy {
  flex: 1;
  min-width: 0;
}

.appendix-loading-line {
  height: 11px;
  border-radius: 999px;
}

.appendix-loading-line--title {
  width: 78%;
}

.appendix-loading-actions {
  display: flex;
  gap: 6px;
  margin-top: 11px;
}

.appendix-loading-actions span {
  width: 26px;
  height: 26px;
  border-radius: 8px;
}

.appendix-loading-card:nth-child(2) .appendix-loading-line--title {
  width: 66%;
}

.appendix-loading-card:nth-child(3) .appendix-loading-line--title {
  width: 88%;
}

.appendix-loading-card:nth-child(4) .appendix-loading-line--title {
  width: 58%;
}

@keyframes appendixShimmer {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(260%);
  }
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* ==================== 附件列表 ==================== */
.appendix-list {
  padding: 12px 12px 14px;
}

.appendix-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  margin-bottom: 8px;
  background: var(--app-panel, #ffffff);
  border-radius: 8px;
  border: 1px solid var(--app-border, #e2e8f0);
  transition: all 0.2s ease;
}

.appendix-item:hover {
  background: linear-gradient(
    135deg,
    var(--app-panel, #ffffff),
    var(--app-primary-softer, rgba(79, 124, 255, 0.08))
  );
  border-color: var(--app-border-hover, #cbd5e1);
  box-shadow: 0 10px 22px rgba(24, 39, 75, 0.08);
  transform: translateY(-1px);
}

/* ==================== 文件图标 ==================== */
.item-icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-panel-muted, #f8fafc);
  border-radius: 10px;
  border: 1px solid var(--app-border, #e2e8f0);
}

.file-type-icon {
  max-width: 28px;
  max-height: 28px;
  object-fit: contain;
}

/* ==================== 内容区域 ==================== */
.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.item-title {
  font-size: 13px;
  font-weight: 680;
  color: var(--app-text, #1e293b);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 0;
}

.item-create-time {
  font-size: 12px;
  line-height: 1.2;
  color: var(--app-text-muted, #94a3b8);
}

/* ==================== 操作按钮 ==================== */
.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: start;
}

.action-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 8px;
  color: var(--app-text-muted, #64748b);
  transition: all 0.2s ease;
  background: transparent;
  box-shadow: none !important;
}

.action-btn:hover {
  background: var(--app-primary-soft, rgba(79, 124, 255, 0.12));
  transform: translateY(-1px);
}

.view-btn:hover {
  color: #3b82f6;
}

.quote-btn:hover {
  color: #10b981;
}

.delete-btn:hover {
  color: #ef4444;
}

.action-btn .el-icon {
  font-size: 15px;
}

/* ==================== 滚动条样式 ==================== */
:deep(.el-scrollbar__bar) {
  opacity: 0.6;
  transition: opacity 0.3s;
}

:deep(.el-scrollbar__bar:hover) {
  opacity: 1;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 768px) {
  .appendix-panel-container--expanded {
    width: calc(100vw - 48px); /* ✅ 移动端容器宽度 */
  }

  .appendix-panel {
    width: calc(100vw - 48px);
  }

  .appendix-toggle-btn {
    width: 44px;
    min-height: 44px;
    top: 12px;
    right: 8px;
    padding: 10px;
  }

  .appendix-toggle-btn--active {
    right: calc(100vw - 40px); /* ✅ 移动端按钮跟随位置 */
  }

  .toggle-text {
    display: none;
  }

  .toggle-icon {
    width: 20px;
    height: 20px;
  }

  .tab-btn {
    padding: 14px 16px;
    font-size: 14px;
  }
}

/* ==================== 弹窗模式专属样式 ==================== */
:global(.appendix-center-dialog.el-dialog) {
  --el-dialog-bg-color: var(--app-panel);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
}

:global(.appendix-center-dialog .el-dialog__header) {
  padding: 14px 24px 8px;
  margin-right: 0;
}

:global(.appendix-center-dialog .el-dialog__title) {
  color: var(--app-text);
  font-size: 18px;
  font-weight: 780;
}

:global(.appendix-center-dialog .el-dialog__body) {
  padding: 0;
}

:global(.appendix-center-dialog .el-dialog__footer) {
  padding: 14px 24px 20px;
  border-top: 1px solid var(--app-border);
}

.appendix-dialog-body {
  display: flex;
  flex-direction: column;
  height: 520px;
}

/* 弹窗内 Tab */
.dialog-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 16px 20px 8px;
}

.dialog-tab {
  flex: 1;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.dialog-tab:hover {
  color: var(--app-text);
  background: var(--app-primary-softer);
  border-radius: 8px 8px 0 0;
}

.dialog-tab--active {
  color: var(--app-primary);
  border-bottom-color: var(--app-primary);
}

.dialog-tab--active:hover {
  background: transparent;
  border-radius: 0;
}

/* 弹窗内搜索 */
.dialog-search {
  padding: 8px 20px 4px;
}

.dialog-search :deep(.el-input__wrapper) {
  min-height: 38px;
  border-radius: 10px;
  background: var(--app-panel-muted);
  box-shadow: 0 0 0 1px var(--app-border) inset;
  transition: all 0.2s ease;
}

.dialog-search :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--app-border-hover) inset;
}

.dialog-search :deep(.el-input__wrapper.is-focus) {
  background: var(--app-panel);
  box-shadow:
    0 0 0 1px var(--app-primary) inset,
    0 0 0 3px var(--app-primary-softer);
}

.dialog-search :deep(.el-input__inner) {
  color: var(--app-text);
  font-size: 13px;
}

/* 弹窗内容区域 */
.dialog-content-area {
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  padding: 0 12px;
}

.dialog-scroll {
  flex: 1;
  min-height: 0;
}

/* 弹窗内分页 */
.dialog-content-area .pagination-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0 4px;
  border-top: 1px solid var(--app-border);
}

/* 深色模式弹窗适配 */
:global(:root[data-theme='dark'] .appendix-center-dialog.el-dialog) {
  background: #122248;
  border-color: var(--app-border);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.34),
    0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>
