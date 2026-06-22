<template>
  <div class="knowledge-page">
    <header class="knowledge-header">
      <div>
        <button v-if="!isEmbedded" class="knowledge-back" type="button" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>知识库</h1>
        <p>管理个人知识仓库，支持文本入库、文件入库和语义检索。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建仓库</el-button>
    </header>

    <main class="knowledge-layout">
      <aside class="warehouse-panel">
        <div class="warehouse-panel__title">
          <span>仓库列表</span>
          <el-button text :icon="Refresh" :loading="warehouseLoading" @click="loadWarehouses" />
        </div>
        <el-empty
          v-if="!warehouseLoading && warehouses.length === 0"
          description="暂无仓库"
          :image-size="86"
        />
        <div v-else class="warehouse-list">
          <button
            v-for="warehouse in warehouses"
            :key="warehouse.warehouse_id"
            class="warehouse-item"
            :class="{ 'warehouse-item--active': warehouse.warehouse_id === selectedWarehouseId }"
            type="button"
            @click="selectWarehouse(warehouse.warehouse_id)"
          >
            <span class="warehouse-item__name">{{ warehouse.warehouse_name }}</span>
            <span class="warehouse-item__desc">{{ warehouse.description || '暂无描述' }}</span>
          </button>
        </div>
      </aside>

      <section class="knowledge-workbench">
        <div v-if="!selectedWarehouse" class="knowledge-empty">
          <el-empty description="请选择或新建一个知识仓库" />
        </div>

        <template v-else>
          <div class="warehouse-summary">
            <div>
              <h2>{{ selectedWarehouse.warehouse_name }}</h2>
              <p>{{ selectedWarehouse.description || '暂无描述' }}</p>
            </div>
            <div class="warehouse-stats">
              <div class="warehouse-stat warehouse-stat--wide">
                <span>{{ selectedWarehouse.created_at || '-' }}</span>
                <em>创建时间</em>
              </div>
            </div>
            <el-button
              type="danger"
              plain
              :icon="Delete"
              :loading="deleteWarehouseLoading"
              @click="confirmDeleteWarehouse"
            >
              删除仓库
            </el-button>
          </div>

          <el-tabs v-model="activeTab" class="knowledge-tabs">
            <el-tab-pane label="仓库详情" name="detail">
              <div class="warehouse-detail">
                <div class="warehouse-detail__toolbar">
                  <div>
                    <strong>入库批次</strong>
                    <span>共 {{ ingestPagination.total }} 条</span>
                  </div>
                  <el-button
                    text
                    :icon="Refresh"
                    :loading="warehouseDetailLoading"
                    @click="refreshSelectedWarehouse"
                  >
                    刷新
                  </el-button>
                </div>

                <div v-if="warehouseDetailLoading" class="warehouse-detail__loading">
                  <div v-for="index in 4" :key="index" class="warehouse-detail-loading-card">
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <el-empty
                  v-else-if="warehouseEntries.length === 0"
                  description="暂无入库批次"
                  :image-size="92"
                />
                <div v-else class="warehouse-entry-list">
                  <article
                    v-for="entry in warehouseEntries"
                    :key="entry.rowKey"
                    class="warehouse-entry"
                  >
                    <div class="warehouse-entry__head">
                      <strong>{{ entry.title }}</strong>
                      <el-tag v-if="entry.chunkCount" size="small" type="info">
                        {{ entry.chunkCount }} 个切片
                      </el-tag>
                    </div>
                    <div class="warehouse-entry__meta">
                      <span v-if="entry.createdAt">{{ entry.createdAt }}</span>
                      <span v-if="entry.ingestId">批次 {{ entry.ingestId }}</span>
                      <span v-if="entry.charCount">字符 {{ entry.charCount }}</span>
                    </div>
                    <div class="warehouse-entry__actions">
                      <el-button
                        v-if="entry.ingestId"
                        text
                        type="primary"
                        @click="openIngestChunks(entry.ingestId)"
                      >
                        查看切片
                      </el-button>
                      <el-button
                        v-if="entry.ingestId"
                        text
                        type="danger"
                        @click="confirmDeleteIngest(entry.ingestId)"
                      >
                        删除本批入库
                      </el-button>
                    </div>
                  </article>
                </div>
                <div
                  v-if="ingestPagination.total > ingestPagination.pageSize"
                  class="warehouse-detail__pagination"
                >
                  <el-pagination
                    v-model:current-page="ingestPagination.page"
                    v-model:page-size="ingestPagination.pageSize"
                    :total="ingestPagination.total"
                    :page-sizes="[10, 20, 50, 100]"
                    layout="total, sizes, prev, pager, next"
                    small
                    @current-change="loadWarehouseIngests"
                    @size-change="handleIngestPageSizeChange"
                  />
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="文本入库" name="text">
              <div class="ingest-form">
                <el-input v-model="textSourceName" placeholder="来源名称，默认 manual" />
                <el-input
                  v-model="textContent"
                  type="textarea"
                  :rows="9"
                  placeholder="粘贴需要入库的知识文本"
                />
                <div class="form-actions">
                  <el-button
                    type="primary"
                    :loading="textIngesting"
                    :disabled="!textContent.trim()"
                    @click="handleStoreText"
                  >
                    入库文本
                  </el-button>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="文件入库" name="file">
              <div class="file-ingest">
                <el-input v-model="fileKnowledgeName" placeholder="知识名称，默认使用文件名" />
                <input
                  ref="fileInput"
                  class="file-ingest__input"
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.py"
                  @change="handleFileChange"
                />
                <button class="file-ingest__dropzone" type="button" @click="openFilePicker">
                  <span class="file-ingest__title">
                    {{ selectedFile ? selectedFile.name : '选择文件入库' }}
                  </span>
                  <span class="file-ingest__desc">
                    支持 PDF、Word、Excel、CSV、TXT、Markdown、图片和 Python 文件
                  </span>
                </button>
                <div class="form-actions">
                  <el-button
                    type="primary"
                    :loading="fileUploading"
                    :disabled="!selectedFile || !resolvedFileKnowledgeName"
                    @click="handleUploadFile"
                  >
                    上传并入库
                  </el-button>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="语义检索" name="query">
              <div class="query-form">
                <el-input
                  v-model="queryText"
                  placeholder="输入问题或关键词"
                  clearable
                  @keyup.enter="handleQuery"
                />
                <el-input-number v-model="topK" :min="1" :max="50" controls-position="right" />
                <el-button
                  type="primary"
                  :icon="Search"
                  :loading="queryLoading"
                  :disabled="!queryText.trim()"
                  @click="handleQuery"
                >
                  检索
                </el-button>
              </div>

              <div class="query-results">
                <el-empty
                  v-if="!queryLoading && queryResults.length === 0"
                  description="暂无检索结果"
                  :image-size="92"
                />
                <article
                  v-for="result in queryResults"
                  :key="result.knowledge_id"
                  class="query-result"
                >
                  <div class="query-result__head">
                    <strong>{{ result.knowledge_name || '未命名来源' }}</strong>
                    <el-tag size="small" type="success">
                      {{ formatScore(result.score) }}
                    </el-tag>
                  </div>
                  <p>{{ result.content }}</p>
                  <div class="query-result__meta">
                    <span>{{ formatCreatedAt(result.created_at) }}</span>
                    <span>批次 {{ result.ingest_id }}</span>
                  </div>
                  <div class="query-result__actions">
                    <el-button text type="primary" @click="openChunkDetail(result.knowledge_id)">
                      查看切片
                    </el-button>
                    <el-button
                      v-if="result.minio_url"
                      text
                      type="primary"
                      @click="openDownload(result.minio_url)"
                    >
                      下载原文件
                    </el-button>
                    <el-button text type="danger" @click="confirmDeleteIngest(result.ingest_id)">
                      删除本批入库
                    </el-button>
                  </div>
                </article>
              </div>
            </el-tab-pane>

            <el-tab-pane label="知识库对话" name="chat">
              <div class="kb-chat">
                <div class="kb-chat__settings">
                  <el-select
                    v-model="kbChatWarehouseIds"
                    multiple
                    clearable
                    collapse-tags
                    collapse-tags-tooltip
                    popper-class="knowledge-select-popper"
                    placeholder="不选择则检索当前用户全部仓库"
                  >
                    <el-option
                      v-for="warehouse in warehouses"
                      :key="warehouse.warehouse_id"
                      :label="warehouse.warehouse_name"
                      :value="warehouse.warehouse_id"
                    />
                  </el-select>
                  <el-input-number
                    v-model="kbChatTopK"
                    :min="1"
                    :max="20"
                    controls-position="right"
                  />
                  <el-button text :disabled="kbChatStreaming" @click="resetKnowledgeChat">
                    新会话
                  </el-button>
                </div>

                <div ref="kbChatMessagesRef" class="kb-chat__messages">
                  <el-empty
                    v-if="kbChatMessages.length === 0"
                    description="暂无对话"
                    :image-size="92"
                  />
                  <article
                    v-for="message in kbChatMessages"
                    :key="message.id"
                    class="kb-chat-message"
                    :class="`kb-chat-message--${message.role}`"
                  >
                    <strong>{{ message.role === 'user' ? '我' : '知识库助手' }}</strong>
                    <p v-if="message.role === 'user'">
                      {{ message.content }}
                    </p>
                    <div
                      v-else
                      class="kb-chat-message__markdown markdown-body"
                      v-html="
                        renderKnowledgeChatMarkdown(message.content || '检索并生成中...')
                      "
                    ></div>
                  </article>
                </div>

                <div class="kb-chat__composer">
                  <el-input
                    v-model="kbChatInput"
                    type="textarea"
                    :rows="2"
                    :autosize="{ minRows: 2, maxRows: 5 }"
                    placeholder="输入需要结合知识库回答的问题"
                    @keydown.enter.exact.prevent="sendKnowledgeChatMessage"
                  />
                  <el-button
                    type="primary"
                    :icon="kbChatStreaming ? undefined : Search"
                    :disabled="!kbChatInput.trim() && !kbChatStreaming"
                    @click="kbChatStreaming ? stopKnowledgeChat() : sendKnowledgeChatMessage()"
                  >
                    {{ kbChatStreaming ? '停止' : '发送' }}
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>

          <div v-if="lastIngest" class="ingest-result">
            <strong>最近入库结果</strong>
            <span>来源：{{ lastIngest.knowledge_name || lastIngest.filename || '-' }}</span>
            <span>切片：{{ lastIngest.chunks ?? '-' }}</span>
            <span>批次：{{ lastIngest.ingest_id || '-' }}</span>
          </div>
        </template>
      </section>
    </main>

    <el-dialog
      v-model="createDialogVisible"n
      title="新建知识仓库"
      width="460px"
      class="knowledge-dialog"
      destroy-on-close
    >
      <el-form label-position="top">
        <el-form-item label="仓库名称" required>
          <el-input v-model="createForm.warehouse_name" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="仓库描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="createLoading"
          :disabled="!createForm.warehouse_name.trim()"
          @click="handleCreateWarehouse"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="chunkDialogVisible" title="切片详情" width="720px" class="knowledge-dialog">
      <div v-if="chunkDetail" class="chunk-detail">
        <div class="chunk-detail__meta">
          <span>ID：{{ chunkDetail.knowledge_id }}</span>
          <span>来源：{{ chunkDetail.knowledge_name || '-' }}</span>
          <span>批次：{{ chunkDetail.ingest_id }}</span>
        </div>
        <p>{{ chunkDetail.content }}</p>
        <el-button
          v-if="chunkDetail.minio_url"
          type="primary"
          plain
          @click="openDownload(chunkDetail.minio_url)"
        >
          下载原文件
        </el-button>
      </div>
    </el-dialog>

    <el-dialog
      v-model="ingestChunksDialogVisible"
      title="入库批次切片"
      width="860px"
      class="knowledge-dialog"
    >
      <div v-loading="ingestChunksLoading" class="ingest-chunks">
        <el-empty
          v-if="!ingestChunksLoading && ingestChunks.length === 0"
          description="暂无切片"
          :image-size="86"
        />
        <article v-for="chunk in ingestChunks" :key="chunk.knowledge_id" class="ingest-chunk">
          <div class="ingest-chunk__head">
            <strong>{{ chunk.knowledge_name || '未命名来源' }}</strong>
            <el-tag size="small" type="info">{{ chunk.knowledge_id }}</el-tag>
          </div>
          <p>{{ chunk.content }}</p>
          <div class="ingest-chunk__meta">
            <span>{{ chunk.created_at || '-' }}</span>
            <span>仓库 {{ chunk.warehouse_id }}</span>
          </div>
          <div class="ingest-chunk__actions">
            <el-button text type="primary" @click="openChunkDetail(chunk.knowledge_id)">
              查看完整切片
            </el-button>
            <el-button
              v-if="chunk.minio_url"
              text
              type="primary"
              @click="openDownload(chunk.minio_url)"
            >
              下载原文件
            </el-button>
          </div>
        </article>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { normalizeStreamingMarkdown } from '@/utils/markdownStream'
