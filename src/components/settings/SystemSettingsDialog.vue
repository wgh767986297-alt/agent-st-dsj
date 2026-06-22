<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessage,
} from 'element-plus'
import { Close, Hide, Lock, View } from '@element-plus/icons-vue'
import { authApi } from '@/api/auth'
import { clearAuth, getStoredUserProfile, validatePasswordLength } from '@/utils/auth'

const visible = defineModel<boolean>('visible', { default: false })
const router = useRouter()
const savingPassword = ref(false)
const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)

const userProfile = computed(() => getStoredUserProfile())
const userLabel = computed(() => userProfile.value?.name || '当前用户')

const passwordForm = reactive({
  password: '',
  confirmPassword: '',
})

const hydratePasswordForm = () => {
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  passwordVisible.value = false
  confirmPasswordVisible.value = false
}

watch(
  visible,
  (nextVisible) => {
    if (nextVisible) hydratePasswordForm()
  },
  { immediate: true },
)

const closeSettings = () => {
  visible.value = false
}

const passwordInputStyle = (v: boolean) =>
  v ? {} : { '-webkit-text-security': 'disc' }

const validatePasswordForm = () => {
  if (!passwordForm.password || !passwordForm.confirmPassword) {
    ElMessage.warning('请完整填写信息')
    return false
  }
  if (!validatePasswordLength(passwordForm.password)) {
    ElMessage.warning('密码长度不能少于6位')
    return false
  }
  if (passwordForm.password !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return false
  }
  return true
}

const handleChangePassword = async () => {
  if (!validatePasswordForm()) return
  savingPassword.value = true
  try {
    await authApi.changePassword({ password: passwordForm.password })
    ElMessage.success('密码修改成功，请使用新密码重新登录')
    visible.value = false
    clearAuth()
    await router.replace('/login')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '修改密码失败')
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="480px"
    align-center
    destroy-on-close
    :show-close="false"
    class="system-settings-dialog"
  >
    <div class="settings-root">
      <!-- 头部 -->
      <div class="settings-head">
        <div class="settings-head__left">
          <span class="settings-head__dot"></span>
          <span class="settings-head__title">账号安全</span>
        </div>
        <button class="settings-head__close" type="button" aria-label="关闭" @click="closeSettings">
          <el-icon :size="18"><Close /></el-icon>
        </button>
      </div>

      <!-- 用户信息条 -->
      <div class="settings-user">
        <span class="settings-user__initial">{{ userLabel.charAt(0) }}</span>
        <div>
          <span class="settings-user__name">{{ userLabel }}</span>
          <span class="settings-user__note">密码修改后需重新登录</span>
        </div>
      </div>

      <!-- 表单 -->
      <div class="settings-form-area">
        <el-form
          class="settings-form"
          label-position="top"
          :model="passwordForm"
          @submit.prevent
        >
          <el-form-item label="新密码" required>
            <el-input
              v-model="passwordForm.password"
              type="text"
              name="settings_new_password"
              autocomplete="new-password"
              :input-style="passwordInputStyle(passwordVisible)"
              placeholder="不少于 6 位"
            >
              <template #suffix>
                <span class="settings-eye" @mousedown.prevent @click="passwordVisible = !passwordVisible">
                  <el-icon :size="16"><component :is="passwordVisible ? Hide : View" /></el-icon>
                </span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="确认新密码" required>
            <el-input
              v-model="passwordForm.confirmPassword"
              type="text"
              name="settings_confirm_password"
              autocomplete="new-password"
              :input-style="passwordInputStyle(confirmPasswordVisible)"
              placeholder="再次输入新密码"
            >
              <template #suffix>
                <span class="settings-eye" @mousedown.prevent @click="confirmPasswordVisible = !confirmPasswordVisible">
                  <el-icon :size="16"><component :is="confirmPasswordVisible ? Hide : View" /></el-icon>
                </span>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>

      <!-- 底部按钮 -->
      <div class="settings-foot">
        <button class="settings-foot__reset" type="button" @click="hydratePasswordForm">重置</button>
        <button
          class="settings-foot__save"
          type="button"
          :disabled="savingPassword"
          @click="handleChangePassword"
        >
          <span v-if="savingPassword" class="settings-foot__spinner"></span>
          <span>保存新密码</span>
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
/* ==================== 对话框 ==================== */
:global(.system-settings-dialog.el-dialog) {
  --el-dialog-bg-color: var(--app-panel);
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  background: var(--app-panel);
  box-shadow:
    0 24px 72px rgba(15, 23, 42, 0.18),
    0 6px 18px rgba(15, 23, 42, 0.08);
}

:global(.system-settings-dialog .el-dialog__header) { display: none; }
:global(.system-settings-dialog .el-dialog__body) {
  padding: 0;
  background: var(--app-panel);
}

.settings-root {
  display: flex;
  flex-direction: column;
}

/* ==================== 头部 ==================== */
.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 16px;
}

