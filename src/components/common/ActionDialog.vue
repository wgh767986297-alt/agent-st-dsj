<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { ElIcon } from 'element-plus'
import { WarningFilled, Edit } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    type?: 'confirm' | 'prompt'
    title?: string
    description?: string
    inputValue?: string
    inputPlaceholder?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }>(),
  {
    type: 'confirm',
    title: '',
    description: '',
    inputValue: '',
    inputPlaceholder: '请输入',
    confirmText: '确定',
    cancelText: '取消',
    danger: false,
  },
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [value?: string]
  cancel: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const localInput = ref(props.inputValue)
const isVisible = ref(false)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      localInput.value = props.inputValue
      isVisible.value = true
      nextTick(() => {
        if (props.type === 'prompt') {
          inputRef.value?.focus()
          inputRef.value?.select()
        }
      })
    } else {
      // Delay hiding to allow exit animation
      setTimeout(() => {
        isVisible.value = false
      }, 180)
    }
  },
)

const handleConfirm = () => {
  if (props.type === 'prompt') {
    emit('confirm', localInput.value)
  } else {
    emit('confirm')
  }
}

const handleCancel = () => {
  emit('cancel')
}

const handleOverlayClick = (e: MouseEvent) => {
  if ((e.target as HTMLElement).classList.contains('action-dialog-overlay')) {
    handleCancel()
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleCancel()
  }
  if (e.key === 'Enter' && props.type === 'prompt') {
    handleConfirm()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="visible || isVisible"
        class="action-dialog-overlay"
        @click="handleOverlayClick"
      >
        <div
          class="action-dialog-card"
          :class="{
            'action-dialog-card--danger': danger && type === 'confirm',
          }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <!-- Icon area -->
          <div class="action-dialog-icon" v-if="type === 'confirm'">
            <el-icon :size="24"><WarningFilled /></el-icon>
          </div>

          <!-- Title -->
          <h3 class="action-dialog-title">{{ title }}</h3>

          <!-- Description (confirm mode) -->
          <p v-if="type === 'confirm' && description" class="action-dialog-desc">
            {{ description }}
          </p>

          <!-- Input (prompt mode) -->
          <div v-if="type === 'prompt'" class="action-dialog-input-wrap">
            <el-icon class="action-dialog-input-icon" :size="16"><Edit /></el-icon>
            <input
              ref="inputRef"
              v-model="localInput"
              class="action-dialog-input"
              :placeholder="inputPlaceholder"
              type="text"
              @keydown.enter="handleConfirm"
            />
          </div>

          <!-- Actions -->
          <div class="action-dialog-actions">
            <button
              class="action-dialog-btn action-dialog-btn--cancel"
              type="button"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="action-dialog-btn action-dialog-btn--confirm"
              :class="{ 'action-dialog-btn--danger': danger }"
              type="button"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ===== Overlay ===== */
.action-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* ===== Card ===== */
.action-dialog-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 28px 28px 22px;
  border-radius: 18px;
  background: var(--app-panel);
  box-shadow:
    0 24px 56px rgba(0, 0, 0, 0.16),
    0 0 0 1px var(--app-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* ===== Icon ===== */
.action-dialog-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.action-dialog-card--danger .action-dialog-icon {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

/* ===== Title ===== */
.action-dialog-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--app-text);
  letter-spacing: -0.01em;
}

/* ===== Description ===== */
.action-dialog-desc {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--app-text-muted);
}

/* ===== Input ===== */
.action-dialog-input-wrap {
  position: relative;
  width: 100%;
  margin: 4px 0 20px;
}

.action-dialog-input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--app-text-subtle);
  pointer-events: none;
}

.action-dialog-input {
  width: 100%;
  height: 44px;
  padding: 0 14px 0 40px;
  border: 1.5px solid var(--app-border);
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--app-text);
  background: var(--app-panel-muted);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.action-dialog-input::placeholder {
  color: var(--app-text-subtle);
}

.action-dialog-input:focus {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-softer);
  background: var(--app-panel);
}

/* ===== Actions ===== */
.action-dialog-actions {
  width: 100%;
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.action-dialog-btn {
  flex: 1;
  height: 42px;
  border: 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease,
    transform 0.15s ease;
}

.action-dialog-btn:active {
  transform: scale(0.97);
}

.action-dialog-btn--cancel {
  color: var(--app-text-muted);
  background: var(--app-panel-muted);
}

.action-dialog-btn--cancel:hover {
  background: var(--app-hover);
}

.action-dialog-btn--confirm {
  color: #ffffff;
  background: var(--app-primary);
}

.action-dialog-btn--confirm:hover {
  background: var(--app-primary-strong);
}

.action-dialog-btn--danger {
  color: #ffffff;
  background: var(--app-danger);
}

.action-dialog-btn--danger:hover {
  background: var(--app-danger);
  filter: brightness(0.85);
}

/* ===== Transitions ===== */
.dialog-enter-active {
  transition: opacity 0.2s ease-out;
}

.dialog-enter-active .action-dialog-card {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.dialog-leave-active {
  transition: opacity 0.15s ease-in;
}

.dialog-leave-active .action-dialog-card {
  transition:
    opacity 0.15s ease-in,
    transform 0.15s ease-in;
}

.dialog-enter-from {
  opacity: 0;
}

.dialog-enter-from .action-dialog-card {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}

.dialog-leave-to {
  opacity: 0;
}

.dialog-leave-to .action-dialog-card {
  opacity: 0;
  transform: scale(0.95);
}

/* ===== Reduced motion ===== */
@media (prefers-reduced-motion: reduce) {
  .dialog-enter-active,
  .dialog-leave-active,
  .dialog-enter-active .action-dialog-card,
  .dialog-leave-active .action-dialog-card {
    transition: none;
  }

  .action-dialog-btn {
    transition: none;
  }
}

/* ===== Dark mode overlay ===== */
:global(:root[data-theme='dark']) .action-dialog-overlay {
  background: rgba(0, 0, 0, 0.65);
}
</style>
