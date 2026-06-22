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
        <button
          class="toc-export-button"
          type="button"
          title="导出问题"
          aria-label="导出问题"
          @click.stop="exportQuestions"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 3.99a1 1 0 0 1-1.4 0l-4-3.99a1 1 0 1 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z"
            />
          </svg>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
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

const exportQuestions = () => {
  if (props.messages.length === 0) {
    ElMessage.warning('当前没有可导出的问题')
    return
  }

  const content = props.messages
    .map((msg, index) => `${index + 1}. ${msg.content.replace(/\s*\n+\s*/g, ' ').trim()}`)
    .join('\r\n')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const filename = `questions_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.txt`

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

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
  height: 2px;
  display: flex;
  align-items: center;
}

/* ✅ 短横线基础样式 */
.toc-line {
  width: 12px;
  height: 2px;
  background-color: #cbd5e1;
  border-radius: 1px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

/* ✅ 默认短横线悬停效果 */
.toc-line-item-default:hover .toc-line {
  background-color: #1e293b;
  width: 16px;
}

/* ✅ 默认短横线激活状态 */
.toc-line-item-default.is-active .toc-line {
  background-color: #3b82f6;
  width: 16px;
  height: 3px;
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

/* ✅ 弹窗内项目激活状态 */
.toc-popup-item.is-active .toc-item-text {
  color: #2563eb;
  font-weight: 700;
}

/* .toc-popup-item.is-active .toc-line {
  background-color: #3b82f6;
  width: 16px;
  height: 3px;
} */

.toc-export-button {
  width: 34px;
  height: 34px;
  margin-left: auto;
  border: 1px solid #dbe4f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.toc-export-button:hover {
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
  transform: translateY(-1px);
}

.toc-export-button svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
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
</style>