.settings-head__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-head__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--app-primary);
  box-shadow: 0 0 0 4px var(--app-primary-softer);
}

.settings-head__title {
  font-size: 18px;
  font-weight: 750;
  color: var(--app-text);
  letter-spacing: -0.01em;
}

.settings-head__close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  color: var(--app-text-muted);
  background: var(--app-panel-muted);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.settings-head__close:hover {
  color: var(--app-text);
  background: var(--app-hover);
}

/* ==================== 用户信息条 ==================== */
.settings-user {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 28px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--app-panel-muted);
  border: 1px solid var(--app-border);
}

.settings-user__initial {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
}

.settings-user__name {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--app-text);
}

.settings-user__note {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--app-text-muted);
}

/* ==================== 表单 ==================== */
.settings-form-area {
  padding: 24px 28px 4px;
}

.settings-form {
  display: grid;
  gap: 2px;
}

.settings-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.settings-form :deep(.el-form-item__label) {
  font-size: 12px;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-bottom: 8px;
}

.settings-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  background: var(--app-panel);
  box-shadow: none;
  border: 1.5px solid var(--app-border);
  padding: 4px 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.settings-form :deep(.el-input__wrapper:hover) {
  border-color: var(--app-border-hover);
}

.settings-form :deep(.el-input__wrapper.is-focus) {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-softer);
}

.settings-form :deep(.el-input__inner) {
  font-size: 14px;
  color: var(--app-text);
}

.settings-form :deep(.el-input__inner::placeholder) {
  color: var(--app-text-subtle);
}

.settings-eye {
  cursor: pointer;
  color: var(--app-text-muted);
  padding: 2px;
}
.settings-eye:hover { color: var(--app-primary); }

/* ==================== 底部按钮 ==================== */
.settings-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 28px 28px;
}

.settings-foot__reset {
  height: 44px;
  padding: 0 24px;
  border: 1.5px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-panel);
  color: var(--app-text-muted);
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.2s;
}
.settings-foot__reset:hover {
  border-color: var(--app-border-hover);
  color: var(--app-text);
  background: var(--app-hover);
}

.settings-foot__save {
  height: 44px;
  padding: 0 28px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-strong));
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(79, 124, 255, 0.28);
  transition: transform 0.2s, box-shadow 0.2s;
}
.settings-foot__save:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 22px rgba(79, 124, 255, 0.38);
}
.settings-foot__save:active { transform: translateY(0); }
.settings-foot__save:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.settings-foot__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ==================== 深色 ==================== */
:root[data-theme='dark'] .settings-foot__save {
  background: linear-gradient(135deg, var(--app-primary), #0070c0);
  box-shadow: 0 4px 18px rgba(0, 170, 255, 0.3);
}

/* ==================== 响应式 ==================== */
@media (max-width: 520px) {
  :global(.system-settings-dialog.el-dialog) {
    width: min(95vw, 480px) !important;
  }
  .settings-head { padding: 16px 20px 12px; }
  .settings-user { margin: 0 20px; }
  .settings-form-area { padding: 20px 20px 0; }
  .settings-foot {
    padding: 16px 20px 24px;
    flex-direction: column-reverse;
  }
  .settings-foot__reset,
  .settings-foot__save {
    width: 100%;
    justify-content: center;
  }
}
</style>
