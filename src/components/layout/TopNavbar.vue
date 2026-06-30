<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElPopover } from 'element-plus'
import { SwitchButton } from '@element-plus/icons-vue'
import { clearAuth, getStoredUserProfile, isAdminAccount, isDepartmentAdmin, isSecurityAuditor } from '@/utils/auth'
import { auditApi } from '@/api/audit'
import iconLogo from '@/assets/icons/chat/icon-jh.png'

const router = useRouter()
const route = useRoute()

// User state
const userProfile = computed(() => getStoredUserProfile())
const userDisplayName = computed(() => userProfile.value?.name || '用户')

// Role badge — 显示所有特殊角色
const isSpecialUser = computed(() => isAdminAccount() || isDepartmentAdmin() || isSecurityAuditor())
const userRoleLabel = computed(() => {
  const labels: string[] = []
  if (isAdminAccount()) labels.push('超级管理员')
  if (isDepartmentAdmin()) labels.push('部门管理员')
  if (isSecurityAuditor()) labels.push('安全审计员')
  return labels.join(' / ')
})

const userMenuVisible = ref(false)

// 待审批角标计数
const approvalBadgeCount = ref(0)
let approvalPollTimer: ReturnType<typeof setInterval> | null = null

async function refreshApprovalCount() {
  const isManager = isAdminAccount() || isDepartmentAdmin()
  if (!isManager) return
  try {
    approvalBadgeCount.value = await auditApi.getTotalPendingCount(isAdminAccount())
  } catch {
    // 静默失败，角标保持旧值
  }
}

onMounted(() => {
  refreshApprovalCount()
  approvalPollTimer = setInterval(refreshApprovalCount, 10 * 60_000)
})

onBeforeUnmount(() => {
  if (approvalPollTimer) {
    clearInterval(approvalPollTimer)
    approvalPollTimer = null
  }
})

// Navigation items
interface NavMenuItem {
  id: string
  label: string
  route: string
  matchPaths: string[]
  badge?: number
}

const navMenuItems: NavMenuItem[] = [
  { id: 'chat', label: '做一做', route: '/', matchPaths: ['/', '/chat'] },
  {
    id: 'skills-market',
    label: '技能库',
    route: '/skills-market',
    matchPaths: ['/skills-market'],
  },
  { id: 'mcp', label: 'MCP专区', route: '/mcp-management', matchPaths: ['/mcp-management'] },
  {
    id: 'digital-police',
    label: '数字警员库',
    route: '/digital-police',
    matchPaths: ['/digital-police'],
  },
  {
    id: 'my-permissions',
    label: '我的权限',
    route: '/my-permissions',
    matchPaths: ['/my-permissions'],
  },
  { id: 'admin', label: '系统管理', route: '/admin-management', matchPaths: ['/admin-management'] },
  { id: 'log-query', label: '安全审计', route: '/log-query', matchPaths: ['/log-query'] },
]

// 角色菜单权限（支持多角色叠加）：
// 安全审计 → 安全审计员可见
// 我的权限 / 系统管理 → 超级管理员 / 部门管理员可见
// 做一做 / 技能库 / MCP专区 / 数字警员库 → 所有角色可见
const visibleNavItems = computed(() => {
  const isAuditor = isSecurityAuditor()
  const isManager = isAdminAccount() || isDepartmentAdmin()

  return navMenuItems
    .filter((item) => {
      if (item.id === 'log-query') return isAuditor
      if (item.id === 'admin' || item.id === 'my-permissions') return isManager
      return true
    })
    .map((item) => ({
      ...item,
      badge: item.id === 'admin' ? approvalBadgeCount.value : undefined,
    }))
})

const isNavActive = (item: NavMenuItem) => {
  return item.matchPaths.some((p) => route.path === p || route.path.startsWith(p + '/'))
}

const handleNavClick = (item: NavMenuItem) => {
  if (route.path === item.route) return
  router.push(item.route)
}

const handleBrandClick = () => {
  router.push('/')
}

const handleLogout = async () => {
  userMenuVisible.value = false
  clearAuth()
  await router.replace('/login')
}
</script>

<template>
  <header class="top-navbar">
    <!-- 左侧：品牌 -->
    <button class="top-navbar__brand" type="button" @click="handleBrandClick">
      <img :src="iconLogo" alt="Logo" class="top-navbar__logo" />
      <span class="top-navbar__brand-text">苏小智中枢智能体</span>
    </button>

    <!-- 中间：导航菜单 -->
    <nav class="top-navbar__nav">
      <button
        v-for="item in visibleNavItems"
        :key="item.id"
        class="top-navbar__nav-btn"
        :class="{ 'top-navbar__nav-btn--active': isNavActive(item) }"
        type="button"
        @click="handleNavClick(item)"
      >
        {{ item.label }}
        <span v-if="item.badge && item.badge > 0" class="top-navbar__nav-badge">{{ item.badge > 99 ? '99+' : item.badge }}</span>
      </button>
    </nav>

    <!-- 右侧：用户信息 -->
    <div class="top-navbar__user">
      <el-popover
        v-model:visible="userMenuVisible"
        placement="bottom-end"
        trigger="click"
        :width="160"
        :show-arrow="false"
        popper-class="top-navbar-user-popover"
      >
        <div class="top-navbar-user-popover__menu">
          <button
            class="top-navbar-user-popover__menu-item top-navbar-user-popover__menu-item--danger"
            type="button"
            @click="handleLogout"
          >
            <el-icon><SwitchButton /></el-icon>
            <span>退出登录</span>
          </button>
        </div>
        <template #reference>
          <button class="top-navbar__user-btn" type="button" aria-label="用户菜单">
            <span class="top-navbar__user-avatar">{{ userDisplayName.charAt(0) }}</span>
            <span class="top-navbar__user-name">{{ userDisplayName }}</span>
            <span v-if="isSpecialUser" class="top-navbar__user-role-tag">{{ userRoleLabel }}</span>
          </button>
        </template>
      </el-popover>
    </div>
  </header>
</template>

<style scoped src="./TopNavbar.css"></style>
