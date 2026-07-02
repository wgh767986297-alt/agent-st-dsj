<template>
  <div class="ds-page-wrapper ds-page" :class="{ 'ds-page--embedded': isEmbedded }">
    <div class="ds-page-container">
      <div class="ds-page-title">数字警员库</div>
      <p class="ds-page-desc">
        一个"数字警员"即为一个应用场景，由提示词、关联技能和MCP服务组成。普通用户可定义数字警员到【我的数字警员】直接使用；若需发布上架到【通用数字警员】供全员使用，须经部门管理员审核
        + 超级管理员审核（二级审核）通过后上架。上架后由管理员分配授权，下架后用户可自行删除。
      </p>

      <!-- Section Tabs -->
      <div class="ds-section-tabs">
        <button
          class="ds-section-tab"
          :class="{ active: activeTab === 'mine' }"
          @click="activeTab = 'mine'"
        >
          我的数字警员<span class="count">({{ mineCount }})</span>
        </button>
        <button
          class="ds-section-tab"
          :class="{ active: activeTab === 'general' }"
          @click="activeTab = 'general'"
        >
          通用数字警员<span class="count">({{ generalCount }})</span>
        </button>
      </div>

      <!-- ==================== 我的数字警员 ==================== -->
      <div class="ds-section-panel" v-show="activeTab === 'mine'">
        <div class="ds-section-head">
          <h3>
            我的数字警员<span class="ds-section-subtitle"
              >本部门/本人定义并可直接使用的数字警员</span
            >
          </h3>
          <button class="ds-btn-primary" @click="openCreateDialog">
            <el-icon :size="14"><Plus /></el-icon>
            <span>定义数字警员</span>
          </button>
        </div>
        <div class="ds-toolbar">
          <el-select v-model="currentFilter" style="width: 140px">
            <el-option label="全部状态" value="all" />
            <el-option label="已上架" value="public" />
            <el-option label="待审核" value="pending" />
            <el-option label="已下架" value="offline" />
          </el-select>
          <SearchInput
            v-model="searchQuery"
            placeholder="搜索我的数字警员..."
            @search="handleSearch"
          />
        </div>

        <!-- Loading -->
        <div v-if="loading" class="ds-card-grid">
          <div v-for="n in 6" :key="'s-mine-' + n" class="ds-card ds-card--skeleton">
            <div class="ds-card-icon ds-card-icon--skeleton"></div>
            <div class="ds-skeleton-line ds-skeleton-line--name"></div>
            <div class="ds-skeleton-line ds-skeleton-line--desc"></div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="mineFilteredList.length === 0" class="ds-empty">
          <el-icon :size="48" color="var(--ds-text-subtle)"><UserFilled /></el-icon>
          <p>暂无我的数字警员</p>
          <button class="ds-btn-primary" @click="openCreateDialog">定义第一个警员</button>
        </div>

        <!-- Card Grid -->
        <div v-else class="ds-card-grid">
          <div
            v-for="(officer, idx) in mineFilteredList"
            :key="officer.id"
            class="ds-card"
            :class="{
              'ds-card--pending': getStatus(officer) === AuditStatus.PUBLISH_PENDING,
            }"
          >
            <!-- Icon -->
            <div
              class="ds-card-icon"
              :style="{ background: getCardColor(idx).bg, color: getCardColor(idx).color }"
            >
              <span v-if="getOfficerIcon(officer)" class="ds-card-emoji-icon">{{
                getOfficerIcon(officer)
              }}</span>
              <el-icon v-else :size="22"><UserFilled /></el-icon>
            </div>
            <!-- Name & Description -->
            <div class="ds-card-name">{{ officer.officer_name }}</div>
            <div class="ds-card-desc">{{ getOfficerDesc(officer) }}</div>
            <!-- Prompt Preview -->
            <details
              v-if="getOfficerPrompt(officer) || officer.description"
              class="ds-prompt-preview"
            >
              <summary>提示词预览</summary>
              <pre>{{ getOfficerPrompt(officer) || formatPrompt(officer) }}</pre>
            </details>
            <!-- Tags -->
            <div class="ds-card-tags">
              <span
                v-for="skill in getOfficerSkillsReal(officer)"
                :key="'skill-' + skill.id"
                class="ds-card-tag ds-card-tag--skill"
                >{{ skill.resource_name }}</span
              >
              <span
                v-for="mcp in getOfficerMcpsReal(officer)"
                :key="'mcp-' + mcp.id"
                class="ds-card-tag ds-card-tag--mcp"
                >MCP·{{ mcp.resource_name }}</span
              >
              <span
                v-if="
                  getOfficerSkillsReal(officer).length === 0 &&
                  getOfficerMcpsReal(officer).length === 0
                "
                class="ds-card-tag ds-card-tag--category"
                >未关联资源</span
              >
            </div>
            <!-- Status -->
            <div class="ds-card-status">
              <span
                v-if="getStatus(officer) !== '00'"
                :class="AuditStatusClass[getStatus(officer)] || 'ds-tag-rejected'"
                >{{ statusLabel(officer) }}</span
              >
            </div>
            <!-- Actions -->
            <div v-if="hasAnyAction(officer)" class="ds-card-actions">
              <button
                v-if="getButtonVisibility(officer).showEdit"
                class="ds-btn-mini-outline"
                @click="openEditDialog(officer)"
              >
                编辑
              </button>
              <button
                v-if="getButtonVisibility(officer).showPublish"
                class="ds-btn-mini-primary"
                @click="handleApplyPublishOfficer(officer)"
              >
                申请上架
              </button>
              <button
                v-if="getButtonVisibility(officer).showUnpublish"
                class="ds-btn-mini-primary"
                @click="handleApplyUnpublishOfficer(officer)"
              >
                申请下架
              </button>
              <button
                v-if="getButtonVisibility(officer).showDelete"
                class="ds-btn-mini-danger"
                @click="handleDeleteOfficer(officer)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 通用数字警员 ==================== -->
      <div class="ds-section-panel" v-show="activeTab === 'general'">
        <div class="ds-section-head">
          <h3>
            通用数字警员<span class="ds-section-subtitle">平台统一上架，由管理员分配授权</span>
          </h3>
        </div>
        <div class="ds-toolbar">
          <el-select v-model="generalFilter" style="width: 140px">
            <el-option label="全部状态" value="all" />
            <el-option label="已上架" value="public" />
          </el-select>
          <SearchInput
            v-model="generalSearchQuery"
            placeholder="搜索通用数字警员..."
            @search="handleGeneralSearch"
          />
        </div>

        <!-- Loading -->
        <div v-if="loading" class="ds-card-grid">
          <div v-for="n in 4" :key="'s-gen-' + n" class="ds-card ds-card--skeleton">
            <div class="ds-card-icon ds-card-icon--skeleton"></div>
            <div class="ds-skeleton-line ds-skeleton-line--name"></div>
            <div class="ds-skeleton-line ds-skeleton-line--desc"></div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="generalFilteredList.length === 0" class="ds-empty">
          <el-icon :size="48" color="var(--ds-text-subtle)"><UserFilled /></el-icon>
          <p>暂无通用数字警员</p>
        </div>

        <!-- Card Grid -->
        <div v-else class="ds-card-grid">
          <div v-for="(item, idx) in generalFilteredList" :key="item.resource_id" class="ds-card">
            <div
              class="ds-card-icon"
              :style="{
                background: getCardColor(idx + 100).bg,
                color: getCardColor(idx + 100).color,
              }"
            >
              <el-icon :size="22"><UserFilled /></el-icon>
            </div>
            <div class="ds-card-name">{{ item.resource_name }}</div>
            <div class="ds-card-desc">{{ item.description || '暂无描述' }}</div>
            <div class="ds-card-tags">
              <span class="ds-card-tag ds-card-tag--category">数字警员</span>
            </div>
            <div
              v-if="item.creator_name || item.dept_name"
              style="font-size: 11px; color: var(--ds-text-secondary); margin-top: 4px"
            >
              创建者：{{ item.creator_name || '—' }} | 部门：{{ item.dept_name || '—' }}
            </div>
            <div class="ds-card-status">
              <span class="ds-tag-approved">已上架</span>
            </div>
            <div v-if="isManager" class="ds-card-actions">
              <button
                v-if="isManager"
                class="ds-btn-mini-primary"
                @click="openGeneralAuthDialog(item)"
              >
                授权
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 创建/编辑弹窗 ==================== -->
      <el-dialog
        v-model="formDialogVisible"
        :title="isEditing ? '编辑数字警员' : '定义数字警员'"
        width="680px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        destroy-on-close
        class="ds-modal"
      >
        <div class="form-grid">
          <div class="form-item full">
            <label>警员名称 <span class="req">*</span></label>
            <input type="text" v-model="form.officer_name" placeholder="例如：人员信息核查员" />
          </div>
          <div class="form-item">
            <label>警员编码 <span class="req">*</span></label>
            <input
              type="text"
              v-model="form.officer_code"
              placeholder="例如：officer_ryhcy"
              maxlength="50"
            />
          </div>
          <div class="form-item">
            <label>图标（emoji）<span class="req">*</span></label>
            <input type="text" v-model="form.officerIcon" placeholder="例如：👮" maxlength="2" />
          </div>
          <div class="form-item full">
            <label>场景描述 <span class="req">*</span></label>
            <textarea
              v-model="form.sceneDesc"
              placeholder="请描述该数字警员负责的业务场景与职责"
            ></textarea>
          </div>
          <div class="form-item full">
            <label>系统提示词（System Prompt） <span class="req">*</span></label>
            <textarea
              v-model="form.systemPrompt"
              rows="6"
              class="form-textarea-mono"
              placeholder="定义数字警员的角色、能力边界、输出格式与约束。例如：&#10;你是人员信息核查员，负责...&#10;能力范围：...&#10;输出要求：...&#10;约束：严禁泄露未授权信息..."
            ></textarea>
          </div>
          <div class="form-item full">
            <label
              >关联技能 <span class="req">*</span>
              <span class="label-sub">（点击选择，可多选）</span></label
            >
            <div class="pick-list">
              <span
                v-for="skill in skillOptions"
                :key="'psk-' + skill.id"
                class="pick-item"
                :class="{ selected: form.selectedSkillIds.includes(skill.id) }"
                @click="togglePickSkill(skill.id)"
              >
                <span class="pi-icon">{{ skill.icon || '🔹' }}</span>
                {{ skill.skill_name }}
              </span>
              <span v-if="skillOptions.length === 0" class="pick-empty">暂无可用技能</span>
            </div>
          </div>
          <div class="form-item full">
            <label>关联MCP服务 <span class="label-sub">（可选，可多选）</span></label>
            <div class="pick-list">
              <span
                v-for="mcp in mcpOptions"
                :key="'pmcp-' + mcp.id"
                class="pick-item"
                :class="{ selected: form.selectedMcpIds.includes(mcp.id) }"
                @click="togglePickMcp(mcp.id)"
              >
                <span class="pi-icon">🔗</span>
                {{ mcp.service_name }}
              </span>
              <span v-if="mcpOptions.length === 0" class="pick-empty">暂无可用MCP服务</span>
            </div>
          </div>
        </div>
        <div class="info-tip">
          💡
          定义后将保存至【我的数字警员】，可直接使用；如需发布到【通用数字警员】供全员使用，请点击"申请上架"提交二级审核（部门管理员初审
          + 超管终审）。上架后由管理员分配授权，下架后可自行删除。
        </div>
        <template #footer>
          <el-button class="btn-cancel" @click="formDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit" class="btn-confirm">
            {{ isEditing ? '保存' : '保存至我的数字警员' }}
          </el-button>
        </template>
      </el-dialog>

      <!-- ==================== 授权管理弹窗 ==================== -->
      <el-dialog
        v-model="authDialogVisible"
        :title="'授权管理 - ' + (authOfficer?.officer_name || '')"
        width="580px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        destroy-on-close
        class="ds-modal"
      >
        <div v-if="authOfficer" class="auth-panel">
          <div class="auth-section">
            <h4>已授权用户 ({{ officerAuthList.length }})</h4>
            <el-table
              :data="officerAuthList"
              size="small"
              max-height="240"
              class="auth-table"
              v-loading="authListLoading"
            >
              <el-table-column prop="user_name" label="用户名" width="120" />
              <el-table-column prop="user_id_card" label="身份证号" width="180" />
              <el-table-column prop="user_dept_name" label="所属部门" width="140" />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.status === '01' ? 'success' : 'info'" size="small">
                    {{ row.status === '01' ? '有效' : '无效' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="expire_time" label="过期时间" width="180" />
              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-button size="small" text type="danger" @click="cancelOfficerAuth(row)">
                    <el-icon :size="14"><CircleClose /></el-icon><span>取消</span>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <el-divider />
          <div class="auth-section">
            <h4>新增授权</h4>
            <div class="auth-add-row">
              <el-select
                v-model="authTargetUser"
                placeholder="选择用户"
                filterable
                style="width: 220px"
              >
                <el-option
                  v-for="u in allUsers"
                  :key="u.id"
                  :label="`${u.name} (${u.idCard || u.phone || ''})`"
                  :value="u.id"
                />
              </el-select>
              <el-input
                v-model="authExpireTime"
                placeholder="过期时间，如 2026-12-31 23:59:59"
                style="width: 240px"
              />
              <el-button type="primary" size="small" :loading="granting" @click="grantOfficerAuth"
                >授权</el-button
              >
            </div>
          </div>
        </div>
      </el-dialog>

      <!-- ==================== 通用授权弹窗（通用列表项授权给用户） ==================== -->
      <el-dialog
        v-model="generalAuthDialogVisible"
        width="480px"
        :close-on-click-modal="false"
        destroy-on-close
        class="ds-modal"
      >
        <template #header>
          <h2 class="ds-modal-title">授权 - {{ generalAuthTarget?.resource_name || '' }}</h2>
        </template>

        <div class="ds-modal-body">
          <!-- 超管：部门-人员联动选择 -->
          <div v-if="isSuperAdmin" class="ds-form-group">
            <label class="ds-form-label">选择部门</label>
            <el-select
              v-model="generalAuthDeptId"
              placeholder="全部部门"
              style="width: 100%; margin-bottom: 16px"
              clearable
              @change="generalAuthUserId = null"
            >
              <el-option
                v-for="d in deptList"
                :key="d.id"
                :label="d.dept_name"
                :value="d.id"
              />
            </el-select>
          </div>
          <div class="ds-form-group">
            <label class="ds-form-label">选择用户</label>
            <p
              v-if="!isSuperAdmin"
              style="font-size: 12px; color: var(--ds-text-subtle); margin: 0 0 6px"
            >
              仅显示本部门用户
            </p>
            <el-select
              v-model="generalAuthUserId"
              placeholder="请选择要授权的用户"
              style="width: 100%"
              :loading="generalAuthUsersLoading"
            >
              <el-option
                v-for="u in filteredGeneralAuthUsers"
                :key="u.id"
                :label="`${u.name || ''} (${u.idCard || u.phone || u.id || ''})`"
                :value="Number(u.id)"
              />
            </el-select>
          </div>
        </div>

        <template #footer>
          <div class="dialog-footer">
            <button class="ds-btn-cancel" @click="generalAuthDialogVisible = false">取消</button>
            <button class="ds-btn-confirm" :disabled="generalAuthGranting" @click="doGeneralAuth">
              {{ generalAuthGranting ? '授权中...' : '确认授权' }}
            </button>
          </div>
        </template>
      </el-dialog>
    </div>
    <!-- .ds-page-container -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  UserFilled,
  Refresh,
  Plus,
  Search,
  Link,
  Edit,
  Select,
  Delete,
  Key,
  CircleClose,
} from '@element-plus/icons-vue'
import { officerApi, type OfficerItem, type OfficerResource } from '@/api/officer'
import {
  getMyResources,
  getPublicResources,
  type MyOfficerItem,
  type PublicResourceItem,
} from '@/api/resource'
import { authManageApi, type UserAuthRecord } from '@/api/authManage'
import { userAuditApi, type AuditUser } from '@/api/userAudit'
import { departmentApi, type Department } from '@/api/department'
import { skillManageApi, type SkillItem } from '@/api/skillManage'
import { listAllMcpServices, type McpServiceItem } from '@/api/mcpService'
import {
  getStoredUserProfile,
  getCurrentUserId,
  getCurrentDeptId,
  isAdminAccount,
  isDepartmentAdmin,
} from '@/utils/auth'
import {
  getStatus,
  getButtonVisibility,
  AuditStatusLabel,
  AuditStatusClass,
  AuditStatus,
} from '@/utils/auditStatus'
import SearchInput from '@/components/common/SearchInput.vue'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
  }>(),
  { embedded: false },
)

