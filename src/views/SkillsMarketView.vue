<template>
  <div class="ds-page-wrapper ds-page" :class="{ 'ds-page--embedded': isEmbedded }">
    <div class="ds-page-container">
      <!-- ==================== 页面标题 ==================== -->
      <div class="ds-page-title">智能警务技能库</div>

      <!-- ==================== 分区标签 ==================== -->
      <div class="ds-section-tabs">
        <button
          class="ds-section-tab"
          :class="{ active: activeTab === 'mine' }"
          @click="activeTab = 'mine'"
        >
          我的技能<span class="count">({{ mineCount }})</span>
        </button>
        <button
          class="ds-section-tab"
          :class="{ active: activeTab === 'general' }"
          @click="activeTab = 'general'"
        >
          通用技能<span class="count">({{ generalCount }})</span>
        </button>
      </div>

      <!-- ==================== 我的技能 ==================== -->
      <div class="ds-section-panel" v-show="activeTab === 'mine'">
        <div class="ds-section-head">
          <h3>
            我的技能
            <span class="ds-section-subtitle">本部门/本人上传并已授权的技能</span>
          </h3>
          <button
            v-if="showAddButton"
            class="ds-btn-primary"
            @click="handleAddSkill"
          >
            <el-icon :size="14"><Plus /></el-icon>
            上传技能
          </button>
        </div>
        <div class="ds-toolbar">
          <SearchInput
            v-model="mineSearchKeyword"
            placeholder="搜索我的技能..."
            @search="currentPage = 1"
          />
          <el-select v-model="mineCategory" style="width: 140px" clearable placeholder="全部分类" @change="currentPage = 1">
            <el-option
              v-for="cat in apiCategories"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
        </div>

        <!-- 加载状态 -->
        <div v-if="listLoading" class="ds-card-grid">
          <div v-for="n in 6" :key="'sm-' + n" class="ds-card ds-card--skeleton">
            <div class="ds-card-icon ds-card-icon--skeleton"></div>
            <div class="ds-skeleton-line ds-skeleton-line--name"></div>
            <div class="ds-skeleton-line ds-skeleton-line--desc"></div>
            <div class="ds-skeleton-line ds-skeleton-line--tag"></div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="paginatedMineSkills.length === 0" class="ds-empty">
          <el-icon :size="48" color="var(--ds-text-subtle)"><MagicStick /></el-icon>
          <p>{{ mineSearchKeyword || mineCategory ? '没有找到匹配的技能' : '暂无我的技能，点击上方按钮上传' }}</p>
        </div>

        <!-- 卡片网格 -->
        <div v-else class="ds-card-grid">
          <div
            v-for="skill in paginatedMineSkills"
            :key="skill.id"
            class="ds-card"
          >
            <div class="ds-card-icon" :style="{ background: getCategoryGradient(skill.category), color: '#fff' }">
              <el-icon :size="22"><component :is="getSkillIcon(skill.title)" /></el-icon>
            </div>
            <div class="ds-card-name">{{ skill.title }}</div>
            <div class="ds-card-desc">{{ skill.description }}</div>
            <div class="ds-card-tags">
              <span class="ds-card-tag ds-card-tag--category">{{ getCategoryLabel(skill.category) }}</span>
            </div>
            <div class="ds-card-status">
              <span v-if="getStatus(skill) !== '00'" :class="AuditStatusClass[getStatus(skill)] || 'ds-tag-approved'">{{ AuditStatusLabel[getStatus(skill)] || '未上架' }}</span>
            </div>
            <div v-if="hasSkillActions(skill)" class="ds-card-actions">
              <button v-if="getButtonVisibility(skill).showPublish" class="ds-btn-mini-primary" @click="publishSkill(skill)">申请上架</button>
              <button v-if="getButtonVisibility(skill).showUnpublish" class="ds-btn-mini-primary" @click="unpublishSkill(skill)">申请下架</button>
              <button v-if="isManageMode || getButtonVisibility(skill).showEdit" class="ds-btn-mini-outline" @click="editSkill(skill)">编辑</button>
              <button v-if="getButtonVisibility(skill).showDelete" class="ds-btn-mini-danger" @click="deleteSkill(skill)">删除</button>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="mineTotalPages > 1" class="ds-pagination-row">
          <el-pagination
            v-model:current-page="mineCurrentPage"
            :page-size="pageSize"
            :total="filteredMineSkills.length"
            layout="total, prev, pager, next"
            background
            small
          />
        </div>
      </div>

      <!-- ==================== 通用技能 ==================== -->
      <div class="ds-section-panel" v-show="activeTab === 'general'">
        <div class="ds-section-head">
          <h3>
            通用技能
            <span class="ds-section-subtitle">平台统一上架，由管理员分配授权</span>
          </h3>
        </div>
        <div class="ds-toolbar">
          <SearchInput
            v-model="generalSearchKeyword"
            placeholder="搜索通用技能..."
            @search="currentPage = 1"
          />
          <el-select v-model="generalCategory" style="width: 140px" clearable placeholder="全部分类" @change="currentPage = 1">
            <el-option
              v-for="cat in apiCategories"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
        </div>

        <!-- 加载状态 -->
        <div v-if="listLoading" class="ds-card-grid">
          <div v-for="n in 6" :key="'sg-' + n" class="ds-card ds-card--skeleton">
            <div class="ds-card-icon ds-card-icon--skeleton"></div>
            <div class="ds-skeleton-line ds-skeleton-line--name"></div>
            <div class="ds-skeleton-line ds-skeleton-line--desc"></div>
            <div class="ds-skeleton-line ds-skeleton-line--tag"></div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="paginatedGeneralSkills.length === 0" class="ds-empty">
          <el-icon :size="48" color="var(--ds-text-subtle)"><MagicStick /></el-icon>
          <p>{{ generalSearchKeyword || generalCategory ? '没有找到匹配的技能' : '暂无通用技能' }}</p>
        </div>

        <!-- 卡片网格 -->
        <div v-else class="ds-card-grid">
          <div
            v-for="skill in paginatedGeneralSkills"
            :key="skill.id"
            class="ds-card"
          >
            <div class="ds-card-icon" :style="{ background: getCategoryGradient(skill.category), color: '#fff' }">
              <el-icon :size="22"><component :is="getSkillIcon(skill.title)" /></el-icon>
            </div>
            <div class="ds-card-name">{{ skill.title }}</div>
            <div class="ds-card-desc">{{ skill.description }}</div>
            <div class="ds-card-tags">
              <span class="ds-card-tag ds-card-tag--category">{{ getCategoryLabel(skill.category) }}</span>
            </div>
            <div class="ds-card-status">
              <span class="ds-tag-approved">已上架</span>
            </div>
            <div v-if="isManager" class="ds-card-actions">
              <button v-if="isManager" class="ds-btn-mini-primary" @click="openGeneralSkillAuthDialog(skill)">授权</button>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="generalTotalPages > 1" class="ds-pagination-row">
          <el-pagination
            v-model:current-page="generalCurrentPage"
            :page-size="pageSize"
            :total="filteredGeneralSkills.length"
            layout="total, prev, pager, next"
            background
            small
          />
        </div>
      </div>
    </div><!-- .ds-page-container -->

    <!-- ==================== 上传技能对话框 ==================== -->
    <el-dialog
      v-model="uploadDialogVisible"
      width="580px"
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="ds-modal ds-skill-upload-modal"
      title="上传技能"
    >
      <div class="ds-form-grid">
        <div class="ds-form-item">
          <label>技能名称 <span class="ds-form-req">*</span></label>
          <input
            v-model="skillNameForm"
            type="text"
            class="ds-form-input"
            placeholder="例如：人员信息核查"
          />
        </div>
        <div v-if="false" class="ds-form-item">
          <label>分类</label>
          <el-select v-model="skillCategoryForm" style="width: 100%" placeholder="请选择分类">
            <el-option label="人员核查" value="人员核查" />
            <el-option label="车辆分析" value="车辆分析" />
            <el-option label="案件研判" value="案件研判" />
            <el-option label="情报分析" value="情报分析" />
            <el-option label="治安管控" value="治安管控" />
            <el-option label="反诈预警" value="反诈预警" />
          </el-select>
        </div>
        <div v-if="false" class="ds-form-item ds-form-item--full">
          <label>技能描述</label>
          <textarea
            v-model="skillDescForm"
            class="ds-form-textarea"
            placeholder="请描述该技能的功能与适用场景"
          ></textarea>
        </div>
        <div class="ds-form-item ds-form-item--full">
          <label>技能图标（emoji）</label>
          <input
            v-model="skillIconForm"
            type="text"
            class="ds-form-input"
            placeholder="例如：👤"
            maxlength="2"
          />
        </div>
      </div>

      <!-- 文件上传拖拽区 -->
      <div class="skill-upload">
        <input
          ref="skillUploadInput"
          class="skill-upload__input"
          type="file"
          accept=".zip"
          @change="handleSkillFileChange"
        />
        <button class="skill-upload__dropzone" type="button" @click="openSkillFilePicker">
          <el-icon class="skill-upload__dropzone-icon"><UploadFilled /></el-icon>
          <span class="skill-upload__title">
            {{ selectedSkillFile ? selectedSkillFile.name : '点击选择技能包文件' }}
          </span>
          <span class="skill-upload__desc">支持上传 .zip 格式的技能包</span>
        </button>
      </div>

      <template #footer>
        <div class="skill-upload__footer">
          <el-button :loading="templateDownloading" @click="downloadTemplate">下载模板</el-button>
          <div class="skill-upload__actions">
            <el-button @click="uploadDialogVisible = false">取消</el-button>
            <el-button
              type="primary"
              :disabled="!selectedSkillFile"
              :loading="skillUploading"
              @click="handleUploadSkill"
            >
              上传至我的技能
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- ==================== 通用授权弹窗 ==================== -->
    <el-dialog
      v-model="generalSkillAuthDialogVisible"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
      class="ds-modal"
    >
      <template #header>
        <h2 class="ds-modal-title">授权 - {{ generalSkillAuthTarget?.title || '' }}</h2>
      </template>

      <div class="ds-modal-body">
        <!-- 超管：部门-人员联动选择 -->
        <div v-if="isSuperAdmin" class="ds-form-group">
          <label class="ds-form-label">选择部门</label>
          <el-select
            v-model="generalSkillAuthDeptId"
            placeholder="全部部门"
            style="width:100%;margin-bottom:16px"
            clearable
            @change="generalSkillAuthUserId = null"
          >
            <el-option v-for="d in deptList" :key="d.id" :label="d.dept_name" :value="d.id" />
          </el-select>
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">选择用户</label>
          <p v-if="!isSuperAdmin" style="font-size:12px;color:var(--ds-text-subtle);margin:0 0 6px;">仅显示本部门用户</p>
          <el-select
            v-model="generalSkillAuthUserId"
            placeholder="请选择要授权的用户"
            style="width:100%"
            :loading="generalSkillAuthUsersLoading"
          >
            <el-option
              v-for="u in filteredGeneralSkillAuthUsers"
              :key="u.id"
              :label="`${u.name || ''} (${u.idCard || u.phone || u.id || ''})`"
              :value="Number(u.id)"
            />
          </el-select>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <button class="ds-btn-cancel" @click="generalSkillAuthDialogVisible = false">取消</button>
          <button class="ds-btn-confirm" :disabled="generalSkillAuthGranting" @click="doGeneralSkillAuth">
            {{ generalSkillAuthGranting ? '授权中...' : '确认授权' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Document,
  EditPen,
  MagicStick,
  Plus,
  Search,
  UploadFilled,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getSkillTemplate,
  uploadSkill,
} from '@/api/skillsMarket'
import { skillManageApi, type SkillItem as SkillManageItem } from '@/api/skillManage'
import { getMyResources, getPublicResources, type MySkillItem, type PublicResourceItem } from '@/api/resource'
import { authManageApi } from '@/api/authManage'
import { userAuditApi, type AuditUser } from '@/api/userAudit'
import { departmentApi, type Department } from '@/api/department'
import { getStoredUserProfile, getCurrentUserId, getCurrentDeptId, isAdminAccount, isDepartmentAdmin } from '@/utils/auth'
import {
  getStatus,
  getButtonVisibility,
  AuditStatusLabel,
  AuditStatusClass,
} from '@/utils/auditStatus'
import SearchInput from '@/components/common/SearchInput.vue'

const router = useRouter()
const route = useRoute()
const props = withDefaults(defineProps<{ embedded?: boolean; manage?: boolean }>(), {
  embedded: false,
  manage: false,
})

interface SkillItem {
  id: string
  title: string
  description: string
  category: string
  isPinned: boolean
  createdAt: number
  originalId: number
  isPublic: boolean
  /** 供 getButtonVisibility / getStatus 使用的字段 */
  is_public?: boolean
  status?: string
  dept_audit_status?: string
  super_audit_status?: string
  _source?: 'created' | 'authorized'
}

// ============ Tab State ============
const activeTab = ref<'mine' | 'general'>('mine')

const mineSearchKeyword = ref('')
const mineCategory = ref('')
const mineCurrentPage = ref(1)

const generalSearchKeyword = ref('')
const generalCategory = ref('')
const generalCurrentPage = ref(1)

// ============ Data State ============
const selectedCategory = ref('')
const searchKeyword = ref('')
const descriptionKeyword = ref('')
const skillsList = ref<SkillItem[]>([])
const fullSkillItems = ref<SkillManageItem[]>([])
const fullSkillListLoaded = ref(false)
const categoryOptions = ref<string[]>([])
const listLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(12)
const totalSkills = ref(0)
const uploadDialogVisible = ref(false)
const selectedSkillFile = ref<File | null>(null)
const skillUploadInput = ref<HTMLInputElement | null>(null)
const templateDownloading = ref(false)
const skillUploading = ref(false)
// ============ Form State ============
const skillNameForm = ref('')
const skillCategoryForm = ref('')
const skillDescForm = ref('')
const skillIconForm = ref('🔧')

// ============ Computed ============
const isManageMode = computed(() => props.manage || route.query.mode === 'manage')
const isEmbedded = computed(() => props.embedded || window.self !== window.top)
const showAddButton = computed(() => true)
const isManager = computed(() => isAdminAccount() || isDepartmentAdmin())
const isSuperAdmin = computed(() => isAdminAccount())

const apiCategories = computed(() =>
  categoryOptions.value.map((category) => ({ label: category, value: category })),
)

// Mine tab skills — 所有有权限的技能
const mineSkills = computed(() => {
  let skills = fullSkillItems.value.map((s, i) => normalizeSkill(s, i))
  if (mineSearchKeyword.value) {
    const kw = mineSearchKeyword.value.toLowerCase()
    skills = skills.filter(s => s.title.toLowerCase().includes(kw) || s.description.toLowerCase().includes(kw))
  }
  if (mineCategory.value) {
    skills = skills.filter(s => s.category === mineCategory.value)
  }
  return skills
})

const filteredMineSkills = computed(() => mineSkills.value)
const mineCount = computed(() => mineSkills.value.length)
const mineTotalPages = computed(() => Math.ceil(filteredMineSkills.value.length / pageSize.value) || 1)
const paginatedMineSkills = computed(() => {
  const start = (mineCurrentPage.value - 1) * pageSize.value
  return filteredMineSkills.value.slice(start, start + pageSize.value)
})

// General tab skills — 通过 /auth/resources.xhtml 获取公开上架的通用技能
const generalSkillItems = ref<PublicResourceItem[]>([])
const generalSkillsLoading = ref(false)

const loadGeneralSkills = async () => {
  generalSkillsLoading.value = true
  try {
    const result = await getPublicResources({
      resource_type: 'skill',
      is_public: true,
      limit: 200,
    })
    generalSkillItems.value = result.list
  } catch {
    generalSkillItems.value = []
  } finally {
    generalSkillsLoading.value = false
  }
}

const normalizePublicSkill = (item: PublicResourceItem, index: number): SkillItem => ({
  id: `general-${index}-${item.resource_name || 'skill'}`,
  title: item.resource_name || '未命名技能',
  description: item.description?.trim() || '暂无描述',
  category: '', // PublicResourceItem 无 skill_type
  isPinned: false,
  createdAt: Date.now() - index,
  originalId: item.resource_id,
  isPublic: item.is_public || false,
  is_public: item.is_public || false,
  status: undefined,
  dept_audit_status: item.dept_audit_status || '',
  super_audit_status: item.super_audit_status || '',
})

const generalSkills = computed(() => {
  let skills = generalSkillItems.value
    .map((s, i) => normalizePublicSkill(s, i + 100))
  if (generalSearchKeyword.value) {
    const kw = generalSearchKeyword.value.toLowerCase()
    skills = skills.filter(s => s.title.toLowerCase().includes(kw) || s.description.toLowerCase().includes(kw))
  }
  if (generalCategory.value) {
    skills = skills.filter(s => s.category === generalCategory.value)
  }
  return skills
})

const filteredGeneralSkills = computed(() => generalSkills.value)
const generalCount = computed(() => generalSkills.value.length)
const generalTotalPages = computed(() => Math.ceil(filteredGeneralSkills.value.length / pageSize.value) || 1)
const paginatedGeneralSkills = computed(() => {
  const start = (generalCurrentPage.value - 1) * pageSize.value
  return filteredGeneralSkills.value.slice(start, start + pageSize.value)
})

const goBack = () => {
  router.push('/')
}

const normalizeSkill = (skill: SkillManageItem & { _source?: string }, index: number): SkillItem => ({
  id: `${currentPage.value}-${index}-${skill.skill_name || 'skill'}`,
  title: skill.skill_name || '未命名技能',
  description: skill.description?.trim() || '暂无描述',
  category: skill.skill_type || '',
  isPinned: false,
  createdAt: Date.now() - index,
  originalId: skill.id,
  isPublic: skill.is_public || false,
  is_public: skill.is_public || false,
  status: skill.status,
  dept_audit_status: skill.dept_audit_status,
  super_audit_status: skill.super_audit_status,
  _source: (skill as any)._source,
})

// ============ API Logic ============
const updatePagedFullSkills = () => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  skillsList.value = fullSkillItems.value.slice(start, end).map(normalizeSkill)
  totalSkills.value = fullSkillItems.value.length
}