import { normalizeStreamingUrls } from '@/utils/markdownUrl'
import {
  createWarehouse,
  deleteIngest,
  deleteWarehouse,
  getChunkDetail,
  getIngestChunks,
  getWarehouseDetail,
  listWarehouseIngests,
  listWarehouses,
  queryKnowledge,
  sendKnowledgeChatStream,
  storeTextKnowledge,
  uploadKnowledgeFile,
  type KnowledgeChunkDetail,
  type KnowledgeIngestEntry,
  type KnowledgeIngestResponse,
  type KnowledgeQueryResult,
  type KnowledgeWarehouse,
} from '@/api/knowledge'
import { getCurrentAccount } from '@/utils/auth'

const router = useRouter()
const userId = computed(() => getCurrentAccount() || 'anonymous')
const isEmbedded = computed(() => window.self !== window.top)
const warehouses = ref<KnowledgeWarehouse[]>([])
const selectedWarehouseId = ref('')
const warehouseLoading = ref(false)
const warehouseDetailLoading = ref(false)
const deleteWarehouseLoading = ref(false)
const createDialogVisible = ref(false)
const createLoading = ref(false)
const activeTab = ref('detail')
const textSourceName = ref('manual')
const textContent = ref('')
const textIngesting = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const fileUploading = ref(false)
const fileKnowledgeName = ref('')
const queryText = ref('')
const topK = ref(5)
const queryLoading = ref(false)
const queryResults = ref<KnowledgeQueryResult[]>([])
interface KnowledgeChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface NormalizedWarehouseEntry {
  rowKey: string
  title: string
  createdAt: string
  ingestId: string
  chunkCount?: number
  charCount?: number
}

