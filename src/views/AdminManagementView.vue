<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElIcon, ElMessage, ElMessageBox } from 'element-plus'
import {
  Monitor, Tickets, UserFilled, MagicStick, Connection,
  OfficeBuilding, Avatar, DocumentChecked, Files, Lock, CircleCheck,
} from '@element-plus/icons-vue'
import AccountAuditView from '@/views/AccountAuditView.vue'
import LogQueryView from '@/views/LogQueryView.vue'
import ModelManagementView from '@/views/ModelManagementView.vue'
import SkillsMarketView from '@/views/SkillsMarketView.vue'
import McpManagementView from '@/views/McpManagementView.vue'
import DepartmentManageView from '@/views/DepartmentManageView.vue'
import RoleManageView from '@/views/RoleManageView.vue'
import SkillAuditView from '@/views/SkillAuditView.vue'
import OfficerAuditView from '@/views/OfficerAuditView.vue'
import McpAuditView from '@/views/McpAuditView.vue'
import OperationLogView from '@/views/OperationLogView.vue'
import AuthManageView from '@/views/AuthManageView.vue'
import { departmentApi, type Department } from '@/api/department'
import { authManageApi } from '@/api/authManage'
import { authApi } from '@/api/auth'
import { userAuditApi } from '@/api/userAudit'
import { roleApi } from '@/api/role'
import { getCurrentDeptId, isAdminAccount, isDepartmentAdmin } from '@/utils/auth'
import { auditApi, type PendingItem } from '@/api/audit'
import {
  deleteModel,
  getModelList,
  saveModel,
  updateModel,
  type ModelConfig,
} from '@/api/modelManagement'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'

type AdminSectionId =
  | 'account-audit'
  | 'log-query'
  | 'model-management'
  | 'skills-management'
  | 'mcp-management'
  | 'department-manage'
  | 'role-manage'
  | 'skill-audit'
  | 'officer-audit'
  | 'mcp-audit'
  | 'operation-log'
  | 'auth-manage'

interface AdminSection {
  id: AdminSectionId
  label: string
  description: string
  icon: Component
  component: Component
  props?: Record<string, unknown>
}

const route = useRoute()
const router = useRouter()

const adminSections: AdminSection[] = [
  {
    id: 'account-audit',
    label: '账号审核',
    description: '审核注册用户',
    icon: UserFilled,
    component: AccountAuditView,
    props: { embedded: true },
  },
  {
    id: 'log-query',
    label: '日志查询',
    description: '查询登录与对话日志',
    icon: Tickets,
    component: LogQueryView,
    props: { embedded: true },
  },
  {
    id: 'model-management',
    label: '模型管理',
    description: '配置问答可用模型',
    icon: Monitor,
    component: ModelManagementView,
    props: { embedded: true },
  },
  {
    id: 'skills-management',
    label: '技能管理',
    description: '管理技能配置和技能包上传',
    icon: MagicStick,
    component: SkillsMarketView,
    props: { embedded: true, manage: true },
  },
  {
    id: 'mcp-management',
    label: 'MCP 管理',
    description: '管理 MCP 服务配置',
    icon: Connection,
    component: McpManagementView,
    props: { embedded: true },
  },
  {
    id: 'department-manage',
    label: '部门管理',
    description: '管理部门结构与配额',
    icon: OfficeBuilding,
    component: DepartmentManageView,
    props: { embedded: true },
  },
  {
    id: 'role-manage',
    label: '角色管理',
    description: '分配用户角色与权限',
    icon: Avatar,
    component: RoleManageView,
    props: { embedded: true },
  },
  {
    id: 'skill-audit',
    label: 'Skill 审核',
    description: '审核 Skill 上架申请',
    icon: DocumentChecked,
    component: SkillAuditView,
    props: { embedded: true },
  },
  {
    id: 'officer-audit',
    label: '警员审核',
    description: '审核数字警员入库申请',
    icon: CircleCheck,
    component: OfficerAuditView,
    props: { embedded: true },
  },
  {
    id: 'mcp-audit',
    label: 'MCP 审核',
    description: '审核 MCP 服务上架申请',
    icon: Connection,
    component: McpAuditView,
    props: { embedded: true },
  },
  {
    id: 'operation-log',
    label: '操作日志',
    description: '审计用户操作记录',
    icon: Files,
    component: OperationLogView,
    props: { embedded: true },
  },
  {
    id: 'auth-manage',
    label: '统一授权',
    description: '管理资源授权与分配',
    icon: Lock,
    component: AuthManageView,
    props: { embedded: true },
  },
]

const adminSectionIds = new Set(adminSections.map((section) => section.id))

const resolveSectionId = (value: unknown): AdminSectionId => {
  const id = Array.isArray(value) ? value[0] : value
  if (typeof id === 'string' && adminSectionIds.has(id as AdminSectionId)) {
    return id as AdminSectionId
  }
  return 'account-audit'
}

const activeSectionId = computed(() => resolveSectionId(route.query.section))
const activeSection = computed(
  () => adminSections.find((section) => section.id === activeSectionId.value) || adminSections[0],
)
const activeSectionProps = computed(() => activeSection.value.props || {})

const handleSectionClick = async (id: AdminSectionId) => {
  if (id === activeSectionId.value) return
  await router.replace({ path: '/admin-management', query: { section: id } })
}

// ==================== New mgmt-tab state ====================
type MgmtTab = 'roles' | 'dept' | 'approval' | 'models'
const activeMgmtTab = ref<MgmtTab>('roles')
const agentPanelVisible = ref(false)
const agentInput = ref('')
const agentMessages = ref<{ role: 'ai' | 'user'; text: string }[]>([
  {
    role: 'ai',
    text: '您好！我是安全管理智能体，可以帮您管理用户权限、查询部门信息、分析用户行为。请问有什么需要帮助的？',
  },
])

// ==================== Department CRUD ====================
const departments = ref<Department[]>([])
const deptLoading = ref(false)
const deptSearch = ref('')

// Department dialog
const deptDialogVisible = ref(false)
const deptDialogTitle = ref('新增部门')
const editingDeptId = ref<number | null>(null)
const deptForm = ref({
  dept_name: '',
  dept_code: '',
  admin_name: '',
  admin_id: null as number | null,
  user_quota: 20,
  authorized_skill_count: 0,
  authorized_mcp_count: 0,
  authorized_officer_count: 0,
  remark: '',
})

// ==================== Department Members ====================
interface DeptMember {
  id: number
  name: string
  user_account?: string
  id_card?: string
  phone?: string
  department?: string
  roles?: string[]
}

const deptMembers = ref<DeptMember[]>([])
const memberLoading = ref(false)

// Member manage dialog (standalone)
const memberManageDialogVisible = ref(false)
const memberManageDeptId = ref<number | null>(null)
const memberManageDeptName = ref('')

// Member add dialog (form to create new user)
const memberAddDialogVisible = ref(false)
const memberAddForm = ref({
  name: '',
  idCard: '',
  phone: '',
})
const memberAddLoading = ref(false)

