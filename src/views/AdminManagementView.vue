<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElIcon } from 'element-plus'
import {
  Monitor,
  Tickets,
  UserFilled,
  MagicStick,
  Connection,
} from '@element-plus/icons-vue'
import AccountAuditView from '@/views/AccountAuditView.vue'
import LogQueryView from '@/views/LogQueryView.vue'
import ModelManagementView from '@/views/ModelManagementView.vue'
import SkillsMarketView from '@/views/SkillsMarketView.vue'
import McpManagementView from '@/views/McpManagementView.vue'

type AdminSectionId =
  | 'account-audit'
  | 'log-query'
  | 'model-management'
  | 'skills-management'
  | 'mcp-management'

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
</script>

<template>
  <div class="admin-page">
    <!-- 顶部导航栏 -->
    <header class="admin-topbar">
      <div class="admin-topbar__brand">
        <span class="admin-topbar__logo">M</span>
        <div>
          <span class="admin-topbar__title">后台管理</span>
          <span class="admin-topbar__subtitle">管理员工作台</span>
        </div>
      </div>

      <nav class="admin-tabs">
        <button
          v-for="section in adminSections"
          :key="section.id"
          class="admin-tab"
          :class="{ 'admin-tab--active': activeSectionId === section.id }"
          type="button"
          @click="handleSectionClick(section.id)"
        >
          <el-icon :size="16"><component :is="section.icon" /></el-icon>
          <span>{{ section.label }}</span>
        </button>
      </nav>
    </header>

    <!-- 内容区 -->
    <main class="admin-body">
      <component
        :is="activeSection.component"
        :key="activeSection.id"
        v-bind="activeSectionProps"
      />
    </main>
  </div>
</template>

<style scoped>
.admin-page {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  color: var(--app-text);
  background: var(--app-bg);
  overflow: hidden;
}

/* ==================== 顶部导航栏 ==================== */
.admin-topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 32px;
  height: 64px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-panel);
}

.admin-topbar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.admin-topbar__logo {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
}

.admin-topbar__title {
  display: block;
  font-size: 15px;
  font-weight: 750;
  color: var(--app-text);
  line-height: 1.2;
}

.admin-topbar__subtitle {
  display: block;
  font-size: 11px;
  color: var(--app-text-muted);
}

/* ==================== 标签导航 ==================== */
.admin-tabs {
  display: flex;
  align-items: stretch;
  gap: 4px;
  height: 100%;
}

.admin-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 100%;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--app-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  white-space: nowrap;
}

.admin-tab:hover {
  color: var(--app-text);
  border-bottom-color: var(--app-border-hover);
}

.admin-tab--active {
  color: var(--app-primary);
  border-bottom-color: var(--app-primary);
}

/* ==================== 内容区 ==================== */
.admin-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 24px 28px 0;
  background: var(--app-bg);
}

.admin-body :deep(.account-audit-page),
.admin-body :deep(.skills-market-page),
.admin-body :deep(.log-query-page),
.admin-body :deep(.model-page),
.admin-body :deep(.mcp-page) {
  height: 100%;
  min-height: 0;
  padding: 0;
  color: var(--app-text);
  background: transparent;
}

/* ==================== 响应式 ==================== */
@media (max-width: 900px) {
  .admin-topbar {
    flex-direction: column;
    align-items: flex-start;
    height: auto;
    gap: 12px;
    padding: 14px 20px;
  }

  .admin-tabs {
    width: 100%;
    overflow-x: auto;
    height: auto;
    padding-bottom: 2px;
  }

  .admin-tab {
    height: 40px;
    padding: 0 16px;
    flex-shrink: 0;
  }
}
</style>