const warehouseEntries = ref<NormalizedWarehouseEntry[]>([])
const ingestPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})
const lastIngest = ref<KnowledgeIngestResponse | null>(null)
const chunkDialogVisible = ref(false)
const chunkDetail = ref<KnowledgeChunkDetail | null>(null)
const ingestChunksDialogVisible = ref(false)
const ingestChunksLoading = ref(false)
const ingestChunks = ref<KnowledgeChunkDetail[]>([])
const kbChatWarehouseIds = ref<string[]>([])
const kbChatTopK = ref(5)
const kbChatInput = ref('')
const kbChatMessages = ref<KnowledgeChatMessage[]>([])
const kbChatStreaming = ref(false)
const kbChatMessagesRef = ref<HTMLDivElement | null>(null)
const kbChatSessionId = ref('')
let kbChatAbortController: AbortController | null = null
const createForm = reactive({
  warehouse_name: '',
  description: '',
})

const selectedWarehouse = computed(
  () => warehouses.value.find((item) => item.warehouse_id === selectedWarehouseId.value) || null,
)

const resolvedFileKnowledgeName = computed(() => {
  return fileKnowledgeName.value.trim() || selectedFile.value?.name.trim() || ''
})

const createKnowledgeChatSessionId = () => {
  const random = Math.random().toString(36).slice(2, 10)
  return `kb-${userId.value}-${Date.now()}-${random}`
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { detail?: string; message?: string } } }).response
      ?.data
    return data?.detail || data?.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

const knowledgeChatMarkdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
})

knowledgeChatMarkdown.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  return self.renderToken(tokens, idx, options)
}