const isEmbedded = computed(() => props.embedded)

// 管理员（超级管理员或部门管理员）才有资源管理/授权等权限
const isManager = computed(() => isAdminAccount() || isDepartmentAdmin())
const isSuperAdmin = computed(() => isAdminAccount())

// ==================== 标签页 ====================
const activeTab = ref<'mine' | 'general'>('mine')
const generalSearchQuery = ref('')
const generalFilter = ref('all')

// ==================== 卡片颜色方案 ====================
const cardColors = [
  { bg: '#e3f2fd', color: '#1565c0' },
  { bg: '#e8f5e9', color: '#2e7d32' },
  { bg: '#fff3e0', color: '#e65100' },
  { bg: '#fce4ec', color: '#c62828' },
  { bg: '#f3e5f5', color: '#7b1fa2' },
  { bg: '#e0f7fa', color: '#00695c' },
  { bg: '#e8eaf6', color: '#283593' },
  { bg: '#efebe9', color: '#4e342e' },
]

function getCardColor(index: number) {
  return cardColors[index % cardColors.length]
}

// ==================== 从 config 提取字段 ====================
function getOfficerIcon(officer: OfficerItem): string {
  if (officer.config) {
    const cfg = officer.config as Record<string, unknown>
    if (typeof cfg.icon === 'string') return cfg.icon
    if (typeof cfg.officerIcon === 'string') return cfg.officerIcon
  }
  return ''
}

