import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setThemePageOverride } from '@/composables/useTheme'
import { isAdminAccount, isDepartmentAdmin, isLoggedIn, isSecurityAuditor } from '@/utils/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: '首页', requiresAuth: true },
    children: [
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/views/ChatView.vue'),
        meta: { title: '苏小智', requiresAuth: true },
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/admin-management',
    name: 'AdminManagement',
    component: () => import('@/views/AdminManagementView.vue'),
    meta: { title: '后台管理', requiresAuth: true, requiresManager: true },
  },
  {
    path: '/account-audit',
    name: 'AccountAudit',
    component: () => import('@/views/AccountAuditView.vue'),
    meta: { title: '账号审核', requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/log-query',
    name: 'LogQuery',
    component: () => import('@/views/LogQueryView.vue'),
    meta: { title: '安全审计', requiresAuth: true, requiresAudit: true },
  },
  {
    path: '/model-management',
    name: 'ModelManagement',
    component: () => import('@/views/ModelManagementView.vue'),
    meta: { title: '模型管理', requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/skills-market',
    name: 'SkillsMarket',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: '技能库', requiresAuth: true },
  },
  {
    path: '/mcp-management',
    name: 'McpManagement',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: 'MCP 专区', requiresAuth: true },
  },
  {
    path: '/digital-police',
    name: 'DigitalPolice',
    component: () => import('@/views/DigitalPoliceView.vue'),
    meta: { title: '数字警员库', requiresAuth: true },
  },
  {
    path: '/my-permissions',
    name: 'MyPermissions',
    component: () => import('@/views/MyPermissionsView.vue'),
    meta: { title: '我的权限', requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title as string
  }

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !isLoggedIn()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && !isAdminAccount()) {
    return '/'
  }

  if (to.meta.requiresAudit && !(isAdminAccount() || isSecurityAuditor())) {
    return '/'
  }

  if (to.meta.requiresManager && !(isAdminAccount() || isDepartmentAdmin())) {
    return '/'
  }

  if (['/login'].includes(to.path) && isLoggedIn()) {
    return '/'
  }

  return true
})

router.afterEach((to) => {
  // 仅登录页强制浅色主题，注册页跟随系统/用户设置
  const forceLight = to.path === '/login'
  setThemePageOverride(forceLight ? 'auth' : null)
})

export default router