const loadFullSkills = async () => {
  if (!fullSkillListLoaded.value) {
    try {
      const userId = getCurrentUserId()
      const deptId = getCurrentDeptId()
      const data = await getMyResources('skill', userId ?? undefined, deptId ?? undefined)
      fullSkillItems.value = data.list.skills || []
      if (fullSkillItems.value.length) {
        categoryOptions.value = [...new Set(fullSkillItems.value.map((s) => s.skill_type).filter(Boolean) as string[])]
      }
    } catch {
      fullSkillItems.value = []
    }
    fullSkillListLoaded.value = true
  }
  updatePagedFullSkills()
}

const loadSkills = async () => {
  listLoading.value = true
  try {
    const keyword = searchKeyword.value.trim()
    const description = descriptionKeyword.value.trim()
    const isFullQuery = !selectedCategory.value && !keyword && !description

    if (isFullQuery) {
      await loadFullSkills()
      return
    }

    // 有筛选条件时也加载全部，然后客户端筛选
    await loadFullSkills()
  } catch (error) {
    skillsList.value = []
    totalSkills.value = 0
  } finally {
    listLoading.value = false
  }
}

const openSkillFilePicker = () => {
  skillUploadInput.value?.click()
}

const handleSkillFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedSkillFile.value = input.files?.[0] || null
}

