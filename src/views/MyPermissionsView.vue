<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import {
  getStoredUserProfile,
  isAdminAccount,
  isDepartmentAdmin,
  isSecurityAuditor,
} from '@/utils/auth'
import { authManageApi } from '@/api/authManage'
import type { AuthResource } from '@/api/authManage'
import { getStatus, AuditStatusLabel } from '@/utils/auditStatus'

// ================================================================
// User state
// ================================================================
const profile = computed(() => getStoredUserProfile())

const userRole = computed(() => {
  if (isAdminAccount()) return '超级管理员'
  if (isSecurityAuditor()) return '安全审计员'
  if (isDepartmentAdmin()) return '部门管理员'
  return '普通用户'
})

const userDisplayName = computed(() => profile.value?.name || 'admin')
const userDepartment = computed(() => profile.value?.company || profile.value?.department || '平台总控')
const userAvatarChar = computed(() => userDisplayName.value.charAt(0))

const isReadOnly = computed(() => isSecurityAuditor())

// ================================================================
// Mock permission data — varies by role
// ================================================================
const accessiblePageCount = computed(() => {
  if (isAdminAccount()) return 9
  if (isSecurityAuditor()) return 2
  if (userRole.value === '部门管理员') return 6
  return 4
})

const authorizedResourceCount = computed(() => {
  if (isAdminAccount()) return 13
  if (isSecurityAuditor()) return 0
  if (userRole.value === '部门管理员') return 7
  return 3
})

const hasDeptMgmt = computed(() => isAdminAccount() || userRole.value === '部门管理员')
const hasResourceApproval = computed(() => isAdminAccount() || userRole.value === '部门管理员')

// ---- Authorized resource chips ----
interface ResourceChip {
  label: string
  type: 'skill' | 'mcp' | 'officer'
  disabled?: boolean
}

const resourceChips = computed<ResourceChip[]>(() => {
  if (isSecurityAuditor()) return []

  if (isAdminAccount()) {
    return [
      { label: '人员信息核查', type: 'skill' },
      { label: '车辆轨迹追踪', type: 'skill' },
      { label: '案件智能研判', type: 'skill' },
      { label: '情报汇总分析', type: 'skill' },
      { label: '关系网络分析', type: 'skill' },
      { label: '重点区域监控', type: 'skill' },
      { label: 'MCP·户籍查询', type: 'mcp' },
      { label: 'MCP·卡口数据', type: 'mcp' },
      { label: 'MCP·GIS地图', type: 'mcp' },
      { label: 'MCP·警情数据', type: 'mcp' },
      { label: '警员·人员核查员', type: 'officer' },
      { label: '警员·车辆分析员', type: 'officer' },
      { label: '警员·案件研判员', type: 'officer' },
    ]
  }

  if (userRole.value === '部门管理员') {
    return [
      { label: '人员信息核查', type: 'skill' },
      { label: '车辆轨迹追踪', type: 'skill' },
      { label: '案件智能研判', type: 'skill' },
      { label: 'MCP·户籍查询', type: 'mcp' },
      { label: 'MCP·卡口数据', type: 'mcp' },
      { label: '警员·人员核查员', type: 'officer' },
      { label: '警员·车辆分析员', type: 'officer' },
      { label: '情报汇总分析', type: 'skill', disabled: true },
    ]
  }

  return [
    { label: '人员信息核查', type: 'skill' },
    { label: 'MCP·户籍查询', type: 'mcp' },
    { label: '警员·人员核查员', type: 'officer' },
    { label: '案件智能研判', type: 'skill', disabled: true },
    { label: '车辆轨迹追踪', type: 'skill', disabled: true },
  ]
})

// ---- Application history table ----
interface ApplicationRow {
  time: string
  resourceType: string
  resourceName: string
  reason: string
  statusTag: string
}

const applicationHistory = computed<ApplicationRow[]>(() => {
  if (isAdminAccount() || isSecurityAuditor()) {
    return [
      { time: '—', resourceType: '—', resourceName: '—', reason: '—', statusTag: '无申请记录' },
    ]
  }

  if (userRole.value === '部门管理员') {
    return [
      {
        time: '2026-06-19 16:45',
        resourceType: '数字警员·发布申请',
        resourceName: '情报汇总分析员',
        reason: '本部门情报研判场景',
        statusTag: 'ds-tag-pending',
      },
      {
        time: '2026-06-05 11:30',
        resourceType: 'Skill·发布申请',
        resourceName: '关系网络分析',
        reason: '团伙犯罪关系梳理',
        statusTag: 'ds-tag-approved',
      },
    ]
  }

  return [
    {
      time: '2026-06-18 10:23',
      resourceType: 'Skill·发布申请',
      resourceName: '关系网络分析',
      reason: '团伙犯罪关系梳理',
      statusTag: 'ds-tag-pending',
    },
    {
      time: '2026-06-15 14:30',
      resourceType: '数字警员·发布申请',
      resourceName: '反诈劝阻员',
      reason: '反诈预警劝阻场景',
      statusTag: 'ds-tag-pending',
    },
    {
      time: '2026-06-10 14:45',
      resourceType: '数字警员·发布申请',
      resourceName: '车辆轨迹分析员',
      reason: '交通肇事逃逸研判',
      statusTag: 'ds-tag-approved',
    },
    {
      time: '2026-05-28 09:12',
      resourceType: 'MCP服务·发布申请',
      resourceName: '卡口数据服务',
      reason: '车辆轨迹追踪辅助',
      statusTag: 'ds-tag-rejected',
    },
    {
      time: '2026-06-20 09:05',
      resourceType: '授权申请',
      resourceName: '案件智能研判',
      reason: '侦办盗窃案需要',
      statusTag: 'ds-tag-pending',
    },
  ]
})