const renderKnowledgeChatMarkdown = (content: string): string => {
  if (!content) return ''

  const rendered = knowledgeChatMarkdown.render(
    normalizeStreamingUrls(normalizeStreamingMarkdown(content)),
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

const normalizeWarehouseEntries = (entries: KnowledgeIngestEntry[]): NormalizedWarehouseEntry[] => {
  return entries.map((entry, index) => {
    const ingestId = entry.ingest_id || ''
    const title =
      entry.knowledge_name || (ingestId ? `入库批次 ${ingestId}` : `入库批次 ${index + 1}`)

    return {
      rowKey: ingestId || `${selectedWarehouseId.value}-${index}`,
      title,
      createdAt: entry.created_at || '',
      ingestId,
      chunkCount: entry.chunk_count,
    }
  })
}

const loadWarehouseIngests = async () => {
  if (!selectedWarehouseId.value) return
  const response = await listWarehouseIngests(selectedWarehouseId.value, {
    user_id: userId.value,
    page: ingestPagination.page,
    page_size: ingestPagination.pageSize,
  })
  ingestPagination.page = response.page || ingestPagination.page
  ingestPagination.pageSize = response.page_size || ingestPagination.pageSize
  ingestPagination.total = response.total || 0
  warehouseEntries.value = normalizeWarehouseEntries(response.items || [])
}

const handleIngestPageSizeChange = async () => {
  ingestPagination.page = 1
  await refreshSelectedWarehouse()
}

const goBack = () => {
  router.push('/')
}

const loadWarehouses = async () => {
  warehouseLoading.value = true
  try {
    const response = await listWarehouses(userId.value)
    warehouses.value = response.items || []
    if (!selectedWarehouseId.value && warehouses.value.length) {
      selectedWarehouseId.value = warehouses.value[0].warehouse_id
    }
    if (kbChatWarehouseIds.value.length === 0 && selectedWarehouseId.value) {
      kbChatWarehouseIds.value = [selectedWarehouseId.value]
    }
    if (selectedWarehouseId.value) {
      await refreshSelectedWarehouse()
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '仓库列表加载失败'))
    warehouses.value = []
  } finally {
    warehouseLoading.value = false
  }
}

const refreshSelectedWarehouse = async () => {
  if (!selectedWarehouseId.value) return
  warehouseDetailLoading.value = true
  try {
    const detail = await getWarehouseDetail(selectedWarehouseId.value, userId.value)
    const index = warehouses.value.findIndex((item) => item.warehouse_id === detail.warehouse_id)
    if (index >= 0) {
      warehouses.value.splice(index, 1, { ...warehouses.value[index], ...detail })
    }
    await loadWarehouseIngests()
  } catch (error) {
    warehouseEntries.value = []
    ingestPagination.total = 0
    ElMessage.error(getErrorMessage(error, '仓库详情加载失败'))
  } finally {
    warehouseDetailLoading.value = false
  }
}

const selectWarehouse = async (warehouseId: string) => {
  selectedWarehouseId.value = warehouseId
  activeTab.value = 'detail'
  queryResults.value = []
  warehouseEntries.value = []
  ingestPagination.page = 1
  ingestPagination.total = 0
  lastIngest.value = null
  await refreshSelectedWarehouse()
}

const openCreateDialog = () => {
  createForm.warehouse_name = ''
  createForm.description = ''
  createDialogVisible.value = true
}

const handleCreateWarehouse = async () => {
  createLoading.value = true
  try {
    const created = await createWarehouse({
      user_id: userId.value,
      warehouse_name: createForm.warehouse_name.trim(),
      description: createForm.description.trim(),
    })
    ElMessage.success('仓库创建成功')
    createDialogVisible.value = false
    selectedWarehouseId.value = created.warehouse_id
    activeTab.value = 'detail'
    await loadWarehouses()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '仓库创建失败'))
  } finally {
    createLoading.value = false
  }
}

const confirmDeleteWarehouse = async () => {
  if (!selectedWarehouse.value) return
  try {
    await ElMessageBox.confirm(
      `确定删除“${selectedWarehouse.value.warehouse_name}”及其全部知识内容吗？`,
      '删除仓库',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
    deleteWarehouseLoading.value = true
    await deleteWarehouse(selectedWarehouse.value.warehouse_id)
    ElMessage.success('仓库已删除')
    selectedWarehouseId.value = ''
    await loadWarehouses()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(getErrorMessage(error, '仓库删除失败'))
    }
  } finally {
    deleteWarehouseLoading.value = false
  }
}

const handleStoreText = async () => {
  if (!selectedWarehouseId.value) return
  textIngesting.value = true
  try {
    lastIngest.value = await storeTextKnowledge({
      warehouse_id: selectedWarehouseId.value,
      content: textContent.value.trim(),
      source_name: textSourceName.value.trim() || 'manual',
    })
    textContent.value = ''
    ElMessage.success('文本入库成功')
    await refreshSelectedWarehouse()
    activeTab.value = 'detail'
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '文本入库失败'))
  } finally {
    textIngesting.value = false
  }
}

const openFilePicker = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] || null
  if (selectedFile.value && !fileKnowledgeName.value.trim()) {
    fileKnowledgeName.value = selectedFile.value.name.replace(/\.[^.]+$/, '')
  }
}

const handleUploadFile = async () => {
  if (!selectedWarehouseId.value || !selectedFile.value) return
  fileUploading.value = true
  try {
    lastIngest.value = await uploadKnowledgeFile(
      selectedWarehouseId.value,
      selectedFile.value,
      resolvedFileKnowledgeName.value,
    )
    ElMessage.success('文件入库成功')
    selectedFile.value = null
    fileKnowledgeName.value = ''
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    await refreshSelectedWarehouse()
    activeTab.value = 'detail'
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '文件入库失败'))
  } finally {
    fileUploading.value = false
  }
}

const handleQuery = async () => {
  queryLoading.value = true
  try {
    const response = await queryKnowledge({
      query: queryText.value.trim(),
      user_id: userId.value,
      warehouse_id: selectedWarehouseId.value,
      top_k: topK.value,
    })
    queryResults.value = response.results || []
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '语义检索失败'))
    queryResults.value = []
  } finally {
    queryLoading.value = false
  }
}

const scrollKnowledgeChatToBottom = async () => {
  await nextTick()
  if (kbChatMessagesRef.value) {
    kbChatMessagesRef.value.scrollTop = kbChatMessagesRef.value.scrollHeight
  }
}

const resetKnowledgeChat = () => {
  stopKnowledgeChat()
  kbChatMessages.value = []
  kbChatSessionId.value = createKnowledgeChatSessionId()
}

const stopKnowledgeChat = () => {
  if (kbChatAbortController) {
    kbChatAbortController.abort()
    kbChatAbortController = null
  }
  kbChatStreaming.value = false
}

