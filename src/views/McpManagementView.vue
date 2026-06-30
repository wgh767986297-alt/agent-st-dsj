<template>
  <div class="ds-page-wrapper ds-page" :class="{ 'ds-page--embedded': isEmbedded }">
    <div class="ds-page-container">
    <!-- ==================== 页面标题 ==================== -->
    <div class="ds-page-title-row">
      <h1 class="ds-page-title">MCP服务专区</h1>
    </div>
    <p class="ds-page-desc">
      MCP（Model Context Protocol）服务专区。普通用户可将MCP服务注册到【我的MCP服务】直接使用；若需发布上架到【通用MCP服务】供全员使用，须经部门管理员审核 + 超级管理员审核（二级审核）通过后上架。上架后由管理员分配授权，下架后用户可自行删除。
    </p>

    <!-- ==================== 分区标签 ==================== -->
    <div class="ds-section-tabs">
      <button
        class="ds-section-tab"
        :class="{ active: activeTab === 'mine' }"
        @click="activeTab = 'mine'; currentPage = 1"
      >
        我的MCP服务<span class="count">({{ mineTotal }})</span>
      </button>
      <button
        class="ds-section-tab"
        :class="{ active: activeTab === 'general' }"
        @click="activeTab = 'general'; currentPage = 1"
      >
        通用MCP服务<span class="count">({{ generalTotal }})</span>
      </button>
    </div>

    <!-- ==================== 我的MCP服务 ==================== -->
    <div class="ds-section-panel" v-show="activeTab === 'mine'">
      <div class="ds-section-head">
        <h3>
          我的MCP服务
          <span class="ds-section-subtitle">本部门/本人注册并可直接使用的MCP服务</span>
        </h3>
        <button class="ds-btn-primary" @click="openCreateDialog">
          <el-icon :size="14"><Plus /></el-icon>
          注册MCP服务
        </button>
      </div>
      <div class="ds-toolbar">
        <SearchInput
          v-model="searchQuery"
          placeholder="搜索我的MCP服务..."
          @search="handleSearch"
        />
        <el-select v-model="currentCategory" style="width: 140px" clearable placeholder="全部分类" @change="handleSearch">
          <el-option
            v-for="cat in categoryOptions"
            :key="cat.value"
            :label="cat.label"
            :value="cat.value"
          />
        </el-select>
        <button class="ds-btn-outline" @click="refreshList" :disabled="loading">
          <el-icon :size="14"><Refresh /></el-icon>
          刷新
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="ds-card-grid">
        <div v-for="n in 6" :key="n" class="ds-card mcp-skeleton-card">
          <div class="mcp-skeleton-icon"></div>
          <div class="mcp-skeleton-line mcp-skeleton-line--name"></div>
          <div class="mcp-skeleton-line mcp-skeleton-line--desc"></div>
          <div class="mcp-skeleton-line mcp-skeleton-line--tag"></div>
          <div class="mcp-skeleton-line mcp-skeleton-line--short"></div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="loadError" class="ds-empty">
        <el-icon :size="48"><Warning /></el-icon>
        <p style="margin-top:12px;">加载失败：{{ loadError }}</p>
        <button class="ds-btn-outline" style="margin-top:16px;" @click="refreshList">重试</button>
      </div>

      <!-- 卡片网格 -->
      <div v-else-if="mineItems.length > 0" class="ds-card-grid">
        <div
          v-for="item in mineItems"
          :key="item.id"
          class="ds-card ds-card--clickable"
          role="article"
          :aria-label="item.service_name"
          @click="openDetail(item)"
        >
          <div
            class="ds-card-icon"
            :style="{ background: categoryIconStyle(item.service_type).bg, color: categoryIconStyle(item.service_type).color }"
          >
            {{ getInitial(item.service_name) }}
          </div>
          <div class="ds-card-name">{{ item.service_name }}</div>
          <div class="ds-card-desc">{{ item.description || '暂无描述' }}</div>
          <div class="ds-card-tags">
            <span class="ds-card-tag ds-card-tag--category">{{ categoryLabel(item.service_type) }}</span>
            <span class="ds-card-tag ds-card-tag--mcp">MCP</span>
          </div>
          <div class="ds-card-status">
            <span v-if="getStatus(item) !== '00'" :class="auditStatusClass(item)">{{ auditStatusText(item) }}</span>
          </div>
          <div v-if="hasMineMcpActions(item)" class="ds-card-actions">
            <button v-if="getMineButtonVis(item).showPublish" class="ds-btn-mini-primary" @click.stop="applyPublishMCP(item)" aria-label="申请上架">
              申请上架
            </button>
            <button v-if="getMineButtonVis(item).showUnpublish" class="ds-btn-mini-primary" @click.stop="applyUnpublishMCP(item)" aria-label="申请下架">
              申请下架
            </button>
            <button v-if="getMineButtonVis(item).showEdit" class="ds-btn-mini-outline" @click.stop="openEditDialog(item)" aria-label="编辑">
              <el-icon :size="12"><Edit /></el-icon>
              编辑
            </button>
            <button v-if="getMineButtonVis(item).showDelete" class="ds-btn-mini-danger" @click.stop="confirmDeleteMCP(item)" aria-label="删除">
              <el-icon :size="12"><Delete /></el-icon>
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="ds-empty">
        <el-icon :size="48"><Box /></el-icon>
        <p style="margin-top:12px;">
          {{ searchQuery || currentCategory ? '没有找到匹配的 MCP 服务' : '暂无 MCP 服务，点击上方按钮注册' }}
        </p>
      </div>
    </div>

    <!-- ==================== 通用MCP服务 ==================== -->
    <div class="ds-section-panel" v-show="activeTab === 'general'">
      <div class="ds-section-head">
        <h3>
          通用MCP服务
          <span class="ds-section-subtitle">平台统一上架，由管理员分配授权</span>
        </h3>
      </div>
      <div class="ds-toolbar">
        <SearchInput
          v-model="searchQuery"
          placeholder="搜索通用MCP服务..."
          @search="handleSearch"
        />
        <el-select v-model="currentCategory" style="width: 140px" clearable placeholder="全部分类" @change="handleSearch">
          <el-option
            v-for="cat in categoryOptions"
            :key="cat.value"
            :label="cat.label"
            :value="cat.value"
          />
        </el-select>
        <button class="ds-btn-outline" @click="refreshList" :disabled="loading">
          <el-icon :size="14"><Refresh /></el-icon>
          刷新
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="ds-card-grid">
        <div v-for="n in 6" :key="n" class="ds-card mcp-skeleton-card">
          <div class="mcp-skeleton-icon"></div>
          <div class="mcp-skeleton-line mcp-skeleton-line--name"></div>
          <div class="mcp-skeleton-line mcp-skeleton-line--desc"></div>
          <div class="mcp-skeleton-line mcp-skeleton-line--tag"></div>
          <div class="mcp-skeleton-line mcp-skeleton-line--short"></div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="loadError" class="ds-empty">
        <el-icon :size="48"><Warning /></el-icon>
        <p style="margin-top:12px;">加载失败：{{ loadError }}</p>
        <button class="ds-btn-outline" style="margin-top:16px;" @click="refreshList">重试</button>
      </div>

      <!-- 卡片网格 -->
      <div v-else-if="generalItems.length > 0" class="ds-card-grid">
        <div
          v-for="item in generalItems"
          :key="item.resource_id"
          class="ds-card ds-card--clickable"
          role="article"
          :aria-label="item.resource_name"
          @click="openGeneralDetail(item)"
        >
          <div
            class="ds-card-icon"
            :style="{ background: categoryIconStyle().bg, color: categoryIconStyle().color }"
          >
            {{ getInitial(item.resource_name) }}
          </div>
          <div class="ds-card-name">{{ item.resource_name }}</div>
          <div class="ds-card-desc">{{ item.description || '暂无描述' }}</div>
          <div class="ds-card-tags">
            <span class="ds-card-tag ds-card-tag--category">MCP</span>
            <span class="ds-card-tag ds-card-tag--mcp">已上架</span>
          </div>
          <div class="ds-card-status">
            <span class="ds-tag-approved">已上架</span>
          </div>
          <div v-if="item.creator_name || item.dept_name" style="font-size:11px;color:var(--ds-text-secondary);margin-top:4px;">
            创建者：{{ item.creator_name || '—' }} | 部门：{{ item.dept_name || '—' }}
          </div>
          <div v-if="isManager" class="ds-card-actions">
            <button v-if="isManager" class="ds-btn-mini-primary" @click.stop="openGeneralMcpAuthDialog(item)">授权</button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="ds-empty">
        <el-icon :size="48"><Box /></el-icon>
        <p style="margin-top:12px;">
          {{ searchQuery || currentCategory ? '没有找到匹配的 MCP 服务' : '暂无已上架的通用 MCP 服务' }}
        </p>
      </div>
    </div>

    <!-- ==================== 分页 ==================== -->
    <div
      v-if="!loading && !loadError"
      style="display:flex;align-items:center;justify-content:space-between;margin-top:20px;padding-top:16px;border-top:1px solid var(--ds-border);flex-wrap:wrap;gap:12px;"
    >
      <span style="font-size:13px;color:var(--ds-text-secondary);">
        共 <strong style="color:var(--ds-text);">{{ currentTabTotal }}</strong> 条
      </span>
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="currentTabTotal"
        layout="prev, pager, next"
        background
        small
        @current-change="goPage"
      />
    </div>

    <!-- ==================== 创建/编辑对话框 ==================== -->
    <Teleport to="body">
      <transition name="ds-modal-fade">
        <div
          v-if="dialogVisible"
          class="ds-modal-overlay"
        >
          <div class="ds-modal-box" role="dialog" aria-modal="true" :aria-label="dialogTitle">
            <div class="ds-modal-header">
              <h2 class="ds-modal-title">{{ dialogTitle }}</h2>
              <button class="ds-modal-close" type="button" aria-label="关闭" @click="closeDialog">
                <el-icon :size="16"><Close /></el-icon>
              </button>
            </div>

            <div class="ds-modal-body">
              <!-- 1. 服务名称 * -->
              <div class="ds-form-group">
                <label class="ds-form-label">
                  服务名称 <span class="ds-required">*</span>
                </label>
                <input
                  type="text"
                  v-model="formData.service_name"
                  placeholder="例如：出入境记录查询服务"
                  maxlength="60"
                />
              </div>

              <!-- 2. 服务编码 * -->
              <div class="ds-form-group">
                <label class="ds-form-label">
                  服务编码 <span class="ds-required">*</span>
                </label>
                <input
                  type="text"
                  v-model="formData.service_code"
                  placeholder="例如：mcp_crj_query"
                  maxlength="50"
                  :disabled="isEditing"
                />
                <span v-if="!isEditing" style="font-size:11px;color:var(--ds-text-secondary);margin-top:4px;display:block;">
                  唯一标识，创建后不可修改。建议使用英文+下划线
                </span>
              </div>

              <!-- 3. 服务分类 * -->
              <div class="ds-form-group">
                <label class="ds-form-label">
                  服务分类 <span class="ds-required">*</span>
                </label>
                <el-select
                  v-model="formData.service_type"
                  placeholder="请选择分类"
                  style="width: 100%"
                >
                  <el-option
                    v-for="cat in serviceTypeOptions"
                    :key="cat.value"
                    :label="cat.label"
                    :value="cat.value"
                  />
                </el-select>
              </div>

              <!-- 4. MCP服务端地址 * -->
              <div class="ds-form-group">
                <label class="ds-form-label">
                  MCP服务端地址 <span class="ds-required">*</span>
                </label>
                <input
                  type="text"
                  v-model="formData.service_url"
                  placeholder="例如：https://mcp.example.com/huzheng/v1"
                />
              </div>

              <!-- 5. API 密钥 -->
              <div class="ds-form-group">
                <label class="ds-form-label">API 密钥</label>
                <input
                  type="text"
                  v-model="formData.api_key"
                  placeholder="可选，认证密钥"
                />
              </div>

              <!-- 6. 服务描述 * -->
              <div class="ds-form-group">
                <label class="ds-form-label">
                  服务描述 <span class="ds-required">*</span>
                </label>
                <textarea
                  v-model="formData.description"
                  placeholder="请描述该MCP服务的功能、支持的操作及数据范围"
                  rows="3"
                  maxlength="500"
                ></textarea>
              </div>

              <!-- 7. 协议类型 -->
              <div class="ds-form-group">
                <label class="ds-form-label">协议类型</label>
                <el-select
                  v-model="formData.protocol_type"
                  style="width: 100%"
                >
                  <el-option label="Streamable HTTP" value="streamableHttp" />
                  <el-option label="SSE (Server-Sent Events)" value="sse" />
                </el-select>
              </div>

              <!-- 8. 申请说明（仅创建时） -->
              <div v-if="!isEditing" class="ds-form-group">
                <label class="ds-form-label">申请说明</label>
                <textarea
                  v-model="formData.reason"
                  placeholder="请说明注册该服务的业务用途"
                  rows="2"
                  maxlength="300"
                ></textarea>
              </div>
            </div>

            <div class="ds-modal-footer">
              <button class="ds-btn-cancel" @click="closeDialog">取消</button>
              <button class="ds-btn-confirm" :disabled="submitting" @click="submitForm">
                {{ submitting ? '提交中...' : (isEditing ? '保存修改' : '注册MCP服务') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ==================== 详情对话框 ==================== -->
    <Teleport to="body">
      <transition name="ds-modal-fade">
        <div
          v-if="detailVisible"
          class="ds-modal-overlay"
        >
          <div
            class="ds-modal-box"
            role="dialog"
            aria-modal="true"
            aria-label="MCP 服务详情"
          >
            <div class="ds-modal-header">
              <h2 class="ds-modal-title">{{ detailItem?.service_name }}</h2>
              <button
                class="ds-modal-close"
                type="button"
                aria-label="关闭"
                @click="detailVisible = false"
              >
                <el-icon :size="16"><Close /></el-icon>
              </button>
            </div>

            <div v-if="detailItem" class="ds-modal-body">
              <div class="ds-form-group">
                <label class="ds-form-label">服务编码</label>
                <div style="font-size:13px;color:var(--ds-text);font-family:var(--ds-font-mono);word-break:break-all;padding:8px 0;">
                  {{ detailItem.service_code }}
                </div>
              </div>
              <div class="ds-form-group">
                <label class="ds-form-label">服务地址</label>
                <div style="font-size:13px;color:var(--ds-text);font-family:var(--ds-font-mono);word-break:break-all;padding:8px 0;">
                  {{ detailItem.service_url }}
                </div>
              </div>
              <div class="ds-form-group">
                <label class="ds-form-label">协议类型</label>
                <div style="padding:8px 0;">
                  <span class="ds-card-tag ds-card-tag--category">{{ detailItem.protocol_type || 'streamableHttp' }}</span>
                </div>
              </div>
              <div class="ds-form-group">
                <label class="ds-form-label">服务分类</label>
                <div style="padding:8px 0;">
                  <span class="ds-card-tag ds-card-tag--category">{{ categoryLabel(detailItem.service_type) }}</span>
                </div>
              </div>
              <div class="ds-form-group">
                <label class="ds-form-label">审核状态</label>
                <div style="padding:8px 0;">
                  <span v-if="getStatus(detailItem) !== '00'" :class="auditStatusClass(detailItem)">{{ auditStatusText(detailItem) }}</span>
                </div>
              </div>
              <div class="ds-form-group">
                <label class="ds-form-label">工具数量</label>
                <div style="font-size:13px;color:var(--ds-text);padding:8px 0;">
                  {{ detailItem.tools_count ?? (detailItem.tools?.length ?? '—') }}
                </div>
              </div>
              <div class="ds-form-group">
                <label class="ds-form-label">描述</label>
                <p style="font-size:13px;color:var(--ds-text);line-height:1.7;white-space:pre-wrap;margin:8px 0 0;">
                  {{ detailItem.description || '暂无描述' }}
                </p>
              </div>

              <!-- 工具列表 -->
              <div v-if="detailItem.tools && detailItem.tools.length > 0" class="ds-form-group">
                <label class="ds-form-label">工具列表</label>
                <div class="mcp-tools-list">
                  <details
                    v-for="(tool, idx) in detailItem.tools"
                    :key="idx"
                    class="mcp-tool-item"
                    :open="detailItem.tools.length === 1"
                  >
                    <summary class="mcp-tool-summary">
                      <span class="mcp-tool-name">{{ tool.name }}</span>
                      <span class="mcp-tool-desc">{{ tool.description || '暂无描述' }}</span>
                    </summary>
                    <div class="mcp-tool-schema">
                      <pre>{{ JSON.stringify(tool.inputSchema, null, 2) }}</pre>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <div class="ds-modal-footer">
              <button class="ds-btn-cancel" @click="detailVisible = false">关闭</button>
              <button
                v-if="isOwner(detailItem)"
                class="ds-btn-confirm"
                @click="detailVisible = false; openEditDialog(detailItem!)"
              >
                <el-icon :size="14"><Edit /></el-icon>
                编辑
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ==================== 通用授权弹窗 ==================== -->
    <el-dialog
      v-model="generalMcpAuthDialogVisible"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
      class="ds-modal"
    >
      <template #header>
        <h2 class="ds-modal-title">授权 - {{ generalMcpAuthTarget?.resource_name || '' }}</h2>
      </template>

      <div class="ds-modal-body">
        <!-- 超管：部门-人员联动选择 -->
        <div v-if="isSuperAdmin" class="ds-form-group">
          <label class="ds-form-label">选择部门</label>
          <el-select
            v-model="generalMcpAuthDeptId"
            placeholder="全部部门"
            style="width:100%;margin-bottom:16px"
            clearable
            @change="generalMcpAuthUserId = null"
          >
            <el-option v-for="d in deptList" :key="d.id" :label="d.dept_name" :value="d.id" />
          </el-select>
        </div>
        <div class="ds-form-group">
          <label class="ds-form-label">选择用户</label>
          <p v-if="!isSuperAdmin" style="font-size:12px;color:var(--ds-text-subtle);margin:0 0 6px;">仅显示本部门用户</p>
          <el-select
            v-model="generalMcpAuthUserId"
            placeholder="请选择要授权的用户"
            style="width:100%"
            :loading="generalMcpAuthUsersLoading"
          >
            <el-option
              v-for="u in filteredGeneralMcpAuthUsers"
              :key="u.id"
              :label="`${u.name || ''} (${u.idCard || u.phone || u.id || ''})`"
              :value="Number(u.id)"
            />
          </el-select>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <button class="ds-btn-cancel" @click="generalMcpAuthDialogVisible = false">取消</button>
          <button class="ds-btn-confirm" :disabled="generalMcpAuthGranting" @click="doGeneralMcpAuth">
            {{ generalMcpAuthGranting ? '授权中...' : '确认授权' }}
          </button>
        </div>
      </template>
    </el-dialog>
    </div><!-- .ds-page-container -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Plus,
  Edit,
  Delete,
  Box,
  Close,
  Warning,
} from '@element-plus/icons-vue'
import {
  applyPublishMcp,
  applyRemoveMcp,
  createOrUpdateMcp,
  deleteMcpService,
  getMcpDetail,
  type McpServiceItem,
  type McpCreateOrUpdateParams,
} from '@/api/mcpService'
import { getMyResources, getPublicResources, type MyMcpItem, type PublicResourceItem } from '@/api/resource'
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

// ============ Props ============
const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

const isEmbedded = computed(() => props.embedded)
const isManager = computed(() => isAdminAccount() || isDepartmentAdmin())
const isSuperAdmin = computed(() => isAdminAccount())

// ============ 分区标签 ============
const activeTab = ref<'mine' | 'general'>('mine')

// ============ 数据状态 ============
const mineData = ref<MyMcpItem[]>([])
const generalData = ref<PublicResourceItem[]>([])
const mineTotal = ref(0)
const generalTotal = ref(0)
const loading = ref(false)
const loadError = ref('')

// ============ 搜索 & 筛选 ============
const searchQuery = ref('')
const currentCategory = ref('')
const currentPage = ref(1)
const pageSize = 6

// ============ 分类定义 ============
const categoryMap: Record<string, string> = {
  QUERY: '数据查询',
  ANALYSIS: '分析服务',
  EXTERNAL: '外部系统',
  KNOWLEDGE: '知识检索',
}

const categoryIconStyle = (cat?: string): { bg: string; color: string } => {
  const styles: Record<string, { bg: string; color: string }> = {
    QUERY: { bg: '#e3f2fd', color: '#1565c0' },
    ANALYSIS: { bg: '#fff3e0', color: '#e65100' },
    EXTERNAL: { bg: '#e8eaf6', color: '#283593' },
    KNOWLEDGE: { bg: '#f3e5f5', color: '#7b1fa2' },
  }
  return styles[cat || ''] || { bg: '#f5f5f5', color: '#666666' }
}

const categoryLabel = (cat?: string) => categoryMap[cat || ''] || cat || '其他'

const categoryOptions = Object.entries(categoryMap).map(([value, label]) => ({ value, label }))
const serviceTypeOptions = Object.entries(categoryMap).map(([value, label]) => ({ value, label }))

const getInitial = (name?: string) => (name || 'M').charAt(0).toUpperCase()

// ============ 审核状态辅助（使用统一状态码 01-06） ============
function auditStatusText(item: McpServiceItem): string {
  return AuditStatusLabel[getStatus(item)] || '未上架'
}

function auditStatusClass(item: McpServiceItem): string {
  return AuditStatusClass[getStatus(item)] || 'ds-tag-approved'
}

/** 获取按钮可见性（先判断 _source，授权资源无操作权限） */
function getMineButtonVis(item: McpServiceItem & { _source?: string }) {
  if (item._source === 'authorized') {
    return { showPublish: false, showUnpublish: false, showEdit: false, showDelete: false }
  }
  return getButtonVisibility(item)
}

function hasMineMcpActions(item: McpServiceItem & { _source?: string }): boolean {
  const vis = getMineButtonVis(item)
  return vis.showPublish || vis.showUnpublish || vis.showEdit || vis.showDelete
}

function isOwner(item: McpServiceItem & { _source?: string } | null): boolean {
  if (!item) return false
  return activeTab.value === 'mine' && item._source !== 'authorized'
}

// ============ 当前 Tab 显示数据 ============
const mineItems = computed(() => mineData.value)
const generalItems = computed(() => {
  // API 返回扁平数组不支持服务端分页，客户端切片
  const start = (currentPage.value - 1) * pageSize
  return generalData.value.slice(start, start + pageSize)
})

const currentTabTotal = computed(() => {
  return activeTab.value === 'mine' ? mineTotal.value : generalTotal.value
})

// ============ API 方法 ============
async function loadData(tab?: 'mine' | 'general' | 'both') {
  const t = tab ?? activeTab.value
  loading.value = true
  loadError.value = ''
  try {
    if (t === 'mine' || t === 'both') {
      // 我的MCP服务 → /resource/my/list.xhtml（客户端分页+筛选）
      const userId = getCurrentUserId()
      const deptId = getCurrentDeptId()
      const data = await getMyResources('mcp', userId ?? undefined, deptId ?? undefined)
      let items: MyMcpItem[] = data.list.mcps || []

      // 客户端筛选（仅单独加载 mine 时应用；both 时 searchQuery 为空）
      if (t === 'mine') {
        if (searchQuery.value.trim()) {
          const kw = searchQuery.value.trim().toLowerCase()
          items = items.filter(
            (i) =>
              i.service_name.toLowerCase().includes(kw) ||
              (i.description || '').toLowerCase().includes(kw),
          )
        }
        if (currentCategory.value) {
          items = items.filter((i) => i.service_type === currentCategory.value)
        }
      }

      mineData.value = items
      mineTotal.value = items.length
    }
    if (t === 'general' || t === 'both') {
      // 通用MCP服务 → /auth/resources.xhtml
      const params: Record<string, unknown> = {
        resource_type: 'mcp',
        is_public: true,
        page: t === 'general' ? currentPage.value : 1,
        limit: t === 'general' ? pageSize : 200,
      }
      // 通用接口不支持 category 筛选，客户端过滤
      const data = await getPublicResources(params as import('@/api/resource').PublicResourceParams)
      let items = data.list || []

      // 客户端分类筛选（仅单独加载 general 时应用）
      if (t === 'general' && currentCategory.value) {
        // PublicResourceItem 无 category 字段，此筛选在通用 tab 无效，保留兼容
      }

      generalData.value = items
      generalTotal.value = data.total
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

// ============ 事件处理 ============
const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

const goPage = (page: number) => {
  currentPage.value = page
  // general tab 使用客户端分页，无需重新请求 API
  if (activeTab.value === 'mine') {
    loadData()
  }
}

const refreshList = () => {
  searchQuery.value = ''
  currentCategory.value = ''
  currentPage.value = 1
  loadData()
}

async function applyPublishMCP(item: McpServiceItem) {
  try {
    await applyPublishMcp(item.id)
    ElMessage.success(`MCP 服务「${item.service_name}」上架申请已提交，请等待审核`)
    await loadData()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '申请上架失败')
  }
}

async function applyUnpublishMCP(item: McpServiceItem) {
  try {
    await ElMessageBox.confirm(
      `确定要对 MCP 服务「${item.service_name}」申请下架吗？`,
      '下架确认',
      {
        confirmButtonText: '确认下架',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    await applyRemoveMcp(item.id, '用户申请下架')
    ElMessage.success(`已提交下架申请「${item.service_name}」`)
    await loadData()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e instanceof Error ? e.message : '申请下架失败')
    }
  }
}

async function confirmDeleteMCP(item: McpServiceItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除 MCP 服务「${item.service_name}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    try {
      await deleteMcpService(item.id)
      ElMessage.success(`已删除「${item.service_name}」`)
      await loadData()
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '删除失败')
    }
  } catch {
    // 取消删除
  }
}

// ============ 对话框 ============
const dialogVisible = ref(false)
const dialogTitle = computed(() => (isEditing.value ? '编辑MCP服务' : '注册MCP服务'))
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)

