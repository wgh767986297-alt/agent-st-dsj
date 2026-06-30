<template>
  <div class="dept-page" :class="{ 'dept-page--embedded': embedded }">
    <header class="dept-header">
      <div class="dept-title-row">
        <span class="dept-title-icon"><el-icon :size="22"><OfficeBuilding /></el-icon></span>
        <div><h1>部门管理</h1></div>
      </div>
      <div class="dept-header-actions">
        <el-button :type="selectMode ? 'warning' : 'default'" @click="selectMode = !selectMode; selectedRows = []">
          <el-icon><component :is="selectMode ? 'Close' : 'Select'" /></el-icon>
          {{ selectMode ? '取消选择' : '批量选择' }}
        </el-button>
        <el-button v-if="selectMode && selectedRows.length > 0" type="danger" @click="batchDelete" :disabled="selectedRows.length === 0">
          <el-icon><Delete /></el-icon>
          批量删除 ({{ selectedRows.length }})
        </el-button>
        <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon> 创建部门</el-button>
      </div>
    </header>

    <!-- 搜索工具栏 -->
    <div class="dept-toolbar">
      <SearchInput
        v-model="searchKeyword"
        placeholder="搜索部门名称或编码..."
        @search="handleSearch"
      />
    </div>

    <main class="dept-panel">
      <!-- 加载骨架 -->
      <div v-if="loading" class="table-skeleton" aria-busy="true" aria-label="加载中">
        <div v-for="n in 8" :key="n" class="table-skeleton__row">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>

      <el-table v-else :data="filteredDeptList" stripe class="dept-table" row-key="id" @selection-change="onSelectionChange">
        <el-table-column v-if="selectMode" type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="dept_code" label="部门编码" width="140" />
        <el-table-column prop="dept_name" label="部门名称" min-width="160" />
        <el-table-column prop="admin_name" label="管理员" width="120" />
        <el-table-column label="用户配额" width="140">
          <template #default="{ row }">{{ row.used_quota }} / {{ row.user_quota }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '01' ? 'success' : 'info'" size="small">
              {{ row.status === '01' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="创建时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="dept-actions">
              <el-button class="dept-action-btn" size="small" text @click="openMemberDialog(row)" aria-label="成员管理">
                <el-icon :size="16"><User /></el-icon>
                <span>成员管理</span>
              </el-button>
              <el-button class="dept-action-btn" size="small" text @click="openEdit(row)" aria-label="编辑">
                <el-icon :size="16"><Edit /></el-icon>
                <span>编辑</span>
              </el-button>
              <el-button class="dept-action-btn dept-action-btn--danger" size="small" text @click="confirmDelete(row)" aria-label="删除">
                <el-icon :size="16"><Delete /></el-icon>
                <span>删除</span>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </main>

    <!-- ========== 成员管理对话框 ========== -->
    <el-dialog v-model="memberDialogVisible" :title="`成员管理 - ${memberDept?.dept_name || ''}`" width="700px"
      :close-on-click-modal="false" destroy-on-close class="ds-modal">
      <!-- 新增成员 -->
      <div class="member-add-row">
        <el-button type="primary" @click="openRegisterDialog">
          <el-icon :size="14"><Plus /></el-icon>
          新增成员
        </el-button>
        <span class="member-add-hint">注册新用户并加入当前部门</span>
      </div>

      <!-- 成员列表 -->
      <el-table :data="memberList" stripe style="margin-top:12px" v-loading="memberLoading" max-height="360">
        <el-table-column prop="user_id" label="用户ID" width="75" />
        <el-table-column prop="user_name" label="用户名" min-width="100" />
        <el-table-column label="角色" width="130">
          <template #default="{ row }">
            <el-tag
              :type="row.role_id === 1 ? 'danger' : row.role_id === 2 ? 'warning' : row.role_id === 3 ? 'info' : ''"
              size="small"
            >
              {{ row.role_name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.role_id > 0"
              size="small"
              type="primary"
              text
              @click="openEditMember(row)"
            >编辑</el-button>
            <el-button
              v-if="row.role_id > 0"
              size="small"
              type="danger"
              text
              @click="removeMember(row)"
            >移除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!memberLoading && memberList.length === 0" class="member-empty">
        <el-icon :size="36"><User /></el-icon>
        <p>暂无成员，请点击"新增成员"添加</p>
      </div>

      <template #footer>
        <el-button @click="memberDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ========== 编辑成员对话框 ========== -->
    <el-dialog v-model="editMemberVisible" title="编辑成员" width="420px"
      :close-on-click-modal="false" destroy-on-close class="ds-modal">
      <el-form :model="editMemberForm" label-position="top">
        <el-form-item label="用户名">
          <el-input :model-value="editMemberForm.user_name" disabled />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editMemberForm.role_id" style="width:100%">
            <el-option v-for="r in availableRoles" :key="r.id" :label="r.label" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editMemberVisible = false">取消</el-button>
        <el-button type="primary" :loading="editMemberSaving" @click="saveEditMember">保存</el-button>
      </template>
    </el-dialog>

    <!-- ========== 注册新用户对话框 ========== -->
    <el-dialog v-model="registerDialogVisible" title="新增用户" width="480px"
      :close-on-click-modal="false" destroy-on-close class="ds-modal">
      <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-position="top">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="registerForm.name" placeholder="请输入用户姓名" maxlength="30" />
        </el-form-item>
        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="registerForm.idCard" placeholder="请输入18位身份证号" maxlength="18" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="registerForm.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="登录密码" prop="password">
          <el-input v-model="registerForm.password" type="password" placeholder="请输入登录密码（至少6位）" show-password maxlength="32" />
        </el-form-item>
        <el-form-item v-if="isAdminAccount()" label="角色">
          <el-select v-model="registerForm.role_id" placeholder="选择角色" style="width:100%">
            <el-option label="普通用户" :value="3" />
            <el-option label="部门管理员" :value="2" />
          </el-select>
        </el-form-item>
        <div style="font-size:12px;color:var(--app-text-muted);margin-top:4px;">
          将注册至当前部门「{{ memberDept?.dept_name || '' }}」
        </div>
      </el-form>
      <template #footer>
        <el-button @click="registerDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="registerSubmitting" @click="handleRegister">确认创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑部门' : '创建部门'" width="520px"
      :close-on-click-modal="false" destroy-on-close class="ds-modal">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="dept-form-row">
          <el-form-item label="部门编码" prop="dept_code">
            <el-input v-model="form.dept_code" placeholder="如 DEPT001" :disabled="isEdit" />
          </el-form-item>
          <el-form-item label="部门名称" prop="dept_name">
            <el-input v-model="form.dept_name" placeholder="如 技术部" />
          </el-form-item>
        </div>
        <el-form-item label="上级部门 ID" prop="parent_id">
          <el-input v-model="form.parent_id" placeholder="留空为顶级部门" type="number" />
        </el-form-item>
        <el-form-item v-if="isEdit" label="管理员 ID" prop="admin_id">
          <el-input v-model="form.admin_id" placeholder="用户表主键ID" type="number" />
        </el-form-item>
        <div class="dept-form-row">
          <el-form-item label="用户配额" prop="user_quota">
            <el-input v-model="form.user_quota" type="number" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="form.status">
              <el-option label="启用" value="01" />
              <el-option label="禁用" value="00" />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { OfficeBuilding, Plus, Edit, Delete, User, Select, Close, Search } from '@element-plus/icons-vue'
import { departmentApi, type Department } from '@/api/department'
import { roleApi } from '@/api/role'
import { authManageApi } from '@/api/authManage'
import { authApi } from '@/api/auth'
import { isAdminAccount } from '@/utils/auth'
import SearchInput from '@/components/common/SearchInput.vue'

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

interface DeptForm {
  dept_code: string
  dept_name: string
  parent_id: string
  admin_id: string
  user_quota: number
  status: string
}

interface MemberRow {
  user_id: number
  user_name: string
  role_id: number
  role_name: string
}

const loading = ref(false)
const deptList = ref<Department[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const formRef = ref()

// 搜索
const searchKeyword = ref('')
const allDeptList = ref<Department[]>([]) // 全量数据，用于前端搜索

// 多选模式
const selectMode = ref(false)
const selectedRows = ref<Department[]>([])

// 成员管理
const memberDialogVisible = ref(false)
const memberDept = ref<Department | null>(null)
const memberList = ref<MemberRow[]>([])
const memberLoading = ref(false)

// 编辑成员
const editMemberVisible = ref(false)
const editMemberSaving = ref(false)
const editMemberForm = ref({ user_id: 0, user_name: '', role_id: 0, old_role_id: 0 })

// 前端搜索过滤
const filteredDeptList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return deptList.value
  return deptList.value.filter(
    (d) =>
      d.dept_name.toLowerCase().includes(kw) ||
      d.dept_code.toLowerCase().includes(kw),
  )
})

function handleSearch() {
  // 搜索由 computed 自动响应，仅需重置页码（当前无分页则无需操作）
}

// 可用角色：超级管理员可选全部，部门管理员只能选普通用户
const availableRoles = computed(() => {
  if (isAdminAccount()) {
    return [
      { id: 1, label: '超级管理员' },
      { id: 2, label: '部门管理员' },
      { id: 3, label: '普通用户' },
    ]
  }
  // 部门管理员只能分配普通用户
  return [{ id: 3, label: '普通用户' }]
})

// ========== 注册新用户 ==========
const registerDialogVisible = ref(false)
const registerSubmitting = ref(false)
const registerFormRef = ref()
const registerForm = ref({
  name: '',
  idCard: '',
  phone: '',
  password: '',
  role_id: 3, // 默认普通用户
})
const registerRules = {
  name: [{ required: true, message: '请输入用户姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '身份证号为18位数字（末位可为X）', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入11位有效手机号', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
}

function openRegisterDialog() {
  registerForm.value = {
    name: '',
    idCard: '',
    phone: '',
    password: '',
    role_id: isAdminAccount() ? 3 : 3,
  }
  registerDialogVisible.value = true
}

async function handleRegister() {
  const valid = await registerFormRef.value?.validate().catch(() => false)
  if (!valid) return
  if (!memberDept.value) return

  registerSubmitting.value = true
  try {
    await authApi.register({
      name: registerForm.value.name.trim(),
      idCard: registerForm.value.idCard.trim(),
      phone: registerForm.value.phone.trim(),
      company: '',
      department: String(memberDept.value.id),
      dept_id: memberDept.value.id,
      password: registerForm.value.password,
    })
    ElMessage.success('用户注册成功')
    registerDialogVisible.value = false
    // 刷新成员列表
    await loadMemberList()
  } catch (e: any) {
    ElMessage.error(e.message || '注册失败')
  } finally {
    registerSubmitting.value = false
  }
}

const emptyForm = (): DeptForm => ({
  dept_code: '', dept_name: '', parent_id: '', admin_id: '', user_quota: 100, status: '01',
})
const form = ref(emptyForm())
const rules = {
  dept_code: [{ required: true, message: '请输入部门编码', trigger: 'blur' }],
  dept_name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
}

function onSelectionChange(rows: Department[]) {
  selectedRows.value = rows
}

function openCreate() {
  isEdit.value = false; editingId.value = null; form.value = emptyForm(); dialogVisible.value = true
}

function openEdit(row: Department) {
  isEdit.value = true; editingId.value = row.id
  form.value = {
    dept_code: row.dept_code, dept_name: row.dept_name,
    parent_id: row.parent_id != null ? String(row.parent_id) : '',
    admin_id: row.admin_id != null ? String(row.admin_id) : '',
    user_quota: row.user_quota, status: row.status,
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const payload: any = {
      dept_name: form.value.dept_name,
      parent_id: form.value.parent_id ? Number(form.value.parent_id) : null,
      admin_id: form.value.admin_id ? Number(form.value.admin_id) : null,
      user_quota: Number(form.value.user_quota) || 100,
      status: form.value.status,
    }
    if (isEdit.value && editingId.value) {
      await departmentApi.update({ id: editingId.value, ...payload })
      ElMessage.success('更新成功')
    } else {
      await departmentApi.create({ dept_code: form.value.dept_code, ...payload })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadList()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function confirmDelete(row: Department) {
  try {
    await ElMessageBox.confirm(`确定删除部门「${row.dept_name}」吗？`, '确认删除', { type: 'warning' })
    await departmentApi.remove(row.id)
    ElMessage.success('已删除')
    await loadList()
  } catch { /* cancelled */ }
}

async function batchDelete() {
  if (selectedRows.value.length === 0) return
  const names = selectedRows.value.map(r => r.dept_name).join('、')
  try {
    await ElMessageBox.confirm(`确定删除 ${selectedRows.value.length} 个部门（${names}）吗？`, '批量删除确认', { type: 'warning' })
    for (const row of selectedRows.value) {
      await departmentApi.remove(row.id)
    }
    ElMessage.success(`已删除 ${selectedRows.value.length} 个部门`)
    selectMode.value = false
    selectedRows.value = []
    await loadList()
  } catch { /* cancelled */ }
}

// ========== 成员管理 ==========
async function openMemberDialog(row: Department) {
  memberDept.value = row
  memberDialogVisible.value = true
  await loadMemberList()
}

async function loadMemberList() {
  if (!memberDept.value) return
  memberLoading.value = true
  try {
    // 1. 获取部门下所有用户
    const users = await authManageApi.getUsersByDept(memberDept.value.id)
    // 2. 并行获取每个用户的角色
    const members: MemberRow[] = []
    const roleResults = await Promise.allSettled(
      users.map((u) => roleApi.list(u.id)),
    )
    users.forEach((user, idx) => {
      const roles = roleResults[idx].status === 'fulfilled' ? roleResults[idx].value : []
      if (roles.length > 0) {
        roles.forEach((r) => {
          members.push({
            user_id: user.id,
            user_name: user.name,
            role_id: r.id,
            role_name: r.role_name,
          })
        })
      } else {
        // 无角色的用户也显示
        members.push({
          user_id: user.id,
          user_name: user.name,
          role_id: 0,
          role_name: '无角色',
        })
      }
    })
    memberList.value = members
  } catch {
    memberList.value = []
  } finally {
    memberLoading.value = false
  }
}

async function removeMember(row: MemberRow) {
  try {
    await ElMessageBox.confirm(`确定移除用户「${row.user_name}」吗？`, '确认移除', { type: 'warning' })
    await roleApi.remove(row.user_id, row.role_id, memberDept.value?.id)
    ElMessage.success('已移除')
    await loadMemberList()
  } catch { /* cancelled */ }
}

// ========== 编辑成员 ==========
function openEditMember(row: MemberRow) {
  editMemberForm.value = {
    user_id: row.user_id,
    user_name: row.user_name,
    role_id: row.role_id,
    old_role_id: row.role_id,
  }
  editMemberVisible.value = true
}

async function saveEditMember() {
  const { user_id, role_id, old_role_id } = editMemberForm.value
  if (role_id === old_role_id) {
    editMemberVisible.value = false
    return
  }
  if (!memberDept.value) return

  editMemberSaving.value = true
  try {
    if (old_role_id > 0) {
      await roleApi.remove(user_id, old_role_id, memberDept.value.id)
    }
    await roleApi.assign(user_id, role_id, memberDept.value.id)
    ElMessage.success('角色更新成功')
    editMemberVisible.value = false
    await loadMemberList()
  } catch (e: any) {
    ElMessage.error(e.message || '更新失败')
  } finally {
    editMemberSaving.value = false
  }
}

async function loadList() {
  loading.value = true
  try {
    deptList.value = await departmentApi.list()
  }
  catch (e: any) { ElMessage.error(e.message || '加载失败') }
  finally { loading.value = false }
}

onMounted(() => loadList())
</script>

<style scoped>
.dept-page { display: flex; flex-direction: column; height: 100%; padding: 0; background: var(--app-bg); color: var(--app-text); }
.dept-page--embedded { height: 100%; }
.dept-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 36px; flex-shrink: 0; }
.dept-title-row { display: flex; align-items: center; gap: 14px; }
.dept-title-icon {
  width: 52px; height: 52px;
  display: grid; place-items: center;
  flex: 0 0 52px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
  font-size: 24px;
  box-shadow: 0 8px 24px rgba(79, 124, 255, 0.22);
}
.dept-title-row h1 { margin: 0; font-size: 28px; font-weight: 780; letter-spacing: -0.02em; color: var(--app-text); line-height: 1.25; }

/* 主面板 = model-table-shell 模式 */
.dept-panel {
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

.dept-table { width: 100%; }
.dept-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dept-action-btn {
  min-width: auto !important;
  height: 30px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  color: var(--app-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.dept-action-btn:hover {
  color: var(--app-primary);
  background: var(--app-primary-soft);
}

.dept-action-btn--danger:hover {
  color: var(--app-danger);
  background: var(--app-danger-soft);
}

.dept-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }

/* ==================== 搜索工具栏 ==================== */
.dept-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.dept-toolbar__search {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--app-panel);
  transition: border-color 0.2s ease;
}

.dept-toolbar__search:focus-within {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-soft);
}

.dept-toolbar__search-input {
  width: 220px;
  padding: 8px 12px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.5;
}

.dept-toolbar__search-input::placeholder {
  color: var(--app-text-muted);
}

.dept-toolbar__search-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border: none;
  background: var(--app-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease;
}

.dept-toolbar__search-btn:hover {
  background: var(--app-primary-strong);
}

/* ===== 表格骨架加载（MCP pulse 动画） ===== */
.table-skeleton { display: grid; }
.table-skeleton__row {
  height: 56px;
  display: grid;
  grid-template-columns: 0.4fr 0.7fr 1fr 0.6fr 0.7fr 0.5fr 0.9fr 0.6fr;
  align-items: center;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid var(--app-border);
}
.table-skeleton__row span {
  height: 13px;
  border-radius: 999px;
  background: var(--app-border);
  animation: dept-skeleton-pulse 1.5s ease-in-out infinite;
}
@keyframes dept-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ==================== 成员管理 ==================== */
.member-add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.member-add-hint {
  font-size: 12px;
  color: var(--app-text-muted);
}

.member-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--app-text-muted);
  gap: 8px;
}

.member-empty p {
  margin: 0;
  font-size: 13px;
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .dept-header { flex-direction: column; align-items: stretch; }
  .dept-title-row h1 { font-size: 20px; }
  .dept-title-icon { width: 44px; height: 44px; font-size: 20px; }
  .dept-form-row { grid-template-columns: 1fr; }
}
</style>