const sendKnowledgeChatMessage = async () => {
  const query = kbChatInput.value.trim()
  if (!query || kbChatStreaming.value) return

  if (!kbChatSessionId.value) {
    kbChatSessionId.value = createKnowledgeChatSessionId()
  }

  const userMessage: KnowledgeChatMessage = {
    id: `${Date.now()}-user`,
    role: 'user',
    content: query,
  }
  const assistantMessage: KnowledgeChatMessage = {
    id: `${Date.now()}-assistant`,
    role: 'assistant',
    content: '',
  }

  kbChatInput.value = ''
  kbChatMessages.value.push(userMessage, assistantMessage)
  const assistantMessageIndex = kbChatMessages.value.length - 1
  kbChatStreaming.value = true
  kbChatAbortController = new AbortController()
  await scrollKnowledgeChatToBottom()

  try {
    await sendKnowledgeChatStream(
      {
        query,
        session_id: kbChatSessionId.value,
        images: [],
        file_ids: [],
        source: 'api',
        user_id: userId.value,
        warehouse_ids: kbChatWarehouseIds.value,
        kb_top_k: kbChatTopK.value,
      },
      async (delta) => {
        const currentAssistantMessage = kbChatMessages.value[assistantMessageIndex]
        if (currentAssistantMessage) {
          currentAssistantMessage.content += delta
        }
        await scrollKnowledgeChatToBottom()
      },
      () => {
        kbChatStreaming.value = false
        kbChatAbortController = null
      },
      (error) => {
        assistantMessage.content = assistantMessage.content
          ? `${assistantMessage.content}\n\n[错误] ${error.message}`
          : `抱歉，知识库对话失败：${error.message}`
        kbChatStreaming.value = false
        kbChatAbortController = null
      },
      kbChatAbortController.signal,
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
  } finally {
    kbChatStreaming.value = false
    kbChatAbortController = null
    await scrollKnowledgeChatToBottom()
  }
}

const openChunkDetail = async (knowledgeId: string) => {
  try {
    chunkDetail.value = await getChunkDetail(knowledgeId, userId.value)
    chunkDialogVisible.value = true
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '切片详情加载失败'))
  }
}

const openDownload = (minioUrl: string) => {
  window.open(minioUrl, '_blank', 'noopener,noreferrer')
}

const openIngestChunks = async (ingestId: string) => {
  ingestChunksDialogVisible.value = true
  ingestChunksLoading.value = true
  ingestChunks.value = []
  try {
    const response = await getIngestChunks(ingestId, userId.value, 400)
    ingestChunks.value = response.chunks || []
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '入库批次切片加载失败'))
  } finally {
    ingestChunksLoading.value = false
  }
}

const confirmDeleteIngest = async (ingestId: string) => {
  try {
    await ElMessageBox.confirm('确定删除该批次产生的全部切片吗？', '删除入库批次', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteIngest(ingestId, userId.value)
    ElMessage.success('入库批次已删除')
    queryResults.value = queryResults.value.filter((item) => item.ingest_id !== ingestId)
    warehouseEntries.value = warehouseEntries.value.filter((item) => item.ingestId !== ingestId)
    await refreshSelectedWarehouse()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(getErrorMessage(error, '入库批次删除失败'))
    }
  }
}

const formatScore = (score?: number) => {
  if (typeof score !== 'number') return '相关度 -'
  return `相关度 ${(score * 100).toFixed(1)}%`
}

const formatCreatedAt = (createdAt?: string | number) => {
  if (!createdAt) return '未知时间'
  if (typeof createdAt === 'number') {
    return new Date(createdAt * 1000).toLocaleString()
  }
  return createdAt
}

onMounted(() => {
  kbChatSessionId.value = createKnowledgeChatSessionId()
  loadWarehouses()
})

onUnmounted(() => {
  stopKnowledgeChat()
})
</script>

<style scoped>
.knowledge-page {
  --knowledge-page-bg: var(--app-bg-gradient);
  --knowledge-panel-bg: var(--app-panel);
  --knowledge-muted-bg: var(--app-panel-muted);
  --knowledge-elevated-bg: var(--app-panel-elevated);
  --knowledge-text: var(--app-text);
  --knowledge-muted: var(--app-text-muted);
  --knowledge-subtle: var(--app-text-subtle);
  --knowledge-border: var(--app-border);
  --knowledge-border-hover: var(--app-border-hover);
  --knowledge-primary: var(--app-primary);
  --knowledge-primary-soft: var(--app-primary-soft);
  --knowledge-shadow: var(--app-shadow);
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: flex;
  flex-direction: column;
  color: var(--knowledge-text);
  background: var(--knowledge-page-bg);
  overflow: hidden;
}

