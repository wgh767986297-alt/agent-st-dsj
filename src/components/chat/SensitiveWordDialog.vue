<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElDialog } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'

const props = defineProps<{
  visible: boolean
  message: string
  keywords: string[]
}>()

const emit = defineEmits<{
  close: []
}>()

const countdown = ref(0)
const canClose = ref(false)
let timer: number | null = null

const startCountdown = () => {
  canClose.value = false
  countdown.value = 3
  timer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
      canClose.value = true
    }
  }, 1000)
}

const stopCountdown = () => {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

const handleClose = () => {
  if (!canClose.value) return
  stopCountdown()
  emit('close')
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      startCountdown()
    } else {
      stopCountdown()
    }
  },
)
</script>

<template>
  <el-dialog
    :model-value="visible"
    class="sensitive-word-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    width="440px"
    align-center
    destroy-on-close
    @update:model-value="(val: boolean) => !val && handleClose()"
  >
    <div class="sensitive-dialog-body">
      <div class="sensitive-dialog-icon">
        <el-icon><WarningFilled /></el-icon>
      </div>

      <h2 class="sensitive-dialog-title">内容安全提示</h2>

      <p class="sensitive-dialog-message">{{ message || '您的消息包含敏感内容，请修改后再试。' }}</p>

      <div v-if="keywords.length" class="sensitive-dialog-keywords">
        <span class="sensitive-dialog-keywords-label">涉及关键词：</span>
        <span v-for="kw in keywords" :key="kw" class="sensitive-dialog-keyword-tag">{{ kw }}</span>
      </div>
    </div>

    <template #footer>
      <div class="sensitive-dialog-footer">
        <button
          class="sensitive-dialog-btn"
          :class="{ 'sensitive-dialog-btn--ready': canClose }"
          :disabled="!canClose"
          type="button"
          @click="handleClose"
        >
          <template v-if="canClose">我知道了</template>
          <template v-else>已阅读 ({{ countdown }}s)</template>
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.sensitive-dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 8px 0 4px;
}

.sensitive-dialog-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  margin-bottom: 16px;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  font-size: 28px;
}

.sensitive-dialog-title {
  margin: 0 0 10px;
  color: var(--app-text);
  font-size: 18px;
  font-weight: 760;
  letter-spacing: 0;
}

.sensitive-dialog-message {
  margin: 0 0 16px;
  color: var(--app-text-muted);
  font-size: 14px;
  line-height: 1.65;
  max-width: 340px;
}

.sensitive-dialog-keywords {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0 8px;
  margin-bottom: 4px;
}

.sensitive-dialog-keywords-label {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.8;
}

.sensitive-dialog-keyword-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  color: #d97706;
  background: rgba(245, 158, 11, 0.12);
  font-size: 12px;
  font-weight: 650;
  line-height: 1.8;
}

.sensitive-dialog-footer {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.sensitive-dialog-btn {
  min-width: 160px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 28px;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  background: #94a3b8;
  cursor: not-allowed;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  transition:
    background 0.25s ease,
    transform 0.2s ease;
}

.sensitive-dialog-btn--ready {
  background: var(--el-color-primary, #2563eb);
  cursor: pointer;
}

.sensitive-dialog-btn--ready:hover {
  background: var(--el-color-primary-light-3, #3b82f6);
  transform: translateY(-1px);
}

.sensitive-dialog-btn--ready:active {
  transform: translateY(0) scale(0.98);
}

@media (max-width: 480px) {
  .sensitive-dialog-message {
    max-width: 260px;
  }
}
</style>

<style>
.sensitive-word-dialog.el-dialog {
  border-radius: 20px;
  background: var(--app-panel);
  box-shadow:
    0 24px 56px rgba(15, 23, 42, 0.16),
    0 8px 20px rgba(15, 23, 42, 0.08);
}

.sensitive-word-dialog .el-dialog__header {
  display: none;
}

.sensitive-word-dialog .el-dialog__body {
  padding: 32px 24px 16px;
}

.sensitive-word-dialog .el-dialog__footer {
  padding: 0 24px 28px;
}

/* dark mode */
:root[data-theme='dark'] .sensitive-dialog-icon {
  color: var(--tc-amber);
  background: var(--tc-amber-bg);
}

:root[data-theme='dark'] .sensitive-dialog-keyword-tag {
  color: var(--tc-amber);
  background: var(--tc-amber-bg);
}

:root[data-theme='dark'] .sensitive-dialog-btn {
  background: var(--app-panel-muted);
}

:root[data-theme='dark'] .sensitive-dialog-btn--ready {
  background: var(--app-primary);
}

:root[data-theme='dark'] .sensitive-word-dialog.el-dialog {
  box-shadow:
    0 24px 56px rgba(0, 0, 0, 0.4),
    0 8px 20px rgba(0, 0, 0, 0.25);
}
</style>
