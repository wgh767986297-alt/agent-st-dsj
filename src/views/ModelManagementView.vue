<template>
  <div class="model-page" :class="{ 'model-page--embedded': props.embedded }">
    <header class="model-header">
      <div class="model-title-group">
        <button v-if="!props.embedded" class="model-back-link" type="button" @click="goBack" aria-label="返回">
          <el-icon :size="18"><ArrowLeft /></el-icon>
        </button>
        <div class="model-title-row">
          <span class="model-title-icon">
            <el-icon><Monitor /></el-icon>
          </span>
          <div>
            <h1>模型管理</h1>
          </div>
        </div>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增模型</el-button>
    </header>

    <section class="model-table-shell">
      <div class="model-table-toolbar">
        <el-input
          v-model="keyword"
          class="model-search-input"
          clearable
          placeholder="搜索模型名称、模型标识或接口地址"
          :prefix-icon="Search"
        />
        <el-button :icon="Refresh" :loading="loading" @click="loadModels">刷新</el-button>
      </div>

      <div v-if="loading" class="table-skeleton" aria-busy="true" aria-label="模型加载中">
        <div v-for="index in 8" :key="`model-loading-row-${index}`" class="table-skeleton__row">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <el-empty
        v-else-if="filteredModels.length === 0"
        class="model-empty"
        description="暂无匹配模型"
      />

      <el-table
        v-else
        :data="filteredModels"
        class="model-table"
        row-key="name"
      >
        <el-table-column prop="name" label="模型名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="model" label="模型标识" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.model || '-' }}</template>
        </el-table-column>
        <el-table-column prop="apibase" label="接口地址" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">{{ row.apibase || '-' }}</template>
        </el-table-column>
        <el-table-column label="超时/重试" min-width="170">
          <template #default="{ row }">
            <div class="model-timeout">
              <span>重试 {{ row.max_retries ?? '-' }}</span>
              <span>连接 {{ row.connect_timeout ?? '-' }}s</span>
              <span>读取 {{ row.read_timeout ?? '-' }}s</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="思考模式" min-width="100">
          <template #default="{ row }">
            <el-tag :type="row.enable_thinking ? 'success' : 'info'" size="small">
              {{ row.enable_thinking ? '开启' : '关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="管理员可见" min-width="100">
          <template #default="{ row }">
            <el-tag :type="row.admin ? 'warning' : 'info'" size="small">
              {{ row.admin ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <div class="model-actions">
              <el-button text type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button text type="danger" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增模型' : '编辑模型'"
      width="620px"
      destroy-on-close
      class="model-dialog"
    >
      <el-form class="model-form" label-position="top" :model="form" @submit.prevent>
        <el-form-item label="模型名称" required>
          <el-input
            v-model="form.name"
            :disabled="dialogMode === 'edit'"
            placeholder="例如 deepseek-v4"
          />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="form.apikey" clearable placeholder="可为空" />
        </el-form-item>
        <el-form-item label="接口地址">
          <el-input v-model="form.apibase" clearable placeholder="模型服务 chat completions 地址" />
        </el-form-item>
        <el-form-item label="模型标识">
          <el-input v-model="form.model" clearable placeholder="服务端实际 model 字段，可为空" />
        </el-form-item>
        <div class="model-form-grid">
          <el-form-item label="最大重试次数">
            <el-input-number
              v-model="form.max_retries"
              :min="0"
              :max="20"
              controls-position="right"
            />
          </el-form-item>
          <el-form-item label="连接超时（秒）">
            <el-input-number
              v-model="form.connect_timeout"
              :min="0"
              :max="600"
              controls-position="right"
            />
          </el-form-item>
          <el-form-item label="读取超时（秒）">
            <el-input-number
              v-model="form.read_timeout"
              :min="0"
              :max="3600"
              controls-position="right"
            />
          </el-form-item>
        </div>
        <el-form-item label="思考模式">
          <el-switch v-model="form.enable_thinking" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <el-form-item label="管理员可见">
          <el-switch v-model="form.admin" active-text="是" inactive-text="否" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave()">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Monitor, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteModel,
  getModelList,
  saveModel,
  updateModel,
  type ModelConfig,
} from '@/api/modelManagement'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

type DialogMode = 'create' | 'edit'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const keyword = ref('')
const models = ref<ModelConfig[]>([])
const dialogVisible = ref(false)
const dialogMode = ref<DialogMode>('create')

const form = reactive<ModelConfig>({
  name: '',
  apikey: '',
  apibase: '',
  model: '',
  max_retries: 2,
  connect_timeout: 10,
  read_timeout: 120,
  enable_thinking: true,
  admin: false,
})

const filteredModels = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return models.value

  return models.value.filter((item) =>
    [item.name, item.model, item.apibase, item.apikey].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(text),
    ),
  )
})

