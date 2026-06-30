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
        <el-select v-model="statusFilter" class="audit-status-filter" placeholder="审核状态" @change="applyFilters">
          <el-option label="全部状态" value="all" />
          <el-option label="未审核" value="00" />
          <el-option label="已审核" value="01" />
          <el-option label="审核拒绝" value="02" />
        </el-select>
        <el-select v-model="roleFilter" class="audit-role-filter" placeholder="角色筛选" clearable @change="applyFilters">
          <el-option label="超级管理员" value="超级管理员" />
          <el-option label="部门管理员" value="部门管理员" />
          <el-option label="普通用户" value="普通用户" />
          <el-option label="安全审计员" value="安全审计员" />
        </el-select>
        <el-select v-model="deptFilter" class="audit-dept-filter" placeholder="部门筛选" clearable filterable @change="applyFilters">
          <el-option v-for="d in deptList" :key="d.id" :label="d.dept_name" :value="d.dept_name" />
        </el-select>
        <el-input
          v-model.trim="keyword"
          class="audit-search"
          clearable
          :prefix-icon="Search"
          placeholder="搜索姓名、账号、手机号"
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
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>

      <el-empty
        v-else-if="filteredUsers.length === 0"
        description="暂无匹配用户"
        class="audit-empty"
      />

      <div v-else class="audit-table-shell">
        <el-table :data="filteredUsers" class="audit-table" row-key="id">
          <el-table-column label="姓名" min-width="110" fixed="left">
            <template #default="{ row }">
              <div class="audit-user-cell">
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
          <el-table-column label="角色" min-width="120">
            <template #default="{ row }">
              <el-tag v-if="row.role" :type="roleTagType(row.role)" size="small">{{ row.role }}</el-tag>
              <span v-else style="color:var(--app-text-muted)">未分配</span>
            </template>
          </el-table-column>
          <el-table-column prop="company" label="单位" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.company || '-' }}</template>
          </el-table-column>
          <el-table-column prop="department" label="部门" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.department || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="116" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.shzt)" effect="light" round>
                {{ getStatusText(row.shzt) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right" align="center">
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
                <template v-else>
                  <el-button
                    class="audit-action-button audit-action-button--manage"
                    size="small"
                    @click="openManageDialog(row)"
                  >
                    管理
                  </el-button>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </main>

    <!-- 审核通过后管理对话框 -->
    <el-dialog v-model="manageDialogVisible" title="用户管理" width="500px" :close-on-click-modal="false" destroy-on-close class="ds-modal">
      <div v-if="manageTarget" class="manage-dialog">
        <div class="manage-dialog__user">
          <strong>{{ manageTarget.name }}</strong>
          <span>{{ manageTarget.idCard }}</span>
        </div>
        <el-divider />
        <el-form label-position="top">
          <el-form-item label="授权角色">
            <el-select v-model="manageRoleId" placeholder="选择角色" style="width:100%">
              <el-option label="超级管理员" :value="1" />
              <el-option label="部门管理员" :value="2" />
              <el-option label="普通用户" :value="3" />
              <el-option label="安全审计员" :value="4" />
            </el-select>
          </el-form-item>
          <el-form-item label="调岗（更换部门）">
            <el-select v-model="manageDeptId" placeholder="选择新部门（可选）" clearable filterable style="width:100%">
              <el-option v-for="d in deptList" :key="d.id" :label="d.dept_name" :value="d.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="manageDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="managing" @click="confirmManage">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Refresh,
  Search,
  UserFilled,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userAuditApi, type AuditStatus, type AuditUser } from '@/api/userAudit'
import { roleApi } from '@/api/role'
import { departmentApi, type Department } from '@/api/department'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})
const router = useRouter()
const users = ref<AuditUser[]>([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<AuditStatus | 'all'>('all')
const roleFilter = ref('')
const deptFilter = ref('')
const deptList = ref<Department[]>([])
const submitting = ref<Record<string, '01' | '02' | undefined>>({})

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

const filteredUsers = computed(() => {
  return users.value.filter((user) => {
    const matchStatus = statusFilter.value === 'all' || user.shzt === statusFilter.value
    const matchRole = !roleFilter.value || user.role === roleFilter.value
    const matchDept = !deptFilter.value || user.department === deptFilter.value
    const haystack = [user.name, user.idCard, user.phone, user.company, user.department]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchKeyword = !normalizedKeyword.value || haystack.includes(normalizedKeyword.value)
    return matchStatus && matchRole && matchDept && matchKeyword
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

function roleTagType(role: string) {
  if (role === '超级管理员') return 'danger'
  if (role === '部门管理员') return 'warning'
  if (role === '安全审计员') return 'info'
  return ''
}

const applyFilters = () => {
  // trigger reactive update - filteredUsers is computed
}

async function loadDeptList() {
  try {
    deptList.value = await departmentApi.list()
  } catch {
    deptList.value = []
  }
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
    // 审核通过后弹出管理对话框
    if (status === '01') {
      openManageDialog(user)
    }
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
      { confirmButtonText: '拒绝', cancelButtonText: '取消', type: 'warning' },
    )
    await updateUserStatus(user, '02')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '审核操作失败')
    }
  }
}

// ========== 角色授权 & 调岗 ==========
const manageDialogVisible = ref(false)
const manageTarget = ref<AuditUser | null>(null)
const manageRoleId = ref<number | null>(null)
const manageDeptId = ref<number | null>(null)
const managing = ref(false)

function openManageDialog(user: AuditUser) {
  manageTarget.value = user
  manageRoleId.value = null
  manageDeptId.value = null
  manageDialogVisible.value = true
}

async function confirmManage() {
  if (!manageTarget.value) return
  managing.value = true
  try {
    const userId = Number(manageTarget.value.id)
    if (manageRoleId.value) {
      await roleApi.assign(userId, manageRoleId.value, manageDeptId.value || undefined)
      ElMessage.success('角色授权成功')
    }
    if (manageDeptId.value && !manageRoleId.value) {
      await userAuditApi.changeDept(userId, manageDeptId.value)
      ElMessage.success('调岗成功')
    }
    manageDialogVisible.value = false
    await loadUsers()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    managing.value = false
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  loadDeptList()
  loadUsers()
})
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

.audit-title-group { min-width: 0; }

.audit-back-link {
  width: 40px; height: 40px;
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

.audit-title-row { display: flex; align-items: center; gap: 14px; }

.audit-title-icon {
  width: 52px; height: 52px;
  display: grid; flex: 0 0 52px;
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

.audit-header__actions { display: flex; gap: 10px; }

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
  box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(24,39,75,0.06);
}

.audit-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.audit-search { width: min(280px, 100%); flex: 0 1 280px; }
.audit-status-filter { width: 130px; flex: 0 0 130px; }
.audit-role-filter { width: 140px; flex: 0 0 140px; }
.audit-dept-filter { width: 160px; flex: 0 0 160px; }

/* 工具栏输入控件统一样式 */
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
  box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.04);
}

.audit-summary__item:hover {
  transform: translateY(-2px);
  border-color: var(--app-border-hover);
  box-shadow: 0 4px 8px rgba(79,124,255,0.06), 0 8px 24px rgba(0,0,0,0.08);
}

.audit-summary__item::before {
  content: '';
  position: absolute;
  left: 8px; top: 16px; bottom: 16px;
  width: 4px;
  border-radius: 99px;
  background: var(--summary-color, var(--app-primary));
}

.audit-summary__item span, .audit-summary__item strong { margin-left: 8px; display: block; }
.audit-summary__item span { color: var(--app-text-muted); font-size: 13px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; }
.audit-summary__item strong { margin-top: 6px; color: var(--app-text); font-size: 36px; line-height: 1.1; font-weight: 800; letter-spacing: -0.02em; }
.audit-summary__item--pending { --summary-color: var(--tc-amber); }
.audit-summary__item--approved { --summary-color: var(--app-success); }
.audit-summary__item--rejected { --summary-color: var(--app-danger); }

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

.audit-user-cell {
  display: inline-flex; align-items: center; min-width: 0; gap: 10px;
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
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
.audit-table-actions :deep(.audit-action-button.el-button) {
  min-width: 58px; margin-left: 0; border-radius: 999px; font-weight: 720;
}
.audit-table-actions :deep(.audit-action-button--approve.el-button) {
  color: #ffffff !important;
  border-color: var(--app-primary) !important;
  background: var(--app-primary) !important;
  box-shadow: 0 8px 16px rgba(79,124,255,0.18);
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
.audit-table-actions :deep(.audit-action-button--manage.el-button) {
  color: var(--app-primary) !important;
  border-color: var(--app-primary) !important;
  background: var(--app-primary-soft) !important;
}

/* Skeleton */
.audit-skeleton { display: grid; }
.audit-skeleton__row {
  height: 56px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1.3fr 1.3fr 0.8fr;
  align-items: center;
  gap: 18px;
  padding: 0 18px;
  border-bottom: 1px solid var(--app-border);
}
.audit-skeleton__row span {
  height: 13px; overflow: hidden; border-radius: 999px;
  background: var(--app-skeleton-line-bg); position: relative;
}
.audit-skeleton__row span::after {
  content: '';
  position: absolute; inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--app-skeleton-shimmer), transparent);
  animation: audit-shimmer 1.15s infinite;
}
@keyframes audit-shimmer { 100% { transform: translateX(100%); } }

.audit-empty { padding: 36px 0; }

/* Manage dialog */
.manage-dialog__user { display: flex; flex-direction: column; gap: 2px; }
.manage-dialog__user strong { font-size: 16px; color: var(--app-text); }
.manage-dialog__user span { font-size: 13px; color: var(--app-text-muted); }

@media (max-width: 768px) {
  .account-audit-page { padding: 20px 16px; }
  .account-audit-page--embedded { padding: 12px 14px 0; }
  .audit-header, .audit-toolbar { align-items: stretch; flex-direction: column; }
  .audit-search, .audit-status-filter, .audit-role-filter, .audit-dept-filter { width: 100%; flex: none; }
  .audit-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .audit-table-shell { overflow-x: auto; }
}

@media (max-width: 640px) {
  .audit-summary { grid-template-columns: 1fr; }
  .audit-panel { padding: 12px; }
}
</style>