// ================================================================
// Application status label
// ================================================================
function statusLabel(tag: string): string {
  switch (tag) {
    case 'ds-tag-approved':
      return '已通过'
    case 'ds-tag-pending':
      return '待审批'
    case 'ds-tag-rejected':
      return '已驳回'
    default:
      return tag
  }
}

// ================================================================
// 全员资源总览（仅超级管理员可见）
// ================================================================
const resourcesLoading = ref(false)
const resourcesList = ref<AuthResource[]>([])
const resourcesKeyword = ref('')
const resourcesTypeFilter = ref('')
const resourcesPage = ref(1)
const resourcesLimit = ref(20)
const resourcesTotal = ref(0)

async function fetchResources() {
  if (!isAdminAccount()) return
  resourcesLoading.value = true
  try {
    const params: Record<string, unknown> = {
      page: resourcesPage.value,
      limit: resourcesLimit.value,
    }
    if (resourcesKeyword.value) params.keyword = resourcesKeyword.value
    if (resourcesTypeFilter.value) params.resource_type = resourcesTypeFilter.value
    const data = await authManageApi.getResources(params as Parameters<typeof authManageApi.getResources>[0])
    resourcesList.value = data
    // API 返回扁平数组，无 total，用 length 估算分页
    resourcesTotal.value = data.length < resourcesLimit.value
      ? (resourcesPage.value - 1) * resourcesLimit.value + data.length
      : resourcesPage.value * resourcesLimit.value + 1
  } catch {
    resourcesList.value = []
  } finally {
    resourcesLoading.value = false
  }
}

function handleResourcesSearch() {
  resourcesPage.value = 1
  fetchResources()
}

function resourceTypeLabel(type: string): string {
  switch (type) {
    case 'skill': return '技能'
    case 'mcp': return 'MCP服务'
    case 'officer': return '数字警员'
    default: return type
  }
}

function resourceStatusLabel(item: AuthResource): string {
  return AuditStatusLabel[getStatus(item)] || '未知'
}

watch([resourcesPage], () => {
  fetchResources()
})

onMounted(() => {
  if (isAdminAccount()) fetchResources()
})
</script>