const resetForm = (model?: ModelConfig) => {
  form.name = model?.name || ''
  form.apikey = model?.apikey || ''
  form.apibase = model?.apibase || ''
  form.model = model?.model || ''
  form.max_retries = model?.max_retries ?? 2
  form.connect_timeout = model?.connect_timeout ?? 10
  form.read_timeout = model?.read_timeout ?? 120
  form.enable_thinking = model?.enable_thinking ?? true
  form.admin = Boolean(model?.admin)
}

const goBack = () => {
  router.push('/')
}

const loadModels = async () => {
  loading.value = true
  try {
    models.value = await getModelList(true)
  } catch (error) {
    models.value = []
    ElMessage.error(error instanceof Error ? error.message : '模型列表加载失败')
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (model: ModelConfig) => {
  dialogMode.value = 'edit'
  resetForm(model)
  dialogVisible.value = true
}

const buildPayload = () => ({
  name: form.name.trim(),
  apikey: form.apikey?.trim() || null,
  apibase: form.apibase?.trim() || null,
  model: form.model?.trim() || null,
  max_retries: Number(form.max_retries ?? 0),
  connect_timeout: Number(form.connect_timeout ?? 0),
  read_timeout: Number(form.read_timeout ?? 0),
  enable_thinking: Boolean(form.enable_thinking),
  admin: Boolean(form.admin),
})

const handleSave = async () => {
  const modelName = form.name.trim()
  if (!modelName) {
    ElMessage.warning('请填写模型名称')
    return
  }

  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      await saveModel(modelName, buildPayload())
    } else {
      await updateModel(modelName, buildPayload())
    }
    ElMessage.success('模型配置已保存')
    dialogVisible.value = false
    await loadModels()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '模型保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (model: ModelConfig) => {
  try {
    await ElMessageBox.confirm(`确定删除模型「${model.name}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteModel(model.name)
    ElMessage.success('模型已删除')
    await loadModels()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '模型删除失败')
    }
  }
}

onMounted(() => {
  loadModels()
})
</script>

<style scoped>
.model-page {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 32px 40px 24px;
  color: var(--app-text);
  background: var(--app-bg-gradient);
  overflow: hidden;
}

.model-page--embedded {
  padding: 28px 32px 0;
  height: 100%;
  background: transparent;
}

.model-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 36px;
  flex: 0 0 auto;
}

.model-title-group {
  min-width: 0;
}

.model-back-link {
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

.model-back-link:hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  transform: translateX(-2px);
}

.model-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.model-title-icon {
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

.model-header h1 {
  margin: 0;
  color: var(--app-text);
  font-size: 28px;
  font-weight: 780;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.model-table-shell {
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  margin: 0 0 24px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.03),
    0 8px 24px rgba(24, 39, 75, 0.06);
}

.model-table-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-panel);
}

.model-search-input {
  max-width: 420px;
}

.model-empty {
  min-height: 320px;
  display: grid;
  place-items: center;
}

.model-table {
  width: 100%;
}

.model-table :deep(.el-table__header th) {
  color: var(--app-text);
  background: var(--app-panel-muted);
  font-weight: 760;
}

.model-timeout {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.model-actions {
  display: flex;
  gap: 4px;
}

.table-skeleton {
  display: grid;
}

.table-skeleton__row {
  height: 56px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr 2fr 0.8fr 0.7fr;
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

.model-form {
  display: grid;
  gap: 2px;
}

.model-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.model-form-grid :deep(.el-input-number) {
  width: 100%;
}

/* 对话框 */
.model-dialog :deep(.el-dialog) {
  border-radius: 18px;
}

.model-dialog :deep(.el-dialog__header) {
  padding: 22px 24px 14px;
  border-bottom: 1px solid var(--app-border);
}

.model-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.model-dialog :deep(.el-dialog__footer) {
  padding: 0 24px 24px;
}

@keyframes table-loading-shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* 深色模式 */
:root[data-theme='dark'] .model-table-shell {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .model-page {
    padding: 20px 16px;
  }

  .model-page--embedded {
    padding: 12px 14px 0;
  }

  .model-header,
  .model-table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .model-search-input {
    max-width: none;
  }

  .model-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