interface McpFormData {
  service_name: string
  service_code: string
  service_url: string
  api_key: string
  description: string
  service_type: string
  protocol_type: string
  reason: string
}

const defaultFormData = (): McpFormData => ({
  service_name: '',
  service_code: '',
  service_url: '',
  api_key: '',
  description: '',
  service_type: '',
  protocol_type: 'streamableHttp',
  reason: '',
})

const formData = ref<McpFormData>(defaultFormData())

function openCreateDialog() {
  isEditing.value = false
  editingId.value = null
  formData.value = defaultFormData()
  dialogVisible.value = true
}

function openEditDialog(item: McpServiceItem) {
  isEditing.value = true
  editingId.value = item.id
  formData.value = {
    service_name: item.service_name,
    service_code: item.service_code,
    service_url: item.service_url,
    api_key: item.api_key || '',
    description: item.description || '',
    service_type: item.service_type || '',
    protocol_type: item.protocol_type || 'streamableHttp',
    reason: '',
  }
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
}

async function submitForm() {
  if (!formData.value.service_name.trim()) {
    ElMessage.warning('请输入服务名称')
    return
  }
  if (!formData.value.service_code.trim()) {
    ElMessage.warning('请输入服务编码')
    return
  }
  if (!formData.value.service_type) {
    ElMessage.warning('请选择服务分类')
    return
  }
  if (!formData.value.service_url.trim()) {
    ElMessage.warning('请输入MCP服务端地址')
    return
  }
  if (!formData.value.description.trim()) {
    ElMessage.warning('请输入服务描述')
    return
  }

  submitting.value = true
  try {
    const payload: McpCreateOrUpdateParams = {
      service_code: formData.value.service_code.trim(),
      service_name: formData.value.service_name.trim(),
      service_url: formData.value.service_url.trim(),
      description: formData.value.description.trim(),
      service_type: formData.value.service_type,
      protocol_type: formData.value.protocol_type || 'streamableHttp',
      id: isEditing.value && editingId.value ? editingId.value : null,
      api_key: formData.value.api_key.trim() || undefined,
    }

    const result = await createOrUpdateMcp(payload)
    ElMessage.success(
      result.message ||
        (isEditing.value ? `MCP 服务「${formData.value.service_name.trim()}」已更新` : `MCP 服务创建成功`),
    )
    closeDialog()
    await loadData()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败，请检查服务地址是否可访问')
  } finally {
    submitting.value = false
  }
}