// Role selection for adding members
// 角色ID: 2-部门管理员 3-普通用户 4-安全审计员（1-超级管理员不在此分配）
const availableRoles = [
  { id: 3, label: '普通用户' },
  { id: 2, label: '部门管理员' },
  { id: 4, label: '安全审计员' },
]
const selectedRoleIds = ref<Set<number>>(new Set([3])) // 默认选中普通用户
const isSuperAdmin = computed(() => isAdminAccount())
const isDeptAdminOnly = computed(() => isDepartmentAdmin() && !isAdminAccount())

function toggleRoleSelection(roleId: number) {
  if (isDeptAdminOnly.value) return // 部门管理员不能修改
  const next = new Set(selectedRoleIds.value)
  if (next.has(roleId)) {
    if (next.size > 1) next.delete(roleId) // 至少保留一个
  } else {
    next.add(roleId)
  }
  selectedRoleIds.value = next
}

const filteredDepartments = computed(() => {
  if (!deptSearch.value.trim()) return departments.value
  const s = deptSearch.value.trim().toLowerCase()
  return departments.value.filter(
    (d) => d.dept_name.toLowerCase().includes(s) || d.admin_name?.toLowerCase().includes(s),
  )
})

async function loadDepartments() {
  deptLoading.value = true
  try {
    const data = await departmentApi.list()
    departments.value = data
  } catch (e: any) {
    console.error('Failed to load departments:', e)
  } finally {
    deptLoading.value = false
  }
}

function openAddDeptDialog() {
  editingDeptId.value = null
  deptDialogTitle.value = '新增部门'
  deptForm.value = {
    dept_name: '',
    dept_code: '',
    admin_name: '',
    admin_id: null,
    user_quota: 20,
    authorized_skill_count: 0,
    authorized_mcp_count: 0,
    authorized_officer_count: 0,
    remark: '',
  }
  deptDialogVisible.value = true
}

function openEditDeptDialog(dept: Department) {
  editingDeptId.value = dept.id
  deptDialogTitle.value = '编辑部门'
  deptForm.value = {
    dept_name: dept.dept_name,
    dept_code: dept.dept_code,
    admin_name: dept.admin_name || '',
    admin_id: dept.admin_id,
    user_quota: dept.user_quota,
    authorized_skill_count: (dept as any).authorized_skill_count || 0,
    authorized_mcp_count: (dept as any).authorized_mcp_count || 0,
    authorized_officer_count: (dept as any).authorized_officer_count || 0,
    remark: (dept as any).remark || '',
  }
  deptDialogVisible.value = true
}