const downloadTemplate = async () => {
  templateDownloading.value = true
  try {
    const response = await getSkillTemplate()
    if (!response.download_url) {
      throw new Error('模板下载地址为空')
    }
    const link = document.createElement('a')
    link.href = response.download_url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    if (response.filename) {
      link.download = response.filename
    }
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '模板下载失败')
  } finally {
    templateDownloading.value = false
  }
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { detail?: string; message?: string } } }).response
      ?.data
    return data?.detail || data?.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

const handleUploadSkill = async () => {
  if (!selectedSkillFile.value) {
    ElMessage.warning('请先选择技能包文件')
    return
  }
  const skillName = skillNameForm.value.trim()
  if (!skillName) {
    ElMessage.warning('请输入技能名称')
    return
  }
  skillUploading.value = true
  try {
    // 1. 调用上传接口，上传技能包文件
    const uploadResponse = await uploadSkill(selectedSkillFile.value, {
      skill_name: skillName || undefined,
    })

    // 2. 上传成功后，调用后台 skill/create 接口，从上传返回中取 skill_name 和 category
    await skillManageApi.create({
      skill_code: uploadResponse.skill_name || skillName,
      skill_name: uploadResponse.skill_name || uploadResponse.manifest?.name || skillName,
      description: uploadResponse.manifest?.description || '',
      skill_type: uploadResponse.manifest?.category || uploadResponse.manifest?.type || undefined,
      skill_config: uploadResponse.path ? { api_url: uploadResponse.path } : undefined,
    })

    ElMessage.success(uploadResponse.message || '技能上传成功')
    uploadDialogVisible.value = false
    resetUploadForm()
    fullSkillItems.value = []
    fullSkillListLoaded.value = false
    currentPage.value = 1
    await loadSkills()
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error, '技能上传失败'))
  } finally {
    skillUploading.value = false
  }
}