// ============ 详情对话框 ============
const detailVisible = ref(false)
const detailItem = ref<McpServiceItem | null>(null)

function openDetail(item: McpServiceItem) {
  detailItem.value = item
  detailVisible.value = true
}

// Tab 切换时重置状态（数据已在 onMounted 预加载）
watch(activeTab, () => {
  currentPage.value = 1
  searchQuery.value = ''
  currentCategory.value = ''
})

// ============ 通用详情（点击通用卡片 → 获取 MCP 详情） ============
async function openGeneralDetail(item: PublicResourceItem) {
  loading.value = true
  try {
    const res = await getMcpDetail(item.resource_id)
    detailItem.value = res.data
    detailVisible.value = true
  } catch (e) {
    ElMessage.error('获取详情失败')
  } finally {
    loading.value = false
  }
}

// ============ 通用授权（管理员授权给用户） ============
const generalMcpAuthDialogVisible = ref(false)
const generalMcpAuthTarget = ref<PublicResourceItem | null>(null)
const generalMcpAuthUserId = ref<number | null>(null)
const generalMcpAuthGranting = ref(false)
const generalMcpAuthUsers = ref<AuditUser[]>([])
const generalMcpAuthUsersLoading = ref(false)
const generalMcpAuthDeptId = ref<number | null>(null)
const deptList = ref<Department[]>([])

