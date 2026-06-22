<template>
  <div class="account-audit-page" :class="{ 'account-audit-page--embedded': props.embedded }">
    <header class="audit-header">
      <div class="audit-title-group">
        <button v-if="!props.embedded" class="audit-back-link" type="button" @click="goBack" aria-label="返回">
          <el-icon :size="18"><ArrowLeft /></el-icon>
        </button>
        <div class="audit-title-row">
          <span class="audit-title-icon">
            <el-icon><UserFilled /></el-icon>
          </span>
          <div>
            <h1>账号审核</h1>
          </div>
        </div>
      </div>
      <div class="audit-header__actions">
        <el-button class="audit-refresh-btn" :icon="Refresh" :loading="loading" @click="loadUsers">
          刷新
        </el-button>
      </div>
    </header>

    <main class="audit-panel">
      <div class="audit-toolbar">
        <el-select v-model="statusFilter" class="audit-status-filter" placeholder="审核状态">
          <el-option label="全部状态" value="all" />
          <el-option label="未审核" value="00" />
          <el-option label="已审核" value="01" />
          <el-option label="审核拒绝" value="02" />
        </el-select>
        <el-input
          v-model.trim="keyword"
          class="audit-search"
          clearable
          :prefix-icon="Search"
          placeholder="搜索姓名、账号、手机号、单位或部门"
        />
      </div>

      <div class="audit-summary">
        <div class="audit-summary__item audit-summary__item--total">
          <span>全部</span>
          <strong>{{ users.length }}</strong>
        </div>
        <div class="audit-summary__item audit-summary__item--pending">
          <span>未审核</span>
          <strong>{{ statusCounts.pending }}</strong>
        </div>
        <div class="audit-summary__item audit-summary__item--approved">
          <span>已审核</span>
          <strong>{{ statusCounts.approved }}</strong>
        </div>
        <div class="audit-summary__item audit-summary__item--rejected">
          <span>审核拒绝</span>
          <strong>{{ statusCounts.rejected }}</strong>
        </div>
      </div>

      <div v-if="loading" class="audit-skeleton" aria-busy="true" aria-label="用户加载中">
        <div v-for="i in 8" :key="`audit-loading-row-${i}`" class="audit-skeleton__row">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <el-empty
        v-else-if="filteredUsers.length === 0"
        description="暂无匹配用户"
        class="audit-empty"
      />

      <div v-else class="audit-table-shell">
        <el-table :data="filteredUsers" class="audit-table" row-key="id">
          <el-table-column label="姓名" min-width="130" fixed="left">
            <template #default="{ row }">
              <div class="audit-user-cell">
                <!-- <span class="audit-user-cell__avatar">{{ getInitial(row.name) }}</span> -->
                <strong>{{ row.name || '未填写姓名' }}</strong>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="idCard" label="账号" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.idCard || '-' }}</template>
          </el-table-column>
          <el-table-column prop="phone" label="手机号" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.phone || '-' }}</template>
          </el-table-column>
          <el-table-column prop="company" label="单位" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.company || '-' }}</template>
          </el-table-column>
          <el-table-column prop="department" label="部门" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">{{ row.department || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="116" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.shzt)" effect="light" round>
                {{ getStatusText(row.shzt) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="168" fixed="right" align="center">
            <template #default="{ row }">
              <div class="audit-table-actions">
                <template v-if="row.shzt !== '01'">
                  <el-button
                    class="audit-action-button audit-action-button--approve"
                    size="small"
                    type="primary"
                    :loading="isSubmitting(row.id, '01')"
                    :disabled="isUserSubmitting(row.id)"
                    @click="approveUser(row)"
                  >
                    审核
                  </el-button>
                  <el-button
                    v-if="row.shzt === '00'"
                    class="audit-action-button audit-action-button--reject"
                    size="small"
                    type="danger"
                    plain
                    :loading="isSubmitting(row.id, '02')"
                    :disabled="isUserSubmitting(row.id)"
                    @click="rejectUser(row)"
                  >
                    拒绝
                  </el-button>
                </template>
                <span v-else class="audit-action-empty">-</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElEmpty,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
import { ArrowLeft, Refresh, Search, UserFilled } from '@element-plus/icons-vue'
import { userAuditApi, type AuditStatus, type AuditUser } from '@/api/userAudit'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})
const router = useRouter()
const users = ref<AuditUser[]>([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<AuditStatus | 'all'>('all')
const submitting = ref<Record<string, '01' | '02' | undefined>>({})

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

const filteredUsers = computed(() => {
  return users.value.filter((user) => {
    const matchStatus = statusFilter.value === 'all' || user.shzt === statusFilter.value
    const haystack = [user.name, user.idCard, user.phone, user.company, user.department]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return matchStatus && (!normalizedKeyword.value || haystack.includes(normalizedKeyword.value))
  })
})

const statusCounts = computed(() => ({
  pending: users.value.filter((user) => user.shzt === '00').length,
  approved: users.value.filter((user) => user.shzt === '01').length,
  rejected: users.value.filter((user) => user.shzt === '02').length,
}))

const getSubmitKey = (id: string | number) => String(id)

const isSubmitting = (id: string | number, status: '01' | '02') =>
  submitting.value[getSubmitKey(id)] === status

const isUserSubmitting = (id: string | number) => !!submitting.value[getSubmitKey(id)]

const getInitial = (name?: string) => name?.trim()?.slice(0, 1) || '用'

const getStatusText = (status?: AuditStatus) => {
  if (status === '01') return '已审核'
  if (status === '02') return '审核拒绝'
  return '未审核'
}

const getStatusTagType = (status?: AuditStatus) => {
  if (status === '01') return 'success'
  if (status === '02') return 'danger'
  return 'warning'
}

const loadUsers = async () => {
  loading.value = true
  try {
    users.value = await userAuditApi.getAllUsers()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '用户列表加载失败')
  } finally {
    loading.value = false
  }
}

const updateUserStatus = async (user: AuditUser, status: '01' | '02') => {
  const key = getSubmitKey(user.id)
  submitting.value[key] = status

  try {
    await userAuditApi.updateStatus(user.id, status)
    user.shzt = status
    ElMessage.success(status === '01' ? '审核已通过' : '已拒绝该账号')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审核操作失败')
  } finally {
    submitting.value[key] = undefined
  }
}

const approveUser = async (user: AuditUser) => {
  await updateUserStatus(user, '01')
}

const rejectUser = async (user: AuditUser) => {
  try {
    await ElMessageBox.confirm(
      `确认拒绝账号「${user.name || user.idCard || user.id}」？`,
      '审核确认',
      {
        confirmButtonText: '拒绝',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    await updateUserStatus(user, '02')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '审核操作失败')
    }
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(loadUsers)
</script>

<style scoped>
.account-audit-page {
  height: 100vh;
  height: 100dvh;
  padding: 32px 40px 24px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  color: var(--app-text);
  background: var(--app-bg-gradient);
}

.account-audit-page--embedded {
  padding: 24px 28px 0;
  height: 100%;
  background: transparent;
}

.audit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 40px;
}

.audit-title-group {
  min-width: 0;
}

.audit-back-link {
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

.audit-back-link:hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  transform: translateX(-2px);
}

.audit-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.audit-title-icon {
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

.audit-header h1 {
  margin: 0;
  color: var(--app-text);
  font-size: 28px;
  font-weight: 780;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.audit-header__actions {
  display: flex;
  gap: 10px;
}

.audit-refresh-btn {
  min-width: 86px;
  border: 0;
  border-radius: 999px;
  color: var(--app-primary);
  background: var(--app-primary-soft);
  font-weight: 720;
  box-shadow: none;
}

.audit-refresh-btn:hover,
.audit-refresh-btn:focus {
  color: #ffffff;
  background: var(--app-primary);
  box-shadow: 0 10px 22px rgba(79, 124, 255, 0.2);
}

.audit-panel {
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.03),
    0 8px 24px rgba(24, 39, 75, 0.06);
}

.audit-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.audit-search {
  width: min(320px, 100%);
  flex: 0 1 320px;
}

.audit-status-filter {
  width: 150px;
  flex: 0 0 150px;
}

.audit-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
  margin: 20px 0 24px;
}

.audit-summary__item {
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

.audit-summary__item:hover {
  transform: translateY(-2px);
  border-color: var(--app-border-hover);
  box-shadow:
    0 4px 8px rgba(79, 124, 255, 0.06),
    0 8px 24px rgba(0, 0, 0, 0.08);
}

.audit-summary__item::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 16px;
  bottom: 16px;
  width: 4px;
  border-radius: 99px;
  background: var(--summary-color, var(--app-primary));
}

.audit-summary__item span,
.audit-summary__item strong {
  margin-left: 8px;
  display: block;
}

.audit-summary__item span {
  color: var(--app-text-muted);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.audit-summary__item strong {
  margin-top: 6px;
  color: var(--app-text);
  font-size: 36px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.audit-summary__item--pending {
  --summary-color: var(--tc-amber);
}

.audit-summary__item--approved {
  --summary-color: var(--app-success);
}

.audit-summary__item--rejected {
  --summary-color: var(--app-danger);
}

.audit-table-shell {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-panel);
}

.audit-table {
  --el-table-border-color: var(--app-border);
  --el-table-header-bg-color: var(--app-panel-muted);
  --el-table-header-text-color: var(--app-text-muted);
  --el-table-row-hover-bg-color: color-mix(in srgb, var(--app-primary-soft) 52%, transparent);
  width: 100%;
}

.audit-table :deep(.el-table__header th) {
  height: 44px;
  color: var(--app-text-muted);
  background: var(--app-panel-muted);
  font-size: 12px;
  font-weight: 760;
}

.audit-table :deep(.el-table__row) {
  height: 58px;
}

.audit-table :deep(.el-table__body tr:last-child td.el-table__cell) {
  border-bottom: 0;
}

.audit-user-cell {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.audit-user-cell__avatar {
  width: 32px;
  height: 32px;
  display: inline-grid;
  flex: 0 0 32px;
  place-items: center;
  border-radius: 10px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--app-primary), var(--app-success));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.28),
    0 6px 14px rgba(79, 124, 255, 0.18);
  font-size: 14px;
  font-weight: 800;
}

.audit-user-cell strong {
  overflow: hidden;
  color: var(--app-text);
  font-size: 14px;
  font-weight: 760;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.audit-table-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.audit-table-actions :deep(.audit-action-button.el-button) {
  min-width: 58px;
  margin-left: 0;
  border-radius: 999px;
  font-weight: 720;
}

.audit-table-actions :deep(.audit-action-button--approve.el-button) {
  color: #ffffff !important;
  border-color: var(--app-primary) !important;
  background: var(--app-primary) !important;
  box-shadow: 0 8px 16px rgba(79, 124, 255, 0.18);
}

.audit-table-actions :deep(.audit-action-button--approve.el-button:hover),
.audit-table-actions :deep(.audit-action-button--approve.el-button:focus) {
  color: #ffffff !important;
  border-color: var(--app-primary-strong) !important;
  background: var(--app-primary-strong) !important;
}

.audit-table-actions :deep(.audit-action-button--reject.el-button) {
  color: #ffffff !important;
  border-color: var(--app-danger) !important;
  background: var(--app-danger) !important;
}

.audit-table-actions :deep(.audit-action-button--reject.el-button:hover),
.audit-table-actions :deep(.audit-action-button--reject.el-button:focus) {
  color: #ffffff !important;
  border-color: var(--app-danger) !important;
  background: color-mix(in srgb, var(--app-danger) 86%, #000000) !important;
}

.audit-action-empty {
  color: var(--app-text-subtle);
}

/* 骨架屏 */
.audit-skeleton {
  display: grid;
}

.audit-skeleton__row {
  height: 56px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1.3fr 1.3fr 0.6fr;
  align-items: center;
  gap: 18px;
  padding: 0 18px;
  border-bottom: 1px solid var(--app-border);
}

.audit-skeleton__row span {
  height: 13px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--app-skeleton-line-bg);
  position: relative;
}

.audit-skeleton__row span::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--app-skeleton-shimmer), transparent);
  animation: audit-shimmer 1.15s infinite;
}

@keyframes audit-shimmer {
  100% {
    transform: translateX(100%);
  }
}

.audit-empty {
  padding: 36px 0;
}

@media (max-width: 768px) {
  .account-audit-page {
    padding: 20px 16px;
  }

  .account-audit-page--embedded {
    padding: 12px 14px 0;
  }

  .audit-header,
  .audit-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .audit-search {
    width: 100%;
    margin-left: 0;
    flex: none;
  }

  .audit-status-filter {
    width: 100%;
    flex: none;
  }

  .audit-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .audit-table-shell {
    overflow-x: auto;
  }
}

@media (max-width: 640px) {
  .audit-summary {
    grid-template-columns: 1fr;
  }

  .audit-panel {
    padding: 12px;
  }
}
</style>

<style>
/* ==================== 深色模式适配 ==================== */

:root[data-theme='dark'] .audit-panel {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.2);
}

:root[data-theme='dark'] .audit-table-shell {
  border-color: var(--app-border);
}

:root[data-theme='dark'] .audit-skeleton__row span {
  background: var(--app-skeleton-line-bg);
}

:root[data-theme='dark'] .account-audit-page .el-empty__description p {
  color: var(--app-text-muted);
}
</style>