function getOfficerDesc(officer: OfficerItem): string {
  if (officer.config) {
    const cfg = officer.config as Record<string, unknown>
    if (typeof cfg.sceneDesc === 'string') return cfg.sceneDesc
  }
  return officer.description || '暂无描述'
}

function getOfficerPrompt(officer: OfficerItem): string {
  if (officer.config) {
    const cfg = officer.config as Record<string, unknown>
    if (typeof cfg.systemPrompt === 'string') return cfg.systemPrompt
    if (typeof cfg.prompt === 'string') return cfg.prompt
  }
  return ''
}

// ==================== Mock 标签数据 ====================
function getOfficerMockSkills(officer: OfficerItem): string[] {
  if (officer.config) {
    const cfg = officer.config as Record<string, unknown>
    if (Array.isArray(cfg.skills)) return cfg.skills as string[]
    if (Array.isArray(cfg.skillNames)) return cfg.skillNames as string[]
  }
  const desc = (officer.description || '').toLowerCase()
  const skills: string[] = []
  if (desc.includes('人员') || desc.includes('核查') || desc.includes('信息'))
    skills.push('人员信息核查')
  if (desc.includes('车辆') || desc.includes('轨迹') || desc.includes('卡口'))
    skills.push('车辆轨迹追踪')
  if (desc.includes('案件') || desc.includes('研判')) skills.push('案件智能研判')
  if (desc.includes('情报') || desc.includes('分析')) skills.push('情报汇总分析')
  if (desc.includes('反诈') || desc.includes('劝阻')) skills.push('反诈预警劝阻')
  if (desc.includes('关系') || desc.includes('网络')) skills.push('关系网络分析')
  if (desc.includes('监控') || desc.includes('区域')) skills.push('重点区域监控')
  if (skills.length === 0) skills.push('通用分析')
  return skills.slice(0, 2)
}