// ============ Skill Actions ============
const publishSkill = async (skill: SkillItem) => {
  try {
    await skillManageApi.applyPublish(skill.originalId)
    ElMessage.success(`技能「${skill.title}」上架申请已提交，请等待审核`)
  } catch (e: any) {
    ElMessage.error(e.message || '申请上架失败')
  }
}

const unpublishSkill = async (skill: SkillItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要对技能「${skill.title}」申请下架吗？`,
      '下架确认',
      { confirmButtonText: '确认下架', cancelButtonText: '取消', type: 'warning' },
    )
    await skillManageApi.applyRemove(skill.originalId, '用户申请下架')
    ElMessage.success(`已提交下架申请「${skill.title}」`)
    fullSkillItems.value = []
    fullSkillListLoaded.value = false
    await loadSkills()
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e.message || '申请下架失败')
    }
  }
}

const editSkill = (skill: SkillItem) => {
  ElMessage.info(`编辑技能「${skill.title}」功能开发中`)
}

const deleteSkill = async (skill: SkillItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除技能「${skill.title}」吗？此操作不可恢复。`,
      '删除确认',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' },
    )
    await skillManageApi.delete(skill.originalId)
    ElMessage.success(`技能「${skill.title}」已删除`)
    // 重新加载列表
    fullSkillItems.value = []
    fullSkillListLoaded.value = false
    await loadSkills()
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

