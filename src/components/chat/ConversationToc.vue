<template>
  <div class="conversation-toc">
    <!-- ✅ 默认显示的短横线列表 -->
    <div
      v-if="!isHovered"
      class="toc-lines-default"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="toc-line-item-default"
        :class="{ 'is-active': activeId === msg.id }"
        @click="handleItemClick(msg.id)"
      >
        <div class="toc-line"></div>
      </div>
    </div>

    <!-- ✅ 悬停时显示的完整弹窗(包含文字和短横线) -->
    <transition name="toc-fade">
      <div
        v-if="isHovered"
        class="toc-popup"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
      >
        <div class="toc-popup-list">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="toc-popup-item"
            :class="{ 'is-active': activeId === msg.id }"
            @click="handleItemClick(msg.id)"
          >
            <!-- ✅ 问题文字 -->
            <span class="toc-item-text">{{ getShortTitle(msg.content) }}</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import type { Message } from '@/types/chat'

interface Props {
  messages: Message[]
  activeId: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'scroll-to', id: string): void
}>()

// ✅ 控制是否悬停
const isHovered = ref(false)

// ✅ 组件挂载时输出调试信息
onMounted(() => {



})

// ✅ 调试：监听 activeId 变化
watch(
  () => props.activeId,
  (newVal, oldVal) => {


    if (newVal) {
      const matchedMsg = props.messages.find((msg) => msg.id === newVal)
      // ✅ 确保激活的项在视口中可见（针对弹窗列表）
      if (isHovered.value && matchedMsg) {
        nextTick(() => {
          const activeElement = document.querySelector('.toc-popup-item.is-active')
          if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        })
      }
    }
  },
  { immediate: true },
)

// ✅ 调试：监听 messages 变化
watch(
  () => props.messages,
  (newVal) => {

    if (newVal.length > 0) {




      // ✅ 如果当前有激活的 ID，检查它是否还在新的消息列表中
      if (props.activeId) {
        const stillExists = newVal.some((msg) => msg.id === props.activeId)

        if (!stillExists) {

        }
      }
    }
  },
  { deep: true },
)

// 生成简短的标题（取前20个字符）
const getShortTitle = (content: string) => {
  return content.length > 20 ? content.substring(0, 20) + '...' : content
}

// ✅ 防止快速重复点击
let lastClickTime = 0
const CLICK_THROTTLE = 200 // 200ms 节流

const handleItemClick = (id: string) => {
  const now = Date.now()

  // ✅ 节流控制：避免短时间内重复触发
  if (now - lastClickTime < CLICK_THROTTLE) {

    return
  }

  lastClickTime = now


  // ✅ 立即发出事件，确保响应迅速
  emit('scroll-to', id)
}
</script>

<style scoped>
.conversation-toc {
  position: fixed;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
}

/* ========================================
   默认状态 - 纯短横线列表
   ======================================== */
.toc-lines-default {
  display: flex;
  flex-direction: column;
  gap: 1vh;
  padding: 12px 0;
}

.toc-line-item-default {
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 8px;
  display: flex;
  align-items: center;
}

/* ✅ 默认灰色圆点样式 */
.toc-line {
  width: 8px;
  height: 8px;
  background-color: #cbd5e1;
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

/* ✅ 默认圆点悬停效果 */
.toc-line-item-default:hover .toc-line {
  background-color: #94a3b8;
  transform: scale(1.2);
}

/* ✅ 激活状态 - 蓝色圆点（项目主题蓝色） */
.toc-line-item-default.is-active .toc-line {
  background-color: #1a3a6b;
}

/* ========================================
   悬停状态 - 完整弹窗(文字+短横线)
   ======================================== */
.toc-popup {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  min-width: 260px;
  max-width: 340px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toc-popup-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 420px;
}

.toc-popup-list::-webkit-scrollbar {
  width: 4px;
}

.toc-popup-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.toc-popup-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ✅ 弹窗内的项目:文字 + 短横线,完美水平居中 */
.toc-popup-item {
  display: flex;
  align-items: center; /* ✅ 垂直居中对齐 */
  justify-content: space-between; /* ✅ 两端对齐:文字左,短线右 */
  gap: 16px; /* ✅ 文字与短线间距 */
  padding: 0 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 24px; /* ✅ 最小高度确保对齐 */
}

/* ✅ 问题文字 - 过长显示省略号 */
.toc-item-text {
  flex: 1; /* ✅ 占据剩余空间 */
  font-size: 15px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
}

/* ✅ 弹窗内项目悬停效果 */
.toc-popup-item:hover .toc-item-text {
  color: #0f172a;
  font-weight: 600;
}

.toc-popup-item:hover .toc-line {
  background-color: #1e293b;
  width: 16px;
}

/* ✅ 弹窗内项目激活状态 - 项目主题蓝色 */
.toc-popup-item.is-active .toc-item-text {
  color: #1a3a6b;
  font-weight: 700;
}


/* ========================================
   淡入淡出动画
   ======================================== */
.toc-fade-enter-active,
.toc-fade-leave-active {
  transition: all 0.2s ease;
}

.toc-fade-enter-from {
  opacity: 0;
  transform: translateY(-50%) translateX(10px);
}

.toc-fade-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(10px);
}

/* ========================================
   深色模式适配
   ======================================== */
:root[data-theme='dark'] .toc-line {
  background-color: rgba(255, 255, 255, 0.25);
}

:root[data-theme='dark'] .toc-line-item-default:hover .toc-line {
  background-color: rgba(255, 255, 255, 0.45);
}

:root[data-theme='dark'] .toc-line-item-default.is-active .toc-line {
  background-color: #00aaff;
}

:root[data-theme='dark'] .toc-popup {
  background: rgba(16, 29, 58, 0.98);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(0, 170, 255, 0.15);
}

:root[data-theme='dark'] .toc-item-text {
  color: rgba(190, 210, 240, 0.65);
}

:root[data-theme='dark'] .toc-popup-item:hover .toc-item-text {
  color: #e4eaf5;
}

:root[data-theme='dark'] .toc-popup-item.is-active .toc-item-text {
  color: #00aaff;
}

:root[data-theme='dark'] .toc-popup-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

:root[data-theme='dark'] .toc-popup-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