async function loadDeptList() {
  try { deptList.value = await departmentApi.list() } catch { deptList.value = [] }
}

async function openGeneralMcpAuthDialog(item: PublicResourceItem) {
  generalMcpAuthTarget.value = item
  generalMcpAuthUserId.value = null
  generalMcpAuthDeptId.value = null
  generalMcpAuthDialogVisible.value = true
  generalMcpAuthUsersLoading.value = true
  try {
    generalMcpAuthUsers.value = await userAuditApi.getAllUsers()
  } catch {
    generalMcpAuthUsers.value = []
  } finally {
    generalMcpAuthUsersLoading.value = false
  }
  loadDeptList()
}

const filteredGeneralMcpAuthUsers = computed(() => {
  if (isSuperAdmin.value) {
    if (!generalMcpAuthDeptId.value) return generalMcpAuthUsers.value
    return generalMcpAuthUsers.value.filter(u => u.dept_id === generalMcpAuthDeptId.value)
  }
  const profile = getStoredUserProfile()
  const myDeptId = profile?.dept_id
  if (myDeptId) return generalMcpAuthUsers.value.filter(u => u.dept_id === myDeptId)
  const myDept = profile?.department || ''
  if (!myDept) return generalMcpAuthUsers.value
  return generalMcpAuthUsers.value.filter(u => (u.department || '') === myDept)
})