// ============ 通用授权（管理员授权给用户） ============
const generalSkillAuthDialogVisible = ref(false)
const generalSkillAuthTarget = ref<SkillItem | null>(null)
const generalSkillAuthUserId = ref<number | null>(null)
const generalSkillAuthGranting = ref(false)
const generalSkillAuthUsers = ref<AuditUser[]>([])
const generalSkillAuthUsersLoading = ref(false)
const generalSkillAuthDeptId = ref<number | null>(null)
const deptList = ref<Department[]>([])

async function loadDeptList() {
  try { deptList.value = await departmentApi.list() } catch { deptList.value = [] }
}

async function openGeneralSkillAuthDialog(skill: SkillItem) {
  generalSkillAuthTarget.value = skill
  generalSkillAuthUserId.value = null
  generalSkillAuthDeptId.value = null
  generalSkillAuthDialogVisible.value = true
  generalSkillAuthUsersLoading.value = true
  try {
    generalSkillAuthUsers.value = await userAuditApi.getAllUsers()
  } catch {
    generalSkillAuthUsers.value = []
  } finally {
    generalSkillAuthUsersLoading.value = false
  }
  loadDeptList()
}

const filteredGeneralSkillAuthUsers = computed(() => {
  if (isSuperAdmin.value) {
    if (!generalSkillAuthDeptId.value) return generalSkillAuthUsers.value
    return generalSkillAuthUsers.value.filter(u => u.dept_id === generalSkillAuthDeptId.value)
  }
  const profile = getStoredUserProfile()
  const myDeptId = profile?.dept_id
  if (myDeptId) return generalSkillAuthUsers.value.filter(u => u.dept_id === myDeptId)
  const myDept = profile?.department || ''
  if (!myDept) return generalSkillAuthUsers.value
  return generalSkillAuthUsers.value.filter(u => (u.department || '') === myDept)
})