async function saveDept() {
  if (!deptForm.value.dept_name.trim()) {
    ElMessage.warning('请输入部门名称')
    return
  }
  if (!deptForm.value.dept_code.trim()) {
    ElMessage.warning('请输入部门编码')
    return
  }
  try {
    const payload = {
      dept_name: deptForm.value.dept_name,
      dept_code: deptForm.value.dept_code,
      admin_id: deptForm.value.admin_id,
      user_quota: deptForm.value.user_quota,
    }
    if (editingDeptId.value) {
      await departmentApi.update({ id: editingDeptId.value, ...payload })
      ElMessage.success('部门信息已更新')
    } else {
      await departmentApi.create(payload)
      ElMessage.success('部门已新增')
    }
    deptDialogVisible.value = false
    await loadDepartments()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function deleteDept(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除该部门吗？该操作不可恢复。', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await departmentApi.remove(id)
    ElMessage.success('部门已删除')
    await loadDepartments()
  } catch (e: any) {
    ElMessage.error(e.message || '删除失败')
  }
}

// ==================== Member Manage (standalone dialog) ====================
async function loadDeptMembers(deptId: number) {
  memberLoading.value = true
  try {
    const users = await authManageApi.getUsersByDept(deptId)
    const members: DeptMember[] = []
    for (const u of users) {
      const userId = Number(u.id)
      let roles: string[] = []
      try {
        const roleList = await roleApi.list(userId)
        roles = roleList.map((r) => r.role_name)
      } catch {
        // 角色查询失败时忽略
      }
      members.push({
        id: userId,
        name: u.name || '',
        user_account: u.user_account,
        id_card: (u as any).id_card || (u as any).idCard || '',
        phone: u.phone,
        department: u.department,
        roles,
      })
    }
    deptMembers.value = members
  } catch (e: any) {
    deptMembers.value = []
    ElMessage.error(e.message || '加载成员列表失败')
  } finally {
    memberLoading.value = false
  }
}

async function openMemberManageDialog(dept: Department) {
  memberManageDeptId.value = dept.id
  memberManageDeptName.value = dept.dept_name
  memberManageDialogVisible.value = true
  await loadDeptMembers(dept.id)
}

// ==================== Member Add (form to create new user) ====================
function openMemberAddDialog() {
  memberAddForm.value = {
    name: '',
    idCard: '',
    phone: '',
  }
  selectedRoleIds.value = new Set([3]) // 重置为默认普通用户
  memberAddDialogVisible.value = true
}

async function addMemberToDept() {
  if (!memberManageDeptId.value) return
  const form = memberAddForm.value
  if (!form.name.trim()) {
    ElMessage.warning('请输入姓名')
    return
  }
  if (!form.idCard.trim()) {
    ElMessage.warning('请输入身份证号')
    return
  }
  if (!form.phone.trim()) {
    ElMessage.warning('请输入手机号')
    return
  }
  memberAddLoading.value = true
  try {
    // 1. 注册新用户：密码默认123456，company取当前部门名称，department取当前部门ID
    await authApi.register({
      name: form.name.trim(),
      idCard: form.idCard.trim(),
      phone: form.phone.trim(),
      company: memberManageDeptName.value,
      department: String(memberManageDeptId.value),
      dept_id: memberManageDeptId.value,
      password: '123456',
    })
    // 2. 通过身份证号反查新建用户 ID
    const users = await userAuditApi.getAllUsers({ idCard: form.idCard.trim() })
    const newUser = users.find((u) => u.idCard === form.idCard.trim())
    if (newUser) {
      const userId = Number(newUser.id)
      // 3. 分配选中的角色
      for (const roleId of selectedRoleIds.value) {
        await roleApi.assign(userId, roleId, memberManageDeptId.value!)
      }
    }
    const roleLabels = Array.from(selectedRoleIds.value)
      .map((id) => availableRoles.find((r) => r.id === id)?.label)
      .filter(Boolean)
      .join('、')
    ElMessage.success(`已创建用户 ${form.name.trim()}，分配角色：${roleLabels}`)
    memberAddDialogVisible.value = false
    await loadDeptMembers(memberManageDeptId.value)
  } catch (e: any) {
    ElMessage.error(e.message || '添加成员失败')
  } finally {
    memberAddLoading.value = false
  }
}

// ==================== Member Edit (update user info & roles) ====================
const memberEditDialogVisible = ref(false)
const memberEditLoading = ref(false)
const editingMemberId = ref<number | null>(null)
const memberEditForm = ref({
  name: '',
  phone: '',
})
const editSelectedRoleIds = ref<Set<number>>(new Set())

async function openMemberEditDialog(member: DeptMember) {
  editingMemberId.value = member.id
  memberEditForm.value = {
    name: member.name,
    phone: member.phone || '',
  }
  // 加载当前角色
  let currentRoles: string[] = member.roles || []
  if (currentRoles.length === 0) {
    try {
      const roleList = await roleApi.list(member.id)
      currentRoles = roleList.map((r) => r.role_name)
    } catch {
      currentRoles = []
    }
  }
  const roleIdSet = new Set<number>()
  for (const roleName of currentRoles) {
    const matched = availableRoles.find((r) => r.label === roleName)
    if (matched) roleIdSet.add(matched.id)
  }
  // 如果没有任何匹配的角色，默认选中普通用户
  if (roleIdSet.size === 0) roleIdSet.add(3)
  editSelectedRoleIds.value = roleIdSet
  memberEditDialogVisible.value = true
}

function toggleEditRoleSelection(roleId: number) {
  if (isDeptAdminOnly.value) return
  const next = new Set(editSelectedRoleIds.value)
  if (next.has(roleId)) {
    if (next.size > 1) next.delete(roleId)
  } else {
    next.add(roleId)
  }
  editSelectedRoleIds.value = next
}

async function saveMemberEdit() {
  if (editingMemberId.value == null) return
  const form = memberEditForm.value
  if (!form.name.trim()) {
    ElMessage.warning('请输入姓名')
    return
  }
  memberEditLoading.value = true
  try {
    // 1. 更新用户基本信息
    await authApi.updateProfile({
      id: editingMemberId.value,
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
    })
    // 2. 同步角色：先查当前角色，再对比增减
    const currentRoleList = await roleApi.list(editingMemberId.value)
    const currentRoleIds = new Set(
      currentRoleList
        .map((r) => availableRoles.find((a) => a.label === r.role_name)?.id)
        .filter(Boolean) as number[],
    )
    const targetRoleIds = editSelectedRoleIds.value
    // 需要移除的角色
    for (const roleId of currentRoleIds) {
      if (!targetRoleIds.has(roleId)) {
        await roleApi.remove(editingMemberId.value, roleId)
      }
    }
    // 需要新增的角色
    for (const roleId of targetRoleIds) {
      if (!currentRoleIds.has(roleId)) {
        await roleApi.assign(editingMemberId.value, roleId, memberManageDeptId.value!)
      }
    }
    ElMessage.success('成员信息已更新')
    memberEditDialogVisible.value = false
    await loadDeptMembers(memberManageDeptId.value!)
  } catch (e: any) {
    ElMessage.error(e.message || '修改失败')
  } finally {
    memberEditLoading.value = false
  }
}

// ==================== Member Remove ====================
async function removeMember(member: DeptMember) {
  try {
    await ElMessageBox.confirm(`确定要移除成员"${member.name}"吗？`, '确认移除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    // 删除用户
    await userAuditApi.deleteUser(member.id)
    ElMessage.success('成员已移除')
    if (memberManageDeptId.value) {
      await loadDeptMembers(memberManageDeptId.value)
    }
  } catch (e: any) {
    ElMessage.error(e.message || '移除成员失败')
  }
}

// ==================== Model Management ====================
const modelLoading = ref(false)
const modelSaving = ref(false)
const modelKeyword = ref('')
const models = ref<ModelConfig[]>([])
const modelDialogVisible = ref(false)
const modelDialogMode = ref<'create' | 'edit'>('create')

const modelForm = reactive<ModelConfig>({
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
  const text = modelKeyword.value.trim().toLowerCase()
  if (!text) return models.value
  return models.value.filter((item) =>
    [item.name, item.model, item.apibase, item.apikey].some((value) =>
      String(value || '').toLowerCase().includes(text),
    ),
  )
})

const resetModelForm = (model?: ModelConfig) => {
  modelForm.name = model?.name || ''
  modelForm.apikey = model?.apikey || ''
  modelForm.apibase = model?.apibase || ''
  modelForm.model = model?.model || ''
  modelForm.max_retries = model?.max_retries ?? 2
  modelForm.connect_timeout = model?.connect_timeout ?? 10
  modelForm.read_timeout = model?.read_timeout ?? 120
  modelForm.enable_thinking = model?.enable_thinking ?? true
  modelForm.admin = Boolean(model?.admin)
}

async function loadModels() {
  modelLoading.value = true
  try {
    models.value = await getModelList(true)
  } catch (error) {
    models.value = []
    ElMessage.error(error instanceof Error ? error.message : '模型列表加载失败')
  } finally {
    modelLoading.value = false
  }
}

function openModelCreateDialog() {
  modelDialogMode.value = 'create'
  resetModelForm()
  modelDialogVisible.value = true
}

function openModelEditDialog(model: ModelConfig) {
  modelDialogMode.value = 'edit'
  resetModelForm(model)
  modelDialogVisible.value = true
}

const buildModelPayload = () => ({
  name: modelForm.name.trim(),
  apikey: modelForm.apikey?.trim() || null,
  apibase: modelForm.apibase?.trim() || null,
  model: modelForm.model?.trim() || null,
  max_retries: Number(modelForm.max_retries ?? 0),
  connect_timeout: Number(modelForm.connect_timeout ?? 0),
  read_timeout: Number(modelForm.read_timeout ?? 0),
  enable_thinking: Boolean(modelForm.enable_thinking),
  admin: Boolean(modelForm.admin),
})

async function handleModelSave() {
  const modelName = modelForm.name.trim()
  if (!modelName) {
    ElMessage.warning('请填写模型名称')
    return
  }
  modelSaving.value = true
  try {
    if (modelDialogMode.value === 'create') {
      await saveModel(modelName, buildModelPayload())
    } else {
      await updateModel(modelName, buildModelPayload())
    }
    ElMessage.success('模型配置已保存')
    modelDialogVisible.value = false
    await loadModels()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '模型保存失败')
  } finally {
    modelSaving.value = false
  }
}

async function handleModelDelete(model: ModelConfig) {
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

// ==================== 待我审批（真实 API） ====================
const approvalLoading = ref(false)
const approvalItems = ref<PendingItem[]>([])
const approvalResourceType = ref('all')
const approvalAuditType = ref('all')
const auditingId = ref<string | null>(null)

// ========== 部门/用户联动筛选 ==========
const approvalFilterDeptId = ref<number | null>(null)
const approvalFilterUserId = ref<number | null>(null)
const approvalFilterDeptUsers = ref<{ id: number; name: string }[]>([])
const approvalFilterUsersLoading = ref(false)

/** 加载部门列表（复用已有的 departments） */
const approvalDeptOptions = computed(() => departments.value)

/** 筛选部门变更 → 加载该部门下用户列表 */
async function onApprovalDeptChange(deptId: number | null) {
  approvalFilterUserId.value = null
  approvalFilterDeptUsers.value = []
  if (deptId == null) return
  approvalFilterUsersLoading.value = true
  try {
    approvalFilterDeptUsers.value = await authManageApi.getUsersByDept(deptId)
  } catch {
    approvalFilterDeptUsers.value = []
  } finally {
    approvalFilterUsersLoading.value = false
  }
}

/** 筛选条件变更 → 重新查询 */
function onApprovalFilterChange() {
  loadApprovalItems()
}

const approvalResourceTypeOptions = [
  { key: 'all', label: '全部' },
  { key: 'skill', label: 'Skill' },
  { key: 'mcp', label: 'MCP 服务' },
  { key: 'officer', label: '数字警员' },
]

const approvalAuditTypeOptions = computed(() => {
  const opts = [
    { key: 'all', label: '全部' },
    { key: 'create', label: '发布审核' },
  ]
  if (isSuperAdmin.value || isDeptAdminOnly.value) {
    opts.push({ key: 'remove', label: '下架审核' })
  }
  return opts
})

async function loadApprovalItems() {
  approvalLoading.value = true
  try {
    // 构建外置筛选条件（仅当用户主动选择了部门/用户时才传入）
    const filters: { dept_id?: number; user_id?: number } = {}
    if (approvalFilterDeptId.value != null) filters.dept_id = approvalFilterDeptId.value
    if (approvalFilterUserId.value != null) filters.user_id = approvalFilterUserId.value

    const isAllType = approvalResourceType.value === 'all' && approvalAuditType.value === 'all'
    const fetchFn = isSuperAdmin.value
      ? (rt?: string, at?: string) => auditApi.getSuperPendingList(rt, at, filters)
      : (rt?: string, at?: string) => auditApi.getDeptPendingList(rt, at, filters)

    let allItems: PendingItem[] = []

    if (isAllType) {
      // 不传类型和操作参数 = 查全部，一次请求
      const result = await fetchFn()
      allItems = result.list || []
    } else {
      // 有具体筛选条件时才按类型组合查询
      const resourceTypes =
        approvalResourceType.value === 'all'
          ? ['skill', 'mcp', 'officer']
          : [approvalResourceType.value]
      const auditTypes =
        approvalAuditType.value === 'all'
          ? isSuperAdmin.value || isDeptAdminOnly.value
            ? ['create', 'remove']
            : ['create']
          : [approvalAuditType.value]

      const results = await Promise.allSettled(
        resourceTypes.flatMap((rt) => auditTypes.map((at) => fetchFn(rt, at))),
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allItems.push(...(result.value.list || []))
        }
      }
    }
    approvalItems.value = allItems
  } catch {
    approvalItems.value = []
  } finally {
    approvalLoading.value = false
  }
}

const approvalCount = computed(() => approvalItems.value.length)

function switchResourceType(key: string) {
  approvalResourceType.value = key
  loadApprovalItems()
}

function switchAuditType(key: string) {
  approvalAuditType.value = key
  loadApprovalItems()
}

function resourceTypeLabel(type: string): string {
  switch (type) {
    case 'skill': return '技能'
    case 'mcp': return 'MCP服务'
    case 'officer': return '数字警员'
    default: return type
  }
}

function auditTypeLabel(type: string): string {
  switch (type) {
    case 'create': return '上架发布'
    case 'remove': return '下架'
    default: return type
  }
}

/**
 * 审核状态码（统一规范）：
 *   01 — 上架审核中
 *   02 — 审核通过（上架）
 *   03 — 审核失败/拒绝（上架）
 *   04 — 下架审核中
 *   05 — 下架成功
 *   06 — 下架失败/拒绝
 */
const AUDIT_APPROVE: Record<string, string> = {
  create: '02',  // 上架 → 审核通过
  remove: '05',  // 下架 → 下架成功
}
const AUDIT_REJECT: Record<string, string> = {
  create: '03',  // 上架 → 审核拒绝
  remove: '06',  // 下架 → 下架拒绝
}
const AUDIT_RESULT_LABEL: Record<string, string> = {
  '02': '已通过',
  '03': '已驳回',
  '05': '已下架',
  '06': '下架已驳回',
}

async function approveItem(item: PendingItem) {
  const status = AUDIT_APPROVE[item.audit_type]
  if (!status) {
    ElMessage.error(`未知审核类型: ${item.audit_type}`)
    return
  }
  await handleAuditAction(item, status)
}

async function rejectItem(item: PendingItem) {
  const status = AUDIT_REJECT[item.audit_type]
  if (!status) {
    ElMessage.error(`未知审核类型: ${item.audit_type}`)
    return
  }
  const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因（可选）', '确认驳回', {
    confirmButtonText: '确认驳回',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '请输入拒绝原因...',
  }).catch(() => ({ value: null }))
  if (reason === null) return
  await handleAuditAction(item, status, reason || undefined)
}