async function doGeneralMcpAuth() {
  if (!generalMcpAuthTarget.value || !generalMcpAuthUserId.value) {
    ElMessage.warning('请选择用户')
    return
  }
  generalMcpAuthGranting.value = true
  try {
    await authManageApi.grant({
      auth_target_type: 'user',
      user_id: generalMcpAuthUserId.value,
      resource_type: 'mcp',
      resource_id: generalMcpAuthTarget.value.resource_id,
    })
    ElMessage.success('授权成功')
    generalMcpAuthDialogVisible.value = false
  } catch (e: any) {
    ElMessage.error(e.message || '授权失败')
  } finally {
    generalMcpAuthGranting.value = false
  }
}

// ============ 生命周期 ============
onMounted(() => {
  loadData('both')
})
</script>

<style scoped>
/* ================================================================
   McpManagementView — 补充分量样式
   大部分样式由 design-tokens.css (.ds-*) 提供
   ================================================================ */

/* ==================== 审核状态标签 ==================== */
.ds-tag-rejected {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #c62828;
  background: #ffebee;
}

/* ==================== 骨架加载 ==================== */
.mcp-skeleton-card {
  pointer-events: none;
  cursor: default;
}

.mcp-skeleton-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--ds-border);
  animation: mcp-skeleton-pulse 1.5s ease-in-out infinite;
  margin-bottom: 12px;
}