async function doGeneralSkillAuth() {
  if (!generalSkillAuthTarget.value || !generalSkillAuthUserId.value) {
    ElMessage.warning('请选择用户')
    return
  }
  generalSkillAuthGranting.value = true
  try {
    await authManageApi.grant({
      auth_target_type: 'user',
      user_id: generalSkillAuthUserId.value,
      resource_type: 'skill',
      resource_id: generalSkillAuthTarget.value.originalId,
    })
    ElMessage.success('授权成功')
    generalSkillAuthDialogVisible.value = false
  } catch (e: any) {
    ElMessage.error(e.message || '授权失败')
  } finally {
    generalSkillAuthGranting.value = false
  }
}

// ============ Lifecycle ============
watch(activeTab, (tab) => {
  if (tab === 'general' && generalSkillItems.value.length === 0) {
    loadGeneralSkills()
  }
})

onMounted(() => {
  loadSkills()
  loadGeneralSkills()
})

onBeforeUnmount(() => {
  // cleanup handled by Vue
})

// ============ Category Utilities ============
const getCategoryLabel = (categoryValue: string): string => categoryValue || '未分类'

const SKILL_ICON_MAP: Record<string, typeof MagicStick> = {
  投资受损群体防控报告: Document,
  公文规范表述核稿: EditPen,
  习近平总书记重要论述知识库查询: Search,
}
const getSkillIcon = (title: string) => SKILL_ICON_MAP[title] || MagicStick