:global(:root[data-theme='light']) .knowledge-page,
:global(body[data-theme='light']) .knowledge-page,
:global(#app[data-theme='light']) .knowledge-page,
:global(.app-theme-light) .knowledge-page {
  --knowledge-page-bg: linear-gradient(135deg, #f7f9fc 0%, #edf2f8 100%);
  --knowledge-panel-bg: #ffffff;
  --knowledge-muted-bg: #f8fafc;
  --knowledge-elevated-bg: #ffffff;
  --knowledge-text: #172033;
  --knowledge-muted: #64748b;
  --knowledge-subtle: #94a3b8;
  --knowledge-border: rgba(23, 32, 51, 0.1);
  --knowledge-border-hover: rgba(23, 32, 51, 0.18);
  --knowledge-primary: #2563eb;
  --knowledge-primary-soft: rgba(37, 99, 235, 0.1);
  --knowledge-shadow: 0 18px 48px rgba(24, 39, 75, 0.12);
}

:global(:root[data-theme='dark']) .knowledge-page,
:global(body[data-theme='dark']) .knowledge-page,
:global(#app[data-theme='dark']) .knowledge-page,
:global(.app-theme-dark) .knowledge-page {
  --knowledge-page-bg: var(--app-bg-gradient);
  --knowledge-panel-bg: var(--app-panel);
  --knowledge-muted-bg: var(--app-panel-muted);
  --knowledge-elevated-bg: var(--app-panel-elevated);
  --knowledge-text: var(--app-text);
  --knowledge-muted: var(--app-text-muted);
  --knowledge-subtle: var(--app-text-subtle);
  --knowledge-border: var(--app-border);
  --knowledge-border-hover: var(--app-border-hover);
  --knowledge-primary: var(--app-primary);
  --knowledge-primary-soft: var(--app-primary-soft);
  --knowledge-shadow: var(--app-shadow);
}

.knowledge-page :deep(.el-tabs__item) {
  color: var(--knowledge-muted);
}

.knowledge-page :deep(.el-tabs__item.is-active),
.knowledge-page :deep(.el-tabs__item:hover) {
  color: var(--knowledge-primary);
}

.knowledge-page :deep(.el-tabs__active-bar) {
  background-color: var(--knowledge-primary);
}

.knowledge-page :deep(.el-tabs__nav-wrap::after) {
  background-color: var(--knowledge-border);
}

.knowledge-page :deep(.el-input__wrapper),
.knowledge-page :deep(.el-select__wrapper),
.knowledge-page :deep(.el-textarea__inner) {
  color: var(--knowledge-text);
  background-color: var(--knowledge-muted-bg);
  box-shadow: 0 0 0 1px var(--knowledge-border) inset;
}

.knowledge-page :deep(.el-input__wrapper:hover),
.knowledge-page :deep(.el-select__wrapper:hover),
.knowledge-page :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px var(--knowledge-border-hover) inset;
}

.knowledge-page :deep(.el-input__wrapper.is-focus),
.knowledge-page :deep(.el-select__wrapper.is-focused),
.knowledge-page :deep(.el-textarea__inner:focus) {
  background-color: var(--knowledge-panel-bg);
  box-shadow: 0 0 0 1px var(--knowledge-primary) inset;
}

.knowledge-page :deep(.el-input__inner),
.knowledge-page :deep(.el-select__placeholder),
.knowledge-page :deep(.el-textarea__inner) {
  color: var(--knowledge-text);
}

.knowledge-page :deep(.el-input__inner::placeholder),
.knowledge-page :deep(.el-textarea__inner::placeholder) {
  color: var(--knowledge-subtle);
}

.knowledge-page :deep(.el-empty__description p) {
  color: var(--knowledge-muted);
}

.knowledge-page :deep(.el-pagination) {
  --el-pagination-button-color: var(--knowledge-muted);
  --el-pagination-bg-color: var(--knowledge-muted-bg);
  --el-pagination-button-bg-color: var(--knowledge-muted-bg);
  --el-pagination-hover-color: var(--knowledge-primary);
}

.knowledge-page :deep(.el-button:not(.el-button--primary):not(.el-button--danger)) {
  color: var(--knowledge-text);
  background: var(--knowledge-muted-bg);
  border-color: var(--knowledge-border);
}

.knowledge-page :deep(.el-button:not(.el-button--primary):not(.el-button--danger):hover) {
  color: var(--knowledge-primary);
  background: var(--knowledge-primary-soft);
  border-color: var(--knowledge-primary);
}

.knowledge-page :deep(.el-button.is-text) {
  background: transparent;
  border-color: transparent;
}

:global(.knowledge-dialog.el-dialog),
:global(.knowledge-dialog .el-dialog__header),
:global(.knowledge-dialog .el-dialog__body),
:global(.knowledge-dialog .el-dialog__footer) {
  color: var(--app-text);
  background: var(--app-panel);
  border-color: var(--app-border);
}

:global(.knowledge-dialog .el-dialog__title) {
  color: var(--app-text);
}

:global(.knowledge-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: var(--app-text-muted);
}

:global(.knowledge-dialog .el-input__wrapper),
:global(.knowledge-dialog .el-textarea__inner) {
  color: var(--app-text);
  background-color: var(--app-panel-muted);
  box-shadow: 0 0 0 1px var(--app-border) inset;
}

:global(.knowledge-dialog .el-input__inner),
:global(.knowledge-dialog .el-textarea__inner) {
  color: var(--app-text);
}

:global(.knowledge-dialog .el-input__inner::placeholder),
:global(.knowledge-dialog .el-textarea__inner::placeholder) {
  color: var(--app-text-subtle);
}

:global(.knowledge-select-popper.el-popper),
:global(.knowledge-select-popper .el-select-dropdown) {
  color: var(--app-text);
  background: var(--app-panel);
  border-color: var(--app-border);
}

:global(.knowledge-select-popper .el-select-dropdown__item) {
  color: var(--app-text);
}

:global(.knowledge-select-popper .el-select-dropdown__item.is-hovering),
:global(.knowledge-select-popper .el-select-dropdown__item.hover),
:global(.knowledge-select-popper .el-select-dropdown__item:hover) {
  color: var(--app-primary);
  background: var(--app-primary-soft);
}

:global(.knowledge-select-popper .el-select-dropdown__item.is-selected) {
  color: var(--app-primary);
  font-weight: 760;
}

:global(:root[data-theme='dark'] .knowledge-dialog.el-dialog),
:global(:root[data-theme='dark'] .knowledge-dialog .el-dialog__header),
:global(:root[data-theme='dark'] .knowledge-dialog .el-dialog__body),
:global(:root[data-theme='dark'] .knowledge-dialog .el-dialog__footer),
:global(body[data-theme='dark'] .knowledge-dialog.el-dialog),
:global(body[data-theme='dark'] .knowledge-dialog .el-dialog__header),
:global(body[data-theme='dark'] .knowledge-dialog .el-dialog__body),
:global(body[data-theme='dark'] .knowledge-dialog .el-dialog__footer),
:global(.app-theme-dark .knowledge-dialog.el-dialog),
:global(.app-theme-dark .knowledge-dialog .el-dialog__header),
:global(.app-theme-dark .knowledge-dialog .el-dialog__body),
:global(.app-theme-dark .knowledge-dialog .el-dialog__footer) {
  color: #f8fafc;
  background: #111827;
  border-color: rgba(148, 163, 184, 0.18);
}

:global(:root[data-theme='dark'] .knowledge-dialog .el-dialog__title),
:global(body[data-theme='dark'] .knowledge-dialog .el-dialog__title),
:global(.app-theme-dark .knowledge-dialog .el-dialog__title) {
  color: #f8fafc;
}

:global(:root[data-theme='dark'] .knowledge-dialog .el-input__wrapper),
:global(:root[data-theme='dark'] .knowledge-dialog .el-textarea__inner),
:global(body[data-theme='dark'] .knowledge-dialog .el-input__wrapper),
:global(body[data-theme='dark'] .knowledge-dialog .el-textarea__inner),
:global(.app-theme-dark .knowledge-dialog .el-input__wrapper),
:global(.app-theme-dark .knowledge-dialog .el-textarea__inner) {
  color: #f8fafc;
  background-color: #0f172a;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.18) inset;
}

:global(:root[data-theme='dark'] .knowledge-dialog .el-input__inner),
:global(:root[data-theme='dark'] .knowledge-dialog .el-textarea__inner),
:global(body[data-theme='dark'] .knowledge-dialog .el-input__inner),
:global(body[data-theme='dark'] .knowledge-dialog .el-textarea__inner),
:global(.app-theme-dark .knowledge-dialog .el-input__inner),
:global(.app-theme-dark .knowledge-dialog .el-textarea__inner) {
  color: #f8fafc;
}

:global(:root[data-theme='dark'] .knowledge-select-popper.el-popper),
:global(:root[data-theme='dark'] .knowledge-select-popper .el-select-dropdown),
:global(body[data-theme='dark'] .knowledge-select-popper.el-popper),
:global(body[data-theme='dark'] .knowledge-select-popper .el-select-dropdown),
:global(.app-theme-dark .knowledge-select-popper.el-popper),
:global(.app-theme-dark .knowledge-select-popper .el-select-dropdown) {
  color: #f8fafc;
  background: #111827;
  border-color: rgba(148, 163, 184, 0.18);
}

:global(:root[data-theme='dark'] .knowledge-select-popper .el-select-dropdown__item),
:global(body[data-theme='dark'] .knowledge-select-popper .el-select-dropdown__item),
:global(.app-theme-dark .knowledge-select-popper .el-select-dropdown__item) {
  color: #dbe4ef;
}

:global(:root[data-theme='dark'] .knowledge-select-popper .el-select-dropdown__item.is-hovering),
:global(:root[data-theme='dark'] .knowledge-select-popper .el-select-dropdown__item.hover),
:global(:root[data-theme='dark'] .knowledge-select-popper .el-select-dropdown__item:hover),
:global(body[data-theme='dark'] .knowledge-select-popper .el-select-dropdown__item.is-hovering),
:global(body[data-theme='dark'] .knowledge-select-popper .el-select-dropdown__item.hover),
:global(body[data-theme='dark'] .knowledge-select-popper .el-select-dropdown__item:hover),
:global(.app-theme-dark .knowledge-select-popper .el-select-dropdown__item.is-hovering),
:global(.app-theme-dark .knowledge-select-popper .el-select-dropdown__item.hover),
:global(.app-theme-dark .knowledge-select-popper .el-select-dropdown__item:hover) {
  color: #84a2ff;
  background: rgba(79, 124, 255, 0.16);
}

.knowledge-header,
.knowledge-layout {
  max-width: 1220px;
  width: calc(100% - 48px);
  margin-right: auto;
  margin-left: auto;
}

.knowledge-header {
  margin-top: 28px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex: 0 0 auto;
}

.knowledge-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  color: var(--knowledge-primary);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 18px;
  font-weight: 800;
}

.knowledge-header h1 {
  margin: 4px 0 6px;
  font-size: 28px;
  font-weight: 780;
  letter-spacing: 0;
}

.knowledge-header p {
  margin: 0;
  color: var(--knowledge-muted);
  font-size: 14px;
}

.knowledge-layout {
  flex: 1;
  min-height: 0;
  margin-top: 18px;
  margin-bottom: 28px;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
}

.warehouse-panel,
.knowledge-workbench {
  min-height: 0;
  border: 1px solid var(--knowledge-border);
  border-radius: 16px;
  background: var(--knowledge-panel-bg);
  box-shadow: var(--knowledge-shadow);
}

.warehouse-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.warehouse-panel__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 760;
}

