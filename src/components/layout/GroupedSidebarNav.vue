<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSidebarStore } from '@/stores/sidebar'
import { useChatStore } from '@/stores/chat'
import { ElButton, ElIcon, ElScrollbar, ElTooltip } from 'element-plus'
import {
  ChatDotSquare,
  Delete,
  Edit,
  MoreFilled,
} from '@element-plus/icons-vue'
import type { HistoryItem, NavItem } from '@/types/chat'
import ActionDialog from '@/components/common/ActionDialog.vue'

import iconNavOpen from '@/assets/icons/nav/icon-nav-open.png'
import iconNavHistory from '@/assets/icons/nav/icon-nav-history.png'
import iconNewChat from '@/assets/icons/nav/icon-nav-chat.png'
import iconNavSkills from '@/assets/icons/nav/icon-nav-skills.png'
import iconNavPlan from '@/assets/icons/nav/icon-nav-plan.png'
import iconNavMcp from '@/assets/icons/chat/icon-chat-mcp.png'
import iconLogo from '@/assets/icons/chat/icon-jh.png'

const router = useRouter()
const route = useRoute()
const sidebarStore = useSidebarStore()
const chatStore = useChatStore()

const isChatActive = computed(() => route.path === '/' || route.path.startsWith('/chat'))
const isSkillsMarketActive = computed(() => route.path === '/skills-market')
const isSchedTaskActive = computed(() => route.path === '/app-connection')
const isMcpManagementActive = computed(() => route.path === '/mcp-management')

const emit = defineEmits<{
  navClick: [item: NavItem]
  submenuClick: [child: any]
  newChat: []
  historyClick: [history: HistoryItem]
  openSettings: []
}>()

const navItems = computed<NavItem[]>(() => [])

const historyPopoverVisible = ref(false)
const sidebarTooltipProps = {
  placement: 'right',
  trigger: 'hover',
  showArrow: false,
  persistent: false,
  enterable: false,
  hideAfter: 0,
  focusOnTarget: false,
  triggerKeys: [] as string[],
  popperClass: 'grouped-sidebar-tooltip',
} as const

const toggleSidebarCollapse = () => {
  sidebarStore.toggleCollapse()
}

const handleNewChat = async () => {
  emit('newChat')
}

const handleHistoryClick = async (history: HistoryItem) => {
  historyPopoverVisible.value = false
  emit('historyClick', history)
}

// Action dialog state
const deleteDialogVisible = ref(false)
const deleteTargetId = ref<string | null>(null)

const renameDialogVisible = ref(false)
const renameTarget = ref<HistoryItem | null>(null)

const showDeleteConfirm = (historyId: string) => {
  deleteTargetId.value = historyId
  deleteDialogVisible.value = true
}

const handleDeleteConfirm = async () => {
  if (deleteTargetId.value) {
    await chatStore.deleteHistory(deleteTargetId.value)
  }
  deleteDialogVisible.value = false
  deleteTargetId.value = null
}

const handleDeleteCancel = () => {
  deleteDialogVisible.value = false
  deleteTargetId.value = null
}

const handleRenameClick = (history: HistoryItem) => {
  renameTarget.value = history
  renameDialogVisible.value = true
}

const handleRenameConfirm = async (value?: string) => {
  if (value && value.trim() && renameTarget.value && value.trim() !== renameTarget.value.title) {
    await chatStore.renameHistory(renameTarget.value.id, value.trim())
  }
  renameDialogVisible.value = false
  renameTarget.value = null
}

const handleRenameCancel = () => {
  renameDialogVisible.value = false
  renameTarget.value = null
}

defineExpose({
  navItems,
})
</script>

