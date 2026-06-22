import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setThemePageOverride } from '@/composables/useTheme'
import { isAdminAccount, isLoggedIn } from '@/utils/auth'

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
        meta: { title: '情指助手', requiresAuth: true },
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
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '注册', requiresAuth: false },
  },
  {
    path: '/admin-management',
    name: 'AdminManagement',
    component: () => import('@/views/AdminManagementView.vue'),
    meta: { title: '后台管理', requiresAuth: true, requiresAdmin: true },
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
    meta: { title: '日志查询', requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/model-management',
    name: 'ModelManagement',
    component: () => import('@/views/ModelManagementView.vue'),
    meta: { title: '模型管理', requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/knowledge-base',
    name: 'KnowledgeBase',
    component: () => import('@/views/KnowledgeBaseView.vue'),
    meta: { title: '知识库', requiresAuth: true },
  },
  {
    path: '/expert-center',
    name: 'ExpertCenter',
    component: () => import('@/views/ExpertCenterView.vue'),
    meta: { title: '专家中心', requiresAuth: true },
  },
  {
    path: '/smart-warning',
    name: 'SmartWarning',
    component: () => import('@/views/SmartWarningView.vue'),
    meta: { title: '智能预警', requiresAuth: true },
  },
  {
    path: '/skills-market',
    name: 'SkillsMarket',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: '技能库', requiresAuth: true },
  },
  {
    path: '/app-connection',
    name: 'AppConnection',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: '任务计划', requiresAuth: true },
  },
  {
    path: '/mcp-management',
    name: 'McpManagement',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: 'MCP 专区', requiresAuth: true },
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

  if (['/login', '/register'].includes(to.path) && isLoggedIn()) {
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