.mcp-skeleton-line {
  height: 14px;
  background: var(--ds-border);
  border-radius: 8px;
  animation: mcp-skeleton-pulse 1.5s ease-in-out infinite;
  margin-bottom: 10px;
}

.mcp-skeleton-line--name {
  width: 140px;
  height: 17px;
}

.mcp-skeleton-line--desc {
  width: 85%;
  height: 13px;
}

.mcp-skeleton-line--tag {
  width: 60px;
  height: 18px;
  border-radius: 4px;
}

.mcp-skeleton-line--short {
  width: 80px;
  height: 13px;
}

@keyframes mcp-skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* ==================== 模态框过渡动画 ==================== */
.ds-modal-fade-enter-active,
.ds-modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.ds-modal-fade-enter-active .ds-modal-box,
.ds-modal-fade-leave-active .ds-modal-box {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ds-modal-fade-enter-from,
.ds-modal-fade-leave-to {
  opacity: 0;
}

.ds-modal-fade-enter-from .ds-modal-box {
  transform: scale(0.94) translateY(12px);
}

.ds-modal-fade-leave-to .ds-modal-box {
  transform: scale(0.96) translateY(4px);
}

/* ==================== 禁用的表单输入 ==================== */
.ds-form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--ds-panel-muted);
}