<template>
  <div class="ds-page-wrapper ds-page">
    <div class="ds-page-container--narrow">
      <!-- Page title -->
      <div class="ds-page-title">我的权限</div>

      <!-- User info panel -->
      <div class="ds-myperm-panel">
        <div class="ds-myperm-head">
          <div class="ds-myperm-avatar">{{ userAvatarChar }}</div>
          <div>
            <div class="ds-myperm-name">
              {{ userDisplayName }}
              <span class="ds-myperm-role">（{{ userRole }}）</span>
            </div>
            <div class="ds-myperm-meta">
              所属：{{ userDepartment }}　|　{{ isReadOnly ? '只读模式' : '可操作模式' }}
            </div>
          </div>
        </div>
        <div class="ds-myperm-grid">
          <div class="ds-myperm-stat">
            <div class="ds-myperm-num">{{ accessiblePageCount }}</div>
            <div class="ds-myperm-lbl">可访问页面</div>
          </div>
          <div class="ds-myperm-stat">
            <div class="ds-myperm-num">{{ authorizedResourceCount }}</div>
            <div class="ds-myperm-lbl">已授权资源</div>
          </div>
          <div class="ds-myperm-stat">
            <div class="ds-myperm-num">{{ hasDeptMgmt ? '是' : '否' }}</div>
            <div class="ds-myperm-lbl">部门管理权</div>
          </div>
          <div class="ds-myperm-stat">
            <div class="ds-myperm-num">{{ hasResourceApproval ? '是' : '否' }}</div>
            <div class="ds-myperm-lbl">资源审批权</div>
          </div>
        </div>
      </div>

      <!-- Authorized resources panel -->
      <div class="ds-myperm-panel">
        <h3>已授权资源清单</h3>

        <div v-if="isSecurityAuditor()" class="ds-empty">
          审计员角色不持有业务资源授权，仅可只读访问审计日志。
        </div>

        <div v-else class="ds-myperm-list">
          <span
            v-for="(chip, idx) in resourceChips"
            :key="idx"
            class="ds-perm-chip"
            :class="{
              'ds-perm-chip--skill': chip.type === 'skill' && !chip.disabled,
              'ds-perm-chip--mcp': chip.type === 'mcp' && !chip.disabled,
              'ds-perm-chip--officer': chip.type === 'officer' && !chip.disabled,
              'ds-perm-chip--disabled': chip.disabled,
            }"
          >
            {{ chip.disabled ? `${chip.label}（未授权）` : chip.label }}
          </span>
        </div>
      </div>

      <!-- Application history table -->
      <div class="ds-myperm-panel">
        <h3>权限申请记录</h3>
        <div class="ds-table-wrap">
          <table class="ds-table">
            <thead>
              <tr>
                <th>申请时间</th>
                <th>资源类型</th>
                <th>资源名称</th>
                <th>申请理由</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in applicationHistory" :key="idx">
                <td>{{ row.time }}</td>
                <td>{{ row.resourceType }}</td>
                <td>{{ row.resourceName }}</td>
                <td>{{ row.reason }}</td>
                <td>
                  <span
                    v-if="row.statusTag === '无申请记录'"
                    style="color: var(--ds-text-subtle)"
                  >无申请记录</span>
                  <span
                    v-else
                    :class="row.statusTag"
                  >{{ statusLabel(row.statusTag) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ==================== 全员资源总览（仅超级管理员可见） ==================== -->
      <div v-if="isAdminAccount()" class="ds-myperm-panel">
        <h3>全员资源总览</h3>

        <!-- 筛选栏 -->
        <div class="ds-toolbar" style="margin-bottom: 12px;">
          <input
            v-model="resourcesKeyword"
            type="text"
            class="ds-form-input"
            style="width: 200px;"
            placeholder="搜索资源名称/编码..."
            @keyup.enter="handleResourcesSearch"
          />
          <el-select v-model="resourcesTypeFilter" style="width: 140px" @change="handleResourcesSearch">
            <el-option label="全部类型" value="" />
            <el-option label="技能" value="skill" />
            <el-option label="MCP服务" value="mcp" />
            <el-option label="数字警员" value="officer" />
          </el-select>
          <button class="ds-btn-primary" @click="handleResourcesSearch">查询</button>
        </div>

        <!-- Loading -->
        <div v-if="resourcesLoading" class="ds-empty">加载中...</div>

        <!-- Empty -->
        <div v-else-if="resourcesList.length === 0" class="ds-empty">暂无资源数据</div>

        <!-- Table -->
        <div v-else class="ds-table-wrap">
          <table class="ds-table">
            <thead>
              <tr>
                <th>资源类型</th>
                <th>资源编码</th>
                <th>资源名称</th>
                <th>描述</th>
                <th>状态</th>
                <th>公开</th>
                <th>创建者</th>
                <th>创建时间</th>
                <th>所属部门</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in resourcesList" :key="`${item.resource_type}-${item.resource_id}`">
                <td style="white-space: nowrap">
                  <span class="ds-perm-chip" :class="`ds-perm-chip--${item.resource_type}`">
                    {{ resourceTypeLabel(item.resource_type) }}
                  </span>
                </td>
                <td><code>{{ item.resource_code }}</code></td>
                <td>{{ item.resource_name }}</td>
                <td>
                  <span :title="item.description" style="max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ item.description || '—' }}
                  </span>
                </td>
                <td style="white-space: nowrap">
                  <span :class="getStatus(item) === '02' ? 'ds-tag-approved' : getStatus(item) === '01' || getStatus(item) === '04' ? 'ds-tag-pending' : 'ds-tag-rejected'">
                    {{ resourceStatusLabel(item) }}
                  </span>
                </td>
                <td>{{ item.is_public ? '公开' : '私有' }}</td>
                <td>{{ item.creator_name || '—' }}</td>
                <td>{{ item.create_time || '—' }}</td>
                <td>{{ item.dept_name || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div v-if="resourcesList.length > 0" class="ds-pagination" style="margin-top: 12px; display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
          <button
            class="ds-btn-page"
            :disabled="resourcesPage === 1"
            @click="resourcesPage = Math.max(1, resourcesPage - 1)"
          >上一页</button>
          <span style="font-size: 14px; color: var(--ds-text-secondary);">第 {{ resourcesPage }} 页 / 共 {{ Math.ceil(resourcesTotal / resourcesLimit) || 1 }} 页</span>
          <button
            class="ds-btn-page"
            :disabled="resourcesPage * resourcesLimit >= resourcesTotal"
            @click="resourcesPage++"
          >下一页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped overrides handled by design-tokens.css */
</style>
