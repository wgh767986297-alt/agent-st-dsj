<template>
  <div class="role-page" :class="{ 'role-page--embedded': embedded }">
    <header class="role-header">
      <div class="role-title-row">
        <span class="role-title-icon"><el-icon :size="22"><Avatar /></el-icon></span>
        <div><h1>角色管理</h1></div>
      </div>
    </header>

    <main class="role-panel">
      <div class="role-toolbar">
        <span class="role-label">选择用户：</span>
        <el-select v-model="selectedUserId" placeholder="请选择用户" filterable clearable style="width:280px"
          @change="onUserChange">
          <el-option v-for="u in userList" :key="u.id" :label="`${u.name} (${u.idCard || u.phone || ''})`" :value="u.id" />
        </el-select>
        <el-button type="primary" :disabled="!selectedUserId" @click="openAssign">
          <el-icon><Plus /></el-icon> 分配角色
        </el-button>
      </div>

      <!-- 加载骨架 -->
      <div v-if="roleLoading && selectedUserId" class="table-skeleton" aria-busy="true" aria-label="加载中">
        <div v-for="n in 5" :key="n" class="table-skeleton__row">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>

      <el-table v-else-if="selectedUserId" :data="userRoles" stripe class="role-table">
        <el-table-column prop="role_name" label="角色名称" width="160" />
        <el-table-column prop="role_code" label="角色编码" width="160" />
        <el-table-column prop="role_type" label="角色类型" width="140" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button class="role-remove-btn" size="small" text @click="confirmRemove(row)">
              <el-icon :size="14"><CircleClose /></el-icon>
              <span>取消角色</span>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-else-if="!selectedUserId" class="role-empty"><p>请先选择用户以查看其角色</p></div>
    </main>

    <el-dialog v-model="dialogVisible" title="分配角色" width="440px" :close-on-click-modal="false" destroy-on-close class="ds-modal">
      <el-form label-position="top">
        <el-form-item label="角色">
          <el-select v-model="assignRoleId" placeholder="选择角色" style="width:100%">
            <el-option v-for="r in availableRoles" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门 ID（可选）">
          <el-input v-model="assignDeptId" placeholder="部门 ID" type="number" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="assigning" @click="handleAssign">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Avatar, CircleClose, Plus } from '@element-plus/icons-vue'
import { roleApi, type RoleInfo } from '@/api/role'
import { userAuditApi, type AuditUser } from '@/api/userAudit'

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const userList = ref<AuditUser[]>([])
const selectedUserId = ref<number | null>(null)
const userRoles = ref<RoleInfo[]>([])
const roleLoading = ref(false)
const dialogVisible = ref(false)
const assignRoleId = ref<number | null>(null)
const assignDeptId = ref('')
const assigning = ref(false)

const availableRoles = [
  { label: '超级管理员 (1)', value: 1 },
  { label: '部门管理员 (2)', value: 2 },
  { label: '普通用户 (3)', value: 3 },
  { label: '安全审计员 (4)', value: 4 },
]

async function loadUsers() {
  try { userList.value = await userAuditApi.getAllUsers() }
  catch { userList.value = [] }
}

async function onUserChange() {
  if (!selectedUserId.value) { userRoles.value = []; return }
  roleLoading.value = true
  try { userRoles.value = await roleApi.list(selectedUserId.value) }
  catch (e: any) { ElMessage.error(e.message || '加载失败'); userRoles.value = [] }
  finally { roleLoading.value = false }
}

function openAssign() { assignRoleId.value = null; assignDeptId.value = ''; dialogVisible.value = true }

async function handleAssign() {
  if (!selectedUserId.value || !assignRoleId.value) return
  assigning.value = true
  try {
    await roleApi.assign(selectedUserId.value, assignRoleId.value, assignDeptId.value ? Number(assignDeptId.value) : undefined)
    ElMessage.success('角色分配成功')
    dialogVisible.value = false
    await onUserChange()
  } catch (e: any) { ElMessage.error(e.message || '分配失败') }
  finally { assigning.value = false }
}

async function confirmRemove(row: RoleInfo) {
  if (!selectedUserId.value) return
  try {
    await ElMessageBox.confirm(`确定取消角色「${row.role_name}」吗？`, '确认', { type: 'warning' })
    await roleApi.remove(selectedUserId.value, row.id)
    ElMessage.success('已取消')
    await onUserChange()
  } catch { /* cancelled */ }
}

onMounted(() => loadUsers())
</script>

<style scoped>
.role-page { display: flex; flex-direction: column; height: 100%; padding: 0; background: var(--app-bg); color: var(--app-text); }
.role-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 36px; flex-shrink: 0; }
.role-title-row { display: flex; align-items: center; gap: 14px; }
.role-title-icon {
  width: 52px; height: 52px;
  display: grid; place-items: center;
  flex: 0 0 52px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
  font-size: 24px;
  box-shadow: 0 8px 24px rgba(79, 124, 255, 0.22);
}
.role-title-row h1 { margin: 0; font-size: 28px; font-weight: 780; letter-spacing: -0.02em; color: var(--app-text); line-height: 1.25; }

/* 主面板 = model-table-shell 模式 */
.role-panel {
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

.role-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.role-label { font-size: 14px; color: var(--app-text-muted); white-space: nowrap; }

/* 用户选择框统一样式 */
.role-toolbar :deep(.el-input__wrapper) {
  border-radius: 10px;
  height: 40px;
  box-shadow: none;
  background: var(--app-panel-muted);
  border: 1.5px solid var(--app-border);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.role-toolbar :deep(.el-input__wrapper:hover) {
  border-color: var(--app-border-hover);
}

.role-toolbar :deep(.el-select .el-input.is-focus .el-input__wrapper) {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-softer);
}

.role-toolbar :deep(.el-input__inner) {
  font-size: 13px;
  color: var(--app-text);
}

.role-toolbar :deep(.el-input__inner::placeholder) {
  color: var(--app-text-subtle);
}
.role-table { width: 100%; }
.role-empty { display: flex; align-items: center; justify-content: center; padding: 80px 0; color: var(--app-text-muted); }
.role-empty p { margin: 0; font-size: 15px; }

.role-remove-btn {
  min-width: auto !important;
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  color: var(--app-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.role-remove-btn:hover {
  color: var(--app-danger);
  background: var(--app-danger-soft);
}

/* ===== 表格骨架加载（MCP pulse 动画） ===== */
.table-skeleton { display: grid; }
.table-skeleton__row {
  height: 56px;
  display: grid;
  grid-template-columns: 1fr 1fr 0.9fr 1.3fr 0.7fr;
  align-items: center;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid var(--app-border);
}
.table-skeleton__row span {
  height: 13px;
  border-radius: 999px;
  background: var(--app-border);
  animation: role-skeleton-pulse 1.5s ease-in-out infinite;
}
@keyframes role-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 768px) {
  .role-header { flex-direction: column; align-items: stretch; }
  .role-title-row h1 { font-size: 20px; }
  .role-title-icon { width: 44px; height: 44px; font-size: 20px; }
}
</style>
