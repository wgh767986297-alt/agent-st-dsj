<template>
  <div class="oplog-page" :class="{ 'oplog-page--embedded': embedded }">
    <header class="oplog-header">
      <div class="oplog-title-row">
        <span class="oplog-title-icon"><el-icon :size="22"><Tickets /></el-icon></span>
        <div><h1>操作日志</h1></div>
      </div>
    </header>

    <main class="oplog-panel">
      <div class="oplog-toolbar">
        <div class="oplog-toolbar__filters">
          <el-input v-model="query.user_account" class="oplog-input oplog-input--account" placeholder="用户账号" clearable />
          <el-select v-model="query.operation_type" class="oplog-input oplog-input--type" placeholder="操作类型" clearable>
            <el-option v-for="opt in opTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-select v-model="query.operation_module" class="oplog-input oplog-input--module" placeholder="操作模块" clearable>
            <el-option v-for="opt in opModuleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-date-picker v-model="dateRange" class="oplog-date-range" type="datetimerange" range-separator="至"
            start-placeholder="开始时间" end-placeholder="结束时间" value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm" />
        </div>
        <div class="oplog-toolbar__actions">
          <el-button type="primary" class="oplog-btn oplog-btn--primary" :icon="Search" :loading="loading" @click="doQuery">查询</el-button>
          <el-button class="oplog-btn oplog-btn--reset" :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button class="oplog-btn oplog-btn--export" :icon="Download" :loading="exporting" @click="handleExport">导出 Excel</el-button>
        </div>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="table-skeleton" aria-busy="true" aria-label="加载中">
        <div v-for="n in 8" :key="n" class="table-skeleton__row">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>

      <el-table v-else :data="logList" stripe class="oplog-table">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="user_name" label="操作用户" width="120" />
        <el-table-column prop="user_account" label="账号" width="160" />
        <el-table-column prop="user_role" label="角色" width="110" />
        <el-table-column prop="operation_type" label="操作类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="opTypeColor(row.operation_type)">{{ row.operation_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operation_module" label="模块" width="120" />
        <el-table-column label="内容" min-width="200">
          <template #default="{ row }">
            <span class="oplog-content">{{ JSON.stringify(row.operation_content) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="request_ip" label="IP" width="140" />
        <el-table-column prop="create_time" label="时间" width="180" />
      </el-table>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search, Tickets, Download } from '@element-plus/icons-vue'
import { operationLogApi, type OperationLogItem } from '@/api/operationLog'

const opTypeOptions = [
  { label: '创建', value: 'CREATE' },
  { label: '更新', value: 'UPDATE' },
  { label: '删除', value: 'DELETE' },
  { label: '分配', value: 'ASSIGN' },
  { label: '授权', value: 'AUTH' },
  { label: '审核', value: 'AUDIT' },
  { label: '申请', value: 'APPLY' },
]

const opModuleOptions = [
  { label: '部门管理', value: 'DEPARTMENT' },
  { label: '技能管理', value: 'SKILL' },
  { label: '数字警员', value: 'OFFICER' },
  { label: 'MCP服务', value: 'MCP' },
  { label: '授权管理', value: 'AUTH' },
  { label: '用户管理', value: 'USER' },
  { label: '角色管理', value: 'ROLE' },
]

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const loading = ref(false)
const exporting = ref(false)
const logList = ref<OperationLogItem[]>([])
const dateRange = ref<[string, string] | null>(null)

/** 获取近3天的日期范围 */
function getDefaultDateRange(): [string, string] {
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const format = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}:${s}`
  }
  return [format(threeDaysAgo), format(now)]
}

// 同步日期选择器到 query
watch(dateRange, (val) => {
  query.start_time = val?.[0] || ''
  query.end_time = val?.[1] || ''
})

const query = reactive({
  user_account: '',
  operation_type: '',
  operation_module: '',
  start_time: '',
  end_time: '',
  limit: 100,
})

function opTypeColor(type: string) {
  const map: Record<string, string> = {
    CREATE: 'primary', UPDATE: 'warning', DELETE: 'danger',
    ASSIGN: 'success', AUTH: 'primary', AUDIT: 'info', APPLY: '',
  }
  return map[type] || 'info'
}

async function doQuery() {
  loading.value = true
  try {
    const params: any = { limit: query.limit }
    if (query.user_account) params.user_account = query.user_account
    if (query.operation_type) params.operation_type = query.operation_type
    if (query.operation_module) params.operation_module = query.operation_module
    if (query.start_time) params.start_time = query.start_time
    if (query.end_time) params.end_time = query.end_time
    logList.value = await operationLogApi.query(params)
  } catch (e: any) {
    ElMessage.error(e.message || '查询失败')
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const params: any = { limit: 10000 }
    if (query.user_account) params.user_account = query.user_account
    if (query.operation_type) params.operation_type = query.operation_type
    if (query.operation_module) params.operation_module = query.operation_module
    if (query.start_time) params.start_time = query.start_time
    if (query.end_time) params.end_time = query.end_time
    await operationLogApi.exportLog(params)
    ElMessage.success('导出成功')
  } catch (e: any) {
    ElMessage.error(e.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

function handleReset() {
  query.user_account = ''
  query.operation_type = ''
  query.operation_module = ''
  const [start, end] = getDefaultDateRange()
  query.start_time = start
  query.end_time = end
  dateRange.value = [start, end]
  doQuery()
}

onMounted(() => {
  // 默认查询近3天数据
  const [start, end] = getDefaultDateRange()
  query.start_time = start
  query.end_time = end
  dateRange.value = [start, end]
  doQuery()
})
</script>

<style scoped>
.oplog-page { display: flex; flex-direction: column; height: 100%; padding: 0; background: var(--app-bg); color: var(--app-text); }
.oplog-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 36px; flex-shrink: 0; }
.oplog-title-row { display: flex; align-items: center; gap: 14px; }
.oplog-title-icon {
  width: 52px; height: 52px;
  display: grid; place-items: center;
  flex: 0 0 52px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
  font-size: 24px;
  box-shadow: 0 8px 24px rgba(79, 124, 255, 0.22);
}
.oplog-title-row h1 { margin: 0; font-size: 28px; font-weight: 780; letter-spacing: -0.02em; color: var(--app-text); line-height: 1.25; }

.oplog-panel {
  flex: 1;
  min-height: 0;
  margin: 0 0 24px;
  overflow: hidden auto;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.03),
    0 8px 24px rgba(24, 39, 75, 0.06);
}

.oplog-table { width: 100%; }

/* ==================== 工具栏 ==================== */
.oplog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.oplog-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.oplog-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.oplog-input { flex-shrink: 0; }
.oplog-input--account { width: 160px; }
.oplog-input--type { width: 130px; }
.oplog-input--module { width: 140px; }

.oplog-date-range { width: 300px; flex-shrink: 0; }

/* 统一样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  height: 40px;
  box-shadow: none;
  background: var(--app-panel-muted);
  border: 1.5px solid var(--app-border);
  transition: border-color 0.2s, box-shadow 0.2s;
}
:deep(.el-input__wrapper:hover) { border-color: var(--app-border-hover); }
:deep(.el-input__wrapper.is-focus) {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-softer);
}
:deep(.el-input__inner) { font-size: 13px; color: var(--app-text); }
:deep(.el-input__inner::placeholder) { color: var(--app-text-subtle); }
:deep(.el-range-input) { font-size: 13px; color: var(--app-text); min-width: 0; }
:deep(.el-range-input::placeholder) { color: var(--app-text-subtle); }
:deep(.el-range-separator) {
  color: var(--app-text-muted);
  font-size: 12px;
  padding: 0 6px;
  line-height: 30px;
  flex-shrink: 0;
}

/* Buttons */
.oplog-btn {
  border-radius: 10px;
  font-weight: 600;
  height: 40px;
  padding: 0 18px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.oplog-btn--primary {
  box-shadow: 0 2px 8px rgba(79, 124, 255, 0.2);
}
.oplog-btn--primary:hover {
  box-shadow: 0 4px 16px rgba(79, 124, 255, 0.3);
  transform: translateY(-1px);
}

.oplog-btn--reset {
  background: var(--app-panel-muted);
  border: 1.5px solid var(--app-border);
  color: var(--app-text-muted);
}
.oplog-btn--reset:hover {
  background: var(--app-hover);
  border-color: var(--app-border-hover);
  color: var(--app-text);
}

.oplog-btn--export {
  background: var(--tc-green-bg, #e1f3d8);
  border: 1.5px solid var(--app-success, #67c23a);
  color: var(--app-success, #67c23a);
}
.oplog-btn--export:hover {
  background: var(--app-success, #67c23a);
  color: #fff;
}

/* Content */
.oplog-content {
  font-size: 12px;
  color: var(--app-text-muted);
  font-family: monospace;
  max-width: 300px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Skeleton */
.table-skeleton { display: grid; }
.table-skeleton__row {
  height: 56px;
  display: grid;
  grid-template-columns: 0.4fr 0.7fr 0.9fr 0.6fr 0.6fr 0.7fr 1fr 0.8fr 1fr;
  align-items: center;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid var(--app-border);
}
.table-skeleton__row span {
  height: 13px;
  border-radius: 999px;
  background: var(--app-border);
  animation: oplog-skeleton-pulse 1.5s ease-in-out infinite;
}
@keyframes oplog-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 768px) {
  .oplog-header { flex-direction: column; align-items: stretch; }
  .oplog-title-row h1 { font-size: 20px; }
  .oplog-title-icon { width: 44px; height: 44px; font-size: 20px; }
  .oplog-toolbar { flex-direction: column; align-items: stretch; }
  .oplog-toolbar__filters { flex-direction: column; align-items: stretch; }
  .oplog-input--account, .oplog-input--type, .oplog-input--module, .oplog-date-range { width: 100%; }
  .oplog-toolbar__actions { justify-content: flex-end; }
}
</style>