<template>
  <aside class="grouped-sidebar" :class="{ 'grouped-sidebar--collapsed': sidebarStore.collapsed }">
    <div class="grouped-sidebar__brand">
      <!-- <img
        v-if="!sidebarStore.collapsed"
        :src="iconLogo"
        alt="Logo"
        class="grouped-sidebar__logo"
      /> -->
      <div v-if="!sidebarStore.collapsed" class="grouped-sidebar__brand-copy">
        <div class="grouped-sidebar__title">苏小智智能体</div>
      </div>
      <el-tooltip
        :content="sidebarStore.collapsed ? '展开导航栏' : '收起导航栏'"
        v-bind="sidebarTooltipProps"
      >
        <button
          class="grouped-sidebar__collapse-button"
          type="button"
          :aria-label="sidebarStore.collapsed ? '展开导航栏' : '收起导航栏'"
          @click="toggleSidebarCollapse"
        >
          <span
            class="grouped-sidebar__collapse-icon"
            :style="{ '--collapse-icon': `url(${iconNavOpen})` }"
            aria-hidden="true"
          ></span>
        </button>
      </el-tooltip>
    </div>

    <div class="grouped-sidebar__qa">
      <el-tooltip
        content="新建对话"
        v-bind="sidebarTooltipProps"
        :disabled="!sidebarStore.collapsed"
      >
        <button
          v-if="!chatStore.isHistoryRefreshing"
          class="grouped-sidebar__nav-btn"
          :class="{ 'grouped-sidebar__nav-btn--active': isChatActive }"
          type="button"
          @click="handleNewChat"
        >
          <span
            class="grouped-sidebar__nav-btn-icon"
            :style="{ '--nav-btn-icon': `url(${iconNewChat})` }"
            aria-hidden="true"
          ></span>
          <span v-if="!sidebarStore.collapsed">新建对话</span>
        </button>
      </el-tooltip>

      <el-tooltip content="技能库" v-bind="sidebarTooltipProps" :disabled="!sidebarStore.collapsed">
        <button
          class="grouped-sidebar__nav-btn"
          :class="{ 'grouped-sidebar__nav-btn--active': isSkillsMarketActive }"
          type="button"
          @click="router.push('/skills-market')"
        >
          <span
            class="grouped-sidebar__nav-btn-icon"
            :style="{ '--nav-btn-icon': `url(${iconNavSkills})` }"
            aria-hidden="true"
          ></span>
          <span v-if="!sidebarStore.collapsed">技能库</span>
        </button>
      </el-tooltip>

      <!-- 暂时屏蔽任务计划入口 -->
      <!-- <el-tooltip
        content="任务计划"
        v-bind="sidebarTooltipProps"
        :disabled="!sidebarStore.collapsed"
      >
        <button
          class="grouped-sidebar__nav-btn"
          :class="{ 'grouped-sidebar__nav-btn--active': isSchedTaskActive }"
          type="button"
          @click="router.push('/app-connection')"
        >
          <span
            class="grouped-sidebar__nav-btn-icon"
            :style="{ '--nav-btn-icon': `url(${iconNavPlan})` }"
            aria-hidden="true"
          ></span>
          <span v-if="!sidebarStore.collapsed">任务计划</span>
        </button>
      </el-tooltip> -->

      <el-tooltip
        content="MCP 专区"
        v-bind="sidebarTooltipProps"
        :disabled="!sidebarStore.collapsed"
      >
        <button
          class="grouped-sidebar__nav-btn"
          :class="{ 'grouped-sidebar__nav-btn--active': isMcpManagementActive }"
          type="button"
          @click="router.push('/mcp-management')"
        >
          <span
            class="grouped-sidebar__nav-btn-icon"
            :style="{ '--nav-btn-icon': `url(${iconNavMcp})` }"
            aria-hidden="true"
          ></span>
          <span v-if="!sidebarStore.collapsed">MCP 专区</span>
        </button>
      </el-tooltip>

      <el-popover
        v-if="sidebarStore.collapsed"
        v-model:visible="historyPopoverVisible"
        placement="right-start"
        trigger="click"
        :width="286"
        :show-arrow="false"
        popper-class="grouped-sidebar-history-popover"
      >
        <div class="grouped-sidebar__history-popover">
          <div class="grouped-sidebar__history-popover-title">对话历史</div>
          <div v-if="chatStore.isHistoryRefreshing" class="grouped-sidebar__history-popover-empty">
            正在加载...
          </div>
          <el-scrollbar v-else class="grouped-sidebar__history-popover-list">
            <div
              v-for="history in chatStore.historyList"
              :key="history.id"
              class="grouped-sidebar__history-popover-item"
              :class="{
                'grouped-sidebar__history-popover-item--active':
                  history.id === chatStore.currentHistoryId,
              }"
              @click="handleHistoryClick(history)"
            >
              <span class="grouped-sidebar__history-icon-circle">
                <el-icon :size="14"><ChatDotSquare /></el-icon>
              </span>
              <div class="grouped-sidebar__history-popover-copy">
                <span class="grouped-sidebar__history-popover-name">{{ history.title }}</span>
              </div>
              <el-popover
                placement="bottom-end"
                trigger="click"
                :width="140"
                :show-arrow="false"
                popper-class="grouped-sidebar-history-action-popover"
              >
                <div class="grouped-sidebar__history-action-menu">
                  <button
                    class="grouped-sidebar__history-action-item"
                    type="button"
                    @click.stop="handleRenameClick(history)"
                  >
                    <el-icon><Edit /></el-icon>
                    <span>重命名</span>
                  </button>
                  <button
                    class="grouped-sidebar__history-action-item grouped-sidebar__history-action-item--danger"
                    type="button"
                    @click.stop="showDeleteConfirm(history.id)"
                  >
                    <el-icon><Delete /></el-icon>
                    <span>删除</span>
                  </button>
                </div>
                <template #reference>
                  <button
                    class="grouped-sidebar__history-popover-more"
                    type="button"
                    aria-label="更多操作"
                    @click.stop
                  >
                    <el-icon><MoreFilled /></el-icon>
                  </button>
                </template>
              </el-popover>
            </div>
            <div
              v-if="chatStore.historyList.length === 0"
              class="grouped-sidebar__history-popover-empty"
            >
              暂无历史记录
            </div>
          </el-scrollbar>
        </div>
        <template #reference>
          <span class="grouped-sidebar__popover-reference">
            <el-tooltip content="对话历史" v-bind="sidebarTooltipProps">
              <button class="grouped-sidebar__history-trigger" type="button">
                <span
                  class="grouped-sidebar__history-icon"
                  :style="{ '--history-icon': `url(${iconNavHistory})` }"
                  aria-hidden="true"
                ></span>
              </button>
            </el-tooltip>
          </span>
        </template>
      </el-popover>

      <div
        v-if="!sidebarStore.collapsed && chatStore.isHistoryRefreshing"
        class="grouped-sidebar__history-loading"
        aria-busy="true"
      >
        <div class="grouped-sidebar__history-loading-skeleton">
          <div v-for="index in 4" :key="index" class="grouped-sidebar__history-loading-card">
            <div
              class="grouped-sidebar__history-loading-line grouped-sidebar__history-loading-line--title"
            ></div>
            <div
              class="grouped-sidebar__history-loading-line grouped-sidebar__history-loading-line--meta"
            ></div>
          </div>
        </div>
      </div>
      <el-scrollbar
        v-if="!sidebarStore.collapsed && !chatStore.isHistoryRefreshing"
        class="grouped-sidebar__history"
      >
        <div
          v-for="history in chatStore.historyList"
          :key="history.id"
          class="grouped-sidebar__history-item"
          :class="{
            'grouped-sidebar__history-item--active': history.id === chatStore.currentHistoryId,
          }"
          @click="handleHistoryClick(history)"
        >
          <span class="grouped-sidebar__history-icon-circle">
            <el-icon :size="14"><ChatDotSquare /></el-icon>
          </span>
          <div class="grouped-sidebar__history-copy">
            <div class="grouped-sidebar__history-name">{{ history.title }}</div>
          </div>
          <el-popover
            placement="bottom-end"
            trigger="click"
            :width="140"
            :show-arrow="false"
            popper-class="grouped-sidebar-history-action-popover"
          >
            <div class="grouped-sidebar__history-action-menu">
              <button
                class="grouped-sidebar__history-action-item"
                type="button"
                @click.stop="handleRenameClick(history)"
              >
                <el-icon><Edit /></el-icon>
                <span>重命名</span>
              </button>
              <button
                class="grouped-sidebar__history-action-item grouped-sidebar__history-action-item--danger"
                type="button"
                @click.stop="showDeleteConfirm(history.id)"
              >
                <el-icon><Delete /></el-icon>
                <span>删除</span>
              </button>
            </div>
            <template #reference>
              <button
                class="grouped-sidebar__history-more"
                type="button"
                aria-label="更多操作"
                @click.stop
              >
                <el-icon><MoreFilled /></el-icon>
              </button>
            </template>
          </el-popover>
        </div>
      </el-scrollbar>
    </div>
  </aside>

  <ActionDialog
    v-model:visible="deleteDialogVisible"
    type="confirm"
    title="确定要删除这条对话记录吗？"
    description="删除后将无法恢复，请谨慎操作。"
    confirm-text="确认删除"
    cancel-text="取消"
    :danger="true"
    @confirm="handleDeleteConfirm"
    @cancel="handleDeleteCancel"
  />

  <ActionDialog
    v-model:visible="renameDialogVisible"
    type="prompt"
    title="重命名对话"
    :input-value="renameTarget?.title || ''"
    input-placeholder="请输入新的对话标题"
    confirm-text="确认修改"
    cancel-text="取消"
    @confirm="handleRenameConfirm"
    @cancel="handleRenameCancel"
  />
</template>

<style scoped src="./GroupedSidebarNav.css"></style>