/* ==================== el-pagination 适配 ==================== */
:deep(.el-pagination.is-background .el-pager li:not(.is-disabled).is-active) {
  background-color: var(--ds-primary);
}

/* ==================== 深色模式下的骨架 ==================== */
:root[data-theme='dark'] .mcp-skeleton-icon,
:root[data-theme='dark'] .mcp-skeleton-line {
  background: var(--ds-border);
}

/* ==================== 可点击卡片 ==================== */
.ds-card--clickable {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.ds-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* ==================== 工具列表（详情对话框） ==================== */
.mcp-tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.mcp-tool-item {
  border: 1px solid var(--ds-border);
  border-radius: 8px;
  overflow: hidden;
}

.mcp-tool-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  user-select: none;
  background: var(--ds-panel-muted);
  transition: background 0.15s ease;
}

.mcp-tool-summary:hover {
  background: var(--ds-border);
}

.mcp-tool-summary::-webkit-details-marker {
  display: none;
}

.mcp-tool-name {
  font-family: var(--ds-font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--ds-primary);
  white-space: nowrap;
  min-width: fit-content;
}

.mcp-tool-desc {
  font-size: 12px;
  color: var(--ds-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mcp-tool-schema {
  padding: 10px 12px;
  border-top: 1px solid var(--ds-border);
  background: var(--ds-surface);
}

.mcp-tool-schema pre {
  margin: 0;
  font-family: var(--ds-font-mono);
  font-size: 11px;
  color: var(--ds-text-secondary);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 260px;
  overflow-y: auto;
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .ds-card-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .ds-card {
    padding: 14px;
  }
}
</style>