const CATEGORY_GRADIENTS: Record<string, string> = {
  办公: 'linear-gradient(135deg, #4f7cff, #7b9fff)',
  知识检索: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  人员核查: 'linear-gradient(135deg, #1565c0, #42a5f5)',
  车辆分析: 'linear-gradient(135deg, #2e7d32, #66bb6a)',
  案件研判: 'linear-gradient(135deg, #e65100, #ff9800)',
  情报分析: 'linear-gradient(135deg, #c62828, #ef5350)',
  治安管控: 'linear-gradient(135deg, #6a1b9a, #ab47bc)',
  反诈预警: 'linear-gradient(135deg, #00695c, #26a69a)',
}
const DEFAULT_CATEGORY_GRADIENT = 'linear-gradient(135deg, #64748b, #94a3b8)'
const getCategoryGradient = (category: string) =>
  CATEGORY_GRADIENTS[category] || DEFAULT_CATEGORY_GRADIENT

function hasSkillActions(skill: SkillItem): boolean {
  // 授权资源不显示操作按钮
  if (skill._source === 'authorized') return false
  const vis = getButtonVisibility(skill)
  return vis.showPublish || vis.showUnpublish || vis.showEdit || vis.showDelete || isManageMode.value
}

const resetUploadForm = () => {
  skillNameForm.value = ''
  skillCategoryForm.value = ''
  skillDescForm.value = ''
  skillIconForm.value = '🔧'
  selectedSkillFile.value = null
  if (skillUploadInput.value) {
    skillUploadInput.value.value = ''
  }
}

