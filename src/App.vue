<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import TopNavbar from '@/components/layout/TopNavbar.vue'
import SystemSettingsDialog from '@/components/settings/SystemSettingsDialog.vue'
// import GlobalWatermark from '@/components/GlobalWatermark.vue'

const route = useRoute()
const settingsVisible = ref(false)

// 登录页面不显示顶部导航栏
const hideNavbar = computed(() => ['/login'].includes(route.path))
</script>

<template>
  <div class="app-root">
    <TopNavbar v-if="!hideNavbar" @open-settings="settingsVisible = true" />
    <main class="app-main" :class="{ 'app-main--no-navbar': hideNavbar }">
      <RouterView v-slot="{ Component }">
        <keep-alive :include="['ChatView']">
          <component :is="Component" />
        </keep-alive>
      </RouterView>
    </main>
    <!-- 水印 -->
    <!-- <GlobalWatermark /> -->
    <!-- 系统设置弹窗（全局） -->
    <SystemSettingsDialog v-model:visible="settingsVisible" />
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-main--no-navbar {
  /* 登录/注册页不需要为导航栏留空间 */
}
</style>

<style>
/* 全局样式 (如 style.css 或 main.css) */
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#app {
  width: 100%;
  height: 100%;
}

header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    font-size: 1rem;
  }
}

/* ==================== el-date-picker 全局面板统一样式 ==================== */
/* 面板通过 teleport 挂载到 body，必须用全局样式覆盖 */

.el-picker-panel {
  border-radius: 14px !important;
  border: 1px solid var(--app-border) !important;
  background: var(--app-panel) !important;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04) !important;
  color: var(--app-text) !important;
}

.el-date-range-picker {
  border-radius: 14px !important;
}

.el-date-range-picker__header {
  color: var(--app-text) !important;
}

/* 日历单元格 */
.el-date-table td {
  color: var(--app-text) !important;
}

.el-date-table td.available:hover {
  color: var(--app-primary) !important;
}

.el-date-table td.current:not(.disabled) .el-date-table-cell__text {
  background-color: var(--app-primary) !important;
  color: #fff !important;
  border-radius: 8px !important;
}

.el-date-table td.today .el-date-table-cell__text {
  color: var(--app-primary) !important;
  font-weight: 600;
}

/* 面板顶部箭头按钮（上/下月、上/下年） */
.el-picker-panel__icon-btn {
  color: var(--app-text-muted) !important;
  border-radius: 8px !important;
  transition: all 0.2s ease;
  width: 28px;
  height: 28px;
}

.el-picker-panel__icon-btn:hover {
  color: var(--app-primary) !important;
  background: var(--app-primary-soft) !important;
}

/* 月份/年份切换文字按钮 */
.el-date-range-picker__header button {
  border-radius: 8px !important;
  transition: all 0.2s ease;
  font-weight: 600 !important;
}

.el-date-range-picker__header button:hover {
  color: var(--app-primary) !important;
}

/* 底部确认/取消按钮 */
.el-picker-panel__footer .el-button {
  border-radius: 8px !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  height: 34px !important;
  padding: 0 16px !important;
}

.el-picker-panel__footer .el-button--default {
  background: var(--app-panel-muted) !important;
  border: 1.5px solid var(--app-border) !important;
  color: var(--app-text-muted) !important;
}

.el-picker-panel__footer .el-button--default:hover {
  background: var(--app-hover) !important;
  border-color: var(--app-border-hover) !important;
  color: var(--app-text) !important;
}

.el-picker-panel__footer .el-button--primary {
  background: var(--app-primary) !important;
  border-color: var(--app-primary) !important;
  box-shadow: 0 2px 8px rgba(79, 124, 255, 0.2) !important;
}

.el-picker-panel__footer .el-button--primary:hover {
  background: var(--app-primary-strong) !important;
  border-color: var(--app-primary-strong) !important;
}

/* 快捷选项 */
.el-picker-panel__shortcut {
  border-radius: 8px !important;
  font-size: 13px !important;
  color: var(--app-text-muted) !important;
}

.el-picker-panel__shortcut:hover {
  color: var(--app-primary) !important;
  background: var(--app-primary-soft) !important;
}

/* 深色模式适配 */
:root[data-theme='dark'] .el-picker-panel {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.2) !important;
}

:root[data-theme='dark'] .el-date-table td.available:hover {
  background: var(--app-primary-soft) !important;
}

:root[data-theme='dark'] .el-picker-panel__footer .el-button--default {
  background: var(--app-panel-muted) !important;
}

:root[data-theme='dark'] .el-picker-panel__footer .el-button--default:hover {
  background: var(--app-hover) !important;
}
</style>