function getOfficerMockMcps(officer: OfficerItem): string[] {
  if (officer.config) {
    const cfg = officer.config as Record<string, unknown>
    if (Array.isArray(cfg.mcpServices)) return cfg.mcpServices as string[]
    if (Array.isArray(cfg.mcps)) return cfg.mcps as string[]
  }
  const desc = (officer.description || '').toLowerCase()
  const mcps: string[] = []
  if (desc.includes('户籍') || desc.includes('人口') || desc.includes('人员'))
    mcps.push('户籍信息查询服务')
  if (desc.includes('车辆') || desc.includes('卡口') || desc.includes('轨迹'))
    mcps.push('卡口数据服务')
  if (desc.includes('地图') || desc.includes('gis') || desc.includes('位置'))
    mcps.push('GIS地图服务')
  if (desc.includes('警情') || desc.includes('报警')) mcps.push('警情数据服务')
  if (desc.includes('舆情') || desc.includes('监测')) mcps.push('舆情监测服务')
  if (desc.includes('前科') || desc.includes('犯罪') || desc.includes('违法'))
    mcps.push('前科记录查询服务')
  if (desc.includes('法律') || desc.includes('法规') || desc.includes('条文'))
    mcps.push('法律法规检索服务')
  return mcps.slice(0, 2)
}

// ==================== 真实资源数据（替代 mock 标签） ====================
const officerResourcesMap = ref<Map<number, OfficerResource[]>>(new Map())
const resourcesLoading = ref(false)

async function loadAllOfficerResources() {
  resourcesLoading.value = true
  try {
    const results = await Promise.allSettled(
      officerList.value.map((o) => officerApi.getResources(o.id)),
    )
    const map = new Map<number, OfficerResource[]>()
    officerList.value.forEach((o, i) => {
      const result = results[i]
      map.set(o.id, result.status === 'fulfilled' ? result.value : [])
    })
    officerResourcesMap.value = map
  } finally {
    resourcesLoading.value = false
  }
}

function getOfficerResources(officer: OfficerItem): OfficerResource[] {
  return officerResourcesMap.value.get(officer.id) || []
}

function getOfficerSkillsReal(officer: OfficerItem): OfficerResource[] {
  return getOfficerResources(officer).filter((r) => r.resource_type === 'skill')
}

function getOfficerMcpsReal(officer: OfficerItem): OfficerResource[] {
  return getOfficerResources(officer).filter((r) => r.resource_type === 'mcp')
}

function formatPrompt(officer: OfficerItem): string {
  if (officer.config) {
    const cfg = officer.config as Record<string, unknown>
    if (typeof cfg.prompt === 'string') return cfg.prompt
    if (typeof cfg.systemPrompt === 'string') return cfg.systemPrompt
    const parts: string[] = []
    if (typeof cfg.role === 'string') parts.push('角色：' + cfg.role)
    if (typeof cfg.capabilities === 'string') parts.push('能力范围：' + cfg.capabilities)
    if (typeof cfg.constraints === 'string') parts.push('约束：' + cfg.constraints)
    if (parts.length > 0) return parts.join('\n')
    try {
      return JSON.stringify(cfg, null, 2)
    } catch {
      // fall through
    }
  }
  return officer.description || '暂无提示词配置'
}

