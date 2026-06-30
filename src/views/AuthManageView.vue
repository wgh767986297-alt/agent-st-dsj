<template>
  <div class="auth-page" :class="{ 'auth-page--embedded': embedded }">
    <header class="auth-header">
      <div class="auth-title-row">
        <span class="auth-title-icon"><el-icon :size="22"><Lock /></el-icon></span>
        <div><h1>统一授权管理</h1></div>
      </div>
    </header>

    <main class="auth-panel">
      <el-tabs v-model="activeTab" class="auth-tabs">
        <!-- 授权列表 -->
        <el-tab-pane label="授权列表" name="list">
          <div class="auth-toolbar">
            <el-select v-model="listTargetType" placeholder="授权目标类型" style="width:140px" @change="onListTargetTypeChange">
              <el-option label="用户授权" value="user" />
              <el-option label="部门授权" value="dept" />
            </el-select>
            <!-- 部门授权：选部门ID -->
            <template v-if="listTargetType === 'dept'">
              <el-select v-model="listDeptId" placeholder="选择部门" clearable style="width:200px" filterable @change="loadAuthList">
                <el-option v-for="d in deptList" :key="d.id" :label="d.dept_name" :value="d.id" />
              </el-select>
            </template>
            <!-- 用户授权：二级联动 部门 → 用户 -->
            <template v-else>
              <el-select v-model="listCascadeDeptId" placeholder="一级：选择部门" clearable style="width:180px" filterable @change="onListDeptChange">
                <el-option v-for="d in deptList" :key="d.id" :label="d.dept_name" :value="d.id" />
              </el-select>
              <el-select v-model="listCascadeUserId" placeholder="二级：选择用户" clearable style="width:180px" filterable :disabled="!listCascadeDeptId" @change="loadAuthList">
                <el-option v-for="u in listDeptUsers" :key="u.id" :label="`${u.name} (ID:${u.id})`" :value="u.id" />
              </el-select>
            </template>
            <el-button type="primary" @click="loadAuthList">查询</el-button>
          </div>
          <!-- 加载骨架 -->
          <div v-if="authLoading" class="table-skeleton" aria-busy="true" aria-label="加载中">
            <div v-for="n in 6" :key="n" class="table-skeleton__row">
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>

          <el-table v-else :data="authList" stripe class="auth-table">
            <el-table-column label="资源类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.resource_type === 'skill' ? 'primary' : row.resource_type === 'mcp' ? 'success' : 'warning'" size="small">
                  {{ row.resource_type || 'officer' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="resource_name" label="资源名称" min-width="150" />
            <el-table-column prop="target_name" label="目标" width="140" />
            <el-table-column prop="auth_target_type" label="目标类型" width="90">
              <template #default="{ row }">
                <span>{{ row.auth_target_type === 'dept' ? '部门' : '用户' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="grantor_name" label="授权人" width="120" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === '01' ? 'success' : 'info'" size="small">{{ row.status === '01' ? '有效' : '无效' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="expire_time" label="过期时间" width="180" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button class="auth-revoke-btn" size="small" text @click="revokeAuth(row)">
                  <el-icon :size="14"><CircleClose /></el-icon>
                  <span>取消</span>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 新增授权 -->
        <el-tab-pane label="新增授权" name="grant">
          <el-form label-position="top" class="auth-form" style="max-width:500px">
            <el-form-item label="授权目标类型">
              <el-radio-group v-model="grantForm.auth_target_type" @change="onGrantTargetTypeChange">
                <el-radio value="dept">部门</el-radio>
                <el-radio value="user">用户</el-radio>
              </el-radio-group>
            </el-form-item>
            <template v-if="grantForm.auth_target_type === 'user'">
              <el-form-item label="选择部门（一级）">
                <el-select v-model="grantCascadeDeptId" placeholder="选择部门" clearable filterable style="width:100%" @change="onGrantDeptChange">
                  <el-option v-for="d in deptList" :key="d.id" :label="d.dept_name" :value="d.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="选择用户（二级）">
                <el-select v-model="grantForm.user_id" placeholder="选择用户" clearable filterable style="width:100%" :disabled="!grantCascadeDeptId">
                  <el-option v-for="u in grantDeptUsers" :key="u.id" :label="`${u.name} (ID:${u.id})`" :value="String(u.id)" />
                </el-select>
              </el-form-item>
            </template>
            <el-form-item v-else label="选择部门">
              <el-select v-model="grantForm.dept_id" placeholder="选择部门" clearable filterable style="width:100%">
                <el-option v-for="d in deptList" :key="d.id" :label="d.dept_name" :value="String(d.id)" />
              </el-select>
            </el-form-item>
            <el-form-item label="资源类型">
              <el-select v-model="grantForm.resource_type" placeholder="选择资源类型">
                <el-option label="Skill" value="skill" />
                <el-option label="MCP" value="mcp" />
                <el-option label="Officer" value="officer" :disabled="grantForm.auth_target_type === 'dept'" />
              </el-select>
            </el-form-item>
            <el-form-item label="资源 ID">
              <el-input v-model="grantForm.resource_id" type="number" placeholder="资源 ID" />
            </el-form-item>
            <el-form-item v-if="grantForm.auth_target_type === 'user'" label="警员 ID（Skill/MCP 授权时需要）">
              <el-input v-model="grantForm.officer_id" type="number" placeholder="可选" />
            </el-form-item>
            <el-form-item v-if="grantForm.auth_target_type === 'dept'" label="授权类型">
              <el-select v-model="grantForm.auth_type" placeholder="选择授权类型">
                <el-option label="读 (read)" value="read" />
                <el-option label="写 (write)" value="write" />
                <el-option label="管理 (manage)" value="manage" />
              </el-select>
            </el-form-item>
            <el-form-item label="过期时间">
              <el-input v-model="grantForm.expire_time" placeholder="如 2026-12-31 23:59:59" />
            </el-form-item>
            <el-button type="primary" :loading="granting" @click="doGrant">确认授权</el-button>
          </el-form>
        </el-tab-pane>

        <!-- 可授权资源 -->
        <el-tab-pane label="可授权资源" name="resources">
          <div class="auth-toolbar">
            <el-select v-model="resType" placeholder="资源类型" clearable style="width:140px" @change="loadResources">
              <el-option label="Skill" value="skill" />
              <el-option label="MCP" value="mcp" />
              <el-option label="Officer" value="officer" />
            </el-select>
            <el-input v-model="resKeyword" placeholder="关键词搜索" clearable style="width:200px" @clear="loadResources" />
            <el-button type="primary" @click="loadResources">查询</el-button>
          </div>
          <!-- 加载骨架 -->
          <div v-if="resLoading" class="table-skeleton" aria-busy="true" aria-label="加载中">
            <div v-for="n in 6" :key="n" class="table-skeleton__row">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>

          <el-table v-else :data="resources" stripe class="auth-table">
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.resource_type === 'skill' ? 'primary' : row.resource_type === 'mcp' ? 'success' : 'warning'" size="small">
                  {{ row.resource_type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="resource_name" label="名称" min-width="160" />
            <el-table-column prop="resource_code" label="编码" width="160" />
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatus(row) === '02' ? 'success' : getStatus(row) === '01' || getStatus(row) === '04' ? 'warning' : 'info'" size="small">
                  {{ AuditStatusLabel[getStatus(row)] || getStatus(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="is_public" label="公开" width="70">
              <template #default="{ row }">{{ row.is_public ? '是' : '否' }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleClose, Lock } from '@element-plus/icons-vue'
import { authManageApi, type AuthResource, type UserAuthRecord, type DeptAuthRecord } from '@/api/authManage'
import { departmentApi, type Department } from '@/api/department'
import { getStatus, AuditStatusLabel } from '@/utils/auditStatus'

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const activeTab = ref('list')

// ========== Department list (shared) ==========
const deptList = ref<Department[]>([])

async function loadDeptList() {
  try {
    deptList.value = await departmentApi.list()
  } catch {
    deptList.value = []
  }
}

// ========== Auth list ==========
const authLoading = ref(false)
const authList = ref<(UserAuthRecord | DeptAuthRecord)[]>([])
const listTargetType = ref<'user' | 'dept'>('user')
const listDeptId = ref<number | null>(null)
const listCascadeDeptId = ref<number | null>(null)
const listCascadeUserId = ref<number | null>(null)
const listDeptUsers = ref<{ id: number; name: string }[]>([])

function onListTargetTypeChange() {
  listDeptId.value = null
  listCascadeDeptId.value = null
  listCascadeUserId.value = null
  listDeptUsers.value = []
  loadAuthList()
}

async function onListDeptChange(deptId: number | null) {
  listCascadeUserId.value = null
  if (deptId) {
    try {
      listDeptUsers.value = await authManageApi.getUsersByDept(deptId)
    } catch {
      listDeptUsers.value = []
    }
  } else {
    listDeptUsers.value = []
  }
}

async function loadAuthList() {
  authLoading.value = true
  try {
    const params: any = { auth_target_type: listTargetType.value }
    if (listTargetType.value === 'dept' && listDeptId.value) {
      params.dept_id = listDeptId.value
    } else if (listTargetType.value === 'user' && listCascadeUserId.value) {
      params.user_id = listCascadeUserId.value
    }
    authList.value = await authManageApi.getAuthList(params)
  } catch (e: any) { ElMessage.error(e.message || '查询失败') }
  finally { authLoading.value = false }
}

async function revokeAuth(row: any) {
  try {
    await ElMessageBox.confirm('确定取消该授权吗？', '确认取消', { type: 'warning' })
    await authManageApi.revoke({
      auth_target_type: row.auth_target_type || listTargetType.value,
      user_id: row.user_id,
      dept_id: row.target_id,
      resource_type: row.resource_type || 'officer',
      resource_id: row.resource_id || row.officer_id || row.id,
    })
    ElMessage.success('已取消')
    await loadAuthList()
  } catch { /* cancelled */ }
}

// ========== Grant form ==========
const granting = ref(false)
const grantCascadeDeptId = ref<number | null>(null)
const grantDeptUsers = ref<{ id: number; name: string }[]>([])

const grantForm = reactive({
  auth_target_type: 'user' as 'user' | 'dept',
  user_id: '',
  dept_id: '',
  resource_type: 'skill' as 'skill' | 'mcp' | 'officer',
  resource_id: '',
  officer_id: '',
  auth_type: 'read' as 'read' | 'write' | 'manage',
  expire_time: '',
})

function onGrantTargetTypeChange() {
  grantForm.user_id = ''
  grantForm.dept_id = ''
  grantCascadeDeptId.value = null
  grantDeptUsers.value = []
}

async function onGrantDeptChange(deptId: number | null) {
  grantForm.user_id = ''
  if (deptId) {
    try {
      grantDeptUsers.value = await authManageApi.getUsersByDept(deptId)
    } catch {
      grantDeptUsers.value = []
    }
  } else {
    grantDeptUsers.value = []
  }
}

async function doGrant() {
  granting.value = true
  try {
    const payload: any = {
      auth_target_type: grantForm.auth_target_type,
      resource_type: grantForm.resource_type,
      resource_id: Number(grantForm.resource_id),
    }
    if (grantForm.auth_target_type === 'user') {
      if (!grantForm.user_id) throw new Error('请选择用户')
      payload.user_id = Number(grantForm.user_id)
      if (grantForm.officer_id) payload.officer_id = Number(grantForm.officer_id)
    } else {
      if (!grantForm.dept_id) throw new Error('请选择部门')
      payload.dept_id = Number(grantForm.dept_id)
      payload.auth_type = grantForm.auth_type
    }
    if (grantForm.expire_time) payload.expire_time = grantForm.expire_time
    await authManageApi.grant(payload)
    ElMessage.success('授权成功')
    activeTab.value = 'list'
  } catch (e: any) { ElMessage.error(e.message || '授权失败') }
  finally { granting.value = false }
}

// ========== Resources ==========
const resLoading = ref(false)
const resources = ref<AuthResource[]>([])
const resType = ref('')
const resKeyword = ref('')

async function loadResources() {
  resLoading.value = true
  try {
    const params: any = {}
    if (resType.value) params.resource_type = resType.value
    if (resKeyword.value) params.keyword = resKeyword.value
    resources.value = await authManageApi.getResources(params)
  } catch (e: any) { ElMessage.error(e.message || '查询失败') }
  finally { resLoading.value = false }
}

onMounted(() => { loadDeptList(); loadAuthList(); loadResources() })
</script>

<style scoped>
.auth-page { display: flex; flex-direction: column; height: 100%; padding: 0; background: var(--app-bg); color: var(--app-text); }
.auth-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 36px; flex-shrink: 0; }
.auth-title-row { display: flex; align-items: center; gap: 14px; }
.auth-title-icon {
  width: 52px; height: 52px;
  display: grid; place-items: center;
  flex: 0 0 52px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
  font-size: 24px;
  box-shadow: 0 8px 24px rgba(79, 124, 255, 0.22);
}
.auth-title-row h1 { margin: 0; font-size: 28px; font-weight: 780; letter-spacing: -0.02em; color: var(--app-text); line-height: 1.25; }

.auth-panel {
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

.auth-tabs { height: 100%; }
.auth-toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.auth-table { width: 100%; }
.auth-form { margin-top: 8px; }

.auth-revoke-btn {
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

.auth-revoke-btn:hover {
  color: var(--app-danger);
  background: var(--app-danger-soft);
}

/* ===== 表格骨架加载 ===== */
.table-skeleton { display: grid; }
.table-skeleton__row {
  height: 56px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  align-items: center;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid var(--app-border);
}
.table-skeleton__row span {
  height: 13px;
  border-radius: 999px;
  background: var(--app-border);
  animation: auth-skeleton-pulse 1.5s ease-in-out infinite;
}
@keyframes auth-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 768px) {
  .auth-header { flex-direction: column; align-items: stretch; }
  .auth-title-row h1 { font-size: 20px; }
  .auth-title-icon { width: 44px; height: 44px; font-size: 20px; }
}
</style>