async function handleAuditAction(item: PendingItem, status: string, remark?: string) {
  const key = `${item.resource_type}-${item.resource_id}-${item.audit_type}`
  auditingId.value = key
  try {
    if (isSuperAdmin.value) {
      if (item.audit_type === 'create') {
        await auditApi.superAudit(item.resource_type, item.resource_id, status, remark)
      } else if (item.audit_type === 'remove') {
        await auditApi.superAuditRemove(item.resource_type, item.resource_id, status, remark)
      }
    } else {
      if (item.audit_type === 'create') {
        await auditApi.deptAudit(item.resource_type, item.resource_id, status, remark)
      } else if (item.audit_type === 'remove') {
        await auditApi.deptAuditRemove(item.resource_type, item.resource_id, status, remark)
      }
    }
    ElMessage.success(AUDIT_RESULT_LABEL[status] || '操作成功')
    await loadApprovalItems()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    auditingId.value = null
  }
}

// ==================== Agent chat ====================
function toggleAgentPanel() {
  agentPanelVisible.value = !agentPanelVisible.value
}

function sendAgentMessage() {
  const text = agentInput.value.trim()
  if (!text) return
  agentMessages.value.push({ role: 'user', text })
  agentInput.value = ''

  // Mock AI response
  setTimeout(() => {
    if (text.includes('统计')) {
      agentMessages.value.push({
        role: 'ai',
        text: '当前系统共有 33 名用户：超级管理员 1 名，部门管理员 3 名，普通用户 28 名，安全审计员 1 名。刑侦支队用户数最多（4人），网安支队技能授权数最多（6个技能）。',
      })
    } else if (text.includes('审批') || text.includes('待审批')) {
      agentMessages.value.push({
        role: 'ai',
        text: `当前有 ${approvalCount.value} 条待审批申请：3 条部门管理员发起的一级审核申请，1 条普通用户发起且经部门管理员初审通过的二级终审申请。建议优先处理二级终审。`,
      })
    } else if (text.includes('配额')) {
      agentMessages.value.push({
        role: 'ai',
        text: '部门配额使用情况：刑侦支队 4/20（20%），治安大队 3/15（20%），网安支队 3/10（30%）。目前配额均充足，无需调整。',
      })
    } else {
      agentMessages.value.push({
        role: 'ai',
        text: '收到您的问题，我来帮您分析。如需进一步了解权限配置、部门管理或审批流程，请随时告诉我。',
      })
    }
  }, 800)
}