const handleAddSkill = () => {
  resetUploadForm()
  uploadDialogVisible.value = true
}
</script>

<style scoped>
/* ================================================================
   SkillsMarketView — 技能库 (新产品设计风格)
   所有主要样式来自 design-tokens.css，此处仅保留必要覆盖
   ================================================================ */

/* 分页行 */
.ds-pagination-row {
  display: flex;
  justify-content: center;
  padding-top: 20px;
  margin-top: 8px;
  border-top: 1px solid var(--ds-border);
}

.ds-pagination-row :deep(.el-pagination) {
  --el-pagination-bg-color: var(--ds-panel-muted);
  --el-pagination-button-bg-color: var(--ds-panel-muted);
  --el-pagination-hover-color: var(--ds-primary);
}

/* 骨架加载 */
.ds-card--skeleton {
  pointer-events: none;
  opacity: 0.6;
}

.ds-card--skeleton .ds-card-icon--skeleton {
  background: var(--ds-border);
}

.ds-skeleton-line {
  height: 14px;
  background: var(--ds-border);
  border-radius: 8px;
}

.ds-skeleton-line--name {
  width: 140px;
  height: 17px;
  margin-bottom: 8px;
}

.ds-skeleton-line--desc {
  width: 100%;
  height: 13px;
  margin-bottom: 6px;
}

.ds-skeleton-line--tag {
  width: 80px;
  height: 24px;
  margin-top: auto;
}

/* ================================================================
   上传对话框 — 表单网格 + 文件拖拽区
   ================================================================ */

/* 表单网格（2列） */
.ds-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}

.ds-form-item {
  margin-bottom: 14px;
}

.ds-form-item--full {
  grid-column: 1 / -1;
}

.ds-form-item label {
  display: block;
  font-size: 13px;
  color: var(--ds-text-secondary);
  font-weight: 500;
  margin-bottom: 5px;
  font-family: var(--ds-font);
}

.ds-form-req {
  color: var(--ds-danger);
}

.ds-form-input,
.ds-form-select,
.ds-form-textarea {
  width: 100%;
  padding: 9px 13px;
  border: 1px solid var(--ds-border);
  border-radius: 7px;
  font-size: 14px;
  font-family: var(--ds-font);
  color: var(--ds-text);
  background: var(--ds-panel);
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.ds-form-input:focus,
.ds-form-select:focus,
.ds-form-textarea:focus {
  outline: none;
  border-color: var(--ds-primary-light);
}

.ds-form-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.6;
}

.ds-form-select {
  cursor: pointer;
  appearance: auto;
}

/* 文件上传区 */
.skill-upload {
  margin-top: 4px;
}

.skill-upload__input {
  display: none;
}

.skill-upload__dropzone {
  width: 100%;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  border: 2px dashed var(--ds-border);
  border-radius: 12px;
  color: var(--ds-text);
  background: var(--ds-panel-muted);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.22s ease, background 0.22s ease;
  font-family: var(--ds-font);
}

.skill-upload__dropzone:hover {
  border-color: var(--ds-primary);
  background: var(--ds-primary-soft);
}

.skill-upload__dropzone-icon {
  font-size: 34px;
  color: var(--ds-primary);
  opacity: 0.8;
}

.skill-upload__title {
  max-width: 100%;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-upload__desc {
  color: var(--ds-text-secondary);
  font-size: 13px;
}

.skill-upload__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.skill-upload__actions {
  display: inline-flex;
  gap: 10px;
}

/* 响应式 */
@media (max-width: 768px) {
  .ds-form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .ds-form-item--full {
    grid-column: 1;
  }

  .skill-upload__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .skill-upload__actions {
    justify-content: flex-end;
  }

  .ds-pagination-row {
    padding-top: 14px;
  }
}
</style>
