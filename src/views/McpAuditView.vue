<template>
  <div class="mcp-audit-page" :class="{ 'mcp-audit-page--embedded': embedded }">
    <div class="ds-page-container">
    <header class="mcp-audit-header">
      <div class="mcp-audit-title-row">
        <span class="mcp-audit-title-icon"><el-icon :size="22"><Connection /></el-icon></span>
        <div>
          <h1>MCP 服务审核</h1>
          <p class="mcp-audit-role-badge">
            <el-tag :type="isSuperAdmin ? 'danger' : 'warning'" size="small" effect="dark">
              {{ isSuperAdmin ? '超级管理员' : '部门管理员' }}
            </el-tag>
            <span class="mcp-audit-role-hint">
              {{ isSuperAdmin ? '二级终审 · 上架/下架管理' : '一级初审 · 部门审核' }}
            </span>
          </p>
        </div>
      </div>
    </header>

    <main class="mcp-audit-panel">
      <!-- 汇总卡片 -->
      <div class="mcp-audit-summary">
        <div class="mcp-audit-summary__item mcp-audit-summary__item--total">
          <span>总计</span><strong>{{ totalCount }}</strong>
        </div>
        <div class="mcp-audit-summary__item mcp-audit-summary__item--pending">
          <span>待我审核</span><strong>{{ myPendingCount }}</strong>
        </div>
        <div class="mcp-audit-summary__item mcp-audit-summary__item--active">
          <span>已上架</span><strong>{{ publicCount }}</strong>
        </div>
      </div>

      <div class="mcp-audit-toolbar">
        <div class="mcp-audit-filter-group">
          <button v-for="f in statusFilters" :key="f.key" class="mcp-audit-chip"
            :class="{ 'mcp-audit-chip--active': currentStatus === f.key }"
            @click="setStatus(f.key)">{{ f.label }}</button>
        </div>
        <el-input v-model="searchQuery" placeholder="搜索 MCP 服务名称" clearable style="width:260px;margin-left:auto"
          :prefix-icon="Search" @clear="currentStatus = 'all'" />
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="table-skeleton" aria-busy="true" aria-label="加载中">
        <div v-for="n in 8" :key="n" class="table-skeleton__row">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>

      <el-table v-else :data="filteredList" stripe class="mcp-audit-table" row-key="id">
        <el-table-column prop="service_name" label="服务名称" min-width="160" />
        <el-table-column prop="service_code" label="服务编码" width="150" />
        <el-table-column prop="service_type" label="分类" width="100">
          <template #default="{ row }">
            <span>{{ categoryLabel(row.service_type) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="creator_name" label="创建者" width="100" />
        <el-table-column prop="dept_name" label="部门" width="110" />
        <el-table-column label="部门审核" width="90">
          <template #default="{ row }">
            <el-tag :type="auditTagType(row.dept_audit_status)" size="small">{{ auditStatusLabel(row.dept_audit_status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="超管审核" width="90">
          <template #default="{ row }">
            <el-tag :type="auditTagType(row.super_audit_status)" size="small">{{ auditStatusLabel(row.super_audit_status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上架状态" width="100">
          <template #default="{ row }">
            <template v-if="getStatus(row) !== '00'">
              <el-tag :type="AuditStatusClass[getStatus(row)] === 'ds-tag-pending' ? 'warning' : AuditStatusClass[getStatus(row)] === 'ds-tag-rejected' ? 'danger' : 'success'" size="small">{{ AuditStatusLabel[getStatus(row)] || '—' }}</el-tag>
            </template>
            <span v-else style="color:var(--ds-text-subtle);font-size:12px;">—</span>
          </template>
        </el-table-column>
        <el-table-column label="删除审核" width="100" v-if="hasDeleteAuditItems">
          <template #default="{ row }">
            <template v-if="row.dept_delete_audit_status">
              <span class="mcp-audit-delete-status">
                部门：<el-tag :type="auditTagType(row.dept_delete_audit_status)" size="small">{{ auditStatusLabel(row.dept_delete_audit_status!) }}</el-tag>
              </span>
              <span v-if="row.super_delete_audit_status" class="mcp-audit-delete-status">
                超管：<el-tag :type="auditTagType(row.super_delete_audit_status)" size="small">{{ auditStatusLabel(row.super_delete_audit_status!) }}</el-tag>
              </span>
            </template>
            <span v-else style="color:var(--app-text-muted);font-size:12px;">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="mcp-audit-actions">
              <!-- ===== 部门管理员操作 ===== -->
              <template v-if="isDeptAdmin">
                <!-- 部门审核（上架申请） -->
                <template v-if="row.dept_audit_status === '00'">
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--approve" size="small" text @click="handleDeptAudit(row, '02')">通过</el-button>
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--reject" size="small" text @click="handleDeptAudit(row, '03')">拒绝</el-button>
                </template>
                <!-- 部门审核删除 -->
                <template v-if="row.dept_delete_audit_status === '00'">
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--approve" size="small" text @click="handleDeptAuditDelete(row, '02')">通过删除</el-button>
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--reject" size="small" text @click="handleDeptAuditDelete(row, '03')">拒绝删除</el-button>
                </template>
                <!-- 部门审核下架 -->
                <template v-if="row.dept_audit_status === '04'">
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--approve" size="small" text @click="handleDeptAuditRemove(row, '05')">通过下架</el-button>
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--reject" size="small" text @click="handleDeptAuditRemove(row, '06')">拒绝下架</el-button>
                </template>
                <!-- 已上架 → 部门管理员可申请下架 -->
                <template v-if="row.is_public && !row.dept_delete_audit_status">
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--remove" size="small" text @click="handleApplyRemove(row)">申请下架</el-button>
                </template>
              </template>

              <!-- ===== 超级管理员操作 ===== -->
              <template v-if="isSuperAdmin">
                <!-- 超管审核（上架申请：部门已通过、超管待审） -->
                <template v-if="row.dept_audit_status === '02' && row.super_audit_status === '00'">
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--approve" size="small" text @click="handleSuperAudit(row, '02')">通过</el-button>
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--reject" size="small" text @click="handleSuperAudit(row, '03')">拒绝</el-button>
                </template>
                <!-- 上架/下架 -->
                <template v-if="row.dept_audit_status === '02' && row.super_audit_status === '02'">
                  <el-button v-if="!row.is_public" class="mcp-audit-action-btn mcp-audit-action-btn--approve" size="small" text @click="handleSetPublic(row, true)">上架</el-button>
                  <el-button v-else class="mcp-audit-action-btn mcp-audit-action-btn--remove" size="small" text @click="handleSetPublic(row, false)">下架</el-button>
                </template>
                <!-- 超管审核删除（部门已通过删除） -->
                <template v-if="row.dept_delete_audit_status === '02' && row.super_delete_audit_status === '00'">
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--approve" size="small" text @click="handleSuperAuditDelete(row, '02')">通过删除</el-button>
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--reject" size="small" text @click="handleSuperAuditDelete(row, '03')">拒绝删除</el-button>
                </template>
                <!-- 超管审核下架（部门管理员已审核通过下架） -->
                <template v-if="row.dept_audit_status === '05' && row.super_delete_audit_status === '00'">
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--approve" size="small" text @click="handleSuperAuditRemove(row, '05')">通过下架</el-button>
                  <el-button class="mcp-audit-action-btn mcp-audit-action-btn--reject" size="small" text @click="handleSuperAuditRemove(row, '06')">拒绝下架</el-button>
                </template>
              </template>

              <!-- 无操作提示 -->
              <span v-if="!hasActionFor(row)" class="mcp-audit-no-action">—</span>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div v-if="!loading && totalPages > 1" style="display:flex;justify-content:center;margin-top:20px;padding-top:16px;border-top:1px solid var(--app-border);">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalCount"
          layout="total, prev, pager, next"
          background
          small
          @current-change="loadList"
        />
      </div>
    </main>

    <!-- ===== 审核弹窗 ===== -->
    <el-dialog v-model="auditDialogVisible" :title="auditDialogTitle" width="460px" :close-on-click-modal="false" destroy-on-close class="ds-modal">
      <div v-if="auditTarget" class="audit-confirm">
        <div class="audit-confirm__info">
          <span>服务：</span><strong>{{ auditTarget.service_name }}</strong>
        </div>
        <div class="audit-confirm__info">
          <span>操作：</span>
          <el-tag :type="auditActionTagType" size="small">{{ auditActionLabel }}</el-tag>
        </div>
        <el-form label-position="top" style="margin-top:12px">
          <el-form-item label="审核备注">
            <el-input v-model="auditRemark" type="textarea" :rows="3" placeholder="请输入审核备注（可选）" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="auditing" @click="confirmAudit">确认</el-button>
      </template>
    </el-dialog>

    <!-- ===== 申请下架弹窗 ===== -->
    <el-dialog v-model="removeDialogVisible" title="申请下架" width="460px" :close-on-click-modal="false" destroy-on-close class="ds-modal">
      <div v-if="removeTarget" class="audit-confirm">
        <div class="audit-confirm__info">
          <span>服务：</span><strong>{{ removeTarget.service_name }}</strong>
        </div>
      </div>
      <template #footer>
        <el-button @click="removeDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="removing" @click="confirmApplyRemove">确认申请下架</el-button>
      </template>
    </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Search } from '@element-plus/icons-vue'
import {
  listEnhancedMcp,
  deptAuditMcp,
  superAuditMcp,
  deptAuditDeleteMcp,
  deptAuditRemoveMcp,
  superAuditDeleteMcp,
  applyRemoveMcp,
  superAuditRemoveMcp,
  setMcpPublic,
  type McpServiceItem,
} from '@/api/mcpService'
import { isAdminAccount, isDepartmentAdmin } from '@/utils/auth'
import { getStatus, AuditStatusLabel, AuditStatusClass } from '@/utils/auditStatus'

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

// ============ 角色判断 ============
const isSuperAdmin = computed(() => isAdminAccount())
const isDeptAdmin = computed(() => isDepartmentAdmin() && !isAdminAccount())

// ============ 数据 ============
const loading = ref(false)
const mcpList = ref<McpServiceItem[]>([])
const currentStatus = ref('all')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(50)
const totalCount = ref(0)
const totalPages = ref(1)

const statusFilters = [
  { key: 'all', label: '全部' },
  { key: 'pending_dept', label: '待部门审核' },
  { key: 'pending_super', label: '待超管审核' },
  { key: 'public', label: '已上架' },
  { key: 'offline', label: '已下架' },
  { key: 'delete_pending', label: '删除待审' },
]

// ============ 分类映射 ============
const categoryMap: Record<string, string> = {
  QUERY: '数据查询', ANALYSIS: '分析服务', EXTERNAL: '外部系统', KNOWLEDGE: '知识检索',
}
const categoryLabel = (cat?: string) => categoryMap[cat || ''] || cat || '其他'

// ============ 汇总统计 ============
const myPendingCount = computed(() => {
  if (isSuperAdmin.value) {
    return mcpList.value.filter(m =>
      (m.dept_audit_status === '02' && m.super_audit_status === '00') ||
      (m.dept_delete_audit_status === '02' && m.super_delete_audit_status === '00')
    ).length
  }
  if (isDeptAdmin.value) {
    return mcpList.value.filter(m =>
      m.dept_audit_status === '00' ||
      m.dept_delete_audit_status === '00'
    ).length
  }
  return 0
})
const publicCount = computed(() => mcpList.value.filter(m => m.is_public).length)
const hasDeleteAuditItems = computed(() =>
  mcpList.value.some(m => m.dept_delete_audit_status || m.super_delete_audit_status)
)

// ============ 筛选 ============
const filteredList = computed(() => {
  let list = mcpList.value
  switch (currentStatus.value) {
    case 'pending_dept':
      list = list.filter(m => m.dept_audit_status === '00')
      break
    case 'pending_super':
      list = list.filter(m => m.dept_audit_status === '02' && m.super_audit_status === '00')
      break
    case 'public':
      list = list.filter(m => m.is_public)
      break
    case 'offline':
      list = list.filter(m => m.dept_audit_status === '02' && m.super_audit_status === '02' && !m.is_public)
      break
    case 'delete_pending':
      list = list.filter(m => m.dept_delete_audit_status === '00' || m.super_delete_audit_status === '00')
      break
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(m => m.service_name.toLowerCase().includes(q) || m.service_code.toLowerCase().includes(q))
  }
  return list
})

// ============ 工具函数 ============
function auditStatusLabel(s: string | undefined) {
  const map: Record<string, string> = { '00': '待审核', '02': '已通过', '03': '已拒绝' }
  return map[s || ''] || s || '—'
}

function auditTagType(s: string | undefined) {
  const map: Record<string, string> = { '00': 'warning', '02': 'success', '03': 'danger' }
  return map[s || ''] || 'info'
}

function setStatus(key: string) { currentStatus.value = key }

function hasActionFor(row: McpServiceItem): boolean {
  if (isDeptAdmin.value) {
    if (row.dept_audit_status === '00') return true
    if (row.dept_delete_audit_status === '00') return true
    if (row.dept_audit_status === '04') return true
    if (row.is_public && !row.dept_delete_audit_status) return true
  }
  if (isSuperAdmin.value) {
    if (row.dept_audit_status === '02' && row.super_audit_status === '00') return true
    if (row.dept_audit_status === '02' && row.super_audit_status === '02') return true
    if (row.dept_delete_audit_status === '02' && row.super_delete_audit_status === '00') return true
    if (row.dept_audit_status === '05' && row.super_delete_audit_status === '00') return true
  }
  return false
}

// ============ 审核操作 ============
const auditDialogVisible = ref(false)
const auditTarget = ref<McpServiceItem | null>(null)
const auditActionType = ref<'dept' | 'super' | 'setPublic' | 'deptDelete' | 'superDelete' | 'deptRemove' | 'superRemove'>('dept')
const auditActionValue = ref('')
const auditRemark = ref('')
const auditing = ref(false)

const auditDialogTitle = computed(() => {
  if (auditActionType.value === 'deptDelete') return '部门审核删除'
  if (auditActionType.value === 'deptRemove') return '部门审核下架'
  if (auditActionType.value === 'superDelete') return '超管审核删除'
  if (auditActionType.value === 'superRemove') return '超管审核下架'
  return '审核确认'
})

const auditActionLabel = computed(() => {
  const isApprove = auditActionValue.value === '02' || auditActionValue.value === '05' || auditActionValue.value === 'true'
  if (auditActionType.value === 'dept') return isApprove ? '部门审核通过' : '部门审核拒绝'
  if (auditActionType.value === 'super') return isApprove ? '超管审核通过' : '超管审核拒绝'
  if (auditActionType.value === 'setPublic') return auditActionValue.value === 'true' ? '上架' : '下架'
  if (auditActionType.value === 'deptDelete') return isApprove ? '通过删除' : '拒绝删除'
  if (auditActionType.value === 'deptRemove') return isApprove ? '通过下架' : '拒绝下架'
  if (auditActionType.value === 'superDelete') return isApprove ? '通过删除' : '拒绝删除'
  if (auditActionType.value === 'superRemove') return isApprove ? '通过下架' : '拒绝下架'
  return ''
})

const auditActionTagType = computed(() => {
  if (auditActionType.value === 'setPublic') return auditActionValue.value === 'true' ? 'success' : 'warning'
  // 02-上架通过 05-下架通过
  return auditActionValue.value === '02' || auditActionValue.value === '05' || auditActionValue.value === 'true' ? 'success' : 'danger'
})

function handleDeptAudit(row: McpServiceItem, status: '02' | '03') {
  auditTarget.value = row; auditActionType.value = 'dept'; auditActionValue.value = status; auditRemark.value = ''; auditDialogVisible.value = true
}
function handleSuperAudit(row: McpServiceItem, status: '02' | '03') {
  auditTarget.value = row; auditActionType.value = 'super'; auditActionValue.value = status; auditRemark.value = ''; auditDialogVisible.value = true
}
function handleSetPublic(row: McpServiceItem, isPublic: boolean) {
  auditTarget.value = row; auditActionType.value = 'setPublic'; auditActionValue.value = String(isPublic); auditRemark.value = ''; auditDialogVisible.value = true
}
function handleDeptAuditDelete(row: McpServiceItem, status: '02' | '03') {
  auditTarget.value = row; auditActionType.value = 'deptDelete'; auditActionValue.value = status; auditRemark.value = ''; auditDialogVisible.value = true
}
function handleDeptAuditRemove(row: McpServiceItem, status: '05' | '06') {
  auditTarget.value = row; auditActionType.value = 'deptRemove'; auditActionValue.value = status; auditRemark.value = ''; auditDialogVisible.value = true
}
function handleSuperAuditDelete(row: McpServiceItem, status: '02' | '03') {
  auditTarget.value = row; auditActionType.value = 'superDelete'; auditActionValue.value = status; auditRemark.value = ''; auditDialogVisible.value = true
}
function handleSuperAuditRemove(row: McpServiceItem, status: '05' | '06') {
  auditTarget.value = row; auditActionType.value = 'superRemove'; auditActionValue.value = status; auditRemark.value = ''; auditDialogVisible.value = true
}

async function confirmAudit() {
  if (!auditTarget.value) return
  auditing.value = true
  try {
    const id = auditTarget.value.id
    const status = auditActionValue.value as string
    switch (auditActionType.value) {
      case 'dept':
        await deptAuditMcp(id, status as '02' | '03', auditRemark.value || undefined)
        break
      case 'super':
        await superAuditMcp(id, status as '02' | '03', auditRemark.value || undefined)
        break
      case 'setPublic':
        await setMcpPublic(id, auditActionValue.value === 'true')
        break
      case 'deptDelete':
        await deptAuditDeleteMcp(id, status as '02' | '03', auditRemark.value || undefined)
        break
      case 'deptRemove':
        await deptAuditRemoveMcp(id, status as '05' | '06', auditRemark.value || undefined)
        break
      case 'superDelete':
        await superAuditDeleteMcp(id, status as '02' | '03', auditRemark.value || undefined)
        break
      case 'superRemove':
        await superAuditRemoveMcp(id, status as '05' | '06', auditRemark.value || undefined)
        break
    }
    ElMessage.success('操作成功')
    auditDialogVisible.value = false
    await loadList()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    auditing.value = false
  }
}

// ============ 申请下架 ============
const removeDialogVisible = ref(false)
const removeTarget = ref<McpServiceItem | null>(null)
const removing = ref(false)

function handleApplyRemove(row: McpServiceItem) {
  removeTarget.value = row; removeDialogVisible.value = true
}

async function confirmApplyRemove() {
  if (!removeTarget.value) return
  removing.value = true
  try {
    await applyRemoveMcp(removeTarget.value.id)
    ElMessage.success('下架申请已提交，等待超级管理员审核')
    removeDialogVisible.value = false
    await loadList()
  } catch (e: any) {
    ElMessage.error(e.message || '申请失败')
  } finally {
    removing.value = false
  }
}

// ============ 数据加载 ============
async function loadList() {
  loading.value = true
  try {
    const response = await listEnhancedMcp({
      page: currentPage.value,
      page_size: pageSize.value,
    })
    mcpList.value = (response.items || []).map(item => ({
      ...item,
      dept_delete_audit_status: item.dept_delete_audit_status || undefined,
      super_delete_audit_status: item.super_delete_audit_status || undefined,
    }))
    totalCount.value = response.total || mcpList.value.length
    totalPages.value = response.total_pages || 1
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
    mcpList.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => loadList())
</script>

<style scoped>
.mcp-audit-page { display: flex; flex-direction: column; height: 100%; padding: 0; background: var(--app-bg); color: var(--app-text); }
.mcp-audit-page > .ds-page-container { display: flex; flex-direction: column; height: 100%; }
.mcp-audit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 36px; flex-shrink: 0; }
.mcp-audit-title-row { display: flex; align-items: center; gap: 14px; }
.mcp-audit-title-icon {
  width: 52px; height: 52px;
  display: grid; place-items: center;
  flex: 0 0 52px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
  font-size: 24px;
  box-shadow: 0 8px 24px rgba(79, 124, 255, 0.22);
}
.mcp-audit-title-row h1 { margin: 0; font-size: 28px; font-weight: 780; letter-spacing: -0.02em; color: var(--app-text); line-height: 1.25; }

.mcp-audit-role-badge { margin: 4px 0 0; display: flex; align-items: center; gap: 8px; }
.mcp-audit-role-hint { font-size: 12px; color: var(--app-text-muted); }

/* 汇总卡片 */
.mcp-audit-summary { display: flex; gap: 12px; margin-bottom: 20px; }
.mcp-audit-summary__item { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 14px 18px; border-radius: 10px; background: var(--app-panel); border: 1px solid var(--app-border); }
.mcp-audit-summary__item span { font-size: 12px; color: var(--app-text-muted); }
.mcp-audit-summary__item strong { font-size: 22px; font-weight: 700; }
.mcp-audit-summary__item--total strong { color: var(--app-primary, #409eff); }
.mcp-audit-summary__item--pending strong { color: #e6a23c; }
.mcp-audit-summary__item--active strong { color: #67c23a; }

/* 主面板 */
.mcp-audit-panel {
  flex: 1;
  min-height: 0;
  margin: 0 0 24px;
  overflow: hidden auto;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03), 0 8px 24px rgba(24, 39, 75, 0.06);
}

.mcp-audit-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

.mcp-audit-toolbar :deep(.el-input__wrapper) {
  border-radius: 10px; height: 40px; box-shadow: none;
  background: var(--app-panel-muted); border: 1.5px solid var(--app-border);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.mcp-audit-toolbar :deep(.el-input__wrapper:hover) { border-color: var(--app-border-hover); }
.mcp-audit-toolbar :deep(.el-input__wrapper.is-focus) {
  border-color: var(--app-primary); box-shadow: 0 0 0 3px var(--app-primary-softer);
}
.mcp-audit-toolbar :deep(.el-input__inner) { font-size: 13px; color: var(--app-text); }
.mcp-audit-toolbar :deep(.el-input__inner::placeholder) { color: var(--app-text-subtle); }

.mcp-audit-filter-group { display: inline-flex; gap: 4px; background: var(--app-panel-muted); padding: 3px; border-radius: 10px; flex-wrap: wrap; }
.mcp-audit-chip { padding: 6px 14px; border: none; border-radius: 8px; background: transparent; color: var(--app-text-muted); font-size: 13px; cursor: pointer; transition: all 0.2s; font-family: inherit; min-height: 32px; white-space: nowrap; }
.mcp-audit-chip:hover { color: var(--app-text); }
.mcp-audit-chip--active { background: var(--app-panel); color: var(--app-primary); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

.mcp-audit-table { width: 100%; }
.mcp-audit-delete-status { display: block; font-size: 11px; line-height: 1.8; white-space: nowrap; }

/* 操作按钮组 */
.mcp-audit-actions { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.mcp-audit-no-action { color: var(--app-text-muted); font-size: 12px; }

.mcp-audit-action-btn {
  min-width: auto !important; height: 30px; padding: 0 10px;
  font-size: 12px; font-weight: 600; border-radius: 6px; transition: all 0.2s ease;
}
.mcp-audit-action-btn--approve { color: var(--app-success) !important; }
.mcp-audit-action-btn--approve:hover { background: var(--tc-green-bg) !important; color: #059669 !important; }
.mcp-audit-action-btn--reject { color: var(--app-danger) !important; }
.mcp-audit-action-btn--reject:hover { background: var(--app-danger-soft) !important; color: #dc2626 !important; }
.mcp-audit-action-btn--remove { color: var(--tc-amber) !important; }
.mcp-audit-action-btn--remove:hover { background: var(--tc-amber-bg) !important; color: #b45309 !important; }

.audit-confirm { display: flex; flex-direction: column; gap: 8px; }
.audit-confirm__info { font-size: 14px; color: var(--app-text); }
.audit-confirm__info span { color: var(--app-text-muted); }

/* Skeleton */
.table-skeleton { display: grid; }
.table-skeleton__row {
  height: 56px;
  display: grid;
  grid-template-columns: 1fr 0.9fr 0.6fr 1.2fr 0.7fr 0.7fr 0.6fr 0.6fr 0.6fr 1.2fr;
  align-items: center;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid var(--app-border);
}
.table-skeleton__row span {
  height: 13px; border-radius: 999px; background: var(--app-border);
  animation: mcp-audit-skeleton-pulse 1.5s ease-in-out infinite;
}
@keyframes mcp-audit-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 768px) {
  .mcp-audit-header { flex-direction: column; align-items: stretch; }
  .mcp-audit-title-row h1 { font-size: 20px; }
  .mcp-audit-title-icon { width: 44px; height: 44px; font-size: 20px; }
  .mcp-audit-summary { flex-wrap: wrap; }
  .mcp-audit-summary__item { flex: 1 1 40%; }
}
</style>