.warehouse-list {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warehouse-item {
  width: 100%;
  min-height: 72px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: var(--knowledge-text);
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.warehouse-item:hover,
.warehouse-item--active {
  color: var(--knowledge-primary);
  border-color: var(--knowledge-primary-soft);
  background: var(--knowledge-primary-soft);
}

.warehouse-item__name,
.warehouse-item__desc {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warehouse-item__name {
  font-size: 14px;
  font-weight: 760;
}

.warehouse-item__desc {
  margin-top: 7px;
  color: var(--knowledge-muted);
  font-size: 12px;
}

.knowledge-workbench {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.knowledge-empty {
  flex: 1;
  display: grid;
  place-items: center;
}

.warehouse-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 18px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--knowledge-border);
}

.warehouse-summary h2 {
  margin: 0 0 6px;
  overflow: hidden;
  font-size: 20px;
  font-weight: 780;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warehouse-summary p {
  margin: 0;
  overflow: hidden;
  color: var(--knowledge-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warehouse-stats {
  display: flex;
  gap: 10px;
}

.warehouse-stat {
  min-width: 88px;
  padding: 10px 12px;
  border: 1px solid var(--knowledge-border);
  border-radius: 12px;
  background: var(--knowledge-muted-bg);
}

.warehouse-stat--wide {
  min-width: 170px;
}

.warehouse-stat span,
.warehouse-stat em {
  display: block;
  font-style: normal;
}

.warehouse-stat span {
  overflow: hidden;
  font-size: 15px;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warehouse-stat em {
  margin-top: 4px;
  color: var(--knowledge-muted);
  font-size: 12px;
}

.knowledge-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 20px 18px;
}

.knowledge-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.knowledge-tabs :deep(.el-tab-pane) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.warehouse-detail {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 10px;
}

.warehouse-detail__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.warehouse-detail__toolbar > div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.warehouse-detail__toolbar strong {
  color: var(--knowledge-text);
  font-size: 15px;
  font-weight: 760;
}

.warehouse-detail__toolbar span {
  color: var(--knowledge-muted);
  font-size: 12px;
}

.warehouse-detail__pagination {
  display: flex;
  justify-content: flex-end;
}

.warehouse-detail__loading,
.warehouse-entry-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.warehouse-detail-loading-card {
  padding: 16px;
  border: 1px solid var(--knowledge-border);
  border-radius: 12px;
  background: var(--knowledge-muted-bg);
}

.warehouse-detail-loading-card span {
  position: relative;
  display: block;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--app-skeleton-line-bg);
}

.warehouse-detail-loading-card span::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 48%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, var(--app-skeleton-shimmer), transparent);
  animation: warehouseDetailLoadingSweep 1.4s ease-in-out infinite;
}

.warehouse-detail-loading-card span:first-child {
  width: 38%;
}

.warehouse-detail-loading-card span:last-child {
  width: 78%;
  margin-top: 12px;
}

.warehouse-entry {
  padding: 16px;
  border: 1px solid var(--knowledge-border);
  border-radius: 12px;
  background: var(--knowledge-muted-bg);
}

.warehouse-entry__head,
.warehouse-entry__meta,
.warehouse-entry__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.warehouse-entry__head {
  justify-content: space-between;
}

.warehouse-entry__head strong {
  min-width: 0;
  overflow: hidden;
  color: var(--knowledge-text);
  font-size: 14px;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warehouse-entry p {
  margin: 10px 0;
  overflow: hidden;
  color: var(--knowledge-text);
  display: -webkit-box;
  font-size: 14px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.warehouse-entry__meta {
  flex-wrap: wrap;
  color: var(--knowledge-muted);
  font-size: 12px;
}

.warehouse-entry__actions {
  margin-top: 10px;
}

@keyframes warehouseDetailLoadingSweep {
  0% {
    transform: translateX(-130%);
  }

  100% {
    transform: translateX(250%);
  }
}

.ingest-form,
.file-ingest {
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 10px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.file-ingest__input {
  display: none;
}

.file-ingest__dropzone {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border: 1px dashed var(--knowledge-border);
  border-radius: 14px;
  color: var(--knowledge-text);
  background: var(--knowledge-muted-bg);
  cursor: pointer;
  font: inherit;
  text-align: center;
}

.file-ingest__dropzone:hover {
  border-color: var(--knowledge-primary);
  background: var(--knowledge-primary-soft);
}

.file-ingest__title {
  max-width: 100%;
  overflow: hidden;
  font-size: 16px;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-ingest__desc {
  color: var(--knowledge-muted);
  font-size: 13px;
}

.query-form {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 128px auto;
  gap: 12px;
  padding-top: 10px;
}

.query-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.query-result {
  padding: 16px;
  border: 1px solid var(--knowledge-border);
  border-radius: 12px;
  background: var(--knowledge-muted-bg);
}

.query-result__head,
.query-result__meta,
.query-result__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.query-result__head {
  justify-content: space-between;
}

.query-result p {
  margin: 10px 0;
  color: var(--knowledge-text);
  font-size: 14px;
  line-height: 1.7;
}

.query-result__meta {
  flex-wrap: wrap;
  color: var(--knowledge-muted);
  font-size: 12px;
}

.query-result__actions {
  margin-top: 10px;
}

.kb-chat {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  padding-top: 10px;
}

.kb-chat__settings {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 128px auto;
  gap: 12px;
  align-items: center;
}

.kb-chat__messages {
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--knowledge-border);
  border-radius: 12px;
  background: var(--knowledge-muted-bg);
}

.kb-chat-message {
  max-width: min(760px, 92%);
  padding: 12px 14px;
  border: 1px solid var(--knowledge-border);
  border-radius: 12px;
  background: var(--knowledge-panel-bg);
}

.kb-chat-message--user {
  align-self: flex-end;
  color: white;
  border-color: var(--knowledge-primary);
  background: var(--knowledge-primary);
}

.kb-chat-message--assistant {
  align-self: flex-start;
}

.kb-chat-message strong {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 760;
}

.kb-chat-message p {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.kb-chat-message__markdown {
  font-size: 14px;
  line-height: 1.8;
}

.kb-chat-message__markdown :deep(p) {
  margin: 0.45em 0;
}

.kb-chat-message__markdown :deep(p:first-child) {
  margin-top: 0;
}

.kb-chat-message__markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.kb-chat-message__markdown :deep(strong) {
  display: inline;
  margin: 0;
  font-size: inherit;
  font-weight: 760;
}

.kb-chat-message__markdown :deep(ul),
.kb-chat-message__markdown :deep(ol) {
  margin: 0.45em 0;
  padding-left: 1.4em;
}

.kb-chat-message__markdown :deep(pre) {
  overflow-x: auto;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.08);
}

.kb-chat__composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: flex-end;
}

.ingest-result {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--knowledge-border);
  color: var(--knowledge-muted);
  background: var(--knowledge-muted-bg);
  font-size: 13px;
}

.ingest-result strong {
  color: var(--knowledge-text);
}

.chunk-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chunk-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--knowledge-muted);
  font-size: 12px;
}

.chunk-detail p {
  max-height: 420px;
  margin: 0;
  overflow: auto;
  padding: 14px;
  border: 1px solid var(--knowledge-border);
  border-radius: 12px;
  background: var(--knowledge-muted-bg);
  line-height: 1.8;
  white-space: pre-wrap;
}

.ingest-chunks {
  min-height: 160px;
  max-height: 620px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ingest-chunk {
  padding: 14px;
  border: 1px solid var(--knowledge-border);
  border-radius: 12px;
  background: var(--knowledge-muted-bg);
}

.ingest-chunk__head,
.ingest-chunk__meta,
.ingest-chunk__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ingest-chunk__head {
  justify-content: space-between;
}

.ingest-chunk__head strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ingest-chunk p {
  margin: 10px 0;
  color: var(--knowledge-text);
  line-height: 1.7;
  white-space: pre-wrap;
}

.ingest-chunk__meta {
  flex-wrap: wrap;
  color: var(--knowledge-muted);
  font-size: 12px;
}

.ingest-chunk__actions {
  margin-top: 10px;
}

@media (max-width: 900px) {
  .knowledge-header,
  .knowledge-layout {
    width: calc(100% - 32px);
  }

  .knowledge-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .warehouse-panel {
    max-height: 260px;
  }

  .warehouse-summary,
  .query-form,
  .kb-chat__settings,
  .kb-chat__composer {
    grid-template-columns: 1fr;
  }

  .warehouse-stats {
    flex-wrap: wrap;
  }
}
</style>