// ==================== 警员数据 ====================
const loading = ref(false)
const officerList = ref<OfficerItem[]>([])
const searchQuery = ref('')
const currentFilter = ref('all')

const statusFilters = [
  { key: 'all', label: '全部' },
  { key: 'public', label: '已上架' },
  { key: 'pending', label: '待审核' },
  { key: 'offline', label: '已下架' },
]

const totalCount = computed(() => officerList.value.length)
const activeCount = computed(
  () => officerList.value.filter((o) => getStatus(o) === AuditStatus.PUBLISHED).length,
)
const pendingCount = computed(
  () => officerList.value.filter((o) => getStatus(o) === AuditStatus.PUBLISH_PENDING).length,
)

const mineCount = computed(() => officerList.value.length)
const generalCount = computed(() => generalOfficerItems.value.length)

// Existing filtered list (kept for backward compatibility)
const filteredList = computed(() => {
  let list = officerList.value
  if (currentFilter.value === 'public') {
    list = list.filter((o) => getStatus(o) === AuditStatus.PUBLISHED)
  } else if (currentFilter.value === 'pending') {
    list = list.filter((o) => getStatus(o) === AuditStatus.PUBLISH_PENDING)
  } else if (currentFilter.value === 'offline') {
    list = list.filter((o) => getStatus(o) === AuditStatus.UNPUBLISHED)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (o) =>
        o.officer_name.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q)),
    )
  }
  return list
})

// Tab-specific filtered lists
const mineFilteredList = computed(() => {
  // "我的"Tab 展示全部资源（我创建的 + 授权给我的），按审核状态筛选
  let list = officerList.value
  if (currentFilter.value === 'pending') {
    list = list.filter((o) => getStatus(o) === AuditStatus.PUBLISH_PENDING)
  } else if (currentFilter.value === 'offline') {
    list = list.filter((o) => getStatus(o) === AuditStatus.UNPUBLISHED)
  } else if (currentFilter.value === 'public') {
    list = list.filter((o) => getStatus(o) === AuditStatus.PUBLISHED)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (o) =>
        o.officer_name.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q)),
    )
  }
  return list
})

// General tab officers — 通过 /auth/resources.xhtml 获取公开上架的通用数字警员
const generalOfficerItems = ref<PublicResourceItem[]>([])

const loadGeneralOfficers = async () => {
  try {
    const result = await getPublicResources({
      resource_type: 'officer',
      is_public: true,
      limit: 200,
    })
    generalOfficerItems.value = result.list
  } catch {
    generalOfficerItems.value = []
  }
}

const generalFilteredList = computed(() => {
  let list = generalOfficerItems.value
  if (generalSearchQuery.value.trim()) {
    const q = generalSearchQuery.value.trim().toLowerCase()
    list = list.filter(
      (o) =>
        o.resource_name.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q)),
    )
  }
  return list
})

function statusClass(officer: OfficerItem) {
  const s = getStatus(officer)
  if (s === AuditStatus.PUBLISHED) return 'officer-card__status--active'
  if (s === AuditStatus.PUBLISH_PENDING) return 'officer-card__status--pending'
  return 'officer-card__status--removed'
}

function statusLabel(officer: OfficerItem) {
  return AuditStatusLabel[getStatus(officer)] || '未上架'
}

function hasAnyAction(officer: OfficerItem & { _source?: string }): boolean {
  // 授权资源不显示操作按钮
  if ((officer as any)._source === 'authorized') return false
  const vis = getButtonVisibility(officer)
  return (
    vis.showEdit ||
    vis.showPublish ||
    vis.showUnpublish ||
    vis.showDelete
  )
}

function setFilter(key: string) {
  currentFilter.value = key
}

function handleSearch() {}
function handleGeneralSearch() {}

// ==================== 技能/MCP 选项加载 ====================
const skillOptions = ref<(SkillItem & { icon: string })[]>([])
const mcpOptions = ref<McpServiceItem[]>([])

async function loadSkillOptions() {
  try {
    const { list: skills } = await skillManageApi.list()
    skillOptions.value = skills.map((s) => ({
      ...s,
      icon:
        (s.skill_config &&
          typeof s.skill_config === 'object' &&
          ((s.skill_config as Record<string, unknown>).icon as string)) ||
        getSkillDefaultIcon(s),
    }))
  } catch {
    skillOptions.value = []
  }
}

function getSkillDefaultIcon(skill: SkillItem): string {
  const name = (skill.skill_name || '').toLowerCase()
  if (name.includes('人员') || name.includes('核查')) return '👤'
  if (name.includes('车辆') || name.includes('轨迹')) return '🚗'
  if (name.includes('案件') || name.includes('研判')) return '🔍'
  if (name.includes('情报') || name.includes('分析')) return '📊'
  if (name.includes('反诈') || name.includes('劝阻')) return '🚨'
  if (name.includes('关系') || name.includes('网络')) return '🔗'
  if (name.includes('监控') || name.includes('区域')) return '📍'
  if (name.includes('语音') || name.includes('转写')) return '🎙️'
  return '🔹'
}

async function loadMcpOptions() {
  try {
    mcpOptions.value = await listAllMcpServices()
  } catch {
    mcpOptions.value = []
  }
}

// ==================== 创建/编辑表单 ====================
const formDialogVisible = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)

interface OfficerForm {
  officer_name: string
  officer_code: string
  officerIcon: string
  sceneDesc: string
  systemPrompt: string
  selectedSkillIds: number[]
  selectedMcpIds: number[]
}