function askSuggested(text: string) {
  agentInput.value = text
  sendAgentMessage()
}

// 切换到审批 tab 时自动加载
watch(activeMgmtTab, (tab) => {
  if (tab === 'approval') {
    loadApprovalItems()
    // 部门管理员：自动加载本部门用户列表到筛选下拉
    if (!isSuperAdmin.value) {
      const deptId = getCurrentDeptId()
      if (deptId) onApprovalDeptChange(deptId)
    }
  }
})

onMounted(() => {
  loadDepartments()
  loadModels()
  if (activeMgmtTab.value === 'approval') loadApprovalItems()
})
</script>

<template>
  <div class="ds-page-wrapper ds-page">
    <!-- ==================== Layout: Left Content + Right Agent Panel ==================== -->
    <div class="ds-layout-split">
      <!-- Left Content -->
      <div class="ds-layout-left">
        <div class="ds-page-container">

        <!-- ==================== Page Title + Agent Toggle ==================== -->
        <div class="ds-page-title-row">
          <h1 class="ds-page-title">安全管理</h1>
          <!-- 安全管理智能体按钮暂时屏蔽 -->
          <!-- <button class="ds-agent-toggle" @click="toggleAgentPanel">
            <span v-html="'&#127758;'" style="font-size:14px;"></span>
            安全管理智能体
          </button> -->
        </div>

        <!-- ==================== Management Tabs ==================== -->
        <nav class="ds-mgmt-tabs">
          <button
            class="ds-mgmt-tab"
            :class="{ active: activeMgmtTab === 'roles' }"
            @click="activeMgmtTab = 'roles'"
          >
            角色权限
          </button>
          <button
            class="ds-mgmt-tab"
            :class="{ active: activeMgmtTab === 'dept' }"
            @click="activeMgmtTab = 'dept'"
          >
            部门管理
          </button>
          <button
            class="ds-mgmt-tab"
            :class="{ active: activeMgmtTab === 'approval' }"
            @click="activeMgmtTab = 'approval'"
          >
            待我审批
            <span v-if="approvalCount > 0" class="ds-approval-badge">{{ approvalCount }}</span>
          </button>
          <button
            class="ds-mgmt-tab"
            :class="{ active: activeMgmtTab === 'models' }"
            @click="activeMgmtTab = 'models'"
          >
            模型管理
          </button>
        </nav>
        <!-- ===== Panel: 角色权限 ===== -->
        <div v-show="activeMgmtTab === 'roles'">
          <div class="ds-role-cards">
            <!-- 超级管理员 -->
            <div class="ds-role-card">
              <div class="ds-role-header">
                <div class="ds-role-icon" style="background: #c62828; color: #fff;">&#128081;</div>
                <div>
                  <div class="ds-role-name">超级管理员</div>
                  <div class="ds-role-count">1 名</div>
                </div>
              </div>
              <ul class="ds-role-perms">
                <li>定义管理"部门"和"部门管理员"</li>
                <li>审核部门管理员发起的审核申请（对部门管理员初审通过的发布申请进行二级终审）</li>
                <li>分配部门可注册普通用户数量</li>
                <li>为所有用户分配"部门管理员""普通用户""安全审计员"角色权限，可为部门成员分配多个角色权限</li>
              </ul>
            </div>
            <!-- 部门管理员 -->
            <div class="ds-role-card">
              <div class="ds-role-header">
                <div class="ds-role-icon" style="background: #1565c0; color: #fff;">&#128737;</div>
                <div>
                  <div class="ds-role-name">部门管理员</div>
                  <div class="ds-role-count">3 名</div>
                </div>
              </div>
              <ul class="ds-role-perms">
                <li>审核本部门"普通用户"的技能、MCP服务、数字警员的发布上架申请，并进一步向超级管理员发起审核申请（一级初审）</li>
                <li>为本部门用户授权/取消"数字警员"或skill或MCP服务的使用权限</li>
                <li>在配额内为本部门新增成员</li>
                <li>为本部门用户分配"普通用户"角色权限</li>
              </ul>
            </div>
            <!-- 普通用户 -->
            <div class="ds-role-card">
              <div class="ds-role-header">
                <div class="ds-role-icon" style="background: #2e7d32; color: #fff;">&#128100;</div>
                <div>
                  <div class="ds-role-name">普通用户</div>
                  <div class="ds-role-count">28 名</div>
                </div>
              </div>
              <ul class="ds-role-perms">
                <li>创建或修改skill后可直接上传至【我的技能】页面直接使用</li>
                <li>发布上架【我的技能】到【通用技能】需申请，部门管理员审核 + 超级管理员审核后才能发布上架</li>
                <li>对【我的技能】页面上的skill可自行修改或删除</li>
                <li>注册MCP服务到【我的MCP服务】页面直接使用</li>
                <li>发布上架【我的MCP服务】到【通用MCP服务】需申请，部门管理员审核 + 超级管理员审核后才能发布上架</li>
                <li>对【我的MCP服务】页面上的MCP服务可自行修改或删除</li>
                <li>定义数字警员到【我的数字警员】页面直接使用</li>
                <li>发布上架【我的数字警员】到【通用数字警员】需申请，部门管理员审核 + 超级管理员审核后才能发布上架</li>
                <li>对【我的数字警员】页面上的数字警员可自行修改或删除</li>
                <li>申请使用【通用技能】页面上的未授权技能</li>
                <li>申请使用【通用MCP服务】页面上的未授权MCP服务</li>
                <li>申请使用【通用数字警员】页面上的未授权数字警员</li>
                <li>可使用已授权的skill、MCP服务和"数字警员"</li>
              </ul>
            </div>
            <!-- 安全审计员 -->
            <div class="ds-role-card">
              <div class="ds-role-header">
                <div class="ds-role-icon" style="background: #e65100; color: #fff;">&#128203;</div>
                <div>
                  <div class="ds-role-name">安全审计员</div>
                  <div class="ds-role-count">1 名</div>
                </div>
              </div>
              <ul class="ds-role-perms">
                <li>查看"超级管理员"所有操作记录</li>
                <li>查看"部门管理员"所有操作记录</li>
                <li>查看"普通用户"所有操作记录</li>
                <li>查看普通用户提过的问题</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- ===== Panel: 部门管理 ===== -->
        <div v-show="activeMgmtTab === 'dept'">
          <!-- Toolbar -->
          <div class="ds-dept-toolbar">
            <button class="ds-btn-primary" @click="openAddDeptDialog()">+ 新增部门</button>
            <span style="flex: 1;"></span>
            <div class="ds-search-group">
              <input
                v-model="deptSearch"
                class="ds-search-input"
                type="text"
                placeholder="搜索部门名称..."
              />
              <button class="ds-btn-primary">搜索</button>
            </div>
          </div>

          <!-- Department Table -->
          <div class="ds-table-wrap">
            <table class="ds-table">
              <thead>
                <tr>
                  <th>部门名称</th>
                  <th>部门编码</th>
                  <th>部门管理员</th>
                  <th>用户配额</th>
                  <th>已用配额</th>
                  <th>已授权Skill</th>
                  <th>已授权MCP</th>
                  <th>已授权数字警员</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredDepartments.length === 0">
                  <td colspan="9" class="ds-empty-cell">暂无部门数据，请新增或导入部门</td>
                </tr>
                <tr v-for="dept in filteredDepartments" :key="dept.id">
                  <td class="ds-dept-name">{{ dept.dept_name }}</td>
                  <td>{{ dept.dept_code }}</td>
                  <td>{{ dept.admin_name || '-' }}</td>
                  <td>{{ dept.user_quota }}</td>
                  <td>{{ dept.used_quota }}</td>
                  <td>{{ (dept as any).authorized_skill_count ?? '-' }}</td>
                  <td>{{ (dept as any).authorized_mcp_count ?? '-' }}</td>
                  <td>{{ (dept as any).authorized_officer_count ?? '-' }}</td>
                  <td class="ds-dept-actions">
                    <button class="ds-btn-mini-primary" @click="openEditDeptDialog(dept)">编辑</button>
                    <button class="ds-btn-mini-outline" @click="openMemberManageDialog(dept)">成员</button>
                    <button class="ds-btn-mini-danger" @click="deleteDept(dept.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ===== Panel: 待我审批 ===== -->
        <div v-show="activeMgmtTab === 'approval'">
          <div class="ds-approval-panel">
            <h3>待我审批</h3>
            <p class="ds-approval-desc">
              {{ isSuperAdmin ? '作为超级管理员，您需对部门管理员初审通过的资源进行二级终审（上架/下架）。' : '作为部门管理员，您需对本部门提交的资源进行一级初审（发布/下架）。' }}
            </p>

            <!-- 筛选芯片 -->
            <div class="ds-toolbar" style="margin-bottom: 16px;">
              <div class="audit-chip-group">
                <button
                  v-for="rt in approvalResourceTypeOptions"
                  :key="rt.key"
                  class="audit-chip"
                  :class="{ 'audit-chip--active': approvalResourceType === rt.key }"
                  @click="switchResourceType(rt.key)"
                >{{ rt.label }}</button>
              </div>
              <div class="audit-chip-group">
                <button
                  v-for="at in approvalAuditTypeOptions"
                  :key="at.key"
                  class="audit-chip"
                  :class="{ 'audit-chip--active': approvalAuditType === at.key }"
                  @click="switchAuditType(at.key)"
                >{{ at.label }}</button>
              </div>
            </div>

            <!-- 部门/用户联动筛选（外置条件） -->
            <div class="ds-toolbar" style="margin-bottom: 12px; gap: 10px;">
              <!-- 超管：部门下拉（可选） -->
              <el-select
                v-if="isSuperAdmin"
                v-model="approvalFilterDeptId"
                placeholder="全部部门"
                clearable
                filterable
                style="width: 180px"
                @change="onApprovalDeptChange"
                @clear="onApprovalFilterChange()"
              >
                <el-option
                  v-for="d in approvalDeptOptions"
                  :key="d.id"
                  :label="d.dept_name"
                  :value="d.id"
                />
              </el-select>
              <!-- 部门管理员可看本部门下用户筛选 -->
              <el-select
                v-model="approvalFilterUserId"
                placeholder="全部用户"
                clearable
                filterable
                style="width: 180px"
                :loading="approvalFilterUsersLoading"
                :disabled="isSuperAdmin && !approvalFilterDeptId"
                @change="onApprovalFilterChange()"
                @clear="onApprovalFilterChange()"
              >
                <el-option
                  v-for="u in approvalFilterDeptUsers"
                  :key="u.id"
                  :label="`${u.name} (ID:${u.id})`"
                  :value="u.id"
                />
              </el-select>
              <span v-if="isSuperAdmin && !approvalFilterDeptId" style="font-size:11px;color:var(--ds-text-subtle);">
                先选部门再选用户
              </span>
              <span v-if="!isSuperAdmin && approvalFilterDeptUsers.length === 0" style="font-size:11px;color:var(--ds-text-subtle);">
                加载本部门用户中...
              </span>
            </div>

            <!-- 加载 -->
            <div v-if="approvalLoading" class="ds-empty">加载中...</div>

            <!-- 空 -->
            <div v-else-if="approvalItems.length === 0" class="ds-empty">暂无待审批申请</div>

            <!-- 审批卡片列表 -->
            <div v-else>
              <div
                v-for="item in approvalItems"
                :key="`${item.resource_type}-${item.resource_id}-${item.audit_type}`"
                class="ds-approval-card"
              >
                <div class="ds-approval-body" style="flex:1;">
                  <div class="ds-approval-title">
                    <span class="ds-perm-chip" :class="`ds-perm-chip--${item.resource_type}`" style="margin-right:8px;">
                      {{ resourceTypeLabel(item.resource_type) }}
                    </span>
                    {{ item.resource_name }}
                    <el-tag size="small" :type="item.audit_type === 'create' ? 'primary' : 'warning'" style="margin-left:8px;">
                      {{ auditTypeLabel(item.audit_type) }}
                    </el-tag>
                  </div>
                  <div class="ds-approval-meta">
                    <span>编码：<code>{{ item.resource_code }}</code></span>
                    <span>申请人：{{ item.creator_name }}</span>
                    <span>时间：{{ item.create_time }}</span>
                    <template v-if="isSuperAdmin && item.dept_name">
                      <span>部门：{{ item.dept_name }}</span>
                    </template>
                  </div>
                </div>
                <div class="ds-approval-actions">
                  <button
                    class="ds-btn-approve"
                    :disabled="auditingId === `${item.resource_type}-${item.resource_id}-${item.audit_type}`"
                    @click="approveItem(item)"
                  >通过</button>
                  <button
                    class="ds-btn-reject"
                    :disabled="auditingId === `${item.resource_type}-${item.resource_id}-${item.audit_type}`"
                    @click="rejectItem(item)"
                  >驳回</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== Panel: 模型管理 ===== -->
        <div v-show="activeMgmtTab === 'models'">
          <!-- Toolbar -->
          <div class="ds-dept-toolbar">
            <button class="ds-btn-primary" @click="openModelCreateDialog()">
              <el-icon :size="14"><Plus /></el-icon>
              新增模型
            </button>
            <span style="flex: 1;"></span>
            <div class="ds-search-group">
              <input
                v-model="modelKeyword"
                class="ds-search-input"
                type="text"
                placeholder="搜索模型名称、标识或接口地址..."
              />
              <button class="ds-btn-outline" :disabled="modelLoading" @click="loadModels()">
                <el-icon :size="14"><Refresh /></el-icon>
              </button>
            </div>
          </div>

          <!-- Model Table -->
          <div class="ds-table-wrap">
            <div v-if="modelLoading" class="ds-empty">加载中...</div>
            <div v-else-if="filteredModels.length === 0" class="ds-empty">暂无模型数据</div>
            <table v-else class="ds-table">
              <thead>
                <tr>
                  <th>模型名称</th>
                  <th>模型标识</th>
                  <th>接口地址</th>
                  <th>超时/重试</th>
                  <th>思考模式</th>
                  <th>管理员可见</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredModels" :key="row.name">
                  <td class="ds-dept-name">{{ row.name }}</td>
                  <td>{{ row.model || '-' }}</td>
                  <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ row.apibase || '-' }}</td>
                  <td>
                    <span style="font-size:12px;color:var(--ds-text-secondary);">
                      重试{{ row.max_retries ?? '-' }} / 连接{{ row.connect_timeout ?? '-' }}s / 读取{{ row.read_timeout ?? '-' }}s
                    </span>
                  </td>
                  <td>
                    <span :class="row.enable_thinking ? 'ds-tag-success' : 'ds-tag-info'">
                      {{ row.enable_thinking ? '开启' : '关闭' }}
                    </span>
                  </td>
                  <td>
                    <span :class="row.admin ? 'ds-tag-warning' : 'ds-tag-info'">
                      {{ row.admin ? '是' : '否' }}
                    </span>
                  </td>
                  <td class="ds-dept-actions">
                    <button class="ds-btn-mini-primary" @click="openModelEditDialog(row)">编辑</button>
                    <button class="ds-btn-mini-danger" @click="handleModelDelete(row)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        </div><!-- .ds-page-container -->
      </div>

      <!-- Right: AI Agent Chat Panel -->
      <div class="ds-layout-right" :class="{ collapsed: !agentPanelVisible }">
        <div class="ds-agent-header">
          <div class="ds-agent-avatar">管</div>
          <div>
            <div class="ds-agent-title">安全管理智能体</div>
            <div class="ds-agent-sub">7x24 用户权限管理助手</div>
          </div>
          <button class="ds-agent-close" @click="toggleAgentPanel">&times;</button>
        </div>
        <div class="ds-agent-messages">
          <div
            v-for="(msg, idx) in agentMessages"
            :key="idx"
            class="ds-agent-msg"
            :class="msg.role"
          >
            <div class="ds-agent-msg-avatar">{{ msg.role === 'ai' ? '管' : '我' }}</div>
            <div class="ds-agent-msg-bubble">
              {{ msg.text }}
              <div v-if="idx === 0" class="ds-sq-chips">
                <span class="ds-sq-chip" @click="askSuggested('各部门用户数量统计')">各部门用户数量统计</span>
                <span class="ds-sq-chip" @click="askSuggested('哪些用户权限待审批')">哪些用户权限待审批</span>
                <span class="ds-sq-chip" @click="askSuggested('部门配额使用情况')">部门配额使用情况</span>
              </div>
            </div>
          </div>
        </div>
        <div class="ds-agent-input">
          <input
            v-model="agentInput"
            type="text"
            placeholder="输入问题，按 Enter 发送..."
            @keydown.enter.exact.prevent="sendAgentMessage"
          />
          <button @click="sendAgentMessage">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== Department Add/Edit Dialog ==================== -->
    <el-dialog
      v-model="deptDialogVisible"
      :title="deptDialogTitle"
      width="680px"
      align-center
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
      class="ds-modal"
    >
      <div class="ds-form-grid">
        <!-- Row 1 -->
        <div class="ds-form-group">
          <label class="ds-form-label">部门名称 <span class="ds-required">*</span></label>
          <input v-model="deptForm.dept_name" type="text" placeholder="例如：刑侦支队" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">部门编码 <span class="ds-required">*</span></label>
          <input v-model="deptForm.dept_code" type="text" placeholder="例如：dept001" />
        </div>

        <!-- Row 2 -->
        <div class="ds-form-group">
          <label class="ds-form-label">可注册配额 <span class="ds-required">*</span></label>
          <input v-model.number="deptForm.user_quota" type="number" placeholder="20" min="1" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">已授权Skill数</label>
          <input v-model.number="deptForm.authorized_skill_count" type="number" placeholder="0" min="0" />
        </div>

        <!-- Row 3 -->
        <div class="ds-form-group">
          <label class="ds-form-label">已授权MCP服务数</label>
          <input v-model.number="deptForm.authorized_mcp_count" type="number" placeholder="0" min="0" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">已授权数字警员数</label>
          <input v-model.number="deptForm.authorized_officer_count" type="number" placeholder="0" min="0" />
        </div>

        <!-- Row 5: Full-width remark -->
        <div class="ds-form-group full">
          <label class="ds-form-label">备注</label>
          <textarea v-model="deptForm.remark" placeholder="可选，部门备注信息" rows="3"></textarea>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <button class="ds-btn-cancel" @click="deptDialogVisible = false">取消</button>
          <button class="ds-btn-confirm" @click="saveDept">保存</button>
        </span>
      </template>
    </el-dialog>

    <!-- ==================== Member Manage Dialog (standalone) ==================== -->
    <el-dialog
      v-model="memberManageDialogVisible"
      :title="`部门成员管理 — ${memberManageDeptName}`"
      width="720px"
      align-center
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
      class="ds-modal"
    >
      <div class="ds-member-toolbar">
        <button class="ds-btn-primary" @click="openMemberAddDialog()">+ 新增成员</button>
      </div>

      <div v-if="memberLoading" class="ds-empty">加载中...</div>
      <div v-else class="ds-table-wrap">
        <table class="ds-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>账号（身份证号）</th>
              <th>手机号</th>
              <th>角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="deptMembers.length === 0">
              <td colspan="5" class="ds-empty-cell">暂无成员，请新增</td>
            </tr>
            <tr v-for="member in deptMembers" :key="member.id">
              <td>{{ member.name }}</td>
              <td>{{ member.id_card || member.user_account || '-' }}</td>
              <td>{{ member.phone || '-' }}</td>
              <td>{{ member.roles?.join('、') || '-' }}</td>
              <td class="ds-dept-actions">
                <button class="ds-btn-mini-primary" @click="openMemberEditDialog(member)">修改</button>
                <button class="ds-btn-mini-danger" @click="removeMember(member)">移除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <button class="ds-btn-cancel" @click="memberManageDialogVisible = false">关闭</button>
        </span>
      </template>
    </el-dialog>

    <!-- ==================== Member Add Dialog (form to create new user) ==================== -->
    <el-dialog
      v-model="memberAddDialogVisible"
      title="添加成员"
      width="520px"
      align-center
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
      class="ds-modal"
    >
      <!-- 角色选择 -->
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:600;color:var(--ds-text);display:block;margin-bottom:8px;">
          分配角色 <span style="color:var(--ds-text-secondary);font-weight:400;">（{{ isDeptAdminOnly ? '部门管理员仅可分配普通用户' : '可多选' }}）</span>
        </label>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <label
            v-for="role in availableRoles"
            :key="role.id"
            class="ds-role-check-label"
            :class="{ 'ds-role-check--disabled': isDeptAdminOnly && role.id !== 3 }"
            :style="{
              cursor: (isDeptAdminOnly && role.id !== 3) ? 'not-allowed' : 'pointer',
              opacity: (isDeptAdminOnly && role.id !== 3) ? 0.5 : 1,
            }"
          >
            <input
              type="checkbox"
              :checked="selectedRoleIds.has(role.id)"
              :disabled="isDeptAdminOnly && role.id !== 3"
              @change="toggleRoleSelection(role.id)"
              style="accent-color:var(--ds-primary);"
            />
            <span>{{ role.label }}</span>
          </label>
        </div>
      </div>

      <!-- 用户信息表单 -->
      <div class="ds-form-grid">
        <div class="ds-form-group">
          <label class="ds-form-label">姓名 <span class="ds-required">*</span></label>
          <input v-model="memberAddForm.name" type="text" placeholder="请输入姓名" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">身份证号 <span class="ds-required">*</span></label>
          <input v-model="memberAddForm.idCard" type="text" placeholder="请输入身份证号" />
        </div>
        <div class="ds-form-group full">
          <label class="ds-form-label">手机号 <span class="ds-required">*</span></label>
          <input v-model="memberAddForm.phone" type="text" placeholder="请输入手机号" />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <button class="ds-btn-cancel" @click="memberAddDialogVisible = false">取消</button>
          <button class="ds-btn-confirm" :disabled="memberAddLoading" @click="addMemberToDept()">添加</button>
        </span>
      </template>
    </el-dialog>

    <!-- ==================== Member Edit Dialog (update user info & roles) ==================== -->
    <el-dialog
      v-model="memberEditDialogVisible"
      title="修改成员信息"
      width="520px"
      align-center
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
      class="ds-modal"
    >
      <!-- 角色选择 -->
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:600;color:var(--ds-text);display:block;margin-bottom:8px;">
          角色权限 <span style="color:var(--ds-text-secondary);font-weight:400;">（{{ isDeptAdminOnly ? '部门管理员仅可分配普通用户' : '可多选' }}）</span>
        </label>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <label
            v-for="role in availableRoles"
            :key="role.id"
            class="ds-role-check-label"
            :class="{ 'ds-role-check--disabled': isDeptAdminOnly && role.id !== 3 }"
            :style="{
              cursor: (isDeptAdminOnly && role.id !== 3) ? 'not-allowed' : 'pointer',
              opacity: (isDeptAdminOnly && role.id !== 3) ? 0.5 : 1,
            }"
          >
            <input
              type="checkbox"
              :checked="editSelectedRoleIds.has(role.id)"
              :disabled="isDeptAdminOnly && role.id !== 3"
              @change="toggleEditRoleSelection(role.id)"
              style="accent-color:var(--ds-primary);"
            />
            <span>{{ role.label }}</span>
          </label>
        </div>
      </div>

      <!-- 用户信息表单 -->
      <div class="ds-form-grid">
        <div class="ds-form-group">
          <label class="ds-form-label">姓名 <span class="ds-required">*</span></label>
          <input v-model="memberEditForm.name" type="text" placeholder="请输入姓名" />
        </div>
        <div class="ds-form-group full">
          <label class="ds-form-label">手机号</label>
          <input v-model="memberEditForm.phone" type="text" placeholder="请输入手机号" />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <button class="ds-btn-cancel" @click="memberEditDialogVisible = false">取消</button>
          <button class="ds-btn-confirm" :disabled="memberEditLoading" @click="saveMemberEdit()">保存</button>
        </span>
      </template>
    </el-dialog>

    <!-- ==================== Model Add/Edit Dialog ==================== -->
    <el-dialog
      v-model="modelDialogVisible"
      :title="modelDialogMode === 'create' ? '新增模型' : '编辑模型'"
      width="620px"
      align-center
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
      class="ds-modal"
    >
      <div class="ds-form-grid">
        <div class="ds-form-group">
          <label class="ds-form-label">模型名称 <span class="ds-required">*</span></label>
          <input v-model="modelForm.name" type="text" :disabled="modelDialogMode === 'edit'" placeholder="例如 deepseek-v4" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">API Key</label>
          <input v-model="modelForm.apikey" type="text" placeholder="可为空" />
        </div>
        <div class="ds-form-group full">
          <label class="ds-form-label">接口地址</label>
          <input v-model="modelForm.apibase" type="text" placeholder="模型服务 chat completions 地址" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">模型标识</label>
          <input v-model="modelForm.model" type="text" placeholder="服务端实际 model 字段，可为空" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">最大重试次数</label>
          <input v-model.number="modelForm.max_retries" type="number" :min="0" :max="20" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">连接超时（秒）</label>
          <input v-model.number="modelForm.connect_timeout" type="number" :min="0" :max="600" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">读取超时（秒）</label>
          <input v-model.number="modelForm.read_timeout" type="number" :min="0" :max="3600" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">思考模式</label>
          <el-switch v-model="modelForm.enable_thinking" active-text="开启" inactive-text="关闭" />
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">管理员可见</label>
          <el-switch v-model="modelForm.admin" active-text="是" inactive-text="否" />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <button class="ds-btn-cancel" @click="modelDialogVisible = false">取消</button>
          <button class="ds-btn-confirm" :disabled="modelSaving" @click="handleModelSave">保存</button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* Minimal scoped styles — everything else comes from design-tokens.css */

.ds-page-wrapper {
  padding: 24px;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ds-layout-split {
  flex: 1;
  min-height: 0;
}

/* Form inputs inside dialog */
:deep(.el-dialog__body) .ds-form-group input,
:deep(.el-dialog__body) .ds-form-group select,
:deep(.el-dialog__body) .ds-form-group textarea {
  width: 100%;
  padding: 9px 13px;
  border: 1px solid var(--ds-border, #d9dde4);
  border-radius: 7px;
  font-size: 14px;
  font-family: var(--ds-font, inherit);
  background: var(--ds-card, #fff);
  color: var(--ds-text, #1a1a1a);
  transition: border-color 0.2s ease;
}

:deep(.el-dialog__body) .ds-form-group input:focus,
:deep(.el-dialog__body) .ds-form-group select:focus,
:deep(.el-dialog__body) .ds-form-group textarea:focus {
  outline: none;
  border-color: var(--ds-primary-light, #2a5aa0);
}

.ds-member-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ds-role-check-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ds-text);
  user-select: none;
}

.ds-role-check--disabled {
  opacity: 0.5;
}
</style>