const defaultForm = (): OfficerForm => ({
  officer_name: '',
  officer_code: '',
  officerIcon: '👮',
  sceneDesc: '',
  systemPrompt: '',
  selectedSkillIds: [],
  selectedMcpIds: [],
})

const form = ref<OfficerForm>(defaultForm())

// ==================== 标签式正反选 ====================
function togglePickSkill(skillId: number) {
  const idx = form.value.selectedSkillIds.indexOf(skillId)
  if (idx >= 0) {
    form.value.selectedSkillIds.splice(idx, 1)
  } else {
    form.value.selectedSkillIds.push(skillId)
  }
}

function togglePickMcp(mcpId: number) {
  const idx = form.value.selectedMcpIds.indexOf(mcpId)
  if (idx >= 0) {
    form.value.selectedMcpIds.splice(idx, 1)
  } else {
    form.value.selectedMcpIds.push(mcpId)
  }
}

function openCreateDialog() {
  isEditing.value = false
  editingId.value = null
  form.value = defaultForm()
  loadSkillOptions()
  loadMcpOptions()
  formDialogVisible.value = true
}

function openEditDialog(officer: OfficerItem) {
  isEditing.value = true
  editingId.value = officer.id
  const cfg = (officer.config || {}) as Record<string, unknown>
  form.value = {
    officer_name: officer.officer_name,
    officer_code: officer.officer_code || '',
    officerIcon:
      (typeof cfg.icon === 'string' ? cfg.icon : '') ||
      (typeof cfg.officerIcon === 'string' ? cfg.officerIcon : '') ||
      '',
    sceneDesc:
      (typeof cfg.sceneDesc === 'string' ? cfg.sceneDesc : '') || officer.description || '',
    systemPrompt:
      (typeof cfg.systemPrompt === 'string' ? cfg.systemPrompt : '') ||
      (typeof cfg.prompt === 'string' ? cfg.prompt : '') ||
      '',
    selectedSkillIds: Array.isArray(cfg.skillIds) ? (cfg.skillIds as number[]) : [],
    selectedMcpIds: Array.isArray(cfg.mcpIds) ? (cfg.mcpIds as number[]) : [],
  }
  loadSkillOptions()
  loadMcpOptions()
  formDialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.officer_name.trim()) {
    ElMessage.error('请输入警员名称')
    return
  }
  if (!form.value.officer_code.trim()) {
    ElMessage.error('请输入警员编码')
    return
  }
  if (!form.value.sceneDesc.trim()) {
    ElMessage.error('请输入场景描述')
    return
  }
  if (!form.value.systemPrompt.trim()) {
    ElMessage.error('请输入系统提示词')
    return
  }
  if (form.value.selectedSkillIds.length === 0) {
    ElMessage.error('请至少关联一个技能')
    return
  }

  submitting.value = true
  try {
    const config: Record<string, unknown> = {
      icon: form.value.officerIcon.trim() || '👮',
      officerIcon: form.value.officerIcon.trim() || '👮',
      sceneDesc: form.value.sceneDesc.trim(),
      systemPrompt: form.value.systemPrompt.trim(),
      prompt: form.value.systemPrompt.trim(),
      skillIds: form.value.selectedSkillIds,
      skillNames: skillOptions.value
        .filter((s) => form.value.selectedSkillIds.includes(s.id))
        .map((s) => s.skill_name),
      mcpIds: form.value.selectedMcpIds,
      mcpNames: mcpOptions.value
        .filter((m) => form.value.selectedMcpIds.includes(m.id))
        .map((m) => m.service_name),
    }

    if (isEditing.value && editingId.value) {
      // 编辑模式：更新警员基本信息 + 资源关联
      await officerApi.update({
        id: editingId.value,
        officer_code: form.value.officer_code.trim() || undefined,
        officer_name: form.value.officer_name.trim(),
        description: form.value.sceneDesc.trim(),
        skill_ids: form.value.selectedSkillIds.join(',') || undefined,
        mcp_ids: form.value.selectedMcpIds.join(',') || undefined,
      })
      ElMessage.success('数字警员更新成功')
      formDialogVisible.value = false
      await refreshList()
      return
    }

    // 创建模式：先创建警员，再关联资源
    const { id: officerId } = await officerApi.create({
      officer_code: form.value.officer_code.trim() || undefined,
      officer_name: form.value.officer_name.trim(),
      description: form.value.sceneDesc.trim(),
      config,
    })
    formDialogVisible.value = false

    // 直接用 create 返回的 ID 关联资源（兜底：ID 为 0 时回退到列表匹配）
    let targetOfficerId = officerId || 0

    if (!targetOfficerId) {
      // 兜底：接口未返回 ID，从列表中匹配
      await refreshList()
      const matched = officerList.value.find(
        (o) =>
          o.officer_name === form.value.officer_name.trim() &&
          o.description === form.value.sceneDesc.trim(),
      )
      targetOfficerId = matched?.id || 0
    }

    if (
      targetOfficerId &&
      (form.value.selectedSkillIds.length > 0 || form.value.selectedMcpIds.length > 0)
    ) {
      try {
        await officerApi.addResourcesBatch(
          targetOfficerId,
          form.value.selectedSkillIds.length > 0
            ? form.value.selectedSkillIds.join(',')
            : undefined,
          form.value.selectedMcpIds.length > 0 ? form.value.selectedMcpIds.join(',') : undefined,
        )
      } catch {
        ElMessage.warning('警员已创建，但资源关联失败，请在资源管理中手动添加')
      }
    }
    ElMessage.success('创建成功，已保存至【我的数字警员】，可直接使用')
    await refreshList()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// ==================== 上架/下架 ====================

/** 申请上架（普通用户，需经过审核流程） */
async function handleApplyPublishOfficer(officer: OfficerItem) {
  try {
    await ElMessageBox.confirm(
      `确定要申请上架警员「${officer.officer_name}」吗？提交后将进入部门管理员审核 + 超级管理员审核流程。`,
      '申请上架',
      { confirmButtonText: '确认申请', cancelButtonText: '取消', type: 'info' },
    )
    await officerApi.applyPublish(officer.id)
    ElMessage.success('上架申请已提交，请等待审核')
    await refreshList()
  } catch {
    // cancelled
  }
}

/** 申请下架（普通用户，需经过审核流程） */
async function handleApplyUnpublishOfficer(officer: OfficerItem) {
  try {
    await ElMessageBox.confirm(
      `确定要对数字警员「${officer.officer_name}」申请下架吗？`,
      '申请下架',
      { confirmButtonText: '确认申请', cancelButtonText: '取消', type: 'warning' },
    )
    await officerApi.applyRemove(officer.id)
    ElMessage.success('下架申请已提交，请等待审核')
    await refreshList()
  } catch {
    // cancelled
  }
}

// ==================== 直接删除（无需审核，仅限已下架/未上架） ====================
async function handleDeleteOfficer(officer: OfficerItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除数字警员「${officer.officer_name}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    await officerApi.delete(officer.id)
    ElMessage.success(`已删除「${officer.officer_name}」`)
    await refreshList()
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

// ==================== 警员授权管理 ====================
const authDialogVisible = ref(false)
const authOfficer = ref<OfficerItem | null>(null)
const officerAuthList = ref<UserAuthRecord[]>([])
const authListLoading = ref(false)
const allUsers = ref<AuditUser[]>([])
const authTargetUser = ref<number | null>(null)
const authExpireTime = ref('')
const granting = ref(false)

async function openAuthDialog(officer: OfficerItem) {
  authOfficer.value = officer
  authDialogVisible.value = true
  await Promise.all([loadOfficerAuthList(), loadAllUsers()])
}

async function loadOfficerAuthList() {
  if (!authOfficer.value) return
  authListLoading.value = true
  try {
    const result = await authManageApi.getOfficerAuthList({
      officer_id: authOfficer.value.id,
    })
    officerAuthList.value = (result.items ?? []) as unknown as UserAuthRecord[]
  } catch {
    officerAuthList.value = []
  } finally {
    authListLoading.value = false
  }
}

async function loadAllUsers() {
  try {
    allUsers.value = await userAuditApi.getAllUsers()
  } catch {
    allUsers.value = []
  }
}

async function grantOfficerAuth() {
  if (!authOfficer.value || !authTargetUser.value) return
  granting.value = true
  try {
    await authManageApi.grantOfficerToUser(
      authOfficer.value.id,
      authTargetUser.value,
      authExpireTime.value || undefined,
    )
    ElMessage.success('授权成功')
    authTargetUser.value = null
    authExpireTime.value = ''
    await loadOfficerAuthList()
  } catch (e: any) {
    ElMessage.error(e.message || '授权失败')
  } finally {
    granting.value = false
  }
}

async function cancelOfficerAuth(row: UserAuthRecord) {
  if (!authOfficer.value) return
  try {
    await ElMessageBox.confirm(
      `确定取消用户「${row.user_name}」对警员「${authOfficer.value.officer_name}」的授权吗？`,
      '确认取消授权',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' },
    )
    if (row.officer_id) {
      await authManageApi.cancelOfficerAuth(row.officer_id, row.user_id)
    } else {
      await authManageApi.revoke({
        auth_target_type: 'user',
        user_id: row.user_id,
        resource_type: 'officer',
        resource_id: authOfficer.value.id,
      })
    }
    ElMessage.success('已取消授权')
    await loadOfficerAuthList()
  } catch {
    // cancelled
  }
}

// ==================== 通用授权（通用列表项 → 授权给用户） ====================
const generalAuthDialogVisible = ref(false)
const generalAuthTarget = ref<PublicResourceItem | null>(null)
const generalAuthUserId = ref<number | null>(null)
const generalAuthGranting = ref(false)
const generalAuthUsers = ref<AuditUser[]>([])
const generalAuthUsersLoading = ref(false)
const generalAuthDeptId = ref<number | null>(null) // 超管部门联动：选中的部门
const deptList = ref<Department[]>([]) // 部门列表（超管联动用）

/** 加载部门列表 */
async function loadDeptList() {
  try {
    deptList.value = await departmentApi.list()
  } catch {
    deptList.value = []
  }
}

/** 打开通用列表项的授权弹窗 */
async function openGeneralAuthDialog(item: PublicResourceItem) {
  generalAuthTarget.value = item
  generalAuthUserId.value = null
  generalAuthDeptId.value = null
  generalAuthDialogVisible.value = true
  await Promise.all([loadGeneralAuthUsers(), loadDeptList()])
}

/** 加载可授权用户列表 */
async function loadGeneralAuthUsers() {
  generalAuthUsersLoading.value = true
  try {
    generalAuthUsers.value = await userAuditApi.getAllUsers()
  } catch {
    generalAuthUsers.value = []
  } finally {
    generalAuthUsersLoading.value = false
  }
}

/** 过滤用户列表：超管按联动部门筛选，部门管理员只看本部门 */
const filteredGeneralAuthUsers = computed(() => {
  if (isSuperAdmin.value) {
    // 超管：按选中的部门筛选，未选部门时显示全部
    if (!generalAuthDeptId.value) return generalAuthUsers.value
    return generalAuthUsers.value.filter((u) => u.dept_id === generalAuthDeptId.value)
  }
  // 部门管理员：只显示本部门用户
  const profile = getStoredUserProfile()
  const myDeptId = profile?.dept_id
  if (myDeptId) {
    return generalAuthUsers.value.filter((u) => u.dept_id === myDeptId)
  }
  const myDept = profile?.department || ''
  if (!myDept) return generalAuthUsers.value
  return generalAuthUsers.value.filter((u) => (u.department || '') === myDept)
})

/** 执行通用授权 */
async function doGeneralAuth() {
  if (!generalAuthTarget.value || !generalAuthUserId.value) {
    ElMessage.warning('请选择用户')
    return
  }
  generalAuthGranting.value = true
  try {
    const selectedUser = generalAuthUsers.value.find(u => Number(u.id) === generalAuthUserId.value)
    await authManageApi.grant({
      auth_target_type: 'user',
      user_id: generalAuthUserId.value,
      resource_type: 'officer',
      resource_id: generalAuthTarget.value.resource_id,
      dept_id: selectedUser?.dept_id,
    })
    ElMessage.success('授权成功')
    generalAuthDialogVisible.value = false
  } catch (e: any) {
    ElMessage.error(e.message || '授权失败')
  } finally {
    generalAuthGranting.value = false
  }
}

// ==================== 数据刷新 ====================
async function refreshList() {
  loading.value = true
  try {
    const userId = getCurrentUserId()
    const deptId = getCurrentDeptId()
    const data = await getMyResources('officer', userId ?? undefined, deptId ?? undefined)
    officerList.value = data.list.officers || []
    // 加载真实资源数据
    loadAllOfficerResources()
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// ============ Watchers ============
watch(activeTab, (tab) => {
  if (tab === 'general' && generalOfficerItems.value.length === 0) {
    loadGeneralOfficers()
  }
})

onMounted(() => {
  refreshList()
  loadGeneralOfficers()
})
</script>

<style scoped>
/* ==================== 弹窗表单（与新产品 HTML 完全一致） ==================== */

/* 两列表单网格 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}

.form-item {
  margin-bottom: 14px;
}

.form-item.full {
  grid-column: 1 / -1;
}

.form-item label {
  display: block;
  font-size: 13px;
  color: var(--ds-text-secondary);
  font-weight: 500;
  margin-bottom: 5px;
}

.form-item .req {
  color: var(--ds-danger);
}

.label-sub {
  font-size: 11px;
  color: var(--ds-text-secondary);
  font-weight: 400;
}

.form-item input,
.form-item textarea {
  width: 100%;
  padding: 9px 13px;
  border: 1px solid var(--ds-border);
  border-radius: 7px;
  font-size: 14px;
  font-family: inherit;
  background: var(--ds-card);
  color: var(--ds-text);
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-item input:focus,
.form-item textarea:focus {
  outline: none;
  border-color: var(--ds-primary-light);
}

.form-item textarea {
  resize: vertical;
  min-height: 60px;
}

.form-textarea-mono {
  min-height: 120px !important;
  font-family: Consolas, Monaco, 'Courier New', monospace !important;
  font-size: 13px !important;
}

/* ==================== 多选标签 pick-list ==================== */
.pick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--ds-border);
  border-radius: 8px;
  min-height: 44px;
  background: var(--ds-card);
}

.pick-empty {
  font-size: 12px;
  color: var(--ds-text-secondary);
  padding: 4px 0;
}

.pick-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--ds-bg);
  border: 1px solid var(--ds-border);
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.pick-item:hover {
  border-color: var(--ds-primary-light);
}

.pick-item.selected {
  background: var(--ds-primary);
  color: #fff;
  border-color: var(--ds-primary);
}

.pi-icon {
  font-size: 13px;
}

/* ==================== 底部提示 ==================== */
.info-tip {
  margin-top: 8px;
  padding: 10px 14px;
  background: rgba(201, 168, 76, 0.08);
  border-left: 3px solid var(--ds-accent);
  border-radius: 0 6px 6px 0;
  font-size: 12px;
  color: #8a6d1f;
  line-height: 1.7;
}

/* ==================== 卡片增强 ==================== */
.ds-card-emoji-icon {
  font-size: 22px;
  line-height: 1;
}

.ds-card--pending {
  border-color: var(--ds-warning, #e65100);
}

/* ==================== 骨架屏 ==================== */
.ds-card--skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 20px;
  cursor: default;
  pointer-events: none;
}

.ds-card--skeleton:hover {
  box-shadow: none;
  transform: none;
}

.ds-card-icon--skeleton {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--ds-panel-muted);
  animation: ds-pulse 1.5s ease-in-out infinite;
}

.ds-skeleton-line {
  height: 14px;
  border-radius: 6px;
  background: var(--ds-panel-muted);
  width: 100%;
  animation: ds-pulse 1.5s ease-in-out infinite;
}

.ds-skeleton-line--name {
  width: 60%;
  height: 16px;
}

.ds-skeleton-line--desc {
  width: 85%;
}

@keyframes ds-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ==================== 授权面板 ==================== */
.auth-panel h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ds-text);
}

.auth-table {
  width: 100%;
  margin-bottom: 8px;
}

.auth-add-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .ds-page-title {
    font-size: 18px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .auth-add-row {
    flex-wrap: wrap;
  }

  .auth-add-row .el-select,
  .auth-add-row .el-input {
    width: 100% !important;
  }
}

/* ==================== 深色模式 ==================== */
:root[data-theme='dark'] .ds-card--pending {
  border-color: var(--ds-warning, #ffa726);
}

:root[data-theme='dark'] .info-tip {
  background: rgba(201, 168, 76, 0.12);
  color: #c9a84c;
}

:root[data-theme='dark'] .ds-card--skeleton .ds-card-icon--skeleton,
:root[data-theme='dark'] .ds-card--skeleton .ds-skeleton-line {
  background: var(--ds-border);
}

:root[data-theme='dark'] .pick-item {
  background: var(--ds-panel-muted);
}

:root[data-theme='dark'] .pick-item.selected {
  background: var(--ds-primary-light);
}
</style>
